import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeLandingContent, planAmountCents } from "@/lib/landing-content";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { currencyForCountry } from "@/lib/geo.functions";
import { getRequestHeader } from "@tanstack/react-start/server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };

/** Stable key that ties one saved pack to its entry in the payment catalogue. */
function lookupKeyFor(planId: string, currency: "brl" | "usd" = "brl"): string {
  return currency === "brl" ? `pack_${planId}` : `pack_${planId}_${currency}`;
}

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string | undefined; userId?: string | undefined },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length && found.data[0]) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

/**
 * Opens the payment form for one credit pack. The price and the number of
 * credits always come from the saved plans, never from the browser.
 */
export const createPlanCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { planId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.planId)) throw new Error("Invalid planId");
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    try {
      const { data: settings } = await context.supabase
        .from("platform_settings")
        .select("landing_content")
        .eq("id", true)
        .maybeSingle();
      const items = normalizeLandingContent(settings?.landing_content).plans.items;
      const plan = items.find((item) => item.id === data.planId && item.active && !item.free);
      if (!plan) return { error: "Este plano não está disponível." };

      // Currency follows the buyer's country: BRL in Brazil, USD elsewhere.
      // The master sets each amount separately in the plans panel.
      const country =
        getRequestHeader("cf-ipcountry") ??
        getRequestHeader("x-vercel-ip-country") ??
        getRequestHeader("x-country-code");
      const currency = currencyForCountry(country);
      const amountCents = planAmountCents(plan, currency);

      if (amountCents < 100 || plan.credits <= 0) {
        return { error: "Este plano ainda não tem valor e créditos definidos." };
      }

      const stripe = createStripeClient(data.environment);
      const {
        data: { user },
      } = await context.supabase.auth.getUser();

      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email,
        userId: context.userId,
      });

      const label = `${plan.credits} créditos de vídeo`;

      // Prefer the real catalogue entry kept in sync with the master's plans.
      // Falls back to an inline amount if the catalogue has not synced yet.
      let lineItem: Record<string, unknown> = {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: { name: plan.name || label, description: label },
        },
      };
      const catalogue = await stripe.prices.list({
        lookup_keys: [lookupKeyFor(plan.id, currency)],
        active: true,
        limit: 1,
      });
      const catalogued = catalogue.data[0];
      if (
        catalogued &&
        catalogued.unit_amount === amountCents &&
        catalogued.currency === currency &&
        !catalogued.recurring
      ) {
        lineItem = { quantity: 1, price: catalogued.id };
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [lineItem as never],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: { description: label },
        metadata: {
          userId: context.userId,
          planId: plan.id,
          credits: String(plan.credits),
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

type PlanSalesResult =
  | {
      salesCount: number;
      creditsGranted: number;
      totals: Array<{ currency: string; amount: number }>;
    }
  | { error: string };

/**
 * Master-only sales summary: money processed in the payment provider and
 * credits granted from those payments. Never trust the browser for these.
 */
export const getPlanSales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PlanSalesResult> => {
    try {
      const { data: isAdmin } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) return { error: "Área restrita ao usuário master." };

      // Credits granted come from our own ledger (bypasses RLS intentionally).
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: grants, error: grantsError } = await supabaseAdmin
        .from("payment_credit_grants")
        .select("credits");
      if (grantsError) return { error: getStripeErrorMessage(grantsError) };
      const creditsGranted = (grants ?? []).reduce(
        (sum, row) => sum + (Number(row.credits) || 0),
        0,
      );

      // Money processed comes straight from the provider: every successful
      // charge, grouped by currency (major unit, e.g. reais — not centavos).
      const stripe = createStripeClient(data.environment);
      const totals = new Map<string, number>();
      let salesCount = 0;
      let startingAfter: string | undefined;
      for (let page = 0; page < 10; page += 1) {
        const batch = await stripe.charges.list({
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        for (const charge of batch.data) {
          if (!charge.paid || charge.refunded) continue;
          const currency = (charge.currency ?? "brl").toLowerCase();
          totals.set(currency, (totals.get(currency) ?? 0) + (charge.amount ?? 0));
          salesCount += 1;
        }
        if (!batch.has_more || batch.data.length === 0) break;
        startingAfter = batch.data[batch.data.length - 1]?.id;
        if (!startingAfter) break;
      }

      return {
        salesCount,
        creditsGranted,
        totals: [...totals.entries()].map(([currency, minor]) => ({
          currency,
          amount: minor / 100,
        })),
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Opens the provider's billing page so the person can cancel or change the card. */
export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_customer_id) return { error: "Nenhuma assinatura encontrada." };

    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

type SyncResult = { synced: number; archived: number } | { error: string };

/**
 * Master-only: makes the payment provider's catalogue match the saved packs.
 * Every pack becomes a one-time charge (never a monthly subscription).
 */
export const syncPlanCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<SyncResult> => {
    try {
      const { data: isAdmin } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) return { error: "Área restrita ao usuário master." };

      const { data: settings } = await context.supabase
        .from("platform_settings")
        .select("landing_content")
        .eq("id", true)
        .maybeSingle();
      const items = normalizeLandingContent(settings?.landing_content).plans.items;
      const payable = items.filter((item) => !item.free && item.amountCents >= 100 && item.credits > 0);
      const currencies = ["brl", "usd"] as const;
      const wantedKeys = new Set(
        payable.flatMap((item) => currencies.map((c) => lookupKeyFor(item.id, c))),
      );

      const stripe = createStripeClient(data.environment);
      let synced = 0;
      let archived = 0;

      for (const plan of payable) {
        const label = `${plan.credits} créditos de vídeo`;
        const name = plan.name || label;

        // One product per pack, found again by our own id in its metadata.
        const found = await stripe.products.search({
          query: `metadata['lovable_plan_id']:'${plan.id}'`,
          limit: 1,
        });
        const product = found.data[0]
          ? await stripe.products.update(found.data[0].id, {
              name,
              description: plan.description || label,
              active: plan.active,
              metadata: { lovable_plan_id: plan.id, credits: String(plan.credits) },
            })
          : await stripe.products.create({
              name,
              description: plan.description || label,
              metadata: { lovable_plan_id: plan.id, credits: String(plan.credits) },
            });

        for (const currency of ["brl", "usd"] as const) {
          const key = lookupKeyFor(plan.id, currency);
          const existing = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
          const current = existing.data[0];
          const matches =
            current && !current.recurring && current.unit_amount === plan.amountCents && current.currency === currency;

          if (!matches) {
            if (current) {
              await stripe.prices.update(current.id, { active: false });
              archived += 1;
            }
            await stripe.prices.create({
              currency,
              unit_amount: plan.amountCents,
              product: product.id,
              lookup_key: key,
              transfer_lookup_key: true,
              nickname: name,
              metadata: { lovable_plan_id: plan.id, credits: String(plan.credits) },
            });
          }
        }
        synced += 1;
      }

      // Packs the master removed or turned off stop being sellable.
      const allPrices = await stripe.prices.list({ active: true, limit: 100 });
      for (const price of allPrices.data) {
        const planId = price.metadata?.["lovable_plan_id"];
        if (!planId) continue;
        if (!wantedKeys.has(price.lookup_key ?? lookupKeyFor(planId))) {
          await stripe.prices.update(price.id, { active: false });
          archived += 1;
        }
      }

      return { synced, archived };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

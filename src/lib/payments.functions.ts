import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeLandingContent } from "@/lib/landing-content";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };

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
      if (plan.amountCents < 100 || plan.credits <= 0) {
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
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "brl",
              unit_amount: plan.amountCents,
              product_data: { name: plan.name || label, description: label },
            },
          },
        ],
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

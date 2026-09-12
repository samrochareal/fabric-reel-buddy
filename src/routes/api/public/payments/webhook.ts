import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!);
  }
  return _supabase;
}

/** Credits per plan come from the master's landing page settings. */
const FALLBACK_CREDITS: Record<string, number> = {
  starter_monthly: 30,
  pro_monthly: 100,
  studio_monthly: 300,
};

async function creditsForPrice(priceId: string | undefined): Promise<number> {
  if (!priceId) return 0;
  const { data } = await getSupabase()
    .from("platform_settings")
    .select("landing_content")
    .eq("id", true)
    .maybeSingle();
  const landing = data?.["landing_content"] as { plans?: { items?: unknown[] } } | undefined;
  const items = Array.isArray(landing?.plans?.items) ? landing.plans.items : [];
  for (const item of items) {
    if (item && typeof item === "object") {
      const plan = item as { priceId?: string; credits?: number };
      if (plan.priceId === priceId && typeof plan.credits === "number") return plan.credits;
    }
  }
  return FALLBACK_CREDITS[priceId] ?? 0;
}

function priceIdOf(item: any): string | undefined {
  return item?.price?.lookup_key ?? item?.price?.metadata?.lovable_external_id ?? item?.price?.id;
}

async function grantCredits(userId: string, priceId: string | undefined, eventKey: string) {
  const credits = await creditsForPrice(priceId);
  if (!credits) return;
  await getSupabase().rpc("apply_plan_credits", {
    _user_id: userId,
    _credits: credits,
    _event_key: eventKey,
    _price_id: priceId ?? null,
  });
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;
  const item = subscription.items?.data?.[0];
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
        product_id: typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id ?? null,
        price_id: priceIdOf(item) ?? null,
        status: subscription.status,
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" },
    );
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  const object = event.data.object as any;

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(object, env);
      break;

    case "customer.subscription.deleted":
      await getSupabase()
        .from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", object.id)
        .eq("environment", env);
      break;

    case "checkout.session.completed": {
      if (object.payment_status === "unpaid") break;
      const userId = object.metadata?.userId;
      if (!userId) break;
      // One-time purchases: the line item carries the plan; subscriptions get
      // their credits from invoice.paid (first invoice included).
      if (object.mode === "payment") {
        const priceId = object.metadata?.priceId;
        await grantCredits(userId, priceId, `session:${object.id}`);
      }
      break;
    }

    case "checkout.session.async_payment_succeeded": {
      const userId = object.metadata?.userId;
      if (userId && object.mode === "payment") {
        await grantCredits(userId, object.metadata?.priceId, `session:${object.id}`);
      }
      break;
    }

    case "invoice.paid": {
      // Covers the first subscription payment and every renewal.
      const lines = object.lines?.data ?? [];
      const priceId = priceIdOf(lines[0]);
      const subscriptionId =
        typeof object.subscription === "string" ? object.subscription : object.subscription?.id;
      let userId = object.subscription_details?.metadata?.userId ?? object.metadata?.userId;
      if (!userId && subscriptionId) {
        const { data } = await getSupabase()
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();
        userId = data?.["user_id"];
      }
      if (userId) await grantCredits(String(userId), priceId, `invoice:${object.id}`);
      break;
    }

    default:
      console.log("Unhandled payment event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (error) {
          console.error("Webhook error:", error);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});

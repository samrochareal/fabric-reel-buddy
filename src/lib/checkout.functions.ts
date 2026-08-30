import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPlan } from "./plans";

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ planId: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey) {
      throw new Error(
        "Pagamentos ainda não configurados. Adicione a chave secreta do Stripe para ativar a compra de créditos.",
      );
    }
    const plan = getPlan(data.planId);
    if (!plan || plan.priceBRL == null) {
      throw new Error("Plano inválido.");
    }
    const origin =
      process.env["APP_ORIGIN"] ?? "https://id-preview--98957d40-97b3-422f-bf30-5763ea8f71b2.lovable.app";
    const params = new URLSearchParams({
      mode: "payment",
      success_url: `${origin}/app?compra=sucesso`,
      cancel_url: `${origin}/pricing?compra=cancelada`,
      "metadata[user_id]": context.userId,
      "metadata[plan_id]": plan.id,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "brl",
      "line_items[0][price_data][unit_amount]": String(Math.round(plan.priceBRL * 100)),
      "line_items[0][price_data][product_data][name]": `Fábrica de Reels — ${plan.name} (${plan.credits} créditos)`,
    });
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const body = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !body.url) {
      throw new Error(body.error?.message ?? `Stripe retornou ${res.status}`);
    }
    return { url: body.url };
  });

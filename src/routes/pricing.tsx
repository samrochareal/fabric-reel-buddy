import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PLANS, type Plan } from "@/lib/plans";
import { createCheckout } from "@/lib/checkout.functions";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Planos e créditos — Fábrica de Reels" },
      {
        name: "description",
        content:
          "Compre créditos conforme a necessidade, sem mensalidade nem renovação automática. Créditos não expiram.",
      },
      { property: "og:title", content: "Planos e créditos — Fábrica de Reels" },
      {
        property: "og:description",
        content: "Créditos que não expiram, sem assinatura. Comece grátis com 7 vídeos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const checkout = useServerFn(createCheckout);
  const [buyingPlan, setBuyingPlan] = useState<string | null>(null);

  async function handleBuy(plan: Plan) {
    if (plan.priceBRL == null) {
      navigate({ to: "/auth" });
      return;
    }
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setBuyingPlan(plan.id);
    try {
      const { url } = await checkout({ data: { planId: plan.id } });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível iniciar o pagamento.");
    } finally {
      setBuyingPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Zap className="size-3.5 text-turbo" />
            Sem assinatura · créditos não expiram
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Planos e <span className="text-gradient-brand">créditos</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Compre créditos conforme a necessidade — sem renovação mensal nem cobrança recorrente.
            Comprar um plano menor apenas soma créditos; nunca faz downgrade.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-7 ${
                plan.highlight ? "glow-primary border-primary/60 bg-card" : "border-border bg-card"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  Mais popular
                </span>
              )}
              <h2 className="font-display text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
              <p className="mt-5 font-display text-4xl font-bold">
                {plan.priceBRL == null ? "R$ 0" : `R$ ${plan.priceBRL}`}
              </p>
              <p className="text-sm text-muted-foreground">{plan.credits} créditos</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-turbo" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-7 w-full font-semibold"
                variant={plan.highlight ? "default" : "outline"}
                disabled={loading || buyingPlan !== null}
                onClick={() => void handleBuy(plan)}
              >
                {buyingPlan === plan.id
                  ? "Abrindo pagamento…"
                  : plan.priceBRL == null
                    ? "Começar grátis"
                    : "Comprar créditos"}
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Já paguei? <Link to="/auth" className="font-semibold text-primary hover:underline">Crie uma conta ou entre</Link> com
          o mesmo e-mail da compra e seus créditos aparecem automaticamente.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}

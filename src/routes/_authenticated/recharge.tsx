import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useBranding } from "@/lib/branding";
import { useMyAccount } from "@/lib/account";
import { formatPrice, getBuyerCurrency, type BuyerCurrency } from "@/lib/geo.functions";

export const Route = createFileRoute("/_authenticated/recharge")({
  head: () => ({
    meta: [
      { title: "Adicionar créditos de vídeo" },
      {
        name: "description",
        content: "Escolha um pacote de créditos, pague uma única vez e continue processando vídeos.",
      },
      { property: "og:title", content: "Adicionar créditos de vídeo" },
      {
        property: "og:description",
        content: "Pacotes de créditos com pagamento único e liberação imediata.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RechargePage,
});

function RechargePage() {
  const branding = useBranding();
  const { account } = useMyAccount();
  const [currency, setCurrency] = useState<BuyerCurrency>("brl");

  useEffect(() => {
    void getBuyerCurrency()
      .then((geo) => setCurrency(geo.currency))
      .catch(() => {});
  }, []);
  const plans = branding.landing_content.plans.items.filter((plan) => plan.active && !plan.free);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Meus projetos
        </Link>

        <h1 className="mt-5 font-display text-3xl font-bold">Adicionar créditos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cada crédito equivale a um vídeo processado. O pagamento é único e os créditos entram na
          sua conta na hora.
          {account && !account.premium ? ` Você tem ${account.credits} créditos agora.` : ""}
        </p>

        {!branding.ready ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : plans.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Nenhum pacote de créditos está disponível no momento.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl border bg-card p-6 ${plan.highlight ? "border-primary" : "border-border"}`}
              >
                <h2 className="font-display text-lg font-bold">{plan.name}</h2>
                <div className="mt-2 flex items-end gap-1">
                  <span className="font-display text-3xl font-bold">{plan.price}</span>
                  <span className="pb-1 text-sm font-semibold text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
                {plan.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                )}
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {plan.features
                    .filter((feature) => feature.trim())
                    .map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                </ul>
                <Button
                  asChild
                  className="mt-6 w-full font-bold"
                  variant={plan.highlight ? "default" : "outline"}
                >
                  <Link to="/checkout" search={{ plan: plan.id, session_id: "" }}>
                    {plan.cta || "Comprar créditos"}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

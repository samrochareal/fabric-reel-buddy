import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsAdmin } from "@/lib/admin";
import { fetchPlatformDefaults, savePlatformDefaults } from "@/lib/admin";
import { fetchBranding, useRefreshBranding } from "@/lib/branding";
import { getPlanSales, syncPlanCatalog } from "@/lib/payments.functions";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";

type SalesSummary = {
  salesCount: number;
  creditsGranted: number;
  totals: Array<{ currency: string; amount: number }>;
};

function providerDashboardUrl(): string {
  try {
    return getStripeEnvironment() === "live"
      ? "https://dashboard.stripe.com/dashboard"
      : "https://dashboard.stripe.com/test/dashboard";
  } catch {
    return "https://dashboard.stripe.com/";
  }
}
import {
  normalizeLandingContent,
  saveLandingContent,
  type LandingContent,
  type LandingPlan,
} from "@/lib/landing-content";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({
    meta: [
      { title: "Planos e créditos — painel do master" },
      {
        name: "description",
        content: "Defina o valor, os créditos e a disponibilidade de cada pacote de créditos.",
      },
      { property: "og:title", content: "Planos e créditos — painel do master" },
      {
        property: "og:description",
        content: "Edite valores, créditos entregues e o plano gratuito diário.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlansAdminPage,
});

function PlansAdminPage() {
  const { isAdmin, loading: checking } = useIsAdmin();
  const refreshBranding = useRefreshBranding();
  const [content, setContent] = useState<LandingContent | null>(null);
  const [freeCredits, setFreeCredits] = useState(5);
  const [freeHours, setFreeHours] = useState(12);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingFree, setSavingFree] = useState(false);
  const [sales, setSales] = useState<SalesSummary | null>(null);
  const [salesError, setSalesError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [branding, defaults] = await Promise.all([
        fetchBranding(),
        fetchPlatformDefaults().catch(() => null),
      ]);
      if (paymentsConfigured()) {
        try {
          const result = await getPlanSales({ data: { environment: getStripeEnvironment() } });
          if ("error" in result) setSalesError(result.error);
          else setSales(result);
        } catch {
          setSalesError("Não conseguimos carregar as vendas agora.");
        }
      }
      setContent(normalizeLandingContent(branding.landing_content));
      if (defaults) {
        setFreeCredits(defaults.creditRefillAmount);
        setFreeHours(defaults.creditRefillHours);
      }
      setLoading(false);
    })();
  }, []);

  const setPlan = (index: number, values: Partial<LandingPlan>) =>
    setContent((current) =>
      current
        ? {
            ...current,
            plans: {
              ...current.plans,
              items: current.plans.items.map((p, i) => (i === index ? { ...p, ...values } : p)),
            },
          }
        : current,
    );

  const addPlan = () =>
    setContent((current) =>
      current
        ? {
            ...current,
            plans: {
              ...current.plans,
              items: [
                ...current.plans.items,
                {
                  id: `plan_${Date.now()}`,
                  priceId: "",
                  name: "Novo pacote",
                  price: "R$ 0",
                  period: "pagamento único",
                  amountCents: 0,
                  credits: 0,
                  description: "",
                  features: [],
                  active: false,
                  highlight: false,
                  free: false,
                  cta: "Comprar créditos",
                },
              ],
            },
          }
        : current,
    );

  const removePlan = (index: number) =>
    setContent((current) =>
      current
        ? {
            ...current,
            plans: { ...current.plans, items: current.plans.items.filter((_, i) => i !== index) },
          }
        : current,
    );

  const save = async () => {
    if (!content) return;
    setSaving(true);
    try {
      await saveLandingContent(content);
      refreshBranding();
      toast.success("Planos atualizados.");
      if (paymentsConfigured()) {
        const result = await syncPlanCatalog({ data: { environment: getStripeEnvironment() } });
        if ("error" in result) {
          toast.error(`Pacotes salvos, mas a cobrança não sincronizou: ${result.error}`);
        } else {
          toast.success(`${result.synced} pacote(s) atualizados como compra de créditos.`);
        }
      }
    } catch {
      toast.error("Não conseguimos salvar os planos.");
    } finally {
      setSaving(false);
    }
  };

  const saveFree = async () => {
    setSavingFree(true);
    try {
      await savePlatformDefaults({
        creditRefillAmount: Math.max(0, Math.round(freeCredits)),
        creditRefillHours: Math.max(1, Math.round(freeHours)),
      });
      toast.success("Plano gratuito atualizado.");
    } catch {
      toast.error("Não conseguimos salvar o plano gratuito.");
    } finally {
      setSavingFree(false);
    }
  };

  if (checking || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Área restrita</h1>
          <p className="mt-2 text-sm text-muted-foreground">Esta página é só do usuário master.</p>
          <Button asChild className="mt-6 font-bold">
            <Link to="/dashboard">Voltar aos projetos</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Painel do master
        </Link>

        <h1 className="mt-5 font-display text-3xl font-bold">Planos e créditos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cada pacote é um pagamento único. O valor e os créditos definidos aqui valem na página
          inicial, na compra de créditos e no pagamento.
        </p>

        {/* sales summary */}
        <section className="mt-8 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Vendas</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tudo que já foi pago e os créditos liberados por essas vendas.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="font-bold">
              <a href={providerDashboardUrl()} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> Abrir painel de pagamentos
              </a>
            </Button>
          </div>

          {salesError ? (
            <p className="mt-4 text-sm font-semibold text-destructive">{salesError}</p>
          ) : !sales ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Carregando vendas…
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-bold text-muted-foreground">Valor processado</p>
                <p className="mt-1 font-display text-2xl font-bold">
                  {sales.totals.length === 0
                    ? "R$ 0,00"
                    : sales.totals
                        .map((t) =>
                          t.amount.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: t.currency.toUpperCase(),
                          }),
                        )
                        .join(" · ")}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-bold text-muted-foreground">Vendas concluídas</p>
                <p className="mt-1 font-display text-2xl font-bold">{sales.salesCount}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-bold text-muted-foreground">Créditos liberados</p>
                <p className="mt-1 font-display text-2xl font-bold">{sales.creditsGranted}</p>
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Para detalhes de cada venda, reembolsos e a configuração da conta de pagamentos, use o
            painel de pagamentos no botão acima.
          </p>
        </section>

        {/* free plan */}
        <section className="mt-8 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Plano gratuito</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Créditos liberados automaticamente para quem não compra pacotes.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold">
              Créditos liberados
              <Input
                type="number"
                min={0}
                className="mt-2"
                value={freeCredits}
                onChange={(event) => setFreeCredits(Number(event.target.value))}
              />
            </label>
            <label className="text-xs font-bold">
              A cada quantas horas
              <Input
                type="number"
                min={1}
                className="mt-2"
                value={freeHours}
                onChange={(event) => setFreeHours(Number(event.target.value))}
              />
            </label>
          </div>
          <Button className="mt-4 font-bold" onClick={() => void saveFree()} disabled={savingFree}>
            {savingFree && <Loader2 className="size-4 animate-spin" />} Salvar plano gratuito
          </Button>
        </section>

        {/* paid packs */}
        <section className="mt-8 space-y-5">
          {content?.plans.items.map((plan, index) => (
            <div key={plan.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold">{plan.name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan.free ? "Plano gratuito" : `R$ ${(plan.amountCents / 100).toFixed(2)}`} ·{" "}
                    {plan.credits} créditos
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (window.confirm("Excluir este pacote?")) removePlan(index);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold">
                  Nome
                  <Input
                    className="mt-2"
                    value={plan.name}
                    onChange={(event) => setPlan(index, { name: event.target.value })}
                  />
                </label>
                <label className="text-xs font-bold">
                  Créditos entregues
                  <Input
                    type="number"
                    min={0}
                    className="mt-2"
                    value={plan.credits}
                    onChange={(event) => setPlan(index, { credits: Number(event.target.value) })}
                  />
                </label>
                <label className="text-xs font-bold">
                  Valor cobrado (R$)
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-2"
                    disabled={plan.free}
                    value={(plan.amountCents / 100).toFixed(2)}
                    onChange={(event) =>
                      setPlan(index, {
                        amountCents: Math.max(0, Math.round(Number(event.target.value) * 100)),
                        price: `R$ ${Math.max(0, Number(event.target.value)).toLocaleString("pt-BR")}`,
                      })
                    }
                  />
                </label>
                <label className="text-xs font-bold">
                  Texto do preço na página
                  <Input
                    className="mt-2"
                    value={plan.price}
                    onChange={(event) => setPlan(index, { price: event.target.value })}
                  />
                </label>
                <label className="text-xs font-bold">
                  Descrição
                  <Input
                    className="mt-2"
                    value={plan.description}
                    onChange={(event) => setPlan(index, { description: event.target.value })}
                  />
                </label>
                <label className="text-xs font-bold">
                  Texto do botão
                  <Input
                    className="mt-2"
                    value={plan.cta}
                    onChange={(event) => setPlan(index, { cta: event.target.value })}
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={plan.active ? "default" : "outline"}
                  onClick={() => setPlan(index, { active: !plan.active })}
                >
                  {plan.active ? "Disponível" : "Indisponível"}
                </Button>
                <Button
                  size="sm"
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => setPlan(index, { highlight: !plan.highlight })}
                >
                  {plan.highlight ? "Em destaque" : "Sem destaque"}
                </Button>
                <Button
                  size="sm"
                  variant={plan.free ? "default" : "outline"}
                  onClick={() => setPlan(index, { free: !plan.free })}
                >
                  {plan.free ? "Gratuito" : "Pago"}
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" className="font-bold" onClick={addPlan}>
            <Plus className="size-4" /> Adicionar pacote
          </Button>
        </section>

        <div className="sticky bottom-0 mt-8 border-t border-border bg-background/90 py-4 backdrop-blur">
          <Button className="w-full font-bold" onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />} Salvar planos
          </Button>
        </div>
      </div>
    </div>
  );
}

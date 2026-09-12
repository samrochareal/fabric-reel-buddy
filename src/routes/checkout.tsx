import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createPlanCheckoutSession } from "@/lib/payments.functions";
import { fetchBranding } from "@/lib/branding";
import { normalizeLandingContent, type LandingPlan } from "@/lib/landing-content";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Assinar um plano" },
      { name: "description", content: "Escolha seu plano, pague com segurança e receba os créditos na sua conta na hora." },
      { property: "og:title", content: "Assinar um plano" },
      { property: "og:description", content: "Pagamento seguro e créditos liberados automaticamente na sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    plan: typeof search["plan"] === "string" ? search["plan"] : "",
    session_id: typeof search["session_id"] === "string" ? search["session_id"] : "",
  }),

  component: CheckoutPage,
});

function CheckoutPage() {
  const { plan: planId, session_id: sessionId } = Route.useSearch();
  const [plan, setPlan] = useState<LandingPlan | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      const [{ data }, branding] = await Promise.all([supabase.auth.getSession(), fetchBranding()]);
      setSignedIn(Boolean(data.session));
      const content = normalizeLandingContent(branding.landing_content);
      setPlan(
        content.plans.items.find((item) => item.id === planId && item.active && !item.free) ?? null,
      );
      setLoading(false);
    })();
  }, [planId]);

  // Buying requires an account: send visitors to sign in and bring them back here.
  useEffect(() => {
    if (loading || signedIn !== false || sessionId) return;
    const back = `/checkout?plan=${encodeURIComponent(planId)}`;
    void navigate({ to: "/login", search: { next: back }, replace: true });
  }, [loading, signedIn, sessionId, planId, navigate]);

  const options = useMemo(() => {
    if (!plan || !signedIn) return null;
    return {
      fetchClientSecret: async () => {
        const result = await createPlanCheckoutSession({
          data: {
            planId: plan.id,
            returnUrl: `${window.location.origin}/checkout?plan=${plan.id}&session_id={CHECKOUT_SESSION_ID}`,
            environment: getStripeEnvironment(),
          },
        });
        if ("error" in result) {
          setError(result.error);
          throw new Error(result.error);
        }
        return result.clientSecret;
      },
    };
  }, [plan, signedIn]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Voltar
        </Link>

        {sessionId ? (
          <div className="mt-8 rounded-2xl border border-primary/40 bg-card p-8 text-center">
            <h1 className="font-display text-2xl font-bold">Pagamento concluído!</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Seus créditos entram na conta em instantes. Você já pode voltar para o painel e começar a produzir.
            </p>
            <Button asChild className="mt-6 font-bold">
              <Link to="/dashboard">Ir para meus projetos</Link>
            </Button>
          </div>
        ) : loading ? (
          <div className="mt-16 flex justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : !plan ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
            <h1 className="font-display text-2xl font-bold">Plano indisponível</h1>
            <p className="mt-3 text-sm text-muted-foreground">Escolha um dos planos disponíveis na página inicial.</p>
            <Button asChild className="mt-6 font-bold"><Link to="/">Ver planos</Link></Button>
          </div>
        ) : !signedIn ? (
          <div className="mt-16 flex justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <header className="mt-6">
              <h1 className="font-display text-2xl font-bold">
                Plano {plan.name} · {plan.price}
                <span className="text-sm font-semibold text-muted-foreground">{plan.period}</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{plan.credits} créditos de vídeo a cada cobrança.</p>
            </header>
            {error && <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            {options && (
              <div className="mt-6" id="checkout">
                <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

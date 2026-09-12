import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { claimCheckoutCredits, createPlanCheckoutSession } from "@/lib/payments.functions";
import { useBuyerCurrency } from "@/lib/locale";
import { fetchBranding, useBranding } from "@/lib/branding";
import { normalizeLandingContent, planPriceLabel, type LandingPlan } from "@/lib/landing-content";
import { useT } from "@/lib/i18n";
import { useLandingPlans } from "@/lib/landing-i18n";


export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Speed Flow" },
      {
        name: "description",
        content:
          "Choose your credit pack, pay securely and receive the credits in your account instantly.",
      },
      { property: "og:title", content: "Speed Flow" },
      {
        property: "og:description",
        content: "Secure payment and credits automatically delivered to your account.",
      },
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
  const [sourcePlan, setSourcePlan] = useState<LandingPlan | null>(null);
  // The pack texts follow the language the visitor picked.
  const sourcePlans = useMemo(() => (sourcePlan ? [sourcePlan] : []), [sourcePlan]);
  const plan = useLandingPlans(sourcePlans)[0] ?? null;

  const currency = useBuyerCurrency();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const branding = useBranding();
  const t = useT();

  // The browser tab shows the system name defined by the master.
  useEffect(() => {
    if (branding.system_name) document.title = branding.system_name;
  }, [branding.system_name]);

  useEffect(() => {
    void (async () => {
      const [{ data }, content] = await Promise.all([
        supabase.auth.getSession(),
        fetchBranding().then((b) => normalizeLandingContent(b.landing_content)),
      ]);
      setSignedIn(Boolean(data.session));
      setSourcePlan(
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
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> {t("Back")}
        </Link>

        {sessionId ? (
          <div className="mt-8 rounded-2xl border border-primary/40 bg-card p-8 text-center">
            <h1 className="font-display text-2xl font-bold">{t("Payment complete!")}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {granted && granted > 0
                ? t("{n} credits are already in your account.", { n: granted })
                : t(
                    "Your credits land in your account in a moment. You can go back to your projects and start creating.",
                  )}
            </p>
            <Button asChild className="mt-6 font-bold">
              <Link to="/dashboard">{t("Go to my projects")}</Link>
            </Button>
          </div>
        ) : loading ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : !plan ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
            <h1 className="font-display text-2xl font-bold">{t("Pack unavailable")}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("Choose one of the packs available on the home page.")}
            </p>
            <Button asChild className="mt-6 font-bold">
              <Link to="/">{t("See packs")}</Link>
            </Button>
          </div>
        ) : !signedIn ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <header className="mt-6">
              <h1 className="font-display text-2xl font-bold">
                {plan.name} · {planPriceLabel(plan, currency)}
                <span className="text-sm font-semibold text-muted-foreground">{plan.period}</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("{n} video credits released as soon as the payment is confirmed.", {
                  n: plan.credits,
                })}
              </p>
            </header>
            {error && (
              <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
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

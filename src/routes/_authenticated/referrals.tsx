import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Copy, Gift, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBranding } from "@/lib/branding";
import { LanguageToggle, useT } from "@/lib/i18n";
import { inviteUrl, useMyReferral } from "@/lib/referral";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({
    meta: [
      { title: "Referrals — invite friends and earn credits" },
      {
        name: "description",
        content:
          "Share your unique invite link, follow how many people signed up through it and the credits you earned.",
      },
      { property: "og:title", content: "Referrals — invite friends and earn credits" },
      {
        property: "og:description",
        content: "Your invite link, sign-ups and rewards in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const t = useT();
  const branding = useBranding();
  const { referral, loading } = useMyReferral();
  const [copied, setCopied] = useState(false);
  const url = inviteUrl(referral?.code ?? null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("Invite link copied."));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("We couldn't copy the link."));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/60"
          >
            <ArrowLeft className="size-3.5" /> {t("Editor")}
          </Link>
          <span className="font-display text-base font-bold tracking-tight">
            {branding.ready ? branding.system_name : ""} {t("Referrals")}
          </span>
          <div className="ml-auto">
            <div className="flex items-center gap-2"><LanguageToggle /></div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-6">
        <h1 className="font-display text-xl font-bold tracking-tight">
          {t("Invite people and earn credits")}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("Every person who creates an account through your link gives you bonus credits.")}
        </p>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("Loading numbers…")}
          </div>
        ) : !referral?.enabled ? (
          <p className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            {t("The referral programme is switched off at the moment.")}
          </p>
        ) : (
          <>
            <div className="mt-5 rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Your invite link")}
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input readOnly value={url} className="h-11" />
                <Button className="h-11" onClick={() => void copy()}>
                  <Copy className="mr-2 size-4" /> {copied ? t("Copied") : t("Copy link")}
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("{n} credits per sign-up", { n: referral.creditsPerSignup })}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="size-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {t("Sign-ups through your link")}
                  </span>
                </div>
                <p className="mt-2 font-display text-3xl font-bold tracking-tight">
                  {referral.signups}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Gift className="size-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {t("Rewards earned")}
                  </span>
                </div>
                <p className="mt-2 font-display text-3xl font-bold tracking-tight">
                  {referral.rewardCredits}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{t("Credits")}</p>
              </div>
            </div>

            {referral.joins.length > 0 && (
              <div className="mt-4 rounded-2xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Your referrals")}
                </p>
                <ul className="mt-3 divide-y divide-border">
                  {referral.joins.map((join, i) => (
                    <li key={join.id} className="flex items-center justify-between py-2 text-sm">
                      <span>
                        {t("Sign-up")} #{referral.joins.length - i}
                      </span>
                      <span className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{new Date(join.at).toLocaleDateString()}</span>
                        <span className="font-semibold text-primary">+{join.credits}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

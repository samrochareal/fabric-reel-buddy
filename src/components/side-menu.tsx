import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Coins, Gift, LogOut, Menu, ShieldCheck, Tags } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { exitGuestMode, isGuest } from "@/lib/guest-mode";
import { useIsAdmin } from "@/lib/admin";
import { useBranding } from "@/lib/branding";
import { useMyAccount } from "@/lib/account";
import { LanguageToggle, useT } from "@/lib/i18n";
import { ThemeToggle } from "@/lib/theme";
import { LinkGlyph } from "@/components/link-icons";

/** Hamburger menu with the signed-in person, master links, language and sign out. */
export function SideMenu() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const branding = useBranding();
  const { isAdmin } = useIsAdmin();
  const { account } = useMyAccount();
  const [open, setOpen] = useState(false);
  const [guest, setGuest] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const visibleLinks = branding.external_links.filter((link) => !link.hidden);

  useEffect(() => {
    if (isGuest()) {
      setGuest(true);
      return;
    }
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    if (guest) exitGuestMode();
    else await supabase.auth.signOut();
    void navigate({ to: "/login", replace: true });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="flex size-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-primary/60"
        aria-label={t("Menu")}
      >
        <Menu className="size-4" />
      </SheetTrigger>

      <SheetContent side="left" className="flex w-[300px] flex-col gap-0 p-0 sm:w-[320px]">
        {/* person */}
        <div className="border-b border-border px-5 pb-5 pt-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {guest
                ? t("Guest · nothing is saved")
                : account?.full_name || email || t("no name")}
            </p>
            {!guest && email && account?.full_name && (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            )}
          </div>

          {account && !guest && (
            <div className="mt-4 text-center">
              <div className="rounded-lg border border-border bg-card px-2 py-2">
                <p className="font-display text-lg font-bold">
                  {account.premium ? "∞" : account.credits}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t("Credits")}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* navigation + master links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {isAdmin && (
            <>
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <ShieldCheck className="size-4" /> {t("Master panel")}
              </Link>
              <Link
                to="/plans"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Tags className="size-4" /> {t("Plans")}
              </Link>
            </>
          )}

          <Link
            to="/info"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Info className="size-4 text-primary" /> {t("Information")}
          </Link>

          {!guest && (
            <Link
              to="/recharge"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Coins className="size-4 text-primary" /> {t("Add credits")}
            </Link>
          )}

          {branding.referral_enabled && !guest && (
            <Link
              to="/referrals"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Gift className="size-4 text-primary" /> {t("Referrals")}
            </Link>
          )}

          {visibleLinks.length > 0 && (
            <>
              <p className="mt-3 px-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("Links")}
              </p>
              {visibleLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <LinkGlyph name={link.icon} className="size-4 text-primary" />
                  <span className="truncate">{link.title}</span>
                </a>
              ))}
            </>
          )}
        </nav>

        {/* bottom: language + sign out */}
        <div className="space-y-3 border-t border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">{t("Language")}</span>
            <div className="flex items-center gap-2"><ThemeToggle /><LanguageToggle /></div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold transition-colors hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="size-4" /> {guest ? t("Leave guest mode") : t("Sign out")}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

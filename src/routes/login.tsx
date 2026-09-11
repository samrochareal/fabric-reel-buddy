import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw, Scissors } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { isDisposableEmail, isValidEmail } from "@/lib/email-guard";
import { getRememberMe, setRememberMe } from "@/lib/session-pref";
import { exitGuestMode } from "@/lib/guest-mode";
import { useBranding } from "@/lib/branding";
import { LanguageToggle, useT } from "@/lib/i18n";
import { applyTheme } from "@/lib/theme";
import { rememberInviteCode } from "@/lib/referral";


export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — batch video editor" },
      {
        name: "description",
        content:
          "Sign in with your e-mail and password to open your saved editing settings and overlays.",
      },
      { property: "og:title", content: "Sign in — batch video editor" },
      {
        property: "og:description",
        content: "Sign in to reach your batch video editing workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const branding = useBranding();
  const t = useT();
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [remember, setRemember] = useState(true);
  const [captcha, setCaptcha] = useState({ a: 0, b: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const newCaptcha = useCallback(() => {
    setCaptcha({ a: 2 + Math.floor(Math.random() * 8), b: 1 + Math.floor(Math.random() * 9) });
    setCaptchaAnswer("");
  }, []);


  useEffect(() => {
    setRemember(getRememberMe());
    exitGuestMode();
    rememberInviteCode();
    // the sign-in page always stays dark; the theme choice only applies after login
    applyTheme("dark");
    newCaptcha();
  }, [newCaptcha]);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/dashboard", replace: true });
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void navigate({ to: "/dashboard", replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const withEmail = async () => {
    const address = email.trim();
    if (!isValidEmail(address) || password.length < 6) {
      toast.error(t("Enter your e-mail and a password with at least 6 characters."));
      return;
    }
    if (mode === "signup") {
      if (!fullName.trim()) {
        toast.error(t("Enter your name."));
        return;
      }
      if (isDisposableEmail(address)) {
        toast.error(t("Temporary e-mail addresses are not accepted. Use a permanent e-mail."));
        return;
      }
      if (password !== confirmPassword) {
        toast.error(t("The two passwords don't match."));
        return;
      }
      if (Number(captchaAnswer.trim()) !== captcha.a + captcha.b) {
        toast.error(t("The security answer is wrong. Please try again."));
        newCaptcha();
        return;
      }
    }
    setBusy(true);
    setRememberMe(remember);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) {
          toast.error(error.message);
          newCaptcha();
          return;
        }
        if (!data.session) {
          setSent(true);
          toast.success(t("Check your e-mail to confirm your account."));
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: address,
          password,
        });
        if (error) {
          toast.error(t("Wrong e-mail or password."));
          return;
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2">
          {branding.ready &&
            (branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.system_name} className="h-7 w-auto" />
            ) : (
              <Scissors className="size-5 text-primary" />
            ))}
          <span className="font-display text-lg font-bold tracking-tight">
            {branding.ready ? branding.system_name : ""}
          </span>
        </div>

        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-2"><LanguageToggle /></div>
        </div>


        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {mode === "signin" ? t("Sign in to your account") : t("Create a new account")}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t("Your overlays and last editing settings stay saved in your account.")}
          </p>

          <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-background/60 p-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className="text-xs">
              <span className="font-semibold">{t("Keep me signed in")}</span>
              <span className="block text-muted-foreground">
                {t("Stay signed in on this device so you don't have to sign in again.")}
              </span>
            </span>
          </label>

          <div className="mt-5" />

          {sent ? (
            <div className="rounded-lg border border-border bg-background/60 p-4 text-sm">
              <Mail className="mb-2 size-5 text-primary" />
              {t("We sent a confirmation link to")} <strong>{email}</strong>.{" "}
              {t("Confirm it and then sign in with your e-mail and password.")}
            </div>
          ) : (
            <div className="space-y-3">
              {mode === "signup" && (
                <div>
                  <p className="text-xs font-semibold">{t("Your name")}</p>
                  <Input
                    className="mt-1.5 h-11"
                    autoComplete="name"
                    placeholder={t("Your name")}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold">{t("E-mail")}</p>
                <Input
                  className="mt-1.5 h-11"
                  type="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs font-semibold">{t("Password")}</p>
                <Input
                  className="mt-1.5 h-11"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder={t("At least 6 characters")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void withEmail()}
                />
              </div>
              {mode === "signup" && (
                <>
                  <div>
                    <p className="text-xs font-semibold">{t("Confirm password")}</p>
                    <Input
                      className="mt-1.5 h-11"
                      type="password"
                      autoComplete="new-password"
                      placeholder={t("Repeat your password")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void withEmail()}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{t("Security check")}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="flex h-11 select-none items-center rounded-md border border-border bg-background/60 px-3 font-display text-sm font-bold tracking-wider">
                        {captcha.a} + {captcha.b} = ?
                      </span>
                      <Input
                        className="h-11 flex-1"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder={t("Your answer")}
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && void withEmail()}
                      />
                      <button
                        type="button"
                        onClick={newCaptcha}
                        aria-label={t("New challenge")}
                        className="flex size-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <RefreshCw className="size-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
              <Button className="h-11 w-full" onClick={withEmail} disabled={busy}>
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                {mode === "signin" ? t("Sign in") : t("Create account")}
              </Button>
            </div>
          )}

          <button
            type="button"
            className="mt-4 w-full text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              setMode((m) => (m === "signin" ? "signup" : "signin"));
              setSent(false);
            }}
          >
            {mode === "signin"
              ? t("No account yet? Create one now")
              : t("Already have an account? Sign in")}
          </button>
        </div>

      </div>
    </div>
  );
}

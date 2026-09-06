import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogIn, Mail, Scissors } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { getRememberMe, setRememberMe } from "@/lib/session-pref";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Fábrica de Reels" },
      {
        name: "description",
        content:
          "Acesse sua conta da Fábrica de Reels com Google ou e-mail e senha para abrir seus projetos e overlays salvos.",
      },
      { property: "og:title", content: "Entrar — Fábrica de Reels" },
      {
        property: "og:description",
        content: "Entre para acessar seus projetos de edição de vídeos em massa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    setRemember(getRememberMe());
  }, []);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/", replace: true });
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void navigate({ to: "/", replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const withGoogle = async () => {
    setBusy(true);
    setRememberMe(remember);
    try {

      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Não foi possível entrar com o Google. Tente novamente.");
        return;
      }
      if (result.redirected) return;
      void navigate({ to: "/", replace: true });
    } finally {
      setBusy(false);
    }
  };

  const withEmail = async () => {
    if (!email.trim() || password.length < 6) {
      toast.error("Informe o e-mail e uma senha com pelo menos 6 caracteres.");
      return;
    }
    setBusy(true);
    setRememberMe(remember);
    try {

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        if (!data.session) {
          setSent(true);
          toast.success("Confira seu e-mail para confirmar a conta.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          toast.error("E-mail ou senha incorretos.");
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
          <Scissors className="size-5 text-primary" />
          <span className="font-display text-lg font-bold tracking-tight">
            fabrica <span className="text-muted-foreground">de</span> reels
          </span>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Entrar na sua conta" : "Criar nova conta"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Seus projetos e perfis de overlay ficam salvos na sua conta.
          </p>

          <Button
            variant="secondary"
            className="mt-5 h-11 w-full"
            onClick={withGoogle}
            disabled={busy}
          >
            <LogIn className="mr-2 size-4" /> Continuar com Google
          </Button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {sent ? (
            <div className="rounded-lg border border-border bg-background/60 p-4 text-sm">
              <Mail className="mb-2 size-5 text-primary" />
              Enviamos um link de confirmação para <strong>{email}</strong>. Confirme e depois entre
              com seu e-mail e senha.
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold">E-mail</p>
                <Input
                  className="mt-1.5 h-11"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs font-semibold">Senha</p>
                <Input
                  className="mt-1.5 h-11"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void withEmail()}
                />
              </div>
              <Button className="h-11 w-full" onClick={withEmail} disabled={busy}>
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                {mode === "signin" ? "Entrar" : "Criar conta"}
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
              ? "Não tem conta? Criar uma agora"
              : "Já tem conta? Entrar com e-mail e senha"}
          </button>
        </div>
      </div>
    </div>
  );
}

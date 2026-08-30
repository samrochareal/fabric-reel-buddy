import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clapperboard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Fábrica de Reels" },
      { name: "description", content: "Crie sua conta grátis e ganhe 7 vídeos no Modo Turbo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [loading, user, navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada! Confirme seu e-mail para entrar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na autenticação.");
    } finally {
      setBusy(null);
    }
  }

  async function handleGoogle() {
    setBusy("google");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao entrar com Google.");
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="absolute inset-0 bg-grid-fade" aria-hidden />
      <div className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Clapperboard className="size-4" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight">
              Fábrica<span className="text-primary"> de Reels</span>
            </span>
          </Link>

          <div className="rounded-2xl border border-border bg-card p-8">
            <h1 className="text-center font-display text-2xl font-bold">
              {mode === "signup" ? "Crie sua conta grátis" : "Bem-vindo de volta"}
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {mode === "signup"
                ? "Ganhe 7 vídeos no Modo Turbo, grátis."
                : "Entre para acessar seus créditos e vídeos."}
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-6 h-11 w-full font-semibold"
              onClick={() => void handleGoogle()}
              disabled={busy !== null}
            >
              {busy === "google" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
              )}
              Continuar com Google
            </Button>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              ou com e-mail
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleEmail} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="glow-primary h-11 w-full font-semibold"
                disabled={busy !== null}
              >
                {busy === "email" && <Loader2 className="mr-2 size-4 animate-spin" />}
                {mode === "signup" ? "Criar conta grátis" : "Entrar"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => setMode(mode === "signup" ? "login" : "signup")}
              >
                {mode === "signup" ? "Entrar" : "Criar conta grátis"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

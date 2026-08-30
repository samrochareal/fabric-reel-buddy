import { Link } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader() {
  const { user, loading } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clapperboard className="size-4" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Fábrica<span className="text-primary"> de Reels</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link to="/" hash="como-funciona" className="transition-colors hover:text-foreground">
            Como funciona
          </Link>
          <Link to="/pricing" className="transition-colors hover:text-foreground">
            Planos
          </Link>
          <Link to="/" hash="faq" className="transition-colors hover:text-foreground">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <Button asChild size="sm" className="glow-primary font-semibold">
              <Link to="/app">Abrir estúdio</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button asChild size="sm" className="glow-primary font-semibold">
                <Link to="/auth">Começar grátis</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

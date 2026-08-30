import { Link } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Clapperboard className="size-3" />
          </span>
          <span className="font-display font-semibold text-foreground">Fábrica de Reels</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link to="/pricing" className="transition-colors hover:text-foreground">
            Planos
          </Link>
          <Link to="/auth" className="transition-colors hover:text-foreground">
            Entrar
          </Link>
          <Link to="/" hash="faq" className="transition-colors hover:text-foreground">
            FAQ
          </Link>
        </nav>
        <p>© {new Date().getFullYear()} Fábrica de Reels. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}

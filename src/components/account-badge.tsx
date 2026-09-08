import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exitGuestMode, isGuest } from "@/lib/guest-mode";
import { useIsAdmin } from "@/lib/admin";
import { useT } from "@/lib/i18n";


/** Shows the signed-in e-mail plus a sign-out button. */
export function AccountBadge() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [label, setLabel] = useState<string | null>(null);
  const [guest, setGuest] = useState(false);
  const { isAdmin } = useIsAdmin();
  const t = useT();


  useEffect(() => {
    if (isGuest()) {
      setGuest(true);
      setLabel(t("Guest · nothing is saved"));
      return;
    }
    supabase.auth.getUser().then(({ data }) => setLabel(data.user?.email ?? null));
  }, [t]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    if (guest) exitGuestMode();
    else await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="ml-auto flex items-center gap-2">
      {isAdmin && (
        <Link
          to="/admin"
          className="flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          <ShieldCheck className="size-3.5" /> {t("Master panel")}
        </Link>
      )}
      {label && (
        <span className="hidden max-w-[220px] truncate rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground sm:inline">
          {label}
        </span>
      )}

      <button
        type="button"
        onClick={signOut}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/60"
      >
        <LogOut className="size-3.5" /> {guest ? t("Leave guest mode") : t("Sign out")}
      </button>
    </div>
  );
}


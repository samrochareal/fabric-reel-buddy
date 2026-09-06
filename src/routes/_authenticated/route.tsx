import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { shouldDiscardSession } from "@/lib/session-pref";
import { isGuest } from "@/lib/guest-mode";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // guest mode: full access, nothing saved
    if (isGuest()) return { user: null };
    // user opted out of "continuar conectado" and the browser was closed
    if (shouldDiscardSession()) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});


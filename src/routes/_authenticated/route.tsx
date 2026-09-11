import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { shouldDiscardSession } from "@/lib/session-pref";
import { isGuest } from "@/lib/guest-mode";
import { ensureProfile } from "@/lib/admin";
import { claimPendingReferral } from "@/lib/referral";
import { useBranding } from "@/lib/branding";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // guest mode: full access, nothing saved
    if (isGuest()) return { user: null };
    // user opted out of "continuar conectado" and the browser was closed
    if (shouldDiscardSession()) {
      await supabase.auth.signOut();
      throw redirect({ to: "/login" });
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    // password was reset by the master: force a new one before anything else
    const meta = (data.user.user_metadata ?? {}) as { must_change_password?: boolean };
    if (meta.must_change_password === true && location.pathname !== "/new-password") {
      throw redirect({ to: "/new-password" });
    }
    await ensureProfile();
    await claimPendingReferral();
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

/** Applies the master's visual identity (name, colours, favicon) on every page. */
function AuthenticatedLayout() {
  useBranding();
  return <Outlet />;
}



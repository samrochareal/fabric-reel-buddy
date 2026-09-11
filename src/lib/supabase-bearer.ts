import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

/**
 * Attaches the Supabase bearer token to every server-function call.
 *
 * Replaces the generated `attachSupabaseAuth`: that one only reads the cached
 * session, so a token that expired mid-session (long video batches) produced
 * "Unauthorized: No authorization header provided". Here we refresh the session
 * when it is missing or about to expire.
 */
export const attachSupabaseBearer = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;
    try {
      const { data } = await supabase.auth.getSession();
      let session = data.session;
      const expiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
      const nearlyExpired = expiresAt > 0 && expiresAt - Date.now() < 60_000;
      if (!session || nearlyExpired) {
        const refreshed = await supabase.auth.refreshSession();
        session = refreshed.data.session ?? session;
      }
      token = session?.access_token;
    } catch {
      token = undefined;
    }
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);

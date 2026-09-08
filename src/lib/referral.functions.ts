import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The signed-in person's invite code, the people who joined and the rewards earned. */
export const getMyReferral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: rows }, { data: settings }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("referrals")
        .select("id, reward_credits, created_at")
        .eq("referrer_id", context.userId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("platform_settings")
        .select("referral_enabled, referral_reward_credits")
        .limit(1)
        .maybeSingle(),
    ]);

    const list = rows ?? [];
    return {
      code: (profile as { referral_code?: string } | null)?.referral_code ?? null,
      signups: list.length,
      rewardCredits: list.reduce((sum, r) => sum + (r.reward_credits ?? 0), 0),
      joins: list.map((r) => ({ id: r.id, credits: r.reward_credits, at: r.created_at })),
      enabled: Boolean(
        (settings as { referral_enabled?: boolean } | null)?.referral_enabled,
      ),
      creditsPerSignup:
        (settings as { referral_reward_credits?: number } | null)?.referral_reward_credits ?? 0,
    };
  });

/** Links the signed-in person to the invite code they arrived with. */
export const claimReferral = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => ({ code: String(input.code).trim().slice(0, 32) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    if (!data.code) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("admin_claim_referral", {
      _user_id: context.userId,
      _code: data.code,
    } as never);
    if (error) throw error;
    return result;
  });

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isGuest } from "@/lib/guest-mode";

/** Makes sure the signed-in person has a profile row (used for platform counts). */
export async function ensureProfile(): Promise<void> {
  if (isGuest()) return;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const fullName = meta.full_name ?? meta.name ?? null;
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) {
    if (!existing.full_name && fullName) {
      await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
    }
    return;
  }
  await supabase
    .from("profiles")
    .insert({ id: user.id, email: user.email ?? null, full_name: fullName });
}

export async function fetchIsAdmin(): Promise<boolean> {
  if (isGuest()) return false;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}

export function useIsAdmin() {
  const query = useQuery({ queryKey: ["is-admin"], queryFn: fetchIsAdmin, staleTime: 60_000 });
  return { isAdmin: query.data === true, loading: query.isLoading };
}

export type PlatformStats = {
  total_users: number;
  new_users_7d: number;
  new_users_30d: number;
  total_videos: number;
  videos_7d: number;
  videos_30d: number;
  total_minutes: number;
  active_users_30d: number;
  overlay_presets: number;
  premium_users: number;
  blocked_users: number;
  credits_available: number;
  credits_used: number;
  referral_enabled: boolean;
  referral_reward_credits: number;
  total_referrals: number;
  referrals_7d: number;
  referral_credits_awarded: number;
  referring_users: number;
  top_referrers: { email: string | null; full_name: string | null; invites: number; credits: number }[];
  daily: { day: string; videos: number }[];
};

export type PlatformUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  credits: number;
  credits_used: number;
  credit_refill_amount: number;
  credit_refill_hours: number;
  last_refill_at: string;
  premium: boolean;
  access_expires_at: string | null;
  blocked: boolean;
  allowed_tools: Record<string, boolean>;
  is_admin: boolean;
  videos_processed: number;
  minutes_processed: number;
  last_activity_at: string | null;
  overlay_count: number;
};

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const { getPlatformStats } = await import("@/lib/admin.functions");
  const data = await getPlatformStats();
  return data as unknown as PlatformStats;
}

export async function fetchPlatformUsers(): Promise<PlatformUser[]> {
  const { listUsers } = await import("@/lib/admin.functions");
  const data = await listUsers();
  const rows = (data ?? []) as unknown as PlatformUser[];
  return rows.map((row) => ({
    ...row,
    allowed_tools:
      row.allowed_tools && typeof row.allowed_tools === "object" ? row.allowed_tools : {},
  }));
}

export async function savePlatformUser(input: {
  userId: string;
  credits?: number;
  creditRefillAmount?: number;
  creditRefillHours?: number;
  premium?: boolean;
  accessDays?: number | null;
  blocked?: boolean;
  allowedTools?: Record<string, boolean>;
}): Promise<void> {
  const { updateUser } = await import("@/lib/admin.functions");
  await updateUser({ data: input });
}

/** Records processed videos so the master dashboard can report usage. */
export async function logVideoJobs(input: {
  clips: number;
  durationSeconds?: number;
  outputBytes?: number;
}): Promise<void> {
  if (isGuest() || input.clips <= 0) return;
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;
  await supabase.from("video_jobs").insert({
    user_id: userId,
    clips: input.clips,
    duration_seconds: input.durationSeconds ?? null,
    output_bytes: input.outputBytes ?? null,
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isGuest } from "@/lib/guest-mode";

/** Makes sure the signed-in person has a profile row (used for platform counts). */
export async function ensureProfile(): Promise<void> {
  if (isGuest()) return;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return;
  await supabase.from("profiles").insert({ id: user.id, email: user.email ?? null });
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
  daily: { day: string; videos: number }[];
};

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const { getPlatformStats } = await import("@/lib/admin.functions");
  const data = await getPlatformStats();
  return data as unknown as PlatformStats;
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

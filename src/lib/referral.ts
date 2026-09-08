import { useQuery } from "@tanstack/react-query";

const PENDING_KEY = "fdr.ref";

export type ReferralSummary = {
  code: string | null;
  signups: number;
  rewardCredits: number;
  joins: { id: string; credits: number; at: string }[];
  enabled: boolean;
  creditsPerSignup: number;
};

/** Remembers the invite code found in the address (?ref=CODE). */
export function rememberInviteCode() {
  if (typeof window === "undefined") return;
  const code = new URLSearchParams(window.location.search).get("ref");
  if (code) window.localStorage.setItem(PENDING_KEY, code.trim().slice(0, 32));
}

/** Links a fresh account to the invite code it arrived with, once. */
export async function claimPendingReferral() {
  if (typeof window === "undefined") return;
  const code = window.localStorage.getItem(PENDING_KEY);
  if (!code) return;
  window.localStorage.removeItem(PENDING_KEY);
  try {
    const { claimReferral } = await import("@/lib/referral.functions");
    await claimReferral({ data: { code } });
  } catch {
    // a failed link should never block the editor
  }
}

export async function fetchMyReferral(): Promise<ReferralSummary> {
  const { getMyReferral } = await import("@/lib/referral.functions");
  return (await getMyReferral()) as unknown as ReferralSummary;
}

export function useMyReferral() {
  const query = useQuery({
    queryKey: ["my-referral"],
    queryFn: fetchMyReferral,
    staleTime: 30_000,
  });
  return { referral: query.data ?? null, loading: query.isLoading };
}

export function inviteUrl(code: string | null): string {
  if (!code) return "";
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/auth?ref=${code}`;
}

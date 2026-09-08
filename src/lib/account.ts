import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isGuest } from "@/lib/guest-mode";

export type Account = {
  id: string;
  email: string | null;
  full_name: string | null;
  credits: number;
  credits_used: number;
  credit_refill_amount: number;
  credit_refill_hours: number;
  last_refill_at: string;
  premium: boolean;
  access_expires_at: string | null;
  blocked: boolean;
  allowed_tools: Record<string, boolean>;
};

/** Editing areas the master user can switch off per account. */
export const TOOL_KEYS = ["text", "overlay", "extras", "finetune", "borders"] as const;
export type ToolKey = (typeof TOOL_KEYS)[number];

export const TOOL_LABELS: Record<ToolKey, string> = {
  text: "Text",
  overlay: "Overlay",
  extras: "Extras",
  finetune: "Fine tuning & framing",
  borders: "Borders",
};

export const accountQueryKey = ["my-account"] as const;

export async function fetchMyAccount(): Promise<Account | null> {
  if (isGuest()) return null;
  const { getMyAccount } = await import("@/lib/account.functions");
  const data = await getMyAccount();
  if (!data) return null;
  const raw = data as unknown as Account & { allowed_tools: unknown };
  return {
    ...raw,
    allowed_tools:
      raw.allowed_tools && typeof raw.allowed_tools === "object"
        ? (raw.allowed_tools as Record<string, boolean>)
        : {},
  };
}

export type SpendResult = {
  ok: boolean;
  reason?: string;
  credits?: number;
  premium?: boolean;
  next_refill_at?: string;
};

export async function spendOneCredit(): Promise<SpendResult> {
  if (isGuest()) return { ok: true };
  const { spendCredits } = await import("@/lib/account.functions");
  const result = await spendCredits({ data: { amount: 1 } });
  return (result ?? { ok: false }) as unknown as SpendResult;
}

export function useMyAccount() {
  const query = useQuery({
    queryKey: accountQueryKey,
    queryFn: fetchMyAccount,
    staleTime: 15_000,
  });
  return { account: query.data ?? null, loading: query.isLoading };
}

export function useRefreshAccount() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: accountQueryKey });
}

/** True when the master user left this editing area enabled. */
export function toolEnabled(account: Account | null, key: ToolKey): boolean {
  if (!account) return true;
  return account.allowed_tools[key] !== false;
}

export function accessExpired(account: Account | null): boolean {
  if (!account?.access_expires_at) return false;
  return new Date(account.access_expires_at).getTime() < Date.now();
}

/** When the next batch of credits becomes available, or null if some are left. */
export function nextRefillAt(account: Account | null): Date | null {
  if (!account || account.premium || account.credits > 0) return null;
  const base = new Date(account.last_refill_at).getTime();
  return new Date(base + account.credit_refill_hours * 3600_000);
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isGuest } from "@/lib/guest-mode";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
  target_user_id: string | null;
  created_at: string;
  read: boolean;
};

export type AdminNotification = Omit<AppNotification, "read"> & {
  target_email: string | null;
};

export const notificationsQueryKey = ["my-notifications"] as const;

/** Notifications for the signed-in account (personal + broadcast), newest first. */
export async function fetchMyNotifications(): Promise<AppNotification[]> {
  if (isGuest()) return [];
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  const [{ data: rows }, { data: reads }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, title, body, link_url, link_label, target_user_id, created_at")
      .or(`target_user_id.is.null,target_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("notification_reads").select("notification_id"),
  ]);

  const readIds = new Set((reads ?? []).map((r) => r.notification_id));
  return (rows ?? []).map((row) => ({ ...row, read: readIds.has(row.id) }));
}

export async function markNotificationRead(id: string): Promise<void> {
  if (isGuest()) return;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  await supabase
    .from("notification_reads")
    .upsert({ notification_id: id, user_id: userId }, { onConflict: "notification_id,user_id" });
}

export function useMyNotifications() {
  const query = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: fetchMyNotifications,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const items = query.data ?? [];
  return { items, unread: items.filter((n) => !n.read).length, loading: query.isLoading };
}

export function useRefreshNotifications() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
}

/* ---------- master tools ---------- */

export async function adminListNotifications(): Promise<AdminNotification[]> {
  const { listNotifications } = await import("@/lib/notifications.functions");
  const data = await listNotifications();
  return (data ?? []) as unknown as AdminNotification[];
}

export async function adminSendNotification(input: {
  title: string;
  body: string;
  linkUrl?: string;
  linkLabel?: string;
  targetUserId?: string | null;
}): Promise<void> {
  const { sendNotification } = await import("@/lib/notifications.functions");
  await sendNotification({ data: input });
}

export async function adminDeleteNotification(id: string): Promise<void> {
  const { deleteNotification } = await import("@/lib/notifications.functions");
  await deleteNotification({ data: { id } });
}

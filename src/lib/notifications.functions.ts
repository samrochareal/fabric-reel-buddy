import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const supabase = context.supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (a: string, b: string) => {
          eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: unknown }> };
        };
      };
    };
  };
  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw new Response("Forbidden", { status: 403 });
}

/** Master-only: sends a notification to everyone or to a single account. */
export const sendNotification = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      title: string;
      body: string;
      linkUrl?: string;
      linkLabel?: string;
      targetUserId?: string | null;
    }) => input,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.title.trim()) throw new Error("Title is required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("admin_send_notification", {
      _title: data.title.trim(),
      _body: data.body ?? "",
      _link_url: data.linkUrl ?? "",
      _link_label: data.linkLabel ?? "",
      _target_user_id: data.targetUserId ?? null,
    } as never);
    if (error) throw error;
    return result;
  });

/** Master-only: every notification sent so far. */
export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("admin_list_notifications");
    if (error) throw error;
    return data;
  });

/** Master-only: removes a notification for everyone. */
export const deleteNotification = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("admin_delete_notification", {
      _id: data.id,
    } as never);
    if (error) throw error;
    return { ok: true };
  });

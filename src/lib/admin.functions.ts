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

/**
 * Platform usage stats for the master dashboard. Verifies the admin role
 * server-side, then runs the stats through the privileged client (the
 * database function itself is not executable by signed-in users).
 */
export const getPlatformStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("admin_platform_stats");
    if (error) throw error;
    return data;
  });

/** Every account with its individual numbers, for the master dashboard. */
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("admin_list_users");
    if (error) throw error;
    return data;
  });

/** Master-only changes to one account: credits, premium, access window, tools. */
export const updateUser = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      userId: string;
      credits?: number;
      creditRefillAmount?: number;
      creditRefillHours?: number;
      premium?: boolean;
      accessDays?: number | null;
      blocked?: boolean;
      allowedTools?: Record<string, boolean>;
    }) => input,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const clearExpiry = data.accessDays === null;
    const expiresAt =
      typeof data.accessDays === "number" && data.accessDays > 0
        ? new Date(Date.now() + data.accessDays * 86_400_000).toISOString()
        : null;

    const args: Record<string, unknown> = {
      _user_id: data.userId,
      _clear_expiry: clearExpiry,
    };
    if (typeof data.credits === "number") args["_credits"] = data.credits;
    if (typeof data.creditRefillAmount === "number")
      args["_credit_refill_amount"] = data.creditRefillAmount;
    if (typeof data.creditRefillHours === "number")
      args["_credit_refill_hours"] = data.creditRefillHours;
    if (typeof data.premium === "boolean") args["_premium"] = data.premium;
    if (typeof data.blocked === "boolean") args["_blocked"] = data.blocked;
    if (expiresAt) args["_access_expires_at"] = expiresAt;
    if (data.allowedTools) args["_allowed_tools"] = data.allowedTools;

    const { data: updated, error } = await supabaseAdmin.rpc(
      "admin_update_user",
      args as never,
    );

    if (error) throw error;
    return updated;
  });

/** Master-only: permanently removes one account and everything tied to it. */
export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId)
      throw new Response("Cannot delete your own account", { status: 400 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;
    return { ok: true };
  });


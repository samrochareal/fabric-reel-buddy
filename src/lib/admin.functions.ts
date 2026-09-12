import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const fallbackDefaults = {
  credits: 5,
  creditRefillAmount: 5,
  creditRefillHours: 12,
  premium: false,
  accessDays: null as number | null,
  blocked: false,
  allowedTools: {} as Record<string, boolean>,
};

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

/** Master-only: reads the persistent defaults used for current and future accounts. */
export const getPlatformDefaults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("platform_settings")
      .select("account_defaults")
      .eq("id", true)
      .maybeSingle();
    if (error) throw error;
    const saved = data?.account_defaults;
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return fallbackDefaults;
    const value = saved as Record<string, unknown>;
    return {
      credits: typeof value.credits === "number" ? value.credits : fallbackDefaults.credits,
      creditRefillAmount: typeof value.creditRefillAmount === "number" ? value.creditRefillAmount : fallbackDefaults.creditRefillAmount,
      creditRefillHours: typeof value.creditRefillHours === "number" ? value.creditRefillHours : fallbackDefaults.creditRefillHours,
      premium: typeof value.premium === "boolean" ? value.premium : fallbackDefaults.premium,
      accessDays: typeof value.accessDays === "number" ? value.accessDays : null,
      blocked: typeof value.blocked === "boolean" ? value.blocked : fallbackDefaults.blocked,
      allowedTools: value.allowedTools && typeof value.allowedTools === "object" && !Array.isArray(value.allowedTools)
        ? value.allowedTools as Record<string, boolean>
        : fallbackDefaults.allowedTools,
    };
  });

/** Turns the master's form values into arguments for admin_update_user. */
function updateArgs(data: {
  userId: string;
  credits?: number;
  creditRefillAmount?: number;
  creditRefillHours?: number;
  premium?: boolean;
  accessDays?: number | null;
  blocked?: boolean;
  allowedTools?: Record<string, boolean>;
}): Record<string, unknown> {
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
  return args;
}

/** Master-only: applies the same settings to every non-master account at once. */
export const updateAllUsers = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
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

    const [{ data: profiles, error }, { data: admins }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id"),
      supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
    ]);
    if (error) throw error;

    const defaults = {
      credits: Math.max(0, Math.round(data.credits ?? fallbackDefaults.credits)),
      creditRefillAmount: Math.max(0, Math.round(data.creditRefillAmount ?? fallbackDefaults.creditRefillAmount)),
      creditRefillHours: Math.max(1, Math.round(data.creditRefillHours ?? fallbackDefaults.creditRefillHours)),
      premium: data.premium ?? fallbackDefaults.premium,
      accessDays: typeof data.accessDays === "number" && data.accessDays > 0 ? data.accessDays : null,
      blocked: data.blocked ?? fallbackDefaults.blocked,
      allowedTools: data.allowedTools ?? fallbackDefaults.allowedTools,
    };
    const { error: defaultsError } = await supabaseAdmin
      .from("platform_settings")
      .update({ account_defaults: defaults })
      .eq("id", true);
    if (defaultsError) throw defaultsError;

    const adminIds = new Set((admins ?? []).map((r) => r.user_id));
    const targets = (profiles ?? []).map((p) => p.id).filter((id) => !adminIds.has(id));

    let updated = 0;
    for (const id of targets) {
      const { error: rpcError } = await supabaseAdmin.rpc(
        "admin_update_user",
        updateArgs({ ...data, userId: id }) as never,
      );
      if (!rpcError) updated += 1;
    }
    return { updated, total: targets.length };
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


/**
 * Master-only: replaces one account's password with a random temporary one and
 * flags the account so the person must pick a new password on next sign-in.
 */
export const resetUserPassword = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const bytes = new Uint8Array(14);
    crypto.getRandomValues(bytes);
    const temporaryPassword =
      Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("") + "!7";

    const { data: existing } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const meta = (existing?.user?.user_metadata ?? {}) as Record<string, unknown>;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: temporaryPassword,
      user_metadata: { ...meta, must_change_password: true },
    });
    if (error) throw error;
    return { temporaryPassword };
  });

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The signed-in person's credits, premium flag and access limits. */
export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(
        "id, email, full_name, credits, credits_used, credit_refill_amount, credit_refill_hours, last_refill_at, premium, access_expires_at, blocked, allowed_tools",
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

/** Spends credits for processed videos — 1 credit per video. */
export const spendCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { amount: number }) => ({
    amount: Math.max(1, Math.min(100, Math.round(input.amount))),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("admin_consume_credits", {
      _user_id: context.userId,
      _amount: data.amount,
    });
    if (error) throw error;
    return result;
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = typeof claims.email === "string" ? claims.email : null;
    const { data, error } = await supabase.rpc("ensure_profile", {
      p_user_id: userId,
      p_email: email,
    });
    if (error) throw new Error(error.message);
    return { credits: (data as number | null) ?? 0 };
  });

export const getTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("credit_transactions")
      .select("id, amount, reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return { transactions: data ?? [] };
  });

export const consumeCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ count: z.number().int().min(1).max(50) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: credits, error } = await supabase.rpc("consume_credits", {
      p_user_id: userId,
      p_amount: data.count,
    });
    if (error) throw new Error(error.message);
    return { credits: (credits as number | null) ?? 0 };
  });

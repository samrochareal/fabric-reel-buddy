import { supabase } from "@/integrations/supabase/client";
import { isGuest } from "@/lib/guest-mode";

/**
 * Last used edit settings, saved per signed-in user.
 * Guests keep nothing — everything lives only in the current tab.
 */
export async function loadEditSettings<T>(): Promise<Partial<T> | null> {
  if (isGuest()) return null;
  const { data, error } = await supabase
    .from("user_settings")
    .select("edit_options")
    .maybeSingle();
  if (error || !data) return null;
  const value = (data as { edit_options: unknown }).edit_options;
  return value && typeof value === "object" ? (value as Partial<T>) : null;
}

export async function saveEditSettings(options: unknown): Promise<void> {
  if (isGuest()) return;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      edit_options: options as never,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

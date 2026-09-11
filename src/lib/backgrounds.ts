import { supabase } from "@/integrations/supabase/client";

/** A background image the user uploaded, saved with a name so it is easy to reuse. */
export type BackgroundImageItem = {
  id: string;
  name: string;
  dataUrl: string;
  projectId: string | null;
};

type Row = { id: string; name: string; data_url: string; project_id: string | null };

const COLS = "id,name,data_url,project_id";

const toItem = (row: Row): BackgroundImageItem => ({
  id: row.id,
  name: row.name,
  dataUrl: row.data_url,
  projectId: row.project_id,
});

export async function listBackgrounds(): Promise<BackgroundImageItem[]> {
  const { data, error } = await supabase
    .from("background_images")
    .select(COLS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(toItem);
}

export async function addBackground(
  name: string,
  dataUrl: string,
  projectId: string | null,
): Promise<BackgroundImageItem> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("no session");
  const { data, error } = await supabase
    .from("background_images")
    .insert({ user_id: userId, name, data_url: dataUrl, project_id: projectId })
    .select(COLS)
    .single();
  if (error) throw error;
  return toItem(data as Row);
}

export async function renameBackground(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("background_images").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteBackground(id: string): Promise<void> {
  const { error } = await supabase.from("background_images").delete().eq("id", id);
  if (error) throw error;
}

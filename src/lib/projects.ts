import { supabase } from "@/integrations/supabase/client";
import type { EditOptions } from "@/lib/video";

/** A saved batch project: its own edit settings, overlays, titles and per-video tweaks. */
export type Project = {
  id: string;
  name: string;
  options: Partial<EditOptions>;
  overrides: Record<string, Partial<EditOptions>>;
  antiDup: boolean;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  name: string;
  options: unknown;
  overrides: unknown;
  anti_dup: boolean;
  created_at: string;
  updated_at: string;
};

const COLS = "id,name,options,overrides,anti_dup,created_at,updated_at";

const asObject = <T,>(value: unknown): T =>
  (value && typeof value === "object" ? value : {}) as T;

const toProject = (row: Row): Project => ({
  id: row.id,
  name: row.name,
  options: asObject<Partial<EditOptions>>(row.options),
  overrides: asObject<Record<string, Partial<EditOptions>>>(row.overrides),
  antiDup: row.anti_dup,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(COLS)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(toProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from("projects").select(COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toProject(data as Row) : null;
}

export async function createProject(name: string): Promise<Project> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("no session");
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, name })
    .select(COLS)
    .single();
  if (error) throw error;
  return toProject(data as Row);
}

export async function renameProject(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("projects").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function saveProjectSettings(
  id: string,
  settings: { options: EditOptions; overrides: Record<string, Partial<EditOptions>>; antiDup: boolean },
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({
      options: settings.options as unknown as never,
      overrides: settings.overrides as unknown as never,
      anti_dup: settings.antiDup,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

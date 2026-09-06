import { supabase } from "@/integrations/supabase/client";

export type Project = {
  id: string;
  name: string;
  note: string;
  status: "draft" | "active";
  createdAt: number;
  updatedAt: number;
  processedCount: number;
};

type Row = {
  id: string;
  name: string;
  note: string;
  status: string;
  processed_count: number;
  created_at: string;
  updated_at: string;
};

const toProject = (row: Row): Project => ({
  id: row.id,
  name: row.name,
  note: row.note ?? "",
  status: row.status === "active" ? "active" : "draft",
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
  processedCount: row.processed_count ?? 0,
});

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,note,status,processed_count,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(toProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,note,status,processed_count,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toProject(data as Row) : null;
}

export async function createProject(name: string, note = ""): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({ name: name.trim() || "Novo projeto", note: note.trim() })
    .select("id,name,note,status,processed_count,created_at,updated_at")
    .single();
  if (error) throw error;
  return toProject(data as Row);
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<Project, "name" | "note" | "status" | "processedCount">>,
) {
  const payload: {
    updated_at: string;
    name?: string;
    note?: string;
    status?: string;
    processed_count?: number;
  } = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.note !== undefined) payload.note = patch.note;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.processedCount !== undefined) payload.processed_count = patch.processedCount;
  const { error } = await supabase.from("projects").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

/** Marks the project as active and adds newly rendered videos to its history. */
export async function registerProcessed(id: string, count: number) {
  const project = await getProject(id);
  if (!project) return;
  await updateProject(id, {
    status: "active",
    processedCount: project.processedCount + count,
  });
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

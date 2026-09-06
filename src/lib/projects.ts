export type Project = {
  id: string;
  name: string;
  note: string;
  status: "draft" | "active";
  createdAt: number;
  updatedAt: number;
  processedCount: number;
};

const KEY = "fdr.projects.v1";

function read(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Project[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: Project[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function listProjects(): Project[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): Project | null {
  return read().find((p) => p.id === id) ?? null;
}

export function createProject(name: string, note = ""): Project {
  const now = Date.now();
  const project: Project = {
    id: `p_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || "Novo projeto",
    note: note.trim(),
    status: "draft",
    createdAt: now,
    updatedAt: now,
    processedCount: 0,
  };
  write([project, ...read()]);
  return project;
}

export function updateProject(id: string, patch: Partial<Omit<Project, "id">>) {
  write(read().map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)));
}

export function deleteProject(id: string) {
  write(read().filter((p) => p.id !== id));
}

/** Marks the project as active and adds newly rendered videos to its history. */
export function registerProcessed(id: string, count: number) {
  const project = getProject(id);
  if (!project) return;
  updateProject(id, {
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FolderOpen,
  Plus,
  Scissors,
  Search,
  SlidersHorizontal,
  Trash2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createProject,
  deleteProject,
  formatDate,
  listProjects,
  type Project,
} from "@/lib/projects";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meus Projetos — Fábrica de Reels" },
      {
        name: "description",
        content:
          "Organize, edite e prepare seus vídeos para publicação em um só lugar. Crie projetos e retome de onde parou.",
      },
      { property: "og:title", content: "Meus Projetos — Fábrica de Reels" },
      {
        property: "og:description",
        content: "Organize seus projetos de edição em massa de vídeos verticais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectsPage,
});

type SortBy = "recent" | "name";

function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");

  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setProjects(listProjects());
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = projects.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.note.toLowerCase().includes(q),
    );
    return sortBy === "name"
      ? [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      : [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [projects, query, sortBy]);


  const totalProcessed = projects.reduce((sum, p) => sum + p.processedCount, 0);

  const submit = () => {
    const project = createProject(name, note);
    setProjects(listProjects());
    setName("");
    setNote("");
    setCreating(false);
    void navigate({ to: "/editor/$projectId", params: { projectId: project.id } });
  };

  const remove = (id: string) => {
    deleteProject(id);
    setProjects(listProjects());
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <Scissors className="size-4 text-primary" />
          <span className="font-display text-base font-bold tracking-tight">
            fabrica <span className="text-muted-foreground">de</span> reels
          </span>


        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold">
              <span className="size-1.5 rounded-full bg-primary" /> Seu espaço de criação
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Meus <span className="text-primary">Projetos</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Organize, edite e prepare seus vídeos para publicação em um só lugar.
            </p>
          </div>
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 size-4" /> Novo Projeto
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <span className="grid size-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <FolderOpen className="size-5" />
            </span>
            <div>
              <p className="font-display text-xl font-bold leading-none">{projects.length}</p>
              <p className="text-xs text-muted-foreground">Projetos criados</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <span className="grid size-10 place-items-center rounded-lg bg-turbo/15 text-turbo">
              <Video className="size-5" />
            </span>
            <div>
              <p className="font-display text-xl font-bold leading-none">{totalProcessed}</p>
              <p className="text-xs text-muted-foreground">Vídeos processados · sem limites</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar projeto..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">

            <button
              type="button"
              onClick={() => setSortBy((s) => (s === "recent" ? "name" : "recent"))}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold"
            >
              {sortBy === "recent" ? "Mais Recentes" : "Nome (A-Z)"}
              <SlidersHorizontal className="size-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {creating && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold">Novo projeto</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do projeto (ex.: Campanha Setembro)"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anotações (opcional)"
                className="min-h-[40px]"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={submit}>
                Criar e abrir editor
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {visible.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-card/30 px-6 py-20 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/15 text-primary">
              <FolderOpen className="size-7" />
            </span>
            <h2 className="mt-6 font-display text-2xl font-bold tracking-tight">
              {projects.length === 0 ? "Nenhum projeto ainda" : "Nada encontrado"}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              {projects.length === 0
                ? "Crie seu primeiro projeto para começar a organizar e editar vídeos em massa."
                : "Tente outro termo de busca ou mude o filtro."}
            </p>
            {projects.length === 0 && (
              <Button size="lg" className="mt-6" onClick={() => setCreating(true)}>
                <Plus className="mr-1.5 size-4" /> Criar primeiro projeto
              </Button>
            )}
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((project) => (
              <li
                key={project.id}
                className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-bold leading-tight">{project.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Atualizado em {formatDate(project.updatedAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      project.status === "active"
                        ? "bg-turbo/15 text-turbo"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {project.status === "active" ? "Ativo" : "Rascunho"}
                  </span>
                </div>
                {project.note && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{project.note}</p>
                )}
                <p className="mt-3 text-xs font-semibold">
                  {project.processedCount} vídeo{project.processedCount === 1 ? "" : "s"} processado
                  {project.processedCount === 1 ? "" : "s"}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      void navigate({
                        to: "/editor/$projectId",
                        params: { projectId: project.id },
                      })
                    }
                  >
                    Abrir editor
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(project.id)}
                    aria-label={`Excluir ${project.name}`}
                    className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

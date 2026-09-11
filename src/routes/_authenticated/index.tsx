import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Film, Loader2, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SideMenu } from "@/components/side-menu";
import { CreditMeter } from "@/components/credit-meter";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBranding } from "@/lib/branding";
import { useT } from "@/lib/i18n";
import { useMyAccount } from "@/lib/account";
import {
  createProject,
  deleteProject,
  listProjects,
  renameProject,
  type Project,
} from "@/lib/projects";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "My projects — batch video editor" },
      {
        name: "description",
        content:
          "Create a project for each batch of videos and keep its own frames, overlays and titles.",
      },
      { property: "og:title", content: "My projects — batch video editor" },
      {
        property: "og:description",
        content: "Every project keeps its own edit settings, overlays and titles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const t = useT();
  const navigate = useNavigate();
  const branding = useBranding();
  const { account } = useMyAccount();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [removing, setRemoving] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    listProjects()
      .then(setProjects)
      .catch(() => toast.error(t("We couldn't load your projects.")))
      .finally(() => setLoading(false));

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openProject = (id: string) =>
    void navigate({ to: "/editor/$projectId", params: { projectId: id } });

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error(t("Give the project a name."));
      return;
    }
    setBusy(true);
    try {
      const project = await createProject(name);
      toast.success(t("Project created."));
      setCreating(false);
      setNewName("");
      openProject(project.id);
    } catch {
      toast.error(t("We couldn't save the project."));
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async () => {
    if (!renaming) return;
    const name = renameValue.trim();
    if (!name) {
      toast.error(t("Give the project a name."));
      return;
    }
    setBusy(true);
    try {
      await renameProject(renaming.id, name);
      toast.success(t("Project renamed."));
      setRenaming(null);
      await refresh();
    } catch {
      toast.error(t("We couldn't save the project."));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await deleteProject(removing.id);
      toast.success(t("Project deleted."));
      setRemoving(null);
      await refresh();
    } catch {
      toast.error(t("We couldn't save the project."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-3 px-4">
          <SideMenu />
          <span className="flex min-w-0 items-center justify-center gap-2">
            {branding.ready &&
              (branding.logo_url ? (
                <img src={branding.logo_url} alt={branding.system_name} className="h-7 w-auto" />
              ) : (
                <Scissors className="size-4 text-primary" />
              ))}
            <span className="truncate font-display text-base font-bold tracking-tight">
              {branding.ready ? branding.system_name : ""}
            </span>
          </span>
          <div className="flex items-center justify-end gap-2">
            <NotificationBell />
            <CreditMeter account={account} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">{t("My projects")}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Each project keeps its own edit settings, overlays and titles.")}
            </p>
          </div>
          <Button
            onClick={() => {
              setNewName("");
              setCreating(true);
            }}
          >
            <Plus className="mr-1.5 size-4" /> {t("New project")}
          </Button>
        </div>

        {loading ? (
          <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("Loading…")}
          </p>
        ) : projects.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
            <Film className="mx-auto size-7 text-primary" />
            <p className="mt-3 text-sm font-semibold">
              {t("You have no projects yet. Create the first one.")}
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {projects.map((project) => (
              <li
                key={project.id}
                className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
              >
                <button
                  type="button"
                  onClick={() => openProject(project.id)}
                  className="block w-full text-left"
                >
                  <p className="truncate text-sm font-bold">{project.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("Last edited {when}", {
                      when: new Date(project.updatedAt).toLocaleString(),
                    })}
                  </p>
                </button>
                <div className="mt-4 flex items-center gap-2">
                  <Button size="sm" className="flex-1" onClick={() => openProject(project.id)}>
                    {t("Open")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRenaming(project);
                      setRenameValue(project.name);
                    }}
                    aria-label={t("Rename")}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRemoving(project)}
                    aria-label={t("Delete")}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("New project")}</DialogTitle>
            <DialogDescription>
              {t("Each project keeps its own edit settings, overlays and titles.")}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            placeholder={t("e.g. Cinema batch")}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
          />
          <Button disabled={busy} onClick={() => void handleCreate()}>
            {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null} {t("Create")}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Rename")}</DialogTitle>
            <DialogDescription>{t("Project name")}</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleRename()}
          />
          <Button disabled={busy} onClick={() => void handleRename()}>
            {t("Save")}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Delete this project?")}</DialogTitle>
            <DialogDescription>{t("The edit settings saved in it are lost.")}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setRemoving(null)}>
              {t("Cancel")}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={busy}
              onClick={() => void handleDelete()}
            >
              {t("Delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

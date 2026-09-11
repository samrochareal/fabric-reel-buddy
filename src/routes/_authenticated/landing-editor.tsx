import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Monitor, RotateCcw, Save, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LandingView, type LandingDevice } from "@/components/landing/landing-view";
import { fetchBranding, useBranding, useRefreshBranding } from "@/lib/branding";
import {
  defaultLandingContent,
  normalizeLandingContent,
  saveLandingContent,
  type LandingContent,
} from "@/lib/landing-content";
import { useIsAdmin } from "@/lib/admin";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/landing-editor")({
  head: () => ({
    meta: [
      { title: "Editor da Landing Page" },
      { name: "description", content: "Edite textos, cores, imagens e a ordem das seções da landing page." },
      { property: "og:title", content: "Editor da Landing Page" },
      { property: "og:description", content: "Edição visual da landing page: clique no texto, arraste blocos e salve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LandingEditorPage,
});

function LandingEditorPage() {
  const t = useT();
  const navigate = useNavigate();
  const { isAdmin, loading } = useIsAdmin();
  const branding = useBranding();
  const refreshBranding = useRefreshBranding();

  const [device, setDevice] = useState<LandingDevice>("desktop");
  const [content, setContent] = useState<LandingContent>(defaultLandingContent);
  const [saved, setSaved] = useState<LandingContent>(defaultLandingContent);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(content) !== JSON.stringify(saved);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error(t("This area is for the master user only."));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [isAdmin, loading, navigate, t]);

  useEffect(() => {
    void fetchBranding().then((b) => {
      const normalized = normalizeLandingContent(b.landing_content);
      setContent(normalized);
      setSaved(normalized);
    });
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveLandingContent(content);
      setSaved(content);
      refreshBranding();
      toast.success("Landing Page atualizada.");
    } catch {
      toast.error("Não foi possível salvar a Landing Page.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3">
          <Link
            to="/admin"
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              if (dirty && !window.confirm("Você tem alterações não salvas. Sair mesmo assim?")) e.preventDefault();
            }}
          >
            <ArrowLeft className="size-3.5" /> {t("Master panel")}
          </Link>
          <span className="font-display text-base font-bold tracking-tight">Landing Page</span>

          <div className="flex rounded-lg border border-border p-0.5">
            {([
              ["desktop", "Desktop", Monitor],
              ["mobile", "Celular", Smartphone],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setDevice(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors",
                  device === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {([
              ["primary", "Principal"],
              ["background", "Fundo"],
              ["accent", "Destaque"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5 text-[11px] font-semibold" title={label}>
                <input
                  type="color"
                  className="size-7 cursor-pointer rounded border-0 bg-transparent"
                  value={content.colors[key]}
                  onChange={(e) => setContent((c) => ({ ...c, colors: { ...c.colors, [key]: e.target.value } }))}
                />
                <span className="hidden sm:inline">{label}</span>
              </label>
            ))}
            <Button variant="outline" size="sm" disabled={!dirty} onClick={() => setContent(saved)}>
              <RotateCcw className="size-3.5" /> Desfazer
            </Button>
            <Button size="sm" onClick={() => void onSave()} disabled={saving || !dirty}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Salvar
            </Button>
          </div>
        </div>
        <p className="border-t border-border/60 px-4 py-1.5 text-[11px] text-muted-foreground">
          Clique em qualquer texto para editar. Arraste os blocos e as seções para reordenar. Campo em branco não aparece
          na landing page.
          {dirty && <span className="ml-2 font-bold text-primary">Alterações não salvas</span>}
        </p>
      </header>

      <div className="mx-auto w-full px-4 py-6">
        <div
          className={cn(
            "mx-auto overflow-hidden rounded-2xl border border-border bg-background shadow-xl",
            device === "mobile" ? "max-w-[430px]" : "max-w-[1280px]",
          )}
        >
          <LandingView
            content={content}
            systemName={branding.system_name}
            brandImage={branding.logo_url || branding.icon_url}
            device={device}
            edit={{ update: (fn) => setContent((c) => fn(c)) }}
          />
        </div>
      </div>
    </div>
  );
}

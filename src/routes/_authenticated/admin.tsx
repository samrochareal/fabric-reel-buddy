import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, Image as ImageIcon, Loader2, Palette, Save, Users, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPlatformStats, useIsAdmin } from "@/lib/admin";
import { defaultBranding, fetchBranding, saveBranding, useRefreshBranding, type Palette as BrandPalette } from "@/lib/branding";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel master — Fábrica de Reels" },
      {
        name: "description",
        content:
          "Painel master com uso da plataforma, contas cadastradas, vídeos processados e a identidade visual do sistema.",
      },
      { property: "og:title", content: "Painel master — Fábrica de Reels" },
      {
        property: "og:description",
        content: "Acompanhe o uso da plataforma e personalize nome, cores, logo e ícone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function readFileAsDataUrl(file: File, maxBytes = 400_000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error("Escolha uma imagem de até 400KB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useIsAdmin();
  const refreshBranding = useRefreshBranding();

  const [name, setName] = useState(defaultBranding.system_name);
  const [tagline, setTagline] = useState("");
  const [palette, setPalette] = useState<BrandPalette>(defaultBranding.palette);
  const [logo, setLogo] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Esta área é exclusiva do usuário master.");
      void navigate({ to: "/", replace: true });
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    void fetchBranding().then((b) => {
      setName(b.system_name);
      setTagline(b.tagline ?? "");
      setPalette(b.palette);
      setLogo(b.logo_url);
      setIcon(b.icon_url);
    });
  }, []);

  const stats = useQuery({
    queryKey: ["platform-stats"],
    queryFn: fetchPlatformStats,
    enabled: isAdmin,
    refetchInterval: 60_000,
  });

  const onSave = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome do sistema.");
      return;
    }
    setSaving(true);
    try {
      await saveBranding({
        system_name: name.trim(),
        tagline: tagline.trim() || null,
        palette,
        logo_url: logo,
        icon_url: icon,
      });
      refreshBranding();
      toast.success("Identidade do sistema atualizada.");
    } catch {
      toast.error("Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  const s = stats.data;
  const maxDaily = Math.max(1, ...(s?.daily ?? []).map((d) => d.videos));

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/60"
          >
            <ArrowLeft className="size-3.5" /> Editor
          </Link>
          <span className="font-display text-base font-bold tracking-tight">Painel master</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4">
        <section className="pt-6">
          <h1 className="font-display text-xl font-bold tracking-tight">Como a plataforma está sendo usada</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Os números são atualizados automaticamente a cada minuto.
          </p>

          {stats.isLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Carregando números…
            </div>
          ) : stats.isError ? (
            <p className="mt-4 text-sm text-destructive">Não foi possível carregar os números agora.</p>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  icon={<Users className="size-4" />}
                  label="Contas cadastradas"
                  value={s?.total_users ?? 0}
                  hint={`${s?.new_users_7d ?? 0} nos últimos 7 dias`}
                />
                <Stat
                  icon={<Video className="size-4" />}
                  label="Vídeos processados"
                  value={s?.total_videos ?? 0}
                  hint={`${s?.videos_7d ?? 0} nos últimos 7 dias`}
                />
                <Stat
                  icon={<BarChart3 className="size-4" />}
                  label="Pessoas ativas (30 dias)"
                  value={s?.active_users_30d ?? 0}
                  hint={`${s?.videos_30d ?? 0} vídeos no período`}
                />
                <Stat
                  icon={<ImageIcon className="size-4" />}
                  label="Overlays salvas"
                  value={s?.overlay_presets ?? 0}
                  hint={`${s?.total_minutes ?? 0} min de vídeo no total`}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Vídeos por dia (últimas 2 semanas)
                </p>
                <div className="mt-4 flex h-32 items-end gap-1.5">
                  {(s?.daily ?? []).map((d) => (
                    <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                      <div
                        className="w-full rounded-t bg-primary/80"
                        style={{ height: `${Math.max(3, (d.videos / maxDaily) * 100)}%` }}
                        title={`${d.videos} vídeo(s)`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(d.day).getUTCDate()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            <h2 className="font-display text-lg font-bold tracking-tight">Identidade do sistema</h2>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold">Nome do sistema</p>
              <Input className="mt-1.5 h-11" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <p className="text-xs font-semibold">Frase de apoio (opcional)</p>
              <Input
                className="mt-1.5 h-11"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Edite vídeos em massa"
              />
            </div>
          </div>

          <p className="mt-5 text-xs font-semibold">Paleta de cores</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {([
              ["primary", "Cor principal"],
              ["background", "Fundo"],
              ["accent", "Destaque"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 rounded-lg border border-border bg-background/60 p-3">
                <input
                  type="color"
                  className="size-9 cursor-pointer rounded border-0 bg-transparent"
                  value={palette[key]}
                  onChange={(e) => setPalette((p) => ({ ...p, [key]: e.target.value }))}
                />
                <span className="text-xs">
                  <span className="font-semibold">{label}</span>
                  <span className="block text-muted-foreground">{palette[key]}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {([
              ["logo", "Logo (aparece no topo)", logo, setLogo] as const,
              ["icon", "Ícone do navegador", icon, setIcon] as const,
            ]).map(([key, label, value, set]) => (
              <div key={key} className="rounded-lg border border-border bg-background/60 p-3">
                <p className="text-xs font-semibold">{label}</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
                    {value ? (
                      <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <ImageIcon className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      className="text-xs"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          set(await readFileAsDataUrl(file));
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Imagem inválida.");
                        }
                      }}
                    />
                    {value && (
                      <button
                        type="button"
                        className="w-fit text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => set(null)}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button className="mt-6 h-11 w-full sm:w-auto" onClick={() => void onSave()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Salvar identidade
          </Button>
        </section>
      </div>
    </div>
  );
}

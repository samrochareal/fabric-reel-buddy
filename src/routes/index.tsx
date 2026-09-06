import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Scissors,
  UploadCloud,
  Loader2,
  Download,
  Trash2,
  Zap,
  Archive,
  X,
  RotateCcw,
  Play,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ASPECTS,
  defaultEditOptions,
  type AspectId,
  type EditOptions,
} from "@/lib/video";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Editor em lote — Fábrica de Reels" },
      { name: "description", content: "Edite e processe até 50 vídeos de uma vez." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditorPage,
});

type ClipStatus = "queued" | "processing" | "done" | "error";

type Clip = {
  id: string;
  file: File;
  previewUrl: string;
  status: ClipStatus;
  progress: number;
  resultBlob?: Blob;
  resultUrl?: string;
  resultName?: string;
  error?: string;
};

const MAX_CLIPS = 500;
type EditTab = "bordas" | "titulo" | "inferior" | "overlay" | "extras";
const TABS: { id: EditTab; label: string }[] = [
  { id: "bordas", label: "Bordas" },
  { id: "titulo", label: "Título" },
  { id: "inferior", label: "Inferior" },
  { id: "overlay", label: "Overlay" },
  { id: "extras", label: "Extras" },
];

function statusLabel(status: ClipStatus, progress: number) {
  if (status === "done") return "pronto";
  if (status === "error") return "falhou";
  if (status === "processing") return `${Math.round(progress * 100)}%`;
  return "aguardando";
}

function EditorPage() {

  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [opts, setOpts] = useState<EditOptions>(defaultEditOptions);
  const [grid, setGrid] = useState<1 | 4 | 9>(1);
  const [tab, setTab] = useState<EditTab>("titulo");
  const [antiDup, setAntiDup] = useState(false);
  const [running, setRunning] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);


  const patch = (next: Partial<EditOptions>) => setOpts((prev) => ({ ...prev, ...next }));

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files).filter((f) => f.type.startsWith("video/"));
    if (incoming.length === 0) {
      toast.error("Selecione arquivos de vídeo.");
      return;
    }
    setClips((prev) => {
      const room = MAX_CLIPS - prev.length;
      if (incoming.length > room) toast.error(`Máximo de ${MAX_CLIPS} vídeos por lote.`);
      const next = incoming.slice(0, room).map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "queued" as ClipStatus,
        progress: 0,
      }));
      const merged = [...prev, ...next];
      if (!selectedId && merged[0]) setSelectedId(merged[0].id);
      return merged;
    });
  }, [selectedId]);

  const removeClip = (id: string) =>
    setClips((prev) => {
      const clip = prev.find((c) => c.id === id);
      if (clip) URL.revokeObjectURL(clip.previewUrl);
      const rest = prev.filter((c) => c.id !== id);
      if (selectedId === id) setSelectedId(rest[0]?.id ?? null);
      return rest;
    });

  const clearAll = () =>
    setClips((prev) => {
      prev.forEach((c) => URL.revokeObjectURL(c.previewUrl));
      setSelectedId(null);
      return [];
    });

  const queuedClips = clips.filter((c) => c.status === "queued" || c.status === "error");
  const doneClips = clips.filter((c) => c.status === "done");
  const activeClip = clips.find((c) => c.status === "processing");
  const selected = clips.find((c) => c.id === selectedId) ?? clips[0];

  const titleLines = useMemo(
    () => opts.title.text.split("\n").map((l) => l.trim()),
    [opts.title.text],
  );
  const titleFor = (index: number) =>
    opts.title.enabled ? (titleLines[index] ?? titleLines[titleLines.length - 1] ?? "") : "";

  const effectiveOpts = (): EditOptions =>
    antiDup ? { ...opts, speed: opts.speed === 1 ? 1.02 : opts.speed } : opts;

  async function handleProcess() {
    if (queuedClips.length === 0) {
      toast.error("Adicione vídeos para processar.");
      return;
    }

    setRunning(true);
    cancelledRef.current = false;
    const settings = effectiveOpts();
    try {
      const videoLib = await import("@/lib/video");
      if (!engineReady) {
        toast.info("Preparando o motor de vídeo (só na primeira vez)…");
        await videoLib.getFFmpeg();
        setEngineReady(true);
      }

      toast.success(`Processando ${queuedClips.length} vídeo(s)…`);

      for (const clip of queuedClips) {
        if (cancelledRef.current) break;
        const index = clips.findIndex((c) => c.id === clip.id);
        setClips((prev) =>
          prev.map((c) => (c.id === clip.id ? { ...c, status: "processing", progress: 0 } : c)),
        );
        try {
          const blob = await videoLib.processVideo(
            clip.file,
            settings,
            titleFor(index),
            (ratio) =>
              setClips((prev) => prev.map((c) => (c.id === clip.id ? { ...c, progress: ratio } : c))),
          );
          setClips((prev) =>
            prev.map((c) =>
              c.id === clip.id
                ? {
                    ...c,
                    status: "done",
                    progress: 1,
                    resultBlob: blob,
                    resultUrl: URL.createObjectURL(blob),
                    resultName: videoLib.outputName(clip.file.name, settings.aspect),
                  }
                : c,
            ),
          );
        } catch (err) {
          setClips((prev) =>
            prev.map((c) =>
              c.id === clip.id
                ? {
                    ...c,
                    status: "error",
                    error: err instanceof Error ? err.message : "Falha ao processar",
                  }
                : c,
            ),
          );
        }
      }
      toast.success("Lote concluído!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar.");
    } finally {
      setRunning(false);
    }
  }

  function downloadClip(clip: Clip) {
    if (!clip.resultBlob || !clip.resultName) return;
    const url = URL.createObjectURL(clip.resultBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = clip.resultName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function downloadAll() {
    if (doneClips.length === 0) return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const clip of doneClips) {
      if (clip.resultBlob && clip.resultName) zip.file(clip.resultName, clip.resultBlob);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fabrica-de-reels.zip";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }


  const gridClips = grid === 1 ? (selected ? [selected] : []) : clips.slice(0, grid);
  const { w: outW, h: outH } = ASPECTS[opts.aspect];

  const framePreview = (clip: Clip | undefined, small: boolean) => (
    <div
      className="relative overflow-hidden rounded-md bg-black"
      style={{ aspectRatio: `${outW} / ${outH}`, containerType: "inline-size" }}
    >
      {clip ? (
        <video
          key={clip.id}
          src={clip.resultUrl ?? clip.previewUrl}
          className="size-full object-cover"
          style={{
            transform: `scale(${opts.zoom}) ${opts.mirror ? "scaleX(-1)" : ""}`,
            objectPosition: `${opts.posX * 100}% ${opts.posY * 100}%`,
          }}
          muted
          loop
          playsInline
          controls={!small && grid === 1}
          preload="metadata"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
          sem vídeo
        </div>
      )}
      {opts.overlayOpacity > 0 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: opts.overlayColor, opacity: opts.overlayOpacity }}
        />
      )}
      {opts.border.enabled && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            border: `${((opts.border.width / outW) * 100).toFixed(2)}cqw solid ${opts.border.color}`,
          }}
        />
      )}
      {opts.title.enabled && (
        <p
          className="pointer-events-none absolute inset-x-[7%] top-[8%] text-center font-bold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          style={{
            color: opts.title.color,
            fontSize: `${((opts.title.size / outW) * 100).toFixed(2)}cqw`,
          }}
        >
          {titleFor(clips.findIndex((c) => c.id === clip?.id)) || "Título do vídeo"}
        </p>
      )}
      {opts.bottom.enabled && opts.bottom.text && (
        <p
          className="pointer-events-none absolute inset-x-[7%] bottom-[8%] text-center font-bold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          style={{
            color: opts.bottom.color,
            fontSize: `${((opts.bottom.size / outW) * 100).toFixed(2)}cqw`,
          }}
        >
          {opts.bottom.text}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4">
          <span className="mx-auto flex items-center gap-2">
            <Scissors className="size-4 text-primary" />
            <span className="font-display text-base font-bold tracking-tight">
              fabrica <span className="text-muted-foreground">de</span> reels
            </span>
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground sm:inline">
              {clips.length}/{MAX_CLIPS} na fila
            </span>
            <span className="rounded-full border border-turbo/50 bg-turbo/10 px-3 py-1 text-xs font-bold text-turbo">
              Premium · ilimitado
            </span>
            <a
              href="mailto:suporte@fabricadereels.com.br"
              className="hidden rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold md:inline"
            >
              Suporte
            </a>
            <span className="hidden text-muted-foreground lg:inline">
              <HelpCircle className="size-4" />
            </span>
          </div>
        </div>
      </header>

      <div className="flex items-end justify-between gap-4 px-4 pt-5">
        <h1 className="font-display text-xl font-bold tracking-tight">Editor em lote</h1>
        <p className="text-xs text-muted-foreground">
          Até {MAX_CLIPS} vídeos por lote · processamento no seu navegador · uso ilimitado
        </p>
      </div>

      <main className="grid gap-4 px-4 pb-24 pt-4 xl:grid-cols-[260px_minmax(0,1fr)_280px_300px]">
        {/* ---------- Column 1: upload + queue ---------- */}
        <section className="space-y-3">
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-4 py-8 text-center transition-colors hover:border-primary/60 hover:bg-card"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          >
            <UploadCloud className="size-6 text-primary" />
            <p className="mt-2 text-sm font-semibold">Arraste vídeos ou clique</p>
            <p className="mt-0.5 text-xs text-muted-foreground">MP4, MOV, WebM</p>
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
              <p className="text-xs font-semibold">
                {clips.length} vídeo{clips.length === 1 ? "" : "s"} · {doneClips.length} prontos
              </p>
              <button
                type="button"
                onClick={clearAll}
                disabled={running || clips.length === 0}
                className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                aria-label="Limpar fila"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <div className="flex items-start gap-2 border-b border-border/60 bg-turbo/10 px-3 py-3 text-xs font-semibold text-turbo">
              <Zap className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1">
                Todas as funções liberadas: títulos, bordas, overlay, velocidade e lotes sem limite
              </span>
            </div>

            <ul className="max-h-[540px] divide-y divide-border/60 overflow-y-auto">
              {clips.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Sua fila está vazia.
                </li>
              )}
              {clips.map((clip) => (
                <li key={clip.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(clip.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                      selected?.id === clip.id ? "bg-primary/10" : "hover:bg-muted/40"
                    }`}
                  >
                    <video
                      src={clip.previewUrl}
                      className="size-10 shrink-0 rounded object-cover"
                      muted
                      preload="metadata"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">{clip.file.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {(clip.file.size / 1024 / 1024).toFixed(1)} MB ·{" "}
                        {statusLabel(clip.status, clip.progress)}
                      </span>
                    </span>
                    {clip.status === "done" ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadClip(clip);
                        }}
                        className="rounded p-1 text-turbo hover:bg-turbo/10"
                      >
                        <Download className="size-4" />
                      </span>
                    ) : (
                      !running && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            removeClip(clip.id);
                          }}
                          className="rounded p-1 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-4" />
                        </span>
                      )
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- Column 2: preview ---------- */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Prévia · {ASPECTS[opts.aspect].label}
            </p>
            <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
              {([1, 4, 9] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrid(g)}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                    grid === g
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g === 1 ? "1X" : g === 4 ? "2X2" : "3X3"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div
              className={`mx-auto grid gap-2 ${
                grid === 1
                  ? "max-w-[300px] grid-cols-1"
                  : grid === 4
                    ? "max-w-[420px] grid-cols-2"
                    : "max-w-[520px] grid-cols-3"
              }`}
            >
              {gridClips.length === 0
                ? framePreview(undefined, grid !== 1)
                : gridClips.map((clip) => (
                    <div key={clip.id}>{framePreview(clip, grid !== 1)}</div>
                  ))}
            </div>

            {activeClip && (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-xs">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span className="flex-1 truncate">{activeClip.file.name}</span>
                  <span className="text-muted-foreground">
                    {Math.round(activeClip.progress * 100)}%
                  </span>
                </div>
                <Progress value={activeClip.progress * 100} className="mt-2 h-1.5" />
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
                {(Object.keys(ASPECTS) as AspectId[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => patch({ aspect: a })}
                    className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                      opts.aspect === a
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
                {(["turbo", "completo"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => patch({ mode: m })}
                    className={`rounded-md px-3 py-1 text-xs font-bold capitalize transition-colors ${
                      opts.mode === m
                        ? "bg-turbo text-turbo-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "turbo" ? "Turbo (corte)" : "Completo (fundo)"}
                  </button>
                ))}
              </div>
              {doneClips.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => void downloadAll()}>
                  <Archive className="mr-1.5 size-4" /> Baixar tudo (.zip)
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* ---------- Column 3: batch fine-tune ---------- */}
        <section className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">
                Config. em lote{" "}
                <span className="font-normal text-muted-foreground">
                  ({clips.length || 0} vídeo{clips.length === 1 ? "" : "s"})
                </span>
              </p>
              <button
                type="button"
                onClick={() => patch({ zoom: 1, posX: 0.5, posY: 0.5 })}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="size-3.5" /> Padrão
              </button>
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ajuste fino do vídeo
            </p>

            <div className="mt-3 space-y-4">
              {[
                {
                  label: "Zoom",
                  value: opts.zoom,
                  display: `${Math.round(opts.zoom * 100)}%`,
                  min: 1,
                  max: 2,
                  step: 0.01,
                  set: (v: number) => patch({ zoom: v }),
                },
                {
                  label: "Posição vertical",
                  value: opts.posY,
                  display: `${Math.round(opts.posY * 100)}%`,
                  min: 0,
                  max: 1,
                  step: 0.01,
                  set: (v: number) => patch({ posY: v }),
                },
                {
                  label: "Posição horizontal",
                  value: opts.posX,
                  display: `${Math.round(opts.posX * 100)}%`,
                  min: 0,
                  max: 1,
                  step: 0.01,
                  set: (v: number) => patch({ posX: v }),
                },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-bold">{row.display}</span>
                  </div>
                  <Slider
                    className="mt-2"
                    value={[row.value]}
                    min={row.min}
                    max={row.max}
                    step={row.step}
                    onValueChange={([v]) => row.set(v ?? row.value)}
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Ajusta zoom e posição do recorte em todos os vídeos do lote.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold">Modo anti duplicidade</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Aplica pequenas variações em todos os vídeos para reduzir detecção de duplicidade.
                </p>
              </div>
              <Switch checked={antiDup} onCheckedChange={setAntiDup} />
            </div>

            <div className="mt-4 space-y-3 border-t border-border/60 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Velocidade {opts.speed.toFixed(2)}x
                </span>
                <div className="w-28">
                  <Slider
                    value={[opts.speed]}
                    min={0.9}
                    max={1.15}
                    step={0.01}
                    onValueChange={([v]) => patch({ speed: v ?? 1 })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Espelhar vídeos</span>
                <Switch
                  checked={opts.mirror}
                  onCheckedChange={(v) => patch({ mirror: v })}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Fade de entrada</span>
                <Switch checked={opts.fadeIn} onCheckedChange={(v) => patch({ fadeIn: v })} />
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Column 4: edit tabs + process ---------- */}
        <section className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setOpts(defaultEditOptions())}
            disabled={running}
          >
            <RotateCcw className="mr-1.5 size-4" /> Resetar todas as edições
          </Button>

          <div className="rounded-xl border border-border bg-card p-2">
            <div className="flex flex-wrap gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === t.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            {tab === "bordas" && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">Borda no vídeo</p>
                  <Switch
                    checked={opts.border.enabled}
                    onCheckedChange={(v) => patch({ border: { ...opts.border, enabled: v } })}
                  />
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Cor</span>
                    <Input
                      type="color"
                      value={opts.border.color}
                      onChange={(e) => patch({ border: { ...opts.border, color: e.target.value } })}
                      className="h-8 w-16 p-1"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Espessura</span>
                      <span className="font-bold">{opts.border.width}px</span>
                    </div>
                    <Slider
                      className="mt-2"
                      value={[opts.border.width]}
                      min={4}
                      max={120}
                      step={2}
                      onValueChange={([v]) =>
                        patch({ border: { ...opts.border, width: v ?? opts.border.width } })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {tab === "titulo" && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">Título no vídeo</p>
                  <Switch
                    checked={opts.title.enabled}
                    onCheckedChange={(v) => patch({ title: { ...opts.title, enabled: v } })}
                  />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Ative para escrever uma lista de títulos — um por linha. Cada linha vai para o
                  vídeo correspondente da fila.
                </p>
                <Textarea
                  className="mt-3 min-h-[120px] text-xs"
                  placeholder={"Título do vídeo 1\nTítulo do vídeo 2\nTítulo do vídeo 3"}
                  value={opts.title.text}
                  onChange={(e) => patch({ title: { ...opts.title, text: e.target.value } })}
                  disabled={!opts.title.enabled}
                />
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Cor</span>
                    <Input
                      type="color"
                      value={opts.title.color}
                      onChange={(e) => patch({ title: { ...opts.title, color: e.target.value } })}
                      className="h-8 w-16 p-1"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Tamanho</span>
                      <span className="font-bold">{opts.title.size}px</span>
                    </div>
                    <Slider
                      className="mt-2"
                      value={[opts.title.size]}
                      min={28}
                      max={120}
                      step={2}
                      onValueChange={([v]) =>
                        patch({ title: { ...opts.title, size: v ?? opts.title.size } })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {titleLines.filter(Boolean).length} título(s) para {clips.length} vídeo(s)
                  </p>
                </div>
              </>
            )}

            {tab === "inferior" && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">Texto inferior</p>
                  <Switch
                    checked={opts.bottom.enabled}
                    onCheckedChange={(v) => patch({ bottom: { ...opts.bottom, enabled: v } })}
                  />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Mesma legenda no rodapé de todos os vídeos — ideal para @ ou CTA.
                </p>
                <Input
                  className="mt-3 text-xs"
                  placeholder="@seuperfil · siga para mais"
                  value={opts.bottom.text}
                  onChange={(e) => patch({ bottom: { ...opts.bottom, text: e.target.value } })}
                  disabled={!opts.bottom.enabled}
                />
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Cor</span>
                    <Input
                      type="color"
                      value={opts.bottom.color}
                      onChange={(e) => patch({ bottom: { ...opts.bottom, color: e.target.value } })}
                      className="h-8 w-16 p-1"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Tamanho</span>
                      <span className="font-bold">{opts.bottom.size}px</span>
                    </div>
                    <Slider
                      className="mt-2"
                      value={[opts.bottom.size]}
                      min={20}
                      max={90}
                      step={2}
                      onValueChange={([v]) =>
                        patch({ bottom: { ...opts.bottom, size: v ?? opts.bottom.size } })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {tab === "overlay" && (
              <>
                <p className="text-sm font-bold">Overlay de cor</p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Uma camada de cor sobre o vídeo — útil para escurecer o fundo e destacar o título.
                </p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Cor</span>
                    <Input
                      type="color"
                      value={opts.overlayColor}
                      onChange={(e) => patch({ overlayColor: e.target.value })}
                      className="h-8 w-16 p-1"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Intensidade</span>
                      <span className="font-bold">{Math.round(opts.overlayOpacity * 100)}%</span>
                    </div>
                    <Slider
                      className="mt-2"
                      value={[opts.overlayOpacity]}
                      min={0}
                      max={0.8}
                      step={0.01}
                      onValueChange={([v]) => patch({ overlayOpacity: v ?? 0 })}
                    />
                  </div>
                </div>
              </>
            )}

            {tab === "extras" && (
              <div className="space-y-3 text-xs">
                <p className="text-sm font-bold">Extras</p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Espelhar vídeos</span>
                  <Switch checked={opts.mirror} onCheckedChange={(v) => patch({ mirror: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fade de entrada</span>
                  <Switch checked={opts.fadeIn} onCheckedChange={(v) => patch({ fadeIn: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Anti duplicidade</span>
                  <Switch checked={antiDup} onCheckedChange={setAntiDup} />
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Todo o processamento roda no seu navegador: os arquivos nunca são enviados para
                  nenhum servidor.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  <Zap className="size-4 text-turbo" /> Modo Turbo
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Processamento mais rápido com leve redução de qualidade.
                </p>
              </div>
              <Switch
                checked={opts.mode === "turbo"}
                onCheckedChange={(v) => patch({ mode: v ? "turbo" : "completo" })}
              />
            </div>
          </div>

          <div className="sticky bottom-4 space-y-2">
            <Button
              className="h-12 w-full text-base"
              onClick={() => void handleProcess()}
              disabled={running || queuedClips.length === 0}
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" /> Processando…
                </>
              ) : (
                <>
                  <Play className="mr-2 size-5" /> Processar {queuedClips.length} vídeo
                  {queuedClips.length === 1 ? "" : "s"}
                </>
              )}
            </Button>
            {running && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  cancelledRef.current = true;
                  toast.info("O lote será interrompido após o vídeo atual.");
                }}
              >
                Cancelar lote
              </Button>
            )}
            <p className="text-center text-[11px] text-muted-foreground">
              Sem custo por vídeo · todas as funções desbloqueadas
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getProject, registerProcessed } from "@/lib/projects";
import { listOverlays, type OverlayPreset } from "@/lib/overlays";

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
  Pause,
  Plus,
  Sparkles,
  Volume2,
  VolumeX,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ASPECTS, defaultEditOptions, type EditOptions } from "@/lib/video";


export const Route = createFileRoute("/editor/$projectId")({
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

const MAX_CLIPS = 100;
type EditTab = "titulo" | "inferior" | "overlay" | "extras";
const TABS: { id: EditTab; label: string }[] = [
  { id: "titulo", label: "Título" },
  { id: "inferior", label: "Inferior" },
  { id: "overlay", label: "Overlay" },
  { id: "extras", label: "Extras" },
];

type FineTune = { zoom: number; posX: number; posY: number };

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
  
  const [tab, setTab] = useState<EditTab>("titulo");
  const [antiDup, setAntiDup] = useState(false);
  const [scope, setScope] = useState<"batch" | "single">("batch");
  const [overrides, setOverrides] = useState<Record<string, FineTune>>({});
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  const [engineReady, setEngineReady] = useState(false);
  const { projectId } = Route.useParams();
  const [projectName, setProjectName] = useState<string | null>(null);
  useEffect(() => {
    setProjectName(getProject(projectId)?.name ?? null);
  }, [projectId]);

  const inputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [savedOverlays, setSavedOverlays] = useState<OverlayPreset[]>([]);

  useEffect(() => {
    setSavedOverlays(listOverlays());
  }, []);
  const cancelledRef = useRef(false);

  // our own player state, so the play button never moves with the video
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(true);

  const togglePlay = () => {
    const el = playerRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  const seekTo = (ratio: number) => {
    const el = playerRef.current;
    setPos(ratio);
    if (el && el.duration) el.currentTime = ratio * el.duration;
  };

  const fmtTime = (s: number) => {
    if (!Number.isFinite(s) || s <= 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };



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

  /** batch options merged with the per-video fine-tune override, if any */
  const optsFor = (clipId?: string): EditOptions => {
    const over = clipId ? overrides[clipId] : undefined;
    const merged = over ? { ...opts, ...over } : opts;
    return antiDup ? { ...merged, speed: merged.speed === 1 ? 1.02 : merged.speed } : merged;
  };

  const fine: FineTune =
    scope === "single" && selected && overrides[selected.id]
      ? overrides[selected.id]!
      : { zoom: opts.zoom, posX: opts.posX, posY: opts.posY };

  const patchFine = (next: Partial<FineTune>) => {
    if (scope === "single" && selected) {
      const id = selected.id;
      setOverrides((prev) => ({
        ...prev,
        [id]: { ...{ zoom: opts.zoom, posX: opts.posX, posY: opts.posY }, ...prev[id], ...next },
      }));
    } else {
      patch(next);
    }
  };

  const resetFine = () => {
    if (scope === "single" && selected) {
      const id = selected.id;
      setOverrides((prev) => {
        const rest = { ...prev };
        delete rest[id];
        return rest;
      });
    } else {
      patch({ zoom: 1, posX: 2.5, posY: 2.5 });
    }
  };

  async function handleProcess() {
    if (queuedClips.length === 0) {
      toast.error("Adicione vídeos para processar.");
      return;
    }

    setRunning(true);
    setPaused(false);
    cancelledRef.current = false;

    let rendered = 0;

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
        const settings = optsFor(clip.id);
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
          rendered += 1;
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

      if (rendered > 0) registerProcessed(projectId, rendered);
      if (cancelledRef.current) {
        toast.info("Processamento pausado. Clique em “Processar vídeos” para continuar.");
      } else {
        toast.success("Lote concluído! Use “Baixar todos” para salvar tudo.");
      }


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


  const previewClip = selected;
  const { w: outW, h: outH } = ASPECTS[opts.aspect];

  const framePreview = (clip: Clip | undefined, small: boolean) => {
    const o = optsFor(clip?.id);
    const isMain = !small && !!clip && clip.id === selected?.id;

    return (
    <div
      className="relative overflow-hidden rounded-md"
      style={{
        aspectRatio: `${outW} / ${outH}`,
        containerType: "inline-size",
        background: o.bgColor,
      }}
    >
      {o.bgImage.enabled && o.bgImage.src && o.bgImage.layer !== "front" && (
        <img
          src={o.bgImage.src}
          alt=""
          className="pointer-events-none absolute inset-0 size-full object-cover"
          style={{ opacity: o.bgImage.opacity }}
        />
      )}

      {clip ? (
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(${(o.border.top * 100).toFixed(2)}% 0% ${(o.border.bottom * 100).toFixed(2)}% 0%)`,
          }}
        >
        <div
          className="absolute"
          style={{
            width: `${o.zoom * 100}%`,
            height: `${o.zoom * 100}%`,
            left: `${(1 - o.zoom) * 50 + ((o.posX - 2.5) / 2.5) * 100}%`,
            top: `${(1 - o.zoom) * 50 + ((o.posY - 2.5) / 2.5) * 100}%`,
          }}
        >

          <video
            key={clip.id}
            ref={isMain ? playerRef : undefined}
            src={clip.resultUrl ?? clip.previewUrl}
            className="size-full object-cover"
            style={{ transform: o.mirror ? "scaleX(-1)" : undefined }}
            muted={isMain ? muted : true}
            loop
            playsInline
            preload="metadata"
            onLoadedMetadata={
              isMain
                ? (e) => setDuration(e.currentTarget.duration || 0)
                : undefined
            }
            onTimeUpdate={
              isMain
                ? (e) => {
                    const el = e.currentTarget;
                    if (el.duration) setPos(el.currentTime / el.duration);
                  }
                : undefined
            }
            onPlay={isMain ? () => setPlaying(true) : undefined}
            onPause={isMain ? () => setPlaying(false) : undefined}
          />
        </div>
        </div>
      ) : (
        <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
          sem vídeo
        </div>
      )}

      {o.bgImage.enabled && o.bgImage.src && o.bgImage.layer === "front" && (
        <img
          src={o.bgImage.src}
          alt=""
          className="pointer-events-none absolute inset-0 size-full object-cover"
          style={{ opacity: o.bgImage.opacity }}
        />
      )}

      {o.overlayOpacity > 0 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: o.overlayColor, opacity: o.overlayOpacity }}
        />
      )}

      {/* dashed guides: the video is trimmed here, the background stays visible */}

      {(o.border.top > 0 || o.border.bottom > 0) && !small && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-primary/70"
            style={{ top: `${o.border.top * 100}%` }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-primary/70"
            style={{ bottom: `${o.border.bottom * 100}%` }}
          />
        </>
      )}

      {o.title.enabled && (
        <p
          className="pointer-events-none absolute inset-x-[7%] top-[8%] text-center font-bold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          style={{
            color: o.title.color,
            fontSize: `${((o.title.size / outW) * 100).toFixed(2)}cqw`,
          }}
        >
          {titleFor(clips.findIndex((c) => c.id === clip?.id)) || "Título do vídeo"}
        </p>
      )}
      {o.bottom.enabled && o.bottom.text && (
        <p
          className="pointer-events-none absolute inset-x-[7%] bottom-[8%] text-center font-bold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          style={{
            color: o.bottom.color,
            fontSize: `${((o.bottom.size / outW) * 100).toFixed(2)}cqw`,
          }}
        >
          {o.bottom.text}
        </p>
      )}
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold hover:border-primary/60"
          >
            <ArrowLeft className="size-3.5" /> Projetos
          </Link>
          <span className="mx-auto flex items-center gap-2">
            <Scissors className="size-4 text-primary" />
            <span className="font-display text-base font-bold tracking-tight">
              {projectName ?? (
                <>
                  fabrica <span className="text-muted-foreground">de</span> reels
                </>
              )}
            </span>
          </span>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground sm:inline">
              {clips.length}/{MAX_CLIPS} na fila
            </span>
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

            {doneClips.length > 0 && !running && (
              <div className="border-b border-border/60 px-3 py-3">
                <Button className="w-full" size="sm" onClick={() => void downloadAll()}>
                  <Archive className="mr-1.5 size-4" /> Baixar todos ({doneClips.length})
                </Button>
              </div>
            )}



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
                      {clip.status === "processing" && (
                        <Progress value={clip.progress * 100} className="mt-1.5 h-1" />
                      )}
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
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prévia · {ASPECTS[opts.aspect].label}
          </p>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mx-auto max-w-[300px]">
              {previewClip ? framePreview(previewClip, false) : framePreview(undefined, false)}
            </div>

            {/* our own player controls — always in the same spot */}
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!selected}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
                aria-label={playing ? "Pausar" : "Reproduzir"}
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <Slider
                className="flex-1"
                value={[pos]}
                min={0}
                max={1}
                step={0.001}
                onValueChange={([v]) => seekTo(v ?? 0)}
              />
              <span className="w-20 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                {fmtTime(pos * duration)} / {fmtTime(duration)}
              </span>
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={muted ? "Ativar som" : "Silenciar"}
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
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
              <span className="rounded-md border border-border bg-background px-3 py-1 text-xs font-bold">
                9:16 · 1080×1920
              </span>
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
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setScope("batch")}
                className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                  scope === "batch" ? "bg-card text-foreground shadow" : "text-muted-foreground"
                }`}
              >
                Config. em lote ({clips.length} vídeo{clips.length === 1 ? "" : "s"})
              </button>
              <button
                type="button"
                onClick={() => setScope("single")}
                disabled={!selected}
                className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  scope === "single" ? "bg-card text-foreground shadow" : "text-muted-foreground"
                }`}
              >
                Só este vídeo
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-bold">Ajuste fino do vídeo</p>
              <button
                type="button"
                onClick={resetFine}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="size-3.5" /> Padrão
              </button>
            </div>

            <div className="mt-3 space-y-4">
              {[
                {
                  label: "Zoom",
                  value: fine.zoom,
                  display: `${Math.round(fine.zoom * 100)}%`,
                  min: 0.5,
                  max: 5,
                  step: 0.01,
                  set: (v: number) => patchFine({ zoom: v }),
                },
                {
                  label: "Posição vertical",
                  value: fine.posY,
                  display: `${Math.round(fine.posY * 100)}%`,
                  min: 0,
                  max: 5,
                  step: 0.05,
                  set: (v: number) => patchFine({ posY: v }),
                },
                {
                  label: "Posição horizontal",
                  value: fine.posX,
                  display: `${Math.round(fine.posX * 100)}%`,
                  min: 0,
                  max: 5,
                  step: 0.05,
                  set: (v: number) => patchFine({ posX: v }),
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
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Cor de fundo</span>
                <Input
                  type="color"
                  value={opts.bgColor}
                  onChange={(e) => patch({ bgColor: e.target.value })}
                  className="h-8 w-16 p-1"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold">Bordas do vídeo</p>
            <div className="mt-4 space-y-4">
              {[
                {
                  label: "Cortar no topo",
                  value: opts.border.top,
                  set: (v: number) => patch({ border: { ...opts.border, top: v } }),
                },
                {
                  label: "Cortar no rodapé",
                  value: opts.border.bottom,
                  set: (v: number) => patch({ border: { ...opts.border, bottom: v } }),
                },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-bold">{(row.value * 100).toFixed(1)}%</span>
                  </div>
                  <Slider
                    className="mt-2"
                    value={[row.value]}
                    min={0}
                    max={0.4}
                    step={0.005}
                    onValueChange={([v]) => row.set(v ?? row.value)}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs">
              Conteúdo central:{" "}
              <span className="font-bold">
                {Math.max(0, 100 - (opts.border.top + opts.border.bottom) * 100).toFixed(0)}%
              </span>
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
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">Overlay de fundo</p>
                  <Switch
                    checked={opts.bgImage.enabled}
                    onCheckedChange={(v) => patch({ bgImage: { ...opts.bgImage, enabled: v } })}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-border p-1">
                  {([
                    { id: "back", label: "Atrás do vídeo" },
                    { id: "front", label: "Na frente" },
                  ] as const).map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => patch({ bgImage: { ...opts.bgImage, layer: l.id } })}
                      className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                        (opts.bgImage.layer ?? "back") === l.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      patch({
                        bgImage: { ...opts.bgImage, enabled: true, src: String(reader.result) },
                      });
                      toast.success("Imagem de fundo carregada.");
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Plus className="mr-1.5 size-4" /> Enviar imagem de fundo
                </Button>

                {opts.bgImage.src && (
                  <div className="mt-3 space-y-3 rounded-lg border border-border bg-background/60 p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={opts.bgImage.src}
                        alt="Fundo atual"
                        className="h-14 w-8 rounded border border-border object-cover"
                      />
                      <p className="flex-1 text-[11px] font-semibold text-muted-foreground">
                        Imagem de fundo em uso
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          patch({ bgImage: { ...opts.bgImage, src: null, enabled: false } })
                        }
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Remover imagem de fundo"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Transparência</span>
                        <span className="font-bold">
                          {Math.round(opts.bgImage.opacity * 100)}%
                        </span>
                      </div>
                      <Slider
                        className="mt-2"
                        value={[opts.bgImage.opacity]}
                        min={0.1}
                        max={1}
                        step={0.01}
                        onValueChange={([v]) =>
                          patch({ bgImage: { ...opts.bgImage, opacity: v ?? opts.bgImage.opacity } })
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 rounded-lg border border-border bg-background/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-xs font-bold">
                      <Sparkles className="size-4 text-primary" /> Overlays salvos
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => setSavedOverlays(listOverlays())}>
                      Atualizar
                    </Button>
                  </div>
                  {savedOverlays.length === 0 ? (
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      Você ainda não salvou nenhum perfil no Criador de Overlay.
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {savedOverlays.map((preset) => (
                        <button
                          key={preset.slot}
                          type="button"
                          onClick={() => {
                            patch({
                              bgImage: { ...opts.bgImage, enabled: true, src: preset.dataUrl },
                            });
                            toast.success(`Overlay “${preset.name}” aplicada.`);
                          }}
                          className={`overflow-hidden rounded border transition-colors ${
                            opts.bgImage.src === preset.dataUrl
                              ? "border-primary"
                              : "border-border hover:border-primary/60"
                          }`}
                          title={preset.name}
                        >
                          <img src={preset.dataUrl} alt={preset.name} className="aspect-[9/16] w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                    <a href="/criador-de-overlay" target="_blank" rel="noreferrer">
                      Abrir Criador de Overlay
                    </a>
                  </Button>
                </div>


                <div className="mt-5 border-t border-border/60 pt-4">
                  <p className="text-sm font-bold">Overlay de cor</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Uma camada de cor sobre o vídeo — útil para escurecer o fundo e destacar o
                    título.
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
                <div className="mt-2 space-y-3 border-t border-border/60 pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold">Modo anti duplicidade</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        Aplica pequenas variações em todos os vídeos para reduzir detecção de
                        duplicidade.
                      </p>
                    </div>
                    <Switch
                      checked={antiDup}
                      onCheckedChange={(v) => {
                        setAntiDup(v);
                        patch({ speed: v ? 1.02 : 1 });
                      }}
                    />

                  </div>
                  <div className="flex items-center justify-between">
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
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Todo o processamento roda no seu navegador: os arquivos nunca são enviados para
                  nenhum servidor.
                </p>

              </div>
            )}
          </div>



          <div className="sticky bottom-4 space-y-2">
            <Button
              className="h-12 w-full text-base disabled:opacity-100"
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
                  toast.info("O processamento será pausado após o vídeo atual.");
                }}
              >
                <Pause className="mr-2 size-4" /> Pausar processamento
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


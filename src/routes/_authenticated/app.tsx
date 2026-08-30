import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Clapperboard,
  UploadCloud,
  Loader2,
  Download,
  Trash2,
  Film,
  Zap,
  LogOut,
  Coins,
  Archive,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { consumeCredits, getCredits } from "@/lib/credits.functions";
import { ASPECTS, type AspectId, type ProcessMode } from "@/lib/video";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Estúdio — Fábrica de Reels" },
      { name: "description", content: "Suba seus clipes e processe em massa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudioPage,
});

type ClipStatus = "queued" | "processing" | "done" | "error";

type Clip = {
  id: string;
  file: File;
  previewUrl: string;
  status: ClipStatus;
  progress: number;
  resultBlob?: Blob;
  resultName?: string;
  error?: string;
};

const MAX_CLIPS = 50;

function StudioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchCredits = useServerFn(getCredits);
  const consume = useServerFn(consumeCredits);

  const [clips, setClips] = useState<Clip[]>([]);
  const [aspect, setAspect] = useState<AspectId>("9:16");
  const [mode, setMode] = useState<ProcessMode>("turbo");
  const [running, setRunning] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  const { data: creditsData, isLoading: creditsLoading } = useQuery({
    queryKey: ["credits"],
    queryFn: fetchCredits,
    enabled: !!user,
  });
  const credits = creditsData?.credits ?? 0;

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files).filter((f) => f.type.startsWith("video/"));
    if (incoming.length === 0) {
      toast.error("Selecione arquivos de vídeo.");
      return;
    }
    setClips((prev) => {
      const room = MAX_CLIPS - prev.length;
      if (incoming.length > room) {
        toast.error(`Máximo de ${MAX_CLIPS} vídeos por lote.`);
      }
      const next = incoming.slice(0, room).map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "queued" as ClipStatus,
        progress: 0,
      }));
      return [...prev, ...next];
    });
  }, []);

  const removeClip = (id: string) =>
    setClips((prev) => {
      const clip = prev.find((c) => c.id === id);
      if (clip) URL.revokeObjectURL(clip.previewUrl);
      return prev.filter((c) => c.id !== id);
    });

  const clearAll = () =>
    setClips((prev) => {
      prev.forEach((c) => URL.revokeObjectURL(c.previewUrl));
      return [];
    });

  const queuedClips = clips.filter((c) => c.status === "queued" || c.status === "error");
  const doneClips = clips.filter((c) => c.status === "done");
  const activeClip = clips.find((c) => c.status === "processing");

  async function handleProcess() {
    if (queuedClips.length === 0) {
      toast.error("Adicione vídeos para processar.");
      return;
    }
    if (credits < queuedClips.length) {
      toast.error(
        `Créditos insuficientes: você tem ${credits} e o lote precisa de ${queuedClips.length}. Compre mais créditos.`,
      );
      navigate({ to: "/pricing" });
      return;
    }

    setRunning(true);
    cancelledRef.current = false;
    try {
      // Load the engine first (lazy, browser-only).
      const videoLib = await import("@/lib/video");
      if (!engineReady) {
        toast.info("Preparando o motor de vídeo (primeira vez pode levar alguns segundos)…");
        await videoLib.getFFmpeg();
        setEngineReady(true);
      }

      // Debit credits up front for the whole batch.
      const { credits: remaining } = await consume({ data: { count: queuedClips.length } });
      queryClient.setQueryData(["credits"], { credits: remaining });
      toast.success(`${queuedClips.length} crédito(s) utilizados. Processando…`);

      for (const clip of queuedClips) {
        if (cancelledRef.current) break;
        setClips((prev) =>
          prev.map((c) => (c.id === clip.id ? { ...c, status: "processing", progress: 0 } : c)),
        );
        try {
          const blob = await videoLib.processVideo(clip.file, aspect, mode, (ratio) => {
            setClips((prev) =>
              prev.map((c) => (c.id === clip.id ? { ...c, progress: ratio } : c)),
            );
          });
          setClips((prev) =>
            prev.map((c) =>
              c.id === clip.id
                ? {
                    ...c,
                    status: "done",
                    progress: 1,
                    resultBlob: blob,
                    resultName: videoLib.outputName(clip.file.name, aspect),
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

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Clapperboard className="size-4" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              Fábrica<span className="text-primary"> de Reels</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/pricing"
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold"
            >
              <Coins className="size-4 text-turbo" />
              {creditsLoading ? "…" : credits} crédito{credits === 1 ? "" : "s"}
            </Link>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              <LogOut className="mr-1.5 size-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Estúdio</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Suba até {MAX_CLIPS} clipes. 1 crédito = 1 vídeo processado. Seus vídeos nunca saem do
              seu dispositivo.
            </p>
          </div>
        </div>

        {/* Upload zone */}
        <div
          className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 px-6 py-14 text-center transition-colors hover:border-primary/60 hover:bg-card"
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
          <UploadCloud className="size-10 text-primary" />
          <p className="mt-4 font-display text-lg font-semibold">
            Arraste seus vídeos aqui ou clique para escolher
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            MP4, MOV, WebM · até {MAX_CLIPS} por lote · {clips.length}/{MAX_CLIPS} na fila
          </p>
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

        {/* Settings */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Formato de saída
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(Object.keys(ASPECTS) as AspectId[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAspect(a)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                    aspect === a
                      ? "glow-primary border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{ASPECTS[aspect].label}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Modo de enquadramento
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("turbo")}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  mode === "turbo"
                    ? "border-turbo bg-turbo text-turbo-foreground"
                    : "border-border bg-background hover:border-turbo/50"
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  <Zap className="size-4" /> Turbo
                </span>
                <span className={`text-xs ${mode === "turbo" ? "text-turbo-foreground/80" : "text-muted-foreground"}`}>
                  Corta e preenche · ~30s/vídeo
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("completo")}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  mode === "completo"
                    ? "glow-primary border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  <Film className="size-4" /> Completo
                </span>
                <span className={`text-xs ${mode === "completo" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  Vídeo inteiro + fundo desfocado
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Clip list */}
        {clips.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">
                Fila ({clips.length})
              </h2>
              <div className="flex gap-2">
                {doneClips.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => void downloadAll()}>
                    <Archive className="mr-1.5 size-4" /> Baixar tudo (.zip)
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={running}>
                  <Trash2 className="mr-1.5 size-4" /> Limpar
                </Button>
              </div>
            </div>

            {activeClip && (
              <div className="mt-4 rounded-2xl border border-primary/40 bg-card p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <p className="flex-1 truncate text-sm font-medium">{activeClip.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {Math.round(activeClip.progress * 100)}%
                  </p>
                </div>
                <Progress value={activeClip.progress * 100} className="mt-3 h-2" />
              </div>
            )}

            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((clip) => (
                <li
                  key={clip.id}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card"
                >
                  <div className="relative aspect-video bg-background">
                    <video
                      src={clip.previewUrl}
                      className="size-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    {clip.status === "done" && (
                      <span className="absolute left-2 top-2 rounded-full bg-turbo px-2 py-0.5 text-xs font-bold text-turbo-foreground">
                        Pronto
                      </span>
                    )}
                    {clip.status === "error" && (
                      <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
                        Erro
                      </span>
                    )}
                    {!running && (
                      <button
                        type="button"
                        onClick={() => removeClip(clip.id)}
                        className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Remover"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <p className="truncate text-xs text-muted-foreground">{clip.file.name}</p>
                    {clip.status === "done" ? (
                      <Button size="sm" variant="outline" onClick={() => downloadClip(clip)}>
                        <Download className="mr-1 size-3.5" /> Baixar
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {clip.status === "processing"
                          ? `${Math.round(clip.progress * 100)}%`
                          : clip.status === "error"
                            ? "Falhou"
                            : "Na fila"}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action bar */}
        <div className="sticky bottom-4 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-4 backdrop-blur-xl">
            <p className="text-sm text-muted-foreground">
              {queuedClips.length > 0 ? (
                <>
                  <strong className="text-foreground">{queuedClips.length}</strong> vídeo(s) na fila
                  · custo{" "}
                  <strong className="text-foreground">{queuedClips.length}</strong> crédito(s) ·
                  saldo <strong className="text-turbo">{credits}</strong>
                </>
              ) : (
                "Adicione vídeos para começar."
              )}
            </p>
            <div className="flex gap-2">
              {running && (
                <Button
                  variant="outline"
                  onClick={() => {
                    cancelledRef.current = true;
                  }}
                >
                  Cancelar após o atual
                </Button>
              )}
              <Button
                size="lg"
                className="glow-primary font-semibold"
                disabled={running || queuedClips.length === 0}
                onClick={() => void handleProcess()}
              >
                {running ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Processando…
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 size-4" /> Processar lote
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

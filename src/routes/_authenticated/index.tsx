import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccountBadge } from "@/components/account-badge";
import { SideMenu } from "@/components/side-menu";
import { CreditMeter } from "@/components/credit-meter";
import { NotificationBell } from "@/components/notification-bell";
import { loadEditSettings, saveEditSettings } from "@/lib/settings";
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
  fontStack,
  TEXT_FONTS,
  type EditOptions,
  type TextBlock,
} from "@/lib/video";
import { logVideoJobs } from "@/lib/admin";
import { useBranding } from "@/lib/branding";
import { useT } from "@/lib/i18n";
import {
  accessExpired,
  nextRefillAt,
  spendOneCredit,
  toolEnabled,
  useMyAccount,
  useRefreshAccount,
  type ToolKey,
} from "@/lib/account";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";



export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Batch video editor — frames, overlays and titles" },
      {
        name: "description",
        content:
          "Edit and process up to 100 vertical videos at once, with frames, overlays and titles.",
      },
      { property: "og:title", content: "Batch video editor — frames, overlays and titles" },
      {
        property: "og:description",
        content: "Process batches of 9:16 videos straight in your browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
const MAX_FILE_MB = 100;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const MAX_DURATION_S = 180;

type EditTab = "bordas" | "overlay" | "texto" | "extras";
const TABS: { id: EditTab; label: string; tool: ToolKey }[] = [
  { id: "bordas", label: "Borders", tool: "borders" },
  { id: "overlay", label: "Overlay", tool: "overlay" },
  { id: "texto", label: "Text", tool: "text" },
  { id: "extras", label: "Extras", tool: "extras" },
];

type FineTune = { zoom: number; posX: number; posY: number };

function statusLabel(status: ClipStatus, progress: number, t: (s: string) => string) {
  if (status === "done") return t("done");
  if (status === "error") return t("failed");
  if (status === "processing") return `${Math.round(progress * 100)}%`;
  return t("queued");
}

function EditorPage() {

  const t = useT();
  const branding = useBranding();
  const { account } = useMyAccount();
  const refreshAccount = useRefreshAccount();
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [opts, setOpts] = useState<EditOptions>(defaultEditOptions);

  
  const [tab, setTab] = useState<EditTab>("bordas");
  const [antiDup, setAntiDup] = useState(false);
  const [scope, setScope] = useState<"batch" | "single">("batch");
  const [overrides, setOverrides] = useState<Record<string, FineTune>>({});
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  const [engineReady, setEngineReady] = useState(false);

  // restore the last used edit settings for this account
  const settingsLoaded = useRef(false);
  useEffect(() => {
    void loadEditSettings<EditOptions>().then((saved) => {
      if (saved)
        setOpts((prev) => ({
          ...prev,
          ...saved,
          title: { ...prev.title, ...(saved.title ?? {}) },
          bottom: { ...prev.bottom, ...(saved.bottom ?? {}) },
          border: { ...prev.border, ...(saved.border ?? {}) },
          bgImage: { ...prev.bgImage, ...(saved.bgImage ?? {}) },
        }));
      settingsLoaded.current = true;
    });
  }, []);

  // keep them saved as the user edits
  useEffect(() => {
    if (!settingsLoaded.current) return;
    const id = setTimeout(() => void saveEditSettings(opts), 800);
    return () => clearTimeout(id);
  }, [opts]);


  const inputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [savedOverlays, setSavedOverlays] = useState<OverlayPreset[]>([]);

  useEffect(() => {
    void listOverlays().then(setSavedOverlays);
  }, []);
  const cancelledRef = useRef(false);

  // our own player state, so the play button never moves with the video
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

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

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const videos = Array.from(files).filter((f) => f.type.startsWith("video/"));
    if (videos.length === 0) {
      toast.error(t("Select video files."));
      return;
    }

    const tooBig = videos.filter((f) => f.size > MAX_FILE_BYTES);
    const sized = videos.filter((f) => f.size <= MAX_FILE_BYTES);
    if (tooBig.length > 0) {
      toast.error(t("{n} video(s) over {mb} MB were skipped.", { n: tooBig.length, mb: MAX_FILE_MB }));
    }

    const readDuration = (file: File) =>
      new Promise<number>((resolve) => {
        const el = document.createElement("video");
        const url = URL.createObjectURL(file);
        el.preload = "metadata";
        el.onloadedmetadata = () => {
          const d = el.duration;
          URL.revokeObjectURL(url);
          resolve(Number.isFinite(d) ? d : 0);
        };
        el.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(0);
        };
        el.src = url;
      });

    const durations = await Promise.all(sized.map(readDuration));
    const incoming = sized.filter((_, i) => (durations[i] ?? 0) <= MAX_DURATION_S);
    const tooLong = sized.length - incoming.length;
    if (tooLong > 0) {
      toast.error(t("{n} video(s) longer than {s}s were skipped.", { n: tooLong, s: MAX_DURATION_S }));
    }
    if (incoming.length === 0) return;

    setClips((prev) => {
      const room = MAX_CLIPS - prev.length;
      if (incoming.length > room) toast.error(t("Maximum of {max} videos per batch.", { max: MAX_CLIPS }));
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
      toast.error(t("Add videos to process."));
      return;
    }

    if (account && !account.premium && account.credits <= 0) {
      const when = nextRefillAt(account);
      toast.error(
        `${t("You are out of credits.")} ${
          when ? t("New credits arrive {when}.", { when: when.toLocaleString() }) : ""
        }`,
      );
      return;
    }

    setRunning(true);
    setPaused(false);
    cancelledRef.current = false;

    let rendered = 0;
    let renderedBytes = 0;


    try {
      const videoLib = await import("@/lib/video");
      if (!engineReady) {
        toast.info(t("Preparing the video engine (first time only)…"));
        await videoLib.getFFmpeg();
        setEngineReady(true);
      }

      toast.success(t("Processing {n} video(s)…", { n: queuedClips.length }));

      for (const clip of queuedClips) {
        if (cancelledRef.current) break;
        // 1 credit = 1 processed video
        const spent = await spendOneCredit();
        refreshAccount();
        if (!spent.ok) {
          toast.error(t("Out of credits — processing stopped."));
          break;
        }
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
          renderedBytes += blob.size;

        } catch (err) {

          setClips((prev) =>
            prev.map((c) =>
              c.id === clip.id
                ? {
                    ...c,
                    status: "error",
                    error: err instanceof Error ? err.message : t("Failed to process"),
                  }
                : c,
            ),
          );
        }
      }

      if (rendered > 0) {
        void logVideoJobs({ clips: rendered, outputBytes: renderedBytes });
      }

      if (cancelledRef.current) {
        setPaused(true);
        toast.info(t("Processing paused. Click “Resume processing” to continue."));
      } else {
        toast.success(t("Batch finished! Use “Download all” to save everything."));
      }



    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Error while processing."));
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

  /** fires one download per finished video, slightly staggered so the browser keeps them all */
  function downloadEach() {
    if (doneClips.length === 0) return;
    doneClips.forEach((clip, i) => {
      setTimeout(() => downloadClip(clip), i * 300);
    });
    toast.success(t("Downloading {n} video(s) separately…", { n: doneClips.length }));
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


  /** shared font / colour / size / position controls for a text block */
  const textControls = (
    block: TextBlock,
    set: (next: Partial<TextBlock>) => void,
    minSize: number,
    maxSize: number,
  ) => (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{t("Font")}</span>
        <select
          value={block.font}
          onChange={(e) => set({ font: e.target.value })}
          className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs"
          style={{ fontFamily: fontStack(block.font) }}
        >
          {TEXT_FONTS.map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.stack }}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{t("Colour")}</span>
        <Input
          type="color"
          value={block.color}
          onChange={(e) => set({ color: e.target.value })}
          className="h-8 w-16 p-1"
        />
      </div>
      {[
        {
          label: t("Size"),
          value: block.size,
          display: `${block.size}px`,
          min: minSize,
          max: maxSize,
          step: 2,
          apply: (v: number) => set({ size: v }),
        },
        {
          label: t("Horizontal position"),
          value: block.x,
          display: `${Math.round(block.x)}%`,
          min: 0,
          max: 100,
          step: 1,
          apply: (v: number) => set({ x: v }),
        },
        {
          label: t("Vertical position"),
          value: block.y,
          display: `${Math.round(block.y)}%`,
          min: 0,
          max: 100,
          step: 1,
          apply: (v: number) => set({ y: v }),
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
            onValueChange={([v]) => row.apply(v ?? row.value)}
          />
        </div>
      ))}
    </div>
  );

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
            src={clip.previewUrl}
            className={`size-full ${o.fit === "cover" ? "object-cover" : "object-contain"}`}
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
          {t("no video")}
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
          className="pointer-events-none absolute w-[86%] -translate-x-1/2 -translate-y-1/2 text-center font-bold leading-tight"
          style={{
            left: `${o.title.x}%`,
            top: `${o.title.y}%`,
            color: o.title.color,
            fontFamily: fontStack(o.title.font),
            fontSize: `${((o.title.size / outW) * 100).toFixed(2)}cqw`,
          }}
        >
          {titleFor(clips.findIndex((c) => c.id === clip?.id)) || t("Video title")}
        </p>
      )}
      {o.bottom.enabled && o.bottom.text && (
        <p
          className="pointer-events-none absolute w-[86%] -translate-x-1/2 -translate-y-1/2 text-center font-bold leading-tight"
          style={{
            left: `${o.bottom.x}%`,
            top: `${o.bottom.y}%`,
            color: o.bottom.color,
            fontFamily: fontStack(o.bottom.font),
            fontSize: `${((o.bottom.size / outW) * 100).toFixed(2)}cqw`,
          }}
        >
          {o.bottom.text}
        </p>
      )}
    </div>
    );
  };

  const blockedMessage = account?.blocked
    ? t("Your account is blocked. Please contact the administrator.")
    : accessExpired(account)
      ? t("Your access has expired. Please contact the administrator.")
      : null;

  if (blockedMessage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
        <p className="max-w-sm text-sm font-semibold">{blockedMessage}</p>
        <div className="flex w-full max-w-sm justify-center">
          <AccountBadge />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
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
            <span className="hidden rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:inline">
              {clips.length}/{MAX_CLIPS} {t("in queue")}
            </span>
            <NotificationBell />
            <CreditMeter account={account} />
          </div>
        </div>
      </header>

      <div className="flex items-end justify-between gap-4 px-4 pt-5">
        <h1 className="font-display text-xl font-bold tracking-tight">{t("Batch editor")}</h1>
        <p className="text-xs text-muted-foreground">
          {t("Up to {max} videos per batch · {mb}MB max · {s}s each", {
            max: MAX_CLIPS,
            mb: MAX_FILE_MB,
            s: MAX_DURATION_S,
          })}
        </p>
      </div>

      <main className="grid gap-4 px-4 pb-24 pt-4 xl:grid-cols-[260px_minmax(0,1fr)_280px_300px]">
        {/* ---------- Column 1: upload + queue ---------- */}
        <section className="space-y-3">
          <div
            className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-4 py-8 text-center transition-colors ${
              running
                ? "pointer-events-none opacity-50"
                : "cursor-pointer hover:border-primary/60 hover:bg-card"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void addFiles(e.dataTransfer.files);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          >
            <UploadCloud className="size-6 text-primary" />
            <p className="mt-2 text-sm font-semibold">{t("Drag videos here or click")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("MP4, MOV, WebM · {mb}MB max · {s}s each", {
                mb: MAX_FILE_MB,
                s: MAX_DURATION_S,
              })}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void addFiles(e.target.files);
                e.target.value = "";
              }}
            />

          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
              <p className="text-xs font-semibold">
                {clips.length} {clips.length === 1 ? t("video") : t("videos")} ·{" "}
                {doneClips.length} {t("ready")}
              </p>
              <button
                type="button"
                onClick={clearAll}
                disabled={running || clips.length === 0}
                className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                aria-label={t("Clear queue")}
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {doneClips.length > 0 && !running && (
              <div className="border-b border-border/60 px-3 py-3">
                <Button className="w-full" size="sm" onClick={() => setDownloadOpen(true)}>
                  <Download className="mr-1.5 size-4" /> {t("Download all")} ({doneClips.length})
                </Button>
              </div>
            )}



            <ul className="divide-y divide-border/60">
              {clips.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  {t("Your queue is empty.")}
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
                        {statusLabel(clip.status, clip.progress, t)}
                      </span>
                      {clip.status === "processing" && (
                        <Progress value={clip.progress * 100} className="mt-1.5 h-1" />
                      )}
                    </span>

                    <span className="flex shrink-0 items-center gap-0.5">
                      {clip.status === "done" && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadClip(clip);
                          }}
                          className="rounded p-1 text-turbo hover:bg-turbo/10"
                          title={t("Download this video")}
                        >
                          <Download className="size-4" />
                        </span>
                      )}
                      {clip.status !== "processing" && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            removeClip(clip.id);
                          }}
                          className="rounded p-1 text-muted-foreground hover:text-destructive"
                          title={t("Remove from queue")}
                        >
                          <X className="size-4" />
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- Column 2: preview ---------- */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("Preview")} · {ASPECTS[opts.aspect].label}
          </p>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mx-auto max-w-[150px]">
              {previewClip ? framePreview(previewClip, false) : framePreview(undefined, false)}
            </div>

            {/* our own player controls — always in the same spot */}
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!selected}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
                aria-label={playing ? t("Pause") : t("Play")}
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
                aria-label={muted ? t("Unmute") : t("Mute")}
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
                <Button variant="outline" size="sm" onClick={() => setDownloadOpen(true)}>
                  <Download className="mr-1.5 size-4" /> {t("Download all")} ({doneClips.length})
                </Button>
              )}
            </div>

          </div>
        </section>

        {/* ---------- Column 3: batch fine-tune ---------- */}
        <section
          className={`space-y-3 ${running ? "pointer-events-none opacity-50" : ""}`}
          aria-disabled={running}
        >
          {toolEnabled(account, "finetune") && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setScope("batch")}
                className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                  scope === "batch" ? "bg-card text-foreground shadow" : "text-muted-foreground"
                }`}
              >
                {t("Batch settings")} ({clips.length})
              </button>
              <button
                type="button"
                onClick={() => setScope("single")}
                disabled={!selected}
                className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  scope === "single" ? "bg-card text-foreground shadow" : "text-muted-foreground"
                }`}
              >
                {t("This video only")}
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs text-muted-foreground">{t("Framing")}</p>
              <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-border p-1">
                {([
                  { id: "contain", label: t("No crop") },
                  { id: "cover", label: t("Fill") },
                ] as const).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => patch({ fit: f.id })}
                    className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      (opts.fit ?? "contain") === f.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-bold">{t("Fine tuning")}</p>
              <button
                type="button"
                onClick={resetFine}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="size-3.5" /> {t("Default")}
              </button>
            </div>

            <div className="mt-3 space-y-4">
              {[
                {
                  label: t("Zoom"),
                  value: fine.zoom,
                  display: `${Math.round(fine.zoom * 100)}%`,
                  min: 0.5,
                  max: 5,
                  step: 0.01,
                  set: (v: number) => patchFine({ zoom: v }),
                },
                {
                  label: t("Vertical position"),
                  value: fine.posY,
                  display: `${Math.round(fine.posY * 100)}%`,
                  min: 0,
                  max: 5,
                  step: 0.05,
                  set: (v: number) => patchFine({ posY: v }),
                },
                {
                  label: t("Horizontal position"),
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
                <span className="text-muted-foreground">{t("Background colour")}</span>
                <Input
                  type="color"
                  value={opts.bgColor}
                  onChange={(e) => patch({ bgColor: e.target.value })}
                  className="h-8 w-16 p-1"
                />
              </div>
            </div>
          </div>
          )}

        </section>

        {/* ---------- Column 4: edit tabs + process ---------- */}
        <section className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setOpts(defaultEditOptions())}
            disabled={running}
          >
            <RotateCcw className="mr-1.5 size-4" /> {t("Reset all edits")}
          </Button>

          <div
            className={`rounded-xl border border-border bg-card p-2 ${
              running ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <div className="flex flex-wrap gap-1">
              {TABS.filter((item) => toolEnabled(account, item.tool)).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(item.label)}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`rounded-xl border border-border bg-card p-4 ${
              running ? "pointer-events-none opacity-50" : ""
            }`}
            aria-disabled={running}
          >
            {tab === "bordas" && toolEnabled(account, "borders") && (
              <div>
                <p className="text-sm font-bold">{t("Video borders")}</p>
                <div className="mt-4 space-y-4">
                  {[
                    {
                      label: t("Crop top"),
                      value: opts.border.top,
                      set: (v: number) => patch({ border: { ...opts.border, top: v } }),
                    },
                    {
                      label: t("Crop bottom"),
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
                  {t("Centre content:")}{" "}
                  <span className="font-bold">
                    {Math.max(0, 100 - (opts.border.top + opts.border.bottom) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {tab === "texto" && toolEnabled(account, "text") && (
              <div className="max-h-[60vh] space-y-5 overflow-y-auto overscroll-contain pr-1">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{t("Video title")}</p>
                    <Switch
                      checked={opts.title.enabled}
                      onCheckedChange={(v) => patch({ title: { ...opts.title, enabled: v } })}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {t("One title per line. Each line goes to the matching video in the queue.")}
                  </p>
                  <Textarea
                    className="mt-3 min-h-[110px] text-xs"
                    placeholder={t("Video title 1\nVideo title 2")}
                    value={opts.title.text}
                    onChange={(e) => patch({ title: { ...opts.title, text: e.target.value } })}
                    disabled={!opts.title.enabled}
                  />
                  {textControls(opts.title, (next) => patch({ title: { ...opts.title, ...next } }), 28, 120)}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t("{n} title(s) for {v} video(s)", {
                      n: titleLines.filter(Boolean).length,
                      v: clips.length,
                    })}
                  </p>
                </div>

                <div className="border-t border-border/60 pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{t("Bottom text")}</p>
                    <Switch
                      checked={opts.bottom.enabled}
                      onCheckedChange={(v) => patch({ bottom: { ...opts.bottom, enabled: v } })}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {t("The same caption on every video — great for a handle or CTA.")}
                  </p>
                  <Input
                    className="mt-3 text-xs"
                    placeholder={t("@yourhandle · follow for more")}
                    value={opts.bottom.text}
                    onChange={(e) => patch({ bottom: { ...opts.bottom, text: e.target.value } })}
                    disabled={!opts.bottom.enabled}
                  />
                  {textControls(opts.bottom, (next) => patch({ bottom: { ...opts.bottom, ...next } }), 20, 90)}
                </div>
              </div>
            )}

            {tab === "overlay" && toolEnabled(account, "overlay") && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{t("Background overlay")}</p>
                  <Switch
                    checked={opts.bgImage.enabled}
                    onCheckedChange={(v) => patch({ bgImage: { ...opts.bgImage, enabled: v } })}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-border p-1">
                  {([
                    { id: "back", label: t("Behind the video") },
                    { id: "front", label: t("In front") },
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
                      toast.success(t("Background image loaded."));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Plus className="mr-1.5 size-4" /> {t("Upload background image")}
                </Button>

                {opts.bgImage.src && (
                  <div className="mt-3 space-y-3 rounded-lg border border-border bg-background/60 p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={opts.bgImage.src}
                        alt={t("Background image in use")}
                        className="h-14 w-8 rounded border border-border object-cover"
                      />
                      <p className="flex-1 text-[11px] font-semibold text-muted-foreground">
                        {t("Background image in use")}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          patch({ bgImage: { ...opts.bgImage, src: null, enabled: false } })
                        }
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={t("Remove background image")}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t("Transparency")}</span>
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
                      <Sparkles className="size-4 text-primary" /> {t("Saved overlays")}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => void listOverlays().then(setSavedOverlays)}>
                      {t("Refresh")}
                    </Button>
                  </div>
                  {savedOverlays.length === 0 ? (
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      {t("You haven't saved any profile in the Overlay creator yet.")}
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {savedOverlays.map((preset) => (
                        <button
                          key={preset.slot}
                          type="button"
                          onClick={() => {
                            patch({
                              bgImage: { ...opts.bgImage, enabled: true, src: preset.dataUrl },
                            });
                            toast.success(t("Overlay “{name}” applied.", { name: preset.name }));
                          }}
                          className={`overflow-hidden rounded border p-1 text-left transition-colors ${
                            opts.bgImage.src === preset.dataUrl
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/60"
                          }`}
                          title={preset.name}
                        >
                          <img src={preset.dataUrl} alt={preset.name} className="aspect-[9/16] w-full rounded-sm object-cover" />
                          <p className="mt-1 truncate text-[10px] font-semibold">{preset.name}</p>
                        </button>
                      ))}
                    </div>

                  )}
                  <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                    <a href="/overlay-creator" target="_blank" rel="noreferrer">
                      {t("Open the Overlay creator")}
                    </a>
                  </Button>
                </div>


              </>
            )}


            {tab === "extras" && toolEnabled(account, "extras") && (
              <div className="space-y-3 text-xs">
                <p className="text-sm font-bold">{t("Extras")}</p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("Mirror videos")}</span>
                  <Switch checked={opts.mirror} onCheckedChange={(v) => patch({ mirror: v })} />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold">{t("Remove metadata")}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {t("The processed video carries none of the original file's metadata.")}
                    </p>
                  </div>
                  <Switch
                    checked={opts.stripMetadata}
                    onCheckedChange={(v) => patch({ stripMetadata: v })}
                  />
                </div>
                <div className="mt-2 space-y-3 border-t border-border/60 pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold">{t("Anti-duplicate mode")}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {t("Applies small variations to every video to reduce duplicate detection.")}
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
                      {t("Speed")} {opts.speed.toFixed(2)}x
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
                  {t("Everything runs in your browser: your files are never uploaded to any server.")}
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
                  <Loader2 className="mr-2 size-5 animate-spin" /> {t("Processing…")}
                </>
              ) : paused && queuedClips.length > 0 ? (
                <>
                  <Play className="mr-2 size-5" /> {t("Resume processing")} ({queuedClips.length})
                </>
              ) : (
                <>
                  <Play className="mr-2 size-5" />{" "}
                  {t("Process {n} video(s)", { n: queuedClips.length })}
                </>
              )}

            </Button>
            {running && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  cancelledRef.current = true;
                  toast.info(t("Processing will pause after the current video."));
                }}
              >
                <Pause className="mr-2 size-4" /> {t("Pause processing")}
              </Button>
            )}
            <p className="text-center text-[11px] text-muted-foreground">
              {"\n"}
            </p>
          </div>
        </section>
      </main>

      <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("How do you want to download?")}</DialogTitle>
            <DialogDescription>
              {t("Choose between a single zip file or separate downloads for each video.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setDownloadOpen(false);
                void downloadAll();
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/60"
            >
              <Archive className="size-5 text-primary" />
              <span>
                <span className="block text-sm font-bold">{t("Single .zip file")}</span>
                <span className="block text-xs text-muted-foreground">
                  {t("All {n} videos in one compressed file.", { n: doneClips.length })}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDownloadOpen(false);
                downloadEach();
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/60"
            >
              <Download className="size-5 text-primary" />
              <span>
                <span className="block text-sm font-bold">{t("Separate video files")}</span>
                <span className="block text-xs text-muted-foreground">
                  {t("Starts {n} downloads at once.", { n: doneClips.length })}
                </span>
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export type AspectId = "9:16";

export const ASPECTS: Record<AspectId, { label: string; w: number; h: number }> = {
  "9:16": { label: "9:16 · Reels/Shorts", w: 1080, h: 1920 },
};

/** image painted BEHIND the video, filling the solid background area */
export type BackgroundImage = {
  enabled: boolean;
  /** data URL of the PNG/JPG the user uploaded or created */
  src: string | null;
  opacity: number;
  /** "back" = atrás do vídeo (padrão), "front" = por cima do vídeo */
  layer: "back" | "front";
};


/** fonts offered for the on-video texts (all loaded in the document head) */
export const TEXT_FONTS: { id: string; label: string; stack: string }[] = [
  { id: "instrument", label: "Default", stack: '"Instrument Sans", Arial, sans-serif' },
  { id: "anton", label: "Anton", stack: '"Anton", Impact, sans-serif' },
  { id: "bebas", label: "Bebas Neue", stack: '"Bebas Neue", Impact, sans-serif' },
  { id: "montserrat", label: "Montserrat", stack: '"Montserrat", Arial, sans-serif' },
  { id: "oswald", label: "Oswald", stack: '"Oswald", Arial, sans-serif' },
  { id: "poppins", label: "Poppins", stack: '"Poppins", Arial, sans-serif' },
  { id: "playfair", label: "Playfair Display", stack: '"Playfair Display", Georgia, serif' },
];

export const fontStack = (id: string): string =>
  TEXT_FONTS.find((f) => f.id === id)?.stack ?? TEXT_FONTS[0]!.stack;

/** a text block painted over the frame */
export type TextBlock = {
  enabled: boolean;
  text: string;
  color: string;
  size: number;
  /** font id from TEXT_FONTS */
  font: string;
  /** horizontal centre, 0..100 (% of the frame width) */
  x: number;
  /** vertical centre, 0..100 (% of the frame height) */
  y: number;
};

/** Every knob the batch editor exposes. */
export type EditOptions = {
  aspect: AspectId;
  /** "contain" keeps the whole original frame visible; "cover" fills and crops */
  fit: "contain" | "cover";
  /** 1 = video fills the frame; below 1 it shrinks and the background shows */
  zoom: number;
  /** 0..5 placement anchor (2.5 = centered); 0 and 5 push the video off-frame */
  posX: number;
  posY: number;
  /** colour behind the video when zoom < 1 */
  bgColor: string;
  /** playback rate, e.g. 1.02 for anti-duplication */
  speed: number;
  mirror: boolean;
  /** solid bars painted over the top/bottom of the frame to hide watermarks */
  border: { color: string; mode: "manual" | "auto"; top: number; bottom: number };
  title: TextBlock;
  overlayOpacity: number;
  overlayColor: string;
  bgImage: BackgroundImage;
  /** drop every tag/metadata carried by the original file */
  stripMetadata: boolean;
};

export const defaultEditOptions = (): EditOptions => ({
  aspect: "9:16",
  fit: "contain",
  zoom: 1,
  posX: 2.5,
  posY: 2.5,
  bgColor: "#000000",
  speed: 1,
  mirror: false,
  border: { color: "#ffffff", mode: "manual", top: 0, bottom: 0 },
  title: {
    enabled: false,
    text: "",
    color: "#000000",
    size: 64,
    font: "instrument",
    x: 50,
    y: 12,
  },
  overlayOpacity: 0,
  overlayColor: "#000000",
  bgImage: { enabled: false, src: null, opacity: 1, layer: "back" },
  stripMetadata: false,
});



let ffmpeg: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
/** number of threads the loaded core can use */
export let ffmpegThreads = 1;

const CORE_ST = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
const CORE_ST_ALT = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout: ${label}`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

/**
 * The class worker shipped by @ffmpeg/ffmpeg is loaded through
 * `new URL('./worker.js', import.meta.url)`, which bundlers cannot always
 * resolve — the worker then never boots and `load()` hangs forever. Building it
 * ourselves with Vite's `?worker&url` gives a stable, bundled worker URL.
 */
let cachedWorkerURL: string | null = null;

/**
 * The worker script is turned into a blob URL: a same-origin worker script has
 * to carry the COEP header itself under cross-origin isolation, while a blob
 * worker simply inherits the page's policy.
 */
async function classWorkerURL(): Promise<string | undefined> {
  if (cachedWorkerURL) return cachedWorkerURL;
  try {
    const res = await fetch("/ffmpeg-worker.js");
    const code = await res.text();
    cachedWorkerURL = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    return cachedWorkerURL;
  } catch {
    return undefined;
  }
}

async function tryLoad(
  instance: FFmpeg,
  base: string,
  multi: boolean,
  worker: string | undefined,
): Promise<void> {
  const config: Record<string, string> = {
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
  };
  if (multi) {
    config["workerURL"] = await toBlobURL(`${base}/ffmpeg-core.worker.js`, "text/javascript");
  }
  if (worker) config["classWorkerURL"] = worker;
  // the multi-thread core is a bonus: give up on it quickly and fall back to
  // the single-thread core, which works everywhere (desktop included).
  await withTimeout(instance.load(config), multi ? 15_000 : 40_000, multi ? "core-mt" : "core");
}

async function loadCore(onLog?: (msg: string) => void): Promise<FFmpeg> {
  const worker = await classWorkerURL();
  const attempts: Array<{ base: string; multi: boolean; plain?: boolean }> = [
    // The multi-thread core can deadlock while booting on desktop Chromium.
    // Start with the reliable single-thread core instead of making desktop
    // users wait for a large failed download before processing can begin.
    { base: CORE_ST, multi: false },
    { base: CORE_ST_ALT, multi: false },
    // last resort: no custom class worker (some desktop setups block blob workers)
    { base: CORE_ST, multi: false, plain: true },
  ];

  let lastError: unknown = null;
  for (const attempt of attempts) {
    const instance = new FFmpeg();
    if (onLog) instance.on("log", ({ message }) => onLog(message));
    try {
      const plain = attempt.plain === true;
      await tryLoad(instance, attempt.base, attempt.multi, plain ? undefined : worker);
      ffmpegThreads = 1;
      return instance;
    } catch (err) {
      lastError = err;
      try {
        instance.terminate();
      } catch {
        /* ignore */
      }
    }
  }
  ffmpegThreads = 1;
  throw new Error(
    `Não foi possível iniciar o motor de vídeo. Verifique sua conexão e tente novamente. (${
      lastError instanceof Error ? lastError.message : String(lastError)
    })`,
  );
}

export async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (!loading) {
    loading = loadCore(onLog).then(
      (i) => {
        ffmpeg = i;
        return i;
      },
      (err) => {
        // allow a retry on the next click instead of caching the failure
        loading = null;
        throw err;
      },
    );
  }
  return loading;
}

/**
 * Throws the current wasm instance away. The wasm heap only ever grows, so a
 * long batch eventually runs out of memory and every remaining clip fails.
 * Recycling gives the next clip a clean heap.
 */
export function resetFFmpeg(): void {
  const instance = ffmpeg;
  ffmpeg = null;
  loading = null;
  rendersSinceBoot = 0;
  if (instance) {
    try {
      instance.terminate();
    } catch {
      /* ignore */
    }
  }
}

/** largest frame we ever encode (9:16, full vertical HD) */
const ENCODE_SIZE = { w: 1080, h: 1920 };

/** how many clips one wasm instance renders before it is recycled */
const RECYCLE_EVERY = 5;
let rendersSinceBoot = 0;

type SourceInfo = { duration: number; width: number; height: number };

function probeSource(file: File): Promise<SourceInfo> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const finish = (info: SourceInfo) => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      resolve(info);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      finish({
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
      });
    video.onerror = () => finish({ duration: 0, width: 0, height: 0 });
    video.src = url;
  });
}

/**
 * Frame size actually encoded. Upscaling a 720p source to 1080p costs a lot of
 * time and adds no detail, so the output never exceeds the source resolution
 * (kept 9:16 and never below 720x1280 so short-form video stays crisp).
 */
function encodeSize(info: SourceInfo): { w: number; h: number } {
  const sourceLong = Math.max(info.width, info.height);
  if (!sourceLong) return ENCODE_SIZE;
  const h = Math.min(ENCODE_SIZE.h, Math.max(1280, sourceLong));
  const even = (n: number) => Math.round(n / 2) * 2;
  return { w: even((h * 9) / 16), h: even(h) };
}

/**
 * Video budget derived from the original file. Reserving room for audio keeps
 * the finished file close to the source size, while a small headroom allowance
 * avoids crushing detailed frames during the unavoidable re-encode.
 */
function targetVideoBitrate(file: File, info: SourceInfo): number {
  if (info.duration <= 0) return 4_000;
  const sourceTotalKbps = (file.size * 8) / info.duration / 1_000;
  const sourceVideoBudget = sourceTotalKbps * 1.03 - 128;
  return Math.round(Math.min(10_000, Math.max(700, sourceVideoBudget)));
}



/**
 * Renders titles, bottom captions, borders and colour overlays into a
 * transparent PNG the size of the output frame. Text drawing happens on a
 * canvas (browser fonts) instead of ffmpeg's drawtext, which keeps typography
 * identical to the live preview.
 */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function buildOverlayPng(
  opts: EditOptions,
  titleText: string,
): Promise<Blob | null> {
  const { w, h } = ASPECTS[opts.aspect];
  const hasTitle = opts.title.enabled && titleText.trim().length > 0;
  const hasTint = opts.overlayOpacity > 0;
  if (!hasTitle && !hasTint) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;


  if (hasTint) {
    ctx.fillStyle = opts.overlayColor;
    ctx.globalAlpha = Math.min(1, Math.max(0, opts.overlayOpacity));
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }


  // make sure the chosen web fonts are ready before measuring/painting text
  try {
    await Promise.all([
      document.fonts.load(`700 ${opts.title.size}px ${fontStack(opts.title.font)}`),
      document.fonts.ready,
    ]);
  } catch {
    /* ignore */
  }

  const drawBlock = (block: TextBlock, text: string) => {
    ctx.font = `700 ${block.size}px ${fontStack(block.font)}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = block.color;
    ctx.shadowBlur = 0;
    const maxWidth = w * 0.86;
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    const lineHeight = block.size * 1.2;
    const cx = (block.x / 100) * w;
    const cy = (block.y / 100) * h;
    const top = cy - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, cx, top + i * lineHeight);
    });
  };

  if (hasTitle) drawBlock(opts.title, titleText.trim());

  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}


function buildFilterChain(
  opts: EditOptions,
  inputs: { bgIndex: number | null; overlayIndex: number | null },
  size: { w: number; h: number } = ENCODE_SIZE,
): string {
  // Matching the source resolution keeps every filter and the encoder from
  // handling more pixels than the original ever had.
  const { w, h } = size;

  const zoom = Math.min(5, Math.max(0.5, opts.zoom));
  // zoom 1 = video covers the whole frame; below 1 it shrinks over the background.
  const sw = Math.max(2, Math.round((w * zoom) / 2) * 2);
  const sh = Math.max(2, Math.round((h * zoom) / 2) * 2);
  // position: 0..5 where 2.5 keeps the video centred; the extremes slide it
  // a full frame to either side so it can leave the screen entirely.
  const px = Math.min(5, Math.max(0, opts.posX));
  const py = Math.min(5, Math.max(0, opts.posY));

  // Borders trim ONLY the video layer: the cut area reveals the background
  // (solid colour or the overlay image), it is never painted over.
  const ox = Math.round((w - sw) / 2 + ((px - 2.5) / 2.5) * w);
  const oy = Math.round((h - sh) / 2 + ((py - 2.5) / 2.5) * h);
  const barTop = Math.round(h * Math.min(0.45, Math.max(0, opts.border.top)));
  const barBottom = Math.round(h * Math.min(0.45, Math.max(0, opts.border.bottom)));
  let cutTop = Math.min(sh - 2, Math.max(0, barTop - oy));
  let cutBottom = Math.min(sh - 2 - cutTop, Math.max(0, oy + sh - (h - barBottom)));
  cutTop = Math.round(cutTop / 2) * 2;
  cutBottom = Math.round(cutBottom / 2) * 2;
  const vh = Math.max(2, Math.round((sh - cutTop - cutBottom) / 2) * 2);

  const parts: string[] = [];
  const bgFront = opts.bgImage.layer === "front";
  // Cover-fit the source to the output frame, scale it by the zoom factor,
  // then place it over the background (solid colour, optionally an image).
  // "contain" keeps the whole original frame: it is scaled down inside the box
  // and the empty area is transparent, so the background shows through.
  const fitContain = opts.fit !== "cover";
  const fitChain = fitContain
    ? `scale=${sw}:${sh}:force_original_aspect_ratio=decrease:flags=bilinear,` +
      `format=rgba,pad=${sw}:${sh}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`
    : `scale=${sw}:${sh}:force_original_aspect_ratio=increase:flags=bilinear,crop=${sw}:${sh}`;
  parts.push(
    // capping the frame rate first means every later filter (and the encoder)
    // handles far fewer frames on 50/60fps sources without visible loss.
    `[0:v]fps=30,${opts.mirror ? "hflip," : ""}${fitChain}` +
      (cutTop > 0 || cutBottom > 0 ? `,crop=${sw}:${vh}:0:${cutTop}` : "") +
      `,setsar=1[vid]`,
  );

  parts.push(`color=c=${opts.bgColor}:s=${w}x${h}:r=30[bgc]`);
  let bgLabel = "bgc";
  if (inputs.bgIndex !== null) {
    const alpha = Math.min(1, Math.max(0, opts.bgImage.opacity));
    parts.push(
      `[${inputs.bgIndex}:v]scale=${w}:${h}:force_original_aspect_ratio=increase,` +
        `crop=${w}:${h},format=rgba,colorchannelmixer=aa=${alpha.toFixed(3)}[bgimg]`,
    );
    if (!bgFront) {
      parts.push(`[bgc][bgimg]overlay=0:0[bgm]`);
      bgLabel = "bgm";
    }
  }
  parts.push(
    `[${bgLabel}][vid]overlay=x=${ox}:y=${oy + cutTop}:shortest=1[base]`,
  );


  let label = "base";
  if (inputs.bgIndex !== null && bgFront) {
    parts.push(`[base][bgimg]overlay=0:0[bfr]`);
    label = "bfr";
  }
  const push = (filter: string, next: string) => {
    parts.push(`[${label}]${filter}[${next}]`);
    label = next;
  };


  if (opts.speed !== 1) push(`setpts=PTS/${opts.speed.toFixed(3)}`, "spd");
  if (inputs.overlayIndex !== null) {
    parts.push(`[${inputs.overlayIndex}:v]scale=${w}:${h}[ovl]`);
    parts.push(`[${label}][ovl]overlay=0:0[outv]`);
    label = "outv";
  }
  if (label !== "outv") parts.push(`[${label}]null[outv]`);
  return parts.join(";");
}


async function renderOnce(
  file: File,
  opts: EditOptions,
  titleText: string,
  onProgress: (ratio: number) => void,
): Promise<Blob> {
  const ff = await getFFmpeg();
  const source = await probeSource(file);
  const size = encodeSize(source);
  const videoBitrate = targetVideoBitrate(file, source);

  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const inputName = `in_${stamp}.mp4`;
  const overlayName = `ovl_${stamp}.png`;
  const bgName = `bg_${stamp}.png`;
  const outputName = `out_${stamp}.mp4`;

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress(Math.min(1, Math.max(0, progress)));
  };
  ff.on("progress", progressHandler);

  try {
    await ff.writeFile(inputName, await fetchFile(file));

    const useBg = opts.bgImage.enabled && !!opts.bgImage.src;
    if (useBg && opts.bgImage.src) await ff.writeFile(bgName, await fetchFile(opts.bgImage.src));

    const overlayPng = await buildOverlayPng(opts, titleText);
    if (overlayPng) await ff.writeFile(overlayName, await fetchFile(overlayPng));

    const args = ["-i", inputName];
    let next = 1;
    let bgIndex: number | null = null;
    let overlayIndex: number | null = null;
    if (useBg) {
      args.push("-i", bgName);
      bgIndex = next++;
    }
    if (overlayPng) {
      args.push("-i", overlayName);
      overlayIndex = next++;
    }
    args.push(
      "-filter_complex_threads",
      String(ffmpegThreads),
      "-filter_complex",
      buildFilterChain(opts, { bgIndex, overlayIndex }),
      "-map",
      "[outv]",
    );

    if (opts.speed !== 1) {
      args.push("-filter:a", `atempo=${Math.min(2, Math.max(0.5, opts.speed)).toFixed(3)}`);
    }
    args.push(
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      // Superfast cuts browser processing time substantially. CRF 18 protects
      // fine detail, while maxrate keeps the result near the original size.
      "-preset",
      "superfast",
      "-crf",
      "18",
      "-maxrate",
      `${Math.round(videoBitrate * 1.08)}k`,
      "-bufsize",
      `${Math.round(videoBitrate * 1.5)}k`,
      "-profile:v",
      "main",
      "-level",
      "4.0",
      "-r",
      "30",
      "-g",
      "90",
      "-threads",
      String(ffmpegThreads),
      "-pix_fmt",
      "yuv420p",
    );
    if (opts.speed === 1) {
      // Preserve the original audio without another encode whenever its timing
      // is unchanged. This is lossless and removes work from every render.
      args.push("-c:a", "copy");
    } else {
      args.push("-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "44100");
    }
    if (opts.stripMetadata) {
      args.push(
        "-map_metadata",
        "-1",
        "-map_chapters",
        "-1",
        "-fflags",
        "+bitexact",
        "-flags:v",
        "+bitexact",
        "-flags:a",
        "+bitexact",
        "-metadata",
        "title=",
      );
    }
    args.push("-movflags", "+faststart", outputName);

    const exitCode = await ff.exec(args);
    if (exitCode !== 0) throw new Error("Não foi possível concluir a renderização do vídeo.");
    const data = await ff.readFile(outputName);

    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    return new Blob([copy.buffer], { type: "video/mp4" });
  } finally {
    ff.off("progress", progressHandler);
    await ff.deleteFile(inputName).catch(() => {});
    await ff.deleteFile(outputName).catch(() => {});
    await ff.deleteFile(overlayName).catch(() => {});
    await ff.deleteFile(bgName).catch(() => {});
  }
}

/**
 * Renders one clip, recycling the wasm engine as needed. The wasm heap never
 * shrinks, so long batches used to die partway through ("failed" from roughly
 * the tenth clip on). Now the engine is rebooted every few clips, and a failed
 * clip gets one clean retry on a fresh engine before it is reported as failed.
 */
export async function processVideo(
  file: File,
  opts: EditOptions,
  titleText: string,
  onProgress: (ratio: number) => void,
): Promise<Blob> {
  if (rendersSinceBoot >= RECYCLE_EVERY) resetFFmpeg();
  try {
    const blob = await renderOnce(file, opts, titleText, onProgress);
    rendersSinceBoot += 1;
    return blob;
  } catch (err) {
    // out-of-memory and aborted-worker failures leave the engine unusable
    resetFFmpeg();
    onProgress(0);
    try {
      const blob = await renderOnce(file, opts, titleText, onProgress);
      rendersSinceBoot += 1;
      return blob;
    } catch {
      resetFFmpeg();
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}

export function outputName(originalName: string, aspect: AspectId): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "video";
  return `${base}_${aspect.replace(":", "x")}.mp4`;
}

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
};


/** Every knob the batch editor exposes. */
export type EditOptions = {
  aspect: AspectId;
  /** 1 = video fills the frame; below 1 it shrinks and the background shows */
  zoom: number;
  /** 0..1 placement anchor (0.5 = centered) */
  posX: number;
  posY: number;
  /** colour behind the video when zoom < 1 */
  bgColor: string;
  /** playback rate, e.g. 1.02 for anti-duplication */
  speed: number;
  mirror: boolean;
  /** solid bars painted over the top/bottom of the frame to hide watermarks */
  border: { color: string; mode: "manual" | "auto"; top: number; bottom: number };
  title: { enabled: boolean; text: string; color: string; size: number };
  bottom: { enabled: boolean; text: string; color: string; size: number };
  overlayOpacity: number;
  overlayColor: string;
  bgImage: BackgroundImage;
  fadeIn: boolean;
};

export const defaultEditOptions = (): EditOptions => ({
  aspect: "9:16",
  zoom: 1,
  posX: 0.5,
  posY: 0.5,
  bgColor: "#000000",
  speed: 1,
  mirror: false,
  border: { color: "#ffffff", mode: "manual", top: 0, bottom: 0 },
  title: { enabled: false, text: "", color: "#ffffff", size: 64 },
  bottom: { enabled: false, text: "", color: "#ffffff", size: 44 },
  overlayOpacity: 0,
  overlayColor: "#000000",
  bgImage: { enabled: false, src: null, opacity: 1 },
  fadeIn: false,
});



let ffmpeg: FFmpeg | null = null;

export async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    if (onLog) ffmpeg.on("log", ({ message }) => onLog(message));
    const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    });
  }
  return ffmpeg;
}

/**
 * Renders titles, bottom captions, borders and colour overlays into a
 * transparent PNG the size of the output frame. Text drawing happens on a
 * canvas (browser fonts) instead of ffmpeg's drawtext, which keeps typography
 * identical to the live preview.
 */
function loadImage(src: string): Promise<HTMLImageElement | null> {
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
  const hasBottom = opts.bottom.enabled && opts.bottom.text.trim().length > 0;
  const hasBorder = opts.border.top > 0 || opts.border.bottom > 0;
  const hasTint = opts.overlayOpacity > 0;
  if (!hasTitle && !hasBottom && !hasBorder && !hasTint) return null;

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

  if (hasBorder) {
    ctx.fillStyle = opts.border.color;
    if (opts.border.top > 0) ctx.fillRect(0, 0, w, Math.round(h * opts.border.top));
    if (opts.border.bottom > 0) {
      const bh = Math.round(h * opts.border.bottom);
      ctx.fillRect(0, h - bh, w, bh);
    }
  }

  const drawWrapped = (text: string, size: number, color: string, baselineY: number, fromTop: boolean) => {
    ctx.font = `700 ${size}px Inter, "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = size * 0.35;
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
    const lineHeight = size * 1.2;
    lines.forEach((line, i) => {
      const y = fromTop
        ? baselineY + i * lineHeight
        : baselineY - (lines.length - 1 - i) * lineHeight;
      ctx.fillText(line, w / 2, y);
    });
    ctx.shadowBlur = 0;
  };

  if (hasTitle) {
    drawWrapped(titleText.trim(), opts.title.size, opts.title.color, h * 0.12, true);
  }
  if (hasBottom) {
    drawWrapped(opts.bottom.text.trim(), opts.bottom.size, opts.bottom.color, h * 0.9, false);
  }

  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}


function buildFilterChain(
  opts: EditOptions,
  inputs: { bgIndex: number | null; overlayIndex: number | null },
): string {
  const { w, h } = ASPECTS[opts.aspect];
  const zoom = Math.min(5, Math.max(0.5, opts.zoom));
  // zoom 1 = video covers the whole frame; below 1 it shrinks over the background.
  const sw = Math.max(2, Math.round((w * zoom) / 2) * 2);
  const sh = Math.max(2, Math.round((h * zoom) / 2) * 2);
  const px = Math.min(1, Math.max(0, opts.posX));
  const py = Math.min(1, Math.max(0, opts.posY));

  const parts: string[] = [];
  // Cover-fit the source to the output frame, scale it by the zoom factor,
  // then place it over the background (solid colour, optionally an image).
  parts.push(
    `[0:v]${opts.mirror ? "hflip," : ""}scale=${w}:${h}:force_original_aspect_ratio=increase,` +
      `crop=${w}:${h},scale=${sw}:${sh},setsar=1[vid]`,
  );
  parts.push(`color=c=${opts.bgColor}:s=${w}x${h}:r=30[bgc]`);
  let bgLabel = "bgc";
  if (inputs.bgIndex !== null) {
    const alpha = Math.min(1, Math.max(0, opts.bgImage.opacity));
    parts.push(
      `[${inputs.bgIndex}:v]scale=${w}:${h}:force_original_aspect_ratio=increase,` +
        `crop=${w}:${h},format=rgba,colorchannelmixer=aa=${alpha.toFixed(3)}[bgimg]`,
    );
    parts.push(`[bgc][bgimg]overlay=0:0[bgm]`);
    bgLabel = "bgm";
  }
  parts.push(
    `[${bgLabel}][vid]overlay=x=(W-w)*${px.toFixed(3)}:y=(H-h)*${py.toFixed(3)}:shortest=1[base]`,
  );

  let label = "base";
  const push = (filter: string, next: string) => {
    parts.push(`[${label}]${filter}[${next}]`);
    label = next;
  };


  if (opts.speed !== 1) push(`setpts=PTS/${opts.speed.toFixed(3)}`, "spd");
  if (opts.fadeIn) push("fade=t=in:st=0:d=0.4", "fdi");
  if (inputs.overlayIndex !== null) {
    parts.push(`[${inputs.overlayIndex}:v]scale=${w}:${h}[ovl]`);
    parts.push(`[${label}][ovl]overlay=0:0[outv]`);
    label = "outv";
  }
  if (label !== "outv") parts.push(`[${label}]null[outv]`);
  return parts.join(";");
}


export async function processVideo(
  file: File,
  opts: EditOptions,
  titleText: string,
  onProgress: (ratio: number) => void,
): Promise<Blob> {
  const ff = await getFFmpeg();
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const inputName = `in_${stamp}.mp4`;
  const overlayName = `ovl_${stamp}.png`;
  const bgName = `bg_${stamp}.png`;
  const outputName = `out_${stamp}.mp4`;

  ff.on("progress", ({ progress }) => {
    onProgress(Math.min(1, Math.max(0, progress)));
  });

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
    "-preset",
    "veryfast",
    "-crf",
    "26",

    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputName,
  );

  await ff.exec(args);
  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName).catch(() => {});
  await ff.deleteFile(outputName).catch(() => {});
  if (overlayPng) await ff.deleteFile(overlayName).catch(() => {});

  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: "video/mp4" });
}

export function outputName(originalName: string, aspect: AspectId): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "video";
  return `${base}_${aspect.replace(":", "x")}.mp4`;
}

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export type AspectId = "9:16" | "1:1" | "4:5";

export const ASPECTS: Record<AspectId, { label: string; w: number; h: number }> = {
  "9:16": { label: "9:16 · Reels/Shorts", w: 1080, h: 1920 },
  "1:1": { label: "1:1 · Feed", w: 1080, h: 1080 },
  "4:5": { label: "4:5 · Feed vertical", w: 1080, h: 1350 },
};

export type ProcessMode = "turbo" | "completo";

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

function buildFilter(aspect: AspectId, mode: ProcessMode): string {
  const { w, h } = ASPECTS[aspect];
  if (mode === "turbo") {
    // Center crop to fill the frame (fast).
    return `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`;
  }
  // Blurred background, video intact in front (slower).
  return (
    `split[a][b];` +
    `[a]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=24:2[bg];` +
    `[b]scale=${w}:${h}:force_original_aspect_ratio=decrease[fg];` +
    `[bg][fg]overlay=(W-w)/2:(H-h)/2`
  );
}

export async function processVideo(
  file: File,
  aspect: AspectId,
  mode: ProcessMode,
  onProgress: (ratio: number) => void,
): Promise<Blob> {
  const ff = await getFFmpeg();
  const inputName = `in_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`;
  const outputName = inputName.replace(/^in_/, "out_");

  ff.on("progress", ({ progress }) => {
    onProgress(Math.min(1, Math.max(0, progress)));
  });

  await ff.writeFile(inputName, await fetchFile(file));
  const args = [
    "-i",
    inputName,
    "-vf",
    buildFilter(aspect, mode),
    "-c:v",
    "libx264",
    "-preset",
    mode === "turbo" ? "ultrafast" : "veryfast",
    "-crf",
    mode === "turbo" ? "30" : "26",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputName,
  ];
  await ff.exec(args);
  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName).catch(() => {});
  await ff.deleteFile(outputName).catch(() => {});

  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: "video/mp4" });
}

export function outputName(originalName: string, aspect: AspectId): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "video";
  return `${base}_${aspect.replace(":", "x")}.mp4`;
}

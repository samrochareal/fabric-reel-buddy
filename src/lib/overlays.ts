export type TextAlign = "left" | "center" | "right";

export type OverlayConfig = {
  photo: string | null;
  name: string;
  handle: string;
  nameColor: string;
  handleColor: string;
  bgColor: string;
  align: TextAlign;
  verified: boolean;
  /** 0..1 anchors inside the 1080x1920 frame */
  textX: number;
  textY: number;
  textSize: number;
  photoX: number;
  photoY: number;
  photoSize: number;
};

export type OverlayPreset = {
  slot: number;
  name: string;
  /** rendered PNG data URL, ready to use as the video background */
  dataUrl: string;
  config: OverlayConfig;
  updatedAt: number;
};

export const OVERLAY_SLOTS = 10;
export const OVERLAY_W = 1080;
export const OVERLAY_H = 1920;

const KEY = "fdr.overlays.v1";

export const defaultOverlayConfig = (): OverlayConfig => ({
  photo: null,
  name: "",
  handle: "",
  nameColor: "#000000",
  handleColor: "#ffffff",
  bgColor: "#ffffff",
  align: "center",
  verified: false,
  textX: 0.5,
  textY: 0.12,
  textSize: 64,
  photoX: 0.5,
  photoY: 0.5,
  photoSize: 0.26,
});

function read(): OverlayPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as OverlayPreset[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: OverlayPreset[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function listOverlays(): OverlayPreset[] {
  return read().sort((a, b) => a.slot - b.slot);
}

export function getOverlay(slot: number): OverlayPreset | undefined {
  return read().find((p) => p.slot === slot);
}

export function saveOverlay(preset: OverlayPreset): OverlayPreset[] {
  const list = read().filter((p) => p.slot !== preset.slot);
  list.push({ ...preset, updatedAt: Date.now() });
  write(list);
  return listOverlays();
}

export function deleteOverlay(slot: number): OverlayPreset[] {
  write(read().filter((p) => p.slot !== slot));
  return listOverlays();
}

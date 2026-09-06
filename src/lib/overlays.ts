import { supabase } from "@/integrations/supabase/client";
import { guestStore, isGuest } from "@/lib/guest-mode";

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

type Row = {
  slot: number;
  name: string;
  data_url: string;
  config: unknown;
  updated_at: string;
};

const toPreset = (row: Row): OverlayPreset => ({
  slot: row.slot,
  name: row.name,
  dataUrl: row.data_url,
  config: { ...defaultOverlayConfig(), ...((row.config as OverlayConfig) ?? {}) },
  updatedAt: new Date(row.updated_at).getTime(),
});

const guestOverlays = () => guestStore.overlays as Map<number, OverlayPreset>;

export async function listOverlays(): Promise<OverlayPreset[]> {
  if (isGuest()) {
    return [...guestOverlays().values()].sort((a, b) => a.slot - b.slot);
  }
  const { data, error } = await supabase
    .from("overlay_presets")
    .select("slot,name,data_url,config,updated_at")
    .order("slot", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(toPreset);
}

export async function getOverlay(slot: number): Promise<OverlayPreset | null> {
  if (isGuest()) return guestOverlays().get(slot) ?? null;
  const { data, error } = await supabase
    .from("overlay_presets")
    .select("slot,name,data_url,config,updated_at")
    .eq("slot", slot)
    .maybeSingle();
  if (error) throw error;
  return data ? toPreset(data as Row) : null;
}

export async function saveOverlay(preset: OverlayPreset): Promise<OverlayPreset[]> {
  if (isGuest()) {
    guestOverlays().set(preset.slot, { ...preset, updatedAt: Date.now() });
    return listOverlays();
  }
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sessão expirada");
  const { error } = await supabase.from("overlay_presets").upsert(
    {
      user_id: userId,
      slot: preset.slot,
      name: preset.name,
      data_url: preset.dataUrl,
      config: preset.config as unknown as never,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,slot" },
  );
  if (error) throw error;
  return listOverlays();
}

export async function deleteOverlay(slot: number): Promise<OverlayPreset[]> {
  if (isGuest()) {
    guestOverlays().delete(slot);
    return listOverlays();
  }
  const { error } = await supabase.from("overlay_presets").delete().eq("slot", slot);
  if (error) throw error;
  return listOverlays();
}


import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Palette = {
  primary: string;
  background: string;
  accent: string;
};

export type ExternalLink = { title: string; url: string };

export type Branding = {
  system_name: string;
  tagline: string | null;
  palette: Palette;
  logo_url: string | null;
  icon_url: string | null;
  external_links: ExternalLink[];
};

export const defaultBranding: Branding = {
  system_name: "Fábrica de Reels",
  tagline: null,
  palette: { primary: "#f97316", background: "#0b0b0d", accent: "#27272a" },
  logo_url: null,
  icon_url: null,
  external_links: [],
};

export const brandingQueryKey = ["branding"] as const;

function normalizePalette(value: unknown): Palette {
  const p = (value ?? {}) as Partial<Palette>;
  return {
    primary: p.primary || defaultBranding.palette.primary,
    background: p.background || defaultBranding.palette.background,
    accent: p.accent || defaultBranding.palette.accent,
  };
}

function normalizeLinks(value: unknown): ExternalLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      const l = (raw ?? {}) as Partial<ExternalLink>;
      return { title: String(l.title ?? "").trim(), url: String(l.url ?? "").trim() };
    })
    .filter((l) => l.title && l.url);
}

export async function fetchBranding(): Promise<Branding> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("system_name, tagline, palette, logo_url, icon_url, external_links")
    .limit(1)
    .maybeSingle();
  if (error || !data) return defaultBranding;
  return {
    system_name: data.system_name || defaultBranding.system_name,
    tagline: data.tagline ?? null,
    palette: normalizePalette(data.palette),
    logo_url: data.logo_url ?? null,
    icon_url: data.icon_url ?? null,
    external_links: normalizeLinks(data.external_links),
  };
}

export async function saveBranding(input: {
  system_name: string;
  tagline: string | null;
  palette: Palette;
  logo_url: string | null;
  icon_url: string | null;
}) {
  const { error } = await supabase
    .from("platform_settings")
    .update({
      system_name: input.system_name,
      tagline: input.tagline,
      palette: input.palette as never,
      logo_url: input.logo_url,
      icon_url: input.icon_url,
    })
    .eq("id", true);
  if (error) throw error;
}

export async function saveExternalLinks(links: ExternalLink[]) {
  const { error } = await supabase
    .from("platform_settings")
    .update({ external_links: links as never })
    .eq("id", true);
  if (error) throw error;
}

/** Applies colours, page title and icon to the document. */
function applyBranding(branding: Branding) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--primary", branding.palette.primary);
  root.style.setProperty("--ring", branding.palette.primary);
  root.style.setProperty("--background", branding.palette.background);
  root.style.setProperty("--accent", branding.palette.accent);
  document.title = branding.tagline
    ? `${branding.system_name} — ${branding.tagline}`
    : branding.system_name;
  if (branding.icon_url) {
    let link = document.querySelector<HTMLLinkElement>("link#brand-icon");
    if (!link) {
      link = document.createElement("link");
      link.id = "brand-icon";
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = branding.icon_url;
  }
}

/**
 * Reads the platform identity and applies it to the page.
 * `ready` is false until the saved identity arrives, so the interface can hold
 * back the logo and name instead of flashing the original ones.
 */
export function useBranding(): Branding & { ready: boolean } {
  const query = useQuery({
    queryKey: brandingQueryKey,
    queryFn: fetchBranding,
    staleTime: 30_000,
  });
  const branding = query.data ?? defaultBranding;

  useEffect(() => {
    if (query.data) applyBranding(query.data);
  }, [query.data]);

  return { ...branding, ready: Boolean(query.data) };
}

export function useRefreshBranding() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: brandingQueryKey });
}

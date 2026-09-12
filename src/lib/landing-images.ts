import { supabase } from "@/integrations/supabase/client";

/** Largest image the master can put on the landing page. */
export const LANDING_IMAGE_MAX_BYTES = 10_000_000;

/**
 * Sends an image chosen by the master to the site's own image area and returns
 * the address used on the landing page.
 */
export async function uploadLandingImage(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext || "jpg"}`;
  const { error } = await supabase.storage.from("landing-images").upload(path, file, {
    contentType: file.type || "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return `/api/public/landing-image/${path}`;
}

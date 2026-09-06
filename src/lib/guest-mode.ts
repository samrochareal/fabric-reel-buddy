/**
 * Guest mode: full access to the editor without signing in.
 *
 * Nothing is persisted — projects and overlay presets live in memory for the
 * current tab only, so no history is left behind for a later visit.
 */
const GUEST_KEY = "fdr.guest";

export function enterGuestMode() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(GUEST_KEY, "1");
}

export function exitGuestMode() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(GUEST_KEY);
  resetGuestData();
}

export function isGuest(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(GUEST_KEY) === "1";
}

/** In-memory stores, wiped as soon as the tab is closed or reloaded. */
export const guestStore = {
  projects: [] as unknown[],
  overlays: new Map<number, unknown>(),
};

export function resetGuestData() {
  guestStore.projects = [];
  guestStore.overlays.clear();
}

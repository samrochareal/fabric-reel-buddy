/**
 * "Continuar conectado" preference.
 *
 * When the user opts out, the session is only valid for the current browser
 * session: we drop a sessionStorage marker while the tab is alive, and when a
 * fresh browser session starts without that marker the stored session is
 * cleared before any protected route renders.
 */
const REMEMBER_KEY = "fdr.remember-me";
const ALIVE_KEY = "fdr.session-alive";

export function setRememberMe(remember: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  if (remember) sessionStorage.removeItem(ALIVE_KEY);
  else sessionStorage.setItem(ALIVE_KEY, "1");
}

export function getRememberMe(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(REMEMBER_KEY) !== "0";
}

/** true when a non-persistent session must be discarded (browser was closed). */
export function shouldDiscardSession(): boolean {
  if (typeof window === "undefined") return false;
  if (getRememberMe()) return false;
  return sessionStorage.getItem(ALIVE_KEY) !== "1";
}

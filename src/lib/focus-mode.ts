/**
 * Lightweight cross-module focus-mode state.
 *
 * - `setFocusActive(true)` while a focus session is running
 * - `isFocusActive()` is read by the native push foreground handler to mute
 *   non-urgent notifications instead of showing them
 * - `notifyBlocked()` is dispatched when one is muted so the FocusTimer can
 *   render a real-time "muted" counter
 */
const FOCUS_KEY = "hdc_focus_active";
const FOCUS_EVENT = "hdc:focus-changed";
const BLOCKED_EVENT = "hdc:focus-blocked";

export function setFocusActive(active: boolean) {
  try {
    if (active) localStorage.setItem(FOCUS_KEY, "1");
    else localStorage.removeItem(FOCUS_KEY);
    window.dispatchEvent(new CustomEvent(FOCUS_EVENT, { detail: { active } }));
  } catch { /* ignore */ }
}

export function isFocusActive(): boolean {
  try { return localStorage.getItem(FOCUS_KEY) === "1"; } catch { return false; }
}

export function onFocusChanged(cb: (active: boolean) => void) {
  const h = (e: Event) => cb(!!(e as CustomEvent).detail?.active);
  window.addEventListener(FOCUS_EVENT, h);
  return () => window.removeEventListener(FOCUS_EVENT, h);
}

export function notifyBlocked(payload: { title?: string; body?: string }) {
  window.dispatchEvent(new CustomEvent(BLOCKED_EVENT, { detail: payload }));
}

export function onNotificationBlocked(cb: (p: { title?: string; body?: string }) => void) {
  const h = (e: Event) => cb((e as CustomEvent).detail || {});
  window.addEventListener(BLOCKED_EVENT, h);
  return () => window.removeEventListener(BLOCKED_EVENT, h);
}

/** Urgency tier carried in FCM data payload. Defaults to "normal". */
export type PushUrgency = "normal" | "urgent" | "emergency";

export function isUrgent(urgency?: string): boolean {
  return urgency === "urgent" || urgency === "emergency";
}

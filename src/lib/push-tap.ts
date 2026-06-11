/**
 * Resolves the destination URL for a tapped native push notification.
 * Pure function — easy to unit-test independent of the Capacitor runtime.
 *
 * Rules:
 * - `kind: "app_update"` → /dashboard (where UpdatePrompt auto-opens)
 * - else the explicit `url` from the data payload, if present
 * - else null (caller should do nothing)
 */
export function resolveTapUrl(
  data: Record<string, unknown> | null | undefined
): string | null {
  if (!data) return null;
  if (data.kind === "app_update") return "/dashboard";
  const url = data.url;
  return typeof url === "string" && url.length > 0 ? url : null;
}

/**
 * Current installed app version. Bump this every time you release a new APK
 * AND update /public/version.json on the server to the new version.
 *
 * Format: semver "MAJOR.MINOR.PATCH"
 */
export const APP_VERSION = "1.0.0";
export const APP_VERSION_CODE = 1;

/** Compare two semver strings. Returns 1 if a>b, -1 if a<b, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

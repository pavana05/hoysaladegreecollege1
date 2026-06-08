import { useEffect, useState, useCallback } from "react";
import { APP_VERSION, compareVersions } from "@/lib/app-version";

export interface VersionManifest {
  version: string;
  versionCode?: number;
  apkUrl: string;
  releaseDate?: string;
  forceUpdate?: boolean;
  minSupportedVersion?: string;
  releaseNotes?: string[];
}

const SKIP_KEY = "hdc_update_skipped_version";
const LAST_CHECK_KEY = "hdc_update_last_check";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

export function useAppUpdate() {
  const [manifest, setManifest] = useState<VersionManifest | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async (silent = true) => {
    try {
      setChecking(true);
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("manifest unreachable");
      const data = (await res.json()) as VersionManifest;
      setManifest(data);
      localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

      const newer = compareVersions(data.version, APP_VERSION) > 0;
      const mustUpdate =
        !!data.forceUpdate ||
        (data.minSupportedVersion
          ? compareVersions(APP_VERSION, data.minSupportedVersion) < 0
          : false);

      if (newer) {
        setUpdateAvailable(true);
        setForceUpdate(mustUpdate);
        // Respect "skip this version" unless force-update
        const skipped = localStorage.getItem(SKIP_KEY);
        if (!mustUpdate && skipped === data.version) {
          setDismissed(true);
        } else {
          setDismissed(false);
        }
      }
      return data;
    } catch (e) {
      if (!silent) console.warn("[update] check failed", e);
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // Throttle automatic checks
    const last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
    const due = Date.now() - last > CHECK_INTERVAL_MS;
    const t = setTimeout(() => check(true), due ? 1500 : 8000);
    return () => clearTimeout(t);
  }, [check]);

  const skip = useCallback(() => {
    if (manifest && !forceUpdate) {
      localStorage.setItem(SKIP_KEY, manifest.version);
      setDismissed(true);
    }
  }, [manifest, forceUpdate]);

  const remindLater = useCallback(() => {
    if (!forceUpdate) setDismissed(true);
  }, [forceUpdate]);

  return {
    manifest,
    updateAvailable: updateAvailable && !dismissed,
    forceUpdate,
    checking,
    skip,
    remindLater,
    recheck: () => check(false),
  };
}

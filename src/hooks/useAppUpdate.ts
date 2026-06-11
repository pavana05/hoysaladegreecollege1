import { useEffect, useState, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { APP_VERSION, compareVersions } from "@/lib/app-version";
import { supabase } from "@/integrations/supabase/client";

export interface VersionManifest {
  id?: string;
  version: string;
  versionCode?: number;
  apkUrl: string;
  apkSizeBytes?: number | null;
  releaseDate?: string;
  forceUpdate?: boolean;
  minSupportedVersion?: string | null;
  releaseNotes?: string[];
}

const SKIP_KEY = "hdc_update_skipped_version";
const LAST_CHECK_KEY = "hdc_update_last_check";
// Recheck more aggressively so a freshly-published release reaches devices quickly.
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_RECHECK_MS = 30 * 1000; // throttle foreground rechecks to 30s

async function fetchManifest(): Promise<VersionManifest | null> {
  // 1) Primary source: app_updates table (admin-managed)
  try {
    const { data, error } = await supabase
      .from("app_updates")
      .select("id, version, version_code, apk_url, apk_size_bytes, release_notes, force_update, min_supported_version, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!error && data && data.length) {
      const pick: any = data[0];
      return {
        id: pick.id,
        version: pick.version,
        versionCode: pick.version_code,
        apkUrl: pick.apk_url,
        apkSizeBytes: pick.apk_size_bytes,
        releaseDate: pick.created_at,
        forceUpdate: pick.force_update,
        minSupportedVersion: pick.min_supported_version,
        releaseNotes: pick.release_notes || [],
      };
    }
  } catch {
    /* fall through */
  }

  // 2) Fallback: static /version.json
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (res.ok) return (await res.json()) as VersionManifest;
  } catch {
    /* ignore */
  }
  return null;
}

export function useAppUpdate() {
  const [manifest, setManifest] = useState<VersionManifest | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);
  const lastCheckRef = useRef<number>(0);

  const check = useCallback(async (silent = true) => {
    try {
      setChecking(true);
      const data = await fetchManifest();
      lastCheckRef.current = Date.now();
      if (!data) return null;
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
        const skipped = localStorage.getItem(SKIP_KEY);
        setDismissed(!mustUpdate && skipped === data.version);
      } else {
        setUpdateAvailable(false);
      }
      return data;
    } catch (e) {
      if (!silent) console.warn("[update] check failed", e);
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  // Initial check + periodic poll
  useEffect(() => {
    const last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
    const due = Date.now() - last > CHECK_INTERVAL_MS;
    const t = setTimeout(() => check(true), due ? 1500 : 6000);
    const interval = setInterval(() => check(true), CHECK_INTERVAL_MS);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [check]);

  // Foreground / visibility — instantly recheck so newly-published releases
  // appear the moment the user opens the app again.
  useEffect(() => {
    const throttledCheck = () => {
      if (Date.now() - lastCheckRef.current < MIN_RECHECK_MS) return;
      check(true);
    };

    const onVis = () => { if (document.visibilityState === "visible") throttledCheck(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", throttledCheck);

    let removeNative: (() => void) | null = null;
    if (Capacitor.isNativePlatform()) {
      const handle = CapApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) throttledCheck();
      });
      removeNative = () => { Promise.resolve(handle).then((h: any) => h?.remove?.()); };
    }

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", throttledCheck);
      removeNative?.();
    };
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

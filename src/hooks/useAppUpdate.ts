import { useEffect, useState, useCallback } from "react";
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
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

async function fetchManifest(): Promise<VersionManifest | null> {
  // 1) Primary source: app_updates table (admin-managed)
  try {
    const { data, error } = await supabase
      .from("app_updates")
      .select("id, version, version_code, apk_url, apk_size_bytes, release_notes, force_update, min_supported_version, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        version: data.version,
        versionCode: data.version_code,
        apkUrl: data.apk_url,
        apkSizeBytes: data.apk_size_bytes,
        releaseDate: data.created_at,
        forceUpdate: data.force_update,
        minSupportedVersion: data.min_supported_version,
        releaseNotes: data.release_notes || [],
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

  const check = useCallback(async (silent = true) => {
    try {
      setChecking(true);
      const data = await fetchManifest();
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

  useEffect(() => {
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

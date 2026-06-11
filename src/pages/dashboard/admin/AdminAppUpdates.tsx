import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { APP_VERSION } from "@/lib/app-version";
import * as tus from "tus-js-client";
import {
  ArrowUpCircle, CloudUpload, Trash2, CheckCircle2, Sparkles, Package,
  ArrowDownToLine, CalendarDays, Hash, ShieldCheck, Radio, RadioTower,
  Plus, X, Zap, Clock, FileBox, Bolt,
} from "lucide-react";

interface AppUpdateRow {
  id: string;
  version: string;
  version_code: number;
  apk_url: string;
  apk_size_bytes: number | null;
  release_notes: string[];
  force_update: boolean;
  min_supported_version: string | null;
  is_active: boolean;
  created_at: string;
}

// iOS-style segmented input
const iosInput =
  "w-full bg-muted/40 dark:bg-white/[0.04] border border-border/40 rounded-2xl px-4 py-3 font-body text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all duration-300";

export default function AdminAppUpdates() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [version, setVersion] = useState("");
  const [versionCode, setVersionCode] = useState<number>(1);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [minSupportedVersion, setMinSupportedVersion] = useState("");
  const [notes, setNotes] = useState<string[]>([""]);
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0); // bytes/sec
  const [uploadEta, setUploadEta] = useState(0); // seconds
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const speedRef = useRef<{ t: number; bytes: number }>({ t: 0, bytes: 0 });

  const { data: releases = [], isLoading } = useQuery({
    queryKey: ["admin-app-updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_updates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AppUpdateRow[];
    },
  });

  const activeRelease = releases.find((r) => r.is_active);

  const reset = () => {
    setVersion(""); setVersionCode(1); setForceUpdate(false);
    setMinSupportedVersion(""); setNotes([""]); setApkFile(null);
    setUploadPct(0); setUploadSpeed(0); setUploadEta(0);
  };


  // Upload via TUS resumable protocol with parallel chunks — uses multiple
  // concurrent HTTP connections to saturate the user's bandwidth, which is
  // dramatically faster than a single XHR POST for large APKs.
  const uploadWithProgress = async (path: string, file: File) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not signed in — please log in again");

    const base = import.meta.env.VITE_SUPABASE_URL;
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const endpoint = `${base}/storage/v1/upload/resumable`;

    speedRef.current = { t: Date.now(), bytes: 0 };

    await new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint,
        retryDelays: [0, 1000, 3000, 5000],
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "x-upsert": "true",
          apikey,
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        // 6 MB chunks × 4 parallel = ~24 MB in-flight: saturates most pipes
        // without overwhelming the browser or mobile data plans.
        chunkSize: 6 * 1024 * 1024,
        parallelUploads: 4,
        metadata: {
          bucketName: "app-releases",
          objectName: path,
          contentType: "application/vnd.android.package-archive",
          cacheControl: "3600",
        },
        onError: (err) => reject(new Error(err?.message || "Upload failed — check your connection and try again")),
        onProgress: (bytesUploaded, bytesTotal) => {
          const pct = Math.min(85, Math.round((bytesUploaded / bytesTotal) * 85));
          setUploadPct(pct);
          const now = Date.now();
          const dt = (now - speedRef.current.t) / 1000;
          if (dt >= 0.5) {
            const speed = (bytesUploaded - speedRef.current.bytes) / dt;
            setUploadSpeed(speed);
            setUploadEta(speed > 0 ? Math.ceil((bytesTotal - bytesUploaded) / speed) : 0);
            speedRef.current = { t: now, bytes: bytesUploaded };
          }
        },
        onSuccess: () => resolve(),
      });
      upload.start();
    });
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!apkFile) throw new Error("Please select an APK file");
      if (!version.trim()) throw new Error("Version is required");
      if (!/^\d+\.\d+\.\d+$/.test(version.trim()))
        throw new Error("Version must be in format X.Y.Z (e.g. 1.2.0)");

      setSubmitting(true);
      setUploadPct(0);
      const cleanNotes = notes.map((n) => n.trim()).filter(Boolean);

      const path = `releases/v${version.trim()}-${Date.now()}.apk`;
      await uploadWithProgress(path, apkFile);
      setUploadPct(88);

      // The 'app-releases' bucket is private (workspace blocks public buckets),
      // so getPublicUrl() would 400. Issue a 10-year signed URL instead — that
      // is what installed devices actually fetch the APK from.
      const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
      const { data: signed, error: signErr } = await supabase.storage
        .from("app-releases")
        .createSignedUrl(path, TEN_YEARS);
      if (signErr || !signed?.signedUrl) {
        throw new Error("Could not generate download URL: " + (signErr?.message || "unknown"));
      }
      const pub = { publicUrl: signed.signedUrl };
      setUploadPct(92);

      await supabase.from("app_updates").update({ is_active: false }).eq("is_active", true);
      setUploadPct(96);

      const { error: insErr } = await supabase.from("app_updates").insert({
        version: version.trim(),
        version_code: versionCode,
        apk_url: pub.publicUrl,
        apk_size_bytes: apkFile.size,
        release_notes: cleanNotes,
        force_update: forceUpdate,
        min_supported_version: minSupportedVersion.trim() || null,
        is_active: true,
        created_by: user?.id,
      });
      if (insErr) throw insErr;
      setUploadPct(100);

      // Push fallback: broadcast a high-priority FCM to every registered device
      // so installed users see the update prompt even if the app is closed.
      try {
        await supabase.functions.invoke("send-fcm-notification", {
          body: {
            target_role: ["student", "teacher", "principal", "admin"],
            // Mark as urgent so focus-mode lets it through, and tag the kind
            // so the app can route the tap straight into the update prompt.
            data: { urgency: "urgent", kind: "app_update", version: version.trim() },
            notifications: [{
              title: `🚀 HDC Portal v${version.trim()} is here`,
              body: cleanNotes[0] || "Tap to install the latest update.",
              url: "/dashboard",
            }],
          },
        });
      } catch (e) {
        console.warn("FCM broadcast failed (non-fatal):", e);
      }
    },
    onSuccess: () => {
      toast.success(`Published HDC Portal v${version}`, { description: "Users will be prompted to update automatically." });
      reset();
      qc.invalidateQueries({ queryKey: ["admin-app-updates"] });
    },
    onError: (e: any) => toast.error(e?.message || "Publish failed"),
    onSettled: () => setSubmitting(false),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (row: AppUpdateRow) => {
      if (!row.is_active) {
        await supabase.from("app_updates").update({ is_active: false }).eq("is_active", true);
      }
      const { error } = await supabase
        .from("app_updates")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Release status updated");
      qc.invalidateQueries({ queryKey: ["admin-app-updates"] });
    },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (row: AppUpdateRow) => {
      try {
        const url = new URL(row.apk_url);
        const marker = "/app-releases/";
        const idx = url.pathname.indexOf(marker);
        if (idx >= 0) {
          const key = url.pathname.substring(idx + marker.length);
          await supabase.storage.from("app-releases").remove([key]);
        }
      } catch { /* ignore */ }
      const { error } = await supabase.from("app_updates").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Release deleted");
      qc.invalidateQueries({ queryKey: ["admin-app-updates"] });
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  });

  const fmtSize = (b?: number | null) => {
    if (!b) return "—";
    if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024).toFixed(1)} KB`;
  };

  const fmtRelative = (iso: string) => {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  };

  const handleFileDrop = (f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".apk")) {
      toast.error("Only .apk files are accepted");
      return;
    }
    setApkFile(f);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* ─────────── iOS-style Hero ─────────── */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-card via-card to-card/80 border border-border/30 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
        {/* Aurora gradients */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[120px] opacity-50"
          style={{ background: "radial-gradient(circle, hsla(var(--primary), 0.35), transparent 70%)" }} />
        <div className="absolute -bottom-40 -left-32 w-96 h-96 rounded-full blur-[120px] opacity-40"
          style={{ background: "radial-gradient(circle, hsla(var(--gold, 45 90% 60%), 0.25), transparent 70%)" }} />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative p-7 sm:p-10">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-start gap-5">
              {/* iOS app icon */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-[1.4rem] bg-gradient-to-br from-primary to-primary/60 blur-xl opacity-50" />
                <div className="relative w-16 h-16 rounded-[1.4rem] bg-gradient-to-br from-primary via-primary to-primary/70 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-8px_rgba(0,0,0,0.4)]">
                  <ArrowUpCircle className="w-8 h-8 text-primary-foreground" strokeWidth={2.2} />
                  <div className="absolute inset-0 rounded-[1.4rem] bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="font-body text-[10px] font-semibold tracking-[0.15em] uppercase text-primary">
                    Over-The-Air
                  </span>
                </div>
                <h1 className="font-display text-[28px] sm:text-[34px] font-bold text-foreground tracking-tight leading-tight">
                  App Updates
                </h1>
                <p className="font-body text-[15px] text-muted-foreground mt-1.5 leading-snug max-w-md">
                  Ship a new HDC Portal build. Every installed app gets the in-app prompt instantly.
                </p>
              </div>
            </div>

            {/* Live status chip */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-background/60 backdrop-blur-xl border border-border/40">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-body text-xs text-muted-foreground">Web</span>
                <span className="font-mono text-xs font-semibold text-foreground">v{APP_VERSION}</span>
              </div>
              {activeRelease ? (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="font-body text-xs text-emerald-700 dark:text-emerald-300">Live</span>
                  <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300">v{activeRelease.version}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-muted/40 border border-border/40">
                  <Radio className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-body text-xs text-muted-foreground">No active release</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-3 mt-7">
            {[
              { icon: Package, label: "Releases", value: releases.length },
              { icon: ShieldCheck, label: "Forced", value: releases.filter(r => r.force_update).length },
              { icon: Bolt, label: "Latest", value: releases[0] ? fmtRelative(releases[0].created_at) : "—" },
            ].map((s, i) => (
              <div key={i} className="px-4 py-3 rounded-2xl bg-background/40 backdrop-blur-xl border border-border/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="w-3 h-3 text-muted-foreground" strokeWidth={2.2} />
                  <span className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
                </div>
                <p className="font-display text-lg font-bold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────── Publish Card ─────────── */}
      <div className="relative overflow-hidden rounded-[2rem] bg-card/80 backdrop-blur-2xl border border-border/40 shadow-[0_4px_30px_-8px_rgba(0,0,0,0.08)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="p-7 sm:p-9">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center">
              <CloudUpload className="w-4.5 h-4.5 text-primary" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground tracking-tight">New Release</h2>
              <p className="font-body text-xs text-muted-foreground">Goes live the moment you publish.</p>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); publishMutation.mutate(); }} className="space-y-5 mt-6">
            {/* APK Dropzone */}
            <div>
              <label className="font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                Android Package
              </label>
              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileDrop(e.dataTransfer.files?.[0] || null); }}
                className={`group relative block rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden ${
                  dragOver
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : apkFile
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border/60 hover:border-primary/40 hover:bg-muted/20"
                }`}
              >
                <input
                  type="file"
                  accept=".apk,application/vnd.android.package-archive"
                  onChange={(e) => handleFileDrop(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="p-8 text-center">
                  {apkFile ? (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-3">
                        <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.2} />
                      </div>
                      <p className="font-body text-sm font-semibold text-foreground">{apkFile.name}</p>
                      <p className="font-body text-xs text-muted-foreground mt-1">{fmtSize(apkFile.size)} • tap to replace</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 mx-auto flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                        <FileBox className="w-7 h-7 text-primary" strokeWidth={2} />
                      </div>
                      <p className="font-body text-sm font-semibold text-foreground">Drop your APK here</p>
                      <p className="font-body text-xs text-muted-foreground mt-1">or click to browse from your device</p>
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* Version grid */}
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  Version
                </label>
                <input value={version} onChange={(e) => setVersion(e.target.value)} required placeholder="1.1.0" className={iosInput} />
              </div>
              <div>
                <label className="font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  Build #
                </label>
                <input type="number" min={1} value={versionCode} onChange={(e) => setVersionCode(parseInt(e.target.value) || 1)} className={iosInput} />
              </div>
              <div>
                <label className="font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  Min supported
                </label>
                <input value={minSupportedVersion} onChange={(e) => setMinSupportedVersion(e.target.value)} placeholder="optional" className={iosInput} />
              </div>
            </div>

            {/* Release notes */}
            <div>
              <label className="font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                What's new
              </label>
              <div className="space-y-2">
                {notes.map((n, i) => (
                  <div key={i} className="flex gap-2 items-stretch">
                    <div className="flex items-center justify-center w-9 shrink-0 rounded-2xl bg-muted/40 border border-border/40 font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </div>
                    <input
                      value={n}
                      onChange={(e) => setNotes(notes.map((x, j) => (i === j ? e.target.value : x)))}
                      placeholder="Added biometric login, fixed sync delay…"
                      className={iosInput}
                    />
                    {notes.length > 1 && (
                      <button type="button" onClick={() => setNotes(notes.filter((_, j) => j !== i))}
                        className="shrink-0 w-11 rounded-2xl bg-destructive/5 hover:bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center transition-all active:scale-95">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setNotes([...notes, ""])}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 font-body text-xs font-semibold text-primary transition-all active:scale-95">
                  <Plus className="w-3 h-3" /> Add line
                </button>
              </div>
            </div>

            {/* iOS-style toggle for force update */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-amber-500/[0.04] to-orange-500/[0.04] border border-amber-500/20">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <p className="font-body text-sm font-semibold text-foreground">Mandatory update</p>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">Users can't dismiss the prompt. Use for critical fixes.</p>
                </div>
              </div>
              {/* iOS switch */}
              <button
                type="button"
                role="switch"
                aria-checked={forceUpdate}
                onClick={() => setForceUpdate(!forceUpdate)}
                className={`relative shrink-0 w-[52px] h-[32px] rounded-full transition-colors duration-300 ${
                  forceUpdate ? "bg-amber-500" : "bg-muted-foreground/25"
                }`}
              >
                <span className={`absolute top-[2px] left-[2px] w-[28px] h-[28px] rounded-full bg-white shadow-md transition-transform duration-300 ${
                  forceUpdate ? "translate-x-[20px]" : "translate-x-0"
                }`} />
              </button>
            </div>

            {/* Progress bar */}
            {submitting && (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <RadioTower className="w-3.5 h-3.5 text-primary animate-pulse" />
                    Uploading to the cloud…
                  </span>
                  <span className="font-mono text-xs font-bold text-primary tabular-nums">{uploadPct}%</span>
                </div>
                <div className="relative h-1.5 rounded-full bg-primary/10 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all duration-500"
                    style={{ width: `${uploadPct}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
                  </div>
                </div>
              </div>
            )}



            {/* Publish CTA */}
            <button
              type="submit"
              disabled={submitting || !apkFile || !version}
              className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground font-display font-semibold text-[15px] tracking-tight py-3.5 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)] hover:shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.7)] active:scale-[0.98] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center justify-center gap-2">
                <ArrowUpCircle className="w-5 h-5" strokeWidth={2.2} />
                {submitting ? "Publishing release…" : "Publish to all users"}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* ─────────── Release Timeline ─────────── */}
      <div className="rounded-[2rem] bg-card/80 backdrop-blur-2xl border border-border/40 overflow-hidden shadow-[0_4px_30px_-8px_rgba(0,0,0,0.08)]">
        <div className="px-7 py-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={2.2} />
            <h2 className="font-display text-base font-semibold text-foreground tracking-tight">Release history</h2>
          </div>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {releases.length} {releases.length === 1 ? "build" : "builds"}
          </span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted/30 rounded-2xl animate-pulse" />)}
          </div>
        ) : releases.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/30 mx-auto flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
            <p className="font-display text-base font-semibold text-foreground">No releases yet</p>
            <p className="font-body text-sm text-muted-foreground mt-1">Publish your first build above to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {releases.map((r) => (
              <div key={r.id} className="group p-6 hover:bg-muted/20 transition-colors duration-300">
                <div className="flex items-start gap-4">
                  {/* iOS app tile */}
                  <div className={`relative shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                    r.is_active
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30"
                      : r.force_update
                      ? "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/20"
                      : "bg-gradient-to-br from-muted to-muted/60"
                  }`}>
                    {r.is_active ? (
                      <CheckCircle2 className="w-6 h-6 text-white" strokeWidth={2.2} />
                    ) : r.force_update ? (
                      <Zap className="w-6 h-6 text-white" strokeWidth={2.2} />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground" strokeWidth={2} />
                    )}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-[17px] font-bold text-foreground tracking-tight">v{r.version}</span>
                      <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted/50">#{r.version_code}</span>
                      {r.is_active && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-body text-[10px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                        </span>
                      )}
                      {r.force_update && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-body text-[10px] font-bold uppercase tracking-wider">
                          <Zap className="w-2.5 h-2.5" strokeWidth={2.5} /> Forced
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-body mt-1">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {fmtRelative(r.created_at)}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span>{fmtSize(r.apk_size_bytes)}</span>
                    </div>

                    {r.release_notes.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {r.release_notes.slice(0, 4).map((n, i) => (
                          <li key={i} className="flex items-start gap-2 font-body text-[13px] text-muted-foreground leading-snug">
                            <span className="w-1 h-1 rounded-full bg-primary/50 mt-2 shrink-0" />
                            <span>{n}</span>
                          </li>
                        ))}
                        {r.release_notes.length > 4 && (
                          <li className="font-body text-[11px] text-muted-foreground/70 italic pl-3">
                            + {r.release_notes.length - 4} more
                          </li>
                        )}
                      </ul>
                    )}

                    {/* Action bar — iOS pill buttons */}
                    <div className="flex items-center gap-2 mt-4">
                      <a href={r.apk_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted font-body text-xs font-semibold text-foreground transition-all active:scale-95">
                        <ArrowDownToLine className="w-3.5 h-3.5" strokeWidth={2.2} /> APK
                      </a>
                      <button onClick={() => toggleActiveMutation.mutate(r)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body text-xs font-semibold transition-all active:scale-95 ${
                          r.is_active
                            ? "bg-muted/50 hover:bg-muted text-foreground"
                            : "bg-primary/10 hover:bg-primary/15 text-primary"
                        }`}>
                        <Radio className="w-3.5 h-3.5" strokeWidth={2.2} />
                        {r.is_active ? "Take down" : "Make live"}
                      </button>
                      <button onClick={() => { if (confirm(`Delete release v${r.version}?`)) deleteMutation.mutate(r); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/5 hover:bg-destructive/10 font-body text-xs font-semibold text-destructive transition-all active:scale-95 ml-auto">
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

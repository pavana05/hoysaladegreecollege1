import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { APP_VERSION } from "@/lib/app-version";
import {
  Rocket, Upload, Trash2, CheckCircle2, AlertTriangle, Sparkles, FileArchive,
  Download, Calendar, Hash, ShieldAlert, Eye, EyeOff, Plus, X,
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

const inputClass =
  "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

export default function AdminAppUpdates() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // form state
  const [version, setVersion] = useState("");
  const [versionCode, setVersionCode] = useState<number>(1);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [minSupportedVersion, setMinSupportedVersion] = useState("");
  const [notes, setNotes] = useState<string[]>([""]);
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);

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
    setMinSupportedVersion(""); setNotes([""]); setApkFile(null); setUploadPct(0);
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!apkFile) throw new Error("Please select an APK file");
      if (!version.trim()) throw new Error("Version is required");
      if (!/^\d+\.\d+\.\d+$/.test(version.trim()))
        throw new Error("Version must be in format X.Y.Z (e.g. 1.2.0)");

      setSubmitting(true);
      const cleanNotes = notes.map((n) => n.trim()).filter(Boolean);

      // 1) Upload APK to bucket
      const path = `releases/v${version.trim()}-${Date.now()}.apk`;
      setUploadPct(15);
      const { error: upErr } = await supabase.storage
        .from("app-releases")
        .upload(path, apkFile, { cacheControl: "3600", upsert: false, contentType: "application/vnd.android.package-archive" });
      if (upErr) throw new Error("Upload failed: " + upErr.message);
      setUploadPct(75);

      const { data: pub } = supabase.storage.from("app-releases").getPublicUrl(path);

      // 2) Deactivate previous active releases
      await supabase.from("app_updates").update({ is_active: false }).eq("is_active", true);

      // 3) Insert new release
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
    },
    onSuccess: () => {
      toast.success(`Published HDC Portal v${version} 🚀`);
      reset();
      qc.invalidateQueries({ queryKey: ["admin-app-updates"] });
    },
    onError: (e: any) => toast.error(e?.message || "Publish failed"),
    onSettled: () => setSubmitting(false),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (row: AppUpdateRow) => {
      if (!row.is_active) {
        // Activating: deactivate others first
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
      // Try to also remove storage object
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

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-secondary/[0.04]" />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none"
          style={{ background: "hsla(var(--gold), 0.08)" }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3 h-3 text-amber-400/70" />
              <span className="font-body text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                Over-The-Air Updates
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">App Updates</h2>
            <p className="font-body text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Upload a new HDC Portal APK and all users get an in-app update prompt automatically.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/40 font-body text-[11px] text-muted-foreground">
                <Hash className="w-3 h-3" /> Web build: v{APP_VERSION}
              </span>
              {activeRelease && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-body text-[11px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Live: v{activeRelease.version}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Publish form */}
      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 sm:p-8">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        <h3 className="font-body text-sm font-bold text-foreground mb-1 flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" /> Publish New Release
        </h3>
        <p className="font-body text-xs text-muted-foreground mb-5">
          The active release becomes the latest version for all installed app users.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); publishMutation.mutate(); }} className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Version * (semver)</label>
              <input value={version} onChange={(e) => setVersion(e.target.value)} required placeholder="1.1.0" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Version Code</label>
              <input type="number" min={1} value={versionCode} onChange={(e) => setVersionCode(parseInt(e.target.value) || 1)} className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Min Supported</label>
              <input value={minSupportedVersion} onChange={(e) => setMinSupportedVersion(e.target.value)} placeholder="optional, e.g. 1.0.0" className={inputClass} />
            </div>
          </div>

          {/* Release notes */}
          <div>
            <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Release Notes</label>
            <div className="space-y-2">
              {notes.map((n, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={n}
                    onChange={(e) => setNotes(notes.map((x, j) => (i === j ? e.target.value : x)))}
                    placeholder={`What's new #${i + 1}`}
                    className={inputClass}
                  />
                  {notes.length > 1 && (
                    <button type="button" onClick={() => setNotes(notes.filter((_, j) => j !== i))}
                      className="shrink-0 px-3 rounded-xl border border-border hover:bg-muted text-muted-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setNotes([...notes, ""])}
                className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-primary hover:underline">
                <Plus className="w-3 h-3" /> Add bullet
              </button>
            </div>
          </div>

          {/* APK file */}
          <div>
            <label className="font-body text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
              <FileArchive className="w-3 h-3" /> APK File *
            </label>
            <input
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              required
              onChange={(e) => setApkFile(e.target.files?.[0] || null)}
              className="w-full font-body text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary file:font-semibold file:text-xs hover:file:bg-primary/20 cursor-pointer"
            />
            {apkFile && (
              <p className="font-body text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {apkFile.name} • {fmtSize(apkFile.size)}
              </p>
            )}
          </div>

          {/* Force-update toggle */}
          <label className="flex items-start gap-3 p-4 rounded-2xl border border-border/50 bg-muted/20 cursor-pointer">
            <input type="checkbox" checked={forceUpdate} onChange={(e) => setForceUpdate(e.target.checked)}
              className="mt-1 w-4 h-4 accent-amber-500" />
            <div className="flex-1">
              <p className="font-body text-sm font-semibold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Force update
              </p>
              <p className="font-body text-xs text-muted-foreground mt-0.5">
                Users cannot skip or dismiss. Use only for critical / breaking releases.
              </p>
            </div>
          </label>

          {submitting && (
            <div className="space-y-1.5">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-primary to-primary/60 transition-all" style={{ width: `${uploadPct}%` }} />
              </div>
              <p className="font-body text-[11px] text-muted-foreground">Publishing… {uploadPct}%</p>
            </div>
          )}

          <button type="submit" disabled={submitting || !apkFile || !version}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-body text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
            <Rocket className="w-4 h-4" />
            {submitting ? "Publishing…" : "Publish Release"}
          </button>
        </form>
      </div>

      {/* Release history */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="px-6 py-4 bg-muted/20 border-b border-border flex items-center justify-between">
          <h3 className="font-body text-sm font-bold text-foreground">Release History</h3>
          <span className="font-body text-xs text-muted-foreground">{releases.length} version{releases.length !== 1 ? "s" : ""}</span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted/40 rounded-2xl animate-pulse" />)}</div>
        ) : releases.length === 0 ? (
          <div className="p-12 text-center">
            <FileArchive className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-body text-sm text-muted-foreground">No releases yet. Publish one above.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {releases.map((r) => (
              <div key={r.id} className="p-5 hover:bg-muted/10 transition-colors">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-display text-base font-bold text-foreground">v{r.version}</span>
                      <span className="font-body text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted/50">code {r.version_code}</span>
                      {r.is_active && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-body text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Active
                        </span>
                      )}
                      {r.force_update && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-body text-[10px] font-bold uppercase tracking-wider">
                          <AlertTriangle className="w-2.5 h-2.5" /> Forced
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-body mb-2">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(r.created_at).toLocaleString()}</span>
                      <span>•</span>
                      <span>{fmtSize(r.apk_size_bytes)}</span>
                    </div>
                    {r.release_notes.length > 0 && (
                      <ul className="space-y-1 mt-2">
                        {r.release_notes.map((n, i) => (
                          <li key={i} className="flex items-start gap-2 font-body text-xs text-muted-foreground">
                            <span className="w-1 h-1 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                            <span>{n}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a href={r.apk_url} target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Download APK">
                      <Download className="w-4 h-4" />
                    </a>
                    <button onClick={() => toggleActiveMutation.mutate(r)}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title={r.is_active ? "Deactivate" : "Make active"}>
                      {r.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => { if (confirm(`Delete release v${r.version}?`)) deleteMutation.mutate(r); }}
                      className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
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

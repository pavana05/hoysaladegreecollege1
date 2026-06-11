import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { downloadFile } from "@/lib/native-download";
import { APP_VERSION } from "@/lib/app-version";
import { Sparkles, Download, Rocket, ShieldAlert, CheckCircle2, Clock } from "lucide-react";

export default function UpdatePrompt() {
  const { manifest, updateAvailable, forceUpdate, skip, remindLater } = useAppUpdate();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Update prompt is restricted to the installed native app — never show on the website.
  if (!Capacitor.isNativePlatform()) return null;
  if (!updateAvailable || !manifest) return null;

  const sizeMb = manifest.apkSizeBytes ? (manifest.apkSizeBytes / 1024 / 1024).toFixed(1) : null;

  const handleDownload = async () => {
    if (!manifest.apkUrl) return;
    setDownloading(true);
    setProgress(0);
    try {
      await downloadFile(manifest.apkUrl, `HDC-Portal-v${manifest.version}`, (p) => setProgress(p));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog
      open={updateAvailable}
      onOpenChange={(o) => { if (!o && !forceUpdate && !downloading) remindLater(); }}
    >
      <DialogContent
        className="max-w-md p-0 overflow-hidden border-white/10 bg-[hsl(230,12%,7%)] text-white rounded-[2rem]"
        onPointerDownOutside={(e) => { if (forceUpdate || downloading) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (forceUpdate || downloading) e.preventDefault(); }}
      >
        {/* Glow header */}
        <div className="relative px-6 pt-8 pb-6 overflow-hidden">
          <div className="absolute inset-0 opacity-80"
            style={{ background: "radial-gradient(ellipse at top, hsla(42,87%,55%,0.18), transparent 70%)" }} />
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-[80px] pointer-events-none"
            style={{ background: "hsla(42,87%,55%,0.18)" }} />

          <div className="relative flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-md"
              style={{ background: "linear-gradient(135deg, hsla(42,87%,58%,0.25), hsla(38,92%,50%,0.1))" }}>
              {forceUpdate ? (
                <ShieldAlert className="w-6 h-6 text-amber-300" />
              ) : (
                <Rocket className="w-6 h-6 text-amber-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Sparkles className="w-3 h-3 text-amber-300/80" />
                <span className="font-body text-[10px] font-bold tracking-[0.2em] uppercase text-white/50">
                  {forceUpdate ? "Required Update" : "New Version Available"}
                </span>
              </div>
              <h2 className="font-display text-xl font-bold text-white tracking-tight leading-tight">
                HDC Portal v{manifest.version}
              </h2>
            </div>
          </div>

          <p className="relative font-body text-sm text-white/60 leading-relaxed">
            {forceUpdate
              ? "This update is required to keep using the app. Please install it to continue."
              : "A fresh build is ready with new features and improvements."}
          </p>

          <div className="relative flex items-center gap-3 mt-4 text-[11px] text-white/40 font-body flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> You have v{APP_VERSION}
            </span>
            {sizeMb && (
              <>
                <span className="w-px h-3 bg-white/10" />
                <span>{sizeMb} MB</span>
              </>
            )}
            {manifest.releaseDate && (
              <>
                <span className="w-px h-3 bg-white/10" />
                <span>{new Date(manifest.releaseDate).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>

        {/* Release notes */}
        {manifest.releaseNotes && manifest.releaseNotes.length > 0 && (
          <div className="px-6 pb-2">
            <h3 className="font-body text-[11px] font-bold tracking-[0.15em] uppercase text-white/40 mb-3">
              What's New
            </h3>
            <ul className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {manifest.releaseNotes.map((note, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/75 font-body leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400/80 shrink-0 mt-0.5" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Download progress */}
        {downloading && (
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-body text-[11px] font-bold tracking-[0.15em] uppercase text-white/50">
                Downloading
              </span>
              <span className="font-mono text-xs font-bold text-amber-300 tabular-nums">{progress}%</span>
            </div>
            <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, hsl(42,87%,58%), hsl(38,92%,50%))",
                  boxShadow: "0 0 16px hsla(42,87%,55%,0.5)",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
              </div>
            </div>
            <p className="font-body text-[11px] text-white/40 mt-2">
              {progress < 100 ? "Streaming the new build to your device…" : "Opening installer…"}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pt-5 pb-6 space-y-2.5 border-t border-white/[0.06] mt-4 bg-black/20">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="group relative w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-body text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] touch-manipulation disabled:opacity-80 disabled:cursor-wait"
            style={{
              background: "linear-gradient(135deg, hsl(42,87%,58%), hsl(38,92%,50%))",
              color: "hsl(30,10%,10%)",
              boxShadow: "0 12px 32px hsla(42,87%,52%,0.3), inset 0 1px 0 hsla(50,100%,90%,0.3)",
            }}
          >
            <Download className={`w-4 h-4 ${downloading ? "animate-bounce" : ""}`} />
            <span>{downloading ? `Downloading… ${progress}%` : `Update to v${manifest.version}`}</span>
          </button>

          {!forceUpdate && !downloading && (
            <div className="flex gap-2">
              <button
                onClick={remindLater}
                className="flex-1 px-4 py-2.5 rounded-2xl font-body text-xs font-semibold text-white/60 hover:text-white/90 hover:bg-white/[0.04] transition-all"
              >
                Remind me later
              </button>
              <button
                onClick={skip}
                className="flex-1 px-4 py-2.5 rounded-2xl font-body text-xs font-semibold text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all"
              >
                {isTest ? "Dismiss test" : "Skip this version"}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import SEOHead from "@/components/SEOHead";
import BackButton from "@/components/BackButton";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { downloadFile } from "@/lib/native-download";
import { APP_VERSION } from "@/lib/app-version";
import {
  Rocket, Download, CheckCircle2, Sparkles, Loader2, RefreshCw,
  Smartphone, ShieldCheck, Clock, Package, Globe,
} from "lucide-react";
import { toast } from "sonner";

const INSTALL_MESSAGES = [
  { title: "Preparing your update…", subtitle: "Setting things up just for you" },
  { title: "Updating, please wait…", subtitle: "Polishing the new experience" },
  { title: "Almost there…", subtitle: "Tap Install when your device asks" },
  { title: "Thank you for your patience 💛", subtitle: "You're going to love what's new" },
];

export default function AppUpdates() {
  const { manifest, updateAvailable, checking, recheck } = useAppUpdate();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [installStep, setInstallStep] = useState(0);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!installing) return;
    const id = setInterval(
      () => setInstallStep((s) => (s + 1) % INSTALL_MESSAGES.length),
      2600,
    );
    return () => clearInterval(id);
  }, [installing]);

  const handleUpdate = async () => {
    if (!manifest?.apkUrl) return;
    if (!isNative) {
      // On web, just open the APK URL for download
      window.open(manifest.apkUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setDownloading(true);
    setProgress(0);
    try {
      await downloadFile(manifest.apkUrl, `HDC-Portal-v${manifest.version}`, (p) => setProgress(p));
      try { localStorage.setItem("hdc_update_skipped_version", manifest.version); } catch { /* ignore */ }
      setInstallStep(0);
      setInstalling(true);
    } catch {
      toast.error("Update failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleRecheck = async () => {
    const before = manifest?.version;
    const result = await recheck();
    if (result && (!before || result.version !== before)) {
      toast.success(`Found v${result.version}`);
    } else {
      toast.success("You're on the latest version");
    }
  };

  const latestVersion = manifest?.version ?? APP_VERSION;
  const sizeMb = manifest?.apkSizeBytes ? (manifest.apkSizeBytes / 1024 / 1024).toFixed(1) : null;
  const releaseDate = manifest?.releaseDate ? new Date(manifest.releaseDate).toLocaleDateString() : null;
  const msg = INSTALL_MESSAGES[installStep];

  return (
    <>
      <SEOHead title="App Updates · HDC Portal" description="Check the latest version of the HDC Portal and update your app" noIndex />
      <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
        <BackButton />

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-40" style={{ background: "hsla(42,87%,55%,0.35)" }} />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: "hsla(38,92%,50%,0.25)" }} />

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-3 py-1 mb-3">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="font-body text-[11px] text-primary font-semibold uppercase tracking-wider">App Updates</span>
            </div>
            <h1 className="font-body text-2xl sm:text-3xl font-bold tracking-tight">HDC Portal</h1>
            <p className="font-body text-sm text-muted-foreground mt-1.5">
              Keep your app fresh with the latest features, fixes and performance improvements.
            </p>
          </div>
        </div>

        {/* Installing overlay */}
        {installing && (
          <div className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-card p-8 text-center animate-fade-in">
            <div className="absolute inset-0 opacity-90 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, hsla(42,87%,55%,0.18), transparent 70%)" }} />
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-[100px] pointer-events-none animate-pulse"
              style={{ background: "hsla(42,87%,55%,0.22)" }} />

            <div className="relative">
              <div className="relative w-28 h-28 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                  style={{ borderTopColor: "hsl(42,87%,58%)", borderRightColor: "hsl(38,92%,50%)", animationDuration: "1.6s" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-md animate-pulse"
                    style={{ background: "linear-gradient(135deg, hsla(42,87%,58%,0.35), hsla(38,92%,50%,0.15))", boxShadow: "0 0 30px hsla(42,87%,55%,0.4)" }}>
                    <Rocket className="w-7 h-7 text-amber-400" />
                  </div>
                </div>
              </div>

              <div key={installStep} className="animate-fade-in">
                <h2 className="font-display text-2xl font-bold tracking-tight mb-2">{msg.title}</h2>
                <p className="font-body text-sm text-muted-foreground max-w-xs mx-auto">{msg.subtitle}</p>
              </div>

              <div className="flex items-center justify-center gap-2 mt-6">
                {INSTALL_MESSAGES.map((_, i) => (
                  <div key={i} className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: i === installStep ? 24 : 6,
                      background: i === installStep ? "linear-gradient(90deg, hsl(42,87%,58%), hsl(38,92%,50%))" : "hsla(0,0%,100%,0.12)",
                    }}
                  />
                ))}
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Do not close the app
              </div>
            </div>
          </div>
        )}

        {/* Version status card */}
        {!installing && (
          <section className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-body text-lg font-bold tracking-tight">
                      Version {latestVersion}
                    </h2>
                    {updateAvailable ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                        New
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                        Up to date
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">
                    Currently installed: <span className="font-semibold text-foreground">v{APP_VERSION}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleRecheck}
                disabled={checking}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted/70 font-body text-xs font-semibold transition-all disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
                {checking ? "Checking…" : "Check again"}
              </button>
            </div>

            {/* Meta chips */}
            <div className="mt-4 flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground font-body">
              {sizeMb && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 border border-border/40">
                  <Download className="w-3 h-3" /> {sizeMb} MB
                </span>
              )}
              {releaseDate && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 border border-border/40">
                  <Clock className="w-3 h-3" /> Released {releaseDate}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 border border-border/40">
                {isNative ? <Smartphone className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                {isNative ? "Android" : "Web"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" /> Verified release
              </span>
            </div>

            {/* Release notes */}
            {manifest?.releaseNotes && manifest.releaseNotes.length > 0 && (
              <div className="mt-6">
                <h3 className="font-body text-[11px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3">
                  What's New in v{manifest.version}
                </h3>
                <ul className="space-y-2.5">
                  {manifest.releaseNotes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80 font-body leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Download progress */}
            {downloading && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body text-[11px] font-bold tracking-[0.15em] uppercase text-muted-foreground">
                    Downloading
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-500 tabular-nums">{progress}%</span>
                </div>
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
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
                <p className="font-body text-[11px] text-muted-foreground mt-2">
                  Streaming the new build to your device…
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="mt-6">
              {updateAvailable && manifest?.apkUrl ? (
                <button
                  onClick={handleUpdate}
                  disabled={downloading}
                  className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-body text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-80 disabled:cursor-wait"
                  style={{
                    background: "linear-gradient(135deg, hsl(42,87%,58%), hsl(38,92%,50%))",
                    color: "hsl(30,10%,10%)",
                    boxShadow: "0 12px 32px hsla(42,87%,52%,0.3), inset 0 1px 0 hsla(50,100%,90%,0.3)",
                  }}
                >
                  <Download className={`w-4 h-4 ${downloading ? "animate-bounce" : ""}`} />
                  <span>
                    {downloading ? `Downloading… ${progress}%` : isNative ? `Update to v${manifest.version}` : `Download v${manifest.version}`}
                  </span>
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-body text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  You're already on the latest version
                </div>
              )}
            </div>
          </section>
        )}

        {/* Help section */}
        {!installing && (
          <section className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
            <h3 className="font-body text-sm font-bold tracking-tight mb-3">About app updates</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground font-body leading-relaxed">
              <li className="flex gap-2.5"><span className="text-primary mt-1">•</span> Updates roll out automatically and you'll be notified the moment a new build is ready.</li>
              <li className="flex gap-2.5"><span className="text-primary mt-1">•</span> Your data stays safe — settings, profile and saved preferences are preserved across updates.</li>
              <li className="flex gap-2.5"><span className="text-primary mt-1">•</span> If the installer doesn't open automatically, check your notifications or the <span className="font-semibold text-foreground">Downloads</span> folder.</li>
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

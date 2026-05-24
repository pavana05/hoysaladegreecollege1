import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Fingerprint, MapPin, Camera, ImagePlus, Check, X, Sparkles, ChevronRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STORAGE_KEY = "hdc_perms_done_v1";
const TRIGGER_KEY = "hdc_show_perms";

type StepStatus = "idle" | "granted" | "denied" | "skipped";

interface PermStep {
  id: string;
  title: string;
  desc: string;
  icon: any;
  gradient: string;
  optional?: boolean;
}

const STEPS: PermStep[] = [
  { id: "biometric", title: "Enable Biometric Lock", desc: "Use your fingerprint or face to unlock the app instantly and keep your account private.", icon: Fingerprint, gradient: "from-amber-400 via-orange-400 to-rose-400" },
  { id: "location", title: "Location Services", desc: "Helps us verify you're on campus for attendance and show nearby campus alerts.", icon: MapPin, gradient: "from-emerald-400 via-teal-400 to-cyan-400" },
  { id: "camera", title: "Camera Access", desc: "Required to scan QR codes, capture assignments, and update your profile photo.", icon: Camera, gradient: "from-violet-400 via-fuchsia-400 to-pink-400" },
  { id: "photo", title: "Add Profile Photo", desc: "Personalize your portal with a clear profile picture. You can skip this and add it later.", icon: ImagePlus, gradient: "from-sky-400 via-indigo-400 to-purple-400", optional: true },
];

export default function PermissionsOnboarding() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const done = localStorage.getItem(STORAGE_KEY) === "1";
    const trigger = localStorage.getItem(TRIGGER_KEY) === "1";
    if (!done && trigger) {
      setTimeout(() => setOpen(true), 600);
    }
  }, [user]);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    localStorage.removeItem(TRIGGER_KEY);
    setOpen(false);
  };

  const setStatus = (id: string, s: StepStatus) => setStatuses(p => ({ ...p, [id]: s }));

  const requestBiometric = async () => {
    setBusy(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { NativeBiometric } = await import("capacitor-native-biometric");
        const r = await NativeBiometric.isAvailable();
        if (r.isAvailable) {
          await NativeBiometric.verifyIdentity({ reason: "Enable biometric unlock", title: "HDC Portal", subtitle: "Confirm your identity" });
          localStorage.setItem("hdc_app_lock_enabled", "true");
          setStatus("biometric", "granted");
        } else { setStatus("biometric", "denied"); }
      } else if (window.PublicKeyCredential) {
        const avail = await (PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable?.();
        setStatus("biometric", avail ? "granted" : "denied");
      } else {
        setStatus("biometric", "denied");
      }
    } catch {
      setStatus("biometric", "denied");
    } finally { setBusy(false); next(); }
  };

  const requestLocation = async () => {
    setBusy(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import("@capacitor/geolocation");
        const r = await Geolocation.requestPermissions();
        setStatus("location", r.location === "granted" ? "granted" : "denied");
      } else if (navigator.geolocation) {
        await new Promise<void>((res) => {
          navigator.geolocation.getCurrentPosition(
            () => { setStatus("location", "granted"); res(); },
            () => { setStatus("location", "denied"); res(); },
            { timeout: 8000 }
          );
        });
      } else { setStatus("location", "denied"); }
    } catch { setStatus("location", "denied"); }
    finally { setBusy(false); next(); }
  };

  const requestCamera = async () => {
    setBusy(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { Camera: CapCamera } = await import("@capacitor/camera");
        const r = await CapCamera.requestPermissions({ permissions: ["camera"] });
        setStatus("camera", r.camera === "granted" ? "granted" : "denied");
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        setStatus("camera", "granted");
      }
    } catch { setStatus("camera", "denied"); }
    finally { setBusy(false); next(); }
  };

  const uploadPhoto = async (file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("user_id", user.id);
      await supabase.from("students").update({ avatar_url: pub.publicUrl }).eq("user_id", user.id);
      setStatus("photo", "granted");
      toast.success("Profile photo uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
      setStatus("photo", "denied");
    } finally { setBusy(false); next(); }
  };

  const skip = () => { setStatus(STEPS[idx].id, "skipped"); next(); };

  const next = () => {
    setTimeout(() => {
      if (idx >= STEPS.length - 1) finish();
      else setIdx(i => i + 1);
    }, 350);
  };

  const handleAction = () => {
    const id = STEPS[idx].id;
    if (id === "biometric") requestBiometric();
    else if (id === "location") requestLocation();
    else if (id === "camera") requestCamera();
  };

  if (!open) return null;
  const step = STEPS[idx];
  const Icon = step.icon;
  const progress = ((idx + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); }}>
      <DialogContent className="max-w-md p-0 border-0 overflow-hidden bg-transparent shadow-none">
        <div className="relative rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(160deg, hsl(222 30% 11%) 0%, hsl(222 35% 7%) 100%)",
            boxShadow: "0 40px 100px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
          {/* ambient orbs */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(45 90% 60%), transparent 70%)" }} />
          <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full opacity-15 blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(280 80% 60%), transparent 70%)" }} />

          {/* header */}
          <div className="relative px-7 pt-7 pb-3">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <p className="font-body text-[11px] uppercase tracking-[0.18em] text-amber-400/80 font-semibold">Set up your portal</p>
            </div>
            {/* progress */}
            <div className="flex gap-1.5 mb-1">
              {STEPS.map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: i < idx ? "100%" : i === idx ? "60%" : "0%",
                      background: "linear-gradient(90deg, hsl(45 85% 55%), hsl(35 90% 60%))",
                    }} />
                </div>
              ))}
            </div>
            <p className="font-body text-[10px] text-white/40 mt-2">Step {idx + 1} of {STEPS.length}</p>
          </div>

          {/* body */}
          <div className="relative px-7 pb-7 pt-2" key={step.id}>
            <div className="animate-fade-in">
              <div className={`relative w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br ${step.gradient} p-[2px] shadow-2xl`}
                style={{ animation: "iconPulse 2.4s ease-in-out infinite" }}>
                <div className="w-full h-full rounded-2xl bg-[hsl(222,35%,9%)] flex items-center justify-center">
                  <Icon className="w-9 h-9 text-white" strokeWidth={1.5} />
                </div>
              </div>

              <h2 className="font-display text-2xl font-bold text-center text-white mb-2.5 tracking-tight">{step.title}</h2>
              <p className="font-body text-sm text-white/55 text-center leading-relaxed mb-7 px-2">{step.desc}</p>

              {step.id === "photo" ? (
                <label className="block">
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
                  <div className="w-full h-12 rounded-xl font-body font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer text-background transition-transform hover:scale-[1.02]"
                    style={{ background: "linear-gradient(135deg, hsl(45 80% 50%), hsl(35 88% 58%))" }}>
                    <ImagePlus className="w-4 h-4" /> Choose Photo
                  </div>
                </label>
              ) : (
                <Button onClick={handleAction} disabled={busy}
                  className="w-full h-12 rounded-xl font-body font-semibold text-sm gap-2 text-background hover:scale-[1.02] transition-transform"
                  style={{ background: "linear-gradient(135deg, hsl(45 80% 50%), hsl(35 88% 58%))" }}>
                  {busy ? (
                    <><div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> Requesting...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Allow & Continue</>
                  )}
                </Button>
              )}

              <button onClick={skip} disabled={busy}
                className="w-full mt-3 py-2.5 font-body text-xs text-white/40 hover:text-white/70 transition-colors flex items-center justify-center gap-1">
                {step.optional ? "Skip for now" : "Not now"} <ChevronRight className="w-3 h-3" />
              </button>

              {/* status chips */}
              <div className="flex items-center justify-center gap-1.5 mt-5">
                {STEPS.map((s, i) => {
                  const st = statuses[s.id];
                  return (
                    <div key={s.id}
                      className={`flex items-center justify-center rounded-full transition-all duration-300 ${
                        i === idx ? "w-6 h-1.5" : "w-1.5 h-1.5"
                      }`}
                      style={{
                        background: st === "granted" ? "hsl(142 70% 50%)" : st === "denied" ? "hsl(0 70% 55%)" : st === "skipped" ? "hsl(220 10% 40%)" : i === idx ? "hsl(45 85% 55%)" : "hsl(220 15% 25%)",
                      }} />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes iconPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 10px 40px -10px rgba(255,180,50,0.3); }
            50% { transform: scale(1.04); box-shadow: 0 20px 60px -10px rgba(255,180,50,0.5); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

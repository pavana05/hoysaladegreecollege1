import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Pause, RotateCcw, Timer, Coffee, Flame } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "focus" | "break";
const PRESETS: { label: string; focus: number; brk: number }[] = [
  { label: "25 / 5", focus: 25, brk: 5 },
  { label: "50 / 10", focus: 50, brk: 10 },
  { label: "15 / 3", focus: 15, brk: 3 },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function FocusTimer({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [presetIdx, setPresetIdx] = useState(0);
  const [mode, setMode] = useState<Mode>("focus");
  const [secs, setSecs] = useState(PRESETS[0].focus * 60);
  const [running, setRunning] = useState(false);
  const [sessionsDone, setSessionsDone] = useState(0);
  const tick = useRef<number | null>(null);

  const total = (mode === "focus" ? PRESETS[presetIdx].focus : PRESETS[presetIdx].brk) * 60;
  const pct = ((total - secs) / total) * 100;

  useEffect(() => {
    setSecs(total);
    setRunning(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetIdx, mode]);

  useEffect(() => {
    if (!running) return;
    tick.current = window.setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          window.clearInterval(tick.current!);
          handleComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (tick.current) window.clearInterval(tick.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const handleComplete = async () => {
    setRunning(false);
    if (mode === "focus") {
      setSessionsDone((n) => n + 1);
      toast.success("Focus session complete! Time for a short break ☕", { duration: 4000 });
      setMode("break");
      // Log streak on first focus session of the day
      if (user?.id && sessionsDone === 0) {
        try {
          const today = new Date().toISOString().split("T")[0];
          const { data: existing } = await supabase
            .from("study_streaks").select("id, streak, last_date").eq("user_id", user.id).maybeSingle();
          if (existing) {
            if (existing.last_date !== today) {
              await supabase.from("study_streaks").update({
                streak: (existing.streak || 0) + 1, last_date: today, updated_at: new Date().toISOString()
              }).eq("user_id", user.id);
            }
          } else {
            await supabase.from("study_streaks").insert({ user_id: user.id, streak: 1, last_date: today });
          }
        } catch { /* silent */ }
      }
      // gentle haptic
      try { navigator.vibrate?.([60, 40, 60]); } catch {}
    } else {
      toast("Break finished — ready for another sprint?", { icon: "🔥" });
      setMode("focus");
    }
  };

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  const reset = () => { setRunning(false); setSecs(total); };

  // SVG ring
  const size = 240, stroke = 10;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card/95 backdrop-blur-2xl border-border/60 rounded-3xl">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/5 pointer-events-none" />
          <DialogHeader className="px-6 pt-6 relative">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mode === "focus" ? "bg-primary/10" : "bg-emerald-500/10"}`}>
                {mode === "focus" ? <Timer className="w-4 h-4 text-primary" /> : <Coffee className="w-4 h-4 text-emerald-500" />}
              </div>
              <div>
                <DialogTitle className="font-body text-base font-bold tracking-tight">Focus Timer</DialogTitle>
                <p className="font-body text-[11px] text-muted-foreground">{mode === "focus" ? "Deep work sprint" : "Take a breather"}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="relative px-6 pb-6 pt-4 flex flex-col items-center">
            {/* Ring */}
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90">
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
                <circle
                  cx={size/2} cy={size/2} r={r} fill="none"
                  stroke={mode === "focus" ? "hsl(var(--primary))" : "hsl(145, 65%, 42%)"}
                  strokeWidth={stroke} strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - pct / 100)}
                  className="transition-[stroke-dashoffset] duration-700 ease-out"
                  style={{ filter: running ? "drop-shadow(0 0 8px hsl(var(--primary)/0.45))" : undefined }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-body text-[56px] font-bold tabular-nums tracking-tight text-foreground leading-none">{mm}:{ss}</span>
                <span className="font-body text-[11px] uppercase tracking-[0.18em] text-muted-foreground mt-2">
                  {mode === "focus" ? "Focusing" : "Break"} · #{sessionsDone + (mode === "focus" ? 1 : 0)}
                </span>
              </div>
            </div>

            {/* Preset chips */}
            <div className="mt-5 flex gap-2 bg-muted/40 p-1 rounded-2xl">
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => setPresetIdx(i)}
                  className={`px-3.5 py-1.5 rounded-xl font-body text-[12px] font-semibold transition-all ${
                    presetIdx === i ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >{p.label}</button>
              ))}
            </div>

            {/* Controls */}
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={reset}
                className="w-12 h-12 rounded-2xl border border-border/60 bg-card hover:bg-muted/60 flex items-center justify-center transition-all"
                aria-label="Reset"
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => setRunning((r) => !r)}
                className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-body text-sm font-bold flex items-center gap-2 hover:scale-[1.03] active:scale-[0.98] transition-all shadow-lg shadow-primary/30"
              >
                {running ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}
              </button>
              <button
                onClick={() => setMode((m) => m === "focus" ? "break" : "focus")}
                className="w-12 h-12 rounded-2xl border border-border/60 bg-card hover:bg-muted/60 flex items-center justify-center transition-all"
                aria-label="Switch mode"
              >
                {mode === "focus" ? <Coffee className="w-4 h-4 text-emerald-500" /> : <Timer className="w-4 h-4 text-primary" />}
              </button>
            </div>

            {sessionsDone > 0 && (
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500">
                <Flame className="w-3 h-3" />
                <span className="font-body text-[11px] font-semibold">{sessionsDone} session{sessionsDone > 1 ? "s" : ""} today</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Play, Pause, RotateCcw, Timer, Coffee, Flame, Volume2, VolumeX,
  Target, SkipForward, History, Sparkles, Bell, BellOff, Repeat,
} from "lucide-react";
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

interface SessionLog {
  task: string;
  minutes: number;
  endedAt: number;
}

interface DayState {
  date: string;            // YYYY-MM-DD
  sessionsDone: number;
  focusMinutes: number;
  log: SessionLog[];
}

const LS_DAY = "hdc_focus_day_v2";
const LS_PREFS = "hdc_focus_prefs_v2";
const LS_RUN = "hdc_focus_runstate_v2";

const todayStr = () => new Date().toISOString().split("T")[0];

const loadDay = (): DayState => {
  try {
    const raw = localStorage.getItem(LS_DAY);
    if (raw) {
      const parsed = JSON.parse(raw) as DayState;
      if (parsed.date === todayStr()) return parsed;
    }
  } catch {}
  return { date: todayStr(), sessionsDone: 0, focusMinutes: 0, log: [] };
};

interface Prefs {
  presetIdx: number;
  dailyGoal: number;
  sound: boolean;
  notify: boolean;
  autoCycle: boolean;
  task: string;
}

const loadPrefs = (): Prefs => {
  try {
    const raw = localStorage.getItem(LS_PREFS);
    if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {}
  return defaultPrefs;
};

const defaultPrefs: Prefs = {
  presetIdx: 0, dailyGoal: 4, sound: true, notify: false, autoCycle: false, task: "",
};

export default function FocusTimer({ open, onOpenChange }: Props) {
  const { user } = useAuth();

  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [day, setDay] = useState<DayState>(loadDay);

  const [mode, setMode] = useState<Mode>("focus");
  const [secs, setSecs] = useState(PRESETS[prefs.presetIdx].focus * 60);
  const [running, setRunning] = useState(false);

  const tick = useRef<number | null>(null);
  const endAtRef = useRef<number | null>(null);   // wall-clock target — survives tab throttling
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streakLoggedRef = useRef(false);

  const preset = PRESETS[prefs.presetIdx];
  const total = (mode === "focus" ? preset.focus : preset.brk) * 60;
  const pct = ((total - secs) / total) * 100;

  // ---------- persistence ----------
  useEffect(() => { localStorage.setItem(LS_PREFS, JSON.stringify(prefs)); }, [prefs]);
  useEffect(() => { localStorage.setItem(LS_DAY, JSON.stringify(day)); }, [day]);

  // Reset day at midnight rollover
  useEffect(() => {
    const id = window.setInterval(() => {
      setDay((d) => (d.date === todayStr() ? d : { date: todayStr(), sessionsDone: 0, focusMinutes: 0, log: [] }));
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Reset countdown when preset/mode changes
  useEffect(() => {
    setSecs(total);
    setRunning(false);
    endAtRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.presetIdx, mode]);

  // Restore an in-flight session if the user closes & reopens the dialog
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_RUN);
      if (!raw) return;
      const s = JSON.parse(raw) as { mode: Mode; endAt: number; presetIdx: number };
      const remaining = Math.round((s.endAt - Date.now()) / 1000);
      if (remaining > 0) {
        setMode(s.mode);
        setPrefs((p) => ({ ...p, presetIdx: s.presetIdx }));
        setSecs(remaining);
        endAtRef.current = s.endAt;
        setRunning(true);
      } else {
        localStorage.removeItem(LS_RUN);
      }
    } catch {}
  }, []);

  // ---------- tick (wall-clock based — accurate even when tab is backgrounded) ----------
  useEffect(() => {
    if (!running) return;
    if (endAtRef.current == null) endAtRef.current = Date.now() + secs * 1000;
    localStorage.setItem(LS_RUN, JSON.stringify({
      mode, endAt: endAtRef.current, presetIdx: prefs.presetIdx,
    }));

    tick.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.round((endAtRef.current! - Date.now()) / 1000));
      setSecs(remaining);
      if (remaining <= 0) {
        window.clearInterval(tick.current!);
        handleComplete();
      }
    }, 250);
    return () => { if (tick.current) window.clearInterval(tick.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // ---------- helpers ----------
  const playChime = useCallback(() => {
    if (!prefs.sound) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current!;
      const now = ctx.currentTime;
      const notes = mode === "focus" ? [523.25, 659.25, 783.99] : [659.25, 523.25];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.45);
        o.connect(g).connect(ctx.destination);
        o.start(now + i * 0.18);
        o.stop(now + i * 0.18 + 0.5);
      });
    } catch {}
  }, [prefs.sound, mode]);

  const sendNotification = useCallback((title: string, body: string) => {
    if (!prefs.notify) return;
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: "/favicon.ico", silent: false });
      }
    } catch {}
  }, [prefs.notify]);

  const handleComplete = useCallback(async () => {
    setRunning(false);
    endAtRef.current = null;
    localStorage.removeItem(LS_RUN);
    playChime();
    try { navigator.vibrate?.(mode === "focus" ? [70, 50, 70, 50, 120] : [60]); } catch {}

    if (mode === "focus") {
      const minutes = preset.focus;
      setDay((d) => ({
        ...d,
        sessionsDone: d.sessionsDone + 1,
        focusMinutes: d.focusMinutes + minutes,
        log: [{ task: prefs.task || "Focus", minutes, endedAt: Date.now() }, ...d.log].slice(0, 8),
      }));
      toast.success(`Focus complete — ${minutes} min logged ✨`, { duration: 3500 });
      sendNotification("Focus complete", `${minutes} min on ${prefs.task || "Focus"}. Time for a break ☕`);
      setMode("break");

      // Log streak once per day
      if (user?.id && !streakLoggedRef.current) {
        streakLoggedRef.current = true;
        try {
          const today = todayStr();
          const { data: existing } = await supabase
            .from("study_streaks").select("id, streak, last_date").eq("user_id", user.id).maybeSingle();
          if (existing) {
            if (existing.last_date !== today) {
              await supabase.from("study_streaks").update({
                streak: (existing.streak || 0) + 1, last_date: today, updated_at: new Date().toISOString(),
              }).eq("user_id", user.id);
            }
          } else {
            await supabase.from("study_streaks").insert({ user_id: user.id, streak: 1, last_date: today });
          }
        } catch { /* silent */ }
      }
    } else {
      toast("Break finished — ready for another sprint?", { icon: "🔥" });
      sendNotification("Break over", "Back to deep work?");
      setMode("focus");
    }

    if (prefs.autoCycle) {
      // small delay so mode flip lands first
      setTimeout(() => { endAtRef.current = null; setRunning(true); }, 350);
    }
  }, [mode, preset.focus, prefs.task, prefs.autoCycle, playChime, sendNotification, user?.id]);

  const startPause = useCallback(() => {
    setRunning((r) => {
      if (r) {
        // pause: capture remaining
        endAtRef.current = null;
        localStorage.removeItem(LS_RUN);
        return false;
      }
      endAtRef.current = Date.now() + secs * 1000;
      // ensure audio ctx unlocks on user gesture
      try { audioCtxRef.current?.resume?.(); } catch {}
      return true;
    });
  }, [secs]);

  const reset = () => {
    setRunning(false);
    endAtRef.current = null;
    localStorage.removeItem(LS_RUN);
    setSecs(total);
  };

  const skip = () => {
    setRunning(false);
    setSecs(0);
    handleComplete();
  };

  const toggleNotify = async () => {
    if (prefs.notify) { setPrefs((p) => ({ ...p, notify: false })); return; }
    try {
      if (!("Notification" in window)) {
        toast.error("This browser doesn't support notifications");
        return;
      }
      const perm = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (perm === "granted") {
        setPrefs((p) => ({ ...p, notify: true }));
        toast.success("Notifications enabled");
      } else {
        toast.error("Permission denied");
      }
    } catch { /* ignore */ }
  };

  // ---------- formatting ----------
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  // Sync tab title while running
  useEffect(() => {
    if (!open || !running) return;
    const original = document.title;
    document.title = `${mm}:${ss} · ${mode === "focus" ? "Focus" : "Break"}`;
    return () => { document.title = original; };
  }, [mm, ss, mode, running, open]);

  // Keyboard shortcuts (only when dialog open)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); startPause(); }
      else if (e.key.toLowerCase() === "r") { reset(); }
      else if (e.key.toLowerCase() === "s") { skip(); }
      else if (e.key.toLowerCase() === "m") { setMode((m) => m === "focus" ? "break" : "focus"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startPause]);

  // ---------- ring ----------
  const size = 240, stroke = 10;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;

  const goalPct = useMemo(
    () => Math.min(100, Math.round((day.sessionsDone / Math.max(1, prefs.dailyGoal)) * 100)),
    [day.sessionsDone, prefs.dailyGoal]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card/95 backdrop-blur-2xl border-border/60 rounded-3xl">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/5 pointer-events-none" />

          <DialogHeader className="px-6 pt-6 relative">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mode === "focus" ? "bg-primary/10" : "bg-emerald-500/10"}`}>
                  {mode === "focus" ? <Timer className="w-4 h-4 text-primary" /> : <Coffee className="w-4 h-4 text-emerald-500" />}
                </div>
                <div>
                  <DialogTitle className="font-body text-base font-bold tracking-tight">Focus Timer</DialogTitle>
                  <p className="font-body text-[11px] text-muted-foreground">
                    {mode === "focus" ? "Deep work sprint" : "Take a breather"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPrefs((p) => ({ ...p, sound: !p.sound }))}
                  className="w-8 h-8 rounded-lg hover:bg-muted/60 flex items-center justify-center transition"
                  aria-label="Toggle sound"
                  title={prefs.sound ? "Sound on" : "Sound off"}
                >
                  {prefs.sound ? <Volume2 className="w-3.5 h-3.5 text-foreground/80" /> : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <button
                  onClick={toggleNotify}
                  className="w-8 h-8 rounded-lg hover:bg-muted/60 flex items-center justify-center transition"
                  aria-label="Toggle notifications"
                  title={prefs.notify ? "Notifications on" : "Notifications off"}
                >
                  {prefs.notify ? <Bell className="w-3.5 h-3.5 text-foreground/80" /> : <BellOff className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, autoCycle: !p.autoCycle }))}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${prefs.autoCycle ? "bg-primary/10 text-primary" : "hover:bg-muted/60 text-muted-foreground"}`}
                  aria-label="Toggle auto-cycle"
                  title="Auto-start next phase"
                >
                  <Repeat className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </DialogHeader>

          <div className="relative px-6 pb-6 pt-4 flex flex-col items-center">
            {/* Task input */}
            <div className="w-full mb-4">
              <label className="font-body text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3 h-3" /> What are you focusing on?
              </label>
              <input
                value={prefs.task}
                onChange={(e) => setPrefs((p) => ({ ...p, task: e.target.value }))}
                placeholder="e.g. DBMS unit 3 revision"
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border/50 font-body text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                maxLength={60}
              />
            </div>

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
                  {mode === "focus" ? "Focusing" : "Break"} · #{day.sessionsDone + (mode === "focus" ? 1 : 0)}
                </span>
              </div>
            </div>

            {/* Preset chips */}
            <div className="mt-5 flex gap-2 bg-muted/40 p-1 rounded-2xl">
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => setPrefs((pf) => ({ ...pf, presetIdx: i }))}
                  className={`px-3.5 py-1.5 rounded-xl font-body text-[12px] font-semibold transition-all ${
                    prefs.presetIdx === i ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >{p.label}</button>
              ))}
            </div>

            {/* Controls */}
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={reset}
                className="w-12 h-12 rounded-2xl border border-border/60 bg-card hover:bg-muted/60 flex items-center justify-center transition-all"
                aria-label="Reset (R)"
                title="Reset (R)"
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={startPause}
                className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-body text-sm font-bold flex items-center gap-2 hover:scale-[1.03] active:scale-[0.98] transition-all shadow-lg shadow-primary/30"
                title="Start / Pause (Space)"
              >
                {running ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}
              </button>
              <button
                onClick={skip}
                className="w-12 h-12 rounded-2xl border border-border/60 bg-card hover:bg-muted/60 flex items-center justify-center transition-all"
                aria-label="Skip (S)"
                title="Skip to next phase (S)"
              >
                <SkipForward className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <p className="font-body text-[10px] text-muted-foreground/60 mt-3 tracking-wide">
              Space play/pause · R reset · S skip · M switch mode
            </p>

            {/* Daily goal */}
            <div className="w-full mt-5 p-3.5 rounded-2xl border border-border/50 bg-background/40">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span className="font-body text-[11.5px] font-semibold text-foreground">Daily goal</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-body text-[11px] tabular-nums text-muted-foreground">
                    {day.sessionsDone} / {prefs.dailyGoal} sessions · {day.focusMinutes} min
                  </span>
                  <div className="flex items-center rounded-lg border border-border/50 overflow-hidden">
                    <button
                      onClick={() => setPrefs((p) => ({ ...p, dailyGoal: Math.max(1, p.dailyGoal - 1) }))}
                      className="w-6 h-6 text-xs hover:bg-muted/60 transition"
                    >−</button>
                    <button
                      onClick={() => setPrefs((p) => ({ ...p, dailyGoal: Math.min(20, p.dailyGoal + 1) }))}
                      className="w-6 h-6 text-xs hover:bg-muted/60 transition"
                    >+</button>
                  </div>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-[width] duration-700"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              {goalPct >= 100 && (
                <div className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-500">
                  <Flame className="w-3 h-3" /> Goal smashed today
                </div>
              )}
            </div>

            {/* Session log */}
            {day.log.length > 0 && (
              <div className="w-full mt-3 p-3.5 rounded-2xl border border-border/50 bg-background/40">
                <div className="flex items-center gap-1.5 mb-2">
                  <History className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-body text-[11.5px] font-semibold text-foreground">Today's sessions</span>
                </div>
                <ul className="space-y-1">
                  {day.log.slice(0, 5).map((s, i) => (
                    <li key={i} className="flex items-center justify-between text-[11.5px]">
                      <span className="truncate text-foreground/85 pr-2">{s.task}</span>
                      <span className="tabular-nums text-muted-foreground shrink-0">
                        {s.minutes}m · {new Date(s.endedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

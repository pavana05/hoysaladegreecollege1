import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Clock, CheckCircle, XCircle, BookOpen, Calendar, TrendingUp, Target, Flame, Sparkles,
  Search, Filter, X, ChevronLeft, ChevronRight, CalendarDays, ListFilter,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function useAnimatedNumber(target: number, duration = 1200) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
}

type StatusFilter = "all" | "present" | "absent";
type RangeFilter = "all" | "7d" | "30d" | "90d" | "month" | "custom";

export default function StudentAttendance() {
  const { user } = useAuth();

  const { data: student } = useQuery({
    queryKey: ["student-record", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, year_level, semester, courses(name, code)")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const today = new Date().toISOString().split("T")[0];

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ["student-attendance", student?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", student!.id)
        .order("date", { ascending: false });
      return data || [];
    },
    enabled: !!student?.id,
  });

  // ----- Filters -----
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const subjects = useMemo(
    () => Array.from(new Set(attendance.map((a) => a.subject))).sort(),
    [attendance]
  );

  const filtered = useMemo(() => {
    const now = new Date();
    return attendance.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (subjectFilter !== "all" && a.subject !== subjectFilter) return false;
      if (search && !a.subject.toLowerCase().includes(search.toLowerCase())) return false;
      const d = new Date(a.date);
      if (rangeFilter === "7d" || rangeFilter === "30d" || rangeFilter === "90d") {
        const days = rangeFilter === "7d" ? 7 : rangeFilter === "30d" ? 30 : 90;
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - days);
        if (d < cutoff) return false;
      } else if (rangeFilter === "month") {
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
      } else if (rangeFilter === "custom") {
        if (customFrom && a.date < customFrom) return false;
        if (customTo && a.date > customTo) return false;
      }
      return true;
    });
  }, [attendance, statusFilter, subjectFilter, search, rangeFilter, customFrom, customTo]);

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (subjectFilter !== "all" ? 1 : 0) +
    (rangeFilter !== "all" ? 1 : 0) +
    (search ? 1 : 0);

  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setSubjectFilter("all");
    setRangeFilter("all"); setCustomFrom(""); setCustomTo("");
  };

  // ----- Stats (computed from ALL attendance, not filtered) -----
  const todayRecords = attendance.filter((a) => a.date === today);
  const todayStatus: "present" | "absent" | "none" =
    todayRecords.length === 0 ? "none" : todayRecords.some((r) => r.status === "absent") ? "absent" : "present";

  const total = attendance.length;
  const present = attendance.filter((a) => a.status === "present").length;
  const absent = total - present;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  const animatedPct = useAnimatedNumber(percentage);
  const animatedPresent = useAnimatedNumber(present);
  const animatedAbsent = useAnimatedNumber(absent);
  const animatedTotal = useAnimatedNumber(total);

  const bySubject: Record<string, { total: number; present: number }> = {};
  attendance.forEach((a) => {
    if (!bySubject[a.subject]) bySubject[a.subject] = { total: 0, present: 0 };
    bySubject[a.subject].total++;
    if (a.status === "present") bySubject[a.subject].present++;
  });

  const dateMap = new Map<string, "present" | "absent">();
  attendance.forEach((a) => {
    const cur = dateMap.get(a.date);
    if (cur === "absent") return;
    dateMap.set(a.date, a.status === "absent" ? "absent" : "present");
  });
  const sortedDates = [...dateMap.keys()].sort((a, b) => (a < b ? 1 : -1));
  let streak = 0;
  for (const d of sortedDates) {
    if (dateMap.get(d) === "present") streak++;
    else break;
  }

  const yearLabel =
    student?.year_level === 1 ? "1st Year" :
    student?.year_level === 2 ? "2nd Year" :
    student?.year_level === 3 ? "3rd Year" : "—";

  const needed = percentage < 75 ? Math.max(0, Math.ceil((0.75 * total - present) / 0.25)) : 0;
  const ringColor = percentage >= 75 ? "hsl(145, 65%, 45%)" : percentage >= 60 ? "hsl(42, 80%, 55%)" : "hsl(0, 75%, 60%)";
  const ringText = percentage >= 75 ? "text-emerald-400" : percentage >= 60 ? "text-amber-400" : "text-red-400";
  const verdict = percentage >= 90 ? "Outstanding" : percentage >= 75 ? "On track" : percentage >= 60 ? "Needs attention" : "Critical";

  const C = 2 * Math.PI * 44;
  const dash = (animatedPct / 100) * C;

  // ----- Mini calendar (current month) -----
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const monthLabel = calMonth.toLocaleString("en-US", { month: "long", year: "numeric" });
  const firstDay = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
  const lastDay = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const calDayStatus = (day: number): "present" | "absent" | "none" => {
    const dateStr = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const recs = attendance.filter((a) => a.date === dateStr);
    if (recs.length === 0) return "none";
    return recs.some((r) => r.status === "absent") ? "absent" : "present";
  };
  const shiftMonth = (delta: number) => {
    const d = new Date(calMonth); d.setMonth(d.getMonth() + delta); setCalMonth(d);
  };

  const ranges: { id: RangeFilter; label: string }[] = [
    { id: "all", label: "All time" },
    { id: "7d", label: "7 days" },
    { id: "30d", label: "30 days" },
    { id: "90d", label: "90 days" },
    { id: "month", label: "This month" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 pb-6" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>
      {/* HERO */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border/50 bg-gradient-to-br from-card via-card to-card/70 p-5 sm:p-7">
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 w-[22rem] h-[22rem] rounded-full bg-indigo-500/[0.10] blur-[110px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 w-[20rem] h-[20rem] rounded-full bg-violet-500/[0.08] blur-[100px]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "22px 22px" }} />

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-500/[0.06] px-2.5 py-1 mb-4 backdrop-blur-sm">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="text-[10.5px] text-indigo-300 font-semibold uppercase tracking-[0.18em]">Attendance</span>
          </div>

          <div className="flex items-center gap-5 sm:gap-7">
            <div className="relative shrink-0 w-[124px] h-[124px] sm:w-[140px] sm:h-[140px]">
              <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: `radial-gradient(circle, ${ringColor}, transparent 65%)` }} />
              <svg viewBox="0 0 100 100" className="relative w-full h-full -rotate-90">
                <defs>
                  <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={ringColor} stopOpacity="0.95" />
                    <stop offset="100%" stopColor={ringColor} stopOpacity="0.55" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="7" opacity="0.35" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="url(#ringGrad)" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${dash} ${C}`} style={{ transition: "stroke-dasharray 800ms cubic-bezier(0.16,1,0.3,1)" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-bold text-3xl sm:text-[2rem] tracking-tight tabular-nums ${ringText}`}>{animatedPct}%</span>
                <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold mt-0.5">Overall</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">My Attendance</h2>
              {student && (
                <p className="text-[12px] text-muted-foreground mt-1 truncate">
                  {(student as any).courses?.name || "—"} <span className="text-muted-foreground/50">·</span> {yearLabel}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider ring-1
                  ${percentage >= 75 ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                    : percentage >= 60 ? "bg-amber-500/10 text-amber-400 ring-amber-500/20"
                    : "bg-red-500/10 text-red-400 ring-red-500/20"}`}>
                  <Target className="w-2.5 h-2.5" /> {verdict}
                </span>
                {streak > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20">
                    <Flame className="w-2.5 h-2.5" /> {streak} day streak
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="relative mt-5 pt-4 border-t border-border/30">
            <div className="flex items-center justify-between text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground/70 font-semibold mb-2">
              <span>Path to 75%</span>
              <span className={percentage >= 75 ? "text-emerald-400" : "text-amber-400"}>
                {percentage >= 75 ? "Target met ✓" : `${needed} more class${needed === 1 ? "" : "es"} needed`}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-out"
                style={{ width: `${Math.min(animatedPct, 100)}%`, background: `linear-gradient(90deg, ${ringColor}, ${ringColor}aa)`, boxShadow: `0 0 12px ${ringColor}80` }}
              />
              <div className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-foreground/40" style={{ left: "75%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Today */}
      <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 flex items-center gap-4 transition-all duration-500
        ${todayStatus === "present" ? "border-emerald-500/25 bg-gradient-to-r from-emerald-500/[0.06] via-card to-card"
        : todayStatus === "absent" ? "border-red-500/25 bg-gradient-to-r from-red-500/[0.06] via-card to-card"
        : "border-border/50 bg-card"}`}>
        <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ring-1
          ${todayStatus === "present" ? "bg-emerald-500/10 ring-emerald-500/25"
          : todayStatus === "absent" ? "bg-red-500/10 ring-red-500/25"
          : "bg-muted/40 ring-border/40"}`}>
          {todayStatus === "present" ? <CheckCircle className="w-6 h-6 text-emerald-400" />
            : todayStatus === "absent" ? <XCircle className="w-6 h-6 text-red-400" />
            : <Clock className="w-6 h-6 text-muted-foreground" />}
        </div>
        <div className="min-w-0">
          <p className={`text-[15px] font-bold ${todayStatus === "present" ? "text-emerald-400" : todayStatus === "absent" ? "text-red-400" : "text-foreground"}`}>
            {todayStatus === "present" ? "Present today" : todayStatus === "absent" ? "Marked absent today" : "No attendance marked yet"}
          </p>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">
            {todayStatus === "none" ? "Your teacher hasn't marked attendance yet today" : `${todayRecords.length} subject${todayRecords.length === 1 ? "" : "s"} recorded today`}
          </p>
        </div>
      </div>

      {/* Bento */}
      <div className="grid grid-cols-6 gap-2.5">
        <div className="col-span-3 group relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-4 hover:-translate-y-0.5 hover:border-emerald-400/30 transition-all duration-500">
          <div aria-hidden className="pointer-events-none absolute -top-10 -right-8 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="relative flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-[0.625rem] bg-gradient-to-br from-emerald-500/20 to-teal-500/5 ring-1 ring-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-[15px] h-[15px] text-emerald-400" strokeWidth={2.2} />
            </div>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <p className="relative text-3xl font-bold text-foreground tabular-nums leading-none tracking-tight">{animatedPresent}</p>
          <p className="relative text-[10px] text-muted-foreground/70 uppercase tracking-[0.18em] font-semibold mt-2">Present</p>
        </div>
        <div className="col-span-3 group relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-4 hover:-translate-y-0.5 hover:border-red-400/30 transition-all duration-500">
          <div aria-hidden className="pointer-events-none absolute -top-10 -right-8 w-32 h-32 rounded-full bg-red-500/10 blur-2xl" />
          <div className="relative flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-[0.625rem] bg-gradient-to-br from-red-500/20 to-rose-500/5 ring-1 ring-red-500/20 flex items-center justify-center">
              <XCircle className="w-[15px] h-[15px] text-red-400" strokeWidth={2.2} />
            </div>
          </div>
          <p className="relative text-3xl font-bold text-foreground tabular-nums leading-none tracking-tight">{animatedAbsent}</p>
          <p className="relative text-[10px] text-muted-foreground/70 uppercase tracking-[0.18em] font-semibold mt-2">Absent</p>
        </div>
        <div className="col-span-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-4 hover:border-indigo-400/30 transition-all duration-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[0.625rem] bg-gradient-to-br from-indigo-500/20 to-violet-500/5 ring-1 ring-indigo-500/20 flex items-center justify-center">
              <Calendar className="w-[15px] h-[15px] text-indigo-300" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/70 uppercase tracking-[0.18em] font-semibold">Total Classes Logged</p>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">Across all subjects this term</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">{animatedTotal}</p>
        </div>
      </div>

      {/* Calendar */}
      {attendance.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-5 sm:p-6">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-foreground flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20 flex items-center justify-center">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-300" />
              </div>
              {monthLabel}
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={() => shiftMonth(-1)} className="w-8 h-8 rounded-lg bg-muted/40 hover:bg-muted/60 ring-1 ring-border/40 flex items-center justify-center transition">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => shiftMonth(1)} className="w-8 h-8 rounded-lg bg-muted/40 hover:bg-muted/60 ring-1 ring-border/40 flex items-center justify-center transition">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <div key={i} className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/60 pb-1">{d}</div>
            ))}
            {Array.from({ length: startWeekday }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const st = calDayStatus(day);
              const isToday =
                day === new Date().getDate() &&
                calMonth.getMonth() === new Date().getMonth() &&
                calMonth.getFullYear() === new Date().getFullYear();
              return (
                <div key={day}
                  className={`relative aspect-square flex items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums ring-1 transition
                    ${st === "present" ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25"
                    : st === "absent" ? "bg-red-500/15 text-red-300 ring-red-500/25"
                    : "bg-muted/20 text-muted-foreground/70 ring-border/30"}
                    ${isToday ? "outline outline-2 outline-indigo-400/60 outline-offset-1" : ""}`}>
                  {day}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-border/30">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-2.5 h-2.5 rounded bg-emerald-500/40 ring-1 ring-emerald-500/30" /> Present</div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-2.5 h-2.5 rounded bg-red-500/40 ring-1 ring-red-500/30" /> Absent</div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-2.5 h-2.5 rounded bg-muted/40 ring-1 ring-border/40" /> No record</div>
          </div>
        </div>
      )}

      {/* Subject-wise */}
      {Object.keys(bySubject).length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-5 sm:p-6">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-bold text-foreground flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
              </div>
              Subject-wise
            </h3>
            <span className="text-[10px] text-muted-foreground/70 uppercase tracking-[0.15em] font-semibold">{Object.keys(bySubject).length} subjects</span>
          </div>
          <div className="space-y-3.5">
            {Object.entries(bySubject)
              .sort((a, b) => (b[1].present / b[1].total) - (a[1].present / a[1].total))
              .map(([subject, d]) => {
                const pct = Math.round((d.present / d.total) * 100);
                const ok = pct >= 75;
                const warn = pct >= 60 && pct < 75;
                return (
                  <button key={subject} onClick={() => setSubjectFilter(subject === subjectFilter ? "all" : subject)} className="group w-full text-left">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-[13px] font-semibold truncate pr-2 ${subjectFilter === subject ? "text-indigo-300" : "text-foreground"}`}>{subject}</span>
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md tabular-nums shrink-0
                        ${ok ? "bg-emerald-500/10 text-emerald-400" : warn ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>
                        {pct}% · {d.present}/{d.total}
                      </span>
                    </div>
                    <div className="relative h-[6px] rounded-full bg-muted/40 overflow-hidden">
                      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-out"
                        style={{ width: `${pct}%`,
                          background: ok ? "linear-gradient(90deg, hsl(145,65%,45%), hsl(160,60%,50%))"
                            : warn ? "linear-gradient(90deg, hsl(42,80%,55%), hsl(30,80%,55%))"
                            : "linear-gradient(90deg, hsl(0,75%,60%), hsl(340,70%,55%))" }} />
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Filters + Records */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-5 sm:p-6">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
        <div className="flex items-center justify-between mb-4 gap-3">
          <h3 className="text-[15px] font-bold text-foreground flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-indigo-300" />
            </div>
            Records
          </h3>
          <button onClick={() => setShowFilters((s) => !s)}
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 ring-1 ring-border/40 text-[11px] font-semibold text-foreground transition">
            <ListFilter className="w-3.5 h-3.5" /> Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-indigo-500 text-white text-[9px] font-bold tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject..."
            className="w-full h-10 pl-9 pr-9 rounded-xl bg-muted/30 ring-1 ring-border/40 focus:ring-indigo-400/40 focus:bg-muted/40 outline-none text-[13px] text-foreground placeholder:text-muted-foreground/50 transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md hover:bg-muted/60 flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="space-y-4 mb-4 p-4 rounded-xl bg-muted/20 ring-1 ring-border/30">
            {/* Status chips */}
            <div>
              <p className="text-[9.5px] uppercase tracking-[0.18em] font-bold text-muted-foreground/70 mb-2">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { id: "all" as const, label: "All", color: "indigo" },
                  { id: "present" as const, label: "Present", color: "emerald" },
                  { id: "absent" as const, label: "Absent", color: "red" },
                ]).map((s) => {
                  const active = statusFilter === s.id;
                  return (
                    <button key={s.id} onClick={() => setStatusFilter(s.id)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ring-1 transition
                        ${active
                          ? s.color === "emerald" ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                          : s.color === "red" ? "bg-red-500/15 text-red-300 ring-red-500/30"
                          : "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30"
                          : "bg-muted/30 text-muted-foreground ring-border/40 hover:bg-muted/50"}`}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Range chips */}
            <div>
              <p className="text-[9.5px] uppercase tracking-[0.18em] font-bold text-muted-foreground/70 mb-2">Date range</p>
              <div className="flex flex-wrap gap-1.5">
                {ranges.map((r) => {
                  const active = rangeFilter === r.id;
                  return (
                    <button key={r.id} onClick={() => setRangeFilter(r.id)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ring-1 transition
                        ${active ? "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30" : "bg-muted/30 text-muted-foreground ring-border/40 hover:bg-muted/50"}`}>
                      {r.label}
                    </button>
                  );
                })}
              </div>
              {rangeFilter === "custom" && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <label className="block text-[9.5px] uppercase tracking-wider font-bold text-muted-foreground/70 mb-1">From</label>
                    <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-muted/40 ring-1 ring-border/40 focus:ring-indigo-400/40 outline-none text-[12px] text-foreground" />
                  </div>
                  <div>
                    <label className="block text-[9.5px] uppercase tracking-wider font-bold text-muted-foreground/70 mb-1">To</label>
                    <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-muted/40 ring-1 ring-border/40 focus:ring-indigo-400/40 outline-none text-[12px] text-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Subject chips */}
            {subjects.length > 0 && (
              <div>
                <p className="text-[9.5px] uppercase tracking-[0.18em] font-bold text-muted-foreground/70 mb-2">Subject</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setSubjectFilter("all")}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ring-1 transition
                      ${subjectFilter === "all" ? "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30" : "bg-muted/30 text-muted-foreground ring-border/40 hover:bg-muted/50"}`}>
                    All
                  </button>
                  {subjects.map((s) => {
                    const active = subjectFilter === s;
                    return (
                      <button key={s} onClick={() => setSubjectFilter(s)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ring-1 transition truncate max-w-[180px]
                          ${active ? "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30" : "bg-muted/30 text-muted-foreground ring-border/40 hover:bg-muted/50"}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 hover:text-indigo-200">
                <X className="w-3 h-3" /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Result count */}
        <div className="flex items-center justify-between mb-3 text-[10.5px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/70">
          <span>{filtered.length} record{filtered.length === 1 ? "" : "s"}</span>
          {filtered.length > 0 && (
            <span className="text-emerald-400/80 normal-case tracking-normal">
              {filtered.filter((a) => a.status === "present").length} present · {filtered.filter((a) => a.status === "absent").length} absent
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3 ring-1 ring-border/40">
              <Filter className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="text-[13px] text-muted-foreground">
              {attendance.length === 0 ? "No attendance records yet." : "No records match your filters."}
            </p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-300 hover:text-indigo-200">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.slice(0, 50).map((a) => {
              const isP = a.status === "present";
              const d = new Date(a.date);
              return (
                <div key={a.id}
                  className={`group flex items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-300 hover:-translate-y-px
                    ${isP ? "border-emerald-500/15 bg-emerald-500/[0.03] hover:border-emerald-500/30 hover:bg-emerald-500/[0.06]"
                    : "border-red-500/15 bg-red-500/[0.03] hover:border-red-500/30 hover:bg-red-500/[0.06]"}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`shrink-0 w-11 h-11 rounded-xl ring-1 flex flex-col items-center justify-center
                      ${isP ? "bg-emerald-500/8 ring-emerald-500/20" : "bg-red-500/8 ring-red-500/20"}`}>
                      <span className={`text-[9px] uppercase tracking-wider font-bold ${isP ? "text-emerald-400/80" : "text-red-400/80"}`}>
                        {d.toLocaleString("en-US", { month: "short" })}
                      </span>
                      <span className={`text-[14px] font-bold leading-none tabular-nums ${isP ? "text-emerald-400" : "text-red-400"}`}>
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{a.subject}</p>
                      <p className="text-[10.5px] text-muted-foreground/80 mt-0.5">
                        {d.toLocaleDateString("en-IN", { weekday: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider
                    ${isP ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {isP ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                    {a.status}
                  </span>
                </div>
              );
            })}
            {filtered.length > 50 && (
              <p className="text-center text-[10.5px] text-muted-foreground/60 pt-2">
                Showing first 50 of {filtered.length}. Narrow the filters to see more.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

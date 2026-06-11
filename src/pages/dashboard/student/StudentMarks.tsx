import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, Calculator, TrendingUp, Award, Download, Search,
  ArrowUpRight, ArrowDownRight, Sparkles, BookOpen, CheckCircle2, XCircle, Trophy
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

const GRADE_MAP = [
  { min: 90, grade: "O", points: 10, label: "Outstanding" },
  { min: 80, grade: "A+", points: 9, label: "Excellent" },
  { min: 70, grade: "A", points: 8, label: "Very Good" },
  { min: 60, grade: "B+", points: 7, label: "Good" },
  { min: 50, grade: "B", points: 6, label: "Above Average" },
  { min: 40, grade: "C", points: 5, label: "Average" },
  { min: 0, grade: "F", points: 0, label: "Fail" },
];

function getGrade(pct: number) {
  return GRADE_MAP.find((g) => pct >= g.min) || GRADE_MAP[GRADE_MAP.length - 1];
}

function gradeTint(pct: number) {
  if (pct >= 75) return "text-emerald-500 bg-emerald-500/10";
  if (pct >= 40) return "text-amber-500 bg-amber-500/10";
  return "text-red-500 bg-red-500/10";
}

function downloadCSV(marks: any[]) {
  const headers = "Semester,Exam Type,Subject,Obtained,Max,Percentage,Grade\n";
  const rows = marks
    .map((m) => {
      const pct = Math.round((m.obtained_marks / m.max_marks) * 100);
      return `${m.semester || 1},${m.exam_type},${m.subject},${m.obtained_marks},${m.max_marks},${pct}%,${getGrade(pct).grade}`;
    })
    .join("\n");
  const blob = new Blob([headers + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "marks_report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** Circular progress ring (iOS Fitness-style) */
function GpaRing({ value, max = 10, size = 160 }: { value: number; max?: number; size?: number }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = c * pct;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="gpaGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          fill="none"
          opacity={0.35}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#gpaGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-4xl font-bold text-foreground tabular-nums leading-none">
          {value.toFixed(2)}
        </p>
        <p className="font-body text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1.5">
          CGPA / {max}
        </p>
      </div>
    </div>
  );
}

export default function StudentMarks() {
  const { user } = useAuth();
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [selectedExamType, setSelectedExamType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: marks = [], isLoading } = useQuery({
    queryKey: ["student-marks", user?.id],
    queryFn: async () => {
      const { data: student } = await supabase.from("students").select("id").eq("user_id", user!.id).single();
      if (!student) return [];
      const { data } = await supabase.from("marks").select("*").eq("student_id", student.id).order("semester", { ascending: true });
      return data || [];
    },
    enabled: !!user,
  });

  const semesters = useMemo(() => Array.from(new Set(marks.map((m) => m.semester || 1))).sort(), [marks]);
  const examTypes = useMemo(() => Array.from(new Set(marks.map((m) => m.exam_type).filter(Boolean))), [marks]);

  const filteredMarks = useMemo(() => {
    return marks.filter((m) => {
      if (selectedSemester !== "all" && (m.semester || 1) !== Number(selectedSemester)) return false;
      if (selectedExamType !== "all" && m.exam_type !== selectedExamType) return false;
      if (search && !m.subject?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [marks, selectedSemester, selectedExamType, search]);

  const grouped = useMemo(() => {
    return filteredMarks.reduce((acc: Record<string, typeof marks>, m) => {
      const key = `Semester ${m.semester || 1} · ${m.exam_type}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(m);
      return acc;
    }, {});
  }, [filteredMarks]);

  const sgpaData = useMemo(() => {
    return semesters.map((sem) => {
      const semMarks = marks.filter((m) => (m.semester || 1) === sem);
      const avg =
        semMarks.length > 0
          ? semMarks.reduce((s, m) => s + (m.obtained_marks / m.max_marks) * 100, 0) / semMarks.length
          : 0;
      return { semester: `Sem ${sem}`, sgpa: getGrade(avg).points, avg: Math.round(avg), subjects: semMarks.length };
    });
  }, [marks, semesters]);

  const cgpa = sgpaData.length > 0 ? sgpaData.reduce((s, d) => s + d.sgpa, 0) / sgpaData.length : 0;
  const overallAvg =
    marks.length > 0
      ? Math.round(marks.reduce((s, m) => s + (m.obtained_marks / m.max_marks) * 100, 0) / marks.length)
      : 0;
  const overallGrade = getGrade(overallAvg);

  const subjectPerformance: Record<string, { total: number; count: number }> = {};
  marks.forEach((m) => {
    if (!subjectPerformance[m.subject]) subjectPerformance[m.subject] = { total: 0, count: 0 };
    subjectPerformance[m.subject].total += (m.obtained_marks / m.max_marks) * 100;
    subjectPerformance[m.subject].count++;
  });
  const subjectAverages = Object.entries(subjectPerformance)
    .map(([subject, { total, count }]) => ({ subject, avg: Math.round(total / count) }))
    .sort((a, b) => b.avg - a.avg);

  const bestSubject = subjectAverages[0];
  const worstSubject = subjectAverages[subjectAverages.length - 1];

  const radarData = subjectAverages
    .map(({ subject, avg }) => ({
      subject: subject.length > 12 ? subject.slice(0, 12) + "…" : subject,
      score: avg,
      fullMark: 100,
    }))
    .slice(0, 8);

  const totalPassed = marks.filter((m) => (m.obtained_marks / m.max_marks) * 100 >= 40).length;
  const totalFailed = marks.length - totalPassed;

  // trend vs previous semester for direction arrow
  const trend = (() => {
    if (sgpaData.length < 2) return 0;
    const last = sgpaData[sgpaData.length - 1].avg;
    const prev = sgpaData[sgpaData.length - 2].avg;
    return last - prev;
  })();

  return (
    <div className="space-y-5 pb-4">
      {/* HERO — CGPA ring + quick KPIs */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-[linear-gradient(165deg,hsl(228_16%_8%)_0%,hsl(228_14%_5%)_55%,hsl(228_16%_4%)_100%)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)]">
        {/* Subtle violet accent only */}
        <div className="pointer-events-none absolute -bottom-28 -left-20 w-80 h-80 rounded-full bg-[hsl(265_55%_45%/0.16)] blur-[100px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />


        <div className="relative px-6 sm:px-8 py-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          <GpaRing value={cgpa} />

          <div className="flex-1 w-full text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[hsl(42_75%_55%/0.12)] border border-[hsl(42_75%_55%/0.3)] backdrop-blur-md shadow-sm">
              <Sparkles className="w-3 h-3 text-[hsl(42_75%_68%)]" />
              <span className="font-body text-[11px] font-semibold text-[hsl(42_75%_72%)] tracking-[0.1em] uppercase">
                {overallGrade.label}
              </span>
            </div>
            <h2 className="font-display text-[26px] leading-tight font-bold text-white mt-3 tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              Your Academic Progress
            </h2>
            <p className="font-body text-sm text-white/55 mt-1.5">
              Across {semesters.length} {semesters.length === 1 ? "semester" : "semesters"} ·{" "}
              {marks.length} entries
            </p>

            <div className="mt-5 w-full rounded-2xl border border-white/[0.08] bg-[hsl(228_18%_3%/0.55)] backdrop-blur-xl overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_24px_-12px_rgba(0,0,0,0.6)]">
              <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
                {[
                  { label: "Overall", value: `${overallAvg}%` },
                  { label: "Grade", value: overallGrade.grade },
                  { label: "Passed", value: `${totalPassed}/${marks.length}` },
                ].map((s) => (
                  <div key={s.label} className="px-2 py-3.5 flex flex-col items-center justify-center gap-1.5 min-w-0">
                    <p className="font-body text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">{s.label}</p>
                    <p className="font-display text-[16px] font-bold text-white leading-none tabular-nums max-w-full truncate">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top action row */}
        <div className="relative flex items-center justify-between gap-3 px-6 sm:px-8 pb-5">
          {trend !== 0 && sgpaData.length >= 2 && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-md ${trend > 0 ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25" : "bg-red-500/15 text-red-300 border border-red-500/25"}`}>
              {trend > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(trend)}% vs last semester
            </div>
          )}
          {marks.length > 0 && (
            <button
              onClick={() => downloadCSV(marks)}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(42_75%_55%/0.12)] border border-[hsl(42_75%_55%/0.3)] text-[hsl(42_75%_72%)] text-xs font-semibold hover:bg-[hsl(42_75%_55%/0.2)] transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
        </div>
      </div>


      {isLoading ? (
        <div className="bg-card border border-border/40 rounded-3xl p-10 text-center">
          <p className="font-body text-sm text-muted-foreground">Loading…</p>
        </div>
      ) : marks.length === 0 ? (
        <div className="bg-card border border-border/40 rounded-3xl p-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="font-body text-sm text-muted-foreground">No marks uploaded yet.</p>
        </div>
      ) : (
        <>
          {/* BEST / NEEDS WORK */}
          {bestSubject && worstSubject && bestSubject.subject !== worstSubject.subject && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-border/40 bg-card p-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                <div className="relative flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-[10px] uppercase tracking-[0.18em] text-emerald-600/80 dark:text-emerald-400/80">Top Subject</p>
                    <p className="font-display text-base font-bold text-foreground truncate mt-0.5">{bestSubject.subject}</p>
                    <p className="font-body text-xs text-muted-foreground mt-0.5">Average <span className="font-semibold text-emerald-500">{bestSubject.avg}%</span></p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-border/40 bg-card p-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
                <div className="relative flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-[10px] uppercase tracking-[0.18em] text-amber-600/80 dark:text-amber-400/80">Focus Area</p>
                    <p className="font-display text-base font-bold text-foreground truncate mt-0.5">{worstSubject.subject}</p>
                    <p className="font-body text-xs text-muted-foreground mt-0.5">Average <span className="font-semibold text-amber-500">{worstSubject.avg}%</span></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FILTERS */}
          <div className="rounded-3xl border border-border/40 bg-card p-4 space-y-3">
            {/* search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subject…"
                className="w-full h-10 pl-10 pr-3 rounded-xl bg-muted/50 border border-border/40 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-all"
              />
            </div>

            {/* semester chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedSemester("all")}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${selectedSemester === "all" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
              >
                All Sems
              </button>
              {semesters.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSemester(String(s))}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${selectedSemester === String(s) ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                >
                  Sem {s}
                </button>
              ))}
            </div>

            {/* exam type chips */}
            {examTypes.length > 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
                <button
                  onClick={() => setSelectedExamType("all")}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-95 ${selectedExamType === "all" ? "bg-foreground text-background" : "bg-muted/40 text-muted-foreground hover:bg-muted"}`}
                >
                  All Exams
                </button>
                {examTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedExamType(t)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-95 ${selectedExamType === t ? "bg-foreground text-background" : "bg-muted/40 text-muted-foreground hover:bg-muted"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CHARTS */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-border/40 bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-4 h-4 text-primary" />
                <h3 className="font-body text-sm font-semibold text-foreground">SGPA Trend</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sgpaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 16, fontSize: 12 }} />
                  <Bar dataKey="sgpa" fill="hsl(var(--primary))" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {radarData.length >= 3 && (
              <div className="rounded-3xl border border-border/40 bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="font-body text-sm font-semibold text-foreground">Subject Performance</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.18} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* SEMESTER CARDS */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sgpaData.map((d) => (
              <div key={d.semester} className="rounded-3xl border border-border/40 bg-card p-5 hover:border-primary/30 transition-all hover:-translate-y-0.5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-body text-sm font-semibold text-foreground">{d.semester}</h4>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${gradeTint(d.avg)}`}>
                    {getGrade(d.avg).grade}
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-display text-3xl font-bold text-foreground tabular-nums leading-none">{d.sgpa}</p>
                    <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider mt-1">SGPA</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-semibold text-muted-foreground tabular-nums">{d.avg}%</p>
                    <p className="font-body text-[10px] text-muted-foreground">{d.subjects} subjects</p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${d.avg >= 75 ? "bg-emerald-500" : d.avg >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${d.avg}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* DETAILED MARKS — iOS grouped list */}
          {Object.keys(grouped).length === 0 ? (
            <div className="rounded-3xl border border-border/40 bg-card p-10 text-center">
              <p className="font-body text-sm text-muted-foreground">No marks match these filters.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([key, items]) => {
              const semAvg = items.length > 0
                ? Math.round(items.reduce((s, m) => s + (m.obtained_marks / m.max_marks) * 100, 0) / items.length)
                : 0;
              return (
                <section key={key} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 px-4">
                    <h3 className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80 truncate">{key}</h3>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${gradeTint(semAvg)}`}>
                      Avg {semAvg}%
                    </span>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
                    {items.map((m, idx) => {
                      const pct = Math.round((m.obtained_marks / m.max_marks) * 100);
                      const grade = getGrade(pct);
                      const passed = pct >= 40;
                      return (
                        <div
                          key={m.id}
                          className={`flex items-center gap-3 px-4 py-3 ${idx !== items.length - 1 ? "border-b border-border/40" : ""}`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${gradeTint(pct)}`}>
                            {passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-body text-[14px] font-medium text-foreground truncate">{m.subject}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-[160px]">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-body text-[11px] text-muted-foreground tabular-nums">
                                {m.obtained_marks}/{m.max_marks}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-display text-base font-bold tabular-nums ${passed ? "text-foreground" : "text-red-500"}`}>{pct}%</p>
                            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 ${gradeTint(pct)}`}>
                              {grade.grade}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}

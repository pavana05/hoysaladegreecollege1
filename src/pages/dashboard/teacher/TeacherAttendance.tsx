import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CheckCircle, XCircle, Users, Search, AlertTriangle, Phone, Calendar,
  MessageSquare, Sparkles, Zap, History, BookOpen, RotateCcw, GraduationCap, Save,
} from "lucide-react";
import { notifyStudents } from "@/hooks/useNotifyStudents";

const SEMESTER_LABELS: Record<number, string> = { 1: "Sem 1", 2: "Sem 2", 3: "Sem 3", 4: "Sem 4", 5: "Sem 5", 6: "Sem 6" };

export default function TeacherAttendance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeSemester, setActiveSemester] = useState<number>(1);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [statuses, setStatuses] = useState<Record<string, "present" | "absent">>({});
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"mark" | "absent-list">("mark");

  const { data: courses = [] } = useQuery<{ id: string; name: string; code: string }[]>({
    queryKey: ["attendance-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true).order("name");
      const result = (data || []) as { id: string; name: string; code: string }[];
      if (result.length > 0 && !activeCourseId) setActiveCourseId(result[0].id);
      return result;
    },
  });

  const resolvedCourseId = activeCourseId ?? (courses[0]?.id || null);

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["attendance-students", resolvedCourseId, activeSemester],
    queryFn: async () => {
      if (!resolvedCourseId) return [];
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, roll_number, user_id, course_id, semester, phone, parent_phone, courses(name, code)")
        .eq("is_active", true)
        .eq("course_id", resolvedCourseId)
        .eq("semester", activeSemester)
        .order("roll_number");
      if (!studentsData || studentsData.length === 0) return [];
      const userIds = studentsData.map((s) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      return studentsData.map((s) => ({
        ...s,
        profile: profiles?.find((p) => p.user_id === s.user_id),
      }));
    },
    enabled: !!resolvedCourseId,
  });

  // Recent subjects taught by this teacher (last 60 days)
  const { data: recentSubjects = [] } = useQuery<string[]>({
    queryKey: ["recent-subjects", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const since = new Date(); since.setDate(since.getDate() - 60);
      const { data } = await supabase
        .from("attendance")
        .select("subject, date")
        .eq("marked_by", user.id)
        .gte("date", since.toISOString().split("T")[0])
        .order("date", { ascending: false })
        .limit(120);
      const seen = new Set<string>();
      (data || []).forEach((r: any) => { if (r.subject) seen.add(r.subject); });
      return Array.from(seen).slice(0, 6);
    },
    enabled: !!user,
  });

  const { data: existingToday = [] } = useQuery({
    queryKey: ["existing-attendance", resolvedCourseId, activeSemester, date, subject],
    queryFn: async () => {
      if (!resolvedCourseId || !subject) return [];
      const studentIds = students.map((s: any) => s.id);
      if (studentIds.length === 0) return [];
      const { data } = await supabase
        .from("attendance")
        .select("student_id, status")
        .in("student_id", studentIds)
        .eq("date", date)
        .eq("subject", subject);
      return data || [];
    },
    enabled: !!resolvedCourseId && !!subject && students.length > 0,
  });

  const alreadyMarkedIds = useMemo(
    () => new Set((existingToday as any[]).map((r: any) => r.student_id)),
    [existingToday]
  );

  // Map of already-marked statuses so we can show inline
  const alreadyMarkedMap = useMemo(() => {
    const m: Record<string, string> = {};
    (existingToday as any[]).forEach((r: any) => { m[r.student_id] = r.status; });
    return m;
  }, [existingToday]);

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      const name = (s.profile?.full_name || s.roll_number || "").toLowerCase();
      return name.includes(search.toLowerCase()) || s.roll_number.toLowerCase().includes(search.toLowerCase());
    });
  }, [students, search]);

  const absentStudents = useMemo(
    () => filteredStudents.filter((s: any) => statuses[s.id] === "absent"),
    [filteredStudents, statuses]
  );

  const presentCount = Object.values(statuses).filter((s) => s === "present").length;
  const absentCount = Object.values(statuses).filter((s) => s === "absent").length;
  const totalCount = filteredStudents.length;
  const markedCount = presentCount + absentCount;
  const unmarkedCount = Math.max(0, totalCount - markedCount);
  const completionPct = totalCount > 0 ? Math.round((markedCount / totalCount) * 100) : 0;
  const presentPct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const setStatus = (id: string, status: "present" | "absent") => {
    setStatuses((prev) => ({ ...prev, [id]: status }));
  };

  const markAll = (status: "present" | "absent") => {
    const all: Record<string, "present" | "absent"> = {};
    filteredStudents.forEach((s: any) => { all[s.id] = status; });
    setStatuses((prev) => ({ ...prev, ...all }));
  };

  const resetAll = () => setStatuses({});

  // Default all present (smart starting point — most attendance is 90%+ present)
  const defaultAllPresent = () => {
    markAll("present");
    toast.success("All students marked Present — tap any student to flip to Absent");
  };

  // Copy from last session (same course/semester/subject)
  const copyFromLast = useMutation({
    mutationFn: async () => {
      if (!resolvedCourseId || !subject.trim() || students.length === 0) {
        throw new Error("Pick course, semester and subject first");
      }
      const studentIds = students.map((s: any) => s.id);
      const { data: last } = await supabase
        .from("attendance")
        .select("student_id, status, date")
        .in("student_id", studentIds)
        .eq("subject", subject.trim())
        .neq("date", date)
        .order("date", { ascending: false })
        .limit(200);
      if (!last || last.length === 0) throw new Error("No previous session found for this subject");
      // take the most recent date
      const recentDate = last[0].date;
      const sameDay = last.filter((r: any) => r.date === recentDate);
      const map: Record<string, "present" | "absent"> = {};
      sameDay.forEach((r: any) => {
        map[r.student_id] = r.status === "absent" ? "absent" : "present";
      });
      setStatuses((prev) => ({ ...prev, ...map }));
      return { recentDate, count: sameDay.length };
    },
    onSuccess: ({ recentDate, count }) => toast.success(`Copied ${count} entries from ${recentDate}`),
    onError: (e: any) => toast.error(e.message),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!subject.trim()) throw new Error("Subject is required");
      const entries = Object.entries(statuses);
      if (entries.length === 0) throw new Error("Please mark at least one student");

      const records = entries.map(([student_id, status]) => ({
        student_id,
        subject: subject.trim(),
        date,
        status,
        marked_by: user!.id,
        year_level: Math.ceil(activeSemester / 2),
        course_id: resolvedCourseId,
      }));

      if (alreadyMarkedIds.size > 0) {
        const toDelete = records.filter(r => alreadyMarkedIds.has(r.student_id)).map(r => r.student_id);
        await supabase.from("attendance").delete()
          .in("student_id", toDelete)
          .eq("date", date)
          .eq("subject", subject.trim());
      }

      const { error } = await supabase.from("attendance").insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`✅ Attendance saved — ${presentCount} Present · ${absentCount} Absent`);

      const perStudentPush = Object.entries(statuses).map(([studentId, status]) => {
        const student = students.find((s: any) => s.id === studentId);
        const name = student?.profile?.full_name || student?.roll_number || "Student";
        const emoji = status === "present" ? "✅" : "❌";
        const statusText = status === "present" ? "Present" : "Absent";
        return {
          user_id: student?.user_id || "",
          title: `${name} — ${statusText} ${emoji}`,
          body: `📋 ${subject} • ${date} • Semester ${activeSemester}${activeCourse ? ` • ${activeCourse.name}` : ""}`,
          url: "/dashboard/student/attendance",
        };
      }).filter(n => n.user_id);

      setStatuses({});
      queryClient.invalidateQueries({ queryKey: ["existing-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["recent-subjects"] });
      queryClient.invalidateQueries({ queryKey: ["absent-students-date"] });
      queryClient.invalidateQueries({ queryKey: ["admin-absent-students"] });
      notifyStudents({
        courseId: resolvedCourseId,
        semester: activeSemester,
        title: "Attendance Updated",
        message: `Attendance for ${subject} on ${date} has been marked.`,
        type: "attendance",
        link: "/dashboard/student/attendance",
        perStudentPush,
      });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const activeCourse = courses.find((c: any) => c.id === resolvedCourseId);

  // SVG ring circumference for completion ring
  const RING_R = 22;
  const RING_C = 2 * Math.PI * RING_R;

  return (
    <div className="space-y-4 pb-32 max-w-7xl mx-auto">
      {/* Premium Hero */}
      <div className="relative overflow-hidden bg-card border border-border/40 rounded-[2rem] p-5 sm:p-7">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-emerald-500/10" />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-[80px] pointer-events-none bg-primary/20" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-[80px] pointer-events-none bg-emerald-500/15" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-primary" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2.5 py-0.5 mb-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span className="font-body text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Smart Attendance</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">Mark Attendance</h2>
              <p className="font-body text-xs text-muted-foreground mt-0.5 truncate">
                Default everyone Present, then only flip absentees — saves minutes per class.
              </p>
            </div>
          </div>

          {/* Live Ring */}
          {totalCount > 0 && (
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r={RING_R} stroke="hsl(var(--muted))" strokeWidth="5" fill="none" />
                  <circle cx="28" cy="28" r={RING_R}
                    stroke="hsl(142, 70%, 45%)" strokeWidth="5" fill="none" strokeLinecap="round"
                    strokeDasharray={RING_C}
                    strokeDashoffset={RING_C - (completionPct / 100) * RING_C}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-[11px] font-bold text-foreground tabular-nums">{completionPct}%</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Marked</p>
                <p className="font-display text-sm font-bold text-foreground tabular-nums">{markedCount} / {totalCount}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-2xl w-fit">
        <button onClick={() => setActiveTab("mark")}
          className={`px-4 py-2 rounded-xl font-body text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${activeTab === "mark" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Mark Attendance
        </button>
        <button onClick={() => setActiveTab("absent-list")}
          className={`px-4 py-2 rounded-xl font-body text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${activeTab === "absent-list" ? "bg-destructive text-destructive-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          <AlertTriangle className="w-3.5 h-3.5" /> Absent Report
          {absentCount > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === "absent-list" ? "bg-destructive-foreground/20 text-destructive-foreground" : "bg-destructive/15 text-destructive"}`}>{absentCount}</span>}
        </button>
      </div>

      {activeTab === "absent-list" ? (
        /* ── Absent Report ── */
        <div className="bg-card border border-border rounded-[2rem] overflow-hidden">
          <div className="p-5 border-b border-border bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent">
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Daily Absent Report — {date}
            </h3>
            <p className="font-body text-xs text-muted-foreground mt-1">
              {activeCourse?.name || "—"} · {SEMESTER_LABELS[activeSemester]} · {subject || "Select subject in Mark tab"}
            </p>
          </div>
          {absentStudents.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto mb-3 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="font-body text-sm font-semibold text-foreground">No absent students</p>
              <p className="font-body text-xs text-muted-foreground mt-1">Mark attendance first to see the report</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {absentStudents.map((s: any, i: number) => (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors animate-fade-in" style={{ animationDelay: `${i * 25}ms` }}>
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold text-foreground truncate">{s.profile?.full_name || "Unnamed"}</p>
                    <p className="font-body text-xs text-muted-foreground">{s.roll_number}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(s.phone || s.parent_phone) && (
                      <>
                        <a href={`tel:${s.parent_phone || s.phone}`} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-body font-bold hover:bg-primary/20 transition-colors">
                          <Phone className="w-3 h-3" /> Call
                        </a>
                        <a href={`sms:${s.parent_phone || s.phone}?body=${encodeURIComponent(`Dear Parent, your ward ${s.profile?.full_name || s.roll_number} was marked absent on ${date} for ${subject || "class"}. — Hoysala Degree College`)}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-[10px] font-body font-bold hover:bg-emerald-500/20 transition-colors">
                          <MessageSquare className="w-3 h-3" /> SMS
                        </a>
                      </>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold">Absent</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Mark Attendance: 2-col on lg ── */
        <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
          {/* LEFT — Filters & quick actions */}
          <div className="space-y-4 lg:sticky lg:top-4">
            {/* Course */}
            <div className="bg-card border border-border/60 rounded-2xl p-4">
              <label className="font-body text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Course
              </label>
              <div className="flex flex-wrap gap-1.5">
                {courses.map((c: any) => (
                  <button key={c.id} onClick={() => { setActiveCourseId(c.id); setStatuses({}); }}
                    className={`px-3 py-1.5 rounded-xl font-body text-[11px] font-bold transition-all duration-200 ${resolvedCourseId === c.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {c.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Semester */}
            <div className="bg-card border border-border/60 rounded-2xl p-4">
              <label className="font-body text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" /> Semester
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((sem) => (
                  <button key={sem} onClick={() => { setActiveSemester(sem); setStatuses({}); }}
                    className={`py-2 rounded-xl font-body text-[11px] font-bold transition-all duration-200 border ${activeSemester === sem ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"}`}>
                    {sem}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject & date */}
            <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
              <div>
                <label className="font-body text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Subject *</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Data Structures" className="rounded-xl text-sm h-10" />
                {recentSubjects.length > 0 && (
                  <div className="mt-2">
                    <p className="font-body text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                      <History className="w-3 h-3" /> Recent
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {recentSubjects.map((s) => (
                        <button key={s} onClick={() => setSubject(s)}
                          className={`px-2.5 py-1 rounded-lg font-body text-[10px] font-semibold transition-all border ${subject === s ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="font-body text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Date *
                </label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl text-sm h-10" />
              </div>
            </div>

            {/* Smart Actions */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-card to-primary/5 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
              <p className="font-body text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Smart Actions
              </p>
              <Button onClick={defaultAllPresent} disabled={totalCount === 0}
                className="w-full rounded-xl font-body text-xs font-bold h-10 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/30">
                <CheckCircle className="w-4 h-4 mr-1" /> Default All Present
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={() => copyFromLast.mutate()}
                  disabled={copyFromLast.isPending || !subject.trim()}
                  className="rounded-xl font-body text-[11px] h-9">
                  <History className="w-3 h-3 mr-1" /> Copy Last
                </Button>
                <Button size="sm" variant="outline" onClick={resetAll}
                  className="rounded-xl font-body text-[11px] h-9">
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => markAll("absent")}
                className="w-full rounded-xl font-body text-[11px] h-8 text-destructive hover:bg-destructive/10">
                Mark All Absent
              </Button>
            </div>
          </div>

          {/* RIGHT — Students list */}
          <div className="bg-card border border-border rounded-[2rem] p-4 sm:p-5 space-y-4">
            {/* Context strip */}
            {resolvedCourseId && (
              <div className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-primary/10 to-emerald-500/5 border border-primary/15">
                <div className="flex items-center gap-2 min-w-0">
                  <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                  <p className="font-body text-xs text-muted-foreground truncate">
                    <span className="font-bold text-foreground">{filteredStudents.length}</span> students ·{" "}
                    <span className="font-bold text-foreground">{activeCourse?.name}</span> ·{" "}
                    <span className="font-bold text-foreground">{SEMESTER_LABELS[activeSemester]}</span>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {presentCount > 0 && <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-bold tabular-nums">P {presentCount}</span>}
                  {absentCount > 0 && <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-bold tabular-nums">A {absentCount}</span>}
                  {unmarkedCount > 0 && <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold tabular-nums">— {unmarkedCount}</span>}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or roll number…" className="pl-9 rounded-xl text-sm h-10" />
            </div>

            {alreadyMarkedIds.size > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="font-body text-xs font-semibold text-foreground">
                  {alreadyMarkedIds.size} student(s) already have attendance for this subject/date. Saving will overwrite.
                </p>
              </div>
            )}

            {/* Student rows */}
            {studentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 mx-auto mb-3 flex items-center justify-center">
                  <Users className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="font-body text-sm font-semibold text-foreground">No students found</p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  {activeCourse?.name} · {SEMESTER_LABELS[activeSemester]}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 -mr-1">
                {filteredStudents.map((s: any, i: number) => {
                  const st = statuses[s.id];
                  const previous = alreadyMarkedMap[s.id];
                  const initials = (s.profile?.full_name || s.roll_number || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={s.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-200 animate-fade-in ${
                        st === "present"
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : st === "absent"
                          ? "bg-destructive/5 border-destructive/30"
                          : "bg-muted/20 border-border/40 hover:bg-muted/40"
                      }`}
                      style={{ animationDelay: `${Math.min(i, 20) * 20}ms` }}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {s.profile?.avatar_url ? (
                          <img src={s.profile.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-border/40 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="font-display text-xs font-bold text-primary">{initials}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-body text-sm font-semibold text-foreground truncate">{s.profile?.full_name || "Unnamed"}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="font-body text-[10px] text-muted-foreground font-mono">{s.roll_number}</span>
                            {previous && !st && (
                              <span className={`font-body text-[9px] font-bold px-1.5 py-0.5 rounded-full ${previous === "present" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                                Was {previous}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Segmented P/A control */}
                      <div className="flex gap-1 p-1 rounded-xl bg-background border border-border/60 shrink-0">
                        <button onClick={() => setStatus(s.id, "present")}
                          aria-label="Mark Present"
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${st === "present" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105" : "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"}`}>
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => setStatus(s.id, "absent")}
                          aria-label="Mark Absent"
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${st === "absent" ? "bg-destructive text-destructive-foreground shadow-md shadow-destructive/30 scale-105" : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"}`}>
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sticky Save Bar */}
      {activeTab === "mark" && totalCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(720px,calc(100%-2rem))] z-40">
          <div className="bg-card/90 backdrop-blur-xl border border-border/60 shadow-2xl rounded-2xl p-3 flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-end">
                <span className="font-body text-[10px] uppercase text-muted-foreground tracking-wider">Present</span>
                <span className="font-display text-base font-bold text-emerald-600 tabular-nums leading-none">{presentCount}</span>
              </div>
              <span className="text-muted-foreground/30">/</span>
              <div className="flex flex-col items-start">
                <span className="font-body text-[10px] uppercase text-muted-foreground tracking-wider">Absent</span>
                <span className="font-display text-base font-bold text-destructive tabular-nums leading-none">{absentCount}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 hidden sm:block">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${presentPct}%` }} />
              </div>
              <p className="font-body text-[10px] text-muted-foreground mt-1 truncate">
                {subject ? `${subject} · ${date}` : "Pick a subject to save"}
              </p>
            </div>
            <Button
              className="rounded-xl font-body font-bold px-5 h-11 shrink-0 bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground shadow-lg shadow-primary/20"
              disabled={!subject.trim() || markedCount === 0 || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}>
              {submitMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" /> Save ({markedCount})
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

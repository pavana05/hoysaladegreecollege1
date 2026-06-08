import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, Clock, BarChart3, Upload, Bell, Megaphone, Calendar, BookOpen, CheckCircle,
  TrendingUp, Activity, ListTodo, Plus, Trash2, Award,
  ArrowRight, Eye, Phone, User, IndianRupee, Flame, Target, Zap, Star, FileText
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ActionCenter from "@/components/ActionCenter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import AnimatedEmoji from "@/components/AnimatedEmoji";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from "recharts";

const CHART_COLORS = ["hsl(215, 90%, 55%)", "hsl(145, 65%, 42%)", "hsl(42, 70%, 52%)", "hsl(280, 60%, 55%)", "hsl(0, 70%, 58%)", "hsl(180, 60%, 45%)"];

function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const step = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return { count, ref };
}

function CircularProgress({ pct, size = 88, stroke = 8, color = "hsl(var(--primary))" }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnimated(pct), 150); return () => clearTimeout(t); }, [pct]);
  return (
    <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - animated / 100)} className="transition-all duration-1000 ease-out" />
    </svg>
  );
}

function StatCard({ label, value, suffix = "", icon: Icon, color }: { label: string; value: string; suffix?: string; icon: React.ElementType; color?: string }) {
  const { count, ref } = useAnimatedCounter(parseInt(value) || 0);
  return (
    <div ref={ref} className="bg-card border border-border/60 rounded-2xl p-5 hover:border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color || "bg-primary/10"}`}>
        <Icon className={`w-5 h-5 ${color ? "text-white" : "text-primary"}`} />
      </div>
      <p className="font-body text-[28px] font-bold text-foreground tracking-tight tabular-nums leading-none group-hover:text-primary transition-colors duration-300">{count}{suffix}</p>
      <p className="font-body text-[12px] text-muted-foreground mt-1.5">{label}</p>
    </div>
  );
}

function useTeacherNotes() {
  const [notes, setNotes] = useState<{ id: string; text: string; done: boolean; created: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("hdc_teacher_notes") || "[]"); } catch { return []; }
  });
  const save = (n: typeof notes) => { setNotes(n); localStorage.setItem("hdc_teacher_notes", JSON.stringify(n)); };
  const add = (text: string) => save([{ id: Date.now().toString(), text, done: false, created: new Date().toISOString() }, ...notes]);
  const toggle = (id: string) => save(notes.map(n => n.id === id ? { ...n, done: !n.done } : n));
  const remove = (id: string) => save(notes.filter(n => n.id !== id));
  return { notes, add, toggle, remove };
}

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const [newNote, setNewNote] = useState("");
  const { notes, add, toggle, remove } = useTeacherNotes();
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedPerformer, setSelectedPerformer] = useState<any>(null);

  // Main stats
  const { data: counts, isLoading } = useQuery({
    queryKey: ["teacher-stats", attDate],
    refetchInterval: 30000,
    queryFn: async () => {
      const [students, materials, notices, attendance, announcements] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("study_materials").select("id", { count: "exact", head: true }),
        supabase.from("notices").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("attendance").select("status").eq("date", attDate),
        supabase.from("announcements").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      const att = attendance.data || [];
      const present = att.filter(a => a.status === "present").length;
      const pct = att.length > 0 ? Math.round((present / att.length) * 100) : 0;
      return { students: students.count || 0, materials: materials.count || 0, notices: notices.count || 0, attendancePct: pct, announcements: announcements.count || 0, totalAtt: att.length, presentAtt: present };
    },
  });

  // Class summary
  const { data: classSummary = [] } = useQuery({
    queryKey: ["teacher-class-summary"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data: courses } = await supabase.from("courses").select("id, name, code").eq("is_active", true);
      if (!courses?.length) return [];
      const { data: allStudents } = await supabase.from("students").select("id, course_id, semester").eq("is_active", true);
      const { data: allAttendance } = await supabase.from("attendance").select("student_id, status");
      const { data: allMarks } = await supabase.from("marks").select("student_id, obtained_marks, max_marks");

      return courses.map(c => {
        const studs = (allStudents || []).filter(s => s.course_id === c.id);
        const studIds = new Set(studs.map(s => s.id));
        const att = (allAttendance || []).filter(a => studIds.has(a.student_id));
        const presentCount = att.filter(a => a.status === "present").length;
        const attPct = att.length > 0 ? Math.round((presentCount / att.length) * 100) : 0;
        const marks = (allMarks || []).filter(m => studIds.has(m.student_id));
        const avgMarks = marks.length > 0 ? Math.round(marks.reduce((s, m) => s + (m.obtained_marks / m.max_marks) * 100, 0) / marks.length) : 0;
        return { id: c.id, name: c.name, code: c.code, students: studs.length, attPct, avgMarks };
      }).filter(c => c.students > 0);
    },
  });

  // Weekly attendance trend for teacher
  const { data: weeklyAttTrend = [] } = useQuery({
    queryKey: ["teacher-weekly-att-trend"],
    queryFn: async () => {
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });
      const { data: attendance } = await supabase.from("attendance").select("status, date").gte("date", last7[0]).lte("date", last7[6]);
      return last7.map(date => {
        const dayRecords = (attendance || []).filter(a => a.date === date);
        const present = dayRecords.filter(a => a.status === "present").length;
        return {
          day: format(new Date(date), "EEE"),
          present,
          absent: dayRecords.length - present,
          total: dayRecords.length,
        };
      });
    },
  });

  // Recent notices for teacher
  const { data: recentNotices = [] } = useQuery({
    queryKey: ["teacher-recent-notices"],
    queryFn: async () => {
      const { data } = await supabase.from("notices").select("title, created_at, type").eq("is_active", true).order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  // Upcoming events
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["teacher-upcoming-events"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("events").select("id, title, event_date, category").eq("is_active", true).gte("event_date", today).order("event_date").limit(3);
      return data || [];
    },
  });

  // Performance analytics: top performers
  const { data: perfData } = useQuery({
    queryKey: ["teacher-performance-analytics"],
    queryFn: async () => {
      const { data: marks } = await supabase.from("marks").select("student_id, obtained_marks, max_marks");
      if (!marks?.length) return null;
      const studentScores: Record<string, { total: number; count: number }> = {};
      marks.forEach(m => {
        if (!studentScores[m.student_id]) studentScores[m.student_id] = { total: 0, count: 0 };
        studentScores[m.student_id].total += (m.obtained_marks / m.max_marks) * 100;
        studentScores[m.student_id].count++;
      });
      const topStudentIds = Object.entries(studentScores)
        .map(([id, { total, count }]) => ({ id, avg: Math.round(total / count) }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5);
      const { data: profiles } = await supabase.from("students").select("id, roll_number, user_id, phone, parent_phone, father_name, mother_name, semester, date_of_birth, address, course_id, courses(name)").in("id", topStudentIds.map(s => s.id));
      const { data: names } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", (profiles || []).map(p => p.user_id));
      const topPerformers = topStudentIds.map(t => {
        const stu = profiles?.find(p => p.id === t.id);
        const name = names?.find(n => n.user_id === stu?.user_id);
        return {
          name: name?.full_name || "Unknown", email: name?.email || "", roll: stu?.roll_number || "", avg: t.avg,
          phone: stu?.phone || "", parent_phone: stu?.parent_phone || "", father_name: stu?.father_name || "",
          mother_name: stu?.mother_name || "", semester: stu?.semester, date_of_birth: stu?.date_of_birth || "",
          address: stu?.address || "", course: (stu as any)?.courses?.name || "",
        };
      });
      return { topPerformers };
    },
  });

  const stats = [
    { label: "Total Students", value: String(counts?.students ?? 0), icon: Users, color: "bg-blue-500" },
    { label: "Study Materials", value: String(counts?.materials ?? 0), icon: Upload, color: "bg-purple-500" },
    { label: "Active Notices", value: String(counts?.notices ?? 0), icon: Bell, color: "bg-amber-500" },
    { label: "Attendance Rate", value: String(counts?.attendancePct ?? 0), suffix: "%", icon: CheckCircle, color: "bg-emerald-500" },
  ];

  const quickActions = [
    { icon: Clock, label: "Mark Attendance", desc: "Record daily attendance", path: "/dashboard/teacher/attendance", color: "bg-blue-500/10", iconColor: "text-blue-500" },
    { icon: Users, label: "Attendance Overview", desc: "Present & absent list", path: "/dashboard/teacher/attendance-overview", color: "bg-teal-500/10", iconColor: "text-teal-500" },
    { icon: BarChart3, label: "Upload Marks", desc: "Enter student marks", path: "/dashboard/teacher/marks", color: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    { icon: Upload, label: "Upload Material", desc: "Share resources", path: "/dashboard/teacher/materials", color: "bg-purple-500/10", iconColor: "text-purple-500" },
    { icon: Megaphone, label: "Post Notice", desc: "Publish updates", path: "/dashboard/teacher/notices", color: "bg-amber-500/10", iconColor: "text-amber-500" },
    { icon: Users, label: "View Students", desc: "Browse student list", path: "/dashboard/teacher/students", color: "bg-cyan-500/10", iconColor: "text-cyan-500" },
    { icon: Calendar, label: "Timetable", desc: "View schedules", path: "/dashboard/teacher/timetable", color: "bg-rose-500/10", iconColor: "text-rose-500" },
    { icon: Bell, label: "Absent Notes", desc: "Student absences", path: "/dashboard/teacher/absent", color: "bg-orange-500/10", iconColor: "text-orange-500" },
    { icon: Megaphone, label: "Announcements", desc: "Post messages", path: "/dashboard/teacher/announcements", color: "bg-indigo-500/10", iconColor: "text-indigo-500" },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="space-y-6 animate-fade-in">
      <SEOHead title="Teacher Dashboard" description="Teacher dashboard" noIndex />
      <div className="bg-card border border-border/60 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-3 py-1 mb-3">
              <Star className="w-3 h-3 text-primary" />
              <span className="font-body text-[11px] text-primary font-semibold uppercase tracking-wider">Teacher Portal</span>
            </div>
            <h2 className="font-body text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {greeting}, Prof. {profile?.full_name || "Teacher"} <AnimatedEmoji emoji="👩‍🏫" size={30} animation="wiggle" />
            </h2>
            <p className="font-body text-[13px] text-muted-foreground mt-1">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-muted/40 rounded-xl px-4 py-2.5 text-center">
              <p className="font-body text-lg font-bold text-foreground">{counts?.students ?? 0}</p>
              <p className="font-body text-[10px] text-muted-foreground">Students</p>
            </div>
            <div className="bg-muted/40 rounded-xl px-4 py-2.5 text-center">
              <p className="font-body text-lg font-bold text-foreground">{counts?.materials ?? 0}</p>
              <p className="font-body text-[10px] text-muted-foreground">Materials</p>
            </div>
          </div>
        </div>
      </div>

      <ActionCenter role="teacher" />

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      )}

      {/* Priority Cards + Attendance Ring */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Link to="/dashboard/teacher/attendance" className="block bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/30 hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-body text-[14px] font-semibold text-foreground">Mark Attendance</p>
                <p className="font-body text-[11px] text-muted-foreground">Record today's class attendance</p>
              </div>
            </div>
          </Link>
          <Link to="/dashboard/teacher/marks" className="block bg-card border border-border/60 rounded-2xl p-5 hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-body text-[14px] font-semibold text-foreground">Upload Marks</p>
                <p className="font-body text-[11px] text-muted-foreground">Publish student evaluations</p>
              </div>
            </div>
          </Link>
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-body text-[14px] font-semibold text-foreground">{new Date().toLocaleDateString("en-IN", { weekday: "long" })}</p>
                <p className="font-body text-[11px] text-muted-foreground">{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Ring */}
        {counts && (
          <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className="font-body text-[14px] font-semibold text-foreground">Attendance Overview</h3>
              </div>
              <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)}
                className="font-body text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 shrink-0">
                <CircularProgress pct={counts.attendancePct} size={96} stroke={9} color="hsl(145, 65%, 42%)" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-body text-lg font-bold text-foreground tabular-nums">{counts.attendancePct}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-500/5">
                  <span className="font-body text-[12px] text-muted-foreground">Present</span>
                  <span className="font-body text-[14px] font-bold text-emerald-500 tabular-nums">{counts.presentAtt}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-red-500/5">
                  <span className="font-body text-[12px] text-muted-foreground">Absent</span>
                  <span className="font-body text-[14px] font-bold text-red-500 tabular-nums">{counts.totalAtt - counts.presentAtt}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${counts.attendancePct}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ NEW: Weekly Attendance Trend Chart ═══ */}
      {weeklyAttTrend.length > 0 && (
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-cyan-500" />
            </div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Weekly Attendance Trend</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyAttTrend} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="present" name="Present" fill="hsl(145, 65%, 42%)" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="absent" name="Absent" fill="hsl(0, 70%, 58%)" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══ NEW: Recent Notices + Upcoming Events ═══ */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="font-body text-[14px] font-semibold text-foreground">Recent Notices</h3>
            </div>
            <Link to="/dashboard/teacher/notices" className="font-body text-[11px] text-primary flex items-center gap-0.5 hover:gap-1.5 transition-all duration-200">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentNotices.length === 0 ? (
            <p className="font-body text-xs text-muted-foreground text-center py-8">No notices yet</p>
          ) : (
            <div className="space-y-2">
              {recentNotices.map((n: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-body text-[12px] font-medium text-foreground truncate">{n.title}</p>
                    <span className="font-body text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">{n.type}</span>
                  </div>
                  <p className="font-body text-[9px] text-muted-foreground/60 mt-1">{format(new Date(n.created_at), "MMM d, yyyy")}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-purple-500" />
            </div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Upcoming Events</h3>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="font-body text-xs text-muted-foreground text-center py-8">No upcoming events</p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 transition-colors duration-200">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex flex-col items-center justify-center shrink-0">
                    <span className="font-body text-[10px] text-purple-500 font-bold leading-none">{format(new Date(e.event_date), "MMM")}</span>
                    <span className="font-body text-lg font-bold text-foreground leading-none">{format(new Date(e.event_date), "d")}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-body text-[12px] font-semibold text-foreground truncate">{e.title}</p>
                    <p className="font-body text-[10px] text-muted-foreground">{e.category}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CLASS SUMMARY CARDS */}
      {classSummary.length > 0 && (
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-500" />
            </div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Class Summary</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {classSummary.map((c: any) => (
              <div key={c.id} className="border border-border/50 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-body text-[13px] font-bold text-foreground">{c.code}</p>
                    <p className="font-body text-[10px] text-muted-foreground">{c.name}</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg px-2.5 py-1">
                    <span className="font-body text-[11px] font-bold text-primary">{c.students} Students</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-500/5 rounded-lg p-2.5 text-center">
                    <p className="font-body text-lg font-bold text-emerald-600 tabular-nums">{c.attPct}%</p>
                    <p className="font-body text-[9px] text-muted-foreground">Attendance</p>
                  </div>
                  <div className="bg-blue-500/5 rounded-lg p-2.5 text-center">
                    <p className="font-body text-lg font-bold text-blue-600 tabular-nums">{c.avgMarks}%</p>
                    <p className="font-body text-[9px] text-muted-foreground">Avg Marks</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOP PERFORMERS */}
      {perfData && (
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Top Performers</h3>
          </div>
          {perfData.topPerformers.length > 0 ? (
            <div className="space-y-2">
              {perfData.topPerformers.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200 group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-body text-xs font-bold ${
                    i === 0 ? "bg-amber-500/20 text-amber-600" : i === 1 ? "bg-gray-300/20 text-gray-600" : i === 2 ? "bg-orange-400/20 text-orange-600" : "bg-muted text-muted-foreground"
                  }`}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-[12px] font-semibold text-foreground truncate">{s.name}</p>
                    <p className="font-body text-[10px] text-muted-foreground">{s.roll}</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg px-2.5 py-1 mr-1">
                    <span className="font-body text-[12px] font-bold text-emerald-600 tabular-nums">{s.avg}%</span>
                  </div>
                  <button
                    onClick={() => setSelectedPerformer(s)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary font-body text-[11px] font-semibold hover:bg-primary/20 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
                  >
                    <Eye className="w-3 h-3" /> View
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-body text-sm text-muted-foreground text-center py-8">No marks data yet</p>
          )}
        </div>
      )}

      {/* Top Performer Detail Dialog */}
      <Dialog open={!!selectedPerformer} onOpenChange={(o) => !o && setSelectedPerformer(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Student Details
            </DialogTitle>
          </DialogHeader>
          {selectedPerformer && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <p className="font-display text-base font-bold text-foreground">{selectedPerformer.name}</p>
                <p className="font-body text-xs text-muted-foreground">{selectedPerformer.roll}</p>
                <div className="inline-flex items-center gap-1 mt-2 bg-emerald-500/10 rounded-lg px-3 py-1">
                  <span className="font-body text-sm font-bold text-emerald-600">{selectedPerformer.avg}% Avg</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Course", value: selectedPerformer.course },
                  { label: "Semester", value: selectedPerformer.semester ? `Sem ${selectedPerformer.semester}` : "—" },
                  { label: "Father", value: selectedPerformer.father_name || "—" },
                  { label: "Mother", value: selectedPerformer.mother_name || "—" },
                  { label: "DOB", value: selectedPerformer.date_of_birth || "—" },
                  { label: "Email", value: selectedPerformer.email || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2.5 rounded-xl bg-muted/20">
                    <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="font-body text-xs font-semibold text-foreground mt-0.5 truncate">{value}</p>
                  </div>
                ))}
              </div>
              {selectedPerformer.address && (
                <div className="p-2.5 rounded-xl bg-muted/20">
                  <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Address</p>
                  <p className="font-body text-xs font-semibold text-foreground mt-0.5">{selectedPerformer.address}</p>
                </div>
              )}
              <div className="flex gap-2">
                <a href={selectedPerformer.phone ? `tel:${selectedPerformer.phone}` : "#"}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-body text-xs font-semibold transition-colors ${
                    selectedPerformer.phone ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : "bg-muted/30 text-muted-foreground cursor-not-allowed"
                  }`}>
                  <Phone className="w-3.5 h-3.5" /> Call Student
                </a>
                <a href={selectedPerformer.parent_phone ? `tel:${selectedPerformer.parent_phone}` : "#"}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-body text-xs font-semibold transition-colors ${
                    selectedPerformer.parent_phone ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" : "bg-muted/30 text-muted-foreground cursor-not-allowed"
                  }`}>
                  <Phone className="w-3.5 h-3.5" /> Call Parent
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QUICK NOTES / TO-DO */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
            <ListTodo className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className="font-body text-[14px] font-semibold text-foreground">Quick Notes & Tasks</h3>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (newNote.trim()) { add(newNote.trim()); setNewNote(""); toast.success("Note added!"); } }}
          className="flex gap-2 mb-4">
          <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note or task..."
            className="flex-1 border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200" />
          <Button type="submit" size="sm" className="rounded-xl px-4" disabled={!newNote.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </form>
        {notes.length > 0 ? (
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {notes.map(n => (
              <div key={n.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${n.done ? "bg-emerald-500/5" : "bg-muted/30 hover:bg-muted/50"}`}>
                <button onClick={() => toggle(n.id)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                  n.done ? "bg-emerald-500 border-emerald-500" : "border-border hover:border-primary"
                }`}>
                  {n.done && <CheckCircle className="w-3 h-3 text-white" />}
                </button>
                <p className={`font-body text-[12px] flex-1 ${n.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{n.text}</p>
                <span className="font-body text-[9px] text-muted-foreground shrink-0">{format(new Date(n.created), "MMM d")}</span>
                <button onClick={() => remove(n.id)} className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-body text-xs text-muted-foreground text-center py-6">No notes yet — add one above!</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
        <h3 className="font-body text-[14px] font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {quickActions.map((a) => (
            <Link key={a.label} to={a.path} className="flex items-center gap-2.5 p-3.5 rounded-xl bg-muted/30 hover:bg-muted/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
              <div className={`w-9 h-9 rounded-xl ${a.color} flex items-center justify-center shrink-0`}>
                <a.icon className={`w-4 h-4 ${a.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="font-body text-[12px] font-medium text-foreground truncate">{a.label}</p>
                <p className="font-body text-[10px] text-muted-foreground truncate">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

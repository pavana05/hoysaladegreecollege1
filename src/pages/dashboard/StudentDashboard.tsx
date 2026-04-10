import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Clock, BarChart3, Bell, Calendar, TrendingUp, CheckCircle, XCircle, Megaphone, ArrowRight, Sparkles, Upload, User, GraduationCap, FileText, Award, IndianRupee, Wallet, AlertTriangle, Target, Flame, Calculator, Timer, Star, Zap, Trophy, Bot } from "lucide-react";
import BirthdayPopup from "@/components/BirthdayPopup";
import SEOHead from "@/components/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useRef } from "react";
import { format, differenceInDays } from "date-fns";
import ActionCenter from "@/components/ActionCenter";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

const NOTICE_TYPE_COLORS: Record<string, string> = {
  Exam: "bg-red-500/10 text-red-500",
  Holiday: "bg-emerald-500/10 text-emerald-500",
  Event: "bg-purple-500/10 text-purple-500",
  General: "bg-primary/10 text-primary",
  Fee: "bg-amber-500/10 text-amber-500",
};

function useAnimatedCounter(target: number, duration = 1400) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => { started.current = false; setCount(0); }, [target]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current && target > 0) {
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

function CircularProgress({ pct, size = 96, stroke = 8, color = "hsl(var(--primary))" }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnimated(pct), 120); return () => clearTimeout(t); }, [pct]);
  return (
    <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - animated / 100)} className="transition-all duration-1000 ease-out" />
    </svg>
  );
}

function StatCard({ label, value, suffix = "", icon: Icon, color, delay = 0 }: any) {
  const { count, ref } = useAnimatedCounter(parseInt(value) || 0);
  return (
    <div ref={ref} className="bg-card border border-border/60 rounded-2xl p-5 hover:border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group" style={{ animationDelay: `${delay}ms` }}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color || "bg-primary/10"}`}>
        <Icon className={`w-5 h-5 ${color ? "text-white" : "text-primary"}`} />
      </div>
      <p className="font-body text-[28px] font-bold text-foreground tabular-nums leading-none group-hover:text-primary transition-colors duration-300">{count}{suffix}</p>
      <p className="font-body text-[11px] text-muted-foreground mt-1.5 uppercase tracking-wider">{label}</p>
    </div>
  );
}

// Study streak tracker (database-backed)
function useStudyStreak(userId: string | undefined) {
  const [streak, setStreak] = useState(0);
  const [lastDate, setLastDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchStreak = async () => {
      const { data } = await supabase
        .from("study_streaks")
        .select("streak, last_date")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        const today = new Date().toISOString().split("T")[0];
        const diff = differenceInDays(new Date(today), new Date(data.last_date));
        if (diff <= 1) {
          setStreak(data.streak);
          setLastDate(data.last_date);
        } else {
          // Streak broken — reset in DB
          setStreak(0);
          setLastDate("");
          await supabase.from("study_streaks").update({ streak: 0, last_date: today, updated_at: new Date().toISOString() }).eq("user_id", userId);
        }
      }
      setLoading(false);
    };
    fetchStreak();
  }, [userId]);

  const logStudy = async () => {
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    const diff = lastDate ? differenceInDays(new Date(today), new Date(lastDate)) : 2;
    const newStreak = diff <= 1 ? (today === lastDate ? streak : streak + 1) : 1;
    setStreak(newStreak);
    setLastDate(today);

    const { data: existing } = await supabase
      .from("study_streaks")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase.from("study_streaks").update({ streak: newStreak, last_date: today, updated_at: new Date().toISOString() }).eq("user_id", userId);
    } else {
      await supabase.from("study_streaks").insert({ user_id: userId, streak: newStreak, last_date: today });
    }
  };

  const isLoggedToday = lastDate === new Date().toISOString().split("T")[0];
  return { streak, logStudy, isLoggedToday };
}

export default function StudentDashboard() {
  const { profile, user } = useAuth();
  const { streak, logStudy, isLoggedToday } = useStudyStreak(user?.id);

  const { data, isLoading: statsLoading } = useQuery({
    queryKey: ["student-dashboard-stats", user?.id],
    refetchInterval: 30000,
    queryFn: async () => {
      if (!user) return null;
      const { data: student } = await supabase.from("students").select("id, semester, roll_number, course_id, courses(name, code)").eq("user_id", user.id).single();
      if (!student) return null;

      const today = new Date().toISOString().split("T")[0];
      const [attendance, marks, notices, materials, todayAttendance, announcements] = await Promise.all([
        supabase.from("attendance").select("status, date").eq("student_id", student.id),
        supabase.from("marks").select("obtained_marks, max_marks, subject, exam_type, semester").eq("student_id", student.id),
        supabase.from("notices").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("study_materials").select("id", { count: "exact", head: true }),
        supabase.from("attendance").select("status").eq("student_id", student.id).eq("date", today),
        supabase.from("announcements").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      const total = attendance.data?.length || 0;
      const present = attendance.data?.filter(a => a.status === "present").length || 0;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      const marksData = marks.data || [];
      const avgMarks = marksData.length > 0 ? Math.round(marksData.reduce((s, m) => s + (m.obtained_marks / m.max_marks) * 100, 0) / marksData.length) : 0;

      const todayRecords = todayAttendance.data || [];
      let todayStatus: "present" | "absent" | "none" = "none";
      if (todayRecords.length > 0) todayStatus = todayRecords.some(r => r.status === "absent") ? "absent" : "present";

      // Weekly attendance trend (last 7 days)
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });
      const weeklyTrend = last7.map(date => {
        const dayRecords = (attendance.data || []).filter(a => a.date === date);
        const dayPresent = dayRecords.filter(a => a.status === "present").length;
        return { day: format(new Date(date), "EEE"), present: dayPresent, total: dayRecords.length, pct: dayRecords.length > 0 ? Math.round((dayPresent / dayRecords.length) * 100) : 0 };
      });

      // Subject-wise marks for chart
      const subjectMarks: Record<string, { total: number; count: number }> = {};
      marksData.forEach(m => {
        if (!subjectMarks[m.subject]) subjectMarks[m.subject] = { total: 0, count: 0 };
        subjectMarks[m.subject].total += (m.obtained_marks / m.max_marks) * 100;
        subjectMarks[m.subject].count++;
      });
      const subjectChartData = Object.entries(subjectMarks).map(([subject, { total, count }]) => ({
        subject: subject.length > 10 ? subject.slice(0, 10) + "…" : subject,
        avg: Math.round(total / count),
      })).slice(0, 8);

      // GPA calculation (simple: 90+=10, 80+=9, etc.)
      const gpa = avgMarks >= 90 ? 10 : avgMarks >= 80 ? 9 : avgMarks >= 70 ? 8 : avgMarks >= 60 ? 7 : avgMarks >= 50 ? 6 : avgMarks >= 40 ? 5 : 0;

      return {
        attendance: pct, avgMarks, notices: notices.count || 0,
        materials: materials.count || 0, announcements: announcements.count || 0,
        present, absent: total - present, total, todayStatus,
        semester: student.semester, rollNumber: student.roll_number,
        courseName: (student as any).courses?.name, courseCode: (student as any).courses?.code,
        totalSubjects: marksData.length, weeklyTrend, subjectChartData, gpa,
      };
    },
    enabled: !!user,
  });

  const { data: recentNotices = [], isLoading: noticesLoading } = useQuery({
    queryKey: ["student-recent-notices"],
    queryFn: async () => {
      const { data } = await supabase.from("notices").select("title, created_at, type, content, is_pinned").eq("is_active", true).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(4);
      return data || [];
    },
  });

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ["student-dashboard-announcements", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("announcements").select("id, title, content, created_at").eq("is_active", true).order("created_at", { ascending: false }).limit(4);
      return data || [];
    },
    enabled: !!user,
  });

  // Upcoming events
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["student-upcoming-events"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("events").select("id, title, event_date, category").eq("is_active", true).gte("event_date", today).order("event_date").limit(4);
      return data || [];
    },
  });

  const [feeSemFilter, setFeeSemFilter] = useState("all");

  const { data: feeReminders = [] } = useQuery({
    queryKey: ["student-fee-reminders", user?.id],
    refetchInterval: 15000,
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("notifications")
        .select("id, title, message, created_at, is_read")
        .eq("user_id", user.id)
        .in("type", ["fee_reminder", "fee"])
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  const markReminderRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const { data: feeData } = useQuery({
    queryKey: ["student-fee-data", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: student } = await supabase.from("students").select("id, total_fee, fee_paid, fee_due_date, fee_remarks, semester").eq("user_id", user.id).single();
      if (!student) return null;
      const { data: payments } = await supabase.from("fee_payments").select("*").eq("student_id", student.id).order("created_at", { ascending: false });
      return { student, payments: payments || [] };
    },
    enabled: !!user,
  });

  const attendancePct = data?.attendance ?? 0;
  const attendanceColor = attendancePct >= 75 ? "hsl(145, 65%, 42%)" : attendancePct >= 60 ? "hsl(42, 70%, 52%)" : "hsl(0, 70%, 58%)";
  const attendanceTextColor = attendancePct >= 75 ? "text-emerald-500" : attendancePct >= 60 ? "text-amber-500" : "text-red-500";

  const stats = [
    { label: "Attendance", value: String(attendancePct), suffix: "%", icon: Clock, color: attendancePct >= 75 ? "bg-emerald-500" : "bg-red-500", delay: 0 },
    { label: "Avg Marks", value: String(data?.avgMarks ?? 0), suffix: "%", icon: BarChart3, color: "bg-blue-500", delay: 80 },
    { label: "Notices", value: String(data?.notices ?? 0), icon: Bell, color: "bg-amber-500", delay: 160 },
    { label: "Materials", value: String(data?.materials ?? 0), icon: Upload, color: "bg-purple-500", delay: 240 },
  ];

  const quickActions = [
    { icon: Clock, label: "Attendance", desc: "View records", path: "/dashboard/student/attendance", color: "bg-blue-500/10", iconColor: "text-blue-500" },
    { icon: BarChart3, label: "My Marks", desc: "Exam results", path: "/dashboard/student/marks", color: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    { icon: Calendar, label: "Timetable", desc: "Class schedule", path: "/dashboard/student/timetable", color: "bg-purple-500/10", iconColor: "text-purple-500" },
    { icon: IndianRupee, label: "Fee Details", desc: "Payments & dues", path: "/dashboard/student/fees", color: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    { icon: BookOpen, label: "Materials", desc: "Study resources", path: "/dashboard/student/materials", color: "bg-amber-500/10", iconColor: "text-amber-500" },
    { icon: Bell, label: "Notices", desc: "Updates", path: "/dashboard/student/notices", color: "bg-cyan-500/10", iconColor: "text-cyan-500" },
    { icon: Megaphone, label: "Announcements", desc: "Messages", path: "/dashboard/student/announcements", color: "bg-rose-500/10", iconColor: "text-rose-500" },
    { icon: User, label: "My Profile", desc: "View details", path: "/dashboard/student/profile", color: "bg-indigo-500/10", iconColor: "text-indigo-500" },
  ];

  const CHART_COLORS = ["hsl(215, 90%, 55%)", "hsl(145, 65%, 42%)", "hsl(42, 70%, 52%)", "hsl(280, 60%, 55%)", "hsl(0, 70%, 58%)", "hsl(180, 60%, 45%)", "hsl(330, 60%, 55%)", "hsl(60, 70%, 50%)"];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <SEOHead title="Student Dashboard" description="Student portal dashboard" noIndex />
      <BirthdayPopup />

      {/* Welcome Banner */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-3 py-1 mb-3">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="font-body text-[11px] text-primary font-semibold uppercase tracking-wider">Student Portal</span>
            </div>
            <h2 className="font-body text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {greeting}, {profile?.full_name?.split(" ")[0] || "Student"} 🎓
            </h2>
            <p className="font-body text-sm text-muted-foreground mt-1.5">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          {!statsLoading && data && (
            <div className="flex gap-3">
              <div className="bg-muted/40 rounded-xl px-4 py-2.5 text-center">
                <p className="font-body text-lg font-bold text-foreground">{data.semester || "—"}</p>
                <p className="font-body text-[10px] text-muted-foreground">Semester</p>
              </div>
              <div className="bg-muted/40 rounded-xl px-4 py-2.5 text-center">
                <p className="font-body text-sm font-bold text-foreground">{data.courseCode || "—"}</p>
                <p className="font-body text-[10px] text-muted-foreground">Course</p>
              </div>
              <div className="bg-muted/40 rounded-xl px-4 py-2.5 text-center">
                <p className="font-body text-sm font-bold text-foreground">{data.rollNumber || "—"}</p>
                <p className="font-body text-[10px] text-muted-foreground">Roll No</p>
              </div>
            </div>
          )}
        </div>
        {/* Daily Motivational Quote */}
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Star className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <p className="font-body text-xs text-muted-foreground/60 uppercase tracking-wider mb-1">Daily Inspiration</p>
              <p className="font-body text-sm text-muted-foreground italic leading-relaxed">
                {[
                  "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.",
                  "The beautiful thing about learning is that nobody can take it away from you.",
                  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
                  "The only way to do great work is to love what you do.",
                  "Your education is a dress rehearsal for a life that is yours to lead.",
                  "The expert in anything was once a beginner.",
                  "Don't let what you cannot do interfere with what you can do.",
                ][new Date().getDay()]}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Reminders */}
      {feeReminders.length > 0 && (
        <div className="relative overflow-hidden border-2 border-red-500/30 bg-gradient-to-r from-red-500/5 via-amber-500/5 to-red-500/5 rounded-2xl p-5 sm:p-6 animate-fade-in">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-body text-base font-bold text-red-500">Important Fee Reminders</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 font-body text-[10px] font-bold uppercase tracking-wider">
                  {feeReminders.length} Pending
                </span>
              </div>
              <div className="space-y-2.5">
                {feeReminders.map((r: any) => (
                  <div key={r.id} className="group relative bg-card/60 backdrop-blur-sm border border-red-500/10 rounded-xl p-3.5 hover:border-red-500/25 transition-all duration-300">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-semibold text-foreground">{r.title}</p>
                        <p className="font-body text-xs text-muted-foreground mt-1 break-words">{r.message}</p>
                        <p className="font-body text-[10px] text-muted-foreground/60 mt-1.5">
                          {format(new Date(r.created_at), "dd MMM yyyy, hh:mm a")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link to="/dashboard/student/fees" className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 font-body text-[11px] font-semibold hover:bg-red-500/20 transition-all duration-200">
                          Pay Now
                        </Link>
                        <button onClick={() => markReminderRead(r.id)} className="px-2 py-1 rounded-lg text-muted-foreground font-body text-[11px] hover:bg-muted/60 transition-all duration-200">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!statsLoading && data && (
        <div className={`border rounded-2xl p-4 sm:p-5 flex items-center gap-4 transition-all duration-300 ${
          data.todayStatus === "present" ? "bg-emerald-500/5 border-emerald-500/20" : data.todayStatus === "absent" ? "bg-red-500/5 border-red-500/20" : "bg-card border-border/60"
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            data.todayStatus === "present" ? "bg-emerald-500/10" : data.todayStatus === "absent" ? "bg-red-500/10" : "bg-muted/60"
          }`}>
            {data.todayStatus === "present" ? <CheckCircle className="w-6 h-6 text-emerald-500" />
            : data.todayStatus === "absent" ? <XCircle className="w-6 h-6 text-red-500" />
            : <Clock className="w-6 h-6 text-muted-foreground" />}
          </div>
          <div>
            <p className={`font-body text-base font-semibold ${data.todayStatus === "present" ? "text-emerald-500" : data.todayStatus === "absent" ? "text-red-500" : "text-muted-foreground"}`}>
              {data.todayStatus === "present" ? "You're Present Today" : data.todayStatus === "absent" ? "You're Marked Absent Today" : "No Attendance Marked Yet"}
            </p>
            <p className="font-body text-xs text-muted-foreground mt-0.5">
              {data.todayStatus === "none" ? "Your teacher hasn't marked attendance yet today" : "Today's attendance status"}
            </p>
          </div>
        </div>
      )}

      {/* Action Center */}
      <ActionCenter role="student" />

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      )}

      {/* ═══ NEW: GPA + Study Streak + Upcoming Events ═══ */}
      <div className="grid sm:grid-cols-3 gap-3">
        {/* GPA Card */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <p className="font-body text-[32px] font-bold text-foreground tabular-nums leading-none group-hover:text-amber-500 transition-colors duration-300">
            {data?.gpa ?? 0}<span className="text-base text-muted-foreground">/10</span>
          </p>
          <p className="font-body text-[11px] text-muted-foreground mt-1.5 uppercase tracking-wider">CGPA Score</p>
          <p className="font-body text-[10px] mt-1 text-muted-foreground/70">
            {(data?.gpa ?? 0) >= 9 ? "🌟 Outstanding!" : (data?.gpa ?? 0) >= 7 ? "👍 Good performance" : (data?.gpa ?? 0) >= 5 ? "📚 Keep improving" : "💪 Focus on studies"}
          </p>
        </div>

        {/* Study Streak */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            {!isLoggedToday && (
              <button onClick={logStudy} className="px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-500 font-body text-[11px] font-semibold hover:bg-orange-500/20 transition-all">
                <Zap className="w-3 h-3 inline mr-1" />Log Today
              </button>
            )}
          </div>
          <p className="font-body text-[32px] font-bold text-foreground tabular-nums leading-none">
            {streak}<span className="text-base text-muted-foreground ml-1">days</span>
          </p>
          <p className="font-body text-[11px] text-muted-foreground mt-1.5 uppercase tracking-wider">Study Streak</p>
          {isLoggedToday && <p className="font-body text-[10px] mt-1 text-emerald-500 font-medium">✓ Logged today</p>}
        </div>

        {/* Upcoming Events Mini */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.slice(0, 2).map((e: any) => (
                <div key={e.id} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/5 flex flex-col items-center justify-center shrink-0">
                    <span className="font-body text-[9px] text-purple-500 font-bold leading-none">{format(new Date(e.event_date), "MMM")}</span>
                    <span className="font-body text-xs font-bold text-foreground leading-none">{format(new Date(e.event_date), "d")}</span>
                  </div>
                  <p className="font-body text-[11px] font-medium text-foreground truncate">{e.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-body text-[11px] text-muted-foreground">No upcoming events</p>
          )}
          <p className="font-body text-[11px] text-muted-foreground mt-2 uppercase tracking-wider">Upcoming Events</p>
        </div>
      </div>

      {/* Attendance + Marks Rings */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Attendance Overview</h3>
          </div>
          {statsLoading ? (
            <Skeleton className="w-full h-40 rounded-xl" />
          ) : (
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <CircularProgress pct={attendancePct} size={110} stroke={10} color={attendanceColor} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`font-body text-xl font-bold ${attendanceTextColor} tabular-nums`}>{attendancePct}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-500/5">
                  <span className="font-body text-[12px] text-muted-foreground">Present</span>
                  <span className="font-body text-[13px] font-bold text-emerald-500 tabular-nums">{data?.present ?? 0}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-red-500/5">
                  <span className="font-body text-[12px] text-muted-foreground">Absent</span>
                  <span className="font-body text-[13px] font-bold text-red-500 tabular-nums">{data?.absent ?? 0}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                  <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${attendancePct}%`, background: attendanceColor }} />
                </div>
                <p className={`font-body text-[11px] font-medium ${attendancePct >= 75 ? "text-emerald-500" : "text-red-500"}`}>
                  {attendancePct >= 75 ? "✓ Criteria met" : `Need ${75 - attendancePct}% more`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Average Marks */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-500" />
            </div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Academic Performance</h3>
          </div>
          {statsLoading ? (
            <Skeleton className="w-full h-40 rounded-xl" />
          ) : (
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <CircularProgress pct={data?.avgMarks ?? 0} size={110} stroke={10} color="hsl(215, 90%, 55%)" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-body text-xl font-bold text-primary tabular-nums">{data?.avgMarks ?? 0}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="font-body text-[11px] text-muted-foreground">Average Score</p>
                  <p className="font-body text-2xl font-bold text-primary tabular-nums">{data?.avgMarks ?? 0}%</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <p className="font-body text-[11px] text-muted-foreground">Results Uploaded</p>
                  <p className="font-body text-lg font-bold text-foreground tabular-nums">{data?.totalSubjects ?? 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subject-wise Marks Chart */}
      <div className="grid md:grid-cols-1 gap-4">

        {/* Subject-wise Marks Chart */}
        {data?.subjectChartData && data.subjectChartData.length > 0 && (
          <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Award className="w-4 h-4 text-indigo-500" />
              </div>
              <h3 className="font-body text-[14px] font-semibold text-foreground">Subject Performance</h3>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.subjectChartData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="subject" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }} formatter={(v: number) => [`${v}%`, "Average"]} />
                  <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                    {data.subjectChartData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
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

      {/* Fee Overview with Semester Filter */}
      {feeData && (
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <IndianRupee className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="font-body text-[14px] font-semibold text-foreground">Fee Overview</h3>
            </div>
            <select
              value={feeSemFilter}
              onChange={e => setFeeSemFilter(e.target.value)}
              className="font-body text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All Semesters</option>
              {[1,2,3,4,5,6].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
            </select>
          </div>

          {(() => {
            const filteredPayments = feeSemFilter === "all"
              ? feeData.payments
              : feeData.payments.filter((p: any) => p.semester === parseInt(feeSemFilter));
            const totalPaid = filteredPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
            const totalFee = feeSemFilter === "all" ? (feeData.student.total_fee || 0) : (feeData.student.total_fee || 0) / 6;
            const due = Math.max(0, (feeSemFilter === "all" ? (feeData.student.total_fee || 0) : totalFee) - totalPaid);
            const pct = totalFee > 0 ? Math.min(100, Math.round((totalPaid / totalFee) * 100)) : 0;

            return (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-muted/30 rounded-xl p-3 text-center">
                    <p className="font-body text-lg font-bold text-foreground tabular-nums">₹{(feeSemFilter === "all" ? (feeData.student.total_fee || 0) : totalFee).toLocaleString()}</p>
                    <p className="font-body text-[10px] text-muted-foreground">Total Fee</p>
                  </div>
                  <div className="bg-emerald-500/5 rounded-xl p-3 text-center">
                    <p className="font-body text-lg font-bold text-emerald-600 tabular-nums">₹{totalPaid.toLocaleString()}</p>
                    <p className="font-body text-[10px] text-muted-foreground">Paid</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${due > 0 ? "bg-destructive/5" : "bg-emerald-500/5"}`}>
                    <p className={`font-body text-lg font-bold tabular-nums ${due > 0 ? "text-destructive" : "text-emerald-600"}`}>
                      {due > 0 ? `₹${due.toLocaleString()}` : "✓ Cleared"}
                    </p>
                    <p className="font-body text-[10px] text-muted-foreground">Remaining</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="font-body text-[10px] text-muted-foreground">Payment Progress</span>
                    <span className="font-body text-[10px] font-bold text-foreground">{pct}%</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{
                      width: `${pct}%`,
                      background: pct === 100 ? "hsl(142, 70%, 40%)" : pct > 50 ? "hsl(42, 87%, 55%)" : "hsl(0, 84%, 60%)"
                    }} />
                  </div>
                  {feeData.student.fee_due_date && (
                    <p className="font-body text-[10px] text-muted-foreground mt-1.5">
                      Due by: <span className="font-semibold">{format(new Date(feeData.student.fee_due_date), "MMM d, yyyy")}</span>
                    </p>
                  )}
                </div>

                {filteredPayments.length > 0 ? (
                  <div>
                    <h4 className="font-body text-[11px] font-bold text-foreground mb-2 uppercase tracking-wider">Payment History</h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {filteredPayments.slice(0, 10).map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center p-2.5 rounded-lg bg-muted/30 font-body text-xs">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                            <div>
                              <span className="font-semibold text-emerald-600">₹{Number(p.amount).toLocaleString()}</span>
                              <span className="text-muted-foreground ml-1.5">{p.payment_method}</span>
                              {p.semester && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">Sem {p.semester}</span>}
                            </div>
                          </div>
                          <span className="text-muted-foreground text-[10px]">{format(new Date(p.created_at), "MMM d")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="font-body text-xs text-muted-foreground text-center py-4">
                    {feeSemFilter === "all" ? "No payments recorded yet" : `No payments for Semester ${feeSemFilter}`}
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Notices + Announcements */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="font-body text-[14px] font-semibold text-foreground">Recent Notices</h3>
            </div>
            <Link to="/dashboard/student/notices" className="font-body text-[11px] text-primary flex items-center gap-0.5 hover:gap-1.5 transition-all duration-200">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {noticesLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : recentNotices.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="font-body text-sm text-muted-foreground">No notices yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentNotices.map((n: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200 border border-transparent hover:border-border/60">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-body text-[12px] font-medium text-foreground line-clamp-1">{n.title}</p>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-body font-semibold shrink-0 ${NOTICE_TYPE_COLORS[n.type] || NOTICE_TYPE_COLORS.General}`}>{n.type}</span>
                  </div>
                  {n.content && <p className="font-body text-[10px] text-muted-foreground mt-1 line-clamp-1">{n.content}</p>}
                  <p className="font-body text-[9px] text-muted-foreground/60 mt-1">{new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="font-body text-[14px] font-semibold text-foreground">Announcements</h3>
            </div>
            <Link to="/dashboard/student/announcements" className="font-body text-[11px] text-primary flex items-center gap-0.5 hover:gap-1.5 transition-all duration-200">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {announcementsLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : announcements.length === 0 ? (
            <div className="py-8 text-center">
              <Megaphone className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="font-body text-sm text-muted-foreground">No announcements yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {announcements.map((a: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-rose-500/5 hover:bg-rose-500/8 transition-colors duration-200 border border-transparent hover:border-rose-500/10">
                  <p className="font-body text-[12px] font-medium text-foreground line-clamp-1">{a.title}</p>
                  {a.content && <p className="font-body text-[10px] text-muted-foreground mt-1 line-clamp-2">{a.content}</p>}
                  <p className="font-body text-[9px] text-muted-foreground/60 mt-1">{new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Consensus AI Chatbot FAB */}
      <a
        href="https://consensus.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-300"
        aria-label="Open AI Research Assistant"
        style={{ animation: "chatbot-float 4.5s ease-in-out infinite" }}
      >
        <Bot className="w-6 h-6" />
      </a>
    </div>
  );
}

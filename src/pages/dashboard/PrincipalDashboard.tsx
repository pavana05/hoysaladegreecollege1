import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import { Users, GraduationCap, Award, Megaphone, Image, BookOpen, Settings, BarChart3, Activity, TrendingUp, Clock, IndianRupee, UserCheck, FileText, PieChart, Brain, Sparkles, ArrowRight, Inbox, CalendarDays, Ticket, Briefcase, ArrowUpCircle, LayoutGrid, Bell, MessageSquare, Wrench, ClipboardList, Cake, Trophy, GalleryVertical, FileSpreadsheet, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, PieChart as RePieChart, Pie } from "recharts";
import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ActionCenter from "@/components/ActionCenter";

const CHART_COLORS = ["hsl(215, 90%, 55%)", "hsl(145, 65%, 42%)", "hsl(42, 70%, 52%)", "hsl(280, 60%, 55%)"];
const PIE_COLORS = ["hsl(215, 90%, 55%)", "hsl(145, 65%, 42%)", "hsl(42, 70%, 52%)", "hsl(280, 60%, 55%)", "hsl(0, 70%, 58%)"];

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
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - animated / 100)} className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-body text-lg font-bold text-foreground tabular-nums">{Math.round(animated)}%</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color?: string }) {
  const { count, ref } = useAnimatedCounter(parseInt(value) || 0);
  return (
    <div ref={ref} className="bg-card border border-border/60 rounded-2xl p-5 hover:border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color || "bg-primary/10"}`}>
        <Icon className={`w-5 h-5 ${color ? "text-white" : "text-primary"}`} />
      </div>
      <p className="font-body text-[28px] font-bold text-foreground tracking-tight tabular-nums leading-none group-hover:text-primary transition-colors duration-300">{count}</p>
      <p className="font-body text-[12px] text-muted-foreground mt-1.5">{label}</p>
    </div>
  );
}

export default function PrincipalDashboard() {
  const { profile } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: counts, isLoading } = useQuery({
    queryKey: ["principal-stats", attDate],
    refetchInterval: 30000,
    queryFn: async () => {
      const [students, teachers, courses, notices, attendance, events, pendingApps] = await Promise.all([
        supabase.from("students").select("id, semester, course_id", { count: "exact" }).eq("is_active", true),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("notices").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("attendance").select("status").eq("date", attDate),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("admission_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      const semCounts: Record<number, number> = {};
      (students.data || []).forEach((s: any) => { semCounts[s.semester] = (semCounts[s.semester] || 0) + 1; });
      const att = attendance.data || [];
      const present = att.filter(a => a.status === "present").length;
      const pct = att.length > 0 ? Math.round((present / att.length) * 100) : 0;
      return { students: students.count || 0, teachers: teachers.count || 0, courses: courses.count || 0, notices: notices.count || 0, events: events.count || 0, pendingApps: pendingApps.count || 0, semesterBreakdown: semCounts, attendancePct: pct, totalAtt: att.length, presentAtt: present, studentData: students.data || [] };
    },
  });

  // Course distribution for pie chart
  const { data: courseDistribution = [] } = useQuery({
    queryKey: ["principal-course-dist"],
    queryFn: async () => {
      const { data: students } = await supabase.from("students").select("course_id, courses(name, code)").eq("is_active", true);
      if (!students) return [];
      const c: Record<string, { name: string; count: number }> = {};
      students.forEach((s: any) => { const n = s.courses?.code || "N/A"; if (!c[n]) c[n] = { name: n, count: 0 }; c[n].count++; });
      return Object.values(c);
    },
  });

  // Fee overview
  const { data: feeOverview } = useQuery({
    queryKey: ["principal-fee-overview"],
    queryFn: async () => {
      const { data: students } = await supabase.from("students").select("total_fee, fee_paid").eq("is_active", true);
      if (!students) return { totalFee: 0, totalPaid: 0, pending: 0, pct: 0 };
      const totalFee = students.reduce((s: number, x: any) => s + (Number(x.total_fee) || 0), 0);
      const totalPaid = students.reduce((s: number, x: any) => s + (Number(x.fee_paid) || 0), 0);
      return { totalFee, totalPaid, pending: totalFee - totalPaid, pct: totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 0 };
    },
  });

  // Recent activities
  const { data: recentActivity = [] } = useQuery({
    queryKey: ["principal-recent-activity"],
    refetchInterval: 30000,
    queryFn: async () => {
      const activities: any[] = [];
      const [apps, noticez, evts] = await Promise.all([
        supabase.from("admission_applications").select("id, full_name, course, status, created_at").order("created_at", { ascending: false }).limit(4),
        supabase.from("notices").select("id, title, type, created_at").order("created_at", { ascending: false }).limit(4),
        supabase.from("events").select("id, title, category, created_at").order("created_at", { ascending: false }).limit(3),
      ]);
      (apps.data || []).forEach((a: any) => activities.push({ id: a.id, icon: FileText, title: `Application: ${a.full_name}`, desc: `${a.course} · ${a.status}`, time: a.created_at, color: "text-orange-500", bg: "bg-orange-500/10" }));
      (noticez.data || []).forEach((n: any) => activities.push({ id: n.id, icon: Megaphone, title: `Notice: ${n.title}`, desc: n.type, time: n.created_at, color: "text-blue-500", bg: "bg-blue-500/10" }));
      (evts.data || []).forEach((e: any) => activities.push({ id: e.id, icon: Image, title: `Event: ${e.title}`, desc: e.category, time: e.created_at, color: "text-purple-500", bg: "bg-purple-500/10" }));
      return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
    },
  });

  const semesterData = [1,2,3,4,5,6].map(s => ({ name: `Sem ${s}`, students: counts?.semesterBreakdown?.[s] || 0 }));

  const stats = [
    { label: "Total Students", value: String(counts?.students ?? 0), icon: Users, color: "bg-blue-500" },
    { label: "Faculty Members", value: String(counts?.teachers ?? 0), icon: GraduationCap, color: "bg-emerald-500" },
    { label: "Active Courses", value: String(counts?.courses ?? 0), icon: BookOpen, color: "bg-amber-500" },
    { label: "Active Notices", value: String(counts?.notices ?? 0), icon: Megaphone, color: "bg-purple-500" },
    { label: "Active Events", value: String(counts?.events ?? 0), icon: Image, color: "bg-cyan-500" },
    { label: "Pending Apps", value: String(counts?.pendingApps ?? 0), icon: FileText, color: "bg-orange-500" },
  ];

  const actions = [
    // AI & Insights
    { icon: Brain, label: "AI Insights", desc: "Daily briefing & risk", path: "/dashboard/principal/ai-insights", color: "bg-primary/10", iconColor: "text-primary" },

    // People
    { icon: Users, label: "All Users", desc: "Students, teachers, staff", path: "/dashboard/admin/users", color: "bg-indigo-500/10", iconColor: "text-indigo-500" },
    { icon: Users, label: "Students", desc: "View all students", path: "/dashboard/principal/students", color: "bg-blue-500/10", iconColor: "text-blue-500" },
    { icon: GraduationCap, label: "Teachers", desc: "Manage faculty", path: "/dashboard/principal/teachers", color: "bg-rose-500/10", iconColor: "text-rose-500" },
    { icon: UserCheck, label: "Faculty Profiles", desc: "Public faculty page", path: "/dashboard/admin/faculty", color: "bg-pink-500/10", iconColor: "text-pink-500" },

    // Academics
    { icon: LayoutGrid, label: "Academics Hub", desc: "Courses, departments, seats", path: "/dashboard/admin/academics-hub", color: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    { icon: BookOpen, label: "Courses & Fees", desc: "Update details", path: "/dashboard/principal/courses", color: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    { icon: Building2, label: "Departments", desc: "Manage departments", path: "/dashboard/principal/departments", color: "bg-cyan-500/10", iconColor: "text-cyan-500" },
    { icon: CalendarDays, label: "Timetable", desc: "Class schedules", path: "/dashboard/admin/timetable", color: "bg-violet-500/10", iconColor: "text-violet-500" },
    { icon: ArrowUpCircle, label: "Promotion Hub", desc: "Semester & academic year", path: "/dashboard/admin/promotion-hub", color: "bg-amber-500/10", iconColor: "text-amber-500" },
    { icon: BarChart3, label: "Academic Overview", desc: "Performance analytics", path: "/dashboard/admin/academic-overview", color: "bg-sky-500/10", iconColor: "text-sky-500" },

    // Attendance & Exams
    { icon: ClipboardList, label: "Attendance Hub", desc: "Track & reports", path: "/dashboard/admin/attendance", color: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    { icon: Ticket, label: "Hall Tickets", desc: "Exam admit cards", path: "/dashboard/admin/hall-tickets", color: "bg-fuchsia-500/10", iconColor: "text-fuchsia-500" },

    // Finance
    { icon: IndianRupee, label: "Fee Management", desc: "Payments & dues", path: "/dashboard/admin/fees", color: "bg-amber-500/10", iconColor: "text-amber-500" },

    // Communication
    { icon: Inbox, label: "Inbox Hub", desc: "Applications & contacts", path: "/dashboard/admin/inbox", color: "bg-orange-500/10", iconColor: "text-orange-500" },
    { icon: Megaphone, label: "Notices", desc: "Publish updates", path: "/dashboard/principal/notices", color: "bg-blue-500/10", iconColor: "text-blue-500" },
    { icon: FileText, label: "Post Notice", desc: "Create announcement", path: "/dashboard/admin/post-notice", color: "bg-blue-500/10", iconColor: "text-blue-500" },
    { icon: Bell, label: "Broadcast", desc: "Push notifications", path: "/dashboard/admin/broadcast", color: "bg-rose-500/10", iconColor: "text-rose-500" },

    // Content & Media
    { icon: Image, label: "Events", desc: "Post events", path: "/dashboard/principal/events", color: "bg-purple-500/10", iconColor: "text-purple-500" },
    { icon: GalleryVertical, label: "Gallery", desc: "Photo albums", path: "/dashboard/admin/gallery", color: "bg-purple-500/10", iconColor: "text-purple-500" },
    { icon: FileSpreadsheet, label: "Banners & Papers", desc: "Popups & PYQs", path: "/dashboard/admin/banners", color: "bg-cyan-500/10", iconColor: "text-cyan-500" },
    { icon: Award, label: "Top Students", desc: "Update rankings", path: "/dashboard/principal/top-students", color: "bg-amber-500/10", iconColor: "text-amber-500" },
    { icon: Trophy, label: "Top Rankers CMS", desc: "Achievers grid", path: "/dashboard/admin/top-rankers", color: "bg-yellow-500/10", iconColor: "text-yellow-500" },

    // Career & Alumni
    { icon: Briefcase, label: "Career Hub", desc: "Jobs & scholarships", path: "/dashboard/admin/career-hub", color: "bg-teal-500/10", iconColor: "text-teal-500" },

    // Feedback & Logs
    { icon: MessageSquare, label: "Feedback & Logs", desc: "Complaints & activity", path: "/dashboard/admin/feedback-logs", color: "bg-orange-500/10", iconColor: "text-orange-500" },

    // Tools
    { icon: Wrench, label: "Tools Hub", desc: "Alumni, reports, more", path: "/dashboard/admin/tools", color: "bg-slate-500/10", iconColor: "text-slate-500" },
    { icon: Cake, label: "Birthday Settings", desc: "Wishes & quotes", path: "/dashboard/admin/birthday-settings", color: "bg-pink-500/10", iconColor: "text-pink-500" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <SEOHead title="Principal Dashboard" description="Principal dashboard" noIndex />
      {/* Welcome */}
      <div>
        <h2 className="font-body text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
          {greeting}, {profile?.full_name?.split(" ")[0] || "Principal"}
        </h2>
        <p className="font-body text-[13px] text-muted-foreground mt-1">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <ActionCenter role="principal" />

      {/* AI Insights Entry */}
      <Link
        to="/dashboard/principal/ai-insights"
        className="group relative overflow-hidden flex items-center gap-4 p-5 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card hover:border-primary/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-15px_hsl(var(--primary)/0.5)]"
      >
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
          <Brain className="w-5.5 h-5.5 text-primary-foreground" />
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-0.5">
            <Sparkles className="w-3 h-3 text-primary" /> New · AI Powered
          </div>
          <p className="font-body text-[14.5px] sm:text-base font-semibold text-foreground">Open AI Insights Engine</p>
          <p className="font-body text-[12px] text-muted-foreground mt-0.5">
            Daily briefing, dropout risk, exam predictor, anomaly alerts & smart search (⌘K)
          </p>
        </div>
        <ArrowRight className="relative w-4 h-4 text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
      </Link>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      )}

      {/* Summary Strip — Ratio, Attendance, Fee */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border/60 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-blue-500" /></div>
          </div>
          <p className="font-body text-2xl font-bold text-foreground tabular-nums">{counts ? `${Math.round((counts.students || 1) / Math.max(counts.teachers || 1, 1))}:1` : "—"}</p>
          <p className="font-body text-[11px] text-muted-foreground mt-0.5">Student-Teacher Ratio</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Clock className="w-4 h-4 text-emerald-500" /></div>
          </div>
          <p className="font-body text-2xl font-bold text-foreground tabular-nums">{counts?.attendancePct || 0}%</p>
          <p className="font-body text-[11px] text-muted-foreground mt-0.5">Today's Attendance</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><IndianRupee className="w-4 h-4 text-amber-500" /></div>
          </div>
          <p className="font-body text-2xl font-bold text-foreground tabular-nums">₹{((feeOverview?.totalPaid || 0) / 1000).toFixed(0)}K</p>
          <p className="font-body text-[11px] text-muted-foreground mt-0.5">Fee Collected</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center"><IndianRupee className="w-4 h-4 text-red-500" /></div>
          </div>
          <p className="font-body text-2xl font-bold text-foreground tabular-nums">₹{((feeOverview?.pending || 0) / 1000).toFixed(0)}K</p>
          <p className="font-body text-[11px] text-muted-foreground mt-0.5">Fee Pending</p>
        </div>
      </div>

      {/* Fee Collection Progress */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><IndianRupee className="w-4 h-4 text-amber-500" /></div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Fee Collection Progress</h3>
          </div>
          <span className="font-body text-xs text-muted-foreground">{feeOverview?.pct || 0}% collected</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${feeOverview?.pct || 0}%`, background: "linear-gradient(90deg, hsl(145, 65%, 42%), hsl(42, 70%, 52%))" }} />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="font-body text-lg font-bold text-foreground tabular-nums">₹{((feeOverview?.totalFee || 0) / 1000).toFixed(0)}K</p>
            <p className="font-body text-[10px] text-muted-foreground">Total Expected</p>
          </div>
          <div className="text-center">
            <p className="font-body text-lg font-bold text-emerald-500 tabular-nums">₹{((feeOverview?.totalPaid || 0) / 1000).toFixed(0)}K</p>
            <p className="font-body text-[10px] text-muted-foreground">Collected</p>
          </div>
          <div className="text-center">
            <p className="font-body text-lg font-bold text-red-500 tabular-nums">₹{((feeOverview?.pending || 0) / 1000).toFixed(0)}K</p>
            <p className="font-body text-[10px] text-muted-foreground">Pending</p>
          </div>
        </div>
      </div>

      {/* Attendance Detail with Date Picker */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Clock className="w-4 h-4 text-emerald-500" /></div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Attendance Overview</h3>
          </div>
          <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)}
            className="font-body text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-500/5 rounded-xl p-3 text-center">
            <p className="font-body text-2xl font-bold text-emerald-600 tabular-nums">{counts?.presentAtt || 0}</p>
            <p className="font-body text-[10px] text-muted-foreground">Present</p>
          </div>
          <div className="bg-red-500/5 rounded-xl p-3 text-center">
            <p className="font-body text-2xl font-bold text-red-500 tabular-nums">{(counts?.totalAtt || 0) - (counts?.presentAtt || 0)}</p>
            <p className="font-body text-[10px] text-muted-foreground">Absent</p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 text-center flex flex-col items-center justify-center">
            <CircularProgress pct={counts?.attendancePct || 0} size={56} stroke={5} color="hsl(145, 65%, 42%)" />
            <p className="font-body text-[10px] text-muted-foreground mt-1">Rate</p>
          </div>
        </div>
        {(counts?.totalAtt || 0) === 0 && <p className="font-body text-xs text-muted-foreground text-center mt-3">No attendance records for this date</p>}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Students by Semester */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center"><Activity className="w-4 h-4 text-cyan-500" /></div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Students by Semester</h3>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={semesterData}>
                <defs>
                  <linearGradient id="principalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(215, 90%, 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(215, 90%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 16, fontFamily: "Inter", fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                <Area type="monotone" dataKey="students" stroke="hsl(215, 90%, 55%)" fill="url(#principalGrad)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(215, 90%, 55%)", strokeWidth: 2, stroke: "hsl(var(--card))" }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Course Distribution Pie */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><PieChart className="w-4 h-4 text-purple-500" /></div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Course Distribution</h3>
          </div>
          {courseDistribution.length > 0 ? (
            <div className="h-52 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={courseDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={3} dataKey="count" nameKey="name">
                    {courseDistribution.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontFamily: "Inter", fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center"><p className="text-sm text-muted-foreground">No data</p></div>
          )}
          {courseDistribution.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {courseDistribution.map((c: any, i: number) => (
                <div key={c.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="font-body text-[11px] text-muted-foreground">{c.name}: {c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity + Management */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <h3 className="font-body text-[14px] font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center"><Activity className="w-4 h-4 text-orange-500" /></div>
            Recent Activity
          </h3>
          {recentActivity.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {recentActivity.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className={`w-8 h-8 rounded-lg ${a.bg} flex items-center justify-center shrink-0`}>
                    <a.icon className={`w-4 h-4 ${a.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-[12px] font-medium text-foreground truncate">{a.title}</p>
                    <p className="font-body text-[10px] text-muted-foreground truncate">{a.desc}</p>
                  </div>
                  <span className="font-body text-[9px] text-muted-foreground shrink-0">
                    {new Date(a.time).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Management Actions */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <h3 className="font-body text-[14px] font-semibold text-foreground mb-4">Management</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {actions.map((a) => (
              <Link key={a.label} to={a.path} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
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

      {/* Semester Grid */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
        <h3 className="font-body text-[14px] font-semibold text-foreground mb-4">Semester Breakdown</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[1,2,3,4,5,6].map((sem, i) => (
            <div key={sem} className="text-center p-3 rounded-xl border border-border/40 hover:border-border hover:shadow-md transition-all duration-300" style={{ background: `${CHART_COLORS[i % CHART_COLORS.length]}10` }}>
              <p className="font-body text-xl font-bold text-foreground tabular-nums">{counts?.semesterBreakdown?.[sem] || 0}</p>
              <p className="font-body text-[10px] text-muted-foreground mt-0.5 font-medium">Sem {sem}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

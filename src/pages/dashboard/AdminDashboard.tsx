import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import { Users, GraduationCap, BookOpen, Calendar, FileText, Settings, Mail, TrendingUp, Trophy, Shield, Image, BarChart3, PieChart, Megaphone, ArrowUpCircle, Download, UserX, CalendarDays, AlertTriangle, IndianRupee, UserPlus, Activity, Clock, Target, Bell, Cake, CreditCard, CheckCircle2, XCircle, UserCheck, FileCheck, Wallet, Star, Zap, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, AreaChart, Area, LineChart, Line, RadialBarChart, RadialBar, Legend } from "recharts";
import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ActionCenter from "@/components/ActionCenter";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { format, formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CHART_COLORS = [
  "hsl(215, 90%, 55%)", "hsl(145, 65%, 42%)", "hsl(42, 70%, 52%)", "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 58%)", "hsl(180, 60%, 45%)", "hsl(330, 60%, 55%)", "hsl(60, 70%, 50%)"
];

const PIE_COLORS = ["hsl(215, 90%, 55%)", "hsl(145, 65%, 42%)", "hsl(42, 70%, 52%)", "hsl(280, 60%, 55%)"];

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

function CircularProgress({ pct, size = 96, stroke = 8, color = "hsl(var(--primary))", label = "" }: { pct: number; size?: number; stroke?: number; color?: string; label?: string }) {
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
        {label && <span className="font-body text-[9px] text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, trend }: { label: string; value: string; icon: React.ElementType; color?: string; trend?: string }) {
  const { count, ref } = useAnimatedCounter(parseInt(value) || 0);
  return (
    <div ref={ref} className="bg-card border border-border/60 rounded-2xl p-5 hover:border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color || "bg-primary/10"}`}>
          <Icon className={`w-5 h-5 ${color ? "text-white" : "text-primary"}`} />
        </div>
        {trend && (
          <span className="font-body text-[10px] text-emerald-500 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> {trend}
          </span>
        )}
      </div>
      <p className="font-body text-[32px] font-bold text-foreground tracking-tight tabular-nums leading-none group-hover:text-primary transition-colors duration-300">{count}</p>
      <p className="font-body text-[12px] text-muted-foreground mt-1.5">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const [birthdayDialogOpen, setBirthdayDialogOpen] = useState(false);
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);
  const [feeChartCourse, setFeeChartCourse] = useState("all");
  const [feeChartSem, setFeeChartSem] = useState("all");
  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: ["admin-stats"],
    staleTime: 1000 * 60 * 3,
    refetchInterval: 60000,
    queryFn: async () => {
      const [students, teachers, courses, events, pendingApps, contacts] = await Promise.all([
        supabase.from("students").select("id, semester, admission_year, course_id", { count: "exact" }).eq("is_active", true),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("admission_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("contact_submissions").select("id", { count: "exact", head: true }).eq("status", "new"),
      ]);
      const semCounts: Record<number, number> = {};
      const yearCounts: Record<number, number> = {};
      (students.data || []).forEach((s: any) => {
        semCounts[s.semester] = (semCounts[s.semester] || 0) + 1;
        if (s.admission_year) yearCounts[s.admission_year] = (yearCounts[s.admission_year] || 0) + 1;
      });
      return { students: students.count || 0, teachers: teachers.count || 0, courses: courses.count || 0, events: events.count || 0, pendingApps: pendingApps.count || 0, newContacts: contacts.count || 0, semesterBreakdown: semCounts, yearBreakdown: yearCounts };
    },
  });

  const { data: courseDistribution = [] } = useQuery({
    queryKey: ["admin-course-distribution"],
    queryFn: async () => {
      const { data: students } = await supabase.from("students").select("course_id, courses(name, code)").eq("is_active", true);
      if (!students) return [];
      const counts: Record<string, { name: string; count: number }> = {};
      students.forEach((s: any) => {
        const name = s.courses?.code || "Unassigned";
        if (!counts[name]) counts[name] = { name, count: 0 };
        counts[name].count++;
      });
      return Object.values(counts);
    },
  });

  const { data: coursesList = [] } = useQuery({
    queryKey: ["admin-courses-list-dashboard"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: roleDistribution = [] } = useQuery({
    queryKey: ["admin-role-distribution"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role");
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach(r => { counts[r.role] = (counts[r.role] || 0) + 1; });
      return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
    },
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ["admin-attendance-stats", attDate],
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("status").eq("date", attDate);
      if (!data) return { total: 0, present: 0, percentage: 0 };
      const total = data.length;
      const present = data.filter(a => a.status === "present").length;
      return { total, present, percentage: total > 0 ? Math.round((present / total) * 100) : 0 };
    },
  });

  const { data: feeDefaulters = [] } = useQuery({
    queryKey: ["admin-fee-defaulters"],
    queryFn: async () => {
      const { data: students } = await supabase
        .from("students")
        .select("id, roll_number, semester, user_id, courses(name, code)")
        .eq("is_active", true);

      if (!students?.length) return [];

      const studentIds = students.map((s: any) => s.id);
      const [{ data: semesterFees }, { data: payments }] = await Promise.all([
        supabase
          .from("semester_fees")
          .select("student_id, semester, fee_amount")
          .in("student_id", studentIds),
        supabase
          .from("fee_payments")
          .select("student_id, semester, amount")
          .in("student_id", studentIds),
      ]);

      const semFeeMap: Record<string, Record<number, number>> = {};
      (semesterFees || []).forEach((sf: any) => {
        if (!semFeeMap[sf.student_id]) semFeeMap[sf.student_id] = {};
        semFeeMap[sf.student_id][sf.semester] = Number(sf.fee_amount || 0);
      });

      const semPayMap: Record<string, Record<number, number>> = {};
      (payments || []).forEach((p: any) => {
        if (!p.student_id || !p.semester) return;
        if (!semPayMap[p.student_id]) semPayMap[p.student_id] = {};
        semPayMap[p.student_id][p.semester] = (semPayMap[p.student_id][p.semester] || 0) + Number(p.amount || 0);
      });

      const defaulters = students
        .map((s: any) => {
          const curSem = s.semester || 1;
          const curSemFee = Number(semFeeMap[s.id]?.[curSem] || 0);
          if (curSemFee <= 0) return null;
          const curSemPaid = Number(semPayMap[s.id]?.[curSem] || 0);
          const due = Math.max(0, curSemFee - curSemPaid);
          if (due <= 0) return null;
          return { ...s, due };
        })
        .filter(Boolean) as any[];

      if (defaulters.length === 0) return [];

      const userIds = defaulters.map((s: any) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);

      return defaulters
        .map((s: any) => ({
          ...s,
          name: profiles?.find((p: any) => p.user_id === s.user_id)?.full_name || s.roll_number,
        }))
        .sort((a: any, b: any) => b.due - a.due)
        .slice(0, 10);
    },
  });

  // Semester-wise fee collection breakdown
  const { data: semFeeData = [] } = useQuery({
    queryKey: ["admin-semester-fee-breakdown", feeChartCourse],
    queryFn: async () => {
      let paymentsQ = supabase.from("fee_payments").select("semester, amount, student_id");
      let studentsQ = supabase.from("students").select("id, semester, total_fee, fee_paid, course_id").eq("is_active", true);
      if (feeChartCourse !== "all") {
        studentsQ = studentsQ.eq("course_id", feeChartCourse);
      }
      const [{ data: payments }, { data: students }] = await Promise.all([paymentsQ, studentsQ]);
      if (!payments && !students) return [];
      const studentIds = new Set((students || []).map((s: any) => s.id));
      const semData: Record<number, { collected: number; pending: number; total: number }> = {};
      [1,2,3,4,5,6].forEach(s => { semData[s] = { collected: 0, pending: 0, total: 0 }; });
      (payments || []).forEach((p: any) => {
        if (feeChartCourse !== "all" && !studentIds.has(p.student_id)) return;
        const sem = p.semester || 1;
        if (semData[sem]) semData[sem].collected += Number(p.amount) || 0;
      });
      (students || []).forEach((s: any) => {
        const sem = s.semester || 1;
        if (semData[sem]) {
          semData[sem].total += Number(s.total_fee) || 0;
          semData[sem].pending += Math.max(0, (Number(s.total_fee) || 0) - (Number(s.fee_paid) || 0));
        }
      });
      return [1,2,3,4,5,6].map(s => ({
        name: `Sem ${s}`,
        sem: s,
        collected: semData[s].collected,
        pending: semData[s].pending,
        total: semData[s].total,
      }));
    },
  });

  const filteredSemFeeData = feeChartSem === "all" ? semFeeData : semFeeData.filter((d: any) => d.sem === Number(feeChartSem));

  // Recent fee transactions
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ["admin-recent-fee-transactions"],
    staleTime: 1000 * 60 * 3,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data: payments } = await supabase.from("fee_payments").select("id, amount, payment_date, payment_method, semester, student_id, created_at, receipt_number").order("created_at", { ascending: false }).limit(8);
      if (!payments?.length) return [];
      const studentIds = payments.map(p => p.student_id).filter(Boolean);
      const { data: students } = await supabase.from("students").select("id, roll_number, user_id").in("id", studentIds);
      const userIds = (students || []).map(s => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return payments.map((p: any) => {
        const stu = students?.find(s => s.id === p.student_id);
        const prof = profiles?.find(pr => pr.user_id === stu?.user_id);
        return { ...p, studentName: prof?.full_name || stu?.roll_number || "Unknown", rollNumber: stu?.roll_number || "" };
      });
    },
  });

  // Institution health score
  const healthScore = (() => {
    if (!counts || !attendanceStats) return 0;
    let score = 0;
    // Attendance component (40%)
    score += Math.min(40, (attendanceStats.percentage / 100) * 40);
    // Student enrollment (20%)
    score += Math.min(20, counts.students > 0 ? 20 : 0);
    // Course offering (15%)
    score += Math.min(15, counts.courses > 0 ? 15 : 0);
    // Pending applications handled (15%) - fewer pending = better
    score += Math.min(15, counts.pendingApps === 0 ? 15 : Math.max(0, 15 - counts.pendingApps));
    // Messages handled (10%)
    score += Math.min(10, counts.newContacts === 0 ? 10 : Math.max(0, 10 - counts.newContacts));
    return Math.round(score);
  })();

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["admin-recent-activity"],
    staleTime: 1000 * 60 * 3,
    refetchInterval: 60000,
    queryFn: async () => {
      const activities: any[] = [];
      
      const [recentApps, recentNotices, recentEvents, recentAttendance] = await Promise.all([
        supabase.from("admission_applications").select("id, full_name, course, status, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("notices").select("id, title, type, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("events").select("id, title, category, created_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("attendance").select("id, date, status, created_at").order("created_at", { ascending: false }).limit(3),
      ]);

      (recentApps.data || []).forEach((a: any) => activities.push({
        id: a.id, type: "application", icon: FileCheck,
        title: `New Application: ${a.full_name}`,
        desc: `Applied for ${a.course} · ${a.status}`,
        time: a.created_at, color: "text-orange-500", bg: "bg-orange-500/10",
      }));
      (recentNotices.data || []).forEach((n: any) => activities.push({
        id: n.id, type: "notice", icon: Megaphone,
        title: `Notice: ${n.title}`,
        desc: n.type,
        time: n.created_at, color: "text-blue-500", bg: "bg-blue-500/10",
      }));
      (recentEvents.data || []).forEach((e: any) => activities.push({
        id: e.id, type: "event", icon: Calendar,
        title: `Event: ${e.title}`,
        desc: e.category,
        time: e.created_at, color: "text-purple-500", bg: "bg-purple-500/10",
      }));
      (recentAttendance.data || []).forEach((a: any) => activities.push({
        id: a.id, type: "attendance", icon: UserCheck,
        title: `Attendance marked`,
        desc: `${a.status} · ${a.date}`,
        time: a.created_at, color: "text-emerald-500", bg: "bg-emerald-500/10",
      }));

      return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
    },
  });

  // System Notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["admin-notifications"],
    staleTime: 1000 * 60 * 3,
    refetchInterval: 60000,
    queryFn: async () => {
      const alerts: any[] = [];
      const today = new Date().toISOString().split("T")[0];
      
      // Pending applications
      const { count: pendingCount } = await supabase.from("admission_applications").select("id", { count: "exact", head: true }).eq("status", "pending");
      if ((pendingCount || 0) > 0) alerts.push({ id: "pending-apps", type: "warning", icon: FileText, title: `${pendingCount} pending applications`, desc: "Review and process new admissions", path: "/dashboard/admin/applications", color: "text-orange-500", bg: "bg-orange-500/10" });

      // New contact messages
      const { count: msgCount } = await supabase.from("contact_submissions").select("id", { count: "exact", head: true }).eq("status", "new");
      if ((msgCount || 0) > 0) alerts.push({ id: "new-msgs", type: "info", icon: Mail, title: `${msgCount} unread messages`, desc: "Check new contact submissions", path: "/dashboard/admin/contacts", color: "text-blue-500", bg: "bg-blue-500/10" });

      // Fee defaulters
      const { data: feeStudents } = await supabase.from("students").select("total_fee, fee_paid").eq("is_active", true).gt("total_fee", 0);
      const defaulterCount = (feeStudents || []).filter((s: any) => ((s.total_fee || 0) - (s.fee_paid || 0)) > 0).length;
      if (defaulterCount > 0) alerts.push({ id: "fee-due", type: "warning", icon: CreditCard, title: `${defaulterCount} students with fee dues`, desc: "Track and follow up on payments", path: "/dashboard/admin/fees", color: "text-red-500", bg: "bg-red-500/10" });

      // Upcoming events
      const { data: upcomingEvents } = await supabase.from("events").select("id, title, event_date").eq("is_active", true).gte("event_date", today).order("event_date").limit(3);
      if ((upcomingEvents || []).length > 0) alerts.push({ id: "upcoming-events", type: "info", icon: Calendar, title: `${upcomingEvents!.length} upcoming events`, desc: upcomingEvents![0].title, path: "/dashboard/admin/events", color: "text-purple-500", bg: "bg-purple-500/10" });

      // Today's birthdays
      const todayMonth = new Date().getMonth() + 1;
      const todayDay = new Date().getDate();
      const { data: birthdayStudents } = await supabase.from("students").select("id, user_id, date_of_birth").eq("is_active", true).not("date_of_birth", "is", null);
      const todayBdays = (birthdayStudents || []).filter((s: any) => {
        if (!s.date_of_birth) return false;
        const d = new Date(s.date_of_birth);
        return d.getMonth() + 1 === todayMonth && d.getDate() === todayDay;
      });
      if (todayBdays.length > 0) alerts.push({ id: "birthdays", type: "info", icon: Cake, title: `${todayBdays.length} student birthday(s) today`, desc: "Send birthday wishes", color: "text-pink-500", bg: "bg-pink-500/10", isBirthday: true });

      return alerts;
    },
  });

  // Birthday students query for dialog
  const { data: birthdayStudentsList = [] } = useQuery({
    queryKey: ["admin-birthday-students"],
    queryFn: async () => {
      const todayMonth = new Date().getMonth() + 1;
      const todayDay = new Date().getDate();
      const { data: students } = await supabase.from("students").select("id, user_id, date_of_birth, roll_number").eq("is_active", true).not("date_of_birth", "is", null);
      if (!students) return [];
      const todayBdays = students.filter((s: any) => {
        const d = new Date(s.date_of_birth);
        return d.getMonth() + 1 === todayMonth && d.getDate() === todayDay;
      });
      if (todayBdays.length === 0) return [];
      const userIds = todayBdays.map((s: any) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
      return todayBdays.map((s: any) => ({
        ...s,
        name: profiles?.find((p: any) => p.user_id === s.user_id)?.full_name || s.roll_number,
        email: profiles?.find((p: any) => p.user_id === s.user_id)?.email || "",
      }));
    },
  });

  const exportStudentsCSV = async () => {
    toast.info("Generating CSV...");
    const { data: students } = await supabase.from("students").select("roll_number, semester, year_level, admission_year, parent_phone, phone, total_fee, fee_paid, fee_due_date, user_id, courses(name, code)").eq("is_active", true).order("roll_number");
    if (!students || students.length === 0) { toast.error("No students to export"); return; }
    const userIds = students.map(s => s.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", userIds);
    const rows = students.map((s: any) => {
      const p = profiles?.find((pr: any) => pr.user_id === s.user_id);
      return [s.roll_number, p?.full_name || "", p?.email || "", p?.phone || s.phone || "", s.courses?.name || "", s.courses?.code || "", s.semester, s.year_level, s.admission_year, s.parent_phone || "", s.total_fee || 0, s.fee_paid || 0, (s.total_fee || 0) - (s.fee_paid || 0), s.fee_due_date || ""].join(",");
    });
    const csv = "Roll,Name,Email,Phone,Course,Code,Semester,Year,AdmissionYear,ParentPhone,TotalFee,FeePaid,FeeDue,DueDate\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `students_export_${new Date().toISOString().split("T")[0]}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  const stats = [
    { label: "Total Students", value: String(counts?.students ?? 0), icon: Users, color: "bg-blue-500", trend: "Active" },
    { label: "Total Teachers", value: String(counts?.teachers ?? 0), icon: GraduationCap, color: "bg-emerald-500" },
    { label: "Active Courses", value: String(counts?.courses ?? 0), icon: BookOpen, color: "bg-amber-500" },
    { label: "Total Events", value: String(counts?.events ?? 0), icon: Calendar, color: "bg-purple-500" },
  ];

  const quickActions = [
    { icon: BookOpen, label: "Courses", desc: "Add & edit courses", path: "/dashboard/admin/courses", color: "bg-blue-500/10", iconColor: "text-blue-500" },
    { icon: Megaphone, label: "Post Notice", desc: "Publish announcements", path: "/dashboard/admin/post-notice", color: "bg-amber-500/10", iconColor: "text-amber-500" },
    { icon: ArrowUpCircle, label: "Semester Promotion", desc: "Promote students", path: "/dashboard/admin/semester-promotion", color: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    { icon: CalendarDays, label: "Academic Years", desc: "Manage sessions", path: "/dashboard/admin/academic-years", color: "bg-purple-500/10", iconColor: "text-purple-500" },
    { icon: UserX, label: "Absent Report", desc: "View absent students", path: "/dashboard/admin/absent-report", color: "bg-red-500/10", iconColor: "text-red-500" },
    { icon: FileText, label: "Applications", desc: `${counts?.pendingApps || 0} pending`, path: "/dashboard/admin/applications", badge: counts?.pendingApps, color: "bg-teal-500/10", iconColor: "text-teal-500" },
    { icon: Mail, label: "Messages", desc: `${counts?.newContacts || 0} new`, path: "/dashboard/admin/contacts", badge: counts?.newContacts, color: "bg-orange-500/10", iconColor: "text-orange-500" },
    { icon: Users, label: "Manage Users", desc: "View & edit users", path: "/dashboard/admin/users", color: "bg-cyan-500/10", iconColor: "text-cyan-500" },
    { icon: UserPlus, label: "Add Staff", desc: "Create accounts", path: "/dashboard/admin/add-staff", color: "bg-indigo-500/10", iconColor: "text-indigo-500" },
    { icon: Calendar, label: "Timetable", desc: "Class schedules", path: "/dashboard/admin/timetable", color: "bg-rose-500/10", iconColor: "text-rose-500" },
    { icon: Image, label: "Events", desc: "Post events", path: "/dashboard/admin/events", color: "bg-pink-500/10", iconColor: "text-pink-500" },
    { icon: Shield, label: "Roles", desc: "Role distribution", path: "/dashboard/admin/roles", color: "bg-violet-500/10", iconColor: "text-violet-500" },
    { icon: Settings, label: "Settings", desc: "System health", path: "/dashboard/admin/settings", color: "bg-slate-500/10", iconColor: "text-slate-500" },
    { icon: GraduationCap, label: "Alumni", desc: "Success stories", path: "/dashboard/admin/alumni", color: "bg-lime-500/10", iconColor: "text-lime-500" },
    { icon: Bell, label: "Broadcast", desc: "Send notifications", path: "/dashboard/admin/broadcast", color: "bg-yellow-500/10", iconColor: "text-yellow-500" },
  ];

  // Semester chart data
  const semesterChartData = [1,2,3,4,5,6].map(s => ({
    name: `Sem ${s}`,
    students: counts?.semesterBreakdown?.[s] || 0,
  }));

  // Enrollment trend data
  const enrollmentData = Object.entries(counts?.yearBreakdown || {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, count]) => ({ year: String(year), students: count }));

  // Radial bar data for attendance
  const radialData = [
    { name: "Attendance", value: attendanceStats?.percentage || 0, fill: "hsl(145, 65%, 42%)" },
  ];

  if (countsLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <SEOHead title="Admin Dashboard" description="Admin dashboard" noIndex />
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-body text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
            {greeting}, {profile?.full_name?.split(" ")[0] || "Admin"}
          </h2>
          <p className="font-body text-[13px] text-muted-foreground mt-1">Here's an overview of your institution.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-card border border-border/60 rounded-xl px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-body text-xs text-muted-foreground">System Online</span>
          </div>
          <div className="bg-card border border-border/60 rounded-xl px-4 py-2 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-body text-xs text-muted-foreground">{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </div>
      </div>

      {/* Action Center */}
      <ActionCenter role="admin" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Institution Health Score + KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Health Score */}
        <div className="bg-card border border-border/60 rounded-2xl p-4 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <Heart className="w-4 h-4 text-pink-500" />
            </div>
          </div>
          <p className={`font-body text-2xl font-bold tabular-nums ${healthScore >= 80 ? "text-emerald-500" : healthScore >= 50 ? "text-amber-500" : "text-red-500"}`}>{healthScore}%</p>
          <p className="font-body text-[11px] text-muted-foreground mt-0.5">Health Score</p>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${healthScore}%`, background: healthScore >= 80 ? "hsl(145, 65%, 42%)" : healthScore >= 50 ? "hsl(42, 70%, 52%)" : "hsl(0, 70%, 58%)" }} />
          </div>
        </div>

        <Link to="/dashboard/admin/applications" className="bg-card border border-border/60 rounded-2xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-orange-500" />
            </div>
          </div>
          <p className="font-body text-2xl font-bold text-foreground tabular-nums">{counts?.pendingApps || 0}</p>
          <p className="font-body text-[11px] text-muted-foreground mt-0.5">Pending Apps</p>
        </Link>
        <Link to="/dashboard/admin/contacts" className="bg-card border border-border/60 rounded-2xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <p className="font-body text-2xl font-bold text-foreground tabular-nums">{counts?.newContacts || 0}</p>
          <p className="font-body text-[11px] text-muted-foreground mt-0.5">New Messages</p>
        </Link>
        <div className="bg-card border border-border/60 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <p className="font-body text-2xl font-bold text-foreground tabular-nums">{attendanceStats?.percentage || 0}%</p>
          <p className="font-body text-[11px] text-muted-foreground mt-0.5">Attendance Rate</p>
        </div>
      </div>

      {/* System Notifications + Activity Feed */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Notifications */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">System Alerts</h3>
            {notifications.length > 0 && (
              <span className="font-body text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold">{notifications.length}</span>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/30 mx-auto mb-2" />
              <p className="font-body text-[13px] text-muted-foreground">All clear — no pending alerts</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {notifications.map((n: any) => {
                if (n.isBirthday) {
                  return (
                    <button
                      key={n.id}
                      onClick={() => setBirthdayDialogOpen(true)}
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 group w-full text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg ${n.bg} flex items-center justify-center shrink-0`}>
                        <n.icon className={`w-4 h-4 ${n.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-[12px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{n.title}</p>
                        <p className="font-body text-[10px] text-muted-foreground truncate">{n.desc}</p>
                      </div>
                    </button>
                  );
                }
                return (
                  <Link
                    key={n.id}
                    to={n.path || "#"}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 group"
                  >
                    <div className={`w-8 h-8 rounded-lg ${n.bg} flex items-center justify-center shrink-0`}>
                      <n.icon className={`w-4 h-4 ${n.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-[12px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{n.title}</p>
                      <p className="font-body text-[10px] text-muted-foreground truncate">{n.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-cyan-500" />
            </div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Recent Activity</h3>
          </div>
          {recentActivity.length === 0 ? (
            <p className="font-body text-[13px] text-muted-foreground text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-1 max-h-[280px] overflow-y-auto">
              {recentActivity.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors duration-200">
                  <div className={`w-7 h-7 rounded-lg ${a.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <a.icon className={`w-3.5 h-3.5 ${a.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-[11px] font-medium text-foreground truncate">{a.title}</p>
                    <p className="font-body text-[10px] text-muted-foreground">{a.desc}</p>
                  </div>
                  <span className="font-body text-[9px] text-muted-foreground shrink-0 mt-1">
                    {formatDistanceToNow(new Date(a.time), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analytics Section — Colorful Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Course Distribution - Bar */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-500" />
            </div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Students by Course</h3>
          </div>
          <div className="h-52">
            {courseDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseDistribution} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 16, fontFamily: "Inter", fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }} cursor={{ fill: "hsl(var(--muted) / 0.3)", radius: 8 }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {courseDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <Skeleton className="w-full h-full rounded-xl" />}
          </div>
        </div>

        {/* Fee Defaulters — fills right side */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Fee Defaulters</h3>
            {feeDefaulters.length > 0 && <span className="font-body text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">{feeDefaulters.length}</span>}
          </div>
          {feeDefaulters.length === 0 ? (
            <p className="font-body text-[13px] text-muted-foreground text-center py-8">No fee defaulters found</p>
          ) : (
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
              {feeDefaulters.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
                  <div className="min-w-0">
                    <p className="font-body text-[13px] font-medium text-foreground truncate">{s.name}</p>
                    <p className="font-body text-[11px] text-muted-foreground">{s.roll_number} · {s.courses?.code || "—"}</p>
                  </div>
                  <p className="font-body text-[13px] font-semibold text-red-500 shrink-0 ml-3 tabular-nums">₹{s.due.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enrollment Trend — full width when present */}
      {enrollmentData.length > 1 && (
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Enrollment Trend</h3>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 16, fontFamily: "Inter", fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                <Line type="monotone" dataKey="students" stroke="hsl(42, 70%, 52%)" strokeWidth={3} dot={{ r: 5, fill: "hsl(42, 70%, 52%)", strokeWidth: 2, stroke: "hsl(var(--card))" }} activeDot={{ r: 7, fill: "hsl(42, 70%, 52%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Semester + Attendance Circular */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Semester Area Chart */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-cyan-500" />
            </div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Students by Semester</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={semesterChartData}>
                <defs>
                  <linearGradient id="semGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(215, 90%, 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(215, 90%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 16, fontFamily: "Inter", fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                <Area type="monotone" dataKey="students" stroke="hsl(215, 90%, 55%)" fill="url(#semGrad)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(215, 90%, 55%)", strokeWidth: 2, stroke: "hsl(var(--card))" }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Circular Progress */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="font-body text-[14px] font-semibold text-foreground">Attendance Overview</h3>
            </div>
            <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)}
              className="font-body text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex items-center gap-6">
            <CircularProgress pct={attendanceStats?.percentage || 0} size={110} stroke={10} color="hsl(145, 65%, 42%)" label="Rate" />
            <div className="flex-1 space-y-3">
              <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
                <p className="font-body text-[11px] text-muted-foreground">Present</p>
                <p className="font-body text-xl font-bold text-emerald-500 tabular-nums">{attendanceStats?.present || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/15">
                <p className="font-body text-[11px] text-muted-foreground">Absent</p>
                <p className="font-body text-xl font-bold text-red-500 tabular-nums">{(attendanceStats?.total || 0) - (attendanceStats?.present || 0)}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40">
                <p className="font-body text-[11px] text-muted-foreground">Total Records</p>
                <p className="font-body text-xl font-bold text-foreground tabular-nums">{attendanceStats?.total || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Semester-wise Fee Collection Chart */}
      {(semFeeData.length > 0) && (
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="font-body text-[14px] font-semibold text-foreground">Semester-wise Fee Collection</h3>
            <div className="flex items-center gap-2 ml-auto">
              <select value={feeChartCourse} onChange={e => setFeeChartCourse(e.target.value)} className="border border-border rounded-xl px-3 py-1.5 font-body text-[11px] bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="all">All Courses</option>
                {coursesList.map((c: any) => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
              <select value={feeChartSem} onChange={e => setFeeChartSem(e.target.value)} className="border border-border rounded-xl px-3 py-1.5 font-body text-[11px] bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="all">All Semesters</option>
                {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
          </div>
          {filteredSemFeeData.some((d: any) => d.collected > 0 || d.pending > 0 || d.total > 0) ? (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredSemFeeData} barGap={4} style={{ backgroundColor: "hsl(var(--card))" }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                    <Tooltip contentStyle={{ borderRadius: 16, fontFamily: "Inter", fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }} formatter={(value: number) => [`₹${value.toLocaleString()}`, undefined]} />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter" }} />
                    <Bar dataKey="collected" name="Collected" fill="hsl(145, 65%, 42%)" radius={[6, 6, 0, 0]} barSize={28} />
                    <Bar dataKey="pending" name="Pending" fill="hsl(0, 70%, 58%)" radius={[6, 6, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-muted/30 rounded-xl p-3 text-center">
                  <p className="font-body text-lg font-bold text-foreground tabular-nums">₹{filteredSemFeeData.reduce((s: number, d: any) => s + d.total, 0).toLocaleString()}</p>
                  <p className="font-body text-[10px] text-muted-foreground">Total Fees</p>
                </div>
                <div className="bg-emerald-500/5 rounded-xl p-3 text-center">
                  <p className="font-body text-lg font-bold text-emerald-600 tabular-nums">₹{filteredSemFeeData.reduce((s: number, d: any) => s + d.collected, 0).toLocaleString()}</p>
                  <p className="font-body text-[10px] text-muted-foreground">Total Collected</p>
                </div>
                <div className="bg-red-500/5 rounded-xl p-3 text-center">
                  <p className="font-body text-lg font-bold text-red-500 tabular-nums">₹{filteredSemFeeData.reduce((s: number, d: any) => s + d.pending, 0).toLocaleString()}</p>
                  <p className="font-body text-[10px] text-muted-foreground">Total Pending</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IndianRupee className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="font-body text-sm font-medium text-muted-foreground">No fee data available for this course</p>
              <p className="font-body text-[11px] text-muted-foreground/60 mt-1">Try selecting a different course or semester</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Fee Transactions */}
      {recentTransactions.length > 0 && (
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="font-body text-[14px] font-semibold text-foreground">Recent Fee Transactions</h3>
            </div>
            <Link to="/dashboard/admin/fees" className="font-body text-[11px] text-primary flex items-center gap-0.5 hover:gap-1.5 transition-all duration-200">
              View all <TrendingUp className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {recentTransactions.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <IndianRupee className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-body text-[12px] font-semibold text-foreground truncate">{t.studentName}</p>
                    <p className="font-body text-[10px] text-muted-foreground">
                      {t.rollNumber} · {t.payment_method || "Cash"}
                      {t.semester && <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px]">Sem {t.semester}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-body text-[13px] font-bold text-emerald-600 tabular-nums">₹{Number(t.amount).toLocaleString()}</p>
                  <p className="font-body text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6">
        <h3 className="font-body text-[14px] font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {quickActions.map((a: any) => (
            <Link
              key={a.label}
              to={a.path}
              className="relative flex items-center gap-2.5 p-3.5 rounded-xl bg-muted/30 hover:bg-muted/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <div className={`w-9 h-9 rounded-xl ${a.color || "bg-primary/10"} flex items-center justify-center shrink-0 transition-colors duration-200`}>
                <a.icon className={`w-4 h-4 ${a.iconColor || "text-primary"} transition-colors duration-200`} />
              </div>
              <div className="min-w-0">
                <p className="font-body text-[12px] font-medium text-foreground truncate">{a.label}</p>
                <p className="font-body text-[10px] text-muted-foreground truncate">{a.desc}</p>
              </div>
              {a.badge ? (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center animate-scale-in">{a.badge}</span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>

      {/* Birthday Dialog */}
      <Dialog open={birthdayDialogOpen} onOpenChange={setBirthdayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cake className="w-5 h-5 text-pink-500" />
              🎂 Today's Birthdays
            </DialogTitle>
          </DialogHeader>
          {birthdayStudentsList.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground text-center py-6">No student birthdays today</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {birthdayStudentsList.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                  <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0">
                    <Cake className="w-5 h-5 text-pink-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-sm font-medium text-foreground truncate">{s.name}</p>
                    <p className="font-body text-[11px] text-muted-foreground">{s.roll_number} · {s.date_of_birth ? format(new Date(s.date_of_birth), "dd MMM yyyy") : ""}</p>
                    {s.email && <p className="font-body text-[10px] text-muted-foreground truncate">{s.email}</p>}
                  </div>
                  <span className="text-2xl">🎉</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

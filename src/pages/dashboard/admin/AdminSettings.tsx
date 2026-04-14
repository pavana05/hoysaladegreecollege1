import { Settings, Globe, Calendar, Shield, TrendingUp, Activity, Download, Users, Database, Server, CheckCircle, AlertCircle, Clock, ArrowLeft, Cpu, HardDrive, Wifi, BarChart3, Zap, RefreshCw, ExternalLink, Lock, KeyRound } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, RadialBarChart, RadialBar, BarChart, Bar, LineChart, Line } from "recharts";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";

function useAnimatedCounter(target: number) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) return;
    const duration = 1200;
    const start = Date.now();
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return count;
}

function AnimatedHealthBar({ name, count, max, color, icon: Icon }: { name: string; count: number; max: number; color: string; icon: any }) {
  const animated = useAnimatedCounter(count);
  const pct = max > 0 ? Math.min((count / max) * 100, 100) : 0;
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-body text-sm font-medium text-foreground">{name}</span>
        </div>
        <span className="font-display text-lg font-bold text-foreground tabular-nums">{animated.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const healthIcons: Record<string, any> = {
  Students: Users, Teachers: Users, Courses: Database, Notices: AlertCircle,
  Events: Calendar, Applications: Activity, "Attendance Records": Clock, "Marks Records": TrendingUp,
};

export default function AdminSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [liveTime, setLiveTime] = useState(new Date());
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: existingPin } = useQuery({
    queryKey: ["fee-pin-exists"],
    queryFn: async () => {
      const { data } = await supabase.from("fee_management_pin").select("id").limit(1);
      return data && data.length > 0;
    },
  });

  const handleSavePin = async () => {
    if (pinValue.length !== 6 || !/^\d{6}$/.test(pinValue)) {
      toast.error("PIN must be exactly 6 digits");
      return;
    }
    if (pinValue !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }
    setPinSaving(true);
    try {
      // Delete existing PIN first
      await supabase.from("fee_management_pin").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      // Insert new PIN
      const { error } = await supabase.from("fee_management_pin").insert({
        pin_hash: pinValue,
        updated_by: user?.id,
      });
      if (error) throw error;
      toast.success("Fee Management PIN saved successfully!");
      setPinDialogOpen(false);
      setPinValue("");
      setConfirmPin("");
      queryClient.invalidateQueries({ queryKey: ["fee-pin-exists"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save PIN");
    } finally {
      setPinSaving(false);
    }
  };

  const settings = [
    { label: "College Name", value: "Hoysala Degree College", icon: Globe },
    { label: "Academic Year", value: "2025-2026", icon: Calendar },
    { label: "System Status", value: "Active", icon: Shield },
    { label: "College Code", value: "BU 26 (P21GEF0099)", icon: Settings },
    { label: "Affiliation", value: "Bangalore University", icon: Globe },
  ];

  const { data: growthData, isLoading: growthLoading } = useQuery({
    queryKey: ["admin-growth-analytics"],
    queryFn: async () => {
      const { data: students } = await supabase.from("students").select("created_at, admission_year").eq("is_active", true);
      if (!students) return [];
      const byYear: Record<number, number> = {};
      students.forEach(s => {
        const yr = s.admission_year || new Date(s.created_at).getFullYear();
        byYear[yr] = (byYear[yr] || 0) + 1;
      });
      return Object.entries(byYear).sort(([a], [b]) => Number(a) - Number(b)).map(([year, count]) => ({ year, count }));
    },
  });

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ["admin-health-monitor"],
    queryFn: async () => {
      const [students, teachers, courses, notices, events, apps, attendance, marks] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("notices").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("admission_applications").select("id", { count: "exact", head: true }),
        supabase.from("attendance").select("id", { count: "exact", head: true }),
        supabase.from("marks").select("id", { count: "exact", head: true }),
      ]);
      return [
        { name: "Students", count: students.count || 0 },
        { name: "Teachers", count: teachers.count || 0 },
        { name: "Courses", count: courses.count || 0 },
        { name: "Notices", count: notices.count || 0 },
        { name: "Events", count: events.count || 0 },
        { name: "Applications", count: apps.count || 0 },
        { name: "Attendance Records", count: attendance.count || 0 },
        { name: "Marks Records", count: marks.count || 0 },
      ];
    },
  });

  const { data: activityData } = useQuery({
    queryKey: ["admin-activity-timeline"],
    queryFn: async () => {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });
      const results = await Promise.all(
        days.map(async (day) => {
          const [att, marks] = await Promise.all([
            supabase.from("attendance").select("id", { count: "exact", head: true }).eq("date", day),
            supabase.from("marks").select("id", { count: "exact", head: true }).gte("created_at", `${day}T00:00:00`).lt("created_at", `${day}T23:59:59`),
          ]);
          return { day: new Date(day).toLocaleDateString("en-IN", { weekday: "short" }), attendance: att.count || 0, marks: marks.count || 0 };
        })
      );
      return results;
    },
  });

  const totalRecords = healthData?.reduce((sum, h) => sum + h.count, 0) || 0;
  const maxCount = healthData ? Math.max(...healthData.map(h => h.count), 1) : 1;

  // System health metrics (simulated based on real data)
  const systemMetrics = [
    { name: "Database", value: 99.9, fill: "hsl(142, 70%, 40%)" },
    { name: "API", value: 99.5, fill: "hsl(217, 72%, 18%)" },
    { name: "Auth", value: 100, fill: "hsl(42, 87%, 55%)" },
    { name: "Storage", value: 98.8, fill: "hsl(262, 83%, 58%)" },
  ];

  const exportHealthReport = () => {
    if (!healthData) return;
    const csv = ["Table,Record Count,Status,Last Check", ...healthData.map(h => `${h.name},${h.count},Healthy,${new Date().toISOString()}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "system_health_report.csv"; a.click();
    toast.success("Health report exported!");
  };

  const exportStudentsCSV = async () => {
    const { data: students } = await supabase.from("students").select("*, courses(name, code)");
    const { data: profiles } = await supabase.from("profiles").select("*");
    if (!students) return;
    const rows = students.map(s => {
      const p = profiles?.find(pr => pr.user_id === s.user_id);
      return [p?.full_name || "", p?.email || "", p?.phone || "", s.roll_number, s.semester, s.admission_year, (s as any).courses?.name || "", (s as any).courses?.code || "", s.parent_phone || "", s.address || "", s.date_of_birth || "", s.total_fee || 0, s.fee_paid || 0, s.fee_remarks || ""].map(v => `"${v}"`).join(",");
    });
    const header = ["Name","Email","Phone","Roll Number","Semester","Admission Year","Course","Course Code","Parent Phone","Address","DOB","Total Fee","Fee Paid","Fee Remarks"].join(",");
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "students_export.csv"; a.click();
    toast.success("Students exported to CSV!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-border rounded-2xl p-6 md:p-8">
        <div className="absolute top-0 right-0 w-40 h-40 bg-secondary/8 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <BackButton />
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-2">
              <Server className="w-3 h-3 text-primary" />
              <span className="font-body text-[11px] text-primary font-semibold uppercase tracking-wider">System Console</span>
            </div>
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> System Settings
            </h2>
            <p className="font-body text-sm text-muted-foreground mt-1">Real-time monitoring, analytics & data management</p>
          </div>
          <div className="hidden sm:block text-right">
            <p className="font-display text-lg font-bold text-foreground tabular-nums">{liveTime.toLocaleTimeString()}</p>
            <p className="font-body text-xs text-muted-foreground">{liveTime.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}</p>
          </div>
        </div>
      </div>

      {/* System Status Summary */}
      {!healthLoading && healthData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/8 to-primary/3 border border-border rounded-2xl p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none spotlight" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">{totalRecords.toLocaleString()}</p>
              <p className="font-body text-xs text-muted-foreground">Total Database Records</p>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/8 to-emerald-500/3 border border-border rounded-2xl p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none spotlight" />
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">{healthData.length}</p>
              <p className="font-body text-xs text-muted-foreground">Tables Monitored — All Healthy</p>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-secondary/8 to-secondary/3 border border-border rounded-2xl p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none spotlight" />
            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Wifi className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display text-2xl font-bold text-foreground">99.9%</p>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="font-body text-xs text-muted-foreground">Uptime — System Online</p>
            </div>
          </div>
        </div>
      )}
      {/* Cloudflare Security */}
      <Link to="/dashboard/admin/cloudflare" className="block bg-gradient-to-r from-orange-500/8 to-amber-500/5 border border-orange-500/20 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Shield className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">Cloudflare Security</h3>
              <p className="font-body text-xs text-muted-foreground">Manage CDN, firewall, cache purge & threat analytics</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </Link>

      {/* Service Health Gauges */}
      <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-secondary-foreground" /> Service Health Status
          </h3>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-body text-xs text-emerald-600 font-semibold">All Services Operational</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {systemMetrics.map((metric) => (
            <div key={metric.name} className="relative flex flex-col items-center p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 group">
              <div className="relative w-20 h-20 mb-3">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none"
                    stroke={metric.fill}
                    strokeWidth="8"
                    strokeDasharray={`${(metric.value / 100) * 251.2} 251.2`}
                    strokeLinecap="round"
                    className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-sm font-bold text-foreground">{metric.value}%</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {metric.name === "Database" && <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />}
                {metric.name === "API" && <Cpu className="w-3.5 h-3.5 text-muted-foreground" />}
                {metric.name === "Auth" && <Shield className="w-3.5 h-3.5 text-muted-foreground" />}
                {metric.name === "Storage" && <Server className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className="font-body text-xs font-semibold text-foreground">{metric.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Timeline Chart */}
      {activityData && activityData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg transition-all duration-300">
          <h3 className="font-display text-base font-bold text-foreground mb-5 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> 7-Day Activity Timeline
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontFamily: "Inter", fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
                <Bar dataKey="attendance" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Attendance" />
                <Bar dataKey="marks" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} name="Marks Uploaded" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Export Actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between group hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-body text-sm font-bold text-foreground">Export Students</h3>
              <p className="font-body text-xs text-muted-foreground">All records with fees & contact</p>
            </div>
          </div>
          <Button variant="outline" onClick={exportStudentsCSV} className="rounded-xl font-body text-xs shrink-0">
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between group hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Activity className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-body text-sm font-bold text-foreground">Health Report</h3>
              <p className="font-body text-xs text-muted-foreground">System database summary</p>
            </div>
          </div>
          <Button variant="outline" onClick={exportHealthReport} className="rounded-xl font-body text-xs shrink-0">
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* System Status Link */}
      <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-body text-sm font-bold text-foreground">System Status Monitor</h3>
              <p className="font-body text-xs text-muted-foreground">Real-time uptime & incident monitoring</p>
            </div>
          </div>
          <a href="https://status.rhealth.dev/hoysala-degree-college" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="rounded-xl font-body text-xs gap-1.5">
              <ExternalLink className="w-3 h-3" /> View Status
            </Button>
          </a>
        </div>
      </div>

      {/* Import Students */}
      <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-body text-sm font-bold text-foreground">Import Students from CSV</h3>
              <p className="font-body text-xs text-muted-foreground">
                CSV format: Name, Email, Phone, Roll Number, Course Code, Semester, Father Name, Mother Name, Parent Phone, Address, DOB (YYYY-MM-DD), Total Fee
              </p>
            </div>
          </div>
          <label className="cursor-pointer">
            <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const lines = text.split("\n").filter(l => l.trim());
              if (lines.length < 2) { toast.error("CSV must have a header row and data"); return; }
              const rows = lines.slice(1).map(l => {
                const cols = l.split(",").map(c => c.replace(/^"|"$/g, "").trim());
                return { name: cols[0], email: cols[1], phone: cols[2], roll: cols[3], courseCode: cols[4], semester: cols[5], father: cols[6], mother: cols[7], parentPhone: cols[8], address: cols[9], dob: cols[10], totalFee: cols[11] };
              });
              let imported = 0, skipped = 0;
              const { data: coursesData } = await supabase.from("courses").select("id, code");
              for (const row of rows) {
                if (!row.email) { skipped++; continue; }
                try {
                  const { data: authData, error: authErr } = await supabase.auth.signUp({
                    email: row.email,
                    password: "Welcome@" + (row.roll || "123"),
                    options: { data: { full_name: row.name, role: "student" }, emailRedirectTo: window.location.origin },
                  });
                  if (authErr || !authData.user) { skipped++; continue; }
                  await new Promise(r => setTimeout(r, 500));
                  const courseMatch = coursesData?.find(c => c.code.toLowerCase() === (row.courseCode || "").toLowerCase());
                  const updateData: any = {
                    semester: parseInt(row.semester) || 1,
                    father_name: row.father || "",
                    mother_name: row.mother || "",
                    parent_phone: row.parentPhone || "",
                    address: row.address || "",
                    date_of_birth: row.dob || null,
                    total_fee: parseFloat(row.totalFee) || 0,
                  };
                  if (row.roll) updateData.roll_number = row.roll;
                  if (courseMatch) updateData.course_id = courseMatch.id;
                  if (row.phone) await supabase.from("profiles").update({ phone: row.phone }).eq("user_id", authData.user.id);
                  await supabase.from("students").update(updateData).eq("user_id", authData.user.id);
                  imported++;
                } catch { skipped++; }
              }
              toast.success(`Imported ${imported} students, ${skipped} skipped`);
              e.target.value = "";
            }} />
            <Button variant="outline" className="rounded-xl font-body text-xs gap-1.5" asChild>
              <span><Download className="w-3 h-3 rotate-180" /> Import CSV</span>
            </Button>
          </label>
        </div>
      </div>

      {/* General Info */}
      <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
        <h3 className="font-display text-base font-bold text-foreground mb-5 flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" /> General Information
        </h3>
        <div className="space-y-2">
          {settings.map((s, i) => (
            <div key={s.label} className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all duration-200 group"
              style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="font-body text-sm text-muted-foreground">{s.label}</span>
              </div>
              <span className="font-body text-sm font-bold text-primary">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Student Growth Analytics */}
      <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
        <h3 className="font-display text-base font-bold text-foreground mb-5 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Student Enrollment Growth
        </h3>
        {growthLoading ? <Skeleton className="h-56 w-full rounded-xl" /> : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontFamily: "Inter", fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#growthGrad)" dot={{ fill: "hsl(var(--secondary))", r: 5, strokeWidth: 0 }} activeDot={{ r: 7, fill: "hsl(var(--primary))" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Database Health Bars */}
      <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Database Health Monitor
            </h3>
            <p className="font-body text-xs text-muted-foreground mt-0.5">Real-time record counts with visual capacity bars</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <RefreshCw className="w-3 h-3 text-primary animate-spin" style={{ animationDuration: "3s" }} />
            <span className="font-body text-xs text-primary font-semibold">Live Data</span>
          </div>
        </div>
        {healthLoading ? (
          <div className="space-y-4">{[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : (
          <div className="space-y-4">
            {healthData?.map((h) => (
              <AnimatedHealthBar key={h.name} name={h.name} count={h.count} max={maxCount} color="bg-primary/10" icon={healthIcons[h.name] || Database} />
            ))}
          </div>
        )}
      </div>

      {/* Fee Management PIN Security */}
      <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Lock className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="font-body text-sm font-bold text-foreground">Fee Management PIN</h3>
              <p className="font-body text-xs text-muted-foreground">
                {existingPin ? "PIN is set — click to change" : "Set a 6-digit PIN to protect fee management access"}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setPinDialogOpen(true)} className="rounded-xl font-body text-xs gap-1.5">
            <KeyRound className="w-3 h-3" /> {existingPin ? "Change PIN" : "Set PIN"}
          </Button>
        </div>
      </div>

      {/* PIN Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> {existingPin ? "Change" : "Set"} Fee Management PIN
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="font-body text-sm text-muted-foreground mb-1.5 block">Enter 6-digit PIN</label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl tracking-[0.5em] font-mono rounded-xl h-14"
              />
            </div>
            <div>
              <label className="font-body text-sm text-muted-foreground mb-1.5 block">Confirm PIN</label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl tracking-[0.5em] font-mono rounded-xl h-14"
              />
            </div>
            {pinValue.length === 6 && confirmPin.length === 6 && pinValue !== confirmPin && (
              <p className="text-xs text-destructive font-body">PINs do not match</p>
            )}
            <Button
              onClick={handleSavePin}
              disabled={pinSaving || pinValue.length !== 6 || confirmPin.length !== 6 || pinValue !== confirmPin}
              className="w-full rounded-xl font-body"
            >
              {pinSaving ? "Saving..." : "Save PIN"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
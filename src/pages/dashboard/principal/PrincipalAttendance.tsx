import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { UserCheck, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { useState, useMemo } from "react";
import DataTableShell from "@/components/principal/DataTableShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PrincipalAttendance() {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [semFilter, setSemFilter] = useState("all");

  const { data: courses = [] } = useQuery({
    queryKey: ["pa-courses"],
    queryFn: async () => (await supabase.from("courses").select("id,name,code").eq("is_active", true).order("name")).data || [],
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pa-rows", courseFilter, semFilter],
    queryFn: async () => {
      let sq = supabase.from("students").select("id,user_id,roll_number,course_id,semester,courses(name,code)").eq("is_active", true);
      if (courseFilter !== "all") sq = sq.eq("course_id", courseFilter);
      if (semFilter !== "all") sq = sq.eq("semester", parseInt(semFilter));
      const { data: students } = await sq;
      if (!students?.length) return [];
      const ids = students.map((s) => s.id);
      const userIds = students.map((s) => s.user_id);
      const [{ data: attendance }, { data: profiles }] = await Promise.all([
        supabase.from("attendance").select("student_id,status").in("student_id", ids),
        supabase.from("profiles").select("user_id,full_name").in("user_id", userIds),
      ]);
      return students.map((s) => {
        const recs = attendance?.filter((a) => a.student_id === s.id) || [];
        const total = recs.length;
        const present = recs.filter((a) => a.status === "present").length;
        const pct = total > 0 ? Math.round((present / total) * 100) : 0;
        return {
          ...s,
          full_name: profiles?.find((p) => p.user_id === s.user_id)?.full_name || "—",
          total, present, pct,
        };
      });
    },
    refetchInterval: 30000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r: any) => r.full_name.toLowerCase().includes(q) || r.roll_number?.toLowerCase().includes(q));
  }, [rows, search]);

  const avgPct = rows.length ? Math.round(rows.reduce((s: number, r: any) => s + r.pct, 0) / rows.length) : 0;
  const belowThreshold = rows.filter((r: any) => r.pct < 75 && r.total > 0).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Attendance Oversight</h2>
            <p className="font-body text-xs text-muted-foreground">Live student attendance across courses</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Students" value={rows.length} />
        <StatCard icon={TrendingUp} label="Average %" value={`${avgPct}%`} />
        <StatCard icon={AlertTriangle} label="Below 75%" value={belowThreshold} warn />
      </div>

      <DataTableShell
        title="Student Attendance"
        icon={UserCheck}
        items={filtered}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or roll number..."
        emptyText="No attendance records yet."
        filters={
          <>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Course" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={semFilter} onValueChange={setSemFilter}>
              <SelectTrigger className="w-[120px] rounded-xl"><SelectValue placeholder="Semester" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sem</SelectItem>
                {[1,2,3,4,5,6].map((n) => <SelectItem key={n} value={String(n)}>Sem {n}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      >
        {(paged) => (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
              <div className="col-span-4">Student</div>
              <div className="col-span-2">Course</div>
              <div className="col-span-1 text-center">Sem</div>
              <div className="col-span-2 text-center">P / Total</div>
              <div className="col-span-3 text-right">Attendance</div>
            </div>
            {paged.map((r: any) => (
              <div key={r.id} className="grid grid-cols-12 px-4 py-3 items-center border-b border-border/50 last:border-0 text-sm">
                <div className="col-span-4">
                  <p className="font-medium truncate">{r.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">{r.roll_number || "—"}</p>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">{r.courses?.code || "—"}</div>
                <div className="col-span-1 text-center text-xs">{r.semester ?? "—"}</div>
                <div className="col-span-2 text-center text-xs tabular-nums">{r.present}/{r.total}</div>
                <div className="col-span-3 text-right">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums ${
                    r.total === 0 ? "bg-muted text-muted-foreground"
                    : r.pct >= 75 ? "bg-emerald-500/15 text-emerald-500"
                    : r.pct >= 60 ? "bg-amber-500/15 text-amber-500"
                    : "bg-red-500/15 text-red-500"
                  }`}>
                    {r.total === 0 ? "No data" : `${r.pct}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataTableShell>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, warn }: any) {
  return (
    <div className={`bg-card border ${warn ? "border-amber-500/30" : "border-border"} rounded-2xl p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${warn ? "bg-amber-500/15 text-amber-500" : "bg-primary/10 text-primary"}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="font-display text-xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

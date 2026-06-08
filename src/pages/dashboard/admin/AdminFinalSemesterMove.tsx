import { useState } from "react";
import { IOSSelect } from "@/components/ui/ios-select";
import { GraduationCap, AlertCircle, CheckCircle, Users, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminFinalSemesterMove() {
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [search, setSearch] = useState("");
  const [moving, setMoving] = useState(false);
  const [movedCount, setMovedCount] = useState<number | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-courses-list"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: academicYears = [] } = useQuery({
    queryKey: ["academic-years-list"],
    queryFn: async () => {
      const { data } = await supabase.from("academic_years").select("id, label, is_current").order("label", { ascending: false });
      return data || [];
    },
  });

  const currentAcademicYear = academicYears.find((y: any) => y.is_current);

  const { data: finalStudents = [], isLoading } = useQuery({
    queryKey: ["final-semester-students", selectedCourse],
    queryFn: async () => {
      let q = supabase
        .from("students")
        .select("id, roll_number, semester, user_id, course_id, courses(name, code)")
        .eq("is_active", true)
        .eq("semester", 6);
      if (selectedCourse !== "all") q = q.eq("course_id", selectedCourse);
      const { data: studs } = await q.order("roll_number");
      if (!studs || studs.length === 0) return [];
      const userIds = studs.map((s) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
      return studs.map((s) => ({ ...s, profile: profiles?.find((p) => p.user_id === s.user_id) }));
    },
  });

  const filteredStudents = finalStudents.filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.profile?.full_name || "").toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q);
  });

  const handleMoveToAcademicOverview = async () => {
    if (!currentAcademicYear) {
      toast.error("No current academic year set. Please set one first.");
      return;
    }
    const count = filteredStudents.length;
    if (count === 0) {
      toast.error("No students to move.");
      return;
    }
    if (!window.confirm(
      `Move ${count} final semester student(s) to Academic Overview?\n\nThis will:\n• Assign them to academic year "${currentAcademicYear.label}"\n• Mark them as inactive (completed)\n• They will appear in Academic Overview and be removed from active dashboard lists.`
    )) return;

    setMoving(true);
    const studentIds = filteredStudents.map((s: any) => s.id);

    const { error } = await supabase
      .from("students")
      .update({
        is_active: false,
        academic_year_id: currentAcademicYear.id,
      })
      .in("id", studentIds);

    setMoving(false);
    if (error) {
      toast.error("Failed to move students: " + error.message);
    } else {
      setMovedCount(count);
      toast.success(`✅ ${count} student(s) moved to Academic Overview (${currentAcademicYear.label})!`);
      queryClient.invalidateQueries({ queryKey: ["final-semester-students"] });
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
    }
  };

  const inputClass = "w-full border border-border rounded-xl px-4 py-3 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-300";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-card to-accent/10 border border-border rounded-2xl p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Move Final Semester Students</h2>
            <p className="font-body text-sm text-muted-foreground">
              Move completed (6th semester) students to Academic Overview for long-term record keeping
            </p>
          </div>
        </div>
      </div>

      {movedCount !== null && (
        <div className="flex items-center gap-3 p-5 rounded-2xl bg-primary/8 border border-primary/20 animate-fade-in">
          <CheckCircle className="w-6 h-6 text-primary shrink-0" />
          <div>
            <p className="font-body font-bold text-foreground">{movedCount} student(s) successfully moved to Academic Overview!</p>
            <p className="font-body text-sm text-muted-foreground">
              They are now in the "{currentAcademicYear?.label}" academic year record and removed from active lists.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-display text-base font-bold text-foreground mb-5 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" /> Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="font-body text-xs font-bold text-foreground block mb-1.5 uppercase tracking-wider">Filter by Course</label>
              <IOSSelect value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className={inputClass}>
                <option value="all">All Courses</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </IOSSelect>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="font-body text-sm font-bold text-foreground">{filteredStudents.length} students</p>
                <p className="font-body text-xs text-muted-foreground">in 6th (final) semester</p>
              </div>
            </div>

            {currentAcademicYear ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="font-body text-xs text-muted-foreground">Target Academic Year</p>
                  <p className="font-body text-sm font-bold text-foreground">{currentAcademicYear.label}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/15">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="font-body text-xs text-muted-foreground">No current academic year set. Go to "Academic Years" tab to set one.</p>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/15">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="font-body text-xs text-muted-foreground">
                This marks students as inactive and assigns them to the current academic year. They will appear in Academic Overview for record keeping.
              </p>
            </div>

            <Button
              onClick={handleMoveToAcademicOverview}
              disabled={moving || filteredStudents.length === 0 || !currentAcademicYear}
              className="w-full rounded-xl font-body font-bold py-5 bg-primary hover:bg-primary/90 relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {moving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Moving...
                </span>
              ) : (
                <span className="flex items-center gap-2 relative z-10">
                  <GraduationCap className="w-4 h-4" />
                  Move Final Semester Students to Academic Overview
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Student List */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> 6th Semester Students
            </h3>
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl text-sm h-9" />
            </div>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-body text-sm text-muted-foreground">No active students in 6th semester.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredStudents.map((s: any, i: number) => (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="font-body text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold text-foreground truncate">{s.profile?.full_name || "—"}</p>
                    <p className="font-body text-xs text-muted-foreground">{s.roll_number}</p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg text-xs shrink-0">
                    {(s.courses as any)?.code || "—"}
                  </Badge>
                  <Badge variant="outline" className="rounded-lg text-xs font-bold shrink-0">
                    Sem 6
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

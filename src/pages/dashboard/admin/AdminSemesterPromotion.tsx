import { useState } from "react";
import { IOSSelect } from "@/components/ui/ios-select";
import { ArrowUpCircle, ArrowLeft, CheckCircle, Users, AlertCircle, ChevronRight, Search, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { notifyStudents } from "@/hooks/useNotifyStudents";
import BackButton from "@/components/BackButton";

export default function AdminSemesterPromotion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [fromSem, setFromSem] = useState(1);
  const [promoting, setPromoting] = useState(false);
  const [promoted, setPromoted] = useState<number | null>(null);
  const [individualSearch, setIndividualSearch] = useState("");
  const [promotingIndividual, setPromotingIndividual] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"bulk" | "individual">("bulk");

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-courses-list"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: preview = [], isLoading: previewLoading } = useQuery({
    queryKey: ["promotion-preview", selectedCourse, fromSem],
    queryFn: async () => {
      let q = supabase.from("students").select("id, roll_number, semester, user_id, courses(name, code)").eq("is_active", true).eq("semester", fromSem);
      if (selectedCourse !== "all") q = q.eq("course_id", selectedCourse);
      const { data: studentsData } = await q.limit(10);
      if (!studentsData || studentsData.length === 0) return [];
      const userIds = studentsData.map((s) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
      return studentsData.map((s) => ({
        ...s,
        profile: profiles?.find((p) => p.user_id === s.user_id),
      }));
    },
    enabled: fromSem >= 1,
  });

  const { data: previewCount = 0 } = useQuery({
    queryKey: ["promotion-count", selectedCourse, fromSem],
    queryFn: async () => {
      let q = supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true).eq("semester", fromSem);
      if (selectedCourse !== "all") q = q.eq("course_id", selectedCourse);
      const { count } = await q;
      return count || 0;
    },
  });

  const [indCourse, setIndCourse] = useState("all");
  const [indSem, setIndSem] = useState("all");

  // Individual promotion - search all students
  const { data: allStudents = [], isLoading: allStudentsLoading } = useQuery({
    queryKey: ["all-students-for-promotion"],
    queryFn: async () => {
      const { data: studs } = await supabase.from("students").select("id, roll_number, semester, user_id, course_id, courses(name, code)").eq("is_active", true).order("roll_number");
      if (!studs || studs.length === 0) return [];
      const userIds = studs.map((s) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
      return studs.map((s) => ({ ...s, profile: profiles?.find((p) => p.user_id === s.user_id) }));
    },
    enabled: activeTab === "individual",
  });

  const filteredIndividual = allStudents.filter((s: any) => {
    if (indCourse !== "all" && s.course_id !== indCourse) return false;
    if (indSem !== "all" && s.semester !== Number(indSem)) return false;
    if (!individualSearch) return true;
    const q = individualSearch.toLowerCase();
    return (s.profile?.full_name || "").toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q);
  });

  const handlePromote = async () => {
    if (!window.confirm(`Promote ${previewCount} student(s) from Semester ${fromSem} to ${fromSem + 1}? This cannot be undone.`)) return;
    setPromoting(true);
    let q = supabase.from("students").update({ semester: fromSem + 1 }).eq("semester", fromSem).eq("is_active", true);
    if (selectedCourse !== "all") q = (q as any).eq("course_id", selectedCourse);
    const { error } = await (q as any);
    setPromoting(false);
    if (error) {
      toast.error("Promotion failed: " + error.message);
    } else {
      setPromoted(previewCount);
      toast.success(`✅ ${previewCount} student(s) promoted to Semester ${fromSem + 1}!`);
      queryClient.invalidateQueries({ queryKey: ["promotion-preview"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-count"] });
      // Notify students & send emails
      notifyStudents({
        courseId: selectedCourse !== "all" ? selectedCourse : null,
        semester: fromSem + 1,
        title: "Semester Promotion 🎉",
        message: `You have been promoted to Semester ${fromSem + 1}! Congratulations!`,
        type: "promotion",
        link: "/dashboard/student",
      });
      // Send promotion email
      try {
        await supabase.functions.invoke("send-promotion-notification", {
          body: { fromSemester: fromSem, toSemester: fromSem + 1, courseId: selectedCourse !== "all" ? selectedCourse : null },
        });
      } catch (e) { console.error("Promotion email failed:", e); }
    }
  };

  const handleIndividualPromote = async (student: any) => {
    if (!window.confirm(`Promote ${student.profile?.full_name || student.roll_number} from Semester ${student.semester} to ${student.semester + 1}?`)) return;
    setPromotingIndividual(student.id);
    const { error } = await supabase.from("students").update({ semester: student.semester + 1 }).eq("id", student.id);
    setPromotingIndividual(null);
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success(`${student.profile?.full_name || student.roll_number} promoted to Semester ${student.semester + 1}!`);
      queryClient.invalidateQueries({ queryKey: ["all-students-for-promotion"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-preview"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-count"] });
      // Notify individual student
      if (student.user_id) {
        await supabase.from("notifications").insert({
          user_id: student.user_id,
          title: "Semester Promotion 🎉",
          message: `You have been promoted to Semester ${student.semester + 1}! Congratulations!`,
          type: "promotion",
          link: "/dashboard/student",
        } as any);
        // Send promotion email
        try {
          await supabase.functions.invoke("send-promotion-notification", {
            body: {
              action: "notify_promotion",
              studentIds: [student.id],
              fromSemester: student.semester,
              toSemester: student.semester + 1,
              courseId: student.course_id || null,
            },
          });
        } catch (e) { console.error("Promotion email failed:", e); }
      }
    }
  };

  const inputClass = "w-full border border-border rounded-xl px-4 py-3 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-300";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-border rounded-2xl p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <BackButton />
          <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
            <ArrowUpCircle className="w-5 h-5 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Semester Promotion</h2>
            <p className="font-body text-sm text-muted-foreground">Promote students in bulk or individually</p>
          </div>
        </div>
      </div>

      {promoted !== null && (
        <div className="flex items-center gap-3 p-5 rounded-2xl bg-primary/8 border border-primary/20 animate-fade-in">
          <CheckCircle className="w-6 h-6 text-primary shrink-0" />
          <div>
            <p className="font-body font-bold text-foreground">{promoted} student(s) successfully promoted to Semester {fromSem + 1}!</p>
            <p className="font-body text-sm text-muted-foreground">Email notifications and dashboard alerts have been sent.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "bulk" as const, label: "Bulk Promotion", icon: Users },
          { key: "individual" as const, label: "Individual Promotion", icon: UserCheck },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-body text-xs font-semibold border transition-all duration-200 ${
              activeTab === key ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {activeTab === "bulk" ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Config panel */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-display text-base font-bold text-foreground mb-5 flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-primary" /> Promotion Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="font-body text-xs font-bold text-foreground block mb-1.5 uppercase tracking-wider">Select Course</label>
                <IOSSelect value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className={inputClass}>
                  <option value="all">All Courses</option>
                  {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </IOSSelect>
              </div>
              <div>
                <label className="font-body text-xs font-bold text-foreground block mb-1.5 uppercase tracking-wider">Current Semester (From)</label>
                <IOSSelect value={fromSem} onChange={e => setFromSem(Number(e.target.value))} className={inputClass}>
                  {[1,2,3,4,5].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </IOSSelect>
              </div>
              <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 border border-border">
                <div className="text-center">
                  <p className="font-body text-xs text-muted-foreground mb-1">FROM</p>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                    <span className="font-display text-xl font-bold text-primary">S{fromSem}</span>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-body text-xs text-muted-foreground mb-1">TO</p>
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mx-auto">
                    <span className="font-display text-xl font-bold text-secondary-foreground">S{fromSem + 1}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <Users className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="font-body text-sm font-bold text-foreground">{previewCount} students</p>
                  <p className="font-body text-xs text-muted-foreground">will be promoted</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/15">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="font-body text-xs text-muted-foreground">This action updates semester numbers and sends notifications. It cannot be undone.</p>
              </div>
              <Button onClick={handlePromote} disabled={promoting || previewCount === 0}
                className="w-full rounded-xl font-body font-bold py-5 bg-primary hover:bg-primary/90 relative overflow-hidden group">
                <span className="absolute inset-0 bg-gradient-to-r from-secondary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {promoting ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Promoting...</span>
                ) : (
                  <span className="flex items-center gap-2 relative z-10"><ArrowUpCircle className="w-4 h-4" /> Promote {previewCount} Student(s)</span>
                )}
              </Button>
            </div>
          </div>
          {/* Preview table */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-border bg-muted/20">
              <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Students Preview (first 10)
              </h3>
            </div>
            {previewLoading ? (
              <div className="p-4 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            ) : preview.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-body text-sm text-muted-foreground">No students found in Semester {fromSem}.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {preview.map((s: any, i: number) => (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="font-body text-xs font-bold text-primary">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-semibold text-foreground truncate">{s.profile?.full_name || "—"}</p>
                      <p className="font-body text-xs text-muted-foreground">{s.roll_number}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-body text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">Sem {s.semester}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-body text-xs px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-foreground font-bold">Sem {s.semester + 1}</span>
                    </div>
                  </div>
                ))}
                {previewCount > 10 && (
                  <div className="px-5 py-3 text-center">
                    <p className="font-body text-xs text-muted-foreground">+ {previewCount - 10} more students will also be promoted</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Individual Promotion Tab */
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-border space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name or roll..." value={individualSearch} onChange={e => setIndividualSearch(e.target.value)} className="pl-9 rounded-xl text-sm" />
              </div>
              <IOSSelect value={indCourse} onChange={e => setIndCourse(e.target.value)} className="border border-border rounded-xl px-3 py-2 font-body text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="all">All Courses</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </IOSSelect>
              <IOSSelect value={indSem} onChange={e => setIndSem(e.target.value)} className="border border-border rounded-xl px-3 py-2 font-body text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="all">All Semesters</option>
                {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Sem {s}</option>)}
              </IOSSelect>
              <span className="font-body text-xs text-muted-foreground ml-auto">{filteredIndividual.length} student(s)</span>
            </div>
          </div>
          {allStudentsLoading ? (
            <div className="p-4 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : filteredIndividual.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-body text-sm text-muted-foreground">No students found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50 max-h-[500px] overflow-y-auto">
              {filteredIndividual.slice(0, 50).map((s: any) => (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold text-foreground truncate">{s.profile?.full_name || "—"}</p>
                    <p className="font-body text-[10px] text-muted-foreground">{s.roll_number} · {(s.courses as any)?.code || "—"}</p>
                  </div>
                  <span className="font-body text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold shrink-0">Sem {s.semester}</span>
                  {s.semester < 6 ? (
                    <Button size="sm" variant="outline"
                      disabled={promotingIndividual === s.id}
                      onClick={() => handleIndividualPromote(s)}
                      className="rounded-xl font-body text-xs shrink-0">
                      {promotingIndividual === s.id ? (
                        <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <><ArrowUpCircle className="w-3 h-3 mr-1" /> → Sem {s.semester + 1}</>
                      )}
                    </Button>
                  ) : (
                    <span className="font-body text-[10px] text-emerald-600 font-bold">Final Sem</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

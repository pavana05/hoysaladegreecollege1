import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BarChart3, Pencil, Trash2, Save, X, ChevronDown, ChevronUp, GraduationCap, Upload, Settings2 } from "lucide-react";
import { notifyStudents } from "@/hooks/useNotifyStudents";
import {
  PageHero, StatChip, SectionCard, FieldLabel, PrimaryCTA,
} from "@/components/dashboard/premium";

export default function TeacherMarks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [examType, setExamType] = useState("internal");
  const [semester, setSemester] = useState(1);
  const [maxMarks, setMaxMarks] = useState(100);
  const [courseFilter, setCourseFilter] = useState("all");
  const [marksMap, setMarksMap] = useState<Record<string, number>>({});
  const [showManage, setShowManage] = useState(false);
  const [editingMark, setEditingMark] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["teacher-courses-marks"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true);
      return data || [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-marks", courseFilter, semester],
    queryFn: async () => {
      let query = supabase.from("students").select("id, roll_number, user_id, course_id, semester").eq("is_active", true).order("roll_number");
      if (courseFilter !== "all") query = query.eq("course_id", courseFilter);
      query = query.eq("semester", semester);
      const { data: studentsData } = await query;
      if (!studentsData || studentsData.length === 0) return [];
      const userIds = studentsData.map((s) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return studentsData.map((s) => ({
        ...s,
        profile: profiles?.find((p) => p.user_id === s.user_id),
      }));
    },
  });

  // Fetch uploaded marks for manage section
  const { data: uploadedMarks = [], refetch: refetchMarks } = useQuery({
    queryKey: ["teacher-uploaded-marks", user?.id, courseFilter, semester],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase.from("marks")
        .select("*")
        .eq("uploaded_by", user.id)
        .eq("semester", semester)
        .order("created_at", { ascending: false });
      if (courseFilter !== "all") query = query.eq("course_id", courseFilter);
      const { data } = await query;
      if (!data?.length) return [];
      const studentIds = [...new Set(data.map(m => m.student_id))];
      const { data: studentsData } = await supabase.from("students").select("id, roll_number, user_id").in("id", studentIds);
      const userIds = (studentsData || []).map(s => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const studentMap = Object.fromEntries((studentsData || []).map(s => [s.id, s]));
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      return data.map(m => ({
        ...m,
        student_name: profileMap[studentMap[m.student_id]?.user_id]?.full_name || studentMap[m.student_id]?.roll_number || "Unknown",
        roll_number: studentMap[m.student_id]?.roll_number || "",
      }));
    },
    enabled: !!user && showManage,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const records = Object.entries(marksMap)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([student_id, obtained_marks]) => ({
          student_id, subject, exam_type: examType, semester, max_marks: maxMarks, obtained_marks, uploaded_by: user!.id,
          course_id: courseFilter !== "all" ? courseFilter : undefined,
        }));
      if (records.length === 0) throw new Error("Enter marks for at least one student");
      const { error } = await supabase.from("marks").insert(records);
      if (error) throw error;
      return records.length;
    },
    onSuccess: () => {
      toast.success("Marks uploaded!");
      setMarksMap({});
      if (showManage) refetchMarks();
      notifyStudents({
        courseId: courseFilter !== "all" ? courseFilter : null,
        semester,
        title: "📝 Marks Updated",
        message: `${examType.charAt(0).toUpperCase() + examType.slice(1)} marks for ${subject} have been uploaded.`,
        type: "marks",
        link: "/dashboard/student/marks",
      });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEditSave = async (markId: string) => {
    const { error } = await supabase.from("marks").update({ obtained_marks: editValue }).eq("id", markId);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Marks updated!");
    setEditingMark(null);
    refetchMarks();
  };

  const handleDeleteMark = async (markId: string) => {
    setDeletingId(markId);
    const { error } = await supabase.from("marks").delete().eq("id", markId);
    if (error) toast.error("Failed to delete");
    else { toast.success("Marks deleted!"); refetchMarks(); }
    setDeletingId(null);
  };

  const inputClass = "w-full bg-muted/40 dark:bg-white/[0.04] border border-border/40 rounded-2xl px-4 py-3 font-body text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all duration-300";

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Premium Header */}
      <PageHero
        icon={GraduationCap}
        eyebrow="Assessments"
        title="Upload Marks"
        subtitle="Publish student marks by course, semester, and exam."
        chip={
          <StatChip
            variant={uploadedMarks.length > 0 ? "live" : "idle"}
            pulse={uploadedMarks.length > 0}
            label={uploadedMarks.length > 0 ? "Uploaded" : "None yet"}
            value={uploadedMarks.length || undefined}
          />
        }
      />

      <SectionCard icon={Upload} title="Upload Marks" subtitle="Pick course, semester, exam — then enter scores below.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <div>
            <FieldLabel>Course *</FieldLabel>
            <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setMarksMap({}); }} className={inputClass}>
              <option value="all">All Courses</option>
              {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Semester *</FieldLabel>
            <select value={semester} onChange={(e) => { setSemester(Number(e.target.value)); setMarksMap({}); }} className={inputClass}>
              {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Subject *</FieldLabel>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. DBMS" className={inputClass} />
          </div>
          <div>
            <FieldLabel>Exam Type</FieldLabel>
            <select value={examType} onChange={(e) => setExamType(e.target.value)} className={inputClass}>
              <option value="internal">Internal</option>
              <option value="midterm">Midterm</option>
              <option value="final">Final</option>
            </select>
          </div>
          <div>
            <FieldLabel>Max Marks</FieldLabel>
            <input type="number" value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value))} className={inputClass} />
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {students.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground text-center py-8">No students found for the selected course/semester.</p>
          ) : students.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-background/40 border border-border/30 hover:border-primary/30 transition-colors gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-semibold text-foreground truncate">{s.profile?.full_name || s.roll_number}</p>
                <p className="font-body text-xs text-muted-foreground">{s.roll_number}</p>
              </div>
              <Input type="number" min={0} max={maxMarks} className="w-24 rounded-xl" placeholder="Marks"
                value={marksMap[s.id] ?? ""} onChange={(e) => setMarksMap({ ...marksMap, [s.id]: Number(e.target.value) })} />
            </div>
          ))}
        </div>

        <div className="mt-5">
          <PrimaryCTA icon={Upload} loading={submitMutation.isPending}
            disabled={!subject || Object.keys(marksMap).length === 0 || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}>
            {submitMutation.isPending ? "Uploading…" : "Upload Marks"}
          </PrimaryCTA>
        </div>
      </SectionCard>

      {/* Manage Uploaded Marks */}
      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl">
        <button
          onClick={() => setShowManage(!showManage)}
          className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <h2 className="font-display text-xl font-bold text-foreground">Manage Marks</h2>
              <p className="font-body text-xs text-muted-foreground mt-0.5">Edit or delete previously uploaded marks</p>
            </div>
          </div>
          {showManage ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </button>

        {showManage && (
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-3">
            <div className="border-t border-border/30 pt-4" />
            {uploadedMarks.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground text-center py-6">No marks uploaded for the selected filters.</p>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto">
                {uploadedMarks.map((mark: any) => (
                  <div key={mark.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group">
                    <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <p className="font-body text-xs text-muted-foreground">Student</p>
                        <p className="font-body text-sm font-semibold text-foreground truncate">{mark.student_name}</p>
                      </div>
                      <div>
                        <p className="font-body text-xs text-muted-foreground">Subject</p>
                        <p className="font-body text-sm font-medium text-foreground">{mark.subject}</p>
                      </div>
                      <div>
                        <p className="font-body text-xs text-muted-foreground">Exam</p>
                        <p className="font-body text-sm font-medium text-foreground capitalize">{mark.exam_type}</p>
                      </div>
                      <div>
                        <p className="font-body text-xs text-muted-foreground">Marks</p>
                        {editingMark === mark.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(Number(e.target.value))}
                              className="w-16 h-7 text-sm rounded-lg"
                              min={0}
                              max={mark.max_marks}
                            />
                            <span className="text-xs text-muted-foreground">/ {mark.max_marks}</span>
                          </div>
                        ) : (
                          <p className="font-body text-sm font-bold text-foreground">{mark.obtained_marks} / {mark.max_marks}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {editingMark === mark.id ? (
                        <>
                          <button
                            onClick={() => handleEditSave(mark.id)}
                            className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all hover:scale-105 active:scale-95"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingMark(null)}
                            className="w-8 h-8 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-all hover:scale-105 active:scale-95"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingMark(mark.id); setEditValue(mark.obtained_marks); }}
                            className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-primary/20 transition-all hover:scale-105 active:scale-95"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMark(mark.id)}
                            disabled={deletingId === mark.id}
                            className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

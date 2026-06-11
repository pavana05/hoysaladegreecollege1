import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Phone, MessageSquare, UserX, Filter, PhoneCall, Users, Eye, Send, NotebookPen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHero, StatChip, SectionCard, FieldLabel, PrimaryCTA,
} from "@/components/dashboard/premium";

export default function TeacherAbsent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState("");
  const [note, setNote] = useState("");
  const [remarks, setRemarks] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [callDialog, setCallDialog] = useState<any>(null);
  const [detailsDialog, setDetailsDialog] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);

  const { data: courses = [] } = useQuery({
    queryKey: ["teacher-courses-absent"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true);
      return data || [];
    },
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["students-for-absent", courseFilter, semesterFilter],
    queryFn: async () => {
      let query = supabase.from("students").select("id, roll_number, parent_phone, user_id, course_id, semester, phone, year_level, courses(name, code)").eq("is_active", true).order("roll_number");
      if (courseFilter !== "all") query = query.eq("course_id", courseFilter);
      if (semesterFilter !== "all") query = query.eq("semester", parseInt(semesterFilter));
      const { data: studentsData } = await query;
      if (!studentsData) return [];
      const userIds = studentsData.map((s) => s.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, phone, email").in("user_id", userIds);
      return studentsData.map((s) => ({
        ...s,
        profile: profiles?.find((p) => p.user_id === s.user_id),
      }));
    },
  });

  // Get absent students for selected date - query attendance directly
  const { data: todayAbsent = [], isLoading: absentLoading } = useQuery({
    queryKey: ["absent-students-date", dateFilter, courseFilter, semesterFilter],
    queryFn: async () => {
      // First get all absent attendance records for the date
      let attendanceQuery = supabase.from("attendance").select("student_id").eq("date", dateFilter).eq("status", "absent");
      const { data: absentRecords } = await attendanceQuery;
      if (!absentRecords || absentRecords.length === 0) return [];
      
      const absentIds = [...new Set(absentRecords.map(r => r.student_id))];
      
      // Now fetch those students
      let studentQuery = supabase.from("students").select("id, roll_number, parent_phone, user_id, course_id, semester, phone, year_level, courses(name, code)").in("id", absentIds).eq("is_active", true);
      if (courseFilter !== "all") studentQuery = studentQuery.eq("course_id", courseFilter);
      if (semesterFilter !== "all") studentQuery = studentQuery.eq("semester", parseInt(semesterFilter));
      
      const { data: absentStudents } = await studentQuery;
      if (!absentStudents || absentStudents.length === 0) return [];
      
      const userIds = absentStudents.map(s => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, phone, email").in("user_id", userIds);
      
      return absentStudents.map(s => ({
        ...s,
        profile: profiles?.find(p => p.user_id === s.user_id),
      }));
    },
  });

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["absent-notes"],
    queryFn: async () => {
      const { data: notesData } = await supabase
        .from("absent_notes")
        .select("*, students(roll_number, user_id)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!notesData) return [];
      const userIds = notesData.map((n: any) => n.students?.user_id).filter(Boolean);
      if (userIds.length === 0) return notesData.map((n: any) => ({ ...n, student_name: n.students?.roll_number || "Unknown" }));
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return notesData.map((n: any) => ({
        ...n,
        student_name: profiles?.find((p) => p.user_id === n.students?.user_id)?.full_name || n.students?.roll_number,
      }));
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("absent_notes").insert({
        student_id: selectedStudent, note, remarks, added_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note added!");
      setNote(""); setRemarks(""); setSelectedStudent("");
      queryClient.invalidateQueries({ queryKey: ["absent-notes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  const iosInput = "w-full bg-muted/40 dark:bg-white/[0.04] border border-border/40 rounded-2xl px-4 py-3 font-body text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all duration-300";

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <PageHero
        icon={UserX}
        eyebrow="Follow-ups"
        title="Absent Students Report"
        subtitle="View absent students, call them or their parents, and record notes."
        chip={
          <StatChip
            variant={todayAbsent.length > 0 ? "warn" : "live"}
            pulse={todayAbsent.length === 0}
            label={todayAbsent.length > 0 ? "Absent today" : "All present"}
            value={todayAbsent.length || undefined}
          />
        }
      />

      <SectionCard icon={Filter} title="Filters" subtitle="Narrow down by date, course and semester.">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <FieldLabel>Date</FieldLabel>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={iosInput} />
          </div>
          <div>
            <FieldLabel>Course</FieldLabel>
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className={iosInput}>
              <option value="all">All Courses</option>
              {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Semester</FieldLabel>
            <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className={iosInput}>
              <option value="all">All Semesters</option>
              {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={UserX}
        title={`Absent — ${new Date(dateFilter).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`}
        subtitle={`${todayAbsent.length} student${todayAbsent.length === 1 ? "" : "s"} absent for this date.`}
      >
        {absentLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
        ) : todayAbsent.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center mb-3">
              <Users className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="font-body text-sm text-muted-foreground">No absent students for this date.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {todayAbsent.map((s: any) => {
              const studentPhone = s.profile?.phone || s.phone;
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-destructive/[0.04] border border-destructive/15 hover:border-destructive/30 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold text-foreground truncate">{s.profile?.full_name || s.roll_number}</p>
                    <p className="font-body text-xs text-muted-foreground">{s.roll_number} • {(s as any).courses?.code || "—"} • Sem {s.semester}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {studentPhone && (
                      <a href={`tel:${studentPhone}`} title={`Call student ${studentPhone}`}
                        className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 active:scale-95 transition-all">
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    {s.parent_phone && (
                      <a href={`tel:${s.parent_phone}`} title={`Call parent ${s.parent_phone}`}
                        className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-95 transition-all">
                        <PhoneCall className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => { setSelectedStudent(s.id); setDetailsDialog(s); }}
                      className="h-9 px-3 rounded-xl bg-background/60 border border-border/40 text-foreground font-body text-xs font-semibold hover:bg-muted/50 active:scale-95 transition-all inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Student Details Dialog */}
      <Dialog open={!!detailsDialog} onOpenChange={() => setDetailsDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Student Details</DialogTitle>
          </DialogHeader>
          {detailsDialog && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
                {[
                  ["Name", detailsDialog.profile?.full_name || "—"],
                  ["Roll Number", detailsDialog.roll_number],
                  ["Course", detailsDialog.courses?.name || "—"],
                  ["Semester", `Sem ${detailsDialog.semester}`],
                  ...(detailsDialog.profile?.email ? [["Email", detailsDialog.profile.email]] : []),
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between gap-3">
                    <span className="font-body text-xs text-muted-foreground">{k}</span>
                    <span className="font-body text-sm font-semibold text-foreground text-right">{v as string}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="font-body text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Contact</p>
                {(detailsDialog.profile?.phone || detailsDialog.phone) && (
                  <a href={`tel:${detailsDialog.profile?.phone || detailsDialog.phone}`}>
                    <PrimaryCTA icon={Phone}>Call Student: {detailsDialog.profile?.phone || detailsDialog.phone}</PrimaryCTA>
                  </a>
                )}
                {detailsDialog.parent_phone && (
                  <a href={`tel:${detailsDialog.parent_phone}`} className="block">
                    <Button variant="outline" className="w-full rounded-2xl font-body">
                      <PhoneCall className="w-4 h-4 mr-2" /> Call Parent: {detailsDialog.parent_phone}
                    </Button>
                  </a>
                )}
                {!detailsDialog.profile?.phone && !detailsDialog.phone && !detailsDialog.parent_phone && (
                  <p className="font-body text-sm text-muted-foreground text-center py-4">No phone numbers available.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SectionCard icon={NotebookPen} title="Add Absence Note" subtitle="Record the reason and any follow-up remarks.">
        <form onSubmit={(e) => { e.preventDefault(); addNoteMutation.mutate(); }} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Student</FieldLabel>
              <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className={iosInput}>
                <option value="">Select student</option>
                {students.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.profile?.full_name || s.roll_number} ({s.roll_number})</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Note *</FieldLabel>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for absence" className={iosInput} />
            </div>
          </div>
          <div>
            <FieldLabel>Remarks</FieldLabel>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} placeholder="Additional remarks, follow-up plan, parent feedback…" className={`${iosInput} resize-none`} />
          </div>
          <PrimaryCTA type="submit" icon={Send} loading={addNoteMutation.isPending}
            disabled={!selectedStudent || !note || addNoteMutation.isPending}>
            {addNoteMutation.isPending ? "Saving…" : "Save Note"}
          </PrimaryCTA>
        </form>
      </SectionCard>

      <SectionCard icon={MessageSquare} title="Recent Notes" subtitle={`${notes.length} recent`}>
        {notesLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
        ) : notes.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground text-center py-6">No absence notes yet.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((n: any) => (
              <div key={n.id} className="p-4 rounded-2xl bg-background/40 border border-border/30 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <MessageSquare className="w-3 h-3 text-primary" />
                  <span className="font-body text-xs font-semibold text-foreground">{n.student_name}</span>
                  <span className="font-body text-[10px] text-muted-foreground">• {n.date}</span>
                </div>
                <p className="font-body text-sm text-foreground">{n.note}</p>
                {n.remarks && <p className="font-body text-xs text-muted-foreground mt-1.5">Remark: {n.remarks}</p>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

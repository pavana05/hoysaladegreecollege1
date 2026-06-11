import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Phone, MessageSquare, UserX, Filter, PhoneCall, Users, Eye, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <PageHero
        icon={UserX}
        eyebrow="Follow-ups"
        title="Absent Students Report"
        subtitle="View absent students, call them or their parents, and add notes."
        chip={
          <StatChip
            variant={todayAbsent.length > 0 ? "warn" : "live"}
            pulse={todayAbsent.length === 0}
            label={todayAbsent.length > 0 ? "Absent today" : "All present"}
            value={todayAbsent.length || undefined}
          />
        }
      />

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="font-body text-sm font-bold text-foreground">Filters</h3>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Date</label>
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Course</label>
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className={inputClass}>
              <option value="all">All Courses</option>
              {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Semester</label>
            <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className={inputClass}>
              <option value="all">All Semesters</option>
              {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Absent Students */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <UserX className="w-5 h-5 text-destructive" /> Absent Students — {new Date(dateFilter).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-body ml-2">{todayAbsent.length}</span>
        </h3>
        {absentLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : todayAbsent.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="font-body text-sm text-muted-foreground">No absent students for this date! 🎉</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {todayAbsent.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-destructive/5 border border-destructive/15 hover:shadow-md transition-all">
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-foreground">{s.profile?.full_name || s.roll_number}</p>
                  <p className="font-body text-xs text-muted-foreground">{s.roll_number} • {(s as any).courses?.code || "—"} • Sem {s.semester}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setDetailsDialog(s)} className="rounded-xl font-body text-xs">
                    <Eye className="w-3 h-3 mr-1" /> Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Details Dialog */}
      <Dialog open={!!detailsDialog} onOpenChange={() => setDetailsDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Student Details</DialogTitle>
          </DialogHeader>
          {detailsDialog && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-body text-xs text-muted-foreground">Name</span>
                  <span className="font-body text-sm font-semibold text-foreground">{detailsDialog.profile?.full_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-xs text-muted-foreground">Roll Number</span>
                  <span className="font-body text-sm text-foreground">{detailsDialog.roll_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-xs text-muted-foreground">Course</span>
                  <span className="font-body text-sm text-foreground">{detailsDialog.courses?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                   <span className="font-body text-xs text-muted-foreground">Semester</span>
                   <span className="font-body text-sm text-foreground">Sem {detailsDialog.semester}</span>
                </div>
                {detailsDialog.profile?.email && (
                  <div className="flex justify-between">
                    <span className="font-body text-xs text-muted-foreground">Email</span>
                    <span className="font-body text-sm text-foreground">{detailsDialog.profile.email}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="font-body text-xs font-bold text-foreground uppercase tracking-wider">Contact</p>
                {(detailsDialog.profile?.phone || detailsDialog.phone) && (
                  <a href={`tel:${detailsDialog.profile?.phone || detailsDialog.phone}`} className="block">
                    <Button className="w-full rounded-xl font-body bg-primary hover:bg-primary/90">
                      <Phone className="w-4 h-4 mr-2" /> Call Student: {detailsDialog.profile?.phone || detailsDialog.phone}
                    </Button>
                  </a>
                )}
                {detailsDialog.parent_phone && (
                  <a href={`tel:${detailsDialog.parent_phone}`} className="block">
                    <Button variant="outline" className="w-full rounded-xl font-body">
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

      {/* Add Absence Note */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <h3 className="font-display text-lg font-bold text-foreground mb-4">Add Absence Note</h3>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Student</label>
            <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className={inputClass}>
              <option value="">Select student</option>
              {students.map((s: any) => (
                <option key={s.id} value={s.id}>{s.profile?.full_name || s.roll_number} ({s.roll_number})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Note *</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for absence" className="rounded-xl" />
          </div>
        </div>
        <div className="mb-4">
          <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Remarks</label>
          <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Additional remarks (optional)" className="rounded-xl" />
        </div>
        <Button disabled={!selectedStudent || !note || addNoteMutation.isPending} onClick={() => addNoteMutation.mutate()} className="rounded-xl font-body">
          {addNoteMutation.isPending ? "Saving..." : "Add Note"}
        </Button>
      </div>

      {/* Recent Notes */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <h3 className="font-display text-lg font-bold text-foreground mb-4">Recent Notes</h3>
        {notesLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : notes.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">No absence notes yet.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((n: any) => (
              <div key={n.id} className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-3 h-3 text-primary" />
                  <span className="font-body text-xs font-semibold text-foreground">{n.student_name}</span>
                  <span className="font-body text-xs text-muted-foreground">• {n.date}</span>
                </div>
                <p className="font-body text-sm text-foreground">{n.note}</p>
                {n.remarks && <p className="font-body text-xs text-muted-foreground mt-1">Remark: {n.remarks}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

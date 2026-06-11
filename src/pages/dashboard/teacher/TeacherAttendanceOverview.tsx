import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCheck, UserX, Filter, ArrowLeft, Users, Eye, Phone, X, User, BookOpen, Calendar, MapPin, MessageSquare, PhoneCall, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BackButton from "@/components/BackButton";

export default function TeacherAttendanceOverview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [courseFilter, setCourseFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  // Absent report state
  const [selectedAbsentStudent, setSelectedAbsentStudent] = useState("");
  const [note, setNote] = useState("");
  const [remarks, setRemarks] = useState("");
  const [detailsDialog, setDetailsDialog] = useState<any>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["teacher-att-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true);
      return data || [];
    },
  });

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["teacher-att-overview", dateFilter, courseFilter, semesterFilter],
    queryFn: async () => {
      const { data: records } = await supabase.from("attendance").select("student_id, status").eq("date", dateFilter);
      if (!records || records.length === 0) return { present: [], absent: [] };

      const statusMap = new Map<string, string>();
      records.forEach(r => statusMap.set(r.student_id, r.status));

      const presentIds = [...statusMap.entries()].filter(([, s]) => s === "present").map(([id]) => id);
      const absentIds = [...statusMap.entries()].filter(([, s]) => s === "absent").map(([id]) => id);
      const allIds = [...new Set([...presentIds, ...absentIds])];
      if (allIds.length === 0) return { present: [], absent: [] };

      let query = supabase.from("students").select("id, roll_number, semester, user_id, course_id, phone, parent_phone, father_name, mother_name, address, date_of_birth, admission_year, courses(name, code)").in("id", allIds).eq("is_active", true);
      if (courseFilter !== "all") query = query.eq("course_id", courseFilter);
      if (semesterFilter !== "all") query = query.eq("semester", parseInt(semesterFilter));

      const { data: students } = await query;
      if (!students) return { present: [], absent: [] };

      const userIds = students.map(s => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);

      const enrich = (s: any) => ({
        ...s,
        name: profiles?.find(p => p.user_id === s.user_id)?.full_name || s.roll_number,
        email: profiles?.find(p => p.user_id === s.user_id)?.email || "",
        courseName: (s.courses as any)?.code || "—",
        courseFullName: (s.courses as any)?.name || "—",
      });

      return {
        present: students.filter(s => presentIds.includes(s.id)).map(enrich),
        absent: students.filter(s => absentIds.includes(s.id)).map(enrich),
      };
    },
  });

  // Students list for absent note dropdown
  const { data: allStudents = [] } = useQuery({
    queryKey: ["teacher-all-students-absent", courseFilter, semesterFilter],
    queryFn: async () => {
      let query = supabase.from("students").select("id, roll_number, user_id, course_id, semester").eq("is_active", true).order("roll_number");
      if (courseFilter !== "all") query = query.eq("course_id", courseFilter);
      if (semesterFilter !== "all") query = query.eq("semester", parseInt(semesterFilter));
      const { data } = await query;
      if (!data) return [];
      const userIds = data.map(s => s.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return data.map(s => ({ ...s, name: profiles?.find(p => p.user_id === s.user_id)?.full_name || s.roll_number }));
    },
  });

  // Recent absent notes
  const { data: absentNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["teacher-absent-notes"],
    queryFn: async () => {
      const { data } = await supabase.from("absent_notes").select("*, students(roll_number, user_id)").order("created_at", { ascending: false }).limit(20);
      if (!data) return [];
      const userIds = data.map((n: any) => n.students?.user_id).filter(Boolean);
      if (userIds.length === 0) return data.map((n: any) => ({ ...n, student_name: n.students?.roll_number || "Unknown" }));
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return data.map((n: any) => ({ ...n, student_name: profiles?.find(p => p.user_id === n.students?.user_id)?.full_name || n.students?.roll_number }));
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("absent_notes").insert({
        student_id: selectedAbsentStudent, note, remarks, added_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note added!");
      setNote(""); setRemarks(""); setSelectedAbsentStudent("");
      queryClient.invalidateQueries({ queryKey: ["teacher-absent-notes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";
  const totalPresent = attendanceData?.present.length || 0;
  const totalAbsent = attendanceData?.absent.length || 0;

  const StudentRow = ({ s, status }: { s: any; status: "present" | "absent" }) => {
    const isPresent = status === "present";
    return (
      <div className={`flex items-center justify-between p-3 rounded-xl ${isPresent ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-destructive/5 border border-destructive/10"}`}>
        <div className="min-w-0 flex-1">
          <p className="font-body text-sm font-semibold text-foreground">{s.name}</p>
          <p className="font-body text-xs text-muted-foreground">{s.roll_number} • {s.courseName} • Sem {s.semester}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-body font-semibold ${isPresent ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
            {isPresent ? "Present" : "Absent"}
          </span>
          <Button variant="outline" size="sm" className="h-8 px-2.5 rounded-lg text-xs gap-1.5"
            onClick={() => setSelectedStudent({ ...s, attendanceStatus: status })}>
            <Eye className="w-3.5 h-3.5" /> View
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHero
        icon={BarChart3}
        eyebrow="Trends"
        title="Attendance Overview"
        subtitle="Review presence, absences, and class trends."
        chip={
          <StatChip
            variant="neutral"
            label="Records"
            value={totalPresent + totalAbsent}
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
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={inputClass} />
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
              {[1,2,3,4,5,6].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
            <UserCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{totalPresent}</p>
          <p className="font-body text-xs text-muted-foreground">Present</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-2">
            <UserX className="w-5 h-5 text-destructive" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{totalAbsent}</p>
          <p className="font-body text-xs text-muted-foreground">Absent</p>
        </div>
      </div>

      {/* Tabs: Overview + Absent Report */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="overview" className="font-body text-xs">Attendance Overview</TabsTrigger>
          <TabsTrigger value="absent-report" className="font-body text-xs">Absent Students Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
                <h3 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-500" /> Present
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-body ml-auto">{totalPresent}</span>
                </h3>
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {totalPresent === 0 ? (
                    <p className="font-body text-sm text-muted-foreground text-center py-6">No data</p>
                  ) : attendanceData?.present.map((s: any) => (
                    <StudentRow key={s.id} s={s} status="present" />
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
                <h3 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <UserX className="w-4 h-4 text-destructive" /> Absent
                  <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-body ml-auto">{totalAbsent}</span>
                </h3>
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {totalAbsent === 0 ? (
                    <p className="font-body text-sm text-muted-foreground text-center py-6">No absent students 🎉</p>
                  ) : attendanceData?.absent.map((s: any) => (
                    <StudentRow key={s.id} s={s} status="absent" />
                  ))}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="absent-report" className="space-y-4">
          {/* Absent Students List */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
            <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <UserX className="w-5 h-5 text-destructive" /> Absent Students — {new Date(dateFilter).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-body ml-2">{totalAbsent}</span>
            </h3>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : totalAbsent === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="font-body text-sm text-muted-foreground">No absent students for this date! 🎉</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {attendanceData?.absent.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-destructive/5 border border-destructive/15 hover:shadow-md transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-semibold text-foreground">{s.name}</p>
                      <p className="font-body text-xs text-muted-foreground">{s.roll_number} • {s.courseName} • Sem {s.semester}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(s.phone || s.parent_phone) && (
                        <a href={`tel:${s.parent_phone || s.phone}`} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors">
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setDetailsDialog(s)} className="rounded-xl font-body text-xs">
                        <Eye className="w-3 h-3 mr-1" /> Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Absence Note */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
            <h3 className="font-display text-lg font-bold text-foreground mb-4">Add Absence Note</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Student</label>
                <select value={selectedAbsentStudent} onChange={(e) => setSelectedAbsentStudent(e.target.value)} className={inputClass}>
                  <option value="">Select student</option>
                  {allStudents.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>
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
            <Button disabled={!selectedAbsentStudent || !note || addNoteMutation.isPending} onClick={() => addNoteMutation.mutate()} className="rounded-xl font-body">
              {addNoteMutation.isPending ? "Saving..." : "Add Note"}
            </Button>
          </div>

          {/* Recent Notes */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
            <h3 className="font-display text-lg font-bold text-foreground mb-4">Recent Notes</h3>
            {notesLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : absentNotes.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">No absence notes yet.</p>
            ) : (
              <div className="space-y-3">
                {absentNotes.map((n: any) => (
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
        </TabsContent>
      </Tabs>

      {/* Student Detail Modal for overview */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in" onClick={() => setSelectedStudent(null)}>
          <div className="my-auto w-full max-w-md">
            <div className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className={`p-5 relative overflow-hidden ${selectedStudent.attendanceStatus === "present" ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5" : "bg-gradient-to-br from-destructive/10 to-destructive/5"}`}>
                <button onClick={() => setSelectedStudent(null)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-background/50 hover:bg-background transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedStudent.attendanceStatus === "present" ? "bg-emerald-500/20" : "bg-destructive/20"}`}>
                    <User className={`w-7 h-7 ${selectedStudent.attendanceStatus === "present" ? "text-emerald-500" : "text-destructive"}`} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">{selectedStudent.name}</h3>
                    <p className="font-body text-xs text-muted-foreground">{selectedStudent.roll_number}</p>
                    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-body font-semibold ${
                      selectedStudent.attendanceStatus === "present" ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"
                    }`}>
                      {selectedStudent.attendanceStatus === "present" ? "Present" : "Absent"} — {dateFilter}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem icon={BookOpen} label="Course" value={selectedStudent.courseFullName} />
                  <DetailItem icon={Calendar} label="Semester" value={`Semester ${selectedStudent.semester}`} />
                  <DetailItem icon={User} label="Father" value={selectedStudent.father_name || "—"} />
                  <DetailItem icon={User} label="Mother" value={selectedStudent.mother_name || "—"} />
                  <DetailItem icon={Calendar} label="DOB" value={selectedStudent.date_of_birth || "—"} />
                  <DetailItem icon={Calendar} label="Admission" value={selectedStudent.admission_year ? String(selectedStudent.admission_year) : "—"} />
                </div>
                {selectedStudent.address && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Address</p>
                      <p className="font-body text-xs text-foreground mt-0.5">{selectedStudent.address}</p>
                    </div>
                  </div>
                )}
                <div className="pt-2 space-y-2">
                  <h4 className="font-body text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quick Contact</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <a href={selectedStudent.phone ? `tel:${selectedStudent.phone}` : "#"}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl font-body text-sm font-semibold transition-all duration-200 ${
                        selectedStudent.phone ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20" : "bg-muted/30 text-muted-foreground cursor-not-allowed border border-border"
                      }`} onClick={e => { if (!selectedStudent.phone) e.preventDefault(); }}>
                      <Phone className="w-4 h-4" /> Call Student
                    </a>
                    <a href={selectedStudent.parent_phone ? `tel:${selectedStudent.parent_phone}` : "#"}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl font-body text-sm font-semibold transition-all duration-200 ${
                        selectedStudent.parent_phone ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20" : "bg-muted/30 text-muted-foreground cursor-not-allowed border border-border"
                      }`} onClick={e => { if (!selectedStudent.parent_phone) e.preventDefault(); }}>
                      <Phone className="w-4 h-4" /> Call Parent
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Details Dialog for absent report */}
      <Dialog open={!!detailsDialog} onOpenChange={() => setDetailsDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Student Details</DialogTitle>
          </DialogHeader>
          {detailsDialog && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between"><span className="font-body text-xs text-muted-foreground">Name</span><span className="font-body text-sm font-semibold text-foreground">{detailsDialog.name}</span></div>
                <div className="flex justify-between"><span className="font-body text-xs text-muted-foreground">Roll Number</span><span className="font-body text-sm text-foreground">{detailsDialog.roll_number}</span></div>
                <div className="flex justify-between"><span className="font-body text-xs text-muted-foreground">Course</span><span className="font-body text-sm text-foreground">{detailsDialog.courseFullName || "—"}</span></div>
                <div className="flex justify-between"><span className="font-body text-xs text-muted-foreground">Semester</span><span className="font-body text-sm text-foreground">Sem {detailsDialog.semester}</span></div>
                {detailsDialog.email && <div className="flex justify-between"><span className="font-body text-xs text-muted-foreground">Email</span><span className="font-body text-sm text-foreground">{detailsDialog.email}</span></div>}
              </div>
              <div className="space-y-2">
                <p className="font-body text-xs font-bold text-foreground uppercase tracking-wider">Contact</p>
                {(detailsDialog.phone) && (
                  <a href={`tel:${detailsDialog.phone}`} className="block">
                    <Button className="w-full rounded-xl font-body bg-primary hover:bg-primary/90"><Phone className="w-4 h-4 mr-2" /> Call Student: {detailsDialog.phone}</Button>
                  </a>
                )}
                {detailsDialog.parent_phone && (
                  <a href={`tel:${detailsDialog.parent_phone}`} className="block">
                    <Button variant="outline" className="w-full rounded-xl font-body"><PhoneCall className="w-4 h-4 mr-2" /> Call Parent: {detailsDialog.parent_phone}</Button>
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="font-body text-xs text-foreground font-medium mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

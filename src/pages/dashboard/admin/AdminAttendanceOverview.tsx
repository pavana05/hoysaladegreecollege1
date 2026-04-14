import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserCheck, UserX, Filter, ArrowLeft, Users, Phone, Eye, User, BookOpen, Hash, MapPin, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import BackButton from "@/components/BackButton";

export default function AdminAttendanceOverview() {
  const [courseFilter, setCourseFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleViewStudent = async (student: any) => {
    // Fetch full student details including parent phone
    const { data: fullStudent } = await supabase
      .from("students")
      .select("*, courses(name, code)")
      .eq("id", student.id)
      .single();
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("user_id", student.user_id)
      .single();

    setSelectedStudent({
      ...student,
      phone: fullStudent?.phone || "",
      parent_phone: fullStudent?.parent_phone || "",
      address: fullStudent?.address || "",
      father_name: fullStudent?.father_name || "",
      mother_name: fullStudent?.mother_name || "",
      date_of_birth: fullStudent?.date_of_birth || "",
      email: profile?.email || "",
      profilePhone: profile?.phone || "",
    });
    setDialogOpen(true);
  };

  const { data: courses = [] } = useQuery({
    queryKey: ["att-overview-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true);
      return data || [];
    },
  });

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["att-overview", dateFilter, courseFilter, semesterFilter],
    queryFn: async () => {
      // Get all attendance records for the date
      const { data: records } = await supabase.from("attendance").select("student_id, status").eq("date", dateFilter);
      if (!records || records.length === 0) return { present: [], absent: [], unmarked: [] };

      // Deduplicate: take latest status per student
      const statusMap = new Map<string, string>();
      records.forEach(r => statusMap.set(r.student_id, r.status));

      const presentIds = [...statusMap.entries()].filter(([, s]) => s === "present").map(([id]) => id);
      const absentIds = [...statusMap.entries()].filter(([, s]) => s === "absent").map(([id]) => id);
      const allMarkedIds = [...statusMap.keys()];

      // Get student details
      let studentsQuery = supabase.from("students").select("id, roll_number, semester, user_id, course_id, courses(name, code)").eq("is_active", true);
      if (courseFilter !== "all") studentsQuery = studentsQuery.eq("course_id", courseFilter);
      if (semesterFilter !== "all") studentsQuery = studentsQuery.eq("semester", parseInt(semesterFilter));

      const { data: students } = await studentsQuery;
      if (!students) return { present: [], absent: [], unmarked: [] };

      const userIds = students.map(s => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);

      const enrich = (s: any) => ({
        ...s,
        name: profiles?.find(p => p.user_id === s.user_id)?.full_name || s.roll_number,
        courseName: (s.courses as any)?.code || "—",
      });

      const present = students.filter(s => presentIds.includes(s.id)).map(enrich);
      const absent = students.filter(s => absentIds.includes(s.id)).map(enrich);
      const unmarked = students.filter(s => !allMarkedIds.includes(s.id)).map(enrich);

      return { present, absent, unmarked };
    },
  });

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";
  const totalPresent = attendanceData?.present.length || 0;
  const totalAbsent = attendanceData?.absent.length || 0;
  const totalUnmarked = attendanceData?.unmarked.length || 0;
  const total = totalPresent + totalAbsent + totalUnmarked;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Attendance Overview
            </h2>
            <p className="font-body text-sm text-muted-foreground mt-1">View present and absent students with filters</p>
          </div>
        </div>
      </div>

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

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
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
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{totalUnmarked}</p>
          <p className="font-body text-xs text-muted-foreground">Not Marked</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Present */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
            <h3 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-500" /> Present Students
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-body ml-auto">{totalPresent}</span>
            </h3>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {attendanceData?.present.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground text-center py-6">No present students found</p>
              ) : attendanceData?.present.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div>
                    <p className="font-body text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="font-body text-xs text-muted-foreground">{s.roll_number} • {s.courseName} • Sem {s.semester}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-body font-semibold">Present</span>
                </div>
              ))}
            </div>
          </div>

          {/* Absent */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
            <h3 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <UserX className="w-4 h-4 text-destructive" /> Absent Students
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-body ml-auto">{totalAbsent}</span>
            </h3>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {attendanceData?.absent.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground text-center py-6">No absent students 🎉</p>
              ) : attendanceData?.absent.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                  <div>
                    <p className="font-body text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="font-body text-xs text-muted-foreground">{s.roll_number} • {s.courseName} • Sem {s.semester}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => handleViewStudent(s)}
                    >
                      <Eye className="w-3 h-3" /> View
                    </Button>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-body font-semibold">Absent</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Student Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <User className="w-5 h-5 text-primary" /> Student Details
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-body text-sm font-semibold text-foreground">{selectedStudent.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span className="font-body text-sm text-muted-foreground">Roll: {selectedStudent.roll_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="font-body text-sm text-muted-foreground">{selectedStudent.courseName} • Semester {selectedStudent.semester}</span>
                </div>
                {selectedStudent.father_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-body text-sm text-muted-foreground">Father: {selectedStudent.father_name}</span>
                  </div>
                )}
                {selectedStudent.mother_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-body text-sm text-muted-foreground">Mother: {selectedStudent.mother_name}</span>
                  </div>
                )}
                {selectedStudent.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="font-body text-sm text-muted-foreground">{selectedStudent.address}</span>
                  </div>
                )}
                {selectedStudent.date_of_birth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-body text-sm text-muted-foreground">DOB: {selectedStudent.date_of_birth}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="gap-2"
                  onClick={() => {
                    const phone = selectedStudent.phone || selectedStudent.profilePhone;
                    if (phone) window.open(`tel:${phone}`, "_self");
                  }}
                  disabled={!selectedStudent.phone && !selectedStudent.profilePhone}
                >
                  <Phone className="w-4 h-4" />
                  Call Student
                </Button>
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => {
                    if (selectedStudent.parent_phone) window.open(`tel:${selectedStudent.parent_phone}`, "_self");
                  }}
                  disabled={!selectedStudent.parent_phone}
                >
                  <Phone className="w-4 h-4" />
                  Call Parent
                </Button>
              </div>

              {!selectedStudent.phone && !selectedStudent.profilePhone && !selectedStudent.parent_phone && (
                <p className="font-body text-xs text-muted-foreground text-center">No phone numbers available for this student.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

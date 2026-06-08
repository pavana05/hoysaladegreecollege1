import { supabase } from "@/integrations/supabase/client";
import { IOSSelect } from "@/components/ui/ios-select";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserX, Filter, Eye, Phone, PhoneCall, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAbsentReport() {
  const [courseFilter, setCourseFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [detailsDialog, setDetailsDialog] = useState<any>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-courses-absent"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true);
      return data || [];
    },
  });

  const { data: absentStudents = [], isLoading } = useQuery({
    queryKey: ["admin-absent-students", dateFilter, courseFilter, semesterFilter],
    queryFn: async () => {
      const { data: absentRecords } = await supabase.from("attendance").select("student_id").eq("date", dateFilter).eq("status", "absent");
      if (!absentRecords || absentRecords.length === 0) return [];

      const absentIds = [...new Set(absentRecords.map(r => r.student_id))];
      let query = supabase.from("students").select("id, roll_number, parent_phone, user_id, course_id, semester, phone, year_level, courses(name, code)").in("id", absentIds).eq("is_active", true);
      if (courseFilter !== "all") query = query.eq("course_id", courseFilter);
      if (semesterFilter !== "all") query = query.eq("semester", parseInt(semesterFilter));

      const { data: students } = await query;
      if (!students || students.length === 0) return [];

      const userIds = students.map(s => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, phone, email").in("user_id", userIds);

      return students.map(s => ({
        ...s,
        profile: profiles?.find(p => p.user_id === s.user_id),
      }));
    },
  });

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-border rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <UserX className="w-5 h-5 text-destructive" /> Absent Report (Admin)
        </h2>
        <p className="font-body text-sm text-muted-foreground mt-1">View all absent students across courses with contact details</p>
      </div>

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
            <IOSSelect value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className={inputClass}>
              <option value="all">All Courses</option>
              {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </IOSSelect>
          </div>
          <div>
            <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Semester</label>
            <IOSSelect value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className={inputClass}>
              <option value="all">All Semesters</option>
              {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </IOSSelect>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <UserX className="w-5 h-5 text-destructive" /> Absent — {new Date(dateFilter).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-body ml-2">{absentStudents.length}</span>
        </h3>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : absentStudents.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="font-body text-sm text-muted-foreground">No absent students for this date! 🎉</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {absentStudents.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-destructive/5 border border-destructive/15 hover:shadow-md transition-all">
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-foreground">{s.profile?.full_name || s.roll_number}</p>
                  <p className="font-body text-xs text-muted-foreground">{s.roll_number} • {s.courses?.code || "—"} • Sem {s.semester}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setDetailsDialog(s)} className="rounded-xl font-body text-xs shrink-0">
                  <Eye className="w-3 h-3 mr-1" /> Details
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!detailsDialog} onOpenChange={() => setDetailsDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Student Details</DialogTitle>
          </DialogHeader>
          {detailsDialog && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between"><span className="font-body text-xs text-muted-foreground">Name</span><span className="font-body text-sm font-semibold">{detailsDialog.profile?.full_name || "—"}</span></div>
                <div className="flex justify-between"><span className="font-body text-xs text-muted-foreground">Roll</span><span className="font-body text-sm">{detailsDialog.roll_number}</span></div>
                <div className="flex justify-between"><span className="font-body text-xs text-muted-foreground">Course</span><span className="font-body text-sm">{detailsDialog.courses?.name || "—"}</span></div>
                <div className="flex justify-between"><span className="font-body text-xs text-muted-foreground">Semester</span><span className="font-body text-sm">Sem {detailsDialog.semester}</span></div>
              </div>
              <div className="space-y-2">
                {(detailsDialog.profile?.phone || detailsDialog.phone) && (
                  <a href={`tel:${detailsDialog.profile?.phone || detailsDialog.phone}`} className="block">
                    <Button className="w-full rounded-xl font-body"><Phone className="w-4 h-4 mr-2" /> Call Student: {detailsDialog.profile?.phone || detailsDialog.phone}</Button>
                  </a>
                )}
                {detailsDialog.parent_phone && (
                  <a href={`tel:${detailsDialog.parent_phone}`} className="block">
                    <Button variant="outline" className="w-full rounded-xl font-body"><PhoneCall className="w-4 h-4 mr-2" /> Call Parent: {detailsDialog.parent_phone}</Button>
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
    </div>
  );
}

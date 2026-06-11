import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Trash2, Clock, LayoutGrid, List } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHero, SectionCard, FieldLabel, PrimaryCTA } from "@/components/dashboard/premium";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const defaultPeriods = [
  "9:00 - 9:50",
  "9:50 - 10:40",
  "10:50 - 11:40",
  "11:40 - 12:30",
  "1:10 - 2:00",
  "2:00 - 2:50",
  "2:50 - 3:40",
];

export default function TeacherTimetable() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [batchMode, setBatchMode] = useState(true);
  const [batchDay, setBatchDay] = useState("Monday");
  const [batchCourse, setBatchCourse] = useState("");
  const [batchSemester, setBatchSemester] = useState("");
  const [batchEntries, setBatchEntries] = useState(
    defaultPeriods.map(p => ({ period: p, subject: "", teacher_name: "", room: "" }))
  );
  const [form, setForm] = useState({ day_of_week: "Monday", period: "", subject: "", teacher_name: "", room: "", course_filter: "All", semester_filter: "" });
  const [viewCourse, setViewCourse] = useState("All");
  const [viewSemester, setViewSemester] = useState("All");

  const { data: courses = [] } = useQuery({
    queryKey: ["timetable-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true);
      return data || [];
    },
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["teacher-timetable"],
    queryFn: async () => {
      const { data } = await supabase.from("timetables").select("*, courses(name, code)").order("day_of_week").order("period");
      return data || [];
    },
  });

  const addBatch = useMutation({
    mutationFn: async () => {
      const courseId = batchCourse || null;
      const semester = batchSemester ? parseInt(batchSemester) : null;
      const records = batchEntries
        .filter(e => e.subject.trim())
        .map(e => ({
          title: `${batchDay} - ${e.period}`,
          day_of_week: batchDay,
          period: e.period,
          subject: e.subject,
          teacher_name: e.teacher_name,
          room: e.room,
          course_id: courseId,
          semester,
          uploaded_by: user?.id,
        }));
      if (records.length === 0) throw new Error("Please fill at least one subject");
      const { error } = await supabase.from("timetables").insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher-timetable"] });
      toast.success(`${batchDay}'s timetable uploaded!`);
      setBatchEntries(defaultPeriods.map(p => ({ period: p, subject: "", teacher_name: "", room: "" })));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      const courseId = form.course_filter !== "All" ? form.course_filter : null;
      const semester = form.semester_filter ? parseInt(form.semester_filter) : null;
      const { error } = await supabase.from("timetables").insert({
        title: `${form.day_of_week} - ${form.period}`,
        day_of_week: form.day_of_week,
        period: form.period,
        subject: form.subject,
        teacher_name: form.teacher_name,
        room: form.room,
        course_id: courseId,
        semester,
        uploaded_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher-timetable"] });
      toast.success("Entry added");
      setForm({ ...form, period: "", subject: "", teacher_name: "", room: "" });
    },
    onError: () => toast.error("Failed to add entry"),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timetables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["teacher-timetable"] }); toast.success("Deleted"); },
  });

  const filteredEntries = entries.filter((e: any) => {
    if (viewCourse !== "All" && e.course_id !== viewCourse) return false;
    if (viewSemester !== "All" && e.semester !== parseInt(viewSemester)) return false;
    return true;
  });
  const inputClass = "w-full bg-muted/40 dark:bg-white/[0.04] border border-border/40 rounded-2xl px-4 py-3 font-body text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all duration-300";

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Premium Header */}
      <PageHero
        icon={Calendar}
        eyebrow="Schedule"
        title="Timetable Management"
        subtitle="Upload full day schedules or add individual entries."
      />

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1.5 bg-muted/40 backdrop-blur-xl border border-border/30 rounded-2xl w-fit">
        <button onClick={() => setBatchMode(true)}
          className={`px-4 py-2 rounded-xl font-body text-sm font-semibold transition-all flex items-center gap-2 ${batchMode ? "bg-card text-foreground shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)]" : "text-muted-foreground hover:text-foreground"}`}>
          <LayoutGrid className="w-4 h-4" /> Full Day Upload
        </button>
        <button onClick={() => setBatchMode(false)}
          className={`px-4 py-2 rounded-xl font-body text-sm font-semibold transition-all flex items-center gap-2 ${!batchMode ? "bg-card text-foreground shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)]" : "text-muted-foreground hover:text-foreground"}`}>
          <List className="w-4 h-4" /> Single Entry
        </button>
      </div>

      {/* Batch Mode */}
      {batchMode ? (
        <SectionCard icon={Clock} title="Full Day Timetable" subtitle="Set day, course and semester — then fill the period grid.">
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            <div>
              <FieldLabel>Day *</FieldLabel>
              <select value={batchDay} onChange={(e) => setBatchDay(e.target.value)} className={inputClass}>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Course</label>
              <select value={batchCourse} onChange={(e) => setBatchCourse(e.target.value)} className={inputClass}>
                <option value="">All Courses (General)</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Semester</label>
              <select value={batchSemester} onChange={(e) => setBatchSemester(e.target.value)} className={inputClass}>
                <option value="">All Semesters</option>
                {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          </div>

          {/* Period headers */}
          <div className="hidden sm:grid grid-cols-4 gap-2 mb-2 px-1">
            {["Period / Time", "Subject *", "Teacher", "Room"].map(h => (
              <p key={h} className="font-body text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{h}</p>
            ))}
          </div>
          <div className="space-y-2">
            {batchEntries.map((entry, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center p-2.5 rounded-xl bg-muted/20 border border-border/40 hover:border-border transition-colors">
                <input value={entry.period} onChange={(e) => {
                  const updated = [...batchEntries]; updated[i].period = e.target.value; setBatchEntries(updated);
                }} placeholder="9:00 - 9:50" className="border border-border rounded-lg px-2 py-2 font-body text-xs bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none" />
                <input value={entry.subject} onChange={(e) => {
                  const updated = [...batchEntries]; updated[i].subject = e.target.value; setBatchEntries(updated);
                }} placeholder="Subject *" className="border border-border rounded-lg px-2 py-2 font-body text-xs bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none" />
                <input value={entry.teacher_name} onChange={(e) => {
                  const updated = [...batchEntries]; updated[i].teacher_name = e.target.value; setBatchEntries(updated);
                }} placeholder="Teacher" className="border border-border rounded-lg px-2 py-2 font-body text-xs bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none" />
                <input value={entry.room} onChange={(e) => {
                  const updated = [...batchEntries]; updated[i].room = e.target.value; setBatchEntries(updated);
                }} placeholder="Room" className="border border-border rounded-lg px-2 py-2 font-body text-xs bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none" />
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <Button onClick={() => addBatch.mutate()} disabled={addBatch.isPending} className="font-body rounded-xl shadow-md w-full sm:w-auto">
              {addBatch.isPending ? (
                <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</span>
              ) : <><Plus className="w-4 h-4 mr-2" /> Upload {batchDay}'s Timetable</>}
            </Button>
            <Button variant="outline" onClick={() => setBatchEntries(defaultPeriods.map(p => ({ period: p, subject: "", teacher_name: "", room: "" })))} className="font-body rounded-xl w-full sm:w-auto">
              Reset
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
          <h3 className="font-display text-sm font-bold text-foreground mb-5">Add Single Entry</h3>
          <form onSubmit={(e) => { e.preventDefault(); addEntry.mutate(); }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Course</label>
              <select value={form.course_filter} onChange={(e) => setForm({ ...form, course_filter: e.target.value })} className={inputClass}>
                <option value="All">All Courses</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Semester</label>
              <select value={form.semester_filter} onChange={(e) => setForm({ ...form, semester_filter: e.target.value })} className={inputClass}>
                <option value="">All Semesters</option>
                {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Day *</label>
              <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} className={inputClass}>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Period / Time *</label>
              <input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} required placeholder="e.g. 9:00 - 9:50" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Subject *</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Teacher</label>
              <input value={form.teacher_name} onChange={(e) => setForm({ ...form, teacher_name: e.target.value })} className={inputClass} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={addEntry.isPending} className="font-body rounded-xl w-full sm:w-auto">
                {addEntry.isPending ? "Adding..." : <><Plus className="w-4 h-4 mr-2" /> Add Entry</>}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Current Timetable */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <h3 className="font-display text-sm font-bold text-foreground">Current Timetable ({filteredEntries.length} entries)</h3>
          <div className="flex flex-wrap gap-2">
            <select value={viewCourse} onChange={(e) => setViewCourse(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 font-body text-xs bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none">
              <option value="All">All Courses</option>
              {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={viewSemester} onChange={(e) => setViewSemester(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 font-body text-xs bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none">
              <option value="All">All Semesters</option>
              {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Sem {s}</option>)}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : (
          days.map((day) => {
            const dayEntries = filteredEntries.filter((e: any) => e.day_of_week === day);
            if (dayEntries.length === 0) return null;
            return (
              <div key={day} className="mb-5">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <h4 className="font-display text-xs font-bold text-primary uppercase tracking-wider">{day}</h4>
                  <div className="flex-1 h-px bg-border" />
                  <span className="font-body text-[10px] text-muted-foreground">{dayEntries.length} periods</span>
                </div>
                <div className="space-y-1.5">
                  {dayEntries.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-20 sm:w-24 text-center py-1.5 rounded-lg bg-primary/8 shrink-0">
                          <span className="font-body text-[10px] font-bold text-primary">{e.period}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="font-body text-sm font-semibold text-foreground">{e.subject}</span>
                          {e.teacher_name && <span className="font-body text-xs text-muted-foreground ml-2">({e.teacher_name})</span>}
                          {e.room && <span className="font-body text-xs text-muted-foreground ml-2 hidden sm:inline">· {e.room}</span>}
                        </div>
                        {e.courses && <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold shrink-0 hidden sm:inline">{e.courses.code}</span>}
                        {e.semester && <span className="ml-1 text-[9px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary-foreground font-bold shrink-0 hidden sm:inline">Sem {e.semester}</span>}
                      </div>
                      <button onClick={() => deleteEntry.mutate(e.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
        {!isLoading && filteredEntries.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="font-body text-sm text-muted-foreground">No timetable entries found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

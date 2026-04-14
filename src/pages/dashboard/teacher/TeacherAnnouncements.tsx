import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Megaphone, Plus, Trash2, ArrowLeft, Bell, BookOpen, Clock } from "lucide-react";
import { notifyStudents } from "@/hooks/useNotifyStudents";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import BackButton from "@/components/BackButton";

export default function TeacherAnnouncements() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", content: "", course_id: "", semester: "0" });
  const [posting, setPosting] = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ["teacher-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true);
      return data || [];
    },
  });

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["teacher-announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*, courses(name, code)")
        .eq("posted_by", user?.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const post = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.content) throw new Error("Title and content are required");
      setPosting(true);
      const { error } = await supabase.from("announcements").insert({
        title: form.title,
        content: form.content,
        course_id: form.course_id || null,
        semester: form.semester !== "0" ? parseInt(form.semester) : null,
        posted_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher-announcements"] });
      toast.success("Announcement posted! Students will see it instantly.");
      notifyStudents({
        courseId: form.course_id || null,
        semester: form.semester !== "0" ? parseInt(form.semester) : null,
        title: "New Announcement",
        message: form.title,
        type: "announcement",
        link: "/dashboard/student/announcements",
      });
      setForm({ title: "", content: "", course_id: "", semester: "0" });
      setPosting(false);
    },
    onError: (e: any) => { toast.error(e.message); setPosting(false); },
  });

  const deleteAnn = useMutation({
    mutationFn: async (id: string) => {
      // Actually delete the record instead of soft-delete
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["teacher-announcements"] }); toast.success("Announcement deleted"); },
    onError: (e: any) => toast.error("Failed to delete: " + e.message),
  });

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-border rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <BackButton />
          <Megaphone className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Announcements</h2>
            <p className="font-body text-sm text-muted-foreground">Post real-time announcements to students</p>
          </div>
        </div>
      </div>

      {/* Post Form */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-display text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Post New Announcement
        </h3>
        <div className="space-y-4">
          <div>
            <label className="font-body text-xs font-semibold block mb-1.5">Title *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="e.g. Assignment Deadline Extended" />
          </div>
          <div>
            <label className="font-body text-xs font-semibold block mb-1.5">Message *</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={3} className={`${inputClass} resize-none`} placeholder="Type your announcement here..." />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold block mb-1.5"><BookOpen className="w-3 h-3 inline mr-1" /> Target Course (optional)</label>
              <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })} className={inputClass}>
                <option value="">All Courses</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold block mb-1.5"><Clock className="w-3 h-3 inline mr-1" /> Target Semester (optional)</label>
              <select value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} className={inputClass}>
                <option value="0">All Semesters</option>
                {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={() => post.mutate()} disabled={posting || !form.title || !form.content} className="rounded-xl font-body">
            <Megaphone className="w-4 h-4 mr-2" /> {posting ? "Posting..." : "Post Announcement"}
          </Button>
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-display text-sm font-bold text-foreground mb-4">Your Announcements ({announcements.length})</h3>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-body text-sm text-muted-foreground">No announcements posted yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a: any) => (
              <div key={a.id} className="flex items-start gap-4 p-4 rounded-xl border border-border hover:shadow-md transition-all group">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-foreground">{a.title}</p>
                  <p className="font-body text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.content}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {a.courses?.name && <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-primary/10 text-primary">{a.courses.name}</span>}
                    {a.semester && <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-foreground">Sem {a.semester}</span>}
                    <span className="text-[10px] font-body text-muted-foreground">{format(new Date(a.created_at), "MMM d, yyyy · h:mm a")}</span>
                  </div>
                </div>
                <button onClick={() => { if (confirm("Delete this announcement permanently?")) deleteAnn.mutate(a.id); }}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

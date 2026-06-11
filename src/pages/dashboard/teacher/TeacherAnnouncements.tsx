import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, Bell, BookOpen, Clock, Send } from "lucide-react";
import { notifyStudents } from "@/hooks/useNotifyStudents";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  PageHero, StatChip, SectionCard, FieldLabel, PrimaryCTA,
} from "@/components/dashboard/premium";

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

  const inputClass = "w-full bg-muted/40 dark:bg-white/[0.04] border border-border/40 rounded-2xl px-4 py-3 font-body text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all duration-300";

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <PageHero
        icon={Megaphone}
        eyebrow="Broadcasts"
        title="Announcements"
        subtitle="Post real-time announcements to students."
        chip={
          <StatChip
            variant={announcements.length > 0 ? "live" : "idle"}
            pulse={announcements.length > 0}
            label={announcements.length > 0 ? "Active" : "None yet"}
            value={announcements.length || undefined}
          />
        }
      />

      <SectionCard icon={Plus} title="New Announcement" subtitle="Goes live the moment you post.">
        <form onSubmit={(e) => { e.preventDefault(); post.mutate(); }} className="space-y-5">
          <div>
            <FieldLabel>Title</FieldLabel>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="e.g. Assignment deadline extended" />
          </div>
          <div>
            <FieldLabel>Message</FieldLabel>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={3} className={`${inputClass} resize-none`} placeholder="Type your announcement here…" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel><BookOpen className="w-3 h-3 inline mr-1.5" />Target Course</FieldLabel>
              <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })} className={inputClass}>
                <option value="">All Courses</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <FieldLabel><Clock className="w-3 h-3 inline mr-1.5" />Target Semester</FieldLabel>
              <select value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} className={inputClass}>
                <option value="0">All Semesters</option>
                {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          </div>
          <PrimaryCTA type="submit" icon={Send} loading={posting} disabled={posting || !form.title || !form.content}>
            {posting ? "Posting…" : "Post Announcement"}
          </PrimaryCTA>
        </form>
      </SectionCard>

      <SectionCard icon={Bell} title="Your Announcements" subtitle={`${announcements.length} posted`}>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border/40 mx-auto flex items-center justify-center mb-3">
              <Bell className="w-7 h-7 text-muted-foreground/60" />
            </div>
            <p className="font-body text-sm text-muted-foreground">No announcements posted yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a: any) => (
              <div key={a.id} className="flex items-start gap-4 p-4 rounded-2xl bg-background/40 border border-border/30 hover:border-primary/30 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5 text-primary" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-foreground">{a.title}</p>
                  <p className="font-body text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.content}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {a.courses?.name && <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">{a.courses.name}</span>}
                    {a.semester && <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-foreground">Sem {a.semester}</span>}
                    <span className="text-[10px] font-body text-muted-foreground">{format(new Date(a.created_at), "MMM d, yyyy · h:mm a")}</span>
                  </div>
                </div>
                <button onClick={() => { if (confirm("Delete this announcement permanently?")) deleteAnn.mutate(a.id); }}
                  className="p-2 rounded-xl hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

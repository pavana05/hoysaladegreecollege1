import { useState } from "react";
import { Megaphone, ArrowLeft, Send, Pin, CheckCircle, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import BackButton from "@/components/BackButton";

const noticeTypes = ["General", "Exam", "Admission", "Event", "Workshop", "Scholarship", "Holiday"];

export default function AdminPostNotice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", content: "", type: "General", is_pinned: false });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: recentNotices = [], isLoading } = useQuery({
    queryKey: ["admin-recent-notices"],
    queryFn: async () => {
      const { data } = await supabase.from("notices").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("notices").insert({
      title: form.title,
      content: form.content,
      type: form.type,
      is_pinned: form.is_pinned,
      is_active: true,
      posted_by: user?.id,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to post notice");
    } else {
      toast.success("Notice published successfully!");
      setSuccess(true);
      setForm({ title: "", content: "", type: "General", is_pinned: false });
      queryClient.invalidateQueries({ queryKey: ["admin-recent-notices"] });
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("notices").update({ is_active: false }).eq("id", id);
    toast.success("Notice removed");
    queryClient.invalidateQueries({ queryKey: ["admin-recent-notices"] });
  };

  const inputClass = "w-full border border-border rounded-xl px-4 py-3 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all duration-300 placeholder:text-muted-foreground/40";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-border rounded-2xl p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <BackButton />
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Post Notice / Announcement</h2>
            <p className="font-body text-sm text-muted-foreground">Publish notices visible to all students and faculty</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-display text-base font-bold text-foreground mb-5 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> New Notice
          </h3>

          {success && (
            <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20 animate-fade-in">
              <CheckCircle className="w-5 h-5 text-primary shrink-0" />
              <p className="font-body text-sm font-semibold text-primary">Notice published successfully!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-body text-xs font-bold text-foreground block mb-1.5 uppercase tracking-wider">Title *</label>
              <input
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className={inputClass} placeholder="e.g. Semester Exam Schedule Released" required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="font-body text-xs font-bold text-foreground block mb-1.5 uppercase tracking-wider">Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputClass}>
                  {noticeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setForm({ ...form, is_pinned: !form.is_pinned })}
                    className={`w-12 h-6 rounded-full transition-all duration-300 relative cursor-pointer ${form.is_pinned ? "bg-secondary" : "bg-muted"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow-md transition-transform duration-300 ${form.is_pinned ? "translate-x-6" : ""}`} />
                  </div>
                  <div>
                    <p className="font-body text-sm font-semibold text-foreground flex items-center gap-1">
                      <Pin className="w-3 h-3 text-secondary" /> Pin Notice
                    </p>
                    <p className="font-body text-xs text-muted-foreground">Show at top of list</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="font-body text-xs font-bold text-foreground block mb-1.5 uppercase tracking-wider">Content *</label>
              <textarea
                value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                className={`${inputClass} resize-none`} rows={5}
                placeholder="Write the full notice content here..."
                required
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full rounded-xl font-body font-bold py-5 relative overflow-hidden group">
              <span className="absolute inset-0 bg-gradient-to-r from-secondary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Publishing...
                </span>
              ) : (
                <span className="flex items-center gap-2 relative z-10">
                  <Send className="w-4 h-4" /> Publish Notice
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Recent Notices */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-display text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-secondary" /> Recent Notices
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : recentNotices.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground text-center py-8">No notices published yet.</p>
          ) : (
            <div className="space-y-2">
              {recentNotices.map((n: any) => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {n.is_pinned && <Pin className="w-2.5 h-2.5 text-secondary shrink-0" />}
                      <span className="font-body text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{n.type}</span>
                    </div>
                    <p className="font-body text-xs font-semibold text-foreground line-clamp-1">{n.title}</p>
                    <p className="font-body text-[10px] text-muted-foreground mt-0.5">
                      {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all text-xs shrink-0"
                    title="Remove notice"
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

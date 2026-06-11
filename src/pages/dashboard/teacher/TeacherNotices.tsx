import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Trash2, Bell, Plus, Sparkles, Megaphone, Send } from "lucide-react";
import {
  PageHero, StatChip, SectionCard, FieldLabel, PrimaryCTA,
} from "@/components/dashboard/premium";

export default function TeacherNotices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("General");

  const { data: notices = [] } = useQuery({
    queryKey: ["teacher-notices"],
    queryFn: async () => {
      const { data } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notices").insert({ title, content, type, posted_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Notice posted!" });
      setTitle(""); setContent(""); setType("General");
      queryClient.invalidateQueries({ queryKey: ["teacher-notices"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Notice deleted" });
      queryClient.invalidateQueries({ queryKey: ["teacher-notices"] });
    },
  });

  const inputClass = "w-full bg-muted/40 dark:bg-white/[0.04] border border-border/40 rounded-2xl px-4 py-3 font-body text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all duration-300";

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <PageHero
        icon={Megaphone}
        eyebrow="Bulletin"
        title="Notices"
        subtitle="Post and manage college notices."
        chip={
          <StatChip
            variant={notices.length > 0 ? "live" : "idle"}
            pulse={notices.length > 0}
            label={notices.length > 0 ? "Active" : "None yet"}
            value={notices.length || undefined}
          />
        }
      />

      <SectionCard icon={Plus} title="Post Notice" subtitle="Visible to every signed-in user.">
        <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="space-y-5">
          <div>
            <FieldLabel>Title</FieldLabel>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notice title" className={inputClass} />
          </div>
          <div>
            <FieldLabel>Content</FieldLabel>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Notice content" rows={3} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
              <option value="General">General</option>
              <option value="Academic">Academic</option>
              <option value="Exam">Exam</option>
              <option value="Event">Event</option>
            </select>
          </div>
          <PrimaryCTA type="submit" icon={Send} loading={addMutation.isPending} disabled={!title || !content || addMutation.isPending}>
            {addMutation.isPending ? "Posting…" : "Post Notice"}
          </PrimaryCTA>
        </form>
      </SectionCard>

      <SectionCard icon={Bell} title="Posted Notices" subtitle={`${notices.length} total`}>
        {notices.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border/40 mx-auto flex items-center justify-center mb-3">
              <Bell className="w-7 h-7 text-muted-foreground/60" />
            </div>
            <p className="font-body text-sm text-muted-foreground">No notices yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((n: any) => (
              <div key={n.id}
                className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-background/40 border transition-all duration-300 group ${n.is_pinned ? "border-primary/30" : "border-border/30 hover:border-primary/30"}`}>
                {n.is_pinned && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {n.is_pinned && (
                        <span className="font-body text-[10px] font-bold text-primary flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Pinned
                        </span>
                      )}
                      <span className="font-body text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/15 uppercase tracking-wider">{n.type}</span>
                      <span className="font-body text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors">{n.title}</h4>
                    <p className="font-body text-sm text-muted-foreground mt-1.5 leading-relaxed">{n.content}</p>
                  </div>
                  <button onClick={() => deleteMutation.mutate(n.id)}
                    className="p-2 rounded-xl hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

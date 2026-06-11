import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Trash2, Pin, Bell, Plus, Sparkles, Megaphone } from "lucide-react";
import { PageHero, StatChip } from "@/components/dashboard/premium";

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

  const inputClass = "w-full border border-border/40 rounded-2xl px-4 py-3 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300";

  return (
    <div className="space-y-6">
      {/* Premium Header */}
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

      {/* Post Form */}
      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 sm:p-8">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        <h3 className="font-display text-sm font-bold text-foreground mb-5 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Post Notice
        </h3>
        <div className="space-y-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notice title" className="rounded-2xl border-border/40 focus:border-primary/30" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Notice content" rows={3}
            className={`${inputClass} resize-none`} />
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            <option value="General">General</option>
            <option value="Academic">Academic</option>
            <option value="Exam">Exam</option>
            <option value="Event">Event</option>
          </select>
          <Button disabled={!title || !content || addMutation.isPending} onClick={() => addMutation.mutate()} className="rounded-2xl font-body shadow-lg hover:shadow-xl transition-all duration-300">
            {addMutation.isPending ? "Posting..." : "Post Notice"}
          </Button>
        </div>
      </div>

      {/* Notices List */}
      <div className="space-y-3">
        {notices.map((n: any, i: number) => (
          <div key={n.id}
            className={`relative overflow-hidden bg-card border rounded-3xl p-5 sm:p-6 hover:shadow-[0_12px_40px_-10px_hsla(var(--primary),0.08)] transition-all duration-500 hover:-translate-y-0.5 group ${n.is_pinned ? "border-primary/25" : "border-border/40"}`}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
            {n.is_pinned && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {n.is_pinned && (
                    <span className="font-body text-[10px] font-bold text-primary flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Pinned
                    </span>
                  )}
                  <span className="font-body text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/10 uppercase tracking-wider">{n.type}</span>
                  <span className="font-body text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors duration-300">{n.title}</h4>
                <p className="font-body text-sm text-muted-foreground mt-1.5 leading-relaxed">{n.content}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(n.id)}
                className="rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

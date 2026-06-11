import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Bell, Pin, Sparkles } from "lucide-react";

export default function StudentNotices() {
  const { data: notices = [], isLoading } = useQuery({
    queryKey: ["student-notices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notices")
        .select("*")
        .eq("is_active", true)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-secondary/[0.04]" />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none" style={{ background: "hsla(265, 55%, 45%, 0.14)" }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Notices</h2>
            <p className="font-body text-xs text-muted-foreground mt-0.5">Stay updated with the latest college notices</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted/30 rounded-3xl animate-pulse border border-border/20" />)}</div>
      ) : notices.length === 0 ? (
        <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-transparent" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <p className="font-body text-sm text-muted-foreground">No notices yet.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((n, i) => (
            <div key={n.id}
              className={`relative overflow-hidden bg-card border rounded-3xl p-5 sm:p-6 hover:shadow-[0_12px_40px_-10px_hsla(var(--primary),0.08)] transition-all duration-500 hover:-translate-y-0.5 group ${n.is_pinned ? "border-primary/25" : "border-border/40"}`}
              style={{ animationDelay: `${i * 60}ms` }}>
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
              {n.is_pinned && (
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              )}
              <div className="flex items-start gap-3">
                {n.is_pinned && (
                  <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Pin className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-body text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/10 uppercase tracking-wider">{n.type}</span>
                    <span className="font-body text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {n.is_pinned && <span className="font-body text-[10px] font-bold text-primary flex items-center gap-1"><Sparkles className="w-3 h-3" /> Pinned</span>}
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors duration-300">{n.title}</h3>
                  <p className="font-body text-sm text-muted-foreground mt-1.5 leading-relaxed">{n.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

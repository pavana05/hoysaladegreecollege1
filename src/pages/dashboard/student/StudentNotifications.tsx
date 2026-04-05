import { Bell, Check, Trash2, ArrowLeft, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";

const TYPE_COLORS: Record<string, string> = {
  attendance: "border-l-blue-500 bg-blue-500/[0.06]",
  material: "border-l-emerald-500 bg-emerald-500/[0.06]",
  announcement: "border-l-purple-500 bg-purple-500/[0.06]",
  promotion: "border-l-amber-500 bg-amber-500/[0.06]",
  marks: "border-l-orange-500 bg-orange-500/[0.06]",
  fee_reminder: "border-l-red-500 bg-red-500/[0.06]",
  greeting: "border-l-yellow-500 bg-yellow-500/[0.06]",
  general: "border-l-primary bg-primary/[0.06]",
};

const TYPE_BADGE: Record<string, string> = {
  attendance: "bg-blue-500/15 text-blue-400",
  material: "bg-emerald-500/15 text-emerald-400",
  announcement: "bg-purple-500/15 text-purple-400",
  promotion: "bg-amber-500/15 text-amber-400",
  marks: "bg-orange-500/15 text-orange-400",
  fee_reminder: "bg-red-500/15 text-red-400",
  greeting: "bg-yellow-500/15 text-yellow-400",
  general: "bg-primary/15 text-primary",
};

const TYPE_ICONS: Record<string, string> = {
  attendance: "📋",
  material: "📚",
  announcement: "📢",
  promotion: "🎉",
  marks: "📝",
  fee_reminder: "💰",
  greeting: "🌅",
  general: "🔔",
};

export default function StudentNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("id");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["user-notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const selected = notifications.find((n: any) => n.id === selectedId);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("notifications").update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-notifications"] }),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("notifications").delete().eq("user_id", user.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-notifications"] }),
  });

  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-notifications"] });
      if (selectedId) setSearchParams({});
    },
  });

  const handleSelect = (n: any) => {
    if (!n.is_read) markRead.mutate(n.id);
    setSearchParams({ id: n.id });
  };

  const unread = notifications.filter((n: any) => !n.is_read).length;

  // Detail view
  if (selected) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <button
          onClick={() => setSearchParams({})}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to notifications
        </button>

        <div className={`rounded-2xl border-l-4 p-6 space-y-4 ${TYPE_COLORS[selected.type] || TYPE_COLORS.general} border border-border/40 bg-card`}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl">{TYPE_ICONS[selected.type] || TYPE_ICONS.general}</span>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${TYPE_BADGE[selected.type] || TYPE_BADGE.general}`}>
              {selected.type === "fee_reminder" ? "Fee Reminder" : selected.type}
            </span>
            {!selected.is_read && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/15 text-primary uppercase">Unread</span>
            )}
          </div>

          <h2 className="font-body text-xl font-bold text-foreground leading-tight">{selected.title}</h2>

          <p className="font-body text-sm text-muted-foreground">
            {format(new Date(selected.created_at), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </p>

          <div className="pt-2 border-t border-border/30">
            <p className="font-body text-[15px] text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
              {selected.message}
            </p>
          </div>

          {selected.link && (
            <a
              href={selected.link}
              onClick={(e) => { e.preventDefault(); navigate(selected.link); }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mt-2"
            >
              <ExternalLink className="w-4 h-4" /> View related content
            </a>
          )}

          <div className="flex gap-2 pt-3">
            {!selected.is_read && (
              <button
                onClick={() => markRead.mutate(selected.id)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Mark as read
              </button>
            )}
            <button
              onClick={() => deleteOne.mutate(selected.id)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-body text-lg font-bold text-foreground">All Notifications</h1>
            {unread > 0 && <p className="font-body text-xs text-primary font-semibold">{unread} unread</p>}
          </div>
        </div>
        <div className="flex gap-1.5">
          {unread > 0 && (
            <button onClick={() => markAllRead.mutate()} className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
              <Check className="w-3 h-3" /> Read all
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={() => clearAll.mutate()} className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
              <Trash2 className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
            <Bell className="w-8 h-8 text-muted-foreground/20" />
          </div>
          <p className="font-body text-sm font-medium text-muted-foreground">No notifications yet</p>
          <p className="font-body text-xs text-muted-foreground/60 mt-1">You're all caught up! 🎉</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              onClick={() => handleSelect(n)}
              className={`relative px-4 py-3.5 cursor-pointer rounded-xl border-l-[3px] border border-border/30 transition-all duration-200 hover:bg-muted/30 hover:shadow-sm ${
                TYPE_COLORS[n.type] || TYPE_COLORS.general
              } ${!n.is_read ? "ring-1 ring-primary/10" : ""}`}
            >
              {!n.is_read && (
                <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]" />
              )}
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5 shrink-0">{TYPE_ICONS[n.type] || TYPE_ICONS.general}</span>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${TYPE_BADGE[n.type] || TYPE_BADGE.general}`}>
                      {n.type === "fee_reminder" ? "Fee" : n.type}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-body ml-auto shrink-0">
                      {format(new Date(n.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <p className={`font-body text-[13px] leading-snug ${!n.is_read ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>{n.title}</p>
                  <p className="font-body text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

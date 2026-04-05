import { Bell, Check, Trash2, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const TYPE_COLORS: Record<string, string> = {
  attendance: "border-l-blue-500 bg-blue-500/[0.03]",
  material: "border-l-emerald-500 bg-emerald-500/[0.03]",
  announcement: "border-l-purple-500 bg-purple-500/[0.03]",
  promotion: "border-l-amber-500 bg-amber-500/[0.03]",
  marks: "border-l-orange-500 bg-orange-500/[0.03]",
  fee_reminder: "border-l-red-500 bg-red-500/[0.03]",
  general: "border-l-primary bg-primary/[0.03]",
};

const TYPE_BADGE: Record<string, string> = {
  attendance: "bg-blue-500/10 text-blue-500",
  material: "bg-emerald-500/10 text-emerald-500",
  announcement: "bg-purple-500/10 text-purple-500",
  promotion: "bg-amber-500/10 text-amber-500",
  marks: "bg-orange-500/10 text-orange-500",
  fee_reminder: "bg-red-500/10 text-red-500",
  general: "bg-primary/10 text-primary",
};

const TYPE_ICONS: Record<string, string> = {
  attendance: "📋",
  material: "📚",
  announcement: "📢",
  promotion: "🎉",
  marks: "📝",
  fee_reminder: "💰",
  general: "🔔",
};

export default function NotificationCenter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const prevCountRef = useRef(0);

  const { data: notifications = [] } = useQuery({
    queryKey: ["user-notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      return (data || []) as any[];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const unread = notifications.filter((n: any) => !n.is_read).length;

  useEffect(() => {
    if (unread > prevCountRef.current && prevCountRef.current >= 0) {
      if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);

      // Forward new notifications to Android app via bridge
      if ((window as any).AndroidBridge) {
        try {
          const latest = notifications.filter((n: any) => !n.is_read).slice(0, unread - prevCountRef.current);
          for (const n of latest) {
            (window as any).AndroidBridge.onNotificationReceived?.(
              JSON.stringify({ title: n.title, message: n.message, type: n.type, link: n.link })
            );
          }
        } catch {}
      }
    }
    prevCountRef.current = unread;
  }, [unread, notifications]);

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

  const handleClick = (n: any) => {
    if (!n.is_read) markRead.mutate(n.id);
    setOpen(false);
    navigate(`/dashboard/student/notifications?id=${n.id}`);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl hover:bg-muted/60 transition-all duration-300 group"
        title="Notifications"
      >
        <Bell className={`w-5 h-5 transition-all duration-300 ${unread > 0 ? "text-primary group-hover:scale-110" : "text-muted-foreground"}`} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_2px_8px_hsl(var(--destructive)/0.4)]"
            style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto top-14 sm:top-12 sm:right-0 z-50 w-auto sm:w-[420px] rounded-2xl overflow-hidden border border-border/50 bg-card/95 backdrop-blur-2xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.4)]"
            style={{ animation: "notification-enter 0.25s cubic-bezier(0.16,1,0.3,1)" }}>
            
            {/* Gold accent line */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[hsl(42,75%,55%)]/25 to-transparent" />
            
            {/* Header */}
            <div className="relative p-4 pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-body text-sm font-bold text-foreground">Notifications</h3>
                    {unread > 0 && (
                      <p className="font-body text-[10px] text-primary font-semibold">{unread} unread</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {unread > 0 && (
                    <button onClick={() => markAllRead.mutate()} className="flex items-center gap-1 text-[10px] font-body font-semibold px-2.5 py-1.5 rounded-lg hover:bg-primary/10 text-primary transition-all duration-200">
                      <Check className="w-3 h-3" /> Read all
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={() => clearAll.mutate()} className="flex items-center gap-1 text-[10px] font-body font-semibold px-2.5 py-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-all duration-200">
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                  <p className="font-body text-sm font-medium text-muted-foreground">No notifications yet</p>
                  <p className="font-body text-xs text-muted-foreground/60 mt-1">You're all caught up! 🎉</p>
                </div>
              ) : (
                notifications.map((n: any, i: number) => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`relative px-4 py-3.5 cursor-pointer border-l-[3px] transition-all duration-200 hover:bg-muted/20 ${
                      TYPE_COLORS[n.type] || TYPE_COLORS.general
                    } ${!n.is_read ? "bg-primary/[0.02]" : ""}`}
                    style={{ animation: `notification-item-in 0.3s cubic-bezier(0.16,1,0.3,1) ${Math.min(i * 40, 300)}ms both` }}
                  >
                    {!n.is_read && (
                      <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.4)]" />
                    )}
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5 shrink-0">{TYPE_ICONS[n.type] || TYPE_ICONS.general}</span>
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${TYPE_BADGE[n.type] || TYPE_BADGE.general}`}>
                            {n.type === "fee_reminder" ? "Fee" : n.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-body ml-auto shrink-0">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className={`font-body text-[13px] leading-snug ${!n.is_read ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>{n.title}</p>
                        <p className="font-body text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap break-words line-clamp-2">{n.message}</p>
                      </div>
                      {n.link && <ExternalLink className="w-3 h-3 text-muted-foreground/40 shrink-0 mt-1.5" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <style>{`
            @keyframes notification-enter {
              0% { opacity: 0; transform: translateY(-8px) scale(0.98); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes notification-item-in {
              0% { opacity: 0; transform: translateX(-6px); }
              100% { opacity: 1; transform: translateX(0); }
            }
          `}</style>
        </>
      )}
    </div>
  );
}

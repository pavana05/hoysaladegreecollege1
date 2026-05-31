import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";

/**
 * Lightweight notification bell — navigates directly to the full
 * notifications page instead of opening a popup.
 */
export default function NotificationBell() {
  const { user, role } = useAuth();
  const prevCountRef = useRef(0);

  const { data: notifications = [] } = useQuery({
    queryKey: ["user-notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("notifications")
        .select("id, is_read, title, message, type, link")
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
      if ((window as any).AndroidBridge) {
        try {
          const latest = notifications
            .filter((n: any) => !n.is_read)
            .slice(0, unread - prevCountRef.current);
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

  const path =
    role === "student"
      ? "/dashboard/student/notifications"
      : role === "teacher"
      ? "/dashboard/teacher/notices"
      : role === "principal"
      ? "/dashboard/principal/notices"
      : "/dashboard/admin/post-notice";

  return (
    <Link
      to={path}
      className="relative p-2.5 rounded-xl hover:bg-muted/60 transition-all duration-300 group"
      title="Notifications"
      aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
    >
      <Bell
        className={`w-5 h-5 transition-all duration-300 ${
          unread > 0 ? "text-primary group-hover:scale-110" : "text-muted-foreground"
        }`}
      />
      {unread > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_2px_8px_hsl(var(--destructive)/0.4)]"
          style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

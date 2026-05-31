import { Bell, Check, Trash2, ArrowLeft, ExternalLink, Search, Inbox, Sparkles, Filter } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { useMemo, useState } from "react";

const TYPE_COLORS: Record<string, string> = {
  material: "border-l-emerald-500 bg-emerald-500/[0.06]",
  announcement: "border-l-purple-500 bg-purple-500/[0.06]",
  promotion: "border-l-amber-500 bg-amber-500/[0.06]",
  marks: "border-l-orange-500 bg-orange-500/[0.06]",
  fee_reminder: "border-l-red-500 bg-red-500/[0.06]",
  general: "border-l-primary bg-primary/[0.06]",
};

const TYPE_BADGE: Record<string, string> = {
  material: "bg-emerald-500/15 text-emerald-400",
  announcement: "bg-purple-500/15 text-purple-400",
  promotion: "bg-amber-500/15 text-amber-400",
  marks: "bg-orange-500/15 text-orange-400",
  fee_reminder: "bg-red-500/15 text-red-400",
  general: "bg-primary/15 text-primary",
};

const TYPE_ICONS: Record<string, string> = {
  material: "📚",
  announcement: "📢",
  promotion: "🎉",
  marks: "📝",
  fee_reminder: "💰",
  general: "🔔",
};

const FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "announcement", label: "Announcements" },
  { id: "marks", label: "Marks" },
  { id: "fee_reminder", label: "Fees" },
  { id: "material", label: "Materials" },
];

function safeDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function safeFormat(v: any, fmt: string, fallback = ""): string {
  const d = safeDate(v);
  if (!d) return fallback;
  try { return format(d, fmt); } catch { return fallback; }
}

function groupByDate(items: any[]) {
  const groups: Record<string, any[]> = { Today: [], Yesterday: [], "This week": [], Earlier: [] };
  for (const n of items) {
    const d = safeDate(n.created_at);
    if (!d) { groups.Earlier.push(n); continue; }
    if (isToday(d)) groups.Today.push(n);
    else if (isYesterday(d)) groups.Yesterday.push(n);
    else if (isThisWeek(d)) groups["This week"].push(n);
    else groups.Earlier.push(n);
  }
  return groups;
}

export default function StudentNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("id");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

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

  const importantNotifications = notifications.filter(
    (n: any) => n.type !== "greeting" && n.type !== "attendance"
  );

  const unread = importantNotifications.filter((n: any) => !n.is_read).length;
  const total = importantNotifications.length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notifications.filter((n: any) => {
      if (filter === "unread" && n.is_read) return false;
      if (filter !== "all" && filter !== "unread" && n.type !== filter) return false;
      if (!q) return true;
      return (
        (n.title || "").toLowerCase().includes(q) ||
        (n.message || "").toLowerCase().includes(q)
      );
    });
  }, [notifications, filter, query]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  // Detail view
  if (selected) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 page-enter">
        <button
          onClick={() => setSearchParams({})}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to notifications
        </button>

        <div className={`relative overflow-hidden rounded-3xl border-l-4 p-6 sm:p-8 space-y-5 ${TYPE_COLORS[selected.type] || TYPE_COLORS.general} border border-border/40 bg-card/80 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)]`}>
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[hsl(42,75%,55%)]/30 to-transparent" />

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-3xl">{TYPE_ICONS[selected.type] || TYPE_ICONS.general}</span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${TYPE_BADGE[selected.type] || TYPE_BADGE.general}`}>
              {selected.type === "fee_reminder" ? "Fee Reminder" : selected.type}
            </span>
            {!selected.is_read && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary uppercase">Unread</span>
            )}
          </div>

          <h2 className="font-body text-2xl font-bold text-foreground leading-tight tracking-tight">{selected.title}</h2>

          <p className="font-body text-xs text-muted-foreground">
            {safeFormat(selected.created_at, "EEEE, MMMM d, yyyy 'at' h:mm a", "—")}
          </p>

          <div className="pt-3 border-t border-border/30">
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
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95"
              >
                <Check className="w-3.5 h-3.5" /> Mark as read
              </button>
            )}
            <button
              onClick={() => deleteOne.mutate(selected.id)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all active:scale-95"
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
    <div className="max-w-3xl mx-auto space-y-5 page-enter pb-12">
      {/* Premium hero header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-card/90 via-card/70 to-card/40 backdrop-blur-xl p-5 sm:p-7 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[hsl(42,75%,55%)]/40 to-transparent" />
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20">
              <Bell className="w-5.5 h-5.5 text-primary" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow-[0_2px_8px_hsl(var(--destructive)/0.5)]">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </div>
            <div>
              <h1 className="font-body text-xl sm:text-2xl font-bold text-foreground tracking-tight">Notifications</h1>
              <p className="font-body text-xs text-muted-foreground mt-0.5">
                {total === 0
                  ? "Your inbox is empty"
                  : unread > 0
                    ? <><span className="text-primary font-semibold">{unread} unread</span> of {total}</>
                    : <>{total} total · all caught up</>}
              </p>
            </div>
          </div>

          <div className="flex gap-1.5">
            {unread > 0 && (
              <button onClick={() => markAllRead.mutate()} className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary transition-all active:scale-95">
                <Check className="w-3.5 h-3.5" /> Read all
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={() => clearAll.mutate()} className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/15 text-destructive transition-all active:scale-95">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        {total > 0 && (
          <div className="relative mt-5">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notifications…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/40 border border-border/40 text-sm font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>
        )}
      </div>

      {/* Filter chips */}
      {total > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all active:scale-95 ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]"
                    : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : total === 0 ? (
        <div className="text-center py-20 rounded-3xl border border-dashed border-border/40 bg-card/30">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-4 ring-1 ring-primary/10">
            <Inbox className="w-9 h-9 text-primary/60" />
          </div>
          <p className="font-body text-base font-semibold text-foreground">No notifications yet</p>
          <p className="font-body text-xs text-muted-foreground/70 mt-1.5 flex items-center justify-center gap-1.5">
            You're all caught up <Sparkles className="w-3.5 h-3.5 text-[hsl(42,75%,55%)]" />
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-border/40 bg-card/30">
          <p className="font-body text-sm font-medium text-muted-foreground">No notifications match your filters</p>
          <button onClick={() => { setQuery(""); setFilter("all"); }} className="mt-3 text-xs font-semibold text-primary hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([label, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={label} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="font-body text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">{label}</span>
                  <span className="text-[10px] font-bold text-muted-foreground/50">·</span>
                  <span className="font-body text-[10px] text-muted-foreground/60">{items.length}</span>
                  <div className="flex-1 h-px bg-border/30 ml-2" />
                </div>
                <div className="space-y-2">
                  {items.map((n: any, i: number) => (
                    <div
                      key={n.id}
                      onClick={() => handleSelect(n)}
                      style={{ animation: `notif-in 0.3s cubic-bezier(0.16,1,0.3,1) ${Math.min(i * 30, 240)}ms both` }}
                      className={`group relative px-4 py-3.5 cursor-pointer rounded-2xl border-l-[3px] border border-border/30 transition-all duration-200 hover:bg-muted/30 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:scale-[0.99] ${
                        TYPE_COLORS[n.type] || TYPE_COLORS.general
                      } ${!n.is_read ? "ring-1 ring-primary/15" : ""}`}
                    >
                      {!n.is_read && (
                        <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]" />
                      )}
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5 shrink-0 transition-transform group-hover:scale-110">{TYPE_ICONS[n.type] || TYPE_ICONS.general}</span>
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${TYPE_BADGE[n.type] || TYPE_BADGE.general}`}>
                              {n.type === "fee_reminder" ? "Fee" : n.type}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-body ml-auto shrink-0">
                              {safeFormat(n.created_at, "h:mm a")}
                            </span>
                          </div>
                          <p className={`font-body text-[13.5px] leading-snug ${!n.is_read ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>{n.title}</p>
                          <p className="font-body text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes notif-in {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { scrollbar-width: none; }
      `}</style>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, User, Clock, BarChart3, DollarSign, Calendar, Bell, Megaphone,
  BookOpen, MessageSquare, Gamepad2, Briefcase, GraduationCap, FileText,
  Users, UserCheck, Upload, ArrowUpCircle, Mail, Trophy, Image as ImageIcon,
  Ticket, BellRing, Shield, Settings, Sparkles, Sun, Moon, LogOut,
  ImagePlus, Book, UserCog, Award, Compass, Wrench, History, ArrowRight,
} from "lucide-react";

type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ElementType;
  keywords?: string;
  run: () => void;
};

const studentNavActions = (go: (p: string) => void): Action[] => [
  { id: "s-dash", label: "Dashboard", icon: LayoutDashboard, run: () => go("/dashboard/student") },
  { id: "s-profile", label: "My Profile", icon: User, run: () => go("/dashboard/student/profile") },
  { id: "s-att", label: "Attendance", icon: Clock, keywords: "presence percent", run: () => go("/dashboard/student/attendance") },
  { id: "s-marks", label: "Marks", icon: BarChart3, keywords: "grades scores", run: () => go("/dashboard/student/marks") },
  { id: "s-fees", label: "Fee Details", icon: DollarSign, keywords: "payment due balance", run: () => go("/dashboard/student/fees") },
  { id: "s-tt", label: "Timetable", icon: Calendar, keywords: "schedule classes", run: () => go("/dashboard/student/timetable") },
  { id: "s-not", label: "Notices", icon: Bell, run: () => go("/dashboard/student/notices") },
  { id: "s-ann", label: "Announcements", icon: Megaphone, run: () => go("/dashboard/student/announcements") },
  { id: "s-mat", label: "Study Materials", icon: BookOpen, keywords: "notes pdf", run: () => go("/dashboard/student/materials") },
  { id: "s-msg", label: "Messages", icon: MessageSquare, run: () => go("/dashboard/student/messages") },
  { id: "s-game", label: "Gamification", icon: Gamepad2, keywords: "points xp streak badges", run: () => go("/dashboard/student/gamification") },
  { id: "s-jobs", label: "Jobs & Internships", icon: Briefcase, run: () => go("/dashboard/student/jobs") },
  { id: "s-sch", label: "Scholarships", icon: GraduationCap, run: () => go("/dashboard/student/scholarships") },
  { id: "s-fb", label: "Send Feedback", icon: FileText, keywords: "complaint suggest", run: () => go("/dashboard/student/feedback") },
];

const teacherNavActions = (go: (p: string) => void): Action[] => [
  { id: "t-dash", label: "Dashboard", icon: LayoutDashboard, run: () => go("/dashboard/teacher") },
  { id: "t-stu", label: "Students", icon: Users, run: () => go("/dashboard/teacher/students") },
  { id: "t-att", label: "Take Attendance", icon: Clock, keywords: "mark present absent", run: () => go("/dashboard/teacher/attendance") },
  { id: "t-att2", label: "Attendance Overview", icon: UserCheck, run: () => go("/dashboard/teacher/attendance-overview") },
  { id: "t-marks", label: "Upload Marks", icon: BarChart3, keywords: "grades enter", run: () => go("/dashboard/teacher/marks") },
  { id: "t-tt", label: "Timetable", icon: Calendar, run: () => go("/dashboard/teacher/timetable") },
  { id: "t-mat", label: "Upload Materials", icon: Upload, keywords: "notes pdf share", run: () => go("/dashboard/teacher/materials") },
  { id: "t-ann", label: "Post Announcement", icon: Megaphone, run: () => go("/dashboard/teacher/announcements") },
  { id: "t-not", label: "Notices", icon: Bell, run: () => go("/dashboard/teacher/notices") },
  { id: "t-msg", label: "Messages", icon: MessageSquare, run: () => go("/dashboard/teacher/messages") },
];

const adminNavActions = (go: (p: string) => void): Action[] => [
  { id: "a-dash", label: "Dashboard", icon: LayoutDashboard, run: () => go("/dashboard/admin") },
  { id: "a-not", label: "Post Notice", icon: Megaphone, run: () => go("/dashboard/admin/post-notice") },
  { id: "a-prom", label: "Promotion & Years", icon: ArrowUpCircle, run: () => go("/dashboard/admin/promotion-hub") },
  { id: "a-acad", label: "Academics Hub", icon: BookOpen, run: () => go("/dashboard/admin/academics-hub") },
  { id: "a-att", label: "Attendance Hub", icon: UserCheck, run: () => go("/dashboard/admin/attendance") },
  { id: "a-inb", label: "Inbox", icon: Mail, keywords: "messages applications", run: () => go("/dashboard/admin/inbox") },
  { id: "a-usr", label: "Users", icon: Users, keywords: "manage accounts roles", run: () => go("/dashboard/admin/users") },
  { id: "a-ovr", label: "Academic Overview", icon: GraduationCap, run: () => go("/dashboard/admin/academic-overview") },
  { id: "a-fac", label: "Faculty", icon: UserCheck, run: () => go("/dashboard/admin/faculty") },
  { id: "a-fee", label: "Fee Management", icon: DollarSign, keywords: "payments concessions", run: () => go("/dashboard/admin/fees") },
  { id: "a-top", label: "Top Rankers", icon: Trophy, run: () => go("/dashboard/admin/top-rankers") },
  { id: "a-tt", label: "Timetable", icon: Calendar, run: () => go("/dashboard/admin/timetable") },
  { id: "a-evt", label: "Events", icon: ImageIcon, run: () => go("/dashboard/admin/events") },
  { id: "a-bnr", label: "Banners & Papers", icon: Book, run: () => go("/dashboard/admin/banners") },
  { id: "a-gal", label: "Gallery", icon: ImagePlus, run: () => go("/dashboard/admin/gallery") },
  { id: "a-hall", label: "Hall Tickets", icon: Ticket, run: () => go("/dashboard/admin/hall-tickets") },
  { id: "a-car", label: "Career Hub", icon: Briefcase, run: () => go("/dashboard/admin/career-hub") },
  { id: "a-brd", label: "Broadcast Notification", icon: BellRing, run: () => go("/dashboard/admin/broadcast") },
  { id: "a-fbk", label: "Feedback & Logs", icon: MessageSquare, run: () => go("/dashboard/admin/feedback-logs") },
  { id: "a-tools", label: "Admin Tools", icon: Shield, run: () => go("/dashboard/admin/tools") },
  { id: "a-set", label: "Settings", icon: Settings, run: () => go("/dashboard/admin/settings") },
];

const principalNavActions = (go: (p: string) => void): Action[] => [
  { id: "p-dash", label: "Dashboard", icon: LayoutDashboard, run: () => go("/dashboard/principal") },
  { id: "p-top", label: "Top Students", icon: Award, run: () => go("/dashboard/principal/top-students") },
  { id: "p-evt", label: "Events", icon: ImageIcon, run: () => go("/dashboard/principal/events") },
  { id: "p-not", label: "Notices", icon: Megaphone, run: () => go("/dashboard/principal/notices") },
  { id: "p-crs", label: "Courses", icon: BookOpen, run: () => go("/dashboard/principal/courses") },
  { id: "p-dep", label: "Departments", icon: GraduationCap, run: () => go("/dashboard/principal/departments") },
  { id: "p-tch", label: "Teachers", icon: Users, run: () => go("/dashboard/principal/teachers") },
  { id: "p-stu", label: "Students", icon: UserCog, run: () => go("/dashboard/principal/students") },
];

const RECENT_KEY = "hdc_palette_recent_v1";
const MAX_RECENT = 5;

function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function pushRecent(id: string) {
  const cur = readRecent().filter(x => x !== id);
  cur.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, MAX_RECENT)));
}

export default function CommandPalette() {
  const { role, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => readRecent());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("hdc:open-palette", onOpen);
    return () => window.removeEventListener("hdc:open-palette", onOpen);
  }, []);

  const go = (path: string) => { navigate(path); setOpen(false); };

  const nav: Action[] = useMemo(() => {
    if (role === "student") return studentNavActions(go);
    if (role === "teacher") return teacherNavActions(go);
    if (role === "principal") return principalNavActions(go);
    if (role === "admin") return adminNavActions(go);
    return [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", !isDark);
    try { localStorage.setItem("hdc_theme", !isDark ? "dark" : "light"); } catch {}
  };

  const tools: Action[] = [
    { id: "tool-theme", label: "Toggle Light / Dark Theme", icon: document.documentElement.classList.contains("dark") ? Sun : Moon, keywords: "dark mode appearance", run: () => { toggleTheme(); setOpen(false); } },
    { id: "tool-logout", label: "Sign Out", icon: LogOut, keywords: "logout exit", run: async () => { setOpen(false); await signOut(); navigate("/"); } },
  ];

  const allMap = useMemo(() => {
    const m = new Map<string, Action>();
    [...nav, ...tools].forEach(a => m.set(a.id, a));
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav]);

  const recentActions = recent.map(id => allMap.get(id)).filter(Boolean) as Action[];

  const handleSelect = (a: Action) => {
    pushRecent(a.id);
    setRecent(readRecent());
    a.run();
  };

  if (!role) return null;

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const initial = (profile?.full_name || profile?.email || roleLabel).trim().charAt(0).toUpperCase();

  // Item renderer — premium row with icon tile, glow, kbd hint
  const Item = ({ a, recent: isRecent }: { a: Action; recent?: boolean }) => (
    <CommandItem
      key={a.id}
      value={`${isRecent ? "recent " : ""}${a.label} ${a.keywords || ""}`}
      onSelect={() => handleSelect(a)}
      className="group/cmd relative my-0.5 rounded-xl px-2.5 py-2 gap-3 transition-all duration-200 data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-primary/15 data-[selected=true]:to-primary/5 data-[selected=true]:shadow-[inset_2px_0_0_0_hsl(var(--primary))]"
    >
      <span className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50 border border-border/40 group-data-[selected=true]/cmd:bg-primary/15 group-data-[selected=true]/cmd:border-primary/40 transition-colors">
        <a.icon className="w-4 h-4 text-muted-foreground group-data-[selected=true]/cmd:text-primary transition-colors" />
        <span aria-hidden className="absolute inset-0 rounded-lg bg-primary/30 blur-md opacity-0 group-data-[selected=true]/cmd:opacity-60 transition-opacity -z-10" />
      </span>
      <span className="flex-1 truncate font-body text-[13px] font-medium text-foreground/90">{a.label}</span>
      {isRecent && (
        <span className="hidden sm:inline-flex items-center gap-1 text-[9.5px] uppercase tracking-[0.15em] text-muted-foreground/60">
          <History className="w-2.5 h-2.5" /> recent
        </span>
      )}
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/0 group-data-[selected=true]/cmd:text-primary -translate-x-1 group-data-[selected=true]/cmd:translate-x-0 transition-all" />
    </CommandItem>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="overflow-hidden p-0 border-border/60 bg-card/95 backdrop-blur-2xl shadow-[0_30px_90px_-20px_hsl(var(--primary)/0.45)] sm:max-w-[640px] rounded-[1.5rem]"
      >
        {/* Ambient glows */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-primary/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "14px 14px" }}
        />

        {/* Premium header strip */}
        <div className="relative flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/50">
          <div className="relative shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
            <span aria-hidden className="absolute inset-0 rounded-xl bg-primary/40 blur-md opacity-60 -z-10" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
              Command Palette
              <span className="text-primary/70">·</span>
              <span className="text-primary/80 font-medium">{roleLabel}</span>
            </div>
            <p className="font-body text-[13px] text-foreground/85 truncate mt-0.5">
              Jump to any page, fire a tool, or change a setting.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <kbd className="px-1.5 py-1 rounded-md bg-muted/60 border border-border/60 font-mono text-[10px] text-muted-foreground shadow-[inset_0_-1px_0_hsl(var(--border))]">⌘</kbd>
            <kbd className="px-1.5 py-1 rounded-md bg-muted/60 border border-border/60 font-mono text-[10px] text-muted-foreground shadow-[inset_0_-1px_0_hsl(var(--border))]">K</kbd>
          </div>
        </div>

        <Command
          shouldFilter={true}
          className="relative bg-transparent [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:text-muted-foreground/70 [&_[cmdk-group]]:px-2"
        >
          <CommandInput
            placeholder="Search pages, settings, actions…"
            className="h-12 text-[14px] placeholder:text-muted-foreground/60"
          />
          <CommandList className="relative max-h-[420px] py-1 cmd-scroll">
            <CommandEmpty>
              <div className="py-10 text-center">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center mb-3">
                  <Compass className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="font-body text-[13px] text-foreground/80">No results</p>
                <p className="font-body text-[11px] text-muted-foreground mt-1">Try a different keyword — pages, settings, tools.</p>
              </div>
            </CommandEmpty>

            {recentActions.length > 0 && (
              <>
                <CommandGroup heading={<span className="inline-flex items-center gap-1.5"><History className="w-3 h-3" /> Recent</span> as unknown as string}>
                  {recentActions.map(a => <Item key={`r-${a.id}`} a={a} recent />)}
                </CommandGroup>
                <CommandSeparator className="my-1 bg-border/40" />
              </>
            )}

            <CommandGroup heading={<span className="inline-flex items-center gap-1.5"><Compass className="w-3 h-3" /> Navigate</span> as unknown as string}>
              {nav.map(a => <Item key={a.id} a={a} />)}
            </CommandGroup>

            <CommandSeparator className="my-1 bg-border/40" />
            <CommandGroup heading={<span className="inline-flex items-center gap-1.5"><Wrench className="w-3 h-3" /> Tools</span> as unknown as string}>
              {tools.map(a => <Item key={a.id} a={a} />)}
            </CommandGroup>
          </CommandList>
        </Command>

        {/* Premium footer */}
        <div className="relative border-t border-border/50 bg-muted/20 px-4 py-2.5 flex items-center justify-between gap-3 font-body text-[10.5px] text-muted-foreground">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-card border border-border/60 font-mono text-[9.5px]">↑↓</kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-card border border-border/60 font-mono text-[9.5px]">↵</kbd>
              open
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-card border border-border/60 font-mono text-[9.5px]">esc</kbd>
              close
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold text-[10px] flex items-center justify-center shadow-sm">
              {initial}
            </span>
            <span className="text-muted-foreground/70">{nav.length + tools.length} actions</span>
          </div>
        </div>

        <style>{`
          .cmd-scroll::-webkit-scrollbar { width: 6px; }
          .cmd-scroll::-webkit-scrollbar-track { background: transparent; }
          .cmd-scroll::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, hsla(var(--primary)/0.35), hsla(var(--primary)/0.1));
            border-radius: 999px;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

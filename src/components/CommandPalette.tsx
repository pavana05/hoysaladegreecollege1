import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandShortcut, CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, User, Clock, BarChart3, DollarSign, Calendar, Bell, Megaphone,
  BookOpen, MessageSquare, Gamepad2, Briefcase, GraduationCap, FileText,
  Users, UserCheck, Upload, ArrowUpCircle, Mail, Trophy, Image as ImageIcon,
  Ticket, BellRing, Shield, Settings, Sparkles, Sun, Moon, LogOut, Command,
  ImagePlus, Book, UserCog, Award,
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
  const { role, signOut } = useAuth();
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

  // Allow custom buttons to open via window event
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

  return (
    <>
      {/* Floating trigger — discoverable, minimal */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/60 shadow-[0_10px_30px_-12px_hsl(var(--primary)/0.45)] hover:shadow-[0_14px_36px_-12px_hsl(var(--primary)/0.6)] hover:-translate-y-0.5 transition-all"
      >
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-body text-xs text-muted-foreground">Quick actions</span>
        <kbd className="ml-1 hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted/70 border border-border/60 font-mono text-[10px] text-muted-foreground">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type to search pages, actions, settings…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {recentActions.length > 0 && (
            <>
              <CommandGroup heading="Recent">
                {recentActions.map(a => (
                  <CommandItem key={`r-${a.id}`} value={`recent ${a.label} ${a.keywords || ""}`} onSelect={() => handleSelect(a)}>
                    <a.icon className="mr-2 text-muted-foreground" />
                    <span>{a.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading="Navigate">
            {nav.map(a => (
              <CommandItem key={a.id} value={`${a.label} ${a.keywords || ""}`} onSelect={() => handleSelect(a)}>
                <a.icon className="mr-2 text-muted-foreground" />
                <span>{a.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Tools">
            {tools.map(a => (
              <CommandItem key={a.id} value={`${a.label} ${a.keywords || ""}`} onSelect={() => handleSelect(a)}>
                <a.icon className="mr-2 text-muted-foreground" />
                <span>{a.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>

        <div className="border-t border-border/60 px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground font-body">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded bg-muted/70 border border-border/60">↑↓</kbd> navigate
            <kbd className="px-1.5 py-0.5 rounded bg-muted/70 border border-border/60">↵</kbd> open
            <kbd className="px-1.5 py-0.5 rounded bg-muted/70 border border-border/60">esc</kbd> close
          </div>
          <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 rounded bg-muted/70 border border-border/60 mx-0.5">⌘</kbd>+<kbd className="px-1.5 py-0.5 rounded bg-muted/70 border border-border/60 mx-0.5">K</kbd> anytime</span>
        </div>
      </CommandDialog>
    </>
  );
}

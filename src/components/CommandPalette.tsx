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
  Ticket, BellRing, Shield, Settings, Sun, Moon, LogOut,
  ImagePlus, Book, UserCog, Award, Compass, Wrench, History, ChevronRight, Search,
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
    { id: "tool-theme", label: "Toggle Appearance", icon: document.documentElement.classList.contains("dark") ? Sun : Moon, keywords: "dark light mode theme appearance", run: () => { toggleTheme(); setOpen(false); } },
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

  // iOS-style row — neutral vibrancy selection, no chromatic tint
  const Item = ({ a, recent: isRecent }: { a: Action; recent?: boolean }) => (
    <CommandItem
      key={a.id}
      value={`${isRecent ? "recent " : ""}${a.label} ${a.keywords || ""}`}
      onSelect={() => handleSelect(a)}
      className="group/cmd relative my-[2px] rounded-xl px-2.5 py-2 gap-3 !bg-transparent data-[selected=true]:!bg-foreground/[0.06] dark:data-[selected=true]:!bg-white/[0.07] data-[selected=true]:!text-foreground transition-colors duration-150"
    >
      <span className="relative flex items-center justify-center w-8 h-8 rounded-[10px] bg-foreground/[0.04] dark:bg-white/[0.05] border border-foreground/[0.06] dark:border-white/[0.06] group-data-[selected=true]/cmd:bg-foreground/[0.08] dark:group-data-[selected=true]/cmd:bg-white/[0.10] transition-colors">
        <a.icon className="w-[15px] h-[15px] text-foreground/70 group-data-[selected=true]/cmd:text-foreground transition-colors" strokeWidth={1.75} />
      </span>
      <span className="flex-1 truncate font-body text-[13.5px] font-medium tracking-[-0.01em] text-foreground/85 group-data-[selected=true]/cmd:text-foreground">
        {a.label}
      </span>
      {isRecent && (
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium tracking-wide text-muted-foreground/60">
          <History className="w-2.5 h-2.5" strokeWidth={2} /> Recent
        </span>
      )}
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-data-[selected=true]/cmd:text-foreground/60 transition-colors" strokeWidth={2.25} />
    </CommandItem>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="overflow-hidden p-0 border border-white/10 dark:border-white/[0.08] bg-white/80 dark:bg-[#1c1c1e]/85 backdrop-blur-2xl backdrop-saturate-[180%] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35),0_8px_24px_-8px_rgba(0,0,0,0.2)] sm:max-w-[600px] rounded-[20px]"
      >
        {/* Subtle top highlight — Apple specular */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/15 to-transparent" />

        {/* Search header — iOS-style inline input */}
        <div className="relative flex items-center gap-2.5 px-4 pt-3.5 pb-3 border-b border-foreground/[0.06] dark:border-white/[0.06]">
          <Search className="w-[17px] h-[17px] text-muted-foreground/70 shrink-0" strokeWidth={2.25} />
          <Command
            shouldFilter={true}
            className="flex-1 bg-transparent [&_[cmdk-input-wrapper]]:!border-0 [&_[cmdk-input-wrapper]]:!p-0"
          >
            <CommandInput
              placeholder="Search"
              className="h-7 px-0 text-[15px] tracking-[-0.01em] font-normal placeholder:text-muted-foreground/55 [&_+_*]:hidden"
            />
          </Command>
          <span className="hidden sm:flex items-center gap-1 shrink-0">
            <kbd className="px-1.5 h-5 inline-flex items-center justify-center rounded-md bg-foreground/[0.06] dark:bg-white/[0.08] font-sans text-[10.5px] font-medium text-muted-foreground/80">⌘K</kbd>
          </span>
        </div>

        <Command
          shouldFilter={true}
          className="relative bg-transparent [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[-0.005em] [&_[cmdk-group-heading]]:text-muted-foreground/65 [&_[cmdk-group]]:px-2"
        >
          {/* Hidden duplicate input so cmdk filtering works from the styled input above */}
          <CommandInput className="sr-only" tabIndex={-1} />
          <CommandList className="relative max-h-[440px] py-1 cmd-scroll">
            <CommandEmpty>
              <div className="py-12 text-center">
                <div className="mx-auto w-11 h-11 rounded-2xl bg-foreground/[0.04] dark:bg-white/[0.05] border border-foreground/[0.06] dark:border-white/[0.06] flex items-center justify-center mb-3">
                  <Compass className="w-[18px] h-[18px] text-muted-foreground/70" strokeWidth={1.75} />
                </div>
                <p className="font-body text-[13.5px] font-medium text-foreground/85 tracking-[-0.01em]">No results</p>
                <p className="font-body text-[12px] text-muted-foreground/70 mt-1">Try another keyword.</p>
              </div>
            </CommandEmpty>

            {recentActions.length > 0 && (
              <>
                <CommandGroup heading={<span className="inline-flex items-center gap-1.5"><History className="w-3 h-3" strokeWidth={2.25} /> Recent</span> as unknown as string}>
                  {recentActions.map(a => <Item key={`r-${a.id}`} a={a} recent />)}
                </CommandGroup>
                <CommandSeparator className="mx-3 my-1 bg-foreground/[0.06] dark:bg-white/[0.06]" />
              </>
            )}

            <CommandGroup heading={<span className="inline-flex items-center gap-1.5"><Compass className="w-3 h-3" strokeWidth={2.25} /> Navigate</span> as unknown as string}>
              {nav.map(a => <Item key={a.id} a={a} />)}
            </CommandGroup>

            <CommandSeparator className="mx-3 my-1 bg-foreground/[0.06] dark:bg-white/[0.06]" />
            <CommandGroup heading={<span className="inline-flex items-center gap-1.5"><Wrench className="w-3 h-3" strokeWidth={2.25} /> Tools</span> as unknown as string}>
              {tools.map(a => <Item key={a.id} a={a} />)}
            </CommandGroup>
          </CommandList>
        </Command>

        {/* iOS-style footer toolbar */}
        <div className="relative border-t border-foreground/[0.06] dark:border-white/[0.06] bg-foreground/[0.02] dark:bg-white/[0.02] px-4 py-2.5 flex items-center justify-between gap-3 font-body text-[11px] text-muted-foreground/75">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-1.5 h-[18px] inline-flex items-center rounded-[5px] bg-foreground/[0.06] dark:bg-white/[0.08] font-sans text-[10px] font-medium text-foreground/70">↑↓</kbd>
              <span className="text-muted-foreground/70">Navigate</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-1.5 h-[18px] inline-flex items-center rounded-[5px] bg-foreground/[0.06] dark:bg-white/[0.08] font-sans text-[10px] font-medium text-foreground/70">↵</kbd>
              <span className="text-muted-foreground/70">Open</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <kbd className="px-1.5 h-[18px] inline-flex items-center rounded-[5px] bg-foreground/[0.06] dark:bg-white/[0.08] font-sans text-[10px] font-medium text-foreground/70">esc</kbd>
              <span className="text-muted-foreground/70">Close</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[18px] h-[18px] rounded-full bg-foreground/85 dark:bg-white/90 text-background font-semibold text-[10px] flex items-center justify-center">
              {initial}
            </span>
            <span className="text-muted-foreground/70 tracking-[-0.005em]">{roleLabel}</span>
          </div>
        </div>

        <style>{`
          .cmd-scroll::-webkit-scrollbar { width: 6px; }
          .cmd-scroll::-webkit-scrollbar-track { background: transparent; }
          .cmd-scroll::-webkit-scrollbar-thumb {
            background: hsla(var(--foreground) / 0.12);
            border-radius: 999px;
          }
          .cmd-scroll::-webkit-scrollbar-thumb:hover {
            background: hsla(var(--foreground) / 0.2);
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

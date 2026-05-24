import { Link, useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, User, BookOpen, Calendar, FileText,
  Bell, Clock, LogOut, GraduationCap, Users, Upload,
  BarChart3, Settings, Award, Image, Megaphone, Shield,
  UserCog, Menu, X, Mail, Trophy, UserCheck,
  DollarSign, Book, ArrowUpCircle, Cake, ImagePlus, ChevronLeft, ExternalLink,
  BellRing, Monitor, Armchair, Download, MessageSquare, Activity, Gamepad2,
  Briefcase, Ticket, ScrollText
} from "lucide-react";
import collegeLogo from "@/assets/college-logo.png";
import { useState, useEffect } from "react";
import PageLoader from "./PageLoader";
import DarkModeToggle from "./DarkModeToggle";
import ScrollToTop from "./ScrollToTop";
import PullToRefresh from "./PullToRefresh";
import NotificationBadge from "./NotificationBadge";
import NotificationCenter from "./NotificationCenter";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useFcmToken } from "@/hooks/useFcmToken";
import { useNativePush } from "@/hooks/useNativePush";
import NotificationPermissionGate from "./NotificationPermissionGate";

interface NavItem { label: string; path: string; icon: React.ElementType; }

const studentNav: NavItem[] = [
  { label: "Dashboard", path: "/dashboard/student", icon: LayoutDashboard },
  { label: "My Profile", path: "/dashboard/student/profile", icon: User },
  { label: "Attendance", path: "/dashboard/student/attendance", icon: Clock },
  { label: "Marks", path: "/dashboard/student/marks", icon: BarChart3 },
  { label: "Fee Details", path: "/dashboard/student/fees", icon: DollarSign },
  { label: "Timetable", path: "/dashboard/student/timetable", icon: Calendar },
  { label: "Notices", path: "/dashboard/student/notices", icon: Bell },
  { label: "Announcements", path: "/dashboard/student/announcements", icon: Megaphone },
  { label: "Materials", path: "/dashboard/student/materials", icon: BookOpen },
  { label: "Messages", path: "/dashboard/student/messages", icon: MessageSquare },
  { label: "Gamification", path: "/dashboard/student/gamification", icon: Gamepad2 },
  { label: "Jobs & Internships", path: "/dashboard/student/jobs", icon: Briefcase },
  { label: "Scholarships", path: "/dashboard/student/scholarships", icon: GraduationCap },
  { label: "Feedback", path: "/dashboard/student/feedback", icon: FileText },
];

const teacherNav: NavItem[] = [
  { label: "Dashboard", path: "/dashboard/teacher", icon: LayoutDashboard },
  { label: "Students", path: "/dashboard/teacher/students", icon: Users },
  { label: "Attendance", path: "/dashboard/teacher/attendance", icon: Clock },
  { label: "Attendance Overview", path: "/dashboard/teacher/attendance-overview", icon: UserCheck },
  { label: "Marks", path: "/dashboard/teacher/marks", icon: BarChart3 },
  { label: "Timetable", path: "/dashboard/teacher/timetable", icon: Calendar },
  { label: "Materials", path: "/dashboard/teacher/materials", icon: Upload },
  { label: "Announcements", path: "/dashboard/teacher/announcements", icon: Megaphone },
  { label: "Notices", path: "/dashboard/teacher/notices", icon: Bell },
  { label: "Messages", path: "/dashboard/teacher/messages", icon: MessageSquare },
];

const principalNav: NavItem[] = [
  { label: "Dashboard", path: "/dashboard/principal", icon: LayoutDashboard },
  { label: "Top Students", path: "/dashboard/principal/top-students", icon: Award },
  { label: "Events", path: "/dashboard/principal/events", icon: Image },
  { label: "Notices", path: "/dashboard/principal/notices", icon: Megaphone },
  { label: "Courses", path: "/dashboard/principal/courses", icon: BookOpen },
  { label: "Departments", path: "/dashboard/principal/departments", icon: GraduationCap },
  { label: "Teachers", path: "/dashboard/principal/teachers", icon: Users },
  { label: "Students", path: "/dashboard/principal/students", icon: UserCog },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", path: "/dashboard/admin", icon: LayoutDashboard },
  { label: "Post Notice", path: "/dashboard/admin/post-notice", icon: Megaphone },
  { label: "Promotion & Years", path: "/dashboard/admin/promotion-hub", icon: ArrowUpCircle },
  { label: "Academics", path: "/dashboard/admin/academics-hub", icon: BookOpen },
  { label: "Attendance Hub", path: "/dashboard/admin/attendance", icon: UserCheck },
  { label: "Inbox", path: "/dashboard/admin/inbox", icon: Mail },
  { label: "Users", path: "/dashboard/admin/users", icon: Users },
  { label: "Academic Overview", path: "/dashboard/admin/academic-overview", icon: GraduationCap },
  { label: "Faculty", path: "/dashboard/admin/faculty", icon: UserCheck },
  { label: "Fee Management", path: "/dashboard/admin/fees", icon: DollarSign },
  { label: "Top Rankers", path: "/dashboard/admin/top-rankers", icon: Trophy },
  { label: "Timetable", path: "/dashboard/admin/timetable", icon: Calendar },
  { label: "Events", path: "/dashboard/admin/events", icon: Image },
  { label: "Banners & Papers", path: "/dashboard/admin/banners", icon: Book },
  { label: "Gallery", path: "/dashboard/admin/gallery", icon: ImagePlus },
  { label: "Hall Tickets", path: "/dashboard/admin/hall-tickets", icon: Ticket },
  { label: "Career Hub", path: "/dashboard/admin/career-hub", icon: Briefcase },
  { label: "Broadcast", path: "/dashboard/admin/broadcast", icon: BellRing },
  { label: "Feedback & Logs", path: "/dashboard/admin/feedback-logs", icon: MessageSquare },
  { label: "Admin Tools", path: "/dashboard/admin/tools", icon: Shield },
  { label: "Settings", path: "/dashboard/admin/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isSubscribed, isSupported, subscribe, isLoading: pushLoading } = usePushNotifications();
  useFcmToken();
  useNativePush();
  const [pushBannerDismissed, setPushBannerDismissed] = useState(() => {
    return localStorage.getItem('hdc_push_banner_dismissed') === '1';
  });

  const navItems = role === "student" ? studentNav
    : role === "teacher" ? teacherNav
    : role === "principal" ? principalNav
    : adminNav;

  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : "";

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const currentPage = navItems.find(item => location.pathname === item.path)?.label || roleLabel + " Dashboard";

  return (
    <PullToRefresh>
    <div className="min-h-screen flex bg-muted/30 dark:bg-background relative">
      <NotificationPermissionGate />
      <ScrollToTop />
      <PageLoader />

      {/* Animated brand bar across the very top */}
      <div className="brand-bar fixed top-0 left-0 right-0 z-[60] pointer-events-none" />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/30 backdrop-blur-md z-40 lg:hidden transition-opacity duration-300 animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[244px] bg-[hsl(220,20%,9%)] dark:bg-[hsl(0,0%,6%)] text-white/90 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col border-r border-white/[0.04] relative overflow-hidden`}>
        {/* ambient corner glow */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-56 h-56 rounded-full bg-[hsl(42,75%,55%)]/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-20 w-64 h-64 rounded-full bg-primary/[0.07] blur-3xl" />

        <div className="relative px-5 pt-6 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 group/brand">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/10 shadow-lg shadow-black/40 transition-transform duration-500 group-hover/brand:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(42,75%,55%)]/30 to-transparent opacity-0 group-hover/brand:opacity-100 transition-opacity duration-500" />
                <img src={collegeLogo} alt="Logo" className="w-full h-full object-contain relative z-10" />
              </div>
              <div>
                <p className="font-body text-[13px] font-semibold leading-tight text-brand-sheen">Hoysala College</p>
                <p className="font-body text-[10px] text-white/40 mt-0.5 tracking-wider uppercase">{roleLabel} Portal</p>
              </div>
            </div>
            <button className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors focus-brand" onClick={() => setSidebarOpen(false)}>
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* divider with brand shimmer */}
        <div className="relative mx-5 mb-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <nav className="relative flex-1 overflow-y-auto px-3 pb-3 space-y-0.5 dashboard-scroll">
          {navItems.map((item, i) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-[13px] transition-all duration-300 group/nav overflow-hidden ${
                  active
                    ? "bg-gradient-to-r from-white/[0.14] via-white/[0.08] to-transparent text-white font-medium"
                    : "text-white/55 hover:bg-white/[0.06] hover:text-white/90 hover:translate-x-0.5"
                }`}
                style={{ animation: `sidebar-item-in 0.35s cubic-bezier(0.16,1,0.3,1) ${Math.min(i * 22, 240)}ms both` }}
              >
                {active && (
                  <>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full" style={{ background: "linear-gradient(180deg, hsl(42,75%,55%), hsl(42,75%,70%))", boxShadow: "0 0 10px hsla(42,75%,55%,0.55)" }} />
                    <div className="absolute inset-0 opacity-40 pointer-events-none shimmer-sweep" />
                  </>
                )}
                <item.icon className={`relative w-[16px] h-[16px] shrink-0 transition-all duration-300 ${active ? "text-[hsl(42,75%,62%)] drop-shadow-[0_0_6px_hsl(42_75%_55%/0.55)]" : "text-white/45 group-hover/nav:text-white/75 group-hover/nav:scale-110"}`} />
                <span className="relative truncate">{item.label}</span>
                {active && <div className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-[hsl(42,75%,55%)] glow-pulse" />}
              </Link>
            );
          })}
        </nav>

        <style>{`
          @keyframes sidebar-item-in {
            0% { opacity: 0; transform: translateX(-10px); }
            100% { opacity: 1; transform: translateX(0); }
          }
        `}</style>

        <div className="relative px-3 py-4 border-t border-white/[0.06] shrink-0 bg-gradient-to-b from-transparent to-black/20">
          <div className="flex items-center gap-2.5 px-3 mb-3">
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center shrink-0 ring-1 ring-white/10">
              <User className="w-3.5 h-3.5 text-white/70" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[hsl(0,0%,6%)] glow-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-body text-[12px] font-medium text-white/85 truncate">{profile?.full_name || "User"}</p>
              <p className="font-body text-[10px] text-white/35 truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg font-body text-[12px] text-white/45 hover:bg-red-500/10 hover:text-red-300 transition-all duration-300 group/logout focus-brand"
          >
            <LogOut className="w-3.5 h-3.5 transition-transform duration-300 group-hover/logout:-translate-x-0.5" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card/70 dark:bg-card/50 backdrop-blur-2xl border-b border-border/60 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_0_0_hsl(var(--primary)/0.05)]">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-muted transition-colors duration-200 focus-brand"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-foreground/70" />
            </button>
            <div className="relative">
              <h1 className="font-body text-[15px] sm:text-base font-semibold text-foreground tracking-[-0.01em] flex items-center gap-2">
                <span className="hidden sm:inline-block w-1 h-4 rounded-full bg-gradient-to-b from-primary to-primary/40" />
                {currentPage}
              </h1>
              <p className="font-body text-[11px] text-muted-foreground hidden sm:block">Hoysala Degree College</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSupported && !isSubscribed && (
              <button
                onClick={subscribe}
                disabled={pushLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-body text-[12px] font-semibold focus-brand"
                title="Enable push notifications"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{pushLoading ? 'Enabling...' : 'Enable Alerts'}</span>
              </button>
            )}
            {isSubscribed && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[11px] font-body font-semibold" title="Push notifications enabled">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 glow-pulse" /> Live
              </span>
            )}
            <NotificationCenter />
            <DarkModeToggle />
            {Capacitor.isNativePlatform() ? (
              <button
                onClick={() => window.open("https://hoysaladegreecollege1.lovable.app", "_system")}
                className="font-body text-[12px] text-muted-foreground hover:text-foreground transition-all duration-200 px-3 py-1.5 rounded-lg hover:bg-muted hover:scale-[1.02] flex items-center gap-1.5 focus-brand"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="hidden sm:inline">Website</span>
              </button>
            ) : (
              <Link
                to="/"
                className="font-body text-[12px] text-muted-foreground hover:text-foreground transition-all duration-200 px-3 py-1.5 rounded-lg hover:bg-muted hover:scale-[1.02] flex items-center gap-1.5 focus-brand"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="hidden sm:inline">Website</span>
              </Link>
            )}
          </div>
        </header>

        {isSupported && !isSubscribed && !pushBannerDismissed && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 animate-fade-in shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.35)]">
            <div className="relative shrink-0">
              <BellRing className="w-5 h-5 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary glow-pulse" />
            </div>
            <p className="font-body text-xs text-foreground flex-1">
              <span className="font-semibold">Enable Push Notifications</span> — Get instant alerts for attendance, marks, and announcements even when the browser is closed.
            </p>
            <button onClick={subscribe} disabled={pushLoading}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-body text-xs font-semibold hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shrink-0 shadow-md shadow-primary/30">
              {pushLoading ? 'Enabling...' : 'Enable'}
            </button>
            <button onClick={() => { setPushBannerDismissed(true); localStorage.setItem('hdc_push_banner_dismissed', '1'); }}
              className="p-1 rounded hover:bg-muted transition-colors shrink-0">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto dashboard-scroll">
          <div className="max-w-7xl mx-auto dashboard-enter">{children}</div>
        </main>
      </div>
    </div>
    </PullToRefresh>
  );
}


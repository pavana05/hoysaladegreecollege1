import { Link, useLocation, useNavigate } from "react-router-dom";
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
  { label: "Semester Promotion", path: "/dashboard/admin/semester-promotion", icon: ArrowUpCircle },
  { label: "Academic Years", path: "/dashboard/admin/academic-years", icon: Calendar },
  { label: "Courses", path: "/dashboard/admin/courses", icon: BookOpen },
  { label: "Departments & Seats", path: "/dashboard/admin/departments", icon: Monitor },
  { label: "Attendance Hub", path: "/dashboard/admin/attendance", icon: UserCheck },
  { label: "Applications", path: "/dashboard/admin/applications", icon: FileText },
  { label: "Messages", path: "/dashboard/admin/contacts", icon: Mail },
  { label: "Users", path: "/dashboard/admin/users", icon: Users },
  { label: "Faculty", path: "/dashboard/admin/faculty", icon: UserCheck },
  { label: "Fee Management", path: "/dashboard/admin/fees", icon: DollarSign },
  { label: "Top Rankers", path: "/dashboard/admin/top-rankers", icon: Trophy },
  { label: "Timetable", path: "/dashboard/admin/timetable", icon: Calendar },
  { label: "Events", path: "/dashboard/admin/events", icon: Image },
  { label: "Banners & Papers", path: "/dashboard/admin/banners", icon: Book },
  { label: "Gallery", path: "/dashboard/admin/gallery", icon: ImagePlus },
  { label: "Birthday Wishes", path: "/dashboard/admin/birthday-settings", icon: Cake },
  { label: "Roles", path: "/dashboard/admin/roles", icon: Shield },
  { label: "Reports & Export", path: "/dashboard/admin/reports", icon: Download },
  { label: "Alumni", path: "/dashboard/admin/alumni", icon: GraduationCap },
  { label: "Broadcast", path: "/dashboard/admin/broadcast", icon: BellRing },
  { label: "Activity Log", path: "/dashboard/admin/activity-log", icon: Activity },
  { label: "Feedback", path: "/dashboard/admin/feedback", icon: MessageSquare },
  { label: "Hall Tickets", path: "/dashboard/admin/hall-tickets", icon: Ticket },
  { label: "Job Board", path: "/dashboard/admin/job-board", icon: Briefcase },
  { label: "Scholarships", path: "/dashboard/admin/scholarships", icon: ScrollText },
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
    <div className="min-h-screen flex bg-muted/30 dark:bg-background">
      <NotificationPermissionGate />
      <ScrollToTop />
      <PageLoader />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[240px] bg-[hsl(220,20%,10%)] dark:bg-[hsl(0,0%,7%)] text-white/90 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col`}>
        <div className="px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img src={collegeLogo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="font-body text-[13px] font-semibold text-white/90 leading-tight">Hoysala College</p>
                <p className="font-body text-[10px] text-white/35 mt-0.5">{roleLabel} Portal</p>
              </div>
            </div>
            <button className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setSidebarOpen(false)}>
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
          {navItems.map((item, i) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-[13px] transition-all duration-300 group/nav ${
                  active
                    ? "bg-white/12 text-white font-medium"
                    : "text-white/50 hover:bg-white/6 hover:text-white/80"
                }`}
                style={{ animation: `sidebar-item-in 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both` }}
              >
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full" style={{ background: "linear-gradient(180deg, hsl(42,75%,55%), hsl(42,75%,65%))", boxShadow: "0 0 8px hsla(42,75%,55%,0.4)" }} />}
                <item.icon className={`w-[16px] h-[16px] shrink-0 transition-all duration-300 ${active ? "text-[hsl(42,75%,60%)]" : "text-white/40 group-hover/nav:text-white/60"}`} />
                <span className="truncate">{item.label}</span>
                {active && <div className="absolute right-2 w-1 h-1 rounded-full bg-[hsl(42,75%,55%)] animate-pulse" />}
              </Link>
            );
          })}
        </nav>

        <style>{`
          @keyframes sidebar-item-in {
            0% { opacity: 0; transform: translateX(-8px); }
            100% { opacity: 1; transform: translateX(0); }
          }
        `}</style>

        <div className="px-3 py-4 border-t border-white/8 shrink-0">
          <div className="flex items-center gap-2.5 px-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-white/60" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-body text-[12px] font-medium text-white/80 truncate">{profile?.full_name || "User"}</p>
              <p className="font-body text-[10px] text-white/30 truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg font-body text-[12px] text-white/40 hover:bg-white/6 hover:text-white/70 transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card/80 dark:bg-card/60 backdrop-blur-lg border-b border-border/60 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-muted transition-colors duration-200"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-foreground/70" />
            </button>
            <div>
              <h1 className="font-body text-[15px] sm:text-base font-semibold text-foreground tracking-[-0.01em]">{currentPage}</h1>
              <p className="font-body text-[11px] text-muted-foreground hidden sm:block">Hoysala Degree College</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSupported && !isSubscribed && (
              <button
                onClick={subscribe}
                disabled={pushLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-body text-[12px] font-semibold"
                title="Enable push notifications"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{pushLoading ? 'Enabling...' : 'Enable Alerts'}</span>
              </button>
            )}
            {isSubscribed && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-body font-semibold" title="Push notifications enabled">
                <BellRing className="w-3 h-3" /> On
              </span>
            )}
            <NotificationCenter />
            <DarkModeToggle />
            <Link
              to="/"
              className="font-body text-[12px] text-muted-foreground hover:text-foreground transition-colors duration-200 px-3 py-1.5 rounded-lg hover:bg-muted flex items-center gap-1.5"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">Website</span>
            </Link>
          </div>
        </header>

        {isSupported && !isSubscribed && !pushBannerDismissed && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 animate-fade-in">
            <BellRing className="w-5 h-5 text-primary shrink-0" />
            <p className="font-body text-xs text-foreground flex-1">
              <span className="font-semibold">Enable Push Notifications</span> — Get instant alerts for attendance, marks, and announcements even when the browser is closed.
            </p>
            <button onClick={subscribe} disabled={pushLoading}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-body text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0">
              {pushLoading ? 'Enabling...' : 'Enable'}
            </button>
            <button onClick={() => { setPushBannerDismissed(true); localStorage.setItem('hdc_push_banner_dismissed', '1'); }}
              className="p-1 rounded hover:bg-muted transition-colors shrink-0">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
    </PullToRefresh>
  );
}

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
  Briefcase, Ticket, ScrollText, Brain, MoreVertical, Moon, Sun, HelpCircle, Sparkles, ChevronRight
} from "lucide-react";
import collegeLogo from "@/assets/college-logo.png";
import { useState, useEffect } from "react";
import PageLoader from "./PageLoader";

import ScrollToTop from "./ScrollToTop";
import PullToRefresh from "./PullToRefresh";
import NotificationBadge from "./NotificationBadge";
import NotificationCenter from "./NotificationCenter";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useFcmToken } from "@/hooks/useFcmToken";
import { useNativePush } from "@/hooks/useNativePush";
import NotificationPermissionGate from "./NotificationPermissionGate";
import PermissionsOnboarding from "./PermissionsOnboarding";
import CommandPalette from "./CommandPalette";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

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
  { label: "AI Insights", path: "/dashboard/principal/ai-insights", icon: Brain },
  { label: "Students", path: "/dashboard/principal/students", icon: GraduationCap },
  { label: "Attendance", path: "/dashboard/principal/attendance", icon: Clock },
  { label: "Fees", path: "/dashboard/principal/fees", icon: DollarSign },
  { label: "Exams", path: "/dashboard/principal/exams", icon: ScrollText },
  { label: "Post Notice", path: "/dashboard/admin/post-notice", icon: Megaphone },
  { label: "Promotion & Years", path: "/dashboard/admin/promotion-hub", icon: ArrowUpCircle },
  { label: "Academics", path: "/dashboard/admin/academics-hub", icon: BookOpen },
  { label: "Attendance Hub", path: "/dashboard/admin/attendance", icon: UserCheck },
  { label: "Inbox", path: "/dashboard/admin/inbox", icon: Mail },
  { label: "Users", path: "/dashboard/admin/users", icon: Users },
  { label: "Student Approvals", path: "/dashboard/admin/student-approvals", icon: UserCheck },

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
];

const adminNav: NavItem[] = [
  { label: "Dashboard", path: "/dashboard/admin", icon: LayoutDashboard },
  { label: "Post Notice", path: "/dashboard/admin/post-notice", icon: Megaphone },
  { label: "Promotion & Years", path: "/dashboard/admin/promotion-hub", icon: ArrowUpCircle },
  { label: "Academics", path: "/dashboard/admin/academics-hub", icon: BookOpen },
  { label: "Attendance Hub", path: "/dashboard/admin/attendance", icon: UserCheck },
  { label: "Inbox", path: "/dashboard/admin/inbox", icon: Mail },
  { label: "Users", path: "/dashboard/admin/users", icon: Users },
  { label: "Student Approvals", path: "/dashboard/admin/student-approvals", icon: UserCheck },

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
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  useEffect(() => {
    if (!moreMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreMenuOpen]);
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

  const handleLogout = async () => {
    const t = toast.loading("Signing you out…");
    try {
      await signOut();
      toast.success("Signed out successfully", {
        id: t,
        description: "Your session has ended. See you soon!",
      });
      navigate("/");
    } catch (e: any) {
      toast.error("Sign out failed", { id: t, description: e?.message || "Please try again." });
    }
  };

  const currentPage = navItems.find(item => location.pathname === item.path)?.label || roleLabel + " Dashboard";

  return (
    <PullToRefresh>
    <div className="dark min-h-screen flex bg-background text-foreground">

      <NotificationPermissionGate />
      <PermissionsOnboarding />
      <CommandPalette />
      <ScrollToTop />
      <PageLoader />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 lg:hidden transition-opacity duration-200"
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

        <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5 sidebar-scroll">
          {navItems.map((item, i) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-[13px] overflow-hidden transition-[transform,color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group/nav will-change-transform ${
                  active
                    ? "bg-white/[0.08] text-white font-medium"
                    : "text-white/55 hover:text-white hover:translate-x-0.5"
                }`}
                style={{ animation: `sidebar-item-in 0.25s ease-out ${Math.min(i * 20, 200)}ms both` }}
              >
                {/* Hover gradient sheen */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover/nav:opacity-100 transition-opacity duration-500"
                  style={{
                    background:
                      "linear-gradient(110deg, transparent 0%, hsla(42,75%,55%,0.08) 35%, hsla(42,75%,65%,0.14) 50%, hsla(42,75%,55%,0.08) 65%, transparent 100%)",
                  }}
                />
                {/* Left accent bar (grows on hover, full on active) */}
                <span
                  aria-hidden
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-full transition-all duration-300 ease-out ${
                    active ? "h-4 opacity-100" : "h-2 opacity-0 group-hover/nav:opacity-100 group-hover/nav:h-3.5"
                  }`}
                  style={{
                    background: "linear-gradient(180deg, hsl(42,75%,55%), hsl(42,75%,65%))",
                    boxShadow: "0 0 8px hsla(42,75%,55%,0.45)",
                  }}
                />
                {/* Active background glow */}
                {active && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-lg"
                    style={{
                      background:
                        "linear-gradient(90deg, hsla(42,75%,55%,0.12) 0%, hsla(42,75%,55%,0.02) 60%, transparent 100%)",
                    }}
                  />
                )}
                <item.icon
                  className={`relative w-[16px] h-[16px] shrink-0 transition-all duration-300 ease-out ${
                    active
                      ? "text-[hsl(42,75%,62%)] drop-shadow-[0_0_6px_hsla(42,75%,55%,0.5)]"
                      : "text-white/45 group-hover/nav:text-[hsl(42,75%,62%)] group-hover/nav:scale-110 group-hover/nav:rotate-[-4deg]"
                  }`}
                />
                <span className="relative truncate tracking-[-0.005em]">{item.label}</span>
                {active && (
                  <span className="relative ml-auto flex items-center">
                    <span className="w-1 h-1 rounded-full bg-[hsl(42,75%,55%)] animate-ping absolute" />
                    <span className="w-1 h-1 rounded-full bg-[hsl(42,75%,60%)]" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <style>{`
          @keyframes sidebar-item-in {
            0% { opacity: 0; transform: translateX(-8px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          .sidebar-scroll::-webkit-scrollbar { width: 4px; }
          .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
          .sidebar-scroll::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, hsla(42,75%,55%,0.25), hsla(42,75%,55%,0.05));
            border-radius: 999px;
          }
          .sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, hsla(42,75%,55%,0.5), hsla(42,75%,55%,0.15));
          }
        `}</style>


        <div className="px-3 py-4 border-t border-white/8 shrink-0">
          <div className="flex items-center gap-2.5 px-3 mb-3">
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10 bg-gradient-to-br from-[hsl(42,75%,55%)]/30 to-[hsl(42,75%,55%)]/5 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile?.full_name || "User"} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-[12px] font-bold text-[hsl(42,75%,70%)]">
                  {(profile?.full_name || "U")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-body text-[12px] font-medium text-white/80 truncate">{profile?.full_name || "User"}</p>
              <p className="font-body text-[10px] text-white/30 truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setSignOutDialogOpen(true)}
            className="group flex items-center gap-2 w-full px-3 py-2 rounded-lg font-body text-[12px] text-white/40 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 border border-transparent hover:shadow-[0_0_20px_-5px_hsl(0_85%_60%/0.4)] [&_svg]:hover:text-red-400 [&_svg]:hover:translate-x-0.5 [&_svg]:transition-transform transition-all duration-200"
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
          <div className="flex items-center gap-1.5">
            {isSupported && !isSubscribed && (
              <button
                onClick={subscribe}
                disabled={pushLoading}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(42,75%,55%)]/12 text-[hsl(42,75%,62%)] hover:bg-[hsl(42,75%,55%)]/20 transition-colors font-body text-[12px] font-semibold"
                title="Enable push notifications"
              >
                <BellRing className="w-3.5 h-3.5" />
                {pushLoading ? 'Enabling...' : 'Enable Alerts'}
              </button>
            )}
            {isSubscribed && (
              <span className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[11px] font-body font-semibold" title="Push notifications enabled">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            )}
            <NotificationCenter />

            {/* Premium iOS-style More menu trigger */}
            <button
              onClick={() => setMoreMenuOpen(true)}
              aria-label="More options"
              className="relative p-2 rounded-full text-foreground/70 hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200"
            >
              <MoreVertical className="w-[18px] h-[18px]" strokeWidth={2.25} />
              {isSupported && !isSubscribed && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[hsl(42,75%,55%)] ring-2 ring-background animate-pulse" />
              )}
            </button>
          </div>
        </header>

        {/* === Premium iOS-style More Menu === */}
        {moreMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-md animate-fade-in"
              style={{ animationDuration: "180ms" }}
              onClick={() => setMoreMenuOpen(false)}
            />
            <div
              role="menu"
              className="fixed z-[70] top-[60px] right-3 sm:right-5 w-[300px] origin-top-right ios-menu-pop"
            >
              <div className="relative rounded-[26px] overflow-hidden border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)] bg-[linear-gradient(160deg,hsla(220,18%,14%,0.92),hsla(220,20%,9%,0.94))] backdrop-blur-2xl">
                {/* Aurora glow */}
                <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-[hsl(42,75%,55%)]/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-[hsl(280,60%,55%)]/15 blur-3xl" />

                {/* Header */}
                <div className="relative px-4 pt-4 pb-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-white/10 bg-gradient-to-br from-[hsl(42,75%,55%)]/30 to-white/5 flex items-center justify-center shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display text-[13px] font-bold text-[hsl(42,75%,72%)]">
                        {(profile?.full_name || "U")[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-[13px] font-semibold text-white/95 truncate">{profile?.full_name || "User"}</p>
                    <p className="font-body text-[11px] text-white/45 truncate">{roleLabel} · {profile?.email}</p>
                  </div>
                </div>

                <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Menu items */}
                <div className="relative p-2 space-y-0.5">
                  {isSupported && !isSubscribed && (
                    <MenuItem
                      delay={40}
                      icon={BellRing}
                      tint="amber"
                      label={pushLoading ? "Enabling alerts…" : "Enable Push Alerts"}
                      sub="Instant updates for marks & notices"
                      badge={<Sparkles className="w-3 h-3 text-[hsl(42,75%,65%)]" />}
                      onClick={() => { subscribe(); }}
                      disabled={pushLoading}
                    />
                  )}

                  <MenuItem
                    delay={80}
                    icon={ExternalLink}
                    tint="sky"
                    label="Visit Website"
                    sub="hoysaladegreecollege.in"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      if (Capacitor.isNativePlatform()) {
                        window.open("https://hoysaladegreecollege1.lovable.app", "_system");
                      } else {
                        navigate("/");
                      }
                    }}
                  />

                  <MenuItem
                    delay={120}
                    icon={HelpCircle}
                    tint="violet"
                    label="Help & Support"
                    sub="FAQs and contact"
                    onClick={() => { setMoreMenuOpen(false); navigate("/support"); }}
                  />

                  <div className="my-1.5 mx-2 h-px bg-white/[0.06]" />

                  <MenuItem
                    delay={160}
                    icon={LogOut}
                    tint="red"
                    label="Sign Out"
                    sub="End this session safely"
                    onClick={() => { setMoreMenuOpen(false); setSignOutDialogOpen(true); }}
                  />
                </div>

                {/* Footer */}
                <div className="relative px-4 pb-3 pt-1 flex items-center justify-between">
                  <p className="font-body text-[10px] text-white/30 tracking-wide">HDC PORTAL</p>
                  <p className="font-body text-[10px] text-white/30">v2.0</p>
                </div>
              </div>
            </div>

            <style>{`
              @keyframes ios-menu-pop {
                0% { opacity: 0; transform: translateY(-8px) scale(0.92); }
                60% { opacity: 1; transform: translateY(2px) scale(1.01); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
              }
              .ios-menu-pop {
                animation: ios-menu-pop 360ms cubic-bezier(0.16,1,0.3,1) both;
              }
              @keyframes ios-item-in {
                0% { opacity: 0; transform: translateY(6px); }
                100% { opacity: 1; transform: translateY(0); }
              }
              .ios-menu-item { animation: ios-item-in 280ms cubic-bezier(0.16,1,0.3,1) both; }
            `}</style>
          </>
        )}

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
          <div className="max-w-7xl mx-auto dashboard-enter">{children}</div>
        </main>
      </div>
    </div>

    <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
      <AlertDialogContent className="bg-background border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>Sign Out</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to sign out of your account?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setSignOutDialogOpen(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Sign Out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </PullToRefresh>
  );
}

const TINTS: Record<string, string> = {
  amber: "bg-[hsl(42,75%,55%)]/15 text-[hsl(42,80%,68%)]",
  sky: "bg-sky-500/15 text-sky-300",
  violet: "bg-violet-500/15 text-violet-300",
  red: "bg-red-500/15 text-red-400",
  emerald: "bg-emerald-500/15 text-emerald-300",
};

function MenuItem({
  icon: Icon, label, sub, onClick, tint = "sky", delay = 0, disabled, badge,
}: {
  icon: React.ElementType; label: string; sub?: string; onClick: () => void;
  tint?: keyof typeof TINTS | string; delay?: number; disabled?: boolean; badge?: React.ReactNode;
}) {
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="ios-menu-item group w-full flex items-center gap-3 px-2.5 py-2.5 rounded-2xl text-left transition-all duration-200 hover:bg-white/[0.06] active:bg-white/[0.09] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-white/5 transition-transform duration-300 group-hover:scale-105 ${TINTS[tint] || TINTS.sky}`}>
        <Icon className="w-[17px] h-[17px]" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="font-body text-[13px] font-semibold text-white/92 truncate">{label}</p>
          {badge}
        </div>
        {sub && <p className="font-body text-[11px] text-white/40 truncate">{sub}</p>}
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-white/25 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}


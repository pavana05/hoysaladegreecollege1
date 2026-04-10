import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Phone, Mail, Sparkles, FileText, TrendingUp, Building, Users, BookOpen, GraduationCap, Monitor } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import collegeLogo from "@/assets/college-logo.png";
import saiBabaImg from "@/assets/sai-baba.png";
import DarkModeToggle from "./DarkModeToggle";

const WEBSITE_URL = "https://hoysaladegreecollege1.lovable.app";

const aboutDropdown = [
  { label: "About Us", path: "/about", icon: Building, desc: "Our story & vision" },
  { label: "Offers", path: "/offers", icon: FileText, desc: "Course brochures & fees" },
  { label: "Placements", path: "/placements", icon: TrendingUp, desc: "Career support & stats" },
  { label: "Campus", path: "/campus", icon: Building, desc: "Virtual campus tour" },
  { label: "Alumni Network", path: "/alumni", icon: Users, desc: "Success stories" },
];

const facultyDropdown = [
  { label: "Faculty", path: "/faculty", icon: Users, desc: "Our teaching staff" },
  { label: "Management", path: "/management", icon: Building, desc: "College management" },
  { label: "Departments", path: "/departments", icon: Monitor, desc: "Academic departments" },
];

const admissionsDropdown = [
  { label: "Admissions", path: "/admissions", icon: BookOpen, desc: "Admission details & fees" },
  { label: "Apply Now", path: "/apply", icon: GraduationCap, desc: "Online application form" },
  { label: "Track Application", path: "/application-status", icon: FileText, desc: "Check your status" },
];

const otherDropdown = [
  { label: "Committees", path: "/committees", icon: Users, desc: "College committees" },
  { label: "Question Bank", path: "/previous-year-papers", icon: BookOpen, desc: "Previous year papers" },
  { label: "Achievements", path: "/achievements", icon: TrendingUp, desc: "Top rankers & awards" },
  { label: "Notices", path: "/notices", icon: FileText, desc: "Important announcements" },
  { label: "FAQ / Help", path: "/faq", icon: FileText, desc: "Frequently asked questions" },
];

const navLinks = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about", hasDropdown: true, dropdownKey: "about" },
  { label: "Courses", path: "/courses" },
  { label: "Admissions", path: "/admissions", hasDropdown: true, dropdownKey: "admissions" },
  { label: "Faculty", path: "/faculty", hasDropdown: true, dropdownKey: "faculty" },
  { label: "Events", path: "/events" },
  { label: "Gallery", path: "/gallery" },
  { label: "Other", path: "#", hasDropdown: true, dropdownKey: "other" },
  { label: "Contact", path: "/contact" },
];

const dropdownMap: Record<string, typeof aboutDropdown> = {
  about: aboutDropdown,
  faculty: facultyDropdown,
  admissions: admissionsDropdown,
  other: otherDropdown,
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpenDropdown, setMobileOpenDropdown] = useState<string | null>(null);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout>>();
  const navRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); setMobileOpenDropdown(null); }, [location.pathname]);

  useEffect(() => {
    if (!navRef.current) return;
    const activeEl = navRef.current.querySelector('[data-active="true"]') as HTMLElement;
    if (activeEl) {
      const navRect = navRef.current.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      setIndicatorStyle({ left: elRect.left - navRect.left, width: elRect.width, opacity: 1 });
    } else {
      setIndicatorStyle(s => ({ ...s, opacity: 0 }));
    }
  }, [location.pathname]);

  const maxScroll = typeof document !== 'undefined' ? document.documentElement.scrollHeight - window.innerHeight : 1;
  const progress = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;

  const handleDropdownEnter = (key: string) => {
    clearTimeout(dropdownTimeout.current);
    setOpenDropdown(key);
  };
  const handleDropdownLeave = () => {
    dropdownTimeout.current = setTimeout(() => setOpenDropdown(null), 200);
  };

  const isDropdownActive = (link: any) => {
    if (!link.hasDropdown || !link.dropdownKey) return location.pathname === link.path;
    const items = dropdownMap[link.dropdownKey] || [];
    return items.some(d => location.pathname === d.path);
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-500 border-b ${scrolled
      ? "bg-card/80 backdrop-blur-xl backdrop-saturate-150 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border-border/50"
      : "bg-card/60 backdrop-blur-lg backdrop-saturate-125 border-border/20"
    }`}>
      {/* Scroll progress bar */}
      <div className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-secondary via-primary to-secondary transition-all duration-100 z-50"
        style={{ width: `${progress * 100}%`, opacity: progress > 0 ? 1 : 0 }} />

      {/* Top bar */}
      <div className="relative py-3 overflow-hidden bg-primary dark:bg-[hsl(230,20%,6%)]">
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/[0.02] to-transparent animate-[shimmer_8s_linear_infinite]" />
        <div className="absolute -top-8 left-[8%] w-32 h-32 rounded-full blur-3xl animate-float bg-secondary/5" />
        <div className="absolute -bottom-6 right-[12%] w-28 h-28 rounded-full blur-3xl animate-float bg-secondary/[0.03]" style={{ animationDelay: "2s" }} />
        <div className="absolute top-0 left-0 right-0 h-[0.5px] bg-gradient-to-r from-transparent via-secondary/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-gradient-to-r from-transparent via-primary-foreground/[0.06] to-transparent" />

        <div className="container px-4 relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 animate-fade-in">
            <img src={saiBabaImg} alt="Shri Shirdi Sai" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-secondary/40 shadow-md shrink-0" />
            <p className="font-display text-[10px] sm:text-[13px] font-bold tracking-[0.04em] text-primary-foreground/90 truncate">
              ಶ್ರೀಶಿರಡಿ ಸಾಯಿ ಎಜುಕೇಷನಲ್ ಟ್ರಸ್ಟ್ (ರಿ.)
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-5 shrink-0 text-[10px] sm:text-[11px] animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <span className="hidden sm:flex items-center gap-2 font-medium tracking-wide text-secondary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 bg-secondary" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-secondary" />
              </span>
              Recognized by Govt. of Karnataka
            </span>
            <span className="hidden sm:block w-[0.5px] h-3 bg-primary-foreground/[0.08]" />
            <a href="tel:7676272167" className="text-primary-foreground/60 hover:text-primary-foreground/90 transition-all duration-400 inline-flex items-center gap-1.5 group hover:-translate-y-[0.5px]">
              <Phone className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-all duration-400" />
              <span className="tracking-wide hidden sm:inline">7676272167</span>
            </a>
            <span className="hidden sm:block w-[0.5px] h-3 bg-primary-foreground/[0.08]" />
            <a href="mailto:principal.hoysaladegreecollege@gmail.com" className="text-primary-foreground/60 hover:text-primary-foreground/90 transition-all duration-400 inline-flex items-center gap-1.5 group hover:-translate-y-[0.5px]">
              <Mail className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-all duration-400" />
              <span className="tracking-wide hidden sm:inline">Mail Us</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="container flex items-center justify-between py-2 sm:py-2.5 px-4">
        {/* Logo — on native, opens website in external browser */}
        {Capacitor.isNativePlatform() ? (
          <button
            onClick={() => window.open(WEBSITE_URL, "_system")}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shrink-0">
              <img src={collegeLogo} alt="Hoysala Degree College Logo" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-400" />
            </div>
            <div className="leading-tight text-left">
              <span className="font-display text-sm sm:text-[17px] font-bold block group-hover:text-primary transition-colors duration-300 text-foreground">
                Hoysala Degree College
              </span>
              <span className="font-body text-[8px] sm:text-[9px] tracking-wider text-muted-foreground block">
                Affiliated To Bangalore University | BU 26
              </span>
            </div>
          </button>
        ) : (
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shrink-0">
              <img src={collegeLogo} alt="Hoysala Degree College Logo" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-400" />
            </div>
            <div className="leading-tight">
              <span className="font-display text-sm sm:text-[17px] font-bold block group-hover:text-primary transition-colors duration-300 text-foreground">
                Hoysala Degree College
              </span>
              <span className="font-body text-[8px] sm:text-[9px] tracking-wider text-muted-foreground block">
                Affiliated To Bangalore University | BU 26
              </span>
            </div>
          </Link>
        )}

        {/* Desktop links */}
        <div ref={navRef} className="hidden xl:flex items-center gap-0 relative">
          <div
            className="absolute bottom-1 h-0.5 bg-gradient-to-r from-secondary/60 via-secondary to-secondary/60 rounded-full transition-all duration-400 ease-out"
            style={{ left: indicatorStyle.left, width: indicatorStyle.width, opacity: indicatorStyle.opacity }}
          />
          {navLinks.map((link) => {
            const active = isDropdownActive(link);
            
            if (link.hasDropdown && link.dropdownKey) {
              const items = dropdownMap[link.dropdownKey] || [];
              return (
                <div
                  key={link.path}
                  className="relative"
                  onMouseEnter={() => handleDropdownEnter(link.dropdownKey!)}
                  onMouseLeave={handleDropdownLeave}
                >
                  <button
                    data-active={active}
                    className={`relative px-2.5 py-2 text-[11.5px] font-medium font-body rounded-lg transition-all duration-300 group/link flex items-center gap-1 ${
                      active ? "text-primary font-semibold" : "text-foreground/65 hover:text-primary"
                    }`}
                  >
                    <span className="absolute inset-0 rounded-lg bg-primary/0 group-hover/link:bg-primary/5 transition-colors duration-300" />
                    <span className="relative">{link.label}</span>
                    <ChevronDown className={`relative w-3 h-3 transition-transform duration-300 ${openDropdown === link.dropdownKey ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown */}
                  <div className={`absolute top-full left-1/2 -translate-x-1/2 pt-2 transition-all duration-300 ${openDropdown === link.dropdownKey ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"}`}>
                    <div className="w-64 rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                      <div className="p-2">
                        {items.map((item) => {
                          const Icon = item.icon;
                          const isActive = location.pathname === item.path;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group/item ${
                                isActive
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground/70 hover:bg-primary/5 hover:text-foreground"
                              }`}
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                                isActive ? "bg-primary/20" : "bg-muted/50 group-hover/item:bg-primary/10"
                              }`}>
                                <Icon className="w-4 h-4" strokeWidth={1.5} />
                              </div>
                              <div>
                                <p className="text-[12px] font-semibold">{item.label}</p>
                                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={link.path}
                to={link.path}
                data-active={active}
                className={`relative px-2.5 py-2 text-[11.5px] font-medium font-body rounded-lg transition-all duration-300 group/link ${
                  active ? "text-primary font-semibold" : "text-foreground/65 hover:text-primary"
                }`}
              >
                <span className="absolute inset-0 rounded-lg bg-primary/0 group-hover/link:bg-primary/5 transition-colors duration-300" />
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <DarkModeToggle />
          <Link to="/login" className="hidden xl:block">
            <button className="relative group overflow-hidden px-7 py-2.5 rounded-[14px] font-body text-[11px] font-semibold tracking-[0.08em] uppercase transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] hover:-translate-y-[1px] active:scale-[0.97]"
              style={{
                background: "linear-gradient(160deg, hsla(0,0%,100%,0.12) 0%, hsla(0,0%,100%,0.04) 100%)",
                backdropFilter: "blur(20px) saturate(1.8)",
                WebkitBackdropFilter: "blur(20px) saturate(1.8)",
                border: "1px solid hsla(0,0%,100%,0.12)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 hsla(0,0%,100%,0.08), 0 0 0 0.5px hsla(0,0%,0%,0.15)",
                color: "hsla(0,0%,100%,0.92)",
              }}>
              <span className="absolute inset-0 rounded-[14px] bg-gradient-to-r from-white/0 via-white/[0.07] to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[800ms] ease-out" />
              <span className="absolute top-0 left-[15%] right-[15%] h-[0.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <span className="absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ boxShadow: "inset 0 0 20px hsla(0,0%,100%,0.04), 0 4px 16px rgba(0,0,0,0.2)" }} />
              <span className="relative flex items-center gap-2">
                <Sparkles className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:rotate-12 transition-all duration-500 text-[hsl(var(--gold))]" />
                Sign In
              </span>
            </button>
          </Link>

          {/* Hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="xl:hidden relative w-11 h-11 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group/burger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 bg-primary/10 dark:bg-white/[0.06] border border-primary/20 dark:border-white/10 hover:bg-primary/15 dark:hover:bg-white/10 hover:border-primary/30 dark:hover:border-white/15 hover:shadow-[0_0_16px_hsl(var(--primary)/0.15)] dark:hover:shadow-[0_0_16px_hsl(var(--gold)/0.1)]"
            aria-label="Toggle menu"
            style={{
              ...(open ? {
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                borderColor: "hsl(var(--primary) / 0.4)",
                boxShadow: "0 0 20px hsl(var(--primary) / 0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
              } : {}),
            }}
          >
            <div className="relative w-[18px] h-[14px] mx-auto">
              <span className="absolute left-0 h-[2px] rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ width: 18, top: open ? 6 : 0, transform: open ? "rotate(45deg)" : "rotate(0)", background: open ? "white" : "hsl(var(--foreground))" }} />
              <span className="absolute left-0 top-[6px] h-[2px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ width: open ? 0 : 12, opacity: open ? 0 : 0.7, transform: open ? "translateX(8px)" : "translateX(0)", background: "hsl(var(--foreground))" }} />
              <span className="absolute left-0 h-[2px] rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ width: open ? 18 : 15, top: open ? 6 : 12, transform: open ? "rotate(-45deg)" : "rotate(0)", background: open ? "white" : "hsl(var(--foreground) / 0.6)" }} />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`xl:hidden overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? "max-h-[85vh] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="py-4 px-5 overflow-y-auto max-h-[80vh]"
          style={{ background: "linear-gradient(180deg, hsl(230,18%,8%), hsl(228,16%,11%))" }}>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/30 to-transparent mb-4" />

          <div className="flex flex-col gap-0.5">
            {navLinks.map((link, i) => {
              const active = isDropdownActive(link);

              if (link.hasDropdown && link.dropdownKey) {
                const items = dropdownMap[link.dropdownKey] || [];
                const isOpen = mobileOpenDropdown === link.dropdownKey;
                return (
                  <div key={link.path}>
                    <button
                      onClick={() => setMobileOpenDropdown(isOpen ? null : link.dropdownKey!)}
                      style={{ animationDelay: open ? `${i * 35}ms` : "0ms" }}
                      className={`w-full px-4 py-3 text-[14px] font-body rounded-xl transition-all duration-300 flex items-center justify-between touch-manipulation active:scale-[0.98] ${
                        open ? "animate-fade-in-up" : ""
                      } ${
                        active
                          ? "text-[hsl(var(--gold))] bg-white/[0.06] font-semibold border-l-2 border-[hsl(var(--gold))]"
                          : "text-white/60 hover:text-white/90 hover:bg-white/[0.04]"
                      }`}
                    >
                      <span>{link.label}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {/* Mobile sub-menu */}
                    <div className={`overflow-hidden transition-all duration-400 ease-out ${isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}`}>
                      <div className="pl-4 py-1 flex flex-col gap-0.5">
                        {items.map((item) => {
                          const Icon = item.icon;
                          const subActive = location.pathname === item.path;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 touch-manipulation active:scale-[0.98] ${
                                subActive
                                  ? "text-[hsl(var(--gold))] bg-white/[0.06] font-semibold"
                                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.03]"
                              }`}
                            >
                              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                              <div>
                                <p className="text-[13px]">{item.label}</p>
                                <p className="text-[10px] text-white/30">{item.desc}</p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{ animationDelay: open ? `${i * 35}ms` : "0ms" }}
                  className={`px-4 py-3 text-[14px] font-body rounded-xl transition-all duration-300 flex items-center justify-between group touch-manipulation active:scale-[0.98] ${
                    open ? "animate-fade-in-up" : ""
                  } ${
                    active
                      ? "text-[hsl(var(--gold))] bg-white/[0.06] font-semibold border-l-2 border-[hsl(var(--gold))]"
                      : "text-white/60 hover:text-white/90 hover:bg-white/[0.04] hover:translate-x-1"
                  }`}
                >
                  <span>{link.label}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--gold))] animate-pulse" />}
                </Link>
              );
            })}
          </div>

          <div className="h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />

          <div>
            <p className="font-body text-[10px] uppercase tracking-widest text-muted-foreground/40 px-4 mb-3">Quick Contact</p>
            <div className="flex gap-2.5 flex-wrap mb-5 px-1">
              {["7676272167", "7975344252"].map((num) => (
                <a key={num} href={`tel:${num}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-body text-sm text-foreground/70 hover:text-foreground active:scale-[0.97] transition-all duration-300 touch-manipulation"
                  style={{ background: "hsl(var(--muted) / 0.15)", border: "2px solid hsl(var(--border) / 0.25)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.4)"; e.currentTarget.style.background = "hsl(var(--primary) / 0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(var(--border) / 0.25)"; e.currentTarget.style.background = "hsl(var(--muted) / 0.15)"; }}
                >
                  <Phone className="w-3.5 h-3.5" /> {num}
                </a>
              ))}
            </div>
            <Link to="/login" className="block px-1">
              <button className="relative w-full group overflow-hidden px-6 py-4 rounded-2xl font-body text-sm font-semibold tracking-[0.1em] uppercase text-foreground active:scale-[0.97] transition-all duration-500 touch-manipulation"
                style={{ background: "hsl(var(--card))", border: "2px solid hsl(var(--primary) / 0.35)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                <span className="relative flex items-center justify-center gap-3">
                  <Sparkles className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform duration-500" />
                  <span className="text-foreground/90 group-hover:text-foreground transition-colors duration-300">Login to Portal</span>
                </span>
              </button>
            </Link>
          </div>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/15 to-transparent mt-4" />
        </div>
      </div>
    </header>
  );
}

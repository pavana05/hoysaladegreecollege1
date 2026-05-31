import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { createPortal } from "react-dom";
import SEOHead from "@/components/SEOHead";
import {
  GraduationCap,
  BookOpen,
  Users,
  Award,
  Calendar,
  ArrowRight,
  Star,
  Sparkles,
  Brain,
  ClipboardCheck,
  Library,
  MessageSquare,
  FlaskConical,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Quote,
  Zap,
  TrendingUp,
  Play,
  X,
  Camera,
  MapPin,
  Clock,
  Phone,
  BadgeCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import ScrollReveal from "@/components/ScrollReveal";
import InfoSlider from "@/components/InfoSlider";
import AchievementTicker from "@/components/AchievementTicker";
import WaveDivider from "@/components/WaveDivider";
import heroImage from "@/assets/hero-college.jpg";
import principalImage from "@/assets/principal.jpg";
import galleryCampus from "@/assets/gallery-campus.jpg";
import galleryLab from "@/assets/gallery-lab.jpg";
import galleryLibrary from "@/assets/gallery-library.jpg";
import galleryClassroom from "@/assets/gallery-classroom.jpg";
import galleryEvents from "@/assets/gallery-events.jpg";
import gallerySports from "@/assets/gallery-sports.jpg";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef, useCallback } from "react";
import TypingTagline from "@/components/TypingTagline";
import AccreditationStrip from "@/components/AccreditationStrip";
import QuickLinksStrip from "@/components/QuickLinksStrip";
import LiveCounterBanner from "@/components/LiveCounterBanner";

const HERO_VIDEO_URL = "https://videos.pexels.com/video-files/6394054/6394054-uhd_2560_1440_30fps.mp4";

const fallbackGalleryImages = [
  { src: galleryCampus, title: "Campus Building", category: "Campus" },
  { src: galleryLab, title: "Computer Lab", category: "Facilities" },
  { src: galleryLibrary, title: "Library", category: "Facilities" },
  { src: galleryClassroom, title: "Classroom", category: "Academics" },
  { src: galleryEvents, title: "Annual Day", category: "Events" },
  { src: gallerySports, title: "Sports Ground", category: "Sports" },
];

const courses = [
  {
    name: "BCA",
    full: "Bachelor of Computer Applications",
    icon: "🖥️",
    desc: "Master programming, databases, networking and emerging technologies.",
    duration: "3 Years",
    color: "from-slate-400/10 to-slate-500/[0.03]",
    accentHsl: "220 13% 70%",
    iconBg: "bg-slate-500/10",
    borderAccent: "group-hover:border-slate-400/25",
  },
  {
    name: "B.Com Regular",
    full: "Bachelor of Commerce",
    icon: "📊",
    desc: "Build expertise in accounting, finance, taxation and business law.",
    duration: "3 Years",
    color: "from-emerald-500/12 to-emerald-500/[0.03]",
    accentHsl: "152 55% 48%",
    iconBg: "bg-emerald-500/10",
    borderAccent: "group-hover:border-emerald-500/25",
  },
  {
    name: "B.Com Professional",
    full: "Commerce with CA/CS/CMA",
    icon: "📈",
    desc: "Professional coaching integrated with commerce degree.",
    duration: "3 Years",
    color: "from-secondary/15 to-amber-500/[0.03]",
    accentHsl: "42 87% 58%",
    iconBg: "bg-amber-500/10",
    borderAccent: "group-hover:border-secondary/30",
  },
  {
    name: "BBA",
    full: "Bachelor of Business Administration",
    icon: "💼",
    desc: "Develop leadership, management, and entrepreneurial skills.",
    duration: "3 Years",
    color: "from-violet-500/12 to-violet-500/[0.03]",
    accentHsl: "270 55% 65%",
    iconBg: "bg-violet-500/10",
    borderAccent: "group-hover:border-violet-500/25",
  },
  {
    name: "CA / CS",
    full: "Chartered Accountancy & Company Secretary",
    icon: "⚖️",
    desc: "Exclusive coaching for CA & CS Foundation aspirants.",
    duration: "Integrated",
    color: "from-rose-500/12 to-rose-500/[0.03]",
    accentHsl: "350 70% 62%",
    iconBg: "bg-rose-500/10",
    borderAccent: "group-hover:border-rose-500/25",
  },
];


const highlights = [
  { icon: Users, label: "Experienced Faculties", desc: "Industry-trained professors" },
  { icon: Star, label: "CA, CS & CMA Classes", desc: "Exclusive coaching sessions" },
  { icon: BookOpen, label: "Add-on Courses for BCA", desc: "AI, ML, Python & more" },
  { icon: Brain, label: "AI & ML Workshops", desc: "Hands-on practical training" },
  { icon: Sparkles, label: "Special Guest Lectures", desc: "Industry expert sessions" },
  { icon: ClipboardCheck, label: "Daily Attendance SMS", desc: "Real-time parent updates" },
  { icon: BarChart3, label: "Monthly Internals", desc: "Regular assessments" },
  { icon: FlaskConical, label: "Weekly CA/CS Tests", desc: "Consistent preparation" },
  { icon: Library, label: "Sophisticated Library", desc: "Vast resource collection" },
  { icon: Award, label: "NSS Unit", desc: "Social service opportunities" },
  { icon: MessageSquare, label: "Student Counseling", desc: "Personal guidance cell" },
  { icon: Calendar, label: "Placement Cell", desc: "Career & job support" },
];

const testimonials = [
  {
    name: "Anusha C.H",
    course: "B.Com 2022-25",
    text: "Hoysala Degree College gave me the best platform to prepare for CA. The faculty support is exceptional! Scored 98.14%.",
    rating: 5,
  },
  {
    name: "Rahul M.",
    course: "BBA 2023-26",
    text: "The practical exposure through internships and case studies prepared me for the real business world. Amazing college!",
    rating: 5,
  },
  {
    name: "Simran B.",
    course: "B.Com 2022-25",
    text: "The dedicated coaching for CS and CMA along with regular degree is a unique advantage. Scored 94.14%!",
    rating: 5,
  },
  {
    name: "Priya K.",
    course: "BCA 2023-26",
    text: "The AI and ML workshops along with Python programming gave me an edge in the tech industry. Best decision to join Hoysala!",
    rating: 5,
  },
  {
    name: "Kiran R.",
    course: "B.Com Professional",
    text: "CA coaching integrated with B.Com is a game changer. The faculty goes above and beyond to help students succeed.",
    rating: 5,
  },
  {
    name: "Meera S.",
    course: "BBA 2024-27",
    text: "The placement cell helped me land an internship in my 2nd year itself. The exposure here is unmatched!",
    rating: 4,
  },
];

function useAnimatedCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = Date.now();
          const step = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

const statColors = [
  {
    bg: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-400/20",
    text: "text-blue-400",
    glow: "group-hover:shadow-blue-500/20",
  },
  {
    bg: "from-emerald-500/20 to-green-500/10",
    border: "border-emerald-400/20",
    text: "text-emerald-400",
    glow: "group-hover:shadow-emerald-500/20",
  },
  {
    bg: "from-amber-500/20 to-yellow-500/10",
    border: "border-amber-400/20",
    text: "text-amber-400",
    glow: "group-hover:shadow-amber-500/20",
  },
  {
    bg: "from-purple-500/20 to-violet-500/10",
    border: "border-purple-400/20",
    text: "text-purple-400",
    glow: "group-hover:shadow-purple-500/20",
  },
];

function AnimatedStat({
  value,
  label,
  icon: Icon,
  suffix = "",
  index = 0,
}: {
  value: number;
  label: string;
  icon: any;
  suffix?: string;
  index?: number;
}) {
  const { count, ref } = useAnimatedCounter(value);
  const color = statColors[index % statColors.length];
  return (
    <div ref={ref} className="text-center text-white group cursor-default">
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${color.bg} border ${color.border} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-all duration-500 shadow-lg ${color.glow} group-hover:shadow-xl`}
      >
        <Icon
          className={`w-6 h-6 sm:w-7 sm:h-7 ${color.text} group-hover:rotate-12 transition-transform duration-500`}
        />
      </div>
      <div className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight group-hover:scale-105 transition-transform duration-300">
        {count}
        {suffix}
      </div>
      <div className="font-body text-[10px] sm:text-xs text-white/40 mt-2 tracking-widest uppercase group-hover:text-white/70 transition-all duration-300">
        {label}
      </div>
    </div>
  );
}

/* ── 3D Tilt Hook ── */
function useTilt() {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale3d(1.02, 1.02, 1.02)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)";
  }, []);

  return { ref, handleMouseMove, handleMouseLeave };
}

function TiltCourseCard({ c, i }: { c: typeof courses[0]; i: number }) {
  const { ref, handleMouseMove, handleMouseLeave } = useTilt();
  const indexLabel = String(i + 1).padStart(2, "0");

  return (
    <Link to="/courses" className="block h-full">
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`tilt-card relative h-full cursor-pointer group overflow-hidden rounded-[2rem] border border-border/40 bg-gradient-to-b from-card/90 to-background/40 backdrop-blur-xl active:scale-[0.98] touch-manipulation transition-[border-color,transform] duration-500 ${c.borderAccent}`}
        style={{
          boxShadow:
            "0 1px 0 hsl(0 0% 100% / 0.03) inset, 0 24px 48px -28px rgba(0,0,0,0.45)",
        }}
      >
        {/* Soft ambient glow (single, refined) */}
        <div
          className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[80px] pointer-events-none"
          style={{ background: `hsla(${c.accentHsl}, 0.18)` }}
        />

        {/* Gradient wash on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`}
        />

        {/* Top hairline accent */}
        <div
          className="absolute top-0 left-6 right-6 h-px opacity-50 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `linear-gradient(90deg, transparent, hsla(${c.accentHsl}, 0.55), transparent)`,
          }}
        />

        {/* Diagonal shimmer */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent translate-x-[-120%] group-hover:translate-x-[120%] pointer-events-none"
          style={{ transition: "transform 1.4s cubic-bezier(0.16,1,0.3,1)" }}
        />

        {/* Index numeral, editorial */}
        <span
          className="absolute top-5 right-6 font-display text-[11px] font-semibold tracking-[0.25em] opacity-40 group-hover:opacity-80 transition-opacity duration-500"
          style={{ color: `hsl(${c.accentHsl})` }}
        >
          {indexLabel}
        </span>

        <div
          className="relative z-10 p-6 sm:p-7 flex flex-col h-full"
          style={{ transform: "translateZ(30px)" }}
        >
          {/* Glass icon tile */}
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${c.iconBg} flex items-center justify-center mb-6 sm:mb-7 border border-white/[0.06] group-hover:border-white/[0.12] group-hover:scale-[1.06] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden`}
            style={{
              boxShadow: `0 8px 24px -10px hsla(${c.accentHsl}, 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.08)`,
            }}
          >
            {/* Inner top gloss */}
            <span className="absolute inset-x-2 top-0 h-1/2 rounded-b-full bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
            <span className="relative text-2xl sm:text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-500">
              {c.icon}
            </span>
          </div>

          {/* Eyebrow */}
          <p
            className="font-body text-[10px] font-semibold tracking-[0.22em] uppercase opacity-50 group-hover:opacity-80 transition-opacity duration-500 mb-2"
            style={{ color: `hsl(${c.accentHsl})` }}
          >
            Program · 0{i + 1}
          </p>

          {/* Title */}
          <h3 className="font-display text-xl sm:text-[1.4rem] font-bold tracking-tight text-foreground leading-[1.15]">
            {c.name}
          </h3>
          <p className="font-body text-[11px] text-muted-foreground/70 mt-1.5 font-medium tracking-wide">
            {c.full}
          </p>

          {/* Description */}
          <p className="font-body text-sm text-muted-foreground/85 mt-4 leading-relaxed line-clamp-2 flex-1">
            {c.desc}
          </p>

          {/* Gold hairline divider */}
          <div className="mt-6 pt-5 border-t border-border/40 group-hover:border-border/70 transition-colors duration-500 flex items-center justify-between">
            <span
              className="text-[10px] font-body font-semibold px-2.5 py-1 rounded-full border tracking-wider uppercase"
              style={{
                color: `hsl(${c.accentHsl})`,
                background: `hsla(${c.accentHsl}, 0.08)`,
                borderColor: `hsla(${c.accentHsl}, 0.2)`,
              }}
            >
              {c.duration}
            </span>
            <span
              className="text-[11px] font-body font-semibold flex items-center gap-1.5 opacity-60 group-hover:opacity-100 group-hover:gap-2.5 transition-all duration-500"
              style={{ color: `hsl(${c.accentHsl})` }}
            >
              Explore
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}


export default function Index() {
  const { user, role, loading } = useAuth();
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [galleryFilter, setGalleryFilter] = useState("All");
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: dbGalleryImages = [] } = useQuery({
    queryKey: ["homepage-gallery"],
    queryFn: async () => {
      const { data } = await supabase.from("gallery_images").select("*").eq("is_active", true).order("sort_order").order("created_at", { ascending: false }).limit(12);
      return data || [];
    },
  });

  const allGalleryImages = dbGalleryImages.length > 0
    ? dbGalleryImages.map((img: any) => ({ src: img.image_url, title: img.title, category: img.category }))
    : fallbackGalleryImages;

  const galleryCategories = ["All", ...Array.from(new Set(allGalleryImages.map((img) => img.category)))];
  const galleryImages = galleryFilter === "All" ? allGalleryImages : allGalleryImages.filter((img) => img.category === galleryFilter);

  const { data: liveStats } = useQuery({
    queryKey: ["homepage-stats"],
    queryFn: async () => {
      const [students, teachers, events] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      return { students: students.count || 0, faculty: teachers.count || 0, events: events.count || 0 };
    },
  });

  const { data: topStudents = [] } = useQuery({
    queryKey: ["homepage-top-students"],
    queryFn: async () => {
      const { data } = await supabase.from("top_students").select("*").eq("is_active", true).order("rank").limit(6);
      return data || [];
    },
  });

  const { data: recentNotices = [] } = useQuery({
    queryKey: ["homepage-notices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notices")
        .select("title, type, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
  });

  const stats = [
    { label: "Students Enrolled", value: liveStats?.students || 250, icon: Users, suffix: "+" },
    { label: "Expert Faculty", value: liveStats?.faculty || 25, icon: BookOpen, suffix: "+" },
    { label: "Years of Excellence", value: 15, icon: Award, suffix: "+" },
    { label: "Placement Rate", value: 90, icon: Star, suffix: "%" },
  ];

  const announcements =
    recentNotices.length > 0
      ? recentNotices.map((n: any) => ({
          date: new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          title: n.title,
          type: n.type,
        }))
      : [
          { date: "Feb 10, 2026", title: "Admission Open for 2026-27 Academic Year", type: "Admission" },
          { date: "Feb 5, 2026", title: "Annual Sports Day – March 15, 2026", type: "Event" },
        ];

  const totalSlides = Math.ceil(testimonials.length / 2);
  const currentTestimonials = testimonials.slice(testimonialIndex * 2, testimonialIndex * 2 + 2);

  return (
    <div className="page-enter">
      <SEOHead
        title="BCA, BCom, BBA in Nelamangala"
        description="Hoysala Degree College, Nelamangala — Bangalore University–affiliated, AICTE approved. BCA, BCom, BBA with CA/CS/CMA tracks. Admissions open."
        canonical="/"
        schemaJson={{
          "@context": "https://schema.org",
          "@type": "CollegeOrUniversity",
          name: "Hoysala Degree College",
          alternateName: ["Hoysala College Nelamangala", "HDC Nelamangala"],
          url: "https://hoysaladegreecollege.in",
          description:
            "Hoysala Degree College, Nelamangala - Affiliated to Bangalore University (BU 26), Approved by AICTE. Offering BCA, B.Com, BBA with integrated CA/CS/CMA coaching.",
          foundingDate: "2019",
          address: {
            "@type": "PostalAddress",
            streetAddress: "K.R.P. Arcade, UCO Bank Building, Paramanna Layout",
            addressLocality: "Nelamangala Town",
            addressRegion: "Karnataka",
            postalCode: "562123",
            addressCountry: "IN",
          },
          geo: { "@type": "GeoCoordinates", latitude: "13.0977", longitude: "77.3927" },
          telephone: ["+917676272167", "+917975344252", "+918618181383"],
          email: "principal.hoysaladegreecollege@gmail.com",
          parentOrganization: { "@type": "Organization", name: "Shri Shirdi Sai Educational Trust (R)" },
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Degree Programs",
            itemListElement: [
              { "@type": "Course", name: "BCA - Bachelor of Computer Applications" },
              { "@type": "Course", name: "B.Com - Bachelor of Commerce" },
              { "@type": "Course", name: "B.Com Professional (CA/CS/CMA)" },
              { "@type": "Course", name: "BBA - Bachelor of Business Administration" },
            ],
          },
        }}
      />

      {/* ═══════════════ HERO — Video Background ═══════════════ */}
      <section className="relative h-[100svh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Video background */}
        <video
          ref={videoRef}
          autoPlay
          muted={videoMuted}
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? "opacity-100" : "opacity-0"}`}
          style={{ animation: "hero-ken-burns 25s ease-in-out infinite" }}
        >
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </video>

        {/* Fallback image while video loads */}
        <img
          src={heroImage}
          alt="Hoysala Degree College Campus"
          width={1920}
          height={1080}
          decoding="async"
          fetchPriority="high"
          className={`absolute inset-0 w-full h-full object-cover scale-105 animate-hero-float transition-opacity duration-1000 ${videoLoaded ? "opacity-0" : "opacity-100"}`}
          style={{ animationDuration: "20s" }}
        />


        {/* Multi-layer overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, hsla(217,72%,8%,0.88), hsla(217,72%,15%,0.72), hsla(217,72%,22%,0.45))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent" />

        {/* Floating ambient orbs */}
        <div className="absolute top-16 left-[8%] w-40 sm:w-56 h-40 sm:h-56 rounded-full bg-secondary/8 blur-[60px] sm:blur-[80px] animate-float pointer-events-none" />
        <div className="absolute bottom-16 right-[8%] w-52 sm:w-72 h-52 sm:h-72 rounded-full bg-secondary/5 blur-[80px] sm:blur-[100px] animate-float animation-delay-400 pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] sm:w-[700px] h-[250px] sm:h-[400px] rounded-full bg-primary/20 blur-[100px] sm:blur-[120px] pointer-events-none" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Video mute/unmute button */}
        {videoLoaded && (
          <button
            onClick={() => {
              setVideoMuted(!videoMuted);
              if (videoRef.current) videoRef.current.muted = !videoMuted;
            }}
            className="absolute bottom-20 right-5 sm:bottom-8 sm:right-8 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all duration-300"
            aria-label={videoMuted ? "Unmute video" : "Mute video"}
          >
            {videoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}


        <div className="relative z-10 container text-center text-primary-foreground px-5 sm:px-4">
          {/* Animated badge */}
          <div
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full border border-primary-foreground/20 mb-6 sm:mb-6 hero-text-reveal backdrop-blur-md badge-float"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-secondary animate-sparkle" />
            <span className="font-body text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] uppercase text-secondary font-bold">
              Excellence Since 2019
            </span>
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-secondary animate-sparkle animation-delay-300" />
          </div>

          <h1 className="font-display text-[2.5rem] leading-[1.1] sm:text-5xl md:text-6xl lg:text-7xl font-bold sm:leading-[1.08] mb-5 hero-text-reveal" style={{ animationDelay: "0.15s" }}>
            Hoysala Degree
            <br className="hidden sm:block" />
            <span
              className="inline-block"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, hsl(42,87%,80%), hsl(42,87%,60%), hsl(38,92%,50%), hsl(42,87%,70%))",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "gradient-text 4s linear infinite",
              }}
            >
              {" "}
              College
            </span>
          </h1>

          <p className="font-body text-xs sm:text-sm max-w-2xl mx-auto opacity-70 mb-1.5 hero-text-reveal leading-relaxed px-2" style={{ animationDelay: "0.3s" }}>
            Affiliated To Bangalore University & Approved by AICTE New Delhi
          </p>
          <p className="font-body text-[11px] sm:text-xs max-w-xl mx-auto opacity-40 mb-4 hero-text-reveal px-4" style={{ animationDelay: "0.4s" }}>
            College Code: BU 26 • Nelamangala Town, Bengaluru Rural - 562 123
          </p>

          {/* Typing tagline */}
          <div className="mb-10 hero-text-reveal h-7" style={{ animationDelay: "0.5s" }}>
            <TypingTagline />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center hero-text-reveal px-4 sm:px-2" style={{ animationDelay: "0.6s" }}>
            <Link to="/apply" className="w-full sm:w-[220px]">
              <button
                className="relative group w-full h-14 overflow-hidden rounded-2xl font-body text-sm font-bold text-foreground shadow-2xl btn-magnetic active:scale-[0.97] touch-manipulation"
                style={{
                  background: "linear-gradient(135deg, hsl(42,87%,58%), hsl(38,92%,48%), hsl(42,87%,65%))",
                  boxShadow: "0 8px 40px hsla(42,87%,52%,0.5), 0 2px 0 rgba(255,255,255,0.2) inset",
                }}
              >
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Apply Now
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                </span>
              </button>
            </Link>
            <Link to="/courses" className="w-full sm:w-[220px]">
              <button
                className="relative group w-full h-14 overflow-hidden rounded-2xl font-body text-sm font-bold text-white btn-magnetic active:scale-[0.97] touch-manipulation"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  backdropFilter: "blur(16px)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.2) inset",
                }}
              >
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/12 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Explore Courses
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </button>
            </Link>
          </div>

        </div>
      </section>

      <InfoSlider />
      <AccreditationStrip />
      <QuickLinksStrip />
      <LiveCounterBanner />

      {/* ═══════════════ Achievement Ticker ═══════════════ */}
      <AchievementTicker />

      {/* Contact Info Strip */}
      <section className="py-6 sm:py-8 bg-card border-y border-border/30">
        <div className="container px-5 sm:px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: MapPin, label: "Visit Us", value: "Nelamangala Town, Bengaluru Rural - 562 123", color: "42 87% 55%" },
              { icon: Phone, label: "Call Us", value: "+91 76762 72167 / 79753 44252", color: "215 90% 55%" },
              { icon: Clock, label: "Working Hours", value: "Mon – Sat: 8:30 AM – 5:00 PM", color: "145 65% 42%" },
            ].map((item) => (
              <ScrollReveal key={item.label}>
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-all duration-500 border border-border/30"
                    style={{ background: `hsla(${item.color}, 0.08)` }}>
                    <item.icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: `hsl(${item.color})` }} />
                  </div>
                  <div>
                    <p className="font-body text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold">{item.label}</p>
                    <p className="font-body text-xs sm:text-sm text-foreground font-medium leading-snug">{item.value}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 sm:py-16 relative">
        <div className="container px-5 sm:px-4">
          <div className="relative rounded-3xl overflow-hidden py-12 sm:py-16 px-6 sm:px-10">
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(145deg, hsl(230,12%,7%), hsl(228,10%,4%), hsl(230,14%,8%))" }}
            />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="absolute -top-20 -left-20 w-[300px] h-[300px] bg-[hsl(var(--gold))]/[0.04] rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-[250px] h-[250px] bg-[hsl(var(--gold))]/[0.03] rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/15 to-transparent" />
            <div className="absolute inset-0 rounded-3xl border border-white/[0.06]" />

            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-8">
              {stats.map((s, i) => (
                <AnimatedStat key={i} value={s.value} label={s.label} icon={s.icon} suffix={s.suffix} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ Wave Divider ═══════════════ */}
      <WaveDivider />

      {/* Why Choose Us */}
      <section className="py-14 sm:py-20 bg-background relative overflow-hidden">
        <div className="container px-5 sm:px-4 relative">
          <ScrollReveal>
            <SectionHeading title="Why Choose Hoysala?" subtitle="A legacy of excellence in education since 2019" />
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              { icon: GraduationCap, title: "University Affiliated", desc: "Affiliated to Bangalore University (BU 26) with AICTE approval, ensuring nationally recognized degrees.", accentHsl: "42 87% 55%", delay: 0 },
              { icon: Brain, title: "Smart Learning", desc: "Digital-first campus with AI-powered student portal, real-time attendance tracking, and online resources.", accentHsl: "215 90% 55%", delay: 80 },
              { icon: Users, title: "Expert Faculty", desc: "Experienced professors with industry connections providing mentorship and career-focused teaching.", accentHsl: "145 65% 42%", delay: 160 },
              { icon: BarChart3, title: "100% Placement Support", desc: "Dedicated placement cell with mock interviews, resume building, and direct industry partnerships.", accentHsl: "280 60% 55%", delay: 240 },
              { icon: Library, title: "Rich Library", desc: "Extensive collection of books, journals, and digital resources accessible to all students.", accentHsl: "330 60% 55%", delay: 320 },
              { icon: FlaskConical, title: "Modern Labs", desc: "State-of-the-art computer labs and practical facilities for hands-on learning experience.", accentHsl: "0 70% 58%", delay: 400 },
            ].map((feature) => (
              <ScrollReveal key={feature.title} delay={feature.delay}>
                <div className="group relative rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-6 sm:p-7 hover:border-border/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 blur-[50px] pointer-events-none"
                    style={{ background: `hsla(${feature.accentHsl}, 0.12)` }} />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] rounded-2xl pointer-events-none"
                    style={{ transition: "transform 1s cubic-bezier(0.16,1,0.3,1)" }} />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-500 border border-white/[0.04]"
                      style={{ background: `hsla(${feature.accentHsl}, 0.1)` }}>
                      <feature.icon className="w-5 h-5 transition-all duration-500 group-hover:rotate-6"
                        style={{ color: `hsl(${feature.accentHsl})` }} />
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ Programs / Courses ═══════════════ */}
      <section className="py-16 sm:py-32 bg-background relative overflow-hidden">
        {/* Premium ambient backdrop */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsla(42,87%,55%,0.05), transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsla(var(--primary),0.05), transparent 70%)" }}
        />
        {/* Fine dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="container px-5 sm:px-4 relative">
          <ScrollReveal>
            <div className="flex flex-col items-center text-center mb-12 sm:mb-16">
              {/* Eyebrow with hairlines */}
              <div className="flex items-center gap-3 mb-5">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-secondary/60" />
                <span className="font-body text-[10px] sm:text-[11px] font-semibold tracking-[0.32em] uppercase text-secondary">
                  Academic Programs
                </span>
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-secondary/60" />
              </div>
              <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.05]">
                Courses crafted for{" "}
                <span className="italic text-secondary font-display">tomorrow</span>
              </h2>
              <p className="font-body mt-5 max-w-2xl text-sm sm:text-base text-muted-foreground/80 leading-relaxed">
                Five undergraduate tracks built around modern industry needs — taught by
                experienced faculty, integrated with professional coaching.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 sm:gap-6">
            {courses.map((c, i) => (
              <ScrollReveal key={c.name} delay={i * 80}>
                <TiltCourseCard c={c} i={i} />
              </ScrollReveal>
            ))}
          </div>

          {/* Subtle CTA below grid */}
          <ScrollReveal delay={400}>
            <div className="mt-12 sm:mt-14 flex justify-center">
              <Link
                to="/courses"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border/50 bg-card/60 backdrop-blur-md hover:border-secondary/40 hover:bg-card transition-all duration-500 font-body text-sm font-semibold text-foreground"
              >
                View full curriculum
                <ChevronRight className="w-4 h-4 text-secondary group-hover:translate-x-1 transition-transform duration-500" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>


      <WaveDivider className="text-cream dark:text-muted" />

      {/* Key Highlights */}
      <section className="py-16 sm:py-32 bg-cream relative overflow-hidden">
        <div className="absolute inset-0 section-pattern opacity-30" />
        <div
          className="absolute top-0 left-[10%] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsla(42,87%,55%,0.06), transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 right-[5%] w-[420px] h-[420px] rounded-full blur-[100px] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsla(var(--primary),0.05), transparent 70%)" }}
        />
        <div className="container px-5 sm:px-4 relative">
          <ScrollReveal>
            <div className="flex flex-col items-center mb-10 sm:mb-14">
              <span
                className="font-body text-[10px] sm:text-xs font-semibold tracking-[0.28em] uppercase text-secondary mb-4 px-3.5 py-1.5 rounded-full border border-secondary/25"
                style={{ background: "linear-gradient(135deg, hsla(42,87%,55%,0.1), hsla(42,87%,55%,0.02))" }}
              >
                ✦ The Hoysala Edge ✦
              </span>
              <SectionHeading title="Why Hoysala?" subtitle="Key highlights that set us apart from the rest" />
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {highlights.map((h, i) => (
              <ScrollReveal key={h.label} delay={i * 40}>
                <div
                  className="relative p-5 sm:p-7 cursor-default group overflow-hidden h-full border border-border/40 rounded-2xl bg-card active:scale-[0.97] touch-manipulation hover:-translate-y-1.5 hover:border-secondary/40"
                  style={{
                    transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    backgroundImage:
                      "linear-gradient(180deg, hsla(0,0%,100%,0.55), transparent 45%), linear-gradient(135deg, hsla(var(--primary),0.015), hsla(42,87%,55%,0.02))",
                  }}
                >
                  {/* Corner glow accent */}
                  <div
                    className="absolute top-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(circle at top right, hsla(42,87%,55%,0.22), transparent 70%)",
                    }}
                  />
                  {/* Top hairline */}
                  <div
                    className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-all duration-500"
                    style={{ background: "linear-gradient(90deg, transparent, hsl(42 87% 55% / 0.55), transparent)" }}
                  />
                  {/* Sheen sweep */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] rounded-2xl pointer-events-none"
                    style={{ transition: "transform 1s ease" }}
                  />
                  {/* Inner ring + lift shadow on hover */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ boxShadow: "inset 0 0 0 1px hsla(42,87%,55%,0.18), 0 18px 44px -14px rgba(0,0,0,0.15)" }}
                  />
                  <div className="relative flex flex-col items-center text-center gap-3 sm:gap-4 z-10">
                    <div
                      className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-3 border border-border/40 group-hover:border-secondary/40"
                      style={{
                        background:
                          "linear-gradient(135deg, hsla(var(--primary),0.1), hsla(42,87%,55%,0.14))",
                        boxShadow:
                          "inset 0 1px 0 hsla(0,0%,100%,0.55), 0 6px 14px -5px hsla(var(--primary),0.18)",
                      }}
                    >
                      <h.icon
                        className="w-5 h-5 sm:w-7 sm:h-7 text-primary group-hover:text-secondary transition-colors duration-400"
                        strokeWidth={1.6}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="font-body text-[13px] sm:text-sm font-bold text-foreground block group-hover:text-primary transition-colors duration-400 leading-snug tracking-tight">
                        {h.label}
                      </span>
                      <span className="font-body text-[11px] sm:text-xs text-muted-foreground block leading-relaxed">
                        {h.desc}
                      </span>
                    </div>
                    {/* Animated underline */}
                    <div
                      className="h-px w-6 opacity-40 group-hover:opacity-100 group-hover:w-12 transition-all duration-500"
                      style={{ background: "linear-gradient(90deg, transparent, hsl(42 87% 55%), transparent)" }}
                    />
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider flip className="text-cream dark:text-muted" />

      {/* ═══════════════ Campus Gallery with Filter Tabs ═══════════════ */}
      <section className="py-14 sm:py-28 bg-background relative overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/4 rounded-full blur-3xl pointer-events-none" />
        <div className="container px-5 sm:px-4 relative">
          <ScrollReveal>
            <SectionHeading title="Campus Gallery" subtitle="Take a virtual tour of our world-class facilities" />
          </ScrollReveal>

          {/* Gallery Category Filter Tabs */}
          <ScrollReveal delay={100}>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {galleryCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setGalleryFilter(cat)}
                  className={`font-body text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-400 touch-manipulation active:scale-95 ${
                    galleryFilter === cat
                      ? "bg-primary text-primary-foreground border-primary shadow-lg"
                      : "bg-card text-muted-foreground border-border/40 hover:border-primary/30 hover:text-foreground"
                  }`}
                  style={
                    galleryFilter === cat
                      ? { boxShadow: "0 4px 16px hsla(var(--primary), 0.3)" }
                      : {}
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-5">
            {galleryImages.slice(0, 6).map((img, i) => (
              <ScrollReveal key={`${galleryFilter}-${img.title}`} delay={i * 60}>
                <div
                  className="relative group cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl border border-border/40 aspect-[4/3] active:scale-[0.97] transition-all duration-500 touch-manipulation"
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                  onClick={() => {
                    setLightboxIdx(i);
                    document.body.style.overflow = "hidden";
                    document.documentElement.style.overflow = "hidden";
                  }}
                >
                  <img
                    src={img.src}
                    alt={img.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                    <span className="inline-block text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-secondary/90 text-primary-foreground font-body font-bold mb-0.5 sm:mb-1">
                      {img.category}
                    </span>
                    <p className="font-display text-xs sm:text-base font-bold text-white">{img.title}</p>
                  </div>
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 border border-white/10">
                    <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <div className="text-center mt-6 sm:mt-8">
            <Link
              to="/gallery"
              className="inline-flex items-center gap-2 font-body text-sm font-semibold text-primary hover:underline active:opacity-70 touch-manipulation"
            >
              View Full Gallery <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Full-screen Lightbox */}
      {lightboxIdx !== null &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md animate-fade-in flex items-center justify-center"
            onClick={() => {
              setLightboxIdx(null);
              document.body.style.removeProperty("overflow");
              document.documentElement.style.removeProperty("overflow");
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Image lightbox"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setLightboxIdx(null);
                document.body.style.removeProperty("overflow");
                document.documentElement.style.removeProperty("overflow");
              }
              if (e.key === "ArrowRight") setLightboxIdx((lightboxIdx + 1) % galleryImages.length);
              if (e.key === "ArrowLeft")
                setLightboxIdx((lightboxIdx - 1 + galleryImages.length) % galleryImages.length);
            }}
            tabIndex={0}
            ref={(el) => el?.focus()}
          >
            <div
              className="relative w-[90vw] max-w-3xl"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                (e.currentTarget as any)._touchX = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                const startX = (e.currentTarget as any)._touchX;
                if (startX == null) return;
                const diff = e.changedTouches[0].clientX - startX;
                if (Math.abs(diff) > 50) {
                  diff > 0
                    ? setLightboxIdx((lightboxIdx - 1 + galleryImages.length) % galleryImages.length)
                    : setLightboxIdx((lightboxIdx + 1) % galleryImages.length);
                }
              }}
            >
              <button
                className="absolute -top-2 -right-2 sm:top-0 sm:right-0 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 z-20 shadow-lg border border-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx(null);
                  document.body.style.removeProperty("overflow");
                  document.documentElement.style.removeProperty("overflow");
                }}
                aria-label="Close lightbox"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                className="absolute left-0 sm:-left-14 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 z-10 shadow-lg border border-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightboxIdx - 1 + galleryImages.length) % galleryImages.length);
                }}
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                className="absolute right-0 sm:-right-14 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 z-10 shadow-lg border border-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightboxIdx + 1) % galleryImages.length);
                }}
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <img
                src={galleryImages[lightboxIdx].src}
                alt={galleryImages[lightboxIdx].title}
                className="w-full max-h-[65dvh] sm:max-h-[75vh] object-contain rounded-2xl shadow-2xl animate-scale-bounce"
                key={lightboxIdx}
              />
              <div className="mt-4 text-center bg-black/40 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/10">
                <p className="font-display text-base sm:text-lg font-bold text-white">
                  {galleryImages[lightboxIdx].title}
                </p>
                <p className="font-body text-xs text-white/60 mt-1">
                  {galleryImages[lightboxIdx].category} • {lightboxIdx + 1} / {galleryImages.length}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Principal's Message */}
      <section className="py-14 sm:py-24 bg-background">
        <div className="container px-5 sm:px-4">
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center max-w-5xl mx-auto">
            <ScrollReveal>
              <div className="relative group">
                <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-br from-secondary/15 to-primary/5 rounded-3xl blur-3xl opacity-70 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="absolute -top-2 -left-2 sm:-top-3 sm:-left-3 w-14 h-14 sm:w-20 sm:h-20 border-t-2 border-l-2 border-secondary/40 rounded-tl-2xl sm:rounded-tl-3xl z-20 group-hover:border-secondary/70 transition-colors duration-500" />
                <div className="absolute -bottom-2 -right-2 sm:-bottom-3 sm:-right-3 w-14 h-14 sm:w-20 sm:h-20 border-b-2 border-r-2 border-secondary/40 rounded-br-2xl sm:rounded-br-3xl z-20 group-hover:border-secondary/70 transition-colors duration-500" />
                <div className="relative overflow-hidden rounded-2xl z-10">
                  <img
                    alt="Principal"
                    className="w-full max-w-xs sm:max-w-sm mx-auto shadow-2xl group-hover:scale-[1.03] transition-transform duration-700"
                    src={principalImage}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                    <p className="font-display text-sm sm:text-base font-bold text-white drop-shadow-lg">
                      Sri Gopal H.R
                    </p>
                    <p className="font-body text-[11px] sm:text-xs text-white/80">Principal · M.Sc, M.Ed, Ph.D</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 mb-4">
                  <Star className="w-3.5 h-3.5 text-secondary" />
                  <span className="font-body text-xs font-semibold text-secondary">From the Principal's Desk</span>
                </div>
                <SectionHeading title="Principal's Message" centered={false} />
                <div className="mt-4 sm:mt-6 relative">
                  <div className="absolute -left-3 sm:-left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-secondary via-primary/40 to-transparent rounded-full" />
                  <div className="pl-4 sm:pl-6">
                    <Quote className="w-6 h-6 sm:w-8 sm:h-8 text-secondary/30 mb-2 sm:mb-3" />
                    <p className="font-body text-muted-foreground leading-relaxed text-[13px] sm:text-base italic">
                      It gives me immense pleasure to welcome you to HOYSALA DEGREE COLLEGE. Our college combines modern
                      teaching methodologies with traditional values, creating an environment where students develop
                      both professionally and personally.
                    </p>
                    <div className="mt-4 sm:mt-5 flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-secondary/15 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
                      </div>
                      <div>
                        <p className="font-display text-sm font-bold text-foreground">Sri Gopal H.R</p>
                        <p className="font-body text-[11px] sm:text-xs text-muted-foreground">
                          M.Sc, M.Ed, TET, KSET, Ph.D | Principal
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <WaveDivider className="text-cream dark:text-muted" />

      {/* Notices / Announcements */}
      <section className="py-12 sm:py-16 bg-cream relative overflow-hidden">
        <div className="absolute inset-0 section-pattern opacity-40" />
        <div className="container px-5 sm:px-4 relative">
          <ScrollReveal>
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-primary flex items-center justify-center shadow-md">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary" />
                </div>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">Latest Announcements</h2>
                  <p className="font-body text-[11px] sm:text-xs text-muted-foreground">
                    Stay updated with the latest news
                  </p>
                </div>
              </div>
              <Link
                to="/notices"
                className="font-body text-xs font-semibold text-primary hover:underline flex items-center gap-1 active:opacity-70 touch-manipulation"
              >
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </ScrollReveal>
          <div className="space-y-2 sm:space-y-2.5 max-w-2xl">
            {announcements.map((a, i) => (
              <ScrollReveal key={i} delay={i * 80}>
                <Link to="/notices">
                  <div className="group flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 bg-card rounded-xl sm:rounded-2xl border border-border hover:border-primary/25 hover:shadow-md active:scale-[0.98] transition-all duration-300 relative overflow-hidden touch-manipulation">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-secondary to-primary/50 rounded-r-full" />
                    <div className="text-center shrink-0 ml-1.5 sm:ml-2">
                      <p className="font-body text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">
                        {a.date.split(" ")[0]}
                      </p>
                      <p className="font-display text-base sm:text-lg font-bold text-primary leading-none">
                        {a.date.split(" ")[1]?.replace(",", "")}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="inline-block font-body text-[9px] sm:text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full mb-0.5 sm:mb-1">
                        {a.type}
                      </span>
                      <p className="font-body text-[13px] sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-200 leading-snug">
                        {a.title}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform duration-200 mt-0.5" />
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider flip className="text-cream dark:text-muted" />

      {/* ═══════════════ Testimonials with Verified Badges ═══════════════ */}
      <section className="py-14 sm:py-28 bg-background relative overflow-hidden">
        <div
          className="absolute top-0 left-[5%] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsla(42,87%,55%,0.03), transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 right-[8%] w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsla(var(--primary),0.03), transparent 70%)" }}
        />

        <div className="container px-5 sm:px-4 relative">
          <ScrollReveal>
            <SectionHeading title="What Our Students Say" subtitle="Real stories from the Hoysala family" />
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {currentTestimonials.map((t, i) => (
              <div
                key={t.name}
                className="relative p-5 sm:p-8 group animate-fade-in-up overflow-hidden rounded-2xl border border-border/40 bg-card"
                style={{
                  animationDelay: `${i * 150}ms`,
                  transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                {/* Top gold accent */}
                <div
                  className="absolute top-0 left-6 right-6 h-[0.5px] opacity-0 group-hover:opacity-100 transition-all duration-500"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(42 87% 55% / 0.35), transparent)" }}
                />
                {/* Shimmer sweep */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] rounded-2xl pointer-events-none"
                  style={{ transition: "transform 1s ease" }}
                />
                {/* Hover border glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ boxShadow: "inset 0 0 0 1px hsla(42,87%,55%,0.1), 0 12px 40px rgba(0,0,0,0.06)" }}
                />
                {/* Quote icon */}
                <div className="absolute top-4 right-4 sm:top-5 sm:right-5 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-600">
                  <Quote className="w-10 h-10 sm:w-14 sm:h-14" style={{ color: "hsl(42,87%,55%)" }} />
                </div>

                <div className="relative z-10">
                  {/* Stars */}
                  <div className="flex gap-1 mb-3 sm:mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star
                        key={j}
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary fill-secondary transition-transform duration-300"
                        style={{ transitionDelay: `${j * 50}ms` }}
                      />
                    ))}
                  </div>
                  <p className="font-body text-[13px] sm:text-sm text-muted-foreground leading-[1.8] italic mb-4 sm:mb-5">
                    "{t.text}"
                  </p>
                  <div className="flex items-center gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-border/30">
                    <div
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border border-border/40 group-hover:border-secondary/30 transition-all duration-500 group-hover:scale-105"
                      style={{
                        background: "linear-gradient(135deg, hsla(var(--primary),0.12), hsla(42,87%,55%,0.12))",
                      }}
                    >
                      <span className="font-display text-xs sm:text-sm font-bold text-primary group-hover:text-secondary transition-colors duration-400">
                        {t.name[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-body text-[13px] sm:text-sm font-bold text-foreground">{t.name}</p>
                        {/* Verified Badge */}
                        <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      </div>
                      <p className="font-body text-[11px] sm:text-xs text-muted-foreground tracking-wide flex items-center gap-1">
                        {t.course}
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-500 font-semibold">
                          • Verified Student
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial dots */}
          <div className="flex justify-center gap-2.5 mt-6 sm:mt-8">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                onClick={() => setTestimonialIndex(i)}
                className={`rounded-full transition-all duration-500 touch-manipulation ${i === testimonialIndex ? "w-7 sm:w-8 h-2.5" : "w-2.5 h-2.5 hover:scale-125"}`}
                style={
                  i === testimonialIndex
                    ? {
                        background: "linear-gradient(90deg, hsl(42 87% 55%), hsl(42 70% 45%))",
                        boxShadow: "0 0 8px hsla(42,87%,55%,0.3)",
                      }
                    : { background: "hsl(var(--muted))" }
                }
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-14 sm:py-20 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, hsl(230,12%,6%), hsl(228,10%,3%), hsl(230,12%,6%))" }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] sm:w-[700px] h-[200px] sm:h-[300px] bg-[hsl(var(--gold))]/[0.06] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/10 to-transparent" />

        <div className="relative container px-5 sm:px-4 text-center text-primary-foreground">
          <ScrollReveal>
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-secondary mx-auto mb-3 sm:mb-4 animate-float" />
            <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              Begin Your Journey at Hoysala
            </h2>
            <p className="font-body text-[13px] sm:text-base opacity-70 max-w-xl mx-auto mb-7 sm:mb-8 leading-relaxed px-2">
              Join 250+ students building their future. Admissions open for 2026–27 academic year.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link to="/apply" className="w-full sm:w-auto">
                <button
                  className="relative group overflow-hidden w-full sm:w-auto px-8 sm:px-10 py-4 rounded-2xl font-body font-bold text-foreground shadow-2xl btn-magnetic active:scale-[0.97] touch-manipulation"
                  style={{
                    background: "linear-gradient(135deg, hsl(42,87%,58%), hsl(38,92%,48%))",
                    boxShadow: "0 8px 32px hsla(42,87%,52%,0.4)",
                  }}
                >
                  <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center justify-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Apply Now
                  </span>
                </button>
              </Link>
              <Link to="/contact" className="w-full sm:w-auto">
                <button
                  className="relative group overflow-hidden w-full sm:w-auto px-8 sm:px-10 py-4 rounded-2xl font-body font-bold text-white btn-magnetic active:scale-[0.97] touch-manipulation"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1.5px solid rgba(255,255,255,0.3)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Contact Us
                  </span>
                </button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import SEOHead from "@/components/SEOHead";
import SectionHeading from "@/components/SectionHeading";
import ScrollReveal from "@/components/ScrollReveal";
import PageHeader from "@/components/PageHeader";
import {
  Target,
  Eye,
  BookOpen,
  Users,
  Award,
  Heart,
  MapPin,
  Phone,
  Mail,
  Clock,
  GraduationCap,
  Shield,
  Globe,
  Briefcase,
  Wifi,
  Coffee,
  TrendingUp,
  Star,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Quote,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Zap,
  Building2,
  Camera,
  X,
  Expand,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import principalImage from "@/assets/principal.jpg";
import galleryCampus from "@/assets/gallery-campus.jpg";
import galleryLab from "@/assets/gallery-lab.jpg";
import galleryLibrary from "@/assets/gallery-library.jpg";
import galleryClassroom from "@/assets/gallery-classroom.jpg";
import galleryEvents from "@/assets/gallery-events.jpg";
import gallerySports from "@/assets/gallery-sports.jpg";

const fallbackGallery = [
  { id: "g1", title: "Campus Building", image_url: galleryCampus },
  { id: "g2", title: "Computer Lab", image_url: galleryLab },
  { id: "g3", title: "Library", image_url: galleryLibrary },
  { id: "g4", title: "Classroom", image_url: galleryClassroom },
  { id: "g5", title: "Annual Day", image_url: galleryEvents },
  { id: "g6", title: "Sports Ground", image_url: gallerySports },
];

const tocSections = [
  { id: "about-intro", label: "About", icon: BookOpen },
  { id: "quick-facts", label: "Quick Facts", icon: Star },
  { id: "timeline", label: "Our Journey", icon: Calendar },
  { id: "principals-message", label: "Principal's Message", icon: GraduationCap },
  { id: "vision-mission", label: "Vision & Mission", icon: Eye },
  { id: "achievements", label: "Achievements", icon: Award },
  { id: "core-values", label: "Core Values", icon: Heart },
  { id: "facilities", label: "Facilities", icon: Shield },
  { id: "campus-gallery", label: "Campus Gallery", icon: Camera },
  { id: "testimonials", label: "Testimonials", icon: Quote },
  { id: "contact", label: "Reach Us", icon: MapPin },
];

const values = [
  {
    icon: BookOpen,
    title: "Academic Excellence",
    desc: "Rigorous curriculum designed to meet industry standards and foster innovation.",
    accentHsl: "220, 80%, 55%",
  },
  {
    icon: Users,
    title: "Holistic Development",
    desc: "Focus on sports, cultural activities, and life skills alongside academics.",
    accentHsl: "155, 65%, 45%",
  },
  {
    icon: Award,
    title: "Qualified Faculty",
    desc: "Experienced educators dedicated to student success and mentorship.",
    accentHsl: "42, 75%, 55%",
  },
  {
    icon: Heart,
    title: "Inclusive Environment",
    desc: "A welcoming campus that celebrates diversity and equal opportunity.",
    accentHsl: "350, 70%, 55%",
  },
];

const facilities = [
  { icon: GraduationCap, title: "Smart Classrooms", desc: "Modern classrooms equipped with digital projectors and audio systems." },
  { icon: BookOpen, title: "Well-Stocked Library", desc: "Thousands of books, journals, and digital resources for research." },
  { icon: Globe, title: "Computer Lab", desc: "State-of-the-art lab with latest software and high-speed internet." },
  { icon: Shield, title: "Safe Campus", desc: "CCTV surveillance and dedicated security for a safe learning environment." },
  { icon: Clock, title: "Flexible Timings", desc: "Morning & afternoon sessions to accommodate all students." },
  { icon: Users, title: "Student Clubs", desc: "NSS, Eco Club, Tech Club, Language Club, and many more." },
  { icon: Wifi, title: "Wi-Fi Campus", desc: "High-speed internet across the campus for research and learning." },
  { icon: Coffee, title: "Canteen", desc: "Hygienic and affordable food options available on campus." },
  { icon: Briefcase, title: "Placement Cell", desc: "Dedicated cell ensuring 90% placement rate with top companies." },
];

const quickFacts = [
  { label: "Established", value: "2019", numericValue: 2019, suffix: "", icon: Building2 },
  { label: "Affiliated To", value: "Bangalore University", numericValue: null, suffix: "", icon: GraduationCap },
  { label: "College Code", value: "BU 26", numericValue: null, suffix: "", icon: Shield },
  { label: "Approved By", value: "AICTE", numericValue: null, suffix: "", icon: Award },
  { label: "Programs", value: "3+", numericValue: 3, suffix: "+", icon: BookOpen },
  { label: "Placement Rate", value: "90%", numericValue: 90, suffix: "%", icon: TrendingUp },
];

const achievements = [
  { icon: TrendingUp, title: "90% Placement Record", desc: "Our students are placed in top companies across India.", accentHsl: "155, 65%, 45%" },
  { icon: Star, title: "University Rank Holders", desc: "Multiple students securing university ranks every year.", accentHsl: "42, 75%, 55%" },
  { icon: Award, title: "Best College Award", desc: "Recognized for academic excellence in Bengaluru Rural.", accentHsl: "220, 80%, 55%" },
  { icon: GraduationCap, title: "CA/CS Toppers", desc: "Students clearing CA/CS exams in their first attempt.", accentHsl: "280, 60%, 55%" },
];

const timeline = [
  { year: "2019", title: "Foundation", desc: "Hoysala Degree College established under Shri Shirdi Sai Educational Trust(R)." },
  { year: "2020", title: "First Batch", desc: "Welcomed our inaugural batch of BCA and B.Com students." },
  { year: "2021", title: "BBA Launch", desc: "Expanded offerings with Bachelor of Business Administration program." },
  { year: "2022", title: "Placement Cell", desc: "Established a dedicated placement cell with industry partnerships." },
  { year: "2023", title: "Digital Campus", desc: "Upgraded to smart classrooms and full Wi-Fi campus infrastructure." },
  { year: "2024", title: "90% Placements", desc: "Achieved a landmark 90% placement rate for graduating students." },
];

const testimonials = [
  { name: "Rahul M.", course: "BCA 2023", text: "Hoysala Degree College transformed my career. The faculty's dedication and placement support helped me land my dream job in IT.", rating: 5 },
  { name: "Priya S.", course: "B.Com 2024", text: "The perfect blend of academics and extracurricular activities. The campus environment is truly world-class for a degree college.", rating: 5 },
  { name: "Karthik R.", course: "BBA 2024", text: "Outstanding faculty who go above and beyond. The practical approach to teaching prepared me exceptionally well for the corporate world.", rating: 5 },
];

// Animated counter hook
function useCountUp(target: number | null, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(!startOnView);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!started || target === null) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return { count, ref };
}

function useActiveSection(sectionIds: string[]) {
  const [active, setActive] = useState(sectionIds[0]);
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visibleSections = new Map<string, number>();
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) visibleSections.set(id, entry.intersectionRatio);
          else visibleSections.delete(id);
          let best = sectionIds[0]; let bestRatio = 0;
          visibleSections.forEach((ratio, sid) => { if (ratio > bestRatio) { best = sid; bestRatio = ratio; } });
          if (visibleSections.size > 0) setActive(best);
        },
        { threshold: [0, 0.2, 0.4, 0.6], rootMargin: "-80px 0px -40% 0px" },
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [sectionIds]);
  return active;
}

// Premium counter card
function CounterCard({ fact, index }: { fact: typeof quickFacts[0]; index: number }) {
  const { count, ref } = useCountUp(fact.numericValue, 1800);
  const Icon = fact.icon;
  return (
    <ScrollReveal delay={index * 100}>
      <div ref={ref} className="relative bg-card rounded-3xl p-5 sm:p-6 text-center group overflow-hidden border border-border/40 hover:border-secondary/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_-15px_hsla(var(--secondary),0.15)]">
        {/* Ambient orb */}
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl" style={{ background: `hsla(var(--secondary), 0.12)` }} />
        {/* Top accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-0 group-hover:w-3/4 bg-gradient-to-r from-transparent via-secondary to-transparent transition-all duration-600" />
        {/* Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
        <div className="relative z-10">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-secondary/15 to-secondary/5 border border-secondary/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
            <Icon className="w-4.5 h-4.5 text-secondary" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
            {fact.numericValue !== null ? `${count}${fact.suffix}` : fact.value}
          </p>
          <p className="font-body text-[10px] sm:text-xs text-muted-foreground mt-1.5 uppercase tracking-[0.15em] font-semibold">{fact.label}</p>
        </div>
      </div>
    </ScrollReveal>
  );
}

export default function About() {
  const activeSection = useActiveSection(tocSections.map((s) => s.id));
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Fetch gallery images from DB
  const { data: dbGallery = [] } = useQuery({
    queryKey: ["about-gallery"],
    queryFn: async () => {
      const { data } = await supabase.from("gallery_images").select("*").eq("is_active", true).order("sort_order").limit(6);
      return data || [];
    },
  });
  const galleryImages = dbGallery.length > 0 ? dbGallery : fallbackGallery;

  // Auto-rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => setActiveTestimonial((p) => (p + 1) % testimonials.length), 5000);
    return () => clearInterval(timer);
  }, []);

  // Lightbox body scroll lock
  useEffect(() => {
    if (lightboxIdx !== null) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [lightboxIdx]);

  // Lightbox keyboard nav
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight") setLightboxIdx((p) => (p! + 1) % galleryImages.length);
      if (e.key === "ArrowLeft") setLightboxIdx((p) => (p! - 1 + galleryImages.length) % galleryImages.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, galleryImages.length]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="page-enter">
      <SEOHead
        title="About Us"
        description="Discover Hoysala Degree College, Nelamangala – our history, vision, mission, principal's message and world-class campus facilities."
        canonical="/about"
      />
      <PageHeader title="About Us" subtitle="Discover the story of Hoysala Degree College" />

      <div className="relative lg:flex lg:gap-0">
        {/* Sticky TOC - desktop only */}
        <aside className="hidden lg:block shrink-0 w-56 xl:w-64">
          <nav className="sticky top-32 ml-4 xl:ml-8 bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl p-4 shadow-[0_8px_40px_-12px_hsla(var(--secondary),0.08)] z-30">
            <div className="flex items-center gap-2 px-3 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              <p className="font-display text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">On this page</p>
            </div>
            <ul className="space-y-0.5">
              {tocSections.map((s) => {
                const isActive = activeSection === s.id;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => scrollTo(s.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-300 group relative overflow-hidden ${
                        isActive
                          ? "bg-gradient-to-r from-primary/12 to-secondary/8 text-primary font-semibold shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-secondary rounded-full" />}
                      <s.icon className={`w-3.5 h-3.5 shrink-0 transition-all duration-300 ${isActive ? "text-secondary" : "text-muted-foreground/50 group-hover:text-foreground"}`} />
                      <span className="font-body text-xs truncate">{s.label}</span>
                      {isActive && <ChevronRight className="w-3 h-3 ml-auto text-secondary animate-fade-in" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {/* TOC progress */}
            <div className="mt-4 mx-3">
              <div className="h-0.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                  style={{ width: `${((tocSections.findIndex(s => s.id === activeSection) + 1) / tocSections.length) * 100}%` }}
                />
              </div>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <div className="scroll-smooth flex-1 min-w-0">
          {/* About intro */}
          <section id="about-intro" className="py-20 sm:py-28 bg-background relative overflow-hidden scroll-mt-24">
            <div className="absolute top-20 right-10 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none" style={{ background: "hsla(var(--secondary), 0.03)" }} />
            <div className="absolute bottom-10 left-10 w-[300px] h-[300px] rounded-full blur-[100px] pointer-events-none" style={{ background: "hsla(var(--primary), 0.04)" }} />
            <div className="container max-w-4xl px-4 relative">
              <ScrollReveal>
                <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/8 to-secondary/8 border border-primary/12 mb-8 backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-secondary" />
                  <span className="font-body text-xs font-semibold text-primary tracking-wide">Est. 2019 · Nelamangala, Bengaluru</span>
                </div>
                <SectionHeading title="About Hoysala Degree College" subtitle="Building a legacy of knowledge and character" />
              </ScrollReveal>
              <ScrollReveal delay={200}>
                <div className="relative mt-10 rounded-3xl overflow-hidden">
                  {/* Layered card background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-background/50 backdrop-blur-xl" />
                  <div className="absolute inset-0 border border-border/30 rounded-3xl" />
                  <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-secondary/30 to-transparent" />
                  <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-secondary/20 to-transparent" />
                  
                  <div className="relative p-8 sm:p-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-secondary" />
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-secondary/20 to-transparent" />
                    </div>
                    <div className="font-body text-foreground/90 leading-[1.8] space-y-4 text-sm sm:text-base">
                      <p>
                        Hoysala Degree College, established in 2019 under Shri Shirdi Sai Educational Trust(R), is located
                        in Nelamangala Town, Bengaluru Rural District. Affiliated to Bangalore University and approved by
                        AICTE New Delhi, the college offers BCA, B.Com (Regular & Professional), and BBA programs.
                      </p>
                      <p>
                        Our institution combines modern teaching methodologies with traditional values, creating an
                        environment where students develop both professionally and personally. With experienced faculty,
                        state-of-the-art infrastructure, and a strong focus on placements, we ensure every student is
                        career-ready.
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Quick Facts with Animated Counters */}
          <section id="quick-facts" className="py-16 sm:py-24 bg-cream relative overflow-hidden scroll-mt-24">
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="container px-4 relative">
              <ScrollReveal>
                <SectionHeading title="Quick Facts" subtitle="Numbers that define our institution" />
              </ScrollReveal>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5 max-w-5xl mx-auto">
                {quickFacts.map((f, i) => <CounterCard key={f.label} fact={f} index={i} />)}
              </div>
            </div>
          </section>

          {/* Timeline - NEW */}
          <section id="timeline" className="py-16 sm:py-24 bg-background relative overflow-hidden scroll-mt-24">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[150px] pointer-events-none" style={{ background: "hsla(var(--secondary), 0.03)" }} />
            <div className="container max-w-3xl px-4 relative">
              <ScrollReveal>
                <SectionHeading title="Our Journey" subtitle="Milestones in the making of excellence" />
              </ScrollReveal>
              <div className="relative mt-12">
                {/* Vertical line */}
                <div className="absolute left-6 sm:left-1/2 sm:-translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-secondary/40 via-border to-transparent" />
                {timeline.map((t, i) => (
                  <ScrollReveal key={t.year} delay={i * 120}>
                    <div className={`relative flex items-start gap-6 mb-10 sm:mb-12 ${i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"}`}>
                      {/* Dot */}
                      <div className="absolute left-6 sm:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-secondary border-2 border-background z-10 shadow-[0_0_12px_hsla(var(--secondary),0.3)]" />
                      {/* Card */}
                      <div className={`ml-14 sm:ml-0 sm:w-[calc(50%-2rem)] ${i % 2 === 0 ? "sm:pr-4 sm:text-right" : "sm:pl-4"}`}>
                        <div className="relative bg-card rounded-2xl p-5 border border-border/40 group hover:border-secondary/25 hover:shadow-[0_12px_40px_-10px_hsla(var(--secondary),0.1)] transition-all duration-500 hover:-translate-y-0.5">
                          <div className="absolute inset-0 bg-gradient-to-br from-secondary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-0 group-hover:w-1/2 bg-gradient-to-r from-transparent via-secondary/40 to-transparent transition-all duration-500" />
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/15 text-xs font-display font-bold text-secondary mb-2.5 relative z-10">
                            <Calendar className="w-3 h-3" />
                            {t.year}
                          </span>
                          <h4 className="font-display text-base font-bold text-foreground relative z-10">{t.title}</h4>
                          <p className="font-body text-xs text-muted-foreground mt-1 leading-relaxed relative z-10">{t.desc}</p>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Principal's Message */}
          <section id="principals-message" className="py-16 sm:py-24 bg-cream scroll-mt-24">
            <div className="container max-w-5xl px-4">
              <div className="grid md:grid-cols-5 gap-8 items-start">
                <ScrollReveal className="md:col-span-2">
                  <div className="relative group">
                    <div className="absolute -inset-6 bg-gradient-to-br from-secondary/15 to-primary/8 rounded-[2rem] blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-700" />
                    <div className="absolute -top-2 -left-2 w-16 h-16 border-t-2 border-l-2 border-secondary/40 rounded-tl-2xl z-20 group-hover:border-secondary/70 transition-colors duration-500" />
                    <div className="absolute -bottom-2 -right-2 w-16 h-16 border-b-2 border-r-2 border-secondary/40 rounded-br-2xl z-20 group-hover:border-secondary/70 transition-colors duration-500" />
                    <div className="relative overflow-hidden rounded-2xl z-10 shadow-[0_20px_60px_-15px_hsla(var(--secondary),0.2)]">
                      <img src={principalImage} alt="Principal Sri Gopal H.R" className="w-full group-hover:scale-[1.03] transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                        <p className="font-display text-base font-bold text-white drop-shadow-lg">Sri Gopal H.R</p>
                        <p className="font-body text-xs text-white/80">Principal · M.Sc, M.Ed, Ph.D</p>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <p className="font-display text-lg font-bold text-foreground">Sri Gopal H.R</p>
                    <p className="font-body text-xs text-muted-foreground">M.Sc, M.Ed, TET, KSET, Ph.D</p>
                    <span className="inline-flex items-center gap-1.5 mt-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-secondary/15 to-secondary/8 border border-secondary/20 text-xs font-body font-bold text-secondary">
                      <GraduationCap className="w-3 h-3" /> Principal
                    </span>
                  </div>
                </ScrollReveal>
                <ScrollReveal delay={200} className="md:col-span-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/8 border border-secondary/15 mb-4 backdrop-blur-sm">
                    <Star className="w-3.5 h-3.5 text-secondary" />
                    <span className="font-body text-xs font-semibold tracking-wide">From the Principal's Desk</span>
                  </div>
                  <SectionHeading title="Principal's Message" centered={false} />
                  <div className="mt-6 relative rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-background/50" />
                    <div className="absolute inset-0 border border-border/30 rounded-2xl" />
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-secondary via-primary/30 to-transparent rounded-l-2xl" />
                    <div className="relative p-6 pl-8">
                      <Quote className="w-8 h-8 text-secondary/20 mb-3" />
                      <div className="font-body text-muted-foreground leading-[1.8] text-sm space-y-3">
                        <p className="text-base font-display text-foreground font-semibold italic">
                          "Welcome to Hoysala Degree College"
                        </p>
                        <p>It gives immense pleasure to welcome you to HOYSALA DEGREE COLLEGE, one of the best colleges in Nelamangala town.</p>
                        <p>Our experienced faculty, modern infrastructure, and student-centric approach ensure every student receives personalized attention and guidance.</p>
                        <p>I invite you to be part of the Hoysala family and experience excellence in education.</p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* Vision & Mission */}
          <section id="vision-mission" className="py-16 sm:py-24 bg-background scroll-mt-24">
            <div className="container grid md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl px-4">
              {[
                { icon: Eye, accentHsl: "220, 80%, 55%", title: "Our Vision", text: "To be a premier institution of higher learning, recognized for academic excellence, innovation, and producing socially responsible graduates who contribute to national development." },
                { icon: Target, accentHsl: "42, 75%, 55%", title: "Our Mission", text: "To provide accessible, affordable, and quality education empowering students with knowledge, skills, and values for successful careers and meaningful lives." },
              ].map((item, i) => (
                <ScrollReveal key={item.title} delay={i * 200}>
                  <div className="relative bg-card rounded-3xl p-7 sm:p-8 h-full group overflow-hidden border border-border/30 hover:border-border/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_-15px_hsla(var(--secondary),0.1)]">
                    {/* Glow orb */}
                    <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl" style={{ background: `hsla(${item.accentHsl}, 0.12)` }} />
                    {/* Top accent */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-0 group-hover:w-2/3 transition-all duration-600" style={{ background: `linear-gradient(90deg, transparent, hsla(${item.accentHsl}, 0.5), transparent)` }} />
                    {/* Shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />

                    <div className="relative z-10">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-border/20" style={{ background: `linear-gradient(135deg, hsla(${item.accentHsl}, 0.12), hsla(${item.accentHsl}, 0.04))` }}>
                        <item.icon className="w-7 h-7" style={{ color: `hsla(${item.accentHsl}, 1)` }} />
                      </div>
                      <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-3">{item.title}</h3>
                      <p className="font-body text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                      <div className="mt-5 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, hsla(${item.accentHsl}, 0.3), transparent)` }} />
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </section>

          {/* Key Achievements */}
          <section id="achievements" className="py-16 sm:py-24 bg-cream relative overflow-hidden scroll-mt-24">
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[150px] pointer-events-none" style={{ background: "hsla(var(--primary), 0.03)" }} />
            <div className="container px-4 relative">
              <ScrollReveal>
                <SectionHeading title="Our Achievements" subtitle="Milestones that define our excellence" />
              </ScrollReveal>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-5xl mx-auto">
                {achievements.map((a, i) => (
                  <ScrollReveal key={a.title} delay={i * 100}>
                    <div className="relative bg-card rounded-3xl p-6 text-center group h-full overflow-hidden border border-border/30 hover:border-border/50 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_60px_-15px_hsla(var(--secondary),0.12)]">
                      {/* Glow */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl" style={{ background: `hsla(${a.accentHsl}, 0.15)` }} />
                      {/* Top accent */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-0 group-hover:w-1/2 transition-all duration-600" style={{ background: `linear-gradient(90deg, transparent, hsla(${a.accentHsl}, 0.6), transparent)` }} />
                      {/* Shimmer */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />

                      <div className="relative z-10">
                        <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 border border-border/20" style={{ background: `linear-gradient(135deg, hsla(${a.accentHsl}, 0.15), hsla(${a.accentHsl}, 0.05))` }}>
                          <a.icon className="w-6 h-6" style={{ color: `hsla(${a.accentHsl}, 1)` }} />
                        </div>
                        <h4 className="font-display text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">{a.title}</h4>
                        <p className="font-body text-xs text-muted-foreground">{a.desc}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Values */}
          <section id="core-values" className="py-16 sm:py-24 bg-background relative overflow-hidden scroll-mt-24">
            <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
            <div className="container px-4 relative">
              <ScrollReveal>
                <SectionHeading title="Our Core Values" subtitle="The principles that guide everything we do" />
              </ScrollReveal>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {values.map((v, i) => (
                  <ScrollReveal key={v.title} delay={i * 100}>
                    <div className="relative bg-card rounded-3xl p-6 text-center h-full group overflow-hidden border border-border/30 hover:border-border/50 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_60px_-15px_hsla(var(--secondary),0.1)]">
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl" style={{ background: `hsla(${v.accentHsl}, 0.12)` }} />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-0 group-hover:w-1/2 transition-all duration-600" style={{ background: `linear-gradient(90deg, transparent, hsla(${v.accentHsl}, 0.5), transparent)` }} />
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                      <div className="relative z-10">
                        <div className="w-14 h-14 mx-auto rounded-2xl border border-border/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500" style={{ background: `linear-gradient(135deg, hsla(${v.accentHsl}, 0.12), hsla(${v.accentHsl}, 0.04))` }}>
                          <v.icon className="w-6 h-6" style={{ color: `hsla(${v.accentHsl}, 1)` }} />
                        </div>
                        <h4 className="font-display text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">{v.title}</h4>
                        <p className="font-body text-sm text-muted-foreground">{v.desc}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Facilities */}
          <section id="facilities" className="py-20 sm:py-28 bg-cream scroll-mt-24">
            <div className="container px-4">
              <ScrollReveal>
                <SectionHeading title="Campus Facilities" subtitle="Modern infrastructure for holistic learning" />
              </ScrollReveal>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto">
                {facilities.map((f, i) => (
                  <ScrollReveal key={f.title} delay={i * 70}>
                    <div className="relative bg-card rounded-2xl p-5 group overflow-hidden border border-border/30 hover:border-border/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_16px_50px_-12px_hsla(var(--secondary),0.1)]">
                      {/* Shimmer */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-0 group-hover:w-1/2 bg-gradient-to-r from-transparent via-secondary/30 to-transparent transition-all duration-500" />
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/8 border border-border/20 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                          <f.icon className="w-5 h-5 text-primary group-hover:text-secondary transition-colors duration-300" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-body text-sm font-bold text-foreground group-hover:text-primary transition-colors duration-300">{f.title}</h4>
                          <p className="font-body text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Campus Gallery - with Lightbox */}
          <section id="campus-gallery" className="py-16 sm:py-24 bg-background relative overflow-hidden scroll-mt-24">
            <div className="absolute bottom-20 right-10 w-[400px] h-[400px] rounded-full blur-[150px] pointer-events-none" style={{ background: "hsla(var(--primary), 0.03)" }} />
            <div className="container max-w-5xl px-4 relative">
              <ScrollReveal>
                <SectionHeading title="Campus Highlights" subtitle="A glimpse into our vibrant campus life" />
              </ScrollReveal>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {galleryImages.map((img: any, i: number) => (
                  <ScrollReveal key={img.id} delay={i * 80}>
                    <div
                      onClick={() => setLightboxIdx(i)}
                      className="relative rounded-2xl overflow-hidden cursor-pointer group aspect-[4/3] border border-border/20 hover:border-border/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_16px_50px_-12px_hsla(var(--secondary),0.12)]"
                    >
                      <img src={img.image_url} alt={img.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      {/* Shimmer */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                      {/* Title + expand */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                        <div className="flex items-center justify-between">
                          <p className="font-body text-xs font-semibold text-white drop-shadow-lg">{img.title}</p>
                          <Expand className="w-3.5 h-3.5 text-white/70" />
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
              {/* View all link */}
              <ScrollReveal delay={400}>
                <div className="flex justify-center mt-8">
                  <a href="/gallery" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border/30 hover:border-secondary/30 text-sm font-body font-semibold text-muted-foreground hover:text-foreground transition-all duration-300 hover:shadow-[0_8px_30px_-8px_hsla(var(--secondary),0.1)] group">
                    <Camera className="w-4 h-4 text-secondary" />
                    View Full Gallery
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-300" />
                  </a>
                </div>
              </ScrollReveal>
            </div>
          </section>


          <section id="testimonials" className="py-16 sm:py-24 bg-background relative overflow-hidden scroll-mt-24">
            <div className="absolute top-10 right-10 w-[400px] h-[400px] rounded-full blur-[150px] pointer-events-none" style={{ background: "hsla(var(--secondary), 0.03)" }} />
            <div className="container max-w-3xl px-4 relative">
              <ScrollReveal>
                <SectionHeading title="What Students Say" subtitle="Voices from the Hoysala family" />
              </ScrollReveal>
              <ScrollReveal delay={200}>
                <div className="relative">
                  {testimonials.map((t, i) => (
                    <div
                      key={i}
                      className={`transition-all duration-500 ${i === activeTestimonial ? "opacity-100 scale-100" : "opacity-0 scale-95 absolute inset-0 pointer-events-none"}`}
                    >
                      <div className="relative bg-card rounded-3xl p-8 sm:p-10 border border-border/30 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-secondary/[0.03] to-transparent" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/3 bg-gradient-to-r from-transparent via-secondary/30 to-transparent" />
                        <div className="relative z-10">
                          <Quote className="w-10 h-10 text-secondary/15 mb-4" />
                          <p className="font-body text-base sm:text-lg text-foreground/85 leading-relaxed italic mb-6">"{t.text}"</p>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-display text-base font-bold text-foreground">{t.name}</p>
                              <p className="font-body text-xs text-muted-foreground">{t.course}</p>
                            </div>
                            <div className="flex gap-0.5">
                              {Array.from({ length: t.rating }).map((_, si) => (
                                <Star key={si} className="w-4 h-4 fill-secondary text-secondary" />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Dots */}
                  <div className="flex justify-center gap-2 mt-6">
                    {testimonials.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveTestimonial(i)}
                        className={`rounded-full transition-all duration-300 ${i === activeTestimonial ? "w-6 h-2 bg-secondary" : "w-2 h-2 bg-muted-foreground/20 hover:bg-muted-foreground/40"}`}
                      />
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Contact Info */}
          <section id="contact" className="py-20 sm:py-28 bg-cream scroll-mt-24">
            <div className="container max-w-4xl px-4">
              <ScrollReveal>
                <SectionHeading title="Reach Us" subtitle="We're always here to help" />
              </ScrollReveal>
              <ScrollReveal delay={150}>
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                  {[
                    { icon: MapPin, label: "Address", text: "K.R.P. Arcade, UCO Bank Building, Paramanna Layout, Nelamangala Town, Bengaluru Rural Dist. - 562 123", href: "https://maps.app.goo.gl/YGNgC5ev7v4pJWve9", external: true, accentHsl: "220, 80%, 55%" },
                    { icon: Phone, label: "Phone", text: "7676272167 / 7975344252 / 8618181383", href: "tel:7676272167", accentHsl: "155, 65%, 45%" },
                    { icon: Mail, label: "Email", text: "principal.hoysaladegreecollege@gmail.com", href: "mailto:principal.hoysaladegreecollege@gmail.com", accentHsl: "280, 60%, 55%" },
                    { icon: Clock, label: "Working Hours", text: "Monday - Saturday: 9:00 AM - 5:00 PM", href: undefined, accentHsl: "42, 75%, 55%" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="relative bg-card rounded-2xl p-5 sm:p-6 group overflow-hidden border border-border/30 hover:border-border/50 hover:-translate-y-1 transition-all duration-500 hover:shadow-[0_16px_50px_-12px_hsla(var(--secondary),0.1)]"
                    >
                      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl" style={{ background: `hsla(${item.accentHsl}, 0.12)` }} />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-0 group-hover:w-1/2 transition-all duration-500" style={{ background: `linear-gradient(90deg, transparent, hsla(${item.accentHsl}, 0.4), transparent)` }} />
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                      <div className="relative z-10 flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 border border-border/20" style={{ background: `linear-gradient(135deg, hsla(${item.accentHsl}, 0.12), hsla(${item.accentHsl}, 0.04))` }}>
                          <item.icon className="w-5 h-5" style={{ color: `hsla(${item.accentHsl}, 1)` }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-body text-xs font-bold text-foreground uppercase tracking-[0.12em] mb-1">{item.label}</p>
                          {item.href ? (
                            <a
                              href={item.href}
                              target={item.external ? "_blank" : undefined}
                              rel={item.external ? "noopener noreferrer" : undefined}
                              className="font-body text-sm text-muted-foreground hover:text-primary transition-colors duration-200 break-words"
                            >
                              {item.text}
                            </a>
                          ) : (
                            <p className="font-body text-sm text-muted-foreground">{item.text}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </section>
        </div>
    </div>

      {/* Lightbox Portal */}
      {lightboxIdx !== null && createPortal(
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[9999] flex items-center justify-center animate-fade-in"
          onClick={() => setLightboxIdx(null)}
          onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX === null) return;
            const diff = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(diff) > 50) {
              if (diff > 0) setLightboxIdx((p) => (p! - 1 + galleryImages.length) % galleryImages.length);
              else setLightboxIdx((p) => (p! + 1) % galleryImages.length);
            }
            setTouchStartX(null);
          }}
        >
          {/* Close */}
          <button onClick={() => setLightboxIdx(null)} className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all duration-200 z-10">
            <X className="w-5 h-5" />
          </button>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIdx((p) => (p! - 1 + galleryImages.length) % galleryImages.length); }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all duration-200 z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIdx((p) => (p! + 1) % galleryImages.length); }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all duration-200 z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Image */}
          <div className="max-w-[90vw] max-h-[80vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={(galleryImages[lightboxIdx] as any).image_url}
              alt={(galleryImages[lightboxIdx] as any).title}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl animate-scale-in"
            />
            <p className="font-body text-sm text-white/70 mt-4 font-semibold">{(galleryImages[lightboxIdx] as any).title}</p>
            <p className="font-body text-xs text-white/40 mt-1">{lightboxIdx + 1} / {galleryImages.length}</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

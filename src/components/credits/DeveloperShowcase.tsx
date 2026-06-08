import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import developerPhotoAsset from "@/assets/developer-pavan.png.asset.json";
const developerPhoto = developerPhotoAsset.url;
import { Code2, GraduationCap, Globe, Award, ArrowUpRight, MessageCircle, Instagram, Mail, Github, Scan, CircuitBoard, X } from "lucide-react";

const socialLinks = [
  { href: "https://pavan-05.framer.ai/", icon: Globe, label: "Portfolio", hoverColor: "hover:border-secondary/40 hover:shadow-[0_0_20px_hsl(var(--secondary)/0.2)]" },
  { href: "https://github.com/pavana05", icon: Github, label: "GitHub", hoverColor: "hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]" },
  { href: "https://www.instagram.com/_pavan_05._/", icon: Instagram, label: "Instagram", hoverColor: "hover:border-pink-500/40 hover:shadow-[0_0_20px_rgba(236,72,153,0.2)]" },
  { href: "https://api.whatsapp.com/send/?phone=9036048950&text=Hello+pavan+%F0%9F%91%8B&type=phone_number&app_absent=0", icon: MessageCircle, label: "WhatsApp", hoverColor: "hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]" },
  { href: "mailto:pavan05@flash.co", icon: Mail, label: "Email", hoverColor: "hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]" },
];

export function DeveloperShowcase() {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = useCallback(() => {
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, closeLightbox]);

  useEffect(() => {
    return () => { document.body.style.overflow = ""; };
  }, []);
  return (
    <div className="max-w-4xl mx-auto">
      <div className="group relative rounded-[2rem] overflow-hidden bg-card/60 backdrop-blur-2xl border border-border/30 shadow-2xl hover:shadow-[0_30px_80px_-20px_hsl(var(--secondary)/0.25)] hover:border-secondary/20 transition-all duration-700">
        {/* Subtle top accent */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-secondary/30 to-transparent" />
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-secondary/10 to-transparent" />

        {/* Circuit pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity duration-700"
          style={{
            backgroundImage: "radial-gradient(circle at 25% 25%, hsl(var(--secondary)/0.3) 1px, transparent 1px), radial-gradient(circle at 75% 75%, hsl(var(--secondary)/0.2) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* Ambient inner glow */}
        <div className="absolute -top-24 right-0 w-72 h-72 rounded-full bg-secondary/[0.04] blur-[80px] group-hover:bg-secondary/[0.14] group-hover:w-80 group-hover:h-80 transition-all duration-1000" />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-primary/[0.03] blur-[60px] group-hover:bg-primary/[0.08] transition-all duration-1000" />

        {/* HUD corners */}
        <div className="absolute top-3 left-3 w-6 h-6 border-l border-t border-secondary/20 opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
        <div className="absolute top-3 right-3 w-6 h-6 border-r border-t border-secondary/20 opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-l border-b border-secondary/20 opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-r border-b border-secondary/20 opacity-0 group-hover:opacity-60 transition-opacity duration-500" />

        <div className="relative p-8 sm:p-12 lg:p-14">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10">
            {/* Photo with holographic border */}
            <div className="relative shrink-0">
              <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-secondary/10 via-transparent to-primary/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <div className="relative group/photo">
                <div
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-2 border-secondary/15 shadow-2xl group-hover:border-secondary/40 group-hover/photo:shadow-[0_20px_60px_-15px_hsl(var(--secondary)/0.35)] transition-all duration-700 cursor-pointer"
                  onClick={openLightbox}
                >
                  <img
                    src={developerPhoto}
                    alt="Pavan A - Developer"
                    className="w-full h-full object-cover group-hover:scale-[1.05] group-hover/photo:brightness-110 transition-all duration-700"
                  />
                  {/* Holographic overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-secondary/15 via-transparent to-primary/5 opacity-0 group-hover/photo:opacity-100 transition-opacity duration-500 mix-blend-overlay" />
                </div>
                {/* Badge */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-secondary text-secondary-foreground px-5 py-2 rounded-full text-xs font-bold shadow-lg whitespace-nowrap border border-secondary/20 transition-all duration-500">
                  <Code2 className="w-3.5 h-3.5" />
                  Full-Stack Developer
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center lg:text-left space-y-5">
              <div>
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                  <Award className="w-5 h-5 text-secondary" />
                  <span className="font-mono text-[10px] text-secondary font-semibold tracking-[0.3em] uppercase">// Lead Developer</span>
                </div>
                <h2 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight group-hover:tracking-wide transition-all duration-700">
                  PAVAN A
                  <CircuitBoard className="inline-block w-6 h-6 ml-3 text-secondary/30 group-hover:text-secondary/60 transition-colors duration-500" />
                </h2>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-3">
                  <span className="flex items-center gap-1.5 text-muted-foreground font-body text-sm">
                    <GraduationCap className="w-4 h-4 text-secondary/80" /> BCA Department
                  </span>
                  <span className="w-1 h-1 rounded-full bg-secondary/30" />
                  <span className="flex items-center gap-1.5 text-muted-foreground font-body text-sm">
                    <Globe className="w-4 h-4 text-secondary/80" /> Web Developer
                  </span>
                </div>
              </div>

              <p className="text-muted-foreground font-body text-sm sm:text-base leading-relaxed max-w-lg">
                Designed and developed the entire Hoysala Degree College web portal — from the public-facing website to the comprehensive admin, teacher, and student dashboards — with passion, precision, and modern best practices.
              </p>

              {/* Social Links — futuristic pills */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                {socialLinks.map((social, i) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className={`group/s relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-muted/20 border border-border/30 text-muted-foreground overflow-hidden hover:text-foreground hover:-translate-y-0.5 transition-all duration-300 backdrop-blur-sm ${social.hoverColor}`}
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-secondary/0 via-secondary/5 to-secondary/0 opacity-0 group-hover/s:opacity-100 transition-opacity duration-500" />
                    <social.icon className="relative w-4 h-4 group-hover/s:scale-110 group-hover/s:drop-shadow-[0_0_4px_hsl(var(--secondary)/0.5)] transition-all duration-300" />
                    <span className="relative font-mono text-[11px] font-medium">{social.label}</span>
                  </a>
                ))}
              </div>

              {/* Portfolio CTA — neon button */}
              <a
                href="https://pavan-05.framer.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="group/cta relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 hover:border-secondary/40 text-foreground font-semibold text-sm transition-all duration-300"
              >
                <Globe className="relative w-4 h-4 text-secondary" />
                <span className="relative">View Full Portfolio</span>
                <ArrowUpRight className="relative w-4 h-4 text-muted-foreground group-hover/cta:text-secondary group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5 transition-all duration-300" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in"
          onClick={closeLightbox}
          role="dialog" aria-modal="true" aria-label="Developer photo preview"
        >
          <button
            className="fixed top-4 right-4 w-11 h-11 rounded-xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 z-[10000] shadow-lg border border-white/10"
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className="relative flex flex-col items-center justify-center w-[92vw] sm:max-w-[70vw] max-h-[100dvh] px-2 py-14 sm:py-8"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={developerPhoto}
              alt="Pavan A - Developer"
              className="w-full max-h-[75dvh] sm:max-h-[80vh] object-contain rounded-2xl shadow-2xl animate-scale-bounce"
            />
            <div className="mt-4 text-center bg-white/[0.06] backdrop-blur-xl px-6 py-3.5 rounded-xl border border-white/[0.08]">
              <p className="font-display text-base sm:text-lg font-bold text-white">Pavan A</p>
              <p className="font-body text-xs text-white/40 mt-1">Full-Stack Developer</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

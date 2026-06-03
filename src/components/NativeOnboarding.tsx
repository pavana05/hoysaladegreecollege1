import { useState, useCallback, useRef, useEffect } from "react";
import { GraduationCap, Bell, Shield, BarChart3, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import { Capacitor } from "@capacitor/core";

const triggerHaptic = async (style: "light" | "medium" | "heavy" = "light") => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] });
  } catch {}
};

const slides = [
  {
    icon: GraduationCap,
    title: "Welcome to HDC",
    subtitle: "Your Academic Companion",
    description: "Access everything you need — attendance, marks, timetable, and more — all in one beautifully crafted app.",
    iconColor: "hsl(42, 75%, 55%)",
    glowColor: "hsla(42, 75%, 55%, 0.35)",
    orbColor1: "hsla(42, 80%, 55%, 0.14)",
    orbColor2: "hsla(30, 70%, 50%, 0.08)",
  },
  {
    icon: Bell,
    title: "Stay Updated",
    subtitle: "Real-Time Notifications",
    description: "Never miss important announcements, exam schedules, or fee reminders with instant push notifications.",
    iconColor: "hsl(220, 60%, 55%)",
    glowColor: "hsla(220, 60%, 55%, 0.35)",
    orbColor1: "hsla(220, 65%, 55%, 0.14)",
    orbColor2: "hsla(250, 55%, 55%, 0.08)",
  },
  {
    icon: BarChart3,
    title: "Track Progress",
    subtitle: "Academic Analytics",
    description: "View your attendance, semester marks, and achievements with beautiful visualizations and insights.",
    iconColor: "hsl(160, 60%, 45%)",
    glowColor: "hsla(160, 60%, 45%, 0.35)",
    orbColor1: "hsla(160, 65%, 45%, 0.14)",
    orbColor2: "hsla(140, 55%, 40%, 0.08)",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    subtitle: "Your Data, Protected",
    description: "Enterprise-grade security ensures your academic data and personal information remain safe and private.",
    iconColor: "hsl(42, 75%, 55%)",
    glowColor: "hsla(42, 75%, 55%, 0.35)",
    orbColor1: "hsla(42, 80%, 55%, 0.14)",
    orbColor2: "hsla(15, 60%, 55%, 0.08)",
  },
];

interface Props {
  onComplete: () => void;
}

export default function NativeOnboarding({ onComplete }: Props) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    let cleanup = () => {};
    const handler = (e: DeviceOrientationEvent) => {
      const x = Math.max(-12, Math.min(12, (e.gamma ?? 0) * 0.35));
      const y = Math.max(-12, Math.min(12, (e.beta ?? 0) * 0.25 - 8));
      setTilt({ x, y });
    };
    const init = async () => {
      try {
        const DOE = DeviceOrientationEvent as any;
        if (typeof DOE.requestPermission === "function") await DOE.requestPermission();
      } catch {}
      window.addEventListener("deviceorientation", handler, { passive: true });
      cleanup = () => window.removeEventListener("deviceorientation", handler);
    };
    init();
    return () => cleanup();
  }, []);

  const goTo = useCallback((index: number) => {
    if (isTransitioning || index === current) return;
    triggerHaptic("light");
    setDirection(index > current ? "next" : "prev");
    setIsTransitioning(true);
    setTimeout(() => {
      // Swap slide and clear transitioning in the same tick so the new
      // slide mounts directly with the enter animation (prevents the
      // exit animation from replaying on the incoming slide).
      setCurrent(index);
      setIsTransitioning(false);
    }, 280);
  }, [current, isTransitioning]);

  const next = useCallback(() => {
    triggerHaptic("medium");
    if (current === slides.length - 1) {
      triggerHaptic("heavy");
      onComplete();
    } else {
      goTo(current + 1);
    }
  }, [current, goTo, onComplete]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 50 && dy < 100) {
      if (dx > 0 && current < slides.length - 1) goTo(current + 1);
      if (dx < 0 && current > 0) goTo(current - 1);
    }
  };

  const slide = slides[current];
  const SlideIcon = slide.icon;
  const isLast = current === slides.length - 1;
  const animClass = isTransitioning
    ? (direction === "next" ? "onb-exit-left" : "onb-exit-right")
    : (direction === "next" ? "onb-enter-right" : "onb-enter-left");

  return (
    <div
      className="fixed inset-0 z-[400] flex flex-col overflow-hidden select-none"
      style={{ background: "linear-gradient(165deg, #050709 0%, #0a0d14 45%, #070910 100%)" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[550px] h-[550px] rounded-full onb-glow-pulse"
          style={{
            top: "8%", left: "50%",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, ${slide.orbColor1}, transparent 65%)`,
            filter: "blur(90px)",
            transition: "background 0.8s ease",
          }}
        />
        <div
          className="absolute w-[350px] h-[350px] rounded-full onb-glow-pulse-alt"
          style={{
            bottom: "8%", right: "-8%",
            background: `radial-gradient(circle, ${slide.orbColor2}, transparent 60%)`,
            filter: "blur(80px)",
            transition: "background 0.8s ease",
          }}
        />
        <div className="absolute inset-0 opacity-[0.012]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }} />
      </div>

      {/* Skip */}
      {!isLast && (
        <button
          onClick={() => { triggerHaptic("light"); onComplete(); }}
          className="absolute top-14 right-6 z-50 px-5 py-2.5 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase onb-fade-in-delayed"
          style={{
            color: "rgba(255,255,255,0.35)",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(16px)",
          }}
        >
          Skip
        </button>
      )}

      {/* Counter */}
      <div className="absolute top-14 left-6 z-50 onb-fade-in-delayed">
        <span className="text-[11px] font-mono font-semibold tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>
          {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <div key={`icon-${current}`} className={`relative mb-14 ${animClass}`}>
          {/* Orbit rings */}
          <div className="absolute inset-[-30px] rounded-full onb-ring-spin" style={{ border: `1px dashed ${slide.glowColor}`, opacity: 0.3 }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ background: slide.iconColor, boxShadow: `0 0 14px ${slide.iconColor}` }} />
          </div>
          <div className="absolute inset-[-16px] rounded-full onb-ring-spin-reverse" style={{ border: `1px solid ${slide.glowColor}`, opacity: 0.15 }}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: slide.iconColor, opacity: 0.5 }} />
          </div>

          {/* Icon box */}
          <div
            className="relative w-[7rem] h-[7rem] rounded-3xl flex items-center justify-center"
            style={{
              transform: `perspective(400px) rotateY(${tilt.x}deg) rotateX(${-tilt.y}deg)`,
              transition: "transform 0.12s ease-out",
              background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: `0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 50px ${slide.glowColor}`,
            }}
          >
            <SlideIcon className="w-11 h-11" style={{ color: slide.iconColor }} strokeWidth={1.5} />
          </div>
        </div>

        {/* Text */}
        <div key={`text-${current}`} className={`text-center max-w-[300px] ${animClass}`} style={{ animationDelay: "60ms" }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5" style={{
            background: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <Sparkles className="w-3 h-3" style={{ color: slide.iconColor }} />
            <span className="text-[10px] font-semibold tracking-[0.22em] uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
              {slide.subtitle}
            </span>
          </div>

          <h1 className="text-[30px] sm:text-[34px] font-bold leading-[1.15] mb-4 tracking-tight" style={{
            background: "linear-gradient(150deg, rgba(255,255,255,0.97), rgba(255,255,255,0.6))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            {slide.title}
          </h1>

          <p className="text-[13px] leading-[1.75] font-normal" style={{ color: "rgba(255,255,255,0.38)" }}>
            {slide.description}
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="relative z-10 px-8 pb-12 pt-6">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full"
              style={{
                width: i === current ? 32 : 8,
                height: 8,
                background: i === current
                  ? `linear-gradient(90deg, ${slide.iconColor}, ${slide.iconColor}88)`
                  : "rgba(255,255,255,0.1)",
                boxShadow: i === current ? `0 0 14px ${slide.glowColor}` : "none",
                transition: "all 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={next}
          className="w-full py-[18px] rounded-2xl flex items-center justify-center gap-3 font-bold text-[15px] tracking-wide relative overflow-hidden onb-btn-press"
          style={{
            background: isLast
              ? `linear-gradient(135deg, ${slide.iconColor}, ${slide.iconColor}cc)`
              : "rgba(255,255,255,0.06)",
            border: isLast ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
            color: "#ffffff",
            boxShadow: isLast
              ? `0 14px 44px ${slide.glowColor}, 0 4px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)`
              : "0 2px 10px rgba(0,0,0,0.2)",
            textShadow: isLast ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
          }}
        >
          <span>{isLast ? "Get Started" : "Continue"}</span>
          {isLast ? <ArrowRight className="w-5 h-5" strokeWidth={2.5} /> : <ChevronRight className="w-4 h-4 opacity-50" />}
          <span className="absolute inset-0 onb-shimmer-sweep" />
        </button>

        {isLast && (
          <p className="text-center mt-4 text-[10px] tracking-wide" style={{ color: "rgba(255,255,255,0.18)" }}>
            By continuing, you agree to our Terms of Service
          </p>
        )}
      </div>

      <style>{`
        .onb-enter-right { animation: onb-slide-in-right 0.42s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .onb-enter-left  { animation: onb-slide-in-left  0.42s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .onb-exit-left   { animation: onb-slide-out-left  0.28s cubic-bezier(0.55, 0, 1, 0.45) both; }
        .onb-exit-right  { animation: onb-slide-out-right 0.28s cubic-bezier(0.55, 0, 1, 0.45) both; }

        @keyframes onb-slide-in-right {
          from { opacity:0; transform: translateX(60px) scale(0.92); filter: blur(6px); }
          to   { opacity:1; transform: translateX(0) scale(1);      filter: blur(0); }
        }
        @keyframes onb-slide-in-left {
          from { opacity:0; transform: translateX(-60px) scale(0.92); filter: blur(6px); }
          to   { opacity:1; transform: translateX(0) scale(1);       filter: blur(0); }
        }
        @keyframes onb-slide-out-left {
          from { opacity:1; transform: translateX(0) scale(1);        filter: blur(0); }
          to   { opacity:0; transform: translateX(-40px) scale(0.95); filter: blur(4px); }
        }
        @keyframes onb-slide-out-right {
          from { opacity:1; transform: translateX(0) scale(1);       filter: blur(0); }
          to   { opacity:0; transform: translateX(40px) scale(0.95); filter: blur(4px); }
        }

        .onb-glow-pulse     { animation: onb-gp 5s ease-in-out infinite alternate; }
        .onb-glow-pulse-alt { animation: onb-gp 6s ease-in-out 1s infinite alternate-reverse; }
        @keyframes onb-gp {
          0%   { opacity:0.4; transform: translate(-50%,-50%) scale(0.88); }
          100% { opacity:0.85; transform: translate(-50%,-50%) scale(1.15); }
        }

        .onb-ring-spin         { animation: onb-rot 14s linear infinite; }
        .onb-ring-spin-reverse { animation: onb-rot 9s linear infinite reverse; }
        @keyframes onb-rot { to { transform: rotate(360deg); } }

        .onb-fade-in-delayed { animation: onb-fi 0.5s ease 0.5s both; }
        @keyframes onb-fi { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }

        .onb-btn-press { transition: transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease; }
        .onb-btn-press:active { transform: scale(0.965); }

        .onb-shimmer-sweep {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          animation: onb-shm 3.5s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes onb-shm { 0%{transform:translateX(-100%)} 40%,100%{transform:translateX(100%)} }
      `}</style>
    </div>
  );
}

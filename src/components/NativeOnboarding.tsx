import { useState, useCallback, useRef } from "react";
import { GraduationCap, Bell, Shield, BarChart3, ChevronRight, Sparkles, ArrowRight } from "lucide-react";

const slides = [
  {
    icon: GraduationCap,
    title: "Welcome to HDC",
    subtitle: "Your Academic Companion",
    description: "Access everything you need — attendance, marks, timetable, and more — all in one beautifully crafted app.",
    gradient: "from-[hsla(42,75%,55%,0.15)] to-[hsla(220,60%,50%,0.08)]",
    iconColor: "hsla(42,75%,55%,1)",
    accentColor: "hsla(42,75%,55%,0.25)",
    orbColor1: "hsla(42,80%,55%,0.12)",
    orbColor2: "hsla(30,70%,50%,0.08)",
  },
  {
    icon: Bell,
    title: "Stay Updated",
    subtitle: "Real-Time Notifications",
    description: "Never miss important announcements, exam schedules, or fee reminders with instant push notifications.",
    gradient: "from-[hsla(220,60%,50%,0.15)] to-[hsla(260,50%,50%,0.08)]",
    iconColor: "hsla(220,60%,55%,1)",
    accentColor: "hsla(220,60%,55%,0.25)",
    orbColor1: "hsla(220,65%,55%,0.12)",
    orbColor2: "hsla(250,55%,55%,0.08)",
  },
  {
    icon: BarChart3,
    title: "Track Progress",
    subtitle: "Academic Analytics",
    description: "View your attendance, semester marks, and achievements with beautiful visualizations and insights.",
    gradient: "from-[hsla(160,60%,45%,0.12)] to-[hsla(42,75%,55%,0.08)]",
    iconColor: "hsla(160,60%,45%,1)",
    accentColor: "hsla(160,60%,45%,0.25)",
    orbColor1: "hsla(160,65%,45%,0.12)",
    orbColor2: "hsla(140,55%,40%,0.08)",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    subtitle: "Your Data, Protected",
    description: "Enterprise-grade security ensures your academic data and personal information remain safe and private.",
    gradient: "from-[hsla(42,75%,55%,0.12)] to-[hsla(15,60%,55%,0.08)]",
    iconColor: "hsla(42,75%,55%,1)",
    accentColor: "hsla(42,75%,55%,0.25)",
    orbColor1: "hsla(42,80%,55%,0.12)",
    orbColor2: "hsla(15,60%,55%,0.08)",
  },
];

interface Props {
  onComplete: () => void;
}

export default function NativeOnboarding({ onComplete }: Props) {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [exiting, setExiting] = useState(false);
  const touchStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((index: number) => {
    if (animating || index === current) return;
    setExiting(true);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setExiting(false);
      setTimeout(() => setAnimating(false), 50);
    }, 300);
  }, [current, animating]);

  const next = useCallback(() => {
    if (current === slides.length - 1) {
      onComplete();
    } else {
      goTo(current + 1);
    }
  }, [current, goTo, onComplete]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && current < slides.length - 1) goTo(current + 1);
      if (diff < 0 && current > 0) goTo(current - 1);
    }
  };

  const slide = slides[current];
  const SlideIcon = slide.icon;
  const isLast = current === slides.length - 1;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[400] flex flex-col overflow-hidden select-none"
      style={{ background: "linear-gradient(160deg, #06080c 0%, #0a0d14 40%, #080a10 100%)" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Layered ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Primary glow */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full onb-bg-glow"
          style={{
            top: "10%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, ${slide.orbColor1}, transparent 65%)`,
            filter: "blur(100px)",
            transition: "background 1s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
        {/* Secondary orb */}
        <div
          className="absolute w-[400px] h-[400px] rounded-full onb-bg-glow-secondary"
          style={{
            bottom: "5%",
            right: "-10%",
            background: `radial-gradient(circle, ${slide.orbColor2}, transparent 60%)`,
            filter: "blur(90px)",
            transition: "background 1s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* Skip button */}
      {!isLast && (
        <button
          onClick={onComplete}
          className="absolute top-14 right-6 z-50 px-5 py-2.5 rounded-full text-[11px] font-semibold tracking-[0.18em] uppercase onb-skip-btn"
          style={{
            color: "rgba(255,255,255,0.35)",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          Skip
        </button>
      )}

      {/* Slide counter */}
      <div className="absolute top-14 left-6 z-50 onb-skip-btn">
        <span className="text-[11px] font-mono font-semibold tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>
          {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        {/* Icon with orbital rings */}
        <div
          key={`icon-${current}`}
          className={`relative mb-12 ${exiting ? "onb-content-exit" : "onb-icon-enter"}`}
        >
          {/* Outer orbit ring */}
          <div
            className="absolute inset-[-28px] rounded-full onb-ring-spin"
            style={{
              border: `1px dashed ${slide.accentColor}`,
              opacity: 0.4,
            }}
          >
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
              style={{ background: slide.iconColor, boxShadow: `0 0 16px ${slide.iconColor}` }}
            />
          </div>

          {/* Inner orbit ring */}
          <div
            className="absolute inset-[-14px] rounded-full onb-ring-spin-reverse"
            style={{
              border: `1px solid ${slide.accentColor}`,
              opacity: 0.2,
            }}
          >
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full"
              style={{ background: slide.iconColor, opacity: 0.6 }}
            />
          </div>

          {/* Icon container */}
          <div
            className="relative w-28 h-28 rounded-[1.75rem] flex items-center justify-center"
            style={{
              background: `linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))`,
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: `
                0 24px 80px rgba(0,0,0,0.5),
                inset 0 1px 0 rgba(255,255,255,0.06),
                0 0 60px ${slide.accentColor}
              `,
            }}
          >
            <SlideIcon className="w-12 h-12" style={{ color: slide.iconColor }} strokeWidth={1.5} />
          </div>
        </div>

        {/* Text content */}
        <div
          key={`text-${current}`}
          className={`text-center max-w-[320px] ${exiting ? "onb-content-exit" : "onb-text-enter"}`}
        >
          {/* Subtitle chip */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Sparkles className="w-3 h-3" style={{ color: slide.iconColor }} />
            <span
              className="text-[10px] font-semibold tracking-[0.2em] uppercase"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              {slide.subtitle}
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-[32px] sm:text-4xl font-bold leading-[1.15] mb-4 tracking-tight"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.97), rgba(255,255,255,0.65))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {slide.title}
          </h1>

          {/* Description */}
          <p
            className="text-[13px] leading-[1.7] font-normal"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {slide.description}
          </p>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 px-8 pb-12 pt-6">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="relative rounded-full transition-all duration-600 ease-out"
              style={{
                width: i === current ? "36px" : "8px",
                height: "8px",
                background: i === current
                  ? `linear-gradient(90deg, ${slide.iconColor}, ${slide.iconColor}99)`
                  : "rgba(255,255,255,0.1)",
                boxShadow: i === current ? `0 0 16px ${slide.accentColor}, 0 2px 8px ${slide.accentColor}` : "none",
                transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={next}
          className="w-full py-[18px] rounded-2xl flex items-center justify-center gap-2.5 font-bold text-[15px] tracking-wide onb-btn-shimmer relative overflow-hidden"
          style={{
            background: isLast
              ? `linear-gradient(135deg, ${slide.iconColor}, ${slide.iconColor}dd)`
              : "rgba(255,255,255,0.05)",
            border: isLast ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.08)",
            color: "#ffffff",
            boxShadow: isLast
              ? `0 12px 40px ${slide.accentColor}, 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`
              : "0 2px 12px rgba(0,0,0,0.2)",
            textShadow: isLast ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
          }}
        >
          <span>{isLast ? "Get Started" : "Continue"}</span>
          {isLast ? (
            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          ) : (
            <ChevronRight className="w-4 h-4 opacity-60" />
          )}
        </button>

        {/* Terms text on last slide */}
        {isLast && (
          <p className="text-center mt-4 text-[10px] tracking-wide" style={{ color: "rgba(255,255,255,0.2)" }}>
            By continuing, you agree to our Terms of Service
          </p>
        )}
      </div>

      <style>{`
        .onb-bg-glow {
          animation: onb-glow-pulse 5s ease-in-out infinite alternate;
        }
        .onb-bg-glow-secondary {
          animation: onb-glow-pulse 6s ease-in-out 1s infinite alternate-reverse;
        }
        .onb-icon-enter {
          animation: onb-icon-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .onb-text-enter {
          animation: onb-text-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both;
        }
        .onb-content-exit {
          animation: onb-content-out 0.25s cubic-bezier(0.4, 0, 1, 1) forwards;
        }
        .onb-ring-spin {
          animation: onb-ring-rotate 12s linear infinite;
        }
        .onb-ring-spin-reverse {
          animation: onb-ring-rotate 8s linear infinite reverse;
        }
        .onb-skip-btn {
          animation: onb-fade-in 0.5s ease 0.6s both;
        }
        .onb-btn-shimmer {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
        }
        .onb-btn-shimmer:active {
          transform: scale(0.96);
        }
        .onb-btn-shimmer::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: onb-shimmer 4s ease-in-out infinite;
        }
        @keyframes onb-glow-pulse {
          0% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.85); }
          100% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.2); }
        }
        @keyframes onb-icon-in {
          0% { opacity: 0; transform: scale(0.5) translateY(30px); filter: blur(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes onb-text-in {
          0% { opacity: 0; transform: translateY(24px); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes onb-content-out {
          0% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
          100% { opacity: 0; transform: scale(0.95) translateY(-10px); filter: blur(4px); }
        }
        @keyframes onb-ring-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes onb-fade-in {
          0% { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes onb-shimmer {
          0% { left: -100%; }
          40%, 100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from "react";
import { GraduationCap, Bell, Shield, BarChart3, ChevronRight, Sparkles } from "lucide-react";

const slides = [
  {
    icon: GraduationCap,
    title: "Welcome to HDC Portal",
    subtitle: "Your Academic Companion",
    description: "Access everything you need — attendance, marks, timetable, and more — all in one beautifully crafted app.",
    gradient: "from-[hsla(42,75%,55%,0.15)] to-[hsla(220,60%,50%,0.08)]",
    iconColor: "hsla(42,75%,55%,1)",
    accentColor: "hsla(42,75%,55%,0.2)",
  },
  {
    icon: Bell,
    title: "Stay Updated",
    subtitle: "Real-Time Notifications",
    description: "Never miss important announcements, exam schedules, or fee reminders with instant push notifications.",
    gradient: "from-[hsla(220,60%,50%,0.15)] to-[hsla(260,50%,50%,0.08)]",
    iconColor: "hsla(220,60%,55%,1)",
    accentColor: "hsla(220,60%,55%,0.2)",
  },
  {
    icon: BarChart3,
    title: "Track Progress",
    subtitle: "Academic Analytics",
    description: "View your attendance, semester marks, and achievements with beautiful visualizations and insights.",
    gradient: "from-[hsla(160,60%,45%,0.12)] to-[hsla(42,75%,55%,0.08)]",
    iconColor: "hsla(160,60%,45%,1)",
    accentColor: "hsla(160,60%,45%,0.2)",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    subtitle: "Your Data, Protected",
    description: "Enterprise-grade security ensures your academic data and personal information remain safe and private.",
    gradient: "from-[hsla(42,75%,55%,0.12)] to-[hsla(15,60%,55%,0.08)]",
    iconColor: "hsla(42,75%,55%,1)",
    accentColor: "hsla(42,75%,55%,0.2)",
  },
];

interface Props {
  onComplete: () => void;
}

export default function NativeOnboarding({ onComplete }: Props) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);
  const touchStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((index: number) => {
    if (animating || index === current) return;
    setDirection(index > current ? "next" : "prev");
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 350);
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
      className="fixed inset-0 z-[400] flex flex-col overflow-hidden"
      style={{ background: "#050608" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Large gradient blob */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full onb-bg-glow"
          style={{
            top: "15%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, ${slide.accentColor}, transparent 70%)`,
            filter: "blur(80px)",
            transition: "background 0.8s ease",
          }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Skip button */}
      {!isLast && (
        <button
          onClick={onComplete}
          className="absolute top-14 right-6 z-50 px-4 py-2 rounded-full text-xs font-medium tracking-wider uppercase onb-skip-btn"
          style={{
            color: "rgba(255,255,255,0.4)",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(10px)",
          }}
        >
          Skip
        </button>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        {/* Animated icon */}
        <div
          key={`icon-${current}`}
          className="onb-icon-enter relative mb-10"
        >
          {/* Outer ring */}
          <div
            className="absolute inset-[-20px] rounded-full onb-ring-spin"
            style={{
              border: `1px solid ${slide.accentColor}`,
            }}
          >
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
              style={{ background: slide.iconColor, boxShadow: `0 0 12px ${slide.iconColor}` }}
            />
          </div>

          {/* Icon container */}
          <div
            className="relative w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: `0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px ${slide.accentColor}`,
            }}
          >
            <SlideIcon className="w-10 h-10" style={{ color: slide.iconColor }} />
          </div>
        </div>

        {/* Text content */}
        <div key={`text-${current}`} className="text-center max-w-sm onb-text-enter">
          {/* Subtitle chip */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4" style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <Sparkles className="w-3 h-3" style={{ color: slide.iconColor }} />
            <span className="text-[10px] font-medium tracking-[0.15em] uppercase" style={{ color: "rgba(255,255,255,0.5)" }}>
              {slide.subtitle}
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-[28px] sm:text-3xl font-bold leading-tight mb-4"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {slide.title}
          </h1>

          {/* Description */}
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            {slide.description}
          </p>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 px-8 pb-12 pt-4">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="relative h-2 rounded-full transition-all duration-500 ease-out"
              style={{
                width: i === current ? "32px" : "8px",
                background: i === current
                  ? `linear-gradient(90deg, ${slide.iconColor}, ${slide.iconColor}88)`
                  : "rgba(255,255,255,0.15)",
                boxShadow: i === current ? `0 0 12px ${slide.accentColor}` : "none",
              }}
            />
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={next}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm tracking-wide onb-btn-shimmer"
          style={{
            background: isLast
              ? `linear-gradient(135deg, ${slide.iconColor}, ${slide.iconColor}cc)`
              : "rgba(255,255,255,0.06)",
            border: isLast ? "none" : "1px solid rgba(255,255,255,0.08)",
            color: isLast ? "#050608" : "rgba(255,255,255,0.8)",
            boxShadow: isLast ? `0 8px 30px ${slide.accentColor}` : "none",
          }}
        >
          {isLast ? "Get Started" : "Continue"}
          <ChevronRight className="w-4 h-4" style={{ opacity: 0.7 }} />
        </button>
      </div>

      <style>{`
        .onb-bg-glow {
          animation: onb-glow-pulse 4s ease-in-out infinite alternate;
        }
        .onb-icon-enter {
          animation: onb-icon-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .onb-text-enter {
          animation: onb-text-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
        }
        .onb-ring-spin {
          animation: onb-ring-rotate 10s linear infinite;
        }
        .onb-skip-btn {
          animation: onb-fade-in 0.4s ease 0.5s both;
        }
        .onb-btn-shimmer {
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.3s ease;
        }
        .onb-btn-shimmer:active {
          transform: scale(0.97);
        }
        .onb-btn-shimmer::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          animation: onb-shimmer 3s ease-in-out infinite;
        }
        @keyframes onb-glow-pulse {
          0% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.9); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes onb-icon-in {
          0% { opacity: 0; transform: scale(0.6) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes onb-text-in {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes onb-ring-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes onb-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes onb-shimmer {
          0% { left: -100%; }
          50%, 100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}

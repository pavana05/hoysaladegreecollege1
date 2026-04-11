import { useState, useEffect } from "react";

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"logo" | "split" | "done">("logo");

  useEffect(() => {
    // Phase 1: Logo reveal (0-1.8s)
    const t1 = setTimeout(() => setPhase("split"), 1800);
    // Phase 2: Split screen reveal (1.8-3.2s)  
    const t2 = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <div className="fixed inset-0 z-[300] overflow-hidden" style={{ willChange: "transform, opacity" }}>
      {/* Left panel */}
      <div
        className="absolute top-0 left-0 w-1/2 h-full"
        style={{
          background: "linear-gradient(180deg, hsl(228,14%,5%), hsl(228,14%,3%))",
          transform: phase === "split" ? "translateX(-100%)" : "translateX(0)",
          transition: "transform 1.2s cubic-bezier(0.76, 0, 0.24, 1)",
          willChange: "transform",
        }}
      >
        {/* Gold accent line */}
        <div className="absolute top-0 right-0 w-px h-full" style={{
          background: "linear-gradient(180deg, transparent 10%, hsla(42,75%,55%,0.3) 50%, transparent 90%)"
        }} />
      </div>

      {/* Right panel */}
      <div
        className="absolute top-0 right-0 w-1/2 h-full"
        style={{
          background: "linear-gradient(180deg, hsl(228,14%,4%), hsl(228,14%,2%))",
          transform: phase === "split" ? "translateX(100%)" : "translateX(0)",
          transition: "transform 1.2s cubic-bezier(0.76, 0, 0.24, 1)",
          willChange: "transform",
        }}
      >
        {/* Gold accent line */}
        <div className="absolute top-0 left-0 w-px h-full" style={{
          background: "linear-gradient(180deg, transparent 10%, hsla(42,75%,55%,0.3) 50%, transparent 90%)"
        }} />
      </div>

      {/* Center content - logo + text */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10"
        style={{
          opacity: phase === "split" ? 0 : 1,
          transform: phase === "split" ? "scale(0.8)" : "scale(1)",
          transition: "opacity 0.6s ease, transform 0.8s cubic-bezier(0.76, 0, 0.24, 1)",
          willChange: "opacity, transform",
        }}
      >
        {/* Ambient glow */}
        <div className="absolute w-[300px] h-[300px] rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, hsla(42,75%,55%,0.08), transparent 70%)",
          filter: "blur(40px)",
          animation: "splash-ambient-pulse 3s ease-in-out infinite",
        }} />

        {/* Orbital ring */}
        <div className="absolute w-[160px] h-[160px] rounded-full pointer-events-none" style={{
          border: "1px solid hsla(42,75%,55%,0.1)",
          animation: "splash-ring-spin 8s linear infinite",
        }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{
            background: "hsl(42,75%,55%)",
            boxShadow: "0 0 8px hsla(42,75%,55%,0.6)",
          }} />
        </div>

        {/* Logo container with glow ring */}
        <div className="relative splash-logo" style={{ willChange: "transform, opacity" }}>
          <div className="splash-glow-ring" />
          <div className="relative z-10 w-[88px] h-[88px] rounded-[20px] overflow-hidden flex items-center justify-center" style={{
            background: "rgba(255,255,255,0.97)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}>
            <img
              src="/lovable-uploads/bacc5b2d-3f25-473a-a2ee-a0d75a0cb7e3.png"
              alt="Hoysala Degree College"
              className="w-[78%] h-[78%] object-contain"
              fetchPriority="high"
              decoding="async"
              width={70}
              height={70}
            />
          </div>
        </div>

        {/* Title */}
        <div className="mt-6 text-center splash-text" style={{ willChange: "transform, opacity" }}>
          <p className="font-display text-[22px] sm:text-2xl font-bold tracking-wide" style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95), hsla(42,75%,65%,0.9))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Hoysala Degree College
          </p>
          <p className="font-body text-[10px] tracking-[0.3em] uppercase mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
            Right Choice For Better Future
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-6 splash-progress-track" style={{ willChange: "opacity, width" }}>
          <div className="w-40 h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full splash-progress-bar" />
          </div>
        </div>

        {/* Floating particles */}
        {[
          { left: "20%", top: "25%", size: 2, delay: 0 },
          { left: "75%", top: "30%", size: 1.5, delay: 0.5 },
          { left: "30%", top: "70%", size: 2.5, delay: 1 },
          { left: "65%", top: "75%", size: 1, delay: 0.3 },
          { left: "50%", top: "20%", size: 2, delay: 0.8 },
          { left: "85%", top: "50%", size: 1.5, delay: 1.2 },
        ].map((p, i) => (
          <div key={i} className="splash-particle" style={{
            left: p.left, top: p.top,
            width: `${p.size}px`, height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function PageLoader() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Skip splash screen entirely — content loads immediately
  }, []);

  useEffect(() => {
    setLoading(true);
    setProgress(0);
    const t1 = setTimeout(() => setProgress(50), 30);
    const t2 = setTimeout(() => setProgress(85), 80);
    const t3 = setTimeout(() => setProgress(100), 150);
    const t4 = setTimeout(() => setLoading(false), 250);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [location.pathname]);

  return (
    <>
      {showSplash && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center flex-col gap-6 overflow-hidden" style={{ background: "#050608" }}>
          {/* Ambient glow orbs */}
          <div className="absolute pointer-events-none" style={{
            width: "450px", height: "450px", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
            background: "radial-gradient(circle, hsla(42,80%,50%,0.08), transparent 70%)",
            filter: "blur(60px)", animation: "splash-glow 3s ease-in-out infinite alternate"
          }} />
          <div className="absolute pointer-events-none" style={{
            width: "280px", height: "280px", bottom: "15%", right: "20%",
            background: "radial-gradient(circle, hsla(220,80%,55%,0.05), transparent 70%)",
            filter: "blur(50px)", animation: "splash-glow 4s ease-in-out 1s infinite alternate"
          }} />
          <div className="absolute pointer-events-none" style={{
            width: "200px", height: "200px", top: "12%", left: "18%",
            background: "radial-gradient(circle, hsla(42,80%,50%,0.04), transparent 70%)",
            filter: "blur(40px)", animation: "splash-glow 3.5s ease-in-out 0.5s infinite alternate"
          }} />

          {/* Orbital particle ring */}
          <div className="absolute top-1/2 left-1/2 w-[200px] h-[200px] pointer-events-none" style={{ animation: "splash-orbit 12s linear infinite", transform: "translate(-50%,-50%)" }}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <div key={deg} className="absolute rounded-full" style={{
                width: "3px", height: "3px",
                background: `hsla(42,75%,55%,${0.1 + (deg / 1200)})`,
                top: "50%", left: "50%",
                transform: `rotate(${deg}deg) translateX(96px)`,
                boxShadow: "0 0 8px hsla(42,75%,55%,0.35)",
              }} />
            ))}
          </div>

          {/* Floating particles */}
          {[
            { x: "22%", y: "18%", s: 2, d: 4, dl: 0 },
            { x: "72%", y: "35%", s: 1.5, d: 3.5, dl: 0.5 },
            { x: "28%", y: "65%", s: 2.5, d: 5, dl: 1 },
            { x: "68%", y: "75%", s: 1, d: 4.5, dl: 0.3 },
            { x: "55%", y: "25%", s: 2, d: 3, dl: 0.8 },
            { x: "80%", y: "55%", s: 1.5, d: 4, dl: 1.2 },
            { x: "15%", y: "45%", s: 1, d: 3.8, dl: 0.6 },
            { x: "45%", y: "82%", s: 2, d: 4.2, dl: 0.9 },
          ].map((p, i) => (
            <div key={i} className="absolute rounded-full pointer-events-none" style={{
              width: `${p.s}px`, height: `${p.s}px`,
              background: `hsla(42,75%,55%,0.15)`,
              left: p.x, top: p.y,
              animation: `splash-float ${p.d}s ease-in-out ${p.dl}s infinite alternate`,
            }} />
          ))}

          {/* Logo with gradient ring */}
          <div className="relative z-10" style={{ animation: "splash-logo-in 1s cubic-bezier(0.16,1,0.3,1) forwards", opacity: 0 }}>
            <div className="p-[3px] rounded-3xl" style={{
              background: "linear-gradient(135deg, hsla(42,80%,55%,0.6), hsla(42,80%,55%,0.1), hsla(220,80%,60%,0.3))",
              boxShadow: "0 12px 50px rgba(0,0,0,0.4), 0 0 40px hsla(42,75%,55%,0.08)",
              animation: "splash-ring-glow 2s ease-in-out infinite alternate"
            }}>
              <div className="w-[94px] h-[94px] rounded-[21px] overflow-hidden flex items-center justify-center" style={{ background: "rgba(255,255,255,0.97)" }}>
                <img src="/lovable-uploads/bacc5b2d-3f25-473a-a2ee-a0d75a0cb7e3.png" alt="Logo" className="w-[85%] h-[85%] object-contain" fetchPriority="high" decoding="async" width={80} height={80} />
              </div>
            </div>
          </div>

          {/* Title text with gradient */}
          <div className="text-center relative z-10" style={{ animation: "splash-text-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.35s both" }}>
            <p className="font-display text-2xl font-bold tracking-wide" style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.95), hsla(42,75%,65%,0.9))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
            }}>
              Hoysala Degree College
            </p>
            <p className="font-body text-[10px] tracking-[0.25em] uppercase mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
              Right Choice For Better Future
            </p>
            <div className="w-10 h-px mx-auto mt-3" style={{ background: "linear-gradient(90deg, transparent, hsla(42,75%,55%,0.3), transparent)" }} />
          </div>

          {/* Progress bar */}
          <div className="relative z-10" style={{ animation: "splash-text-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.6s both" }}>
            <div className="w-44 h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{
                background: "linear-gradient(90deg, hsla(42,75%,55%,0.9), hsla(42,75%,65%,1))",
                animation: "rl-fill 2.8s ease-out forwards", width: "0%",
                boxShadow: "0 0 16px hsla(42,75%,55%,0.5)"
              }} />
            </div>
          </div>

          <style>{`
            @keyframes splash-glow { 0% { opacity: 0.4; transform: translate(-50%,-50%) scale(1); } 100% { opacity: 1; transform: translate(-50%,-50%) scale(1.15); } }
            @keyframes splash-orbit { 0% { transform: translate(-50%,-50%) rotate(0deg); } 100% { transform: translate(-50%,-50%) rotate(360deg); } }
            @keyframes splash-float { 0% { transform: translateY(0) translateX(0); opacity: 0.1; } 50% { opacity: 0.4; } 100% { transform: translateY(-30px) translateX(15px); opacity: 0.05; } }
            @keyframes splash-logo-in { 0% { opacity: 0; transform: scale(0.6) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
            @keyframes splash-text-in { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } }
            @keyframes splash-ring-glow { 0% { box-shadow: 0 12px 50px rgba(0,0,0,0.4), 0 0 30px hsla(42,75%,55%,0.06); } 100% { box-shadow: 0 12px 50px rgba(0,0,0,0.4), 0 0 50px hsla(42,75%,55%,0.12); } }
          `}</style>
        </div>
      )}

      {loading && !showSplash && (
        <div className="fixed top-0 left-0 right-0 z-[100]">
          <div
            className="h-[2.5px] rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, hsla(42,75%,55%,0.9), hsla(42,75%,65%,1))",
              boxShadow: progress < 100 ? "0 0 10px hsla(42,75%,55%,0.4)" : "none"
            }}
          />
        </div>
      )}
    </>
  );
}
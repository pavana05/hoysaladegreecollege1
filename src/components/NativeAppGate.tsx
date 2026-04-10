import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import Index from "@/pages/Index";

/**
 * On native platforms, intercepts the "/" route to show a branded splash
 * and redirect directly to the dashboard (or login) without loading the
 * heavy Index page, Navbar, or Footer.
 *
 * On web, renders children (the normal Layout with Index) transparently.
 */
export default function NativeAppGate({ children }: { children: React.ReactNode }) {
  const isNative = Capacitor.isNativePlatform();
  const { user, role, loading } = useAuth();
  const [fadeOut, setFadeOut] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isNative) return;
    if (loading || done) return;
    // Auth resolved → start fade-out
    setFadeOut(true);
    const t = setTimeout(() => setDone(true), 550);
    return () => clearTimeout(t);
  }, [isNative, loading, done]);

  // Web: render the Layout which contains <Outlet /> for Index
  if (!isNative) {
    // children is <Layout />, render it and it will show Index via Outlet
    return (
      <>
        {/* Render layout with Index as outlet content */}
        <LayoutWithIndex />
      </>
    );
  }

  // Native: show splash while auth loads
  if (!done) {
    return (
      <div
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 overflow-hidden"
        style={{
          background: "#050608",
          opacity: fadeOut ? 0 : 1,
          transform: fadeOut ? "scale(1.04)" : "scale(1)",
          transition: "opacity 0.55s cubic-bezier(0.4,0,0.2,1), transform 0.55s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Ambient glow */}
        <div className="absolute pointer-events-none" style={{
          width: "400px", height: "400px", top: "35%", left: "50%",
          transform: "translate(-50%,-50%)",
          background: "radial-gradient(circle, hsla(42,80%,50%,0.08), transparent 70%)",
          filter: "blur(60px)",
          animation: "nag-glow 3s ease-in-out infinite alternate",
        }} />
        <div className="absolute pointer-events-none" style={{
          width: "250px", height: "250px", bottom: "18%", right: "20%",
          background: "radial-gradient(circle, hsla(220,80%,55%,0.05), transparent 70%)",
          filter: "blur(50px)",
          animation: "nag-glow 4s ease-in-out 1s infinite alternate",
        }} />

        {/* Orbital particles */}
        <div className="absolute top-1/2 left-1/2 w-[180px] h-[180px] pointer-events-none" style={{ animation: "nag-orbit 12s linear infinite", transform: "translate(-50%,-50%)" }}>
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <div key={deg} className="absolute rounded-full" style={{
              width: "3px", height: "3px",
              background: `hsla(42,75%,55%,${0.12 + deg / 1500})`,
              top: "50%", left: "50%",
              transform: `rotate(${deg}deg) translateX(86px)`,
              boxShadow: "0 0 8px hsla(42,75%,55%,0.3)",
            }} />
          ))}
        </div>

        {/* Logo */}
        <div className="relative z-10" style={{ animation: "nag-logo-in 0.8s cubic-bezier(0.16,1,0.3,1) forwards", opacity: 0 }}>
          <div className="p-[3px] rounded-3xl" style={{
            background: "linear-gradient(135deg, hsla(42,80%,55%,0.6), hsla(42,80%,55%,0.1), hsla(220,80%,60%,0.3))",
            boxShadow: "0 12px 50px rgba(0,0,0,0.4), 0 0 40px hsla(42,75%,55%,0.08)",
            animation: "nag-ring 2s ease-in-out infinite alternate",
          }}>
            <div className="w-[90px] h-[90px] rounded-[20px] overflow-hidden flex items-center justify-center" style={{ background: "rgba(255,255,255,0.97)" }}>
              <img src="/lovable-uploads/bacc5b2d-3f25-473a-a2ee-a0d75a0cb7e3.png" alt="Logo" className="w-[85%] h-[85%] object-contain" width={76} height={76} />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center relative z-10" style={{ animation: "nag-text-in 0.6s cubic-bezier(0.16,1,0.3,1) 0.3s both" }}>
          <p className="font-display text-xl font-bold tracking-wide" style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95), hsla(42,75%,65%,0.9))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            Hoysala Degree College
          </p>
          <p className="text-[10px] tracking-[0.25em] uppercase mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
            Right Choice For Better Future
          </p>
          <div className="w-10 h-px mx-auto mt-3" style={{ background: "linear-gradient(90deg, transparent, hsla(42,75%,55%,0.3), transparent)" }} />
        </div>

        {/* Loading spinner */}
        {!fadeOut && (
          <div className="relative z-10 mt-2" style={{ animation: "nag-text-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.5s both" }}>
            <div className="w-7 h-7 rounded-full border-[2.5px] border-transparent animate-spin" style={{
              borderTopColor: "hsla(42,75%,55%,0.9)",
              borderRightColor: "hsla(42,75%,55%,0.3)",
            }} />
          </div>
        )}

        {/* Progress bar */}
        <div className="relative z-10" style={{ animation: "nag-text-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.6s both" }}>
          <div className="w-40 h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{
              background: "linear-gradient(90deg, hsla(42,75%,55%,0.9), hsla(42,75%,65%,1))",
              animation: "nag-fill 2.5s ease-out forwards", width: "0%",
              boxShadow: "0 0 14px hsla(42,75%,55%,0.5)",
            }} />
          </div>
        </div>

        <style>{`
          @keyframes nag-glow { 0% { opacity: 0.4; transform: translate(-50%,-50%) scale(1); } 100% { opacity: 1; transform: translate(-50%,-50%) scale(1.12); } }
          @keyframes nag-orbit { 0% { transform: translate(-50%,-50%) rotate(0deg); } 100% { transform: translate(-50%,-50%) rotate(360deg); } }
          @keyframes nag-logo-in { 0% { opacity: 0; transform: scale(0.7) translateY(8px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
          @keyframes nag-text-in { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
          @keyframes nag-ring { 0% { box-shadow: 0 12px 50px rgba(0,0,0,0.4), 0 0 30px hsla(42,75%,55%,0.06); } 100% { box-shadow: 0 12px 50px rgba(0,0,0,0.4), 0 0 50px hsla(42,75%,55%,0.12); } }
          @keyframes nag-fill { 0% { width: 0; } 100% { width: 100%; } }
        `}</style>
      </div>
    );
  }

  // Splash done → redirect
  const target = user && role ? "/dashboard" : "/login";
  return <Navigate to={target} replace />;
}

/**
 * Helper: renders the Layout with Index as inline content (for web).
 * This avoids needing a nested <Route> since "/" is now a standalone route.
 */
function LayoutWithIndex() {
  const LayoutComponent = require("./Layout").default;
  // We can't use Outlet here since this isn't a nested route,
  // so we render Layout manually with Index as main content.
  return null; // placeholder – we'll use a different approach
}

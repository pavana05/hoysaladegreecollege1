import { useEffect, useState } from "react";
import { Fingerprint, ShieldCheck, Lock } from "lucide-react";

interface Props {
  onUnlock: () => Promise<boolean>;
}

export default function AppLockScreen({ onUnlock }: Props) {
  const [verifying, setVerifying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pulse, setPulse] = useState(true);

  const handleUnlock = async () => {
    if (verifying) return;
    setVerifying(true);
    setFailed(false);
    const success = await onUnlock();
    if (!success) {
      setFailed(true);
      setTimeout(() => setFailed(false), 2000);
    }
    setVerifying(false);
  };

  // Auto-trigger on mount
  useEffect(() => {
    const t = setTimeout(handleUnlock, 600);
    return () => clearTimeout(t);
  }, []);

  // Pulse animation toggle
  useEffect(() => {
    const i = setInterval(() => setPulse((p) => !p), 2000);
    return () => clearInterval(i);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center select-none"
      style={{ background: "linear-gradient(165deg, #050709 0%, #0a0d14 45%, #070910 100%)" }}
    >
      {/* Ambient glow */}
      <div className="absolute pointer-events-none" style={{
        width: 420, height: 420, top: "30%", left: "50%",
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(circle, hsla(42,80%,50%,0.08), transparent 70%)",
        filter: "blur(70px)",
        opacity: pulse ? 0.8 : 0.5,
        transition: "opacity 2s ease",
      }} />

      {/* Shield icon */}
      <div className="relative mb-6" style={{ animation: "al-icon-in 0.7s cubic-bezier(0.16,1,0.3,1) forwards", opacity: 0 }}>
        <div className="absolute inset-[-20px] rounded-full" style={{
          border: "1px dashed hsla(42,75%,55%,0.15)",
          animation: "al-ring 10s linear infinite",
        }} />
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px hsla(42,75%,55%,0.12)`,
          }}
        >
          <Lock className="w-10 h-10" style={{ color: "hsla(42,75%,55%,1)" }} strokeWidth={1.5} />
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-10" style={{ animation: "al-text-in 0.6s ease 0.2s both" }}>
        <h2 className="text-xl font-bold mb-2" style={{
          background: "linear-gradient(150deg, rgba(255,255,255,0.95), rgba(255,255,255,0.6))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          App Locked
        </h2>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          {failed ? "Verification failed. Tap to try again." : "Tap the button below to unlock"}
        </p>
      </div>

      {/* Unlock button */}
      <button
        onClick={handleUnlock}
        disabled={verifying}
        className="relative flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-sm overflow-hidden"
        style={{
          animation: "al-text-in 0.6s ease 0.35s both",
          background: "linear-gradient(135deg, hsla(42,75%,55%,1), hsla(42,75%,55%,0.85))",
          color: "#ffffff",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 12px 40px hsla(42,75%,55%,0.3), inset 0 1px 0 rgba(255,255,255,0.25)",
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          opacity: verifying ? 0.7 : 1,
          transform: verifying ? "scale(0.97)" : "scale(1)",
          transition: "all 0.25s ease",
        }}
      >
        <Fingerprint className="w-5 h-5" />
        <span>{verifying ? "Verifying..." : "Unlock with Biometrics"}</span>
        <span className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          animation: "al-shimmer 3s ease-in-out infinite",
        }} />
      </button>

      <style>{`
        @keyframes al-icon-in { from { opacity:0; transform:scale(0.7) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes al-text-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes al-ring { to { transform:rotate(360deg); } }
        @keyframes al-shimmer { 0%{transform:translateX(-100%)} 40%,100%{transform:translateX(100%)} }
      `}</style>
    </div>
  );
}

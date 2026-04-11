import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function PageLoader() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLoading(true);
    setProgress(0);
    const t1 = setTimeout(() => setProgress(50), 30);
    const t2 = setTimeout(() => setProgress(85), 80);
    const t3 = setTimeout(() => setProgress(100), 150);
    const t4 = setTimeout(() => setLoading(false), 250);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [location.pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100]">
      <div
        className="h-[2.5px] rounded-full transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, hsl(var(--secondary)), hsl(var(--primary)), hsl(var(--secondary)))",
          boxShadow: progress < 100 ? "0 0 10px hsl(var(--secondary) / 0.4)" : "none",
        }}
      />
    </div>
  );
}

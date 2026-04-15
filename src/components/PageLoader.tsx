import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import SplashScreen from "./SplashScreen";

export default function PageLoader() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem("hdc_splash_shown");
  });

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem("hdc_splash_shown", "1");
    setShowSplash(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    setProgress(0);
    const t1 = setTimeout(() => setProgress(60), 20);
    const t2 = setTimeout(() => setProgress(90), 60);
    const t3 = setTimeout(() => setProgress(100), 100);
    const t4 = setTimeout(() => setLoading(false), 150);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [location.pathname]);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

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
import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [phase, setPhase] = useState<"enter" | "exit" | "idle">("idle");
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevPath = useRef(location.pathname);
  const isFirst = useRef(true);

  useEffect(() => {
    // First mount: play enter animation
    if (isFirst.current) {
      isFirst.current = false;
      setPhase("enter");
      const t = setTimeout(() => setPhase("idle"), 700);
      return () => clearTimeout(t);
    }

    if (location.pathname === prevPath.current) {
      setDisplayChildren(children);
      return;
    }
    prevPath.current = location.pathname;

    setPhase("exit");
    const exitTimer = setTimeout(() => {
      setDisplayChildren(children);
      setPhase("enter");
      const enterTimer = setTimeout(() => setPhase("idle"), 700);
      return () => clearTimeout(enterTimer);
    }, 200);

    return () => clearTimeout(exitTimer);
  }, [location.pathname, children]);

  const getStyles = (): React.CSSProperties => {
    if (phase === "exit") {
      return {
        opacity: 0,
        transform: "translateY(-8px)",
        transition: "opacity 0.2s ease-out, transform 0.2s ease-out",
        willChange: "opacity, transform",
      };
    }
    if (phase === "enter") {
      return {
        opacity: 1,
        transform: "translateY(0)",
        transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        willChange: "opacity, transform",
      };
    }
    return { opacity: 1, transform: "none" };
  };

  return (
    <div style={getStyles()}>
      {displayChildren}
    </div>
  );
}

import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [phase, setPhase] = useState<"enter" | "exit" | "idle">("idle");
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname === prevPath.current) {
      setDisplayChildren(children);
      return;
    }
    prevPath.current = location.pathname;

    setPhase("exit");
    const exitTimer = setTimeout(() => {
      setDisplayChildren(children);
      setPhase("enter");
      const enterTimer = setTimeout(() => setPhase("idle"), 600);
      return () => clearTimeout(enterTimer);
    }, 250);

    return () => clearTimeout(exitTimer);
  }, [location.pathname, children]);

  const getStyles = (): React.CSSProperties => {
    if (phase === "exit") {
      return {
        opacity: 0,
        transform: "translateY(-12px) scale(0.995)",
        filter: "blur(2px)",
        transition: "opacity 0.25s cubic-bezier(0.4,0,1,1), transform 0.25s cubic-bezier(0.4,0,1,1), filter 0.25s ease",
      };
    }
    if (phase === "enter") {
      return {
        opacity: 1,
        transform: "translateY(0) scale(1)",
        filter: "blur(0px)",
        transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1), filter 0.4s ease-out",
      };
    }
    return {
      opacity: 1,
      transform: "none",
      filter: "none",
      transition: "none",
    };
  };

  return (
    <div className="will-change-[opacity,transform,filter]" style={getStyles()}>
      {displayChildren}
    </div>
  );
}

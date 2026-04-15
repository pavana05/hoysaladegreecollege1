import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState<"idle" | "exit" | "enter">("idle");
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname === prevPath.current) {
      setDisplayChildren(children);
      return;
    }
    prevPath.current = location.pathname;

    // Ultra-fast exit → swap → enter
    setPhase("exit");
    const exitTimer = setTimeout(() => {
      setDisplayChildren(children);
      setPhase("enter");
      // Use rAF to ensure the browser paints the enter state
      requestAnimationFrame(() => {
        setTimeout(() => setPhase("idle"), 300);
      });
    }, 120); // reduced from 250ms

    return () => clearTimeout(exitTimer);
  }, [location.pathname, children]);

  const style: React.CSSProperties =
    phase === "exit"
      ? {
          opacity: 0,
          transform: "translateY(-6px)",
          transition: "opacity 0.12s ease-out, transform 0.12s ease-out",
        }
      : phase === "enter"
      ? {
          opacity: 1,
          transform: "translateY(0)",
          transition: "opacity 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.25s cubic-bezier(0.16,1,0.3,1)",
        }
      : { opacity: 1, transform: "none" };

  return (
    <div style={style}>
      {displayChildren}
    </div>
  );
}

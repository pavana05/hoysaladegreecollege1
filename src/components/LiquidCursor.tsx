import { useEffect, useRef, useState } from "react";

/**
 * Liquid mercury blob cursor.
 * - Small instant dot + larger blob that trails with easing
 * - Blob morphs/stretches based on velocity
 * - Expands when hovering interactive elements
 * - Auto-disables on touch / coarse pointer devices
 */
export default function LiquidCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Disable on touch / mobile / native
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    const isSmall = window.innerWidth < 768;
    if (isCoarse || isSmall) return;
    setEnabled(true);

    const dot = dotRef.current!;
    const blob = blobRef.current!;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let blobX = mouseX;
    let blobY = mouseY;
    let prevBlobX = blobX;
    let prevBlobY = blobY;
    let hovering = false;
    let raf = 0;

    const handleMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate3d(${mouseX - 4}px, ${mouseY - 4}px, 0)`;

      const target = e.target as HTMLElement | null;
      const interactive = !!target?.closest(
        'a, button, [role="button"], input, textarea, select, label, summary, [data-cursor-hover]'
      );
      hovering = interactive;
      blob.dataset.hover = interactive ? "true" : "false";
    };

    const tick = () => {
      // ease toward mouse
      blobX += (mouseX - blobX) * 0.18;
      blobY += (mouseY - blobY) * 0.18;

      const vx = blobX - prevBlobX;
      const vy = blobY - prevBlobY;
      const speed = Math.min(Math.hypot(vx, vy), 40);
      const angle = (Math.atan2(vy, vx) * 180) / Math.PI;
      const stretch = 1 + speed / 80; // up to ~1.5
      const squash = 1 - speed / 160;

      const scale = hovering ? 1.8 : 1;

      blob.style.transform =
        `translate3d(${blobX - 18}px, ${blobY - 18}px, 0) ` +
        `rotate(${angle}deg) scale(${stretch * scale}, ${squash * scale})`;

      prevBlobX = blobX;
      prevBlobY = blobY;
      raf = requestAnimationFrame(tick);
    };

    const handleLeave = () => {
      dot.style.opacity = "0";
      blob.style.opacity = "0";
    };
    const handleEnter = () => {
      dot.style.opacity = "1";
      blob.style.opacity = "0.9";
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("mouseleave", handleLeave);
    document.addEventListener("mouseenter", handleEnter);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("mouseenter", handleEnter);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* SVG goo filter for liquid feel */}
      <svg className="fixed w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="liquid-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div
        className="liquid-cursor-wrap pointer-events-none fixed inset-0 z-[9999]"
        style={{ filter: "url(#liquid-goo)" }}
      >
        <div
          ref={blobRef}
          className="liquid-cursor-blob"
          data-hover="false"
        />
        <div ref={dotRef} className="liquid-cursor-dot" />
      </div>
    </>
  );
}

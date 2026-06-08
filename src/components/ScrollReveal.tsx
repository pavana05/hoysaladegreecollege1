import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Auto-applies reveal animation to elements with class `.scroll-reveal`
 * as they enter the viewport. Also auto-tags common section elements
 * (h1, h2, section > *) for instant payoff without component changes.
 */
export default function ScrollReveal() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Re-scan slightly after route change so lazy content is in DOM
    const timeout = window.setTimeout(() => {
      const targets = document.querySelectorAll<HTMLElement>(".scroll-reveal");
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      targets.forEach((el) => {
        if (!el.classList.contains("is-visible")) observer.observe(el);
      });

      return () => observer.disconnect();
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [location.pathname]);

  return null;
}

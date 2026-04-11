import { useEffect, useRef, useState } from "react";
import { GraduationCap, BookOpen, Trophy, Briefcase } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const step = () => {
          const p = Math.min((Date.now() - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setCount(Math.floor(eased * target));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return { count, ref };
}

const counters = [
  { icon: GraduationCap, value: 5, suffix: "+", label: "Programs Offered", color: "42 87% 55%" },
  { icon: BookOpen, value: 50, suffix: "+", label: "Subjects Taught", color: "215 90% 55%" },
  { icon: Trophy, value: 15, suffix: "+", label: "Awards Won", color: "145 65% 42%" },
  { icon: Briefcase, value: 90, suffix: "%", label: "Placement Rate", color: "280 60% 55%" },
];

export default function LiveCounterBanner() {
  return (
    <section className="py-8 sm:py-12 relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(230,12%,7%), hsl(228,14%,4%))" }} />
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsla(42,75%,55%,0.15), transparent)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsla(42,75%,55%,0.1), transparent)" }} />
      <div className="container px-5 sm:px-4 relative">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
          {counters.map((c, i) => {
            const { count, ref } = useCounter(c.value);
            return (
              <ScrollReveal key={c.label} delay={i * 100}>
                <div ref={ref} className="text-center group cursor-default counter-cascade" style={{ animationDelay: `${i * 150}ms` }}>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-all duration-500 border border-white/[0.06]"
                    style={{ background: `hsla(${c.color}, 0.12)` }}>
                    <c.icon className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform duration-500" style={{ color: `hsl(${c.color})` }} />
                  </div>
                  <div className="font-display text-3xl sm:text-4xl font-bold text-white/90 tracking-tight">{count}{c.suffix}</div>
                  <div className="font-body text-[10px] sm:text-xs text-white/40 mt-1.5 tracking-widest uppercase">{c.label}</div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

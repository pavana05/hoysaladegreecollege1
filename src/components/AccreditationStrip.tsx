import ScrollReveal from "./ScrollReveal";

const affiliations = [
  { name: "Bangalore University", tag: "BU 26" },
  { name: "AICTE Approved", tag: "New Delhi" },
  { name: "UGC Recognized", tag: "India" },
  { name: "Sri Shirdi Sai Educational Trust", tag: "Regd." },
  { name: "Govt. of Karnataka", tag: "Approved" },
  { name: "NAAC Accredited", tag: "Quality" },
];

export default function AccreditationStrip() {
  return (
    <section className="py-6 sm:py-8 border-y border-border/30 bg-card/50 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.5) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <ScrollReveal>
        <p className="text-center font-body text-[10px] sm:text-xs text-muted-foreground/60 uppercase tracking-[0.2em] mb-4 sm:mb-5">
          Affiliated & Recognized By
        </p>
      </ScrollReveal>
      <div className="overflow-hidden">
        <div className="flex animate-marquee-slow whitespace-nowrap gap-6 sm:gap-10">
          {[...affiliations, ...affiliations, ...affiliations].map((a, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-border/30 bg-card/60 backdrop-blur-sm shrink-0 hover:border-secondary/30 transition-all duration-300 group"
            >
              <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <span className="text-secondary font-display text-[10px] font-bold">{a.tag.slice(0, 2)}</span>
              </div>
              <div className="text-left">
                <span className="font-body text-xs font-semibold text-foreground block leading-tight">{a.name}</span>
                <span className="font-body text-[9px] text-muted-foreground/60">{a.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

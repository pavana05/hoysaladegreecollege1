import { GraduationCap, ShieldCheck, Award, Landmark, BadgeCheck, Sparkles } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const affiliations = [
  {
    name: "Bangalore University",
    tag: "BU 26",
    Icon: GraduationCap,
    color: "from-blue-400 to-indigo-500",
    glow: "shadow-indigo-500/30",
  },
  {
    name: "AICTE Approved",
    tag: "New Delhi",
    Icon: ShieldCheck,
    color: "from-emerald-400 to-teal-500",
    glow: "shadow-emerald-500/30",
  },
  {
    name: "UGC Recognized",
    tag: "India",
    Icon: Award,
    color: "from-amber-400 to-orange-500",
    glow: "shadow-amber-500/30",
  },
  {
    name: "Sri Shirdi Sai Educational Trust",
    tag: "Regd.",
    Icon: Sparkles,
    color: "from-fuchsia-400 to-pink-500",
    glow: "shadow-fuchsia-500/30",
  },
  {
    name: "Govt. of Karnataka",
    tag: "Approved",
    Icon: Landmark,
    color: "from-rose-400 to-red-500",
    glow: "shadow-rose-500/30",
  },
  {
    name: "NAAC Accredited",
    tag: "Quality",
    Icon: BadgeCheck,
    color: "from-violet-400 to-purple-500",
    glow: "shadow-violet-500/30",
  },
];

export default function AccreditationStrip() {
  return (
    <section className="py-8 sm:py-10 border-y border-border/30 bg-card/50 backdrop-blur-sm relative overflow-hidden">
      {/* Dot grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--foreground) / 0.5) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* Soft ambient glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[60%] h-48 bg-secondary/10 blur-3xl rounded-full pointer-events-none" />

      <ScrollReveal>
        <div className="flex items-center justify-center gap-3 mb-5 sm:mb-6">
          <span className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-secondary/40" />
          <p className="text-center font-body text-[10px] sm:text-xs text-muted-foreground/70 uppercase tracking-[0.25em]">
            Affiliated & Recognized By
          </p>
          <span className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-secondary/40" />
        </div>
      </ScrollReveal>

      {/* Edge fade masks */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-24 z-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-24 z-10 bg-gradient-to-l from-background to-transparent" />

        <div className="flex animate-marquee-slow whitespace-nowrap gap-4 sm:gap-6 py-2">
          {[...affiliations, ...affiliations, ...affiliations].map((a, i) => {
            const Icon = a.Icon;
            return (
              <div
                key={i}
                className="group relative inline-flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-2xl border border-border/40 bg-card/70 backdrop-blur-md shrink-0 hover:-translate-y-0.5 hover:border-secondary/40 transition-all duration-300 hover:shadow-xl"
              >
                {/* 3D icon tile */}
                <div className="relative shrink-0">
                  {/* Glow halo */}
                  <div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${a.color} opacity-40 blur-md group-hover:opacity-70 transition-opacity duration-500`}
                  />
                  {/* Tile body */}
                  <div
                    className={`relative w-11 h-11 rounded-2xl bg-gradient-to-br ${a.color} flex items-center justify-center shadow-lg ${a.glow} group-hover:scale-110 group-hover:rotate-[-4deg] transition-all duration-500`}
                    style={{
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 4px rgba(0,0,0,0.25), 0 8px 20px -6px rgba(0,0,0,0.4)",
                    }}
                  >
                    {/* Top gloss */}
                    <div className="absolute inset-x-1 top-0.5 h-1/2 rounded-t-[14px] bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                    <Icon
                      className="relative w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                      strokeWidth={2.2}
                    />
                  </div>
                </div>

                <div className="text-left">
                  <span className="font-body text-xs sm:text-[13px] font-semibold text-foreground block leading-tight">
                    {a.name}
                  </span>
                  <span className="font-body text-[9px] sm:text-[10px] text-muted-foreground/70 uppercase tracking-wider">
                    {a.tag}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import {
  GraduationCap,
  ClipboardCheck,
  Briefcase,
  Trophy,
  CalendarDays,
  Cpu,
  BookOpen,
  Megaphone,
  LucideIcon,
} from "lucide-react";

type Item = {
  text: string;
  Icon: LucideIcon;
  color: string; // tailwind gradient stops
  glow: string;
};

const items: Item[] = [
  {
    text: "Admissions Open for 2026–27",
    Icon: GraduationCap,
    color: "from-indigo-400 to-blue-500",
    glow: "shadow-indigo-500/30",
  },
  {
    text: "Weekly Tests for CA & CS Students",
    Icon: ClipboardCheck,
    color: "from-emerald-400 to-teal-500",
    glow: "shadow-emerald-500/30",
  },
  {
    text: "Placement Updates — 90% Placement Rate",
    Icon: Briefcase,
    color: "from-amber-400 to-orange-500",
    glow: "shadow-amber-500/30",
  },
  {
    text: "Scholarships for Meritorious Students",
    Icon: Trophy,
    color: "from-yellow-400 to-amber-500",
    glow: "shadow-yellow-500/30",
  },
  {
    text: "Annual Cultural Fest — Coming Soon",
    Icon: CalendarDays,
    color: "from-fuchsia-400 to-pink-500",
    glow: "shadow-fuchsia-500/30",
  },
  {
    text: "AI & ML Workshops Every Month",
    Icon: Cpu,
    color: "from-cyan-400 to-sky-500",
    glow: "shadow-cyan-500/30",
  },
  {
    text: "Exclusive CA / CS / CMA Coaching",
    Icon: BookOpen,
    color: "from-violet-400 to-purple-500",
    glow: "shadow-violet-500/30",
  },
];

export default function InfoSlider() {
  const loop = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-y border-border/40 bg-gradient-to-r from-card/60 via-background/40 to-card/60 backdrop-blur-md">
      {/* Ambient top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-secondary/20 to-transparent" />

      <div className="flex items-stretch">
        {/* Leading label badge */}
        <div className="relative shrink-0 hidden sm:flex items-center gap-2 pl-5 pr-4 py-3 z-20 bg-gradient-to-r from-background via-background to-background/80">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-secondary/40 blur-md" />
            <div
              className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 4px rgba(0,0,0,0.25), 0 6px 14px -4px rgba(0,0,0,0.4)",
              }}
            >
              <Megaphone className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" strokeWidth={2.2} />
            </div>
          </div>
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/80">
            Live Updates
          </span>
          <div className="h-6 w-px bg-border/60 ml-1" />
        </div>

        {/* Marquee region with edge fades */}
        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-16 z-10 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-16 z-10 bg-gradient-to-l from-background to-transparent" />

          <div className="animate-marquee whitespace-nowrap flex items-center gap-3 sm:gap-4 py-3">
            {loop.map((item, i) => {
              const Icon = item.Icon;
              return (
                <div key={i} className="inline-flex items-center gap-3 shrink-0">
                  <div className="group inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full border border-border/40 bg-card/70 backdrop-blur-sm hover:border-secondary/40 transition-colors duration-300">
                    {/* 3D icon chip */}
                    <div className="relative shrink-0">
                      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${item.color} opacity-50 blur-[6px]`} />
                      <div
                        className={`relative w-7 h-7 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md ${item.glow}`}
                        style={{
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 3px rgba(0,0,0,0.25), 0 4px 10px -2px rgba(0,0,0,0.35)",
                        }}
                      >
                        <Icon className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" strokeWidth={2.4} />
                      </div>
                    </div>
                    <span className="font-body text-xs sm:text-[13px] font-medium text-foreground/90 tracking-tight">
                      {item.text}
                    </span>
                  </div>
                  {/* Separator dot */}
                  <span className="w-1 h-1 rounded-full bg-secondary/50" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

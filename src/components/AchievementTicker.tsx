import { Trophy, Briefcase, GraduationCap, Medal, Star } from "lucide-react";

const achievements = [
  { icon: Trophy, text: "Anusha C.H scored 98.14% — University Topper 2025" },
  { icon: Briefcase, text: "15+ students placed at Infosys & Wipro this year" },
  { icon: GraduationCap, text: "100% pass rate in BCA 2024 batch" },
  { icon: Medal, text: "Simran B. scored 94.14% — B.Com distinction" },
  { icon: Star, text: "Best College Award — Bangalore University 2024" },
  { icon: Briefcase, text: "Kiran R. placed at Deloitte — BBA 2024" },
  { icon: Trophy, text: "NSS Best Unit Award — State Level 2024" },
  { icon: GraduationCap, text: "CA Foundation — 85% first-attempt pass rate" },
];

export default function AchievementTicker() {
  const doubled = [...achievements, ...achievements];

  return (
    <section className="py-4 sm:py-5 overflow-hidden relative border-y border-border/20">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, hsl(230,12%,7%), hsl(228,10%,4%))" }}
      />
      {/* Top/bottom accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/10 to-transparent" />

      <div className="relative flex items-center">
        {/* Left label */}
        <div className="hidden sm:flex shrink-0 items-center gap-2 px-6 border-r border-white/10">
          <Trophy className="w-4 h-4 text-secondary" />
          <span className="font-body text-[10px] font-bold text-secondary uppercase tracking-[0.2em] whitespace-nowrap">
            Achievements
          </span>
        </div>

        {/* Scrolling ticker */}
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-[ticker_40s_linear_infinite] hover:[animation-play-state:paused]">
            {doubled.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 px-6 sm:px-8 shrink-0">
                <a.icon className="w-3.5 h-3.5 text-secondary shrink-0" />
                <span className="font-body text-xs text-white/70 whitespace-nowrap">{a.text}</span>
                <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

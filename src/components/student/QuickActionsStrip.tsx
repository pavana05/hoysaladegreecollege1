import { Link } from "react-router-dom";
import { Timer, Calendar, IndianRupee, MessageSquare, Trophy, Settings, type LucideIcon } from "lucide-react";

interface Action {
  icon: LucideIcon;
  label: string;
  to?: string;
  onClick?: () => void;
  hue: string; // hsl triplet
}

interface Props { onFocusOpen: () => void; }

export default function QuickActionsStrip({ onFocusOpen }: Props) {
  const actions: Action[] = [
    { icon: Timer, label: "Focus", onClick: onFocusOpen, hue: "265 70% 60%" },
    { icon: Calendar, label: "Timetable", to: "/dashboard/student/timetable", hue: "200 70% 55%" },
    { icon: IndianRupee, label: "Pay Fees", to: "/dashboard/student/fees", hue: "145 65% 45%" },
    { icon: MessageSquare, label: "Messages", to: "/dashboard/student/messages", hue: "330 70% 60%" },
    { icon: Trophy, label: "Achievements", to: "/dashboard/student/gamification", hue: "42 90% 55%" },
    { icon: Settings, label: "Settings", to: "/dashboard/student/settings", hue: "220 10% 55%" },
  ];

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 font-semibold">Quick Actions</p>
      </div>
      <div className="-mx-1 px-1 flex gap-2.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
        {actions.map((a, i) => {
          const Content = (
            <div
              className="group relative shrink-0 snap-start w-[88px] h-[88px] rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl flex flex-col items-center justify-center gap-1.5 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 overflow-hidden touch-manipulation"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle at 50% 0%, hsl(${a.hue} / 0.18), transparent 70%)` }}
              />
              <div
                className="relative w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: `hsl(${a.hue} / 0.12)`,
                  boxShadow: `inset 0 0 0 1px hsl(${a.hue} / 0.18)`,
                }}
              >
                <a.icon className="w-4 h-4" style={{ color: `hsl(${a.hue})` }} />
              </div>
              <span className="relative font-body text-[10.5px] font-semibold text-foreground/85 tracking-tight">{a.label}</span>
            </div>
          );
          return a.to
            ? <Link key={a.label} to={a.to} className="contents">{Content}</Link>
            : <button key={a.label} onClick={a.onClick} className="contents">{Content}</button>;
        })}
      </div>
    </div>
  );
}

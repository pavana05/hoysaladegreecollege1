import { LucideIcon } from "lucide-react";

export interface QuickStat {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

interface QuickStatsRowProps {
  stats: QuickStat[];
}

/**
 * 3-up mini-card grid — same proportions as the AdminAppUpdates hero stats.
 */
export function QuickStatsRow({ stats }: QuickStatsRowProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {stats.map((s, i) => (
        <div
          key={i}
          className="px-3 sm:px-4 py-3 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <s.icon className="w-3 h-3 text-muted-foreground" strokeWidth={2.2} />
            <span className="font-body text-[10px] uppercase tracking-wider text-muted-foreground truncate">
              {s.label}
            </span>
          </div>
          <p className="font-display text-base sm:text-lg font-bold text-foreground truncate">
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

import { LucideIcon } from "lucide-react";

type Variant = "live" | "idle" | "warn" | "neutral";

interface StatChipProps {
  variant?: Variant;
  icon?: LucideIcon;
  label: string;
  value?: string | number;
  pulse?: boolean;
}

const styles: Record<Variant, string> = {
  live: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  idle: "bg-muted/40 border-border/40 text-muted-foreground",
  warn: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300",
  neutral: "bg-background/60 backdrop-blur-xl border-border/40 text-foreground",
};

/**
 * Status pill — same chip system as AdminAppUpdates (live / idle / warn / neutral).
 */
export function StatChip({ variant = "neutral", icon: Icon, label, value, pulse }: StatChipProps) {
  return (
    <div className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border ${styles[variant]}`}>
      {pulse ? (
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
        </span>
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5 opacity-80" />
      ) : null}
      <span className="font-body text-xs">{label}</span>
      {value !== undefined && value !== null && (
        <span className="font-mono text-xs font-semibold">{value}</span>
      )}
    </div>
  );
}

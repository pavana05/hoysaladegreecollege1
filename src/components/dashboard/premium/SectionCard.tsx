import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface SectionCardProps {
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: "default" | "tight" | "none";
}

/**
 * Premium content surface — rounded-[2rem] glassmorphic card with optional
 * iOS-style section header (gradient icon-tile + title + subline).
 */
export function SectionCard({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
  className = "",
  padding = "default",
}: SectionCardProps) {
  const pad =
    padding === "none" ? "" : padding === "tight" ? "p-5 sm:p-6" : "p-6 sm:p-8";

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] bg-card/80 backdrop-blur-2xl border border-border/40 shadow-[0_4px_30px_-8px_rgba(0,0,0,0.08)] ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className={`relative ${pad}`}>
        {(title || Icon) && (
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              {Icon && (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px] text-primary" strokeWidth={2.2} />
                </div>
              )}
              {(title || subtitle) && (
                <div className="min-w-0">
                  {title && (
                    <h2 className="font-display text-lg font-semibold text-foreground tracking-tight">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="font-body text-xs text-muted-foreground truncate">{subtitle}</p>
                  )}
                </div>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

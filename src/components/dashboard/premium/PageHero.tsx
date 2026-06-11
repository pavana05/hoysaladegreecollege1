import { LucideIcon, Sparkles } from "lucide-react";
import { ReactNode } from "react";

interface PageHeroProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle?: string;
  chip?: ReactNode;
}

/**
 * Premium aurora hero card — matches the AdminAppUpdates page header exactly.
 * Wraps the page title with the iOS-style icon tile, gradient orbs, and a
 * right-side chip slot for the page's primary live metric.
 */
export function PageHero({ icon: Icon, eyebrow, title, subtitle, chip }: PageHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-card via-card to-card/80 border border-border/30 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
      {/* Aurora gradients */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[120px] opacity-50 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsla(var(--primary), 0.35), transparent 70%)" }}
      />
      <div
        className="absolute -bottom-40 -left-32 w-96 h-96 rounded-full blur-[120px] opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsla(var(--gold, 45 90% 60%), 0.25), transparent 70%)" }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative p-6 sm:p-9">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
            {/* iOS app icon tile */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-[1.4rem] bg-gradient-to-br from-primary to-primary/60 blur-xl opacity-50" />
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-[1.4rem] bg-gradient-to-br from-primary via-primary to-primary/70 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-8px_rgba(0,0,0,0.4)]">
                <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" strokeWidth={2.2} />
                <div className="absolute inset-0 rounded-[1.4rem] bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2.5">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="font-body text-[10px] font-semibold tracking-[0.15em] uppercase text-primary">
                  {eyebrow}
                </span>
              </div>
              <h1 className="font-display text-[24px] sm:text-[32px] font-bold text-foreground tracking-tight leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="font-body text-[14px] sm:text-[15px] text-muted-foreground mt-1.5 leading-snug max-w-md">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {chip && <div className="flex flex-col gap-2 shrink-0">{chip}</div>}
        </div>
      </div>
    </div>
  );
}

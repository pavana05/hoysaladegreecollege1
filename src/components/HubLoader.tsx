/**
 * HubLoader — premium loading animation used between lazy-loaded
 * admin / dashboard sub-pages. Designed to feel calm, on-brand and
 * intentional rather than a generic CSS spinner.
 *
 * Visuals:
 *  - Twin counter-rotating arcs in the brand primary
 *  - Soft pulsing glow underneath
 *  - Subtle orbiting dot to add life
 *  - Animated shimmer label
 *
 * Uses only design tokens (primary / muted-foreground) so it adapts
 * to light & dark themes automatically.
 */
export default function HubLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center justify-center gap-4 py-16 animate-fade-in"
    >
      <div className="relative w-14 h-14">
        {/* Glow */}
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />

        {/* Outer arc */}
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent
                     border-t-primary border-r-primary/70
                     animate-spin"
          style={{ animationDuration: "1.1s" }}
        />

        {/* Inner counter-rotating arc */}
        <div
          className="absolute inset-1.5 rounded-full border-2 border-transparent
                     border-b-primary/80 border-l-primary/40 animate-spin"
          style={{ animationDuration: "1.6s", animationDirection: "reverse" }}
        />

        {/* Center dot */}
        <div className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />

        {/* Orbiting dot */}
        <div
          className="absolute inset-0 animate-spin"
          style={{ animationDuration: "2.2s" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary/80 shadow-[0_0_8px_hsl(var(--primary))]" />
        </div>
      </div>

      <div className="relative overflow-hidden">
        <span className="font-body text-xs tracking-[0.18em] uppercase text-muted-foreground">
          {label}
        </span>
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full
                     bg-gradient-to-r from-transparent via-foreground/40 to-transparent
                     animate-[shimmer_1.8s_ease-in-out_infinite]"
        />
      </div>
      <span className="sr-only">Loading content…</span>
    </div>
  );
}

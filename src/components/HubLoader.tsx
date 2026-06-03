import { Component as PencilLoader } from "@/components/ui/loader-1";

/**
 * HubLoader — shared loading state for lazy-loaded dashboard sub-pages.
 * Uses the animated pencil SVG loader and a soft shimmer label.
 *
 * Themed via design tokens (primary / secondary / muted) so it adapts to
 * both light and dark dashboards.
 */
export default function HubLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center justify-center gap-5 py-16 animate-fade-in text-primary"
    >
      <div className="relative">
        {/* Soft glow halo */}
        <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl animate-pulse" />
        <PencilLoader size={128} />
      </div>

      <div className="relative overflow-hidden">
        <span className="font-body text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
          {label}
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full
                     bg-gradient-to-r from-transparent via-foreground/30 to-transparent
                     animate-[shimmer_1.8s_ease-in-out_infinite]"
        />
      </div>
      <span className="sr-only">Loading content…</span>
    </div>
  );
}

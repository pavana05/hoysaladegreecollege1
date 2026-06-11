import { ReactNode } from "react";

/**
 * PremiumAdminShell
 * ---------------------------------------------------------------------------
 * Wraps every admin / super-admin page in the unified iOS-style premium
 * surface borrowed from the Student Fee Hub:
 *   • Twin aurora wash (gold + emerald) painted behind content
 *   • Glass surface defaults applied to shadcn Card / Tabs / Inputs inside
 *     the `.premium-admin-scope` CSS scope so every page inherits the look
 *     without needing per-page rewrites.
 *
 * Strictly visual — no behavioural change to the wrapped routes.
 */

const GOLD_SOFT = "rgba(212,175,55,0.22)";
const EMERALD_SOFT = "rgba(52,199,89,0.18)";

export default function PremiumAdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="premium-admin-scope relative isolate">
      {/* Aurora washes – pinned to the shell, scroll-static via fixed bg */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 -right-20 w-[520px] h-[520px] rounded-full blur-[140px] opacity-60 -z-10"
        style={{ background: `radial-gradient(circle, ${GOLD_SOFT}, transparent 70%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 -left-24 w-[560px] h-[560px] rounded-full blur-[150px] opacity-50 -z-10"
        style={{ background: `radial-gradient(circle, ${EMERALD_SOFT}, transparent 70%)` }}
      />

      <div className="relative max-w-7xl mx-auto px-3 sm:px-5 py-2 sm:py-4">
        {children}
      </div>

      {/* Scoped premium overrides – upgrade default shadcn surfaces */}
      <style>{`
        .premium-admin-scope [data-slot="card"],
        .premium-admin-scope .premium-card,
        .premium-admin-scope > * .border.bg-card,
        .premium-admin-scope > * .rounded-lg.border.bg-card {
          border-radius: 2rem !important;
          background: hsl(var(--card) / 0.55) !important;
          backdrop-filter: blur(24px) saturate(140%);
          -webkit-backdrop-filter: blur(24px) saturate(140%);
          border-color: hsl(var(--border) / 0.4) !important;
          box-shadow:
            0 1px 0 hsl(var(--foreground) / 0.04) inset,
            0 24px 60px -32px hsl(0 0% 0% / 0.55);
          transition: box-shadow .35s ease, transform .35s ease, border-color .35s ease;
        }
        .premium-admin-scope [role="tablist"] {
          background: hsl(var(--card) / 0.45) !important;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid hsl(var(--border) / 0.4) !important;
          border-radius: 9999px !important;
          padding: 4px !important;
        }
        .premium-admin-scope [role="tab"][data-state="active"] {
          background: hsl(var(--background) / 0.9) !important;
          box-shadow: 0 4px 14px -6px hsl(0 0% 0% / 0.35) !important;
        }
        .premium-admin-scope input:not([type="checkbox"]):not([type="radio"]),
        .premium-admin-scope textarea,
        .premium-admin-scope select {
          background: hsl(var(--background) / 0.55) !important;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-radius: 14px !important;
        }
        .premium-admin-scope h1,
        .premium-admin-scope h2 {
          letter-spacing: -0.01em;
        }
      `}</style>
    </div>
  );
}

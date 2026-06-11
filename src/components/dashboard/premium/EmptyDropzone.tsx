import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface EmptyDropzoneProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  state?: "idle" | "active" | "filled";
  children?: ReactNode;
}

/**
 * Dashed empty/upload surface — same as the APK dropzone on AdminAppUpdates.
 * Use for file inputs, "no data yet" states, and "select to begin" prompts.
 */
export function EmptyDropzone({
  icon: Icon,
  title,
  hint,
  state = "idle",
  children,
}: EmptyDropzoneProps) {
  const border =
    state === "active"
      ? "border-primary bg-primary/5 scale-[1.01]"
      : state === "filled"
      ? "border-emerald-500/40 bg-emerald-500/5"
      : "border-border/60 hover:border-primary/40 hover:bg-muted/20";

  return (
    <div
      className={`group relative block rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden ${border}`}
    >
      <div className="p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 mx-auto flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-7 h-7 text-primary" strokeWidth={2.2} />
        </div>
        <p className="font-display text-sm font-semibold text-foreground">{title}</p>
        {hint && <p className="font-body text-xs text-muted-foreground mt-1">{hint}</p>}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}

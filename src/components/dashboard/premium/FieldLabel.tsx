import { LabelHTMLAttributes } from "react";

/** Uppercase micro-label matching the AdminAppUpdates form labels. */
export function FieldLabel({
  children,
  className = "",
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2 ${className}`}
      {...rest}
    >
      {children}
    </label>
  );
}

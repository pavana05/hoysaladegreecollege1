import { ButtonHTMLAttributes, ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PrimaryCTAProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  children: ReactNode;
  loading?: boolean;
}

/**
 * Gradient pill CTA — matches the "Publish to all users" button on AdminAppUpdates.
 */
export function PrimaryCTA({
  icon: Icon,
  children,
  loading,
  disabled,
  className = "",
  ...rest
}: PrimaryCTAProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground font-display font-semibold text-[15px] tracking-tight py-3.5 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)] hover:shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.7)] active:scale-[0.98] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none ${className}`}
      {...rest}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="relative flex items-center justify-center gap-2">
        {Icon && <Icon className="w-5 h-5" strokeWidth={2.2} />}
        {children}
      </span>
    </button>
  );
}

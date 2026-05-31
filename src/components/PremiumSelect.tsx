import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PremiumSelectOption {
  value: string;
  label: string;
}

interface PremiumSelectProps {
  value: string;
  onValueChange: (v: string) => void;
  options: PremiumSelectOption[];
  placeholder: string;
  icon?: React.ReactNode;
  focused?: boolean;
  onOpenChange?: (open: boolean) => void;
  ariaLabel?: string;
  required?: boolean;
  invalid?: boolean;
  ariaDescribedBy?: string;
  triggerRef?: React.Ref<HTMLButtonElement>;
  triggerClassName?: string;
}

/**
 * Apple/iOS-inspired premium select.
 * - Glassmorphic popup (backdrop-blur + saturation)
 * - Soft elevation, specular top edge
 * - Smooth scale+fade open/close
 * - Neutral vibrancy highlight (no harsh accent fill on hover)
 */
export function PremiumSelect({
  value,
  onValueChange,
  options,
  placeholder,
  icon,
  focused,
  onOpenChange,
  ariaLabel,
  required,
  invalid,
  ariaDescribedBy,
  triggerRef,
  triggerClassName,
}: PremiumSelectProps) {
  return (
    <SelectPrimitive.Root
      value={value || undefined}
      onValueChange={onValueChange}
      onOpenChange={onOpenChange}
      required={required}
    >
      <div className="relative">
        {icon}
        <SelectPrimitive.Trigger
          ref={triggerRef}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy}
          className={cn(
            "group w-full flex items-center justify-between bg-transparent border rounded-xl pl-11 pr-10 py-3 font-body text-sm text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40",
            "data-[state=open]:border-secondary/60 data-[state=open]:shadow-[0_0_15px_rgba(212,175,55,0.15)]",
            focused ? "border-secondary/60 shadow-[0_0_15px_rgba(212,175,55,0.15)]" : "border-border/30",
            !value && "text-muted-foreground/50",
            invalid && "border-rose-500/60",
            triggerClassName
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 transition-all duration-300 group-data-[state=open]:rotate-180 group-data-[state=open]:text-secondary" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
      </div>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={8}
          className={cn(
            "relative z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-border/40",
            "bg-popover/85 backdrop-blur-2xl backdrop-saturate-[180%]",
            "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)_inset]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          )}
        >
          {/* Specular top edge */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />
          <SelectPrimitive.Viewport className="p-1.5">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-xl py-2.5 pl-9 pr-3 font-body text-[13px] text-foreground outline-none transition-colors duration-150",
                  "data-[highlighted]:bg-foreground/[0.06] data-[state=checked]:bg-secondary/[0.08] data-[state=checked]:text-secondary data-[state=checked]:font-medium"
                )}
              >
                <span className="absolute left-2.5 flex h-5 w-5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-3.5 w-3.5 text-secondary" strokeWidth={3} />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

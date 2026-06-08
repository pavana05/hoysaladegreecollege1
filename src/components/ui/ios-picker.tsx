import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";

export interface IOSPickerOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

interface IOSPickerProps {
  value: string;
  onChange: (value: string) => void;
  options: IOSPickerOption[];
  label?: string;
  title?: string;
  placeholder?: string;
  className?: string;
}

export function IOSPicker({
  value,
  onChange,
  options,
  title = "Select",
  placeholder = "Select an option",
  className = "",
}: IOSPickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      document.body.style.overflow = "hidden";
    } else {
      const t = setTimeout(() => setMounted(false), 280);
      document.body.style.overflow = "";
      return () => clearTimeout(t);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group w-full border border-border rounded-xl px-3.5 py-2.5 font-body text-sm bg-background hover:bg-muted/40 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all flex items-center justify-between gap-2 ${className}`}
      >
        <span className={`truncate text-left ${selected ? "text-foreground" : "text-muted-foreground"}`}>
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.icon && <span className="text-base leading-none">{selected.icon}</span>}
              {selected.label}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-hover:text-primary" />
      </button>

      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center transition-all duration-300 ${
              open ? "bg-black/50 backdrop-blur-md" : "bg-black/0 backdrop-blur-0 pointer-events-none"
            }`}
            onClick={() => setOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full sm:max-w-md mx-auto sm:mx-4 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                open
                  ? "translate-y-0 sm:scale-100 opacity-100"
                  : "translate-y-full sm:translate-y-0 sm:scale-95 opacity-0"
              }`}
            >
              <div className="relative bg-card/95 backdrop-blur-2xl border border-border/60 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden">
                {/* iOS-style grabber */}
                <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Subtle gradient sheen */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] bg-primary/10 pointer-events-none" />

                {/* Header */}
                <div className="relative flex items-center justify-between px-5 pt-3 pb-3 border-b border-border/40">
                  <div className="w-8" />
                  <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Options */}
                <div className="relative max-h-[60vh] overflow-y-auto px-2 py-2">
                  {options.map((opt, i) => {
                    const active = opt.value === value;
                    return (
                      <button
                        key={opt.value || `__${i}`}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setOpen(false);
                        }}
                        className={`w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all duration-200 ${
                          active
                            ? "bg-primary/10 border border-primary/30"
                            : "border border-transparent hover:bg-muted/60 active:scale-[0.985]"
                        }`}
                        style={{ animation: `iosPickerItem 0.35s cubic-bezier(0.32,0.72,0,1) ${i * 0.025}s both` }}
                      >
                        {opt.icon && (
                          <span className="w-9 h-9 shrink-0 rounded-xl bg-muted/70 flex items-center justify-center text-lg">
                            {opt.icon}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={`font-body text-sm truncate ${active ? "font-semibold text-foreground" : "text-foreground/90"}`}>
                            {opt.label}
                          </p>
                          {opt.description && (
                            <p className="font-body text-xs text-muted-foreground truncate">{opt.description}</p>
                          )}
                        </div>
                        {active && (
                          <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Safe area bottom padding (mobile) */}
                <div className="h-[env(safe-area-inset-bottom)] sm:h-2" />
              </div>
            </div>

            <style>{`
              @keyframes iosPickerItem {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>,
          document.body
        )}
    </>
  );
}

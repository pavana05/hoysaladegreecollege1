import { Children, isValidElement, ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";

interface IOSSelectProps {
  value?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  title?: string;
  placeholder?: string;
  id?: string;
  name?: string;
}

interface Opt { value: string; label: string; disabled?: boolean; }

function extractOptions(children: ReactNode): Opt[] {
  const out: Opt[] = [];
  const walk = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      const type: any = child.type;
      const typeName = typeof type === "string" ? type : type?.displayName || type?.name;
      if (typeName === "option") {
        const props: any = child.props;
        const label = typeof props.children === "string"
          ? props.children
          : Array.isArray(props.children)
            ? props.children.filter((c: any) => typeof c === "string" || typeof c === "number").join("")
            : String(props.children ?? "");
        out.push({ value: String(props.value ?? ""), label: label.trim(), disabled: !!props.disabled });
      } else if (typeName === "optgroup") {
        walk((child.props as any).children);
      } else if ((child.props as any)?.children) {
        walk((child.props as any).children);
      }
    });
  };
  walk(children);
  return out;
}

export function IOSSelect({
  value,
  onChange,
  children,
  className = "",
  disabled,
  title = "Select",
  placeholder,
}: IOSSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const options = useMemo(() => extractOptions(children), [children]);
  const selected = options.find((o) => o.value === String(value ?? ""));

  useEffect(() => {
    if (open) {
      setMounted(true);
      document.body.style.overflow = "hidden";
    } else {
      const t = setTimeout(() => setMounted(false), 280);
      document.body.style.overflow = "";
      return () => clearTimeout(t);
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handlePick = (v: string) => {
    onChange?.({ target: { value: v } });
    setOpen(false);
  };

  // Default styling mirrors the typical form input look used across the app
  const baseClass = `w-full text-left border border-border rounded-xl px-3.5 py-2.5 font-body text-sm bg-background hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all flex items-center justify-between gap-2 ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        className={className ? `${className} flex items-center justify-between gap-2 text-left cursor-pointer` : baseClass}
      >
        <span className={`truncate ${selected ? "text-foreground" : "text-muted-foreground"}`}>
          {selected ? selected.label : (placeholder || options[0]?.label || "Select")}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {mounted && createPortal(
        <div
          className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center transition-all duration-300 ${open ? "bg-black/50 backdrop-blur-md" : "bg-black/0 backdrop-blur-0 pointer-events-none"}`}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full sm:max-w-md mx-auto sm:mx-4 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "translate-y-0 sm:scale-100 opacity-100" : "translate-y-full sm:translate-y-0 sm:scale-95 opacity-0"}`}
          >
            <div className="relative bg-card/95 backdrop-blur-2xl border border-border/60 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden">
              <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />
              <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] bg-primary/10 pointer-events-none" />

              <div className="relative flex items-center justify-between px-5 pt-3 pb-3 border-b border-border/40">
                <div className="w-8" />
                <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="relative max-h-[60vh] overflow-y-auto px-2 py-2">
                {options.length === 0 && (
                  <p className="text-center font-body text-sm text-muted-foreground py-6">No options</p>
                )}
                {options.map((opt, i) => {
                  const active = opt.value === String(value ?? "");
                  return (
                    <button
                      key={`${opt.value}-${i}`}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => !opt.disabled && handlePick(opt.value)}
                      className={`w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all duration-200 ${active ? "bg-primary/10 border border-primary/30" : "border border-transparent hover:bg-muted/60 active:scale-[0.985]"} ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      style={{ animation: `iosSelItem 0.35s cubic-bezier(0.32,0.72,0,1) ${Math.min(i, 15) * 0.022}s both` }}
                    >
                      <span className={`flex-1 min-w-0 truncate font-body text-sm ${active ? "font-semibold text-foreground" : "text-foreground/90"}`}>
                        {opt.label || <span className="text-muted-foreground italic">—</span>}
                      </span>
                      {active && (
                        <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="h-[env(safe-area-inset-bottom)] sm:h-2" />
            </div>
          </div>
          <style>{`@keyframes iosSelItem { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>,
        document.body
      )}
    </>
  );
}

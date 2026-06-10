import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * iOS Home-Screen style "Glossy Squircle Tile" wrapping a Lucide icon.
 * Rounded-2xl gradient tile + white glyph + glossy highlight + soft shadow.
 */
export type IOSIconTone =
  | "blue" | "green" | "orange" | "red" | "purple" | "pink"
  | "indigo" | "teal" | "yellow" | "graphite" | "rose" | "cyan";

const TONES: Record<IOSIconTone, { from: string; to: string; shadow: string }> = {
  blue:     { from: "#0A84FF", to: "#0066D6", shadow: "10,132,255" },
  green:    { from: "#30D158", to: "#1FA94A", shadow: "48,209,88" },
  orange:   { from: "#FF9F0A", to: "#FF7A00", shadow: "255,159,10" },
  red:      { from: "#FF453A", to: "#D93025", shadow: "255,69,58" },
  purple:   { from: "#BF5AF2", to: "#8E3FD4", shadow: "191,90,242" },
  pink:     { from: "#FF375F", to: "#D81B60", shadow: "255,55,95" },
  indigo:   { from: "#5E5CE6", to: "#3A38C2", shadow: "94,92,230" },
  teal:     { from: "#64D2FF", to: "#1FA8D9", shadow: "100,210,255" },
  yellow:   { from: "#FFD60A", to: "#E0B400", shadow: "255,214,10" },
  graphite: { from: "#48484A", to: "#1C1C1E", shadow: "72,72,74" },
  rose:     { from: "#FF6482", to: "#E14B6A", shadow: "255,100,130" },
  cyan:     { from: "#5AC8FA", to: "#28A9E0", shadow: "90,200,250" },
};

const TONE_LIST: IOSIconTone[] = Object.keys(TONES) as IOSIconTone[];

export function toneFromString(s: string): IOSIconTone {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TONE_LIST[h % TONE_LIST.length];
}

interface IOSIconProps {
  icon: LucideIcon;
  tone?: IOSIconTone;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  active?: boolean;
}

const SIZES = {
  xs: { box: "w-7 h-7 rounded-[8px]",   glyph: "w-3.5 h-3.5", stroke: 2.2 },
  sm: { box: "w-8 h-8 rounded-[10px]",  glyph: "w-4 h-4",     stroke: 2.1 },
  md: { box: "w-10 h-10 rounded-[12px]", glyph: "w-5 h-5",    stroke: 2 },
  lg: { box: "w-12 h-12 rounded-[14px]", glyph: "w-6 h-6",    stroke: 2 },
  xl: { box: "w-16 h-16 rounded-[18px]", glyph: "w-8 h-8",    stroke: 1.9 },
};

export function IOSIcon({
  icon: Icon,
  tone = "blue",
  size = "md",
  className,
  active = true,
}: IOSIconProps) {
  const t = TONES[tone];
  const s = SIZES[size];
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 overflow-hidden",
        "transition-all duration-300 ease-out",
        s.box,
        className,
      )}
      style={{
        background: active
          ? `linear-gradient(160deg, ${t.from} 0%, ${t.to} 100%)`
          : `linear-gradient(160deg, rgba(${t.shadow},0.22), rgba(${t.shadow},0.10))`,
        boxShadow: active
          ? `0 6px 14px -4px rgba(${t.shadow},0.55), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.18)`
          : `inset 0 0 0 1px rgba(${t.shadow},0.25)`,
      }}
    >
      {/* Glossy top highlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 opacity-70"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 100%)",
        }}
      />
      <Icon
        className={cn("relative", s.glyph, active ? "text-white" : "")}
        strokeWidth={s.stroke}
        style={
          active
            ? { filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))" }
            : { color: t.from }
        }
      />
    </span>
  );
}

export default IOSIcon;

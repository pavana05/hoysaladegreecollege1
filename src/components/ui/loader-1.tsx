/**
 * Pencil Loader (loader-1)
 * Animated SVG that draws & rotates like a sketching pencil.
 * All animation rules live in src/index.css under the `.pencil*` selectors.
 */
export const Component = ({ size = 120 }: { size?: number }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={size}
      width={size}
      viewBox="0 0 200 200"
      className="pencil"
      role="img"
      aria-label="Loading"
    >
      <defs>
        <clipPath id="pencil-eraser">
          <rect height="30" width="30" ry="5" rx="5" />
        </clipPath>
      </defs>
      <circle
        transform="rotate(-113,100,100)"
        strokeLinecap="round"
        strokeDashoffset="439.82"
        strokeDasharray="439.82 439.82"
        strokeWidth="2"
        stroke="currentColor"
        fill="none"
        r="70"
        className="pencil__stroke"
      />
      <g transform="translate(100,100)" className="pencil__rotate">
        <g fill="none">
          <circle
            transform="rotate(-90)"
            strokeDashoffset="402"
            strokeDasharray="402.12 402.12"
            strokeWidth="30"
            stroke="hsl(var(--primary))"
            r="64"
            className="pencil__body1"
          />
          <circle
            transform="rotate(-90)"
            strokeDashoffset="465"
            strokeDasharray="464.96 464.96"
            strokeWidth="10"
            stroke="hsl(var(--primary) / 0.7)"
            r="74"
            className="pencil__body2"
          />
          <circle
            transform="rotate(-90)"
            strokeDashoffset="339"
            strokeDasharray="339.29 339.29"
            strokeWidth="10"
            stroke="hsl(var(--primary) / 0.5)"
            r="54"
            className="pencil__body3"
          />
        </g>
        <g transform="rotate(-90) translate(49,0)" className="pencil__eraser">
          <g className="pencil__eraser-skew">
            <rect height="30" width="30" ry="5" rx="5" fill="hsl(var(--secondary))" />
            <rect clipPath="url(#pencil-eraser)" height="30" width="5" fill="hsl(var(--secondary) / 0.75)" />
            <rect height="20" width="30" fill="hsl(var(--muted))" />
            <rect height="20" width="15" fill="hsl(var(--muted-foreground) / 0.45)" />
            <rect height="20" width="5" fill="hsl(var(--muted-foreground) / 0.25)" />
            <rect height="2" width="30" y="6" fill="hsla(0,0%,0%,0.2)" />
            <rect height="2" width="30" y="13" fill="hsla(0,0%,0%,0.2)" />
          </g>
        </g>
        <g transform="rotate(-90) translate(49,-30)" className="pencil__point">
          <polygon points="15 0,30 30,0 30" fill="hsl(var(--secondary))" />
          <polygon points="15 0,6 30,0 30" fill="hsl(var(--secondary) / 0.7)" />
          <polygon points="15 0,20 10,10 10" fill="hsl(var(--foreground))" />
        </g>
      </g>
    </svg>
  );
};

export default Component;

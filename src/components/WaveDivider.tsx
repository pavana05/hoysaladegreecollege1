interface WaveDividerProps {
  flip?: boolean;
  className?: string;
  color?: string;
}

export default function WaveDivider({ flip = false, className = "", color }: WaveDividerProps) {
  return (
    <div className={`w-full overflow-hidden leading-none pointer-events-none ${flip ? "rotate-180" : ""} ${className}`}>
      <svg
        viewBox="0 0 1440 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-[30px] sm:h-[50px]"
        preserveAspectRatio="none"
      >
        <path
          d="M0 30C240 0 480 60 720 30C960 0 1200 60 1440 30V60H0V30Z"
          fill={color || "currentColor"}
          className={color ? "" : "text-background"}
        />
      </svg>
    </div>
  );
}

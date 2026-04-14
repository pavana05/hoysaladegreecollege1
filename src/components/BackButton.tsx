import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  className?: string;
}

export default function BackButton({ className = "" }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className={`p-2 rounded-xl hover:bg-muted transition-colors shrink-0 ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}

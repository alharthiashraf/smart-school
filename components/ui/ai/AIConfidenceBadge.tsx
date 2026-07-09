import { BrainCircuit } from "lucide-react";

type AIConfidenceBadgeProps = {
  confidence: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

export default function AIConfidenceBadge({
  confidence,
  size = "md",
  showLabel = true,
  className = "",
}: AIConfidenceBadgeProps) {
  const value = Math.max(0, Math.min(100, confidence));

  const tone =
    value >= 90
      ? {
          badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
          bar: "bg-emerald-500",
        }
      : value >= 75
      ? {
          badge: "bg-cyan-100 text-cyan-800 border-cyan-200",
          bar: "bg-cyan-500",
        }
      : value >= 50
      ? {
          badge: "bg-amber-100 text-amber-800 border-amber-200",
          bar: "bg-amber-500",
        }
      : {
          badge: "bg-rose-100 text-rose-800 border-rose-200",
          bar: "bg-rose-500",
        };

  const sizes = {
    sm: {
      badge: "px-2 py-1 text-[11px]",
      icon: "h-3.5 w-3.5",
    },
    md: {
      badge: "px-3 py-1.5 text-xs",
      icon: "h-4 w-4",
    },
    lg: {
      badge: "px-4 py-2 text-sm",
      icon: "h-5 w-5",
    },
  };

  return (
    <div className={`inline-flex flex-col gap-2 ${className}`}>
      <span
        className={`inline-flex items-center gap-2 rounded-full border font-black ${tone.badge} ${sizes[size].badge}`}
      >
        <BrainCircuit className={sizes[size].icon} />

        {showLabel && <span>ثقة الذكاء الاصطناعي</span>}

        <span>{value}%</span>
      </span>

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone.bar}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
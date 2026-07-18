import { BrainCircuit } from "lucide-react";

export type AIConfidenceTone =
  | "high"
  | "medium"
  | "low"
  | "critical";

export type AIConfidenceSize = "sm" | "md" | "lg";

export type AIConfidenceBadgeProps = {
  confidence: number;
  size?: AIConfidenceSize;
  showLabel?: boolean;
  className?: string;
};

type ToneStyle = {
  badge: string;
  bar: string;
};

const tones: Record<AIConfidenceTone, ToneStyle> = {
  high: {
    badge:
      "border-[var(--app-green)]/30 bg-[var(--app-green-soft)] text-[var(--app-green)]",
    bar: "bg-[var(--app-green)]",
  },

  medium: {
    badge:
      "border-[var(--app-blue)]/30 bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    bar: "bg-[var(--app-blue)]",
  },

  low: {
    badge:
      "border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    bar: "bg-[var(--app-accent)]",
  },

  critical: {
    badge:
      "border-[var(--app-destructive)]/30 bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    bar: "bg-[var(--app-destructive)]",
  },
};

const sizes: Record<
  AIConfidenceSize,
  {
    badge: string;
    icon: string;
  }
> = {
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

export default function AIConfidenceBadge({
  confidence,
  size = "md",
  showLabel = true,
  className,
}: AIConfidenceBadgeProps) {
  const value = Math.max(0, Math.min(100, confidence));

  const tone: AIConfidenceTone =
    value >= 90
      ? "high"
      : value >= 75
        ? "medium"
        : value >= 50
          ? "low"
          : "critical";

  return (
    <div
      className={[
        "inline-flex flex-col gap-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={[
          "inline-flex items-center gap-2 rounded-full border font-black",
          tones[tone].badge,
          sizes[size].badge,
        ].join(" ")}
      >
        <BrainCircuit
          aria-hidden="true"
          className={sizes[size].icon}
        />

        {showLabel && <span>ثقة الذكاء الاصطناعي</span>}

        <span dir="ltr">{value}%</span>
      </span>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--app-card-soft)]"
        role="progressbar"
        aria-label="درجة ثقة الذكاء الاصطناعي"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div
          className={[
            "h-full rounded-full transition-[width] duration-500",
            tones[tone].bar,
          ].join(" ")}
          style={{
            width: `${value}%`,
          }}
        />
      </div>
    </div>
  );
}

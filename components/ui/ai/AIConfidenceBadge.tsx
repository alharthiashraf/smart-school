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

type SizeStyle = {
  badge: string;
  icon: string;
  progress: string;
};

const TONE_STYLES: Record<AIConfidenceTone, ToneStyle> = {
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

const SIZE_STYLES: Record<AIConfidenceSize, SizeStyle> = {
  sm: {
    badge: "px-2 py-1 text-[11px]",
    icon: "h-3.5 w-3.5",
    progress: "h-1.5",
  },
  md: {
    badge: "px-3 py-1.5 text-xs",
    icon: "h-4 w-4",
    progress: "h-2",
  },
  lg: {
    badge: "px-4 py-2 text-sm",
    icon: "h-5 w-5",
    progress: "h-2.5",
  },
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeConfidence(confidence: number) {
  if (!Number.isFinite(confidence)) {
    return 0;
  }

  return Math.round(Math.max(0, Math.min(100, confidence)));
}

function getConfidenceTone(value: number): AIConfidenceTone {
  if (value >= 90) return "high";
  if (value >= 75) return "medium";
  if (value >= 50) return "low";
  return "critical";
}

export default function AIConfidenceBadge({
  confidence,
  size = "md",
  showLabel = true,
  className,
}: AIConfidenceBadgeProps) {
  const value = normalizeConfidence(confidence);
  const tone = getConfidenceTone(value);
  const toneStyle = TONE_STYLES[tone];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <div className={cx("inline-flex min-w-0 flex-col gap-2", className)}>
      <span
        className={cx(
          "inline-flex w-fit max-w-full items-center gap-2 rounded-full border font-black",
          toneStyle.badge,
          sizeStyle.badge,
        )}
      >
        <BrainCircuit
          aria-hidden="true"
          className={cx("shrink-0", sizeStyle.icon)}
        />

        {showLabel && (
          <span className="truncate">ثقة الذكاء الاصطناعي</span>
        )}

        <span className="shrink-0" dir="ltr">
          {value}%
        </span>
      </span>

      <div
        className={cx(
          "w-full min-w-24 overflow-hidden rounded-full bg-[var(--app-card-soft)]",
          sizeStyle.progress,
        )}
        role="progressbar"
        aria-label="درجة ثقة الذكاء الاصطناعي"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}%`}
      >
        <div
          className={cx(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            toneStyle.bar,
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

import BaseCard from "./BaseCard";

type MetricTone = "success" | "warning" | "danger" | "info" | "neutral";

export type MetricCardProps = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: MetricTone;
  hint?: string;
  progress?: number;
  className?: string;
};

type MetricToneClasses = {
  text: string;
  background: string;
  progress: string;
};

const tones: Record<MetricTone, MetricToneClasses> = {
  success: {
    text: "text-[var(--app-green)]",
    background: "bg-[var(--app-green-soft)]",
    progress: "bg-[var(--app-green)]",
  },
  warning: {
    text: "text-[var(--app-accent)]",
    background: "bg-[var(--app-accent-soft)]",
    progress: "bg-[var(--app-accent)]",
  },
  danger: {
    text: "text-[var(--app-destructive)]",
    background: "bg-[var(--app-destructive-soft)]",
    progress: "bg-[var(--app-destructive)]",
  },
  info: {
    text: "text-[var(--app-blue)]",
    background: "bg-[var(--app-blue-soft)]",
    progress: "bg-[var(--app-blue)]",
  },
  neutral: {
    text: "text-[var(--app-text)]",
    background: "bg-[var(--app-card-soft)]",
    progress: "bg-[var(--app-primary)]",
  },
};

export default function MetricCard({
  label,
  value,
  icon,
  tone = "neutral",
  hint,
  progress,
  className,
}: MetricCardProps) {
  const progressValue =
    typeof progress === "number"
      ? Math.min(Math.max(progress, 0), 100)
      : null;

  return (
    <BaseCard
      as="article"
      padding="sm"
      className={[tones[tone].background, className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--app-text-muted)]">
            {label}
          </p>

          <p
            className={[
              "mt-1 break-words text-2xl font-black",
              tones[tone].text,
            ].join(" ")}
          >
            {value}
          </p>

          {hint && (
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--app-text-muted)]">
              {hint}
            </p>
          )}
        </div>

        {icon && (
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-card)]",
              tones[tone].text,
            ].join(" ")}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>

      {progressValue !== null && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs font-bold text-[var(--app-text-muted)]">
            <span>التقدم</span>
            <span dir="ltr">{progressValue}%</span>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--app-card)]"
            role="progressbar"
            aria-label={`تقدم ${label}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressValue}
          >
            <div
              className={[
                "h-full rounded-full transition-[width] duration-300",
                tones[tone].progress,
              ].join(" ")}
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>
      )}
    </BaseCard>
  );
}

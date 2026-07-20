import type { ReactNode } from "react";

import BaseCard from "./BaseCard";

export type MetricTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

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

const TONE_CLASSES: Record<MetricTone, MetricToneClasses> = {
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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeProgress(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(Math.max(0, Math.min(100, value)));
}

export default function MetricCard({
  label,
  value,
  icon,
  tone = "neutral",
  hint,
  progress,
  className,
}: MetricCardProps) {
  const progressValue = normalizeProgress(progress);
  const toneClasses = TONE_CLASSES[tone];

  return (
    <BaseCard
      as="article"
      padding="sm"
      className={cx(
        "overflow-hidden",
        toneClasses.background,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-[var(--app-text-muted)]">
            {label}
          </p>

          <p
            className={cx(
              "mt-1 break-words text-2xl font-black tracking-tight",
              toneClasses.text,
            )}
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
            className={cx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-card)] shadow-sm",
              toneClasses.text,
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>

      {progressValue !== null && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold text-[var(--app-text-muted)]">
            <span>التقدم</span>

            <span className="shrink-0" dir="ltr">
              {progressValue}%
            </span>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--app-card)]"
            role="progressbar"
            aria-label={`تقدم ${label}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressValue}
            aria-valuetext={`${progressValue}%`}
          >
            <div
              className={cx(
                "h-full rounded-full transition-[width] duration-300 ease-out",
                toneClasses.progress,
              )}
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>
      )}
    </BaseCard>
  );
}

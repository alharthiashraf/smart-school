import type { ReactNode } from "react";
import BaseCard from "./BaseCard";

type MetricTone = "success" | "warning" | "danger" | "info" | "neutral";

type MetricCardProps = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: MetricTone;
  hint?: string;
  progress?: number;
};

const tones: Record<MetricTone, string> = {
  success: "text-[var(--app-green)]",
  warning: "text-[var(--app-accent)]",
  danger: "text-red-600 dark:text-red-300",
  info: "text-[var(--app-blue)]",
  neutral: "text-[var(--app-text)]",
};

const softBg: Record<MetricTone, string> = {
  success: "bg-[var(--app-green-soft)]",
  warning: "bg-[var(--app-accent-soft)]",
  danger: "bg-red-500/10",
  info: "bg-[var(--app-blue-soft)]",
  neutral: "bg-[var(--app-card-soft)]",
};

export default function MetricCard({
  label,
  value,
  icon,
  tone = "neutral",
  hint,
  progress,
}: MetricCardProps) {
  const progressValue =
    typeof progress === "number" ? Math.min(Math.max(progress, 0), 100) : null;

  return (
    <BaseCard padding="sm" className={softBg[tone]}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[var(--app-text-muted)]">
            {label}
          </p>

          <p className={["mt-1 text-2xl font-black", tones[tone]].join(" ")}>
            {value}
          </p>

          {hint && (
            <p className="mt-1 text-xs font-bold text-[var(--app-text-muted)]">
              {hint}
            </p>
          )}
        </div>

        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-card)] text-[var(--app-text)]">
            {icon}
          </div>
        )}
      </div>

      {progressValue !== null && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--app-card)]">
          <div
            className={["h-full rounded-full", tones[tone]].join(" ")}
            style={{
              width: `${progressValue}%`,
              background: "currentColor",
            }}
          />
        </div>
      )}
    </BaseCard>
  );
}
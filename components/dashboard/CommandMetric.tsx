import type { ReactNode } from "react";

import { StatusBadge } from "@/components/ui/badges";
import { BaseCard } from "@/components/ui/cards";

export type CommandMetricTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type CommandMetricProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
  badge: string;
  tone?: CommandMetricTone;
  className?: string;
};

const badgeTones: Record<
  CommandMetricTone,
  "primary" | "success" | "warning" | "danger" | "info"
> = {
  primary: "primary",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
};

const iconStyles: Record<
  CommandMetricTone,
  string
> = {
  primary:
    "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",

  success:
    "bg-[var(--app-green-soft)] text-[var(--app-green)]",

  warning:
    "bg-[var(--app-warning-soft)] text-[var(--app-warning)]",

  danger:
    "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",

  info:
    "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
};

export default function CommandMetric({
  icon,
  label,
  value,
  badge,
  tone = "primary",
  className = "",
}: CommandMetricProps) {
  return (
    <BaseCard
      as="article"
      hoverable
      className={className}
    >
      <div
        className={[
          "mb-3 flex h-11 w-11 items-center justify-center rounded-[var(--app-radius-lg)]",
          iconStyles[tone],
        ].join(" ")}
      >
        {icon}
      </div>

      <p className="text-xs font-bold text-[var(--app-text-muted)]">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-[var(--app-text)]">
        {value}
      </p>

      <div className="mt-3">
        <StatusBadge tone={badgeTones[tone]}>
          {badge}
        </StatusBadge>
      </div>
    </BaseCard>
  );
}

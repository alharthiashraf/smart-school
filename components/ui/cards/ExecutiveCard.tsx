import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import BaseCard from "./BaseCard";

export type Tone =
  | "primary"
  | "teal"
  | "green"
  | "blue"
  | "gold"
  | "amber"
  | "red"
  | "slate"
  | "purple";

type ExecutiveCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  badge?: string;
  trend?: number;
  progress?: number;
  footer?: ReactNode;
  loading?: boolean;
  onClick?: () => void;
  tone?: Tone;
  className?: string;
};

const tones: Record<Tone, { icon: string; bar: string }> = {
  primary: {
    icon: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
    bar: "bg-[var(--app-primary)]",
  },
  teal: {
    icon: "bg-[var(--app-teal-soft)] text-[var(--app-teal)]",
    bar: "bg-[var(--app-teal)]",
  },
  green: {
    icon: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
    bar: "bg-[var(--app-green)]",
  },
  blue: {
    icon: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    bar: "bg-[var(--app-blue)]",
  },
  gold: {
    icon: "bg-[var(--app-accent-soft)] text-[var(--app-text)]",
    bar: "bg-[var(--app-accent)]",
  },
  amber: {
    icon: "bg-[var(--app-accent-soft)] text-[var(--app-text)]",
    bar: "bg-[var(--app-accent)]",
  },
  red: {
    icon: "bg-red-500/10 text-red-600 dark:text-red-300",
    bar: "bg-red-600 dark:bg-red-400",
  },
  slate: {
    icon: "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
    bar: "bg-[var(--app-text-muted)]",
  },
  purple: {
    icon: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
    bar: "bg-purple-600 dark:bg-purple-400",
  },
};

export default function ExecutiveCard({
  title,
  value,
  subtitle,
  icon,
  badge,
  trend,
  progress,
  footer,
  loading = false,
  onClick,
  tone = "teal",
  className = "",
}: ExecutiveCardProps) {
  const TrendIcon =
    trend == null ? Minus : trend >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <BaseCard
      as="article"
      padding="md"
      hoverable={Boolean(onClick)}
      onClick={onClick}
      className={className}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            "flex h-12 w-12 items-center justify-center rounded-2xl",
            tones[tone].icon,
          ].join(" ")}
        >
          {icon}
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            <span className="rounded-full bg-[var(--app-card-soft)] px-3 py-1 text-[11px] font-black text-[var(--app-text-muted)]">
              {badge}
            </span>
          )}

          {trend != null && (
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black",
                trend >= 0
                  ? "bg-[var(--app-green-soft)] text-[var(--app-green)]"
                  : "bg-red-500/10 text-red-600 dark:text-red-300",
              ].join(" ")}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold text-[var(--app-text-muted)]">
          {title}
        </p>

        {loading ? (
          <div className="mt-3 h-9 w-28 animate-pulse rounded-xl bg-[var(--app-card-soft)]" />
        ) : (
          <h3 className="mt-2 text-4xl font-black tracking-tight text-[var(--app-text)]">
            {value}
          </h3>
        )}

        {subtitle && (
          <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
            {subtitle}
          </p>
        )}
      </div>

      {progress != null && (
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs font-bold text-[var(--app-text-muted)]">
            <span>التقدم</span>
            <span>{progress}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[var(--app-card-soft)]">
            <div
              className={["h-full rounded-full", tones[tone].bar].join(" ")}
              style={{
                width: `${Math.max(0, Math.min(progress, 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {footer && (
        <div className="mt-5 border-t border-[var(--app-border)] pt-4">
          {footer}
        </div>
      )}
    </BaseCard>
  );
}
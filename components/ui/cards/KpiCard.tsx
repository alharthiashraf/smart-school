import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import BaseCard from "./BaseCard";

type Tone = "primary" | "teal" | "green" | "blue" | "gold" | "red";

export type KpiCardProps = {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: number;
  caption?: string;
  tone?: Tone;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
};

const tones: Record<Tone, string> = {
  primary: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
  teal: "bg-[var(--app-teal-soft)] text-[var(--app-teal)]",
  green: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
  blue: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
  gold: "bg-[var(--app-accent-soft)] text-[var(--app-text)]",
  red: "bg-red-500/10 text-red-600 dark:text-red-300",
};

export default function KpiCard({
  title,
  value,
  icon,
  trend,
  caption,
  tone = "teal",
  loading = false,
  onClick,
  className = "",
}: KpiCardProps) {
  const TrendIcon =
    trend == null ? Minus : trend >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <BaseCard
      padding="sm"
      hoverable={Boolean(onClick)}
      onClick={onClick}
      className={className}
    >
      <div className="flex items-center justify-between">
        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-2xl",
            tones[tone],
          ].join(" ")}
        >
          {icon}
        </div>

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

      <p className="mt-4 text-sm font-bold text-[var(--app-text-muted)]">
        {title}
      </p>

      {loading ? (
        <div className="mt-2 h-8 w-20 animate-pulse rounded-lg bg-[var(--app-card-soft)]" />
      ) : (
        <h3 className="mt-2 text-3xl font-black text-[var(--app-text)]">
          {value}
        </h3>
      )}

      {caption && (
        <p className="mt-2 text-xs leading-6 text-[var(--app-text-muted)]">
          {caption}
        </p>
      )}
    </BaseCard>
  );
}
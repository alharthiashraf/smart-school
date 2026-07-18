import type { KeyboardEvent, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

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
  primary:
    "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",

  /*
   * اسم توافق قديم فقط.
   * يعرض الآن اللون الأساسي الكحلي بدل teal.
   */
  teal:
    "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",

  green:
    "bg-[var(--app-green-soft)] text-[var(--app-green)]",

  blue:
    "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",

  gold:
    "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",

  red:
    "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
};

export default function KpiCard({
  title,
  value,
  icon,
  trend,
  caption,
  tone = "primary",
  loading = false,
  onClick,
  className,
}: KpiCardProps) {
  const isInteractive = Boolean(onClick);
  const TrendIcon =
    trend != null && trend < 0 ? ArrowDownRight : ArrowUpRight;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onClick) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <BaseCard
      as="article"
      padding="sm"
      hoverable={isInteractive}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      className={[
        isInteractive
          ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-background)]"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            tones[tone],
          ].join(" ")}
          aria-hidden="true"
        >
          {icon}
        </div>

        {trend != null && (
          <span
            className={[
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black",
              trend >= 0
                ? "bg-[var(--app-green-soft)] text-[var(--app-green)]"
                : "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
            ].join(" ")}
          >
            <TrendIcon
              aria-hidden="true"
              className="h-3.5 w-3.5"
            />

            <span dir="ltr">{Math.abs(trend)}%</span>
          </span>
        )}
      </div>

      <p className="mt-4 text-sm font-bold text-[var(--app-text-muted)]">
        {title}
      </p>

      {loading ? (
        <div
          className="mt-2 h-8 w-20 animate-pulse rounded-lg bg-[var(--app-card-soft)]"
          aria-label="جاري تحميل القيمة"
        />
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

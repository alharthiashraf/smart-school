import type { KeyboardEvent, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import BaseCard from "./BaseCard";

type Tone =
  | "primary"
  | "teal"
  | "green"
  | "blue"
  | "gold"
  | "red"
  | "slate";

export type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  badge?: string;
  trend?: number;
  footer?: ReactNode;
  tone?: Tone;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
};

const toneClasses: Record<Tone, string> = {
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

  slate:
    "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  badge,
  trend,
  footer,
  tone = "primary",
  loading = false,
  onClick,
  className,
}: StatCardProps) {
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
      <div className="flex items-start justify-between gap-3">
        {icon && (
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
              toneClasses[tone],
            ].join(" ")}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {badge && (
            <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-card-soft)] px-2.5 py-1 text-[11px] font-black text-[var(--app-text-muted)]">
              {badge}
            </span>
          )}

          {trend != null && (
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black",
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
      </div>

      <div className="mt-4">
        <p className="text-xs font-black tracking-wide text-[var(--app-text-muted)]">
          {title}
        </p>

        {loading ? (
          <div
            className="mt-2 h-8 w-24 animate-pulse rounded-xl bg-[var(--app-card-soft)]"
            aria-label="جاري تحميل القيمة"
          />
        ) : (
          <h3 className="mt-2 text-3xl font-black tracking-tight text-[var(--app-text)]">
            {value}
          </h3>
        )}

        {subtitle && (
          <p className="mt-2 text-xs leading-6 text-[var(--app-text-muted)]">
            {subtitle}
          </p>
        )}
      </div>

      {footer && (
        <div className="mt-4 border-t border-[var(--app-border)] pt-3 text-xs text-[var(--app-text-muted)]">
          {footer}
        </div>
      )}
    </BaseCard>
  );
}

import type { KeyboardEvent, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import BaseCard from "./BaseCard";

export type StatCardTone =
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
  tone?: StatCardTone;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
};

const TONE_CLASSES: Record<StatCardTone, string> = {
  primary:
    "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",

  // توافق مؤقت مع الاستخدامات القديمة حتى اكتمال إزالة tone="teal".
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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeTrend(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

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
  const isInteractive = typeof onClick === "function";
  const normalizedTrend = normalizeTrend(trend);

  const TrendIcon =
    normalizedTrend !== null && normalizedTrend < 0
      ? ArrowDownRight
      : ArrowUpRight;

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
      aria-busy={loading || undefined}
      aria-label={isInteractive ? title : undefined}
      className={cx(
        "overflow-hidden",
        isInteractive &&
          "cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-background)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {icon ? (
          <div
            className={cx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
              TONE_CLASSES[tone],
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        ) : (
          <span aria-hidden="true" />
        )}

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {badge && (
            <span className="max-w-full truncate rounded-full border border-[var(--app-border)] bg-[var(--app-card-soft)] px-2.5 py-1 text-[11px] font-black text-[var(--app-text-muted)]">
              {badge}
            </span>
          )}

          {normalizedTrend !== null && (
            <span
              className={cx(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black",
                normalizedTrend >= 0
                  ? "bg-[var(--app-green-soft)] text-[var(--app-green)]"
                  : "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
              )}
              aria-label={`نسبة التغير ${Math.abs(normalizedTrend)} بالمئة ${
                normalizedTrend >= 0 ? "ارتفاعًا" : "انخفاضًا"
              }`}
            >
              <TrendIcon
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />

              <span dir="ltr">{Math.abs(normalizedTrend)}%</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 min-w-0">
        <p className="truncate text-xs font-black tracking-wide text-[var(--app-text-muted)]">
          {title}
        </p>

        {loading ? (
          <div
            className="mt-2 h-9 w-24 animate-pulse rounded-xl bg-[var(--app-card-soft)]"
            role="status"
            aria-label="جاري تحميل القيمة"
          />
        ) : (
          <p className="mt-2 break-words text-3xl font-black tracking-tight text-[var(--app-text)]">
            {value}
          </p>
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

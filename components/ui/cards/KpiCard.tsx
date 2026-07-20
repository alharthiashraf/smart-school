import type { KeyboardEvent, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import BaseCard from "./BaseCard";

export type KpiCardTone =
  | "primary"
  | "teal"
  | "green"
  | "blue"
  | "gold"
  | "red";

export type KpiCardProps = {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: number;
  caption?: string;
  tone?: KpiCardTone;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
};

const TONE_CLASSES: Record<KpiCardTone, string> = {
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
      <div className="flex items-center justify-between gap-3">
        <div
          className={cx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            TONE_CLASSES[tone],
          )}
          aria-hidden="true"
        >
          {icon}
        </div>

        {normalizedTrend !== null && (
          <span
            className={cx(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black",
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

      <p className="mt-4 truncate text-sm font-bold text-[var(--app-text-muted)]">
        {title}
      </p>

      {loading ? (
        <div
          className="mt-2 h-9 w-20 animate-pulse rounded-lg bg-[var(--app-card-soft)]"
          role="status"
          aria-label="جاري تحميل القيمة"
        />
      ) : (
        <p className="mt-2 break-words text-3xl font-black tracking-tight text-[var(--app-text)]">
          {value}
        </p>
      )}

      {caption && (
        <p className="mt-2 text-xs leading-6 text-[var(--app-text-muted)]">
          {caption}
        </p>
      )}
    </BaseCard>
  );
}

import type { KeyboardEvent, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

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

export type ExecutiveCardProps = {
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

type ToneClasses = {
  icon: string;
  bar: string;
};

const TONE_CLASSES: Record<Tone, ToneClasses> = {
  primary: {
    icon: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
    bar: "bg-[var(--app-primary)]",
  },

  // توافق مؤقت مع الاستخدامات القديمة حتى اكتمال إزالة tone="teal".
  teal: {
    icon: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
    bar: "bg-[var(--app-primary)]",
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
    icon: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    bar: "bg-[var(--app-accent)]",
  },

  amber: {
    icon: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    bar: "bg-[var(--app-accent)]",
  },

  red: {
    icon:
      "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    bar: "bg-[var(--app-destructive)]",
  },

  slate: {
    icon: "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
    bar: "bg-[var(--app-text-muted)]",
  },

  // توافق مؤقت مع الاستخدامات القديمة دون إدخال لون ثابت خارج الهوية.
  purple: {
    icon: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
    bar: "bg-[var(--app-primary)]",
  },
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizePercentage(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(Math.max(0, Math.min(100, value)));
}

function normalizeTrend(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

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
  tone = "primary",
  className,
}: ExecutiveCardProps) {
  const isInteractive = typeof onClick === "function";
  const normalizedProgress = normalizePercentage(progress);
  const normalizedTrend = normalizeTrend(trend);
  const toneClasses = TONE_CLASSES[tone];

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
      padding="md"
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
        <div
          className={cx(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            toneClasses.icon,
          )}
          aria-hidden="true"
        >
          {icon}
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {badge && (
            <span className="max-w-full truncate rounded-full border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-1 text-[11px] font-black text-[var(--app-text-muted)]">
              {badge}
            </span>
          )}

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
              <TrendIcon aria-hidden="true" className="h-3.5 w-3.5" />

              <span dir="ltr">{Math.abs(normalizedTrend)}%</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 min-w-0">
        <p className="truncate text-sm font-bold text-[var(--app-text-muted)]">
          {title}
        </p>

        {loading ? (
          <div
            className="mt-3 h-10 w-28 animate-pulse rounded-xl bg-[var(--app-card-soft)]"
            role="status"
            aria-label="جاري تحميل القيمة"
          />
        ) : (
          <p className="mt-2 break-words text-4xl font-black tracking-tight text-[var(--app-text)]">
            {value}
          </p>
        )}

        {subtitle && (
          <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
            {subtitle}
          </p>
        )}
      </div>

      {normalizedProgress !== null && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-[var(--app-text-muted)]">
            <span>التقدم</span>
            <span className="shrink-0" dir="ltr">
              {normalizedProgress}%
            </span>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--app-card-soft)]"
            role="progressbar"
            aria-label={`تقدم ${title}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={normalizedProgress}
            aria-valuetext={`${normalizedProgress}%`}
          >
            <div
              className={cx(
                "h-full rounded-full transition-[width] duration-300 ease-out",
                toneClasses.bar,
              )}
              style={{ width: `${normalizedProgress}%` }}
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

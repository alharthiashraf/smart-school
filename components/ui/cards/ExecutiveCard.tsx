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

const tones: Record<Tone, ToneClasses> = {
  primary: {
    icon: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
    bar: "bg-[var(--app-primary)]",
  },

  /*
   * أبقيناه للتوافق مع الصفحات القديمة فقط.
   * يعرض الآن اللون الأساسي الكحلي بدل teal.
   */
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

  /*
   * أبقيناه للتوافق مع الاستخدامات الحالية.
   * يستخدم الآن درجة الهوية الأساسية بدل purple الثابت.
   */
  purple: {
    icon: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
    bar: "bg-[var(--app-primary)]",
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
  tone = "primary",
  className,
}: ExecutiveCardProps) {
  const isInteractive = Boolean(onClick);
  const normalizedProgress =
    progress == null ? null : Math.max(0, Math.min(progress, 100));

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
      padding="md"
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
        <div
          className={[
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            tones[tone].icon,
          ].join(" ")}
          aria-hidden="true"
        >
          {icon}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {badge && (
            <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-1 text-[11px] font-black text-[var(--app-text-muted)]">
              {badge}
            </span>
          )}

          {trend != null && (
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black",
                trend >= 0
                  ? "bg-[var(--app-green-soft)] text-[var(--app-green)]"
                  : "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
              ].join(" ")}
            >
              <TrendIcon aria-hidden="true" className="h-3.5 w-3.5" />

              <span dir="ltr">{Math.abs(trend)}%</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold text-[var(--app-text-muted)]">
          {title}
        </p>

        {loading ? (
          <div
            className="mt-3 h-9 w-28 animate-pulse rounded-xl bg-[var(--app-card-soft)]"
            aria-label="جاري تحميل القيمة"
          />
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

      {normalizedProgress != null && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-[var(--app-text-muted)]">
            <span>التقدم</span>
            <span dir="ltr">{normalizedProgress}%</span>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--app-card-soft)]"
            role="progressbar"
            aria-label={`تقدم ${title}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={normalizedProgress}
          >
            <div
              className={[
                "h-full rounded-full transition-[width] duration-300",
                tones[tone].bar,
              ].join(" ")}
              style={{
                width: `${normalizedProgress}%`,
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

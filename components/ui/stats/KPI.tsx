import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

export type KPITrend = "up" | "down" | "neutral";

export type KPIProps = {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  description?: string;
  trend?: KPITrend;
  trendValue?: string;
  className?: string;
};

export default function KPI({
  title,
  value,
  icon,
  description,
  trend = "neutral",
  trendValue,
  className,
}: KPIProps) {
  return (
    <div
      className={[
        "rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--app-shadow)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--app-text-muted)]">
            {title}
          </p>

          <div className="mt-2 text-3xl font-black tracking-tight text-[var(--app-text)]">
            {value}
          </div>
        </div>

        {icon && (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>

      {(description || trendValue) && (
        <div className="flex items-center justify-between gap-3">
          {description && (
            <p className="truncate text-xs font-medium text-[var(--app-text-muted)]">
              {description}
            </p>
          )}

          {trendValue && (
            <span
              className={[
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-black",
                trend === "up"
                  ? "bg-[var(--app-green-soft)] text-[var(--app-green)]"
                  : trend === "down"
                    ? "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]"
                    : "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
              ].join(" ")}
            >
              {trend === "up" && (
                <TrendingUp aria-hidden="true" className="h-3.5 w-3.5" />
              )}

              {trend === "down" && (
                <TrendingDown aria-hidden="true" className="h-3.5 w-3.5" />
              )}

              {trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
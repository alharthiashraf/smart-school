import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

type KPITrend = "up" | "down" | "neutral";

type KPIProps = {
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
  className = "",
}: KPIProps) {
  return (
    <div
      className={`rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${className}`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-500">{title}</p>

          <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </div>
        </div>

        {icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            {icon}
          </div>
        )}
      </div>

      {(description || trendValue) && (
        <div className="flex items-center justify-between gap-3">
          {description && (
            <p className="truncate text-xs font-medium text-slate-500">
              {description}
            </p>
          )}

          {trendValue && (
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${
                trend === "up"
                  ? "bg-emerald-50 text-emerald-700"
                  : trend === "down"
                    ? "bg-red-50 text-red-700"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {trend === "up" && <TrendingUp size={14} />}
              {trend === "down" && <TrendingDown size={14} />}
              {trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
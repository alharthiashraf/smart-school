import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

type Tone = "primary" | "teal" | "green" | "blue" | "gold" | "red" | "slate";

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
  primary: "bg-[#15445A]/10 text-[#15445A]",
  teal: "bg-[#0DA9A6]/10 text-[#0DA9A6]",
  green: "bg-[#07A869]/10 text-[#07A869]",
  blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
  gold: "bg-[#C1B489]/20 text-[#15445A]",
  red: "bg-red-50 text-red-700",
  slate: "bg-slate-100 text-slate-700",
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  badge,
  trend,
  footer,
  tone = "teal",
  loading = false,
  onClick,
  className = "",
}: StatCardProps) {
  const TrendIcon = trend === undefined ? Minus : trend >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <article
      onClick={onClick}
      className={[
        "rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200",
        onClick ? "cursor-pointer hover:-translate-y-1 hover:shadow-md" : "",
        className,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        {icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
            {icon}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {badge && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
              {badge}
            </span>
          )}

          {trend !== undefined && (
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black",
                trend >= 0 ? "bg-[#07A869]/10 text-[#07A869]" : "bg-red-50 text-red-700",
              ].join(" ")}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-black tracking-wide text-slate-500">
          {title}
        </p>

        {loading ? (
          <div className="mt-2 h-8 w-24 animate-pulse rounded-xl bg-slate-200" />
        ) : (
          <h3 className="mt-2 text-3xl font-black tracking-tight text-[#15445A]">
            {value}
          </h3>
        )}

        {subtitle && (
          <p className="mt-2 text-xs leading-6 text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      {footer && (
        <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {footer}
        </div>
      )}
    </article>
  );
}

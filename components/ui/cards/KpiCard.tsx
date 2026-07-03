import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

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

const tones: Record<Tone,string> = {
  primary:"bg-[#15445A]/10 text-[#15445A]",
  teal:"bg-[#0DA9A6]/10 text-[#0DA9A6]",
  green:"bg-[#07A869]/10 text-[#07A869]",
  blue:"bg-[#3D7EB9]/10 text-[#3D7EB9]",
  gold:"bg-[#C1B489]/20 text-[#15445A]",
  red:"bg-red-50 text-red-700",
};

export default function KpiCard({
  title,
  value,
  icon,
  trend,
  caption,
  tone="teal",
  loading=false,
  onClick,
  className=""
}:KpiCardProps){
  const TrendIcon = trend == null ? Minus : trend >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      onClick={onClick}
      className={[
        "rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm transition-all",
        onClick ? "cursor-pointer hover:-translate-y-1 hover:shadow-md" : "",
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tones[tone]}`}>
          {icon}
        </div>

        {trend != null && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${
            trend >= 0 ? "bg-[#07A869]/10 text-[#07A869]" : "bg-red-50 text-red-700"
          }`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      <p className="mt-4 text-sm font-bold text-slate-500">{title}</p>

      {loading ? (
        <div className="mt-2 h-8 w-20 animate-pulse rounded-lg bg-slate-200" />
      ) : (
        <h3 className="mt-2 text-3xl font-black text-[#15445A]">{value}</h3>
      )}

      {caption && (
        <p className="mt-2 text-xs leading-6 text-slate-500">{caption}</p>
      )}
    </div>
  );
}

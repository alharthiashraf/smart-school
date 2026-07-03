import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

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

type ExecutiveCardProps = {
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

const tones: Record<Tone,{icon:string;bar:string}> = {
  primary:{icon:"bg-[#15445A]/10 text-[#15445A]",bar:"bg-[#15445A]"},
  teal:{icon:"bg-[#0DA9A6]/10 text-[#0DA9A6]",bar:"bg-[#0DA9A6]"},
  green:{icon:"bg-[#07A869]/10 text-[#07A869]",bar:"bg-[#07A869]"},
  blue:{icon:"bg-[#3D7EB9]/10 text-[#3D7EB9]",bar:"bg-[#3D7EB9]"},
  gold:{icon:"bg-[#C1B489]/20 text-[#15445A]",bar:"bg-[#C1B489]"},
  amber:{icon:"bg-[#C1B489]/20 text-[#15445A]",bar:"bg-[#C1B489]"},
  red:{icon:"bg-red-50 text-red-700",bar:"bg-red-600"},
  slate:{icon:"bg-slate-100 text-slate-700",bar:"bg-slate-500"},
  purple:{icon:"bg-purple-50 text-purple-700",bar:"bg-purple-600"},
};

export default function ExecutiveCard({
  title,value,subtitle,icon,badge,trend,progress,footer,
  loading=false,onClick,tone="teal",className=""
}:ExecutiveCardProps){
  const TrendIcon = trend==null ? Minus : trend>=0 ? ArrowUpRight : ArrowDownRight;

  return (
    <article
      onClick={onClick}
      className={[
        "rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200",
        onClick?"cursor-pointer hover:-translate-y-1 hover:shadow-md":"",
        className
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tones[tone].icon}`}>
          {icon}
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">{badge}</span>
          )}
          {trend!=null && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${
              trend>=0?"bg-[#07A869]/10 text-[#07A869]":"bg-red-50 text-red-700"
            }`}>
              <TrendIcon className="h-3.5 w-3.5"/>
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold text-slate-500">{title}</p>
        {loading ? (
          <div className="mt-3 h-9 w-28 animate-pulse rounded-xl bg-slate-200"/>
        ) : (
          <h3 className="mt-2 text-4xl font-black tracking-tight text-[#15445A]">{value}</h3>
        )}
        {subtitle && <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>}
      </div>

      {progress!=null && (
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
            <span>التقدم</span><span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${tones[tone].bar}`} style={{width:`${Math.max(0,Math.min(progress,100))}%`}}/>
          </div>
        </div>
      )}

      {footer && <div className="mt-5 border-t border-slate-100 pt-4">{footer}</div>}
    </article>
  );
}

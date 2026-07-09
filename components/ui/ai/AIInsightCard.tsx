import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export type AIInsightTone =
  | "info"
  | "success"
  | "warning"
  | "danger";

type AIInsightCardProps = {
  title?: string;
  description: string;
  icon?: ReactNode;
  tone?: AIInsightTone;
  confidence?: number;
  action?: ReactNode;
  className?: string;
};

const styles: Record<
  AIInsightTone,
  {
    container: string;
    badge: string;
  }
> = {
  info: {
    container: "border-cyan-100 bg-cyan-50 text-cyan-900",
    badge: "bg-cyan-100 text-cyan-800",
  },
  success: {
    container: "border-emerald-100 bg-emerald-50 text-emerald-900",
    badge: "bg-emerald-100 text-emerald-800",
  },
  warning: {
    container: "border-amber-100 bg-amber-50 text-amber-900",
    badge: "bg-amber-100 text-amber-800",
  },
  danger: {
    container: "border-rose-100 bg-rose-50 text-rose-900",
    badge: "bg-rose-100 text-rose-800",
  },
};

export default function AIInsightCard({
  title = "تحليل الذكاء الاصطناعي",
  description,
  icon,
  tone = "info",
  confidence,
  action,
  className = "",
}: AIInsightCardProps) {
  return (
    <section
      className={`rounded-3xl border p-5 shadow-sm ${styles[tone].container} ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white">
            {icon ?? <Sparkles className="h-5 w-5" />}
          </div>

          <div>
            <h3 className="font-black">{title}</h3>

            {confidence !== undefined && (
              <span
                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${styles[tone].badge}`}
              >
                درجة الثقة {confidence}%
              </span>
            )}
          </div>
        </div>

        {action}
      </div>

      <p className="mt-4 text-sm leading-7 opacity-90">
        {description}
      </p>
    </section>
  );
}
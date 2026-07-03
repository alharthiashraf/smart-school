import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

type AIInsightCardProps = {
  title?: string;
  description: string;
  icon?: ReactNode;
  tone?: "info" | "success" | "warning" | "danger";
};

export default function AIInsightCard({
  title = "تحليل ذكي",
  description,
  icon,
  tone = "info",
}: AIInsightCardProps) {
  const styles = {
    info: "border-cyan-100 bg-cyan-50 text-cyan-800",
    success: "border-emerald-100 bg-emerald-50 text-emerald-800",
    warning: "border-amber-100 bg-amber-50 text-amber-800",
    danger: "border-rose-100 bg-rose-50 text-rose-800",
  };

  return (
    <div className={`rounded-3xl border p-5 ${styles[tone]}`}>
      <div className="mb-3 flex items-center gap-2 font-black">
        {icon || <Sparkles className="h-5 w-5" />}
        {title}
      </div>

      <p className="text-sm font-bold leading-7 opacity-90">{description}</p>
    </div>
  );
}
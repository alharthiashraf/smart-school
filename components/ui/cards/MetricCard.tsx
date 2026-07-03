import type { ReactNode } from "react";

type MetricTone = "success" | "warning" | "danger" | "info" | "neutral";

type MetricCardProps = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: MetricTone;
  hint?: string;
  progress?: number;
};

export default function MetricCard({
  label,
  value,
  icon,
  tone = "neutral",
  hint,
  progress,
}: MetricCardProps) {
  const tones: Record<MetricTone, string> = {
    success: "text-emerald-700 bg-emerald-50 border-emerald-100",
    warning: "text-amber-700 bg-amber-50 border-amber-100",
    danger: "text-rose-700 bg-rose-50 border-rose-100",
    info: "text-cyan-700 bg-cyan-50 border-cyan-100",
    neutral: "text-slate-700 bg-slate-50 border-slate-100",
  };

  const progressValue =
    typeof progress === "number" ? Math.min(Math.max(progress, 0), 100) : null;

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold opacity-80">{label}</p>
          <p className="mt-1 text-2xl font-black">{value}</p>

          {hint && <p className="mt-1 text-xs font-bold opacity-70">{hint}</p>}
        </div>

        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/70">
            {icon}
          </div>
        )}
      </div>

      {progressValue !== null && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
          <div
            className="h-full rounded-full bg-current"
            style={{ width: `${progressValue}%` }}
          />
        </div>
      )}
    </div>
  );
}
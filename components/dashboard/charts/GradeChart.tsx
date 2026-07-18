import { BarChart3 } from "lucide-react";

import { BaseCard } from "@/components/ui/cards";

export type GradeChartProps = {
  averageScore: number;
  title?: string;
  description?: string;
  className?: string;
};

export default function GradeChart({
  averageScore,
  title = "متوسط الدرجات",
  description = "مؤشر عام للأداء الأكاديمي",
  className = "",
}: GradeChartProps) {
  const value = Math.max(0, Math.min(averageScore, 100));

  const progressColor =
    value >= 90
      ? "bg-[var(--app-green)]"
      : value >= 80
        ? "bg-[var(--app-blue)]"
        : value >= 70
          ? "bg-[var(--app-accent)]"
          : value >= 60
            ? "bg-[var(--app-warning)]"
            : "bg-[var(--app-destructive)]";

  return (
    <BaseCard
      as="section"
      padding="md"
      className={className}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-blue-soft)] text-[var(--app-blue)]">
          <BarChart3
            aria-hidden="true"
            className="h-5 w-5"
          />
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-black text-[var(--app-text)]">
            {title}
          </h2>

          <p className="mt-0.5 text-xs leading-5 text-[var(--app-text-muted)]">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-[var(--app-text-muted)]">
          <span>الأداء</span>

          <span className="font-black text-[var(--app-text)]">
            {value}%
          </span>
        </div>

        <div
          className="h-3 overflow-hidden rounded-full bg-[var(--app-card-soft)]"
          role="progressbar"
          aria-label="متوسط الدرجات"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
        >
          <div
            className={[
              "h-full rounded-full transition-[width] duration-300",
              progressColor,
            ].join(" ")}
            style={{
              width: `${value}%`,
            }}
          />
        </div>

        <p className="mt-3 text-xs font-bold text-[var(--app-text-muted)]">
          {value >= 90
            ? "الأداء الأكاديمي ممتاز."
            : value >= 80
              ? "الأداء الأكاديمي جيد جدًا."
              : value >= 70
                ? "الأداء الأكاديمي جيد."
                : value >= 60
                  ? "يحتاج إلى متابعة."
                  : "يحتاج إلى تدخل عاجل."}
        </p>
      </div>
    </BaseCard>
  );
}

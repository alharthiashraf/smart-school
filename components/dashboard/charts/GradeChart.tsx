import { BarChart3 } from "lucide-react";

type GradeChartProps = {
  averageScore: number;
};

export default function GradeChart({ averageScore }: GradeChartProps) {
  const value = Math.max(0, Math.min(averageScore, 100));

  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--app-blue-soft)] text-[var(--app-blue)]">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-black text-[var(--app-text)]">متوسط الدرجات</h2>
          <p className="text-xs text-[var(--app-text-muted)]">مؤشر عام للأداء الأكاديمي</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs font-bold text-[var(--app-text-muted)]">
          <span>الأداء</span>
          <span>{value}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[var(--app-card-soft)]">
          <div
            className="h-full rounded-full bg-[var(--app-blue)]"
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </section>
  );
}

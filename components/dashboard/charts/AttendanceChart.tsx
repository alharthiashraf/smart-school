import AttendanceTrend, { type AttendanceTrendItem } from "../AttendanceTrend";

export type AttendanceChartItem = AttendanceTrendItem;

type AttendanceChartProps = {
  data: AttendanceChartItem[];
};

export default function AttendanceChart({ data }: AttendanceChartProps) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black text-[var(--app-text)]">
          اتجاه الحضور آخر 7 أيام
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          قراءة مبسطة تساعد الإدارة على متابعة الانضباط.
        </p>
      </div>

      <AttendanceTrend data={data} />
    </section>
  );
}

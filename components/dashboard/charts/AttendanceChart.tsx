import AttendanceTrend, {
  type AttendanceTrendItem,
} from "../AttendanceTrend";

import { BaseCard } from "@/components/ui/cards";

export type AttendanceChartItem = AttendanceTrendItem;

export type AttendanceChartProps = {
  data: AttendanceChartItem[];
  title?: string;
  description?: string;
  className?: string;
};

export default function AttendanceChart({
  data,
  title = "اتجاه الحضور آخر 7 أيام",
  description = "قراءة مبسطة تساعد الإدارة على متابعة الانضباط.",
  className = "",
}: AttendanceChartProps) {
  return (
    <BaseCard
      as="section"
      padding="md"
      className={className}
    >
      <div className="mb-4">
        <h2 className="text-lg font-black text-[var(--app-text)]">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
          {description}
        </p>
      </div>

      <AttendanceTrend data={data} />
    </BaseCard>
  );
}
import { EmptyState } from "@/components/ui/empty-state";
import ChartBar from "./ChartBar";

export type AttendanceTrendItem = {
  date: string;
  present: number;
  absent: number;
  late: number;
};

type AttendanceTrendProps = {
  data: AttendanceTrendItem[];
};

export default function AttendanceTrend({ data }: AttendanceTrendProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="لا توجد بيانات"
        description="لا توجد بيانات كافية للرسم."
      />
    );
  }

  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => [item.present, item.absent, item.late]),
  );

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const label = new Intl.DateTimeFormat("ar-SA", {
          weekday: "short",
        }).format(new Date(item.date));

        return (
          <div
            key={item.date}
            className="grid grid-cols-[70px_1fr] items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-3"
          >
            <span className="text-xs font-black text-[var(--app-text-muted)]">
              {label}
            </span>

            <div className="space-y-1.5">
              <ChartBar
                value={item.present}
                max={maxValue}
                label="حضور"
                className="bg-[var(--app-green)]"
              />

              <ChartBar
                value={item.absent}
                max={maxValue}
                label="غياب"
                className="bg-[var(--app-destructive)]"
              />

              <ChartBar
                value={item.late}
                max={maxValue}
                label="تأخر"
                className="bg-[var(--app-accent)]"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

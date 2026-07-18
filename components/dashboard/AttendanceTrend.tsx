import { EmptyState } from "@/components/ui/empty-state";

import ChartBar from "./ChartBar";

export type AttendanceTrendItem = {
  date: string;
  present: number;
  absent: number;
  late: number;
};

export type AttendanceTrendProps = {
  data: AttendanceTrendItem[];
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

function formatDay(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "short",
  }).format(date);
}

function normalizeValue(value: number) {
  return Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

export default function AttendanceTrend({
  data,
  className = "",
  emptyTitle = "لا توجد بيانات",
  emptyDescription = "لا توجد بيانات كافية للرسم.",
}: AttendanceTrendProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    );
  }

  const normalizedData = data.map((item) => ({
    ...item,
    present: normalizeValue(item.present),
    absent: normalizeValue(item.absent),
    late: normalizeValue(item.late),
  }));

  const maxValue = Math.max(
    1,
    ...normalizedData.flatMap((item) => [
      item.present,
      item.absent,
      item.late,
    ]),
  );

  return (
    <div
      className={[
        "space-y-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {normalizedData.map((item) => (
        <article
          key={item.date}
          className="grid grid-cols-[70px_minmax(0,1fr)] items-center gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-3"
        >
          <time
            dateTime={item.date}
            className="text-xs font-black text-[var(--app-text-muted)]"
          >
            {formatDay(item.date)}
          </time>

          <div className="min-w-0 space-y-1.5">
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
        </article>
      ))}
    </div>
  );
}

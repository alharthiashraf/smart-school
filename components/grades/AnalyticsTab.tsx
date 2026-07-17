"use client";

import {
  type LucideIcon,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  LineChart,
  Medal,
  ShieldCheck,
  Target,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { AIRecommendation } from "@/components/ui/ai";
import { StatusBadge } from "@/components/ui/badges";
import { BaseCard } from "@/components/ui/cards";

export type AnalyticsStudentRow = {
  student: {
    id: string;
    full_name: string;
    student_number?: string | null;
    classroom_name?: string | null;
  };
  percent?: number;
  score?: number;
  total?: number;
  label?: string;
  status?: string;
};

export type AnalyticsTabProps = {
  subjectRows: AnalyticsStudentRow[];
  behaviorRows: AnalyticsStudentRow[];
  attendanceRows: AnalyticsStudentRow[];
};

type DistributionTone =
  | "excellent"
  | "veryGood"
  | "good"
  | "pass"
  | "risk";

type DistributionItem = {
  label: string;
  count: number;
  from: number;
  to: number;
  tone: DistributionTone;
};

type RiskItem = {
  student: AnalyticsStudentRow["student"];
  area: "المواد" | "السلوك" | "المواظبة";
  value: number;
  severity: "high" | "medium";
};

type ClassroomSummaryItem = {
  classroom: string;
  students: number;
  average: number;
  pass: number;
};

type FollowRow = {
  name: string;
  value: string;
  subtitle: string;
};

type MetricTone =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "primary";

const distributionToneClasses: Record<DistributionTone, string> = {
  excellent: "bg-[var(--app-green)]",
  veryGood: "bg-[var(--app-blue)]",
  good: "bg-[var(--app-accent)]",
  pass: "bg-[var(--app-warning)]",
  risk: "bg-[var(--app-destructive)]",
};

const metricToneClasses: Record<
  MetricTone,
  {
    icon: string;
    bar: string;
  }
> = {
  success: {
    icon: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
    bar: "bg-[var(--app-green)]",
  },
  info: {
    icon: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    bar: "bg-[var(--app-blue)]",
  },
  warning: {
    icon: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    bar: "bg-[var(--app-accent)]",
  },
  danger: {
    icon:
      "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    bar: "bg-[var(--app-destructive)]",
  },
  primary: {
    icon:
      "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
    bar: "bg-[var(--app-primary)]",
  },
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function getValue(row: AnalyticsStudentRow) {
  return clamp(toNumber(row.percent ?? row.score ?? 0));
}

function average(values: number[]) {
  if (values.length === 0) return 0;

  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function median(values: number[]) {
  if (values.length === 0) return 0;

  const sortedValues = [...values].sort(
    (first, second) => first - second,
  );

  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return Math.round(
      (sortedValues[middleIndex - 1] +
        sortedValues[middleIndex]) /
        2,
    );
  }

  return Math.round(sortedValues[middleIndex]);
}

function passRate(
  rows: AnalyticsStudentRow[],
  passMark = 60,
) {
  if (rows.length === 0) return 0;

  const passedCount = rows.filter(
    (row) => getValue(row) >= passMark,
  ).length;

  return Math.round((passedCount / rows.length) * 100);
}

function completionRate(rows: AnalyticsStudentRow[]) {
  if (rows.length === 0) return 0;

  const completedCount = rows.filter(
    (row) => getValue(row) > 0,
  ).length;

  return Math.round((completedCount / rows.length) * 100);
}

function buildDistribution(
  rows: AnalyticsStudentRow[],
): DistributionItem[] {
  const values = rows.map(getValue);

  return [
    {
      label: "90 - 100",
      count: values.filter((value) => value >= 90).length,
      from: 90,
      to: 100,
      tone: "excellent",
    },
    {
      label: "80 - 89",
      count: values.filter(
        (value) => value >= 80 && value < 90,
      ).length,
      from: 80,
      to: 89,
      tone: "veryGood",
    },
    {
      label: "70 - 79",
      count: values.filter(
        (value) => value >= 70 && value < 80,
      ).length,
      from: 70,
      to: 79,
      tone: "good",
    },
    {
      label: "60 - 69",
      count: values.filter(
        (value) => value >= 60 && value < 70,
      ).length,
      from: 60,
      to: 69,
      tone: "pass",
    },
    {
      label: "أقل من 60",
      count: values.filter((value) => value < 60).length,
      from: 0,
      to: 59,
      tone: "risk",
    },
  ];
}

function getMetricTone(percent: number): MetricTone {
  if (percent >= 90) return "success";
  if (percent >= 80) return "info";
  if (percent >= 70) return "warning";
  if (percent >= 60) return "primary";
  return "danger";
}

function getBadgeTone(
  value: number,
): "success" | "info" | "warning" | "danger" {
  if (value >= 90) return "success";
  if (value >= 80) return "info";
  if (value >= 60) return "warning";
  return "danger";
}

function topRows(
  rows: AnalyticsStudentRow[],
  limit = 10,
) {
  return [...rows]
    .filter((row) => getValue(row) > 0)
    .sort(
      (first, second) =>
        getValue(second) - getValue(first),
    )
    .slice(0, limit);
}

function lowRows(
  rows: AnalyticsStudentRow[],
  limit = 10,
) {
  return [...rows]
    .filter((row) => getValue(row) > 0)
    .sort(
      (first, second) =>
        getValue(first) - getValue(second),
    )
    .slice(0, limit);
}

function buildRiskItems(
  subjectRows: AnalyticsStudentRow[],
  behaviorRows: AnalyticsStudentRow[],
  attendanceRows: AnalyticsStudentRow[],
): RiskItem[] {
  const subjectRisk: RiskItem[] = subjectRows
    .filter((row) => getValue(row) < 60)
    .map((row) => ({
      student: row.student,
      area: "المواد",
      value: getValue(row),
      severity:
        getValue(row) < 45 ? "high" : "medium",
    }));

  const behaviorRisk: RiskItem[] = behaviorRows
    .filter((row) => getValue(row) < 75)
    .map((row) => ({
      student: row.student,
      area: "السلوك",
      value: getValue(row),
      severity:
        getValue(row) < 60 ? "high" : "medium",
    }));

  const attendanceRisk: RiskItem[] = attendanceRows
    .filter((row) => getValue(row) < 75)
    .map((row) => ({
      student: row.student,
      area: "المواظبة",
      value: getValue(row),
      severity:
        getValue(row) < 60 ? "high" : "medium",
    }));

  return [
    ...subjectRisk,
    ...behaviorRisk,
    ...attendanceRisk,
  ]
    .sort((first, second) => {
      if (first.severity !== second.severity) {
        return first.severity === "high" ? -1 : 1;
      }

      return first.value - second.value;
    })
    .slice(0, 18);
}

function buildClassroomSummary(
  rows: AnalyticsStudentRow[],
): ClassroomSummaryItem[] {
  const classroomMap = new Map<
    string,
    {
      classroom: string;
      values: number[];
      students: number;
    }
  >();

  rows.forEach((row) => {
    const classroom =
      row.student.classroom_name || "بدون فصل";

    const current = classroomMap.get(classroom) ?? {
      classroom,
      values: [],
      students: 0,
    };

    current.values.push(getValue(row));
    current.students += 1;
    classroomMap.set(classroom, current);
  });

  return Array.from(classroomMap.values())
    .map((item) => ({
      classroom: item.classroom,
      students: item.students,
      average: average(item.values),
      pass: Math.round(
        (item.values.filter((value) => value >= 60)
          .length /
          item.values.length) *
          100,
      ),
    }))
    .sort(
      (first, second) =>
        second.average - first.average,
    );
}

export default function AnalyticsTab({
  subjectRows,
  behaviorRows,
  attendanceRows,
}: AnalyticsTabProps) {
  const subjectValues = subjectRows.map(getValue);
  const behaviorValues = behaviorRows.map(getValue);
  const attendanceValues = attendanceRows.map(getValue);

  const subjectAverage = average(subjectValues);
  const behaviorAverage = average(behaviorValues);
  const attendanceAverage = average(attendanceValues);

  const overallAverage = average(
    [
      subjectAverage,
      behaviorAverage,
      attendanceAverage,
    ].filter((value) => value > 0),
  );

  const subjectPass = passRate(subjectRows, 60);
  const subjectCompletion = completionRate(subjectRows);
  const subjectMedian = median(subjectValues);

  const risks = buildRiskItems(
    subjectRows,
    behaviorRows,
    attendanceRows,
  );

  const highRisks = risks.filter(
    (item) => item.severity === "high",
  ).length;

  const classrooms =
    buildClassroomSummary(subjectRows);

  const studentCount =
    subjectRows.length ||
    behaviorRows.length ||
    attendanceRows.length;

  return (
    <section className="space-y-4">
      <BaseCard
        as="section"
        padding="none"
        className="overflow-hidden"
      >
        <div className="bg-[var(--app-primary)] p-5 text-[var(--app-primary-foreground)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--app-primary-foreground)]/20 bg-[var(--app-primary-foreground)]/10 px-3 py-1.5 text-xs font-bold">
                <LineChart
                  aria-hidden="true"
                  className="h-4 w-4 text-[var(--app-accent)]"
                />
                لوحة قيادة مركز التقييم
              </div>

              <h2 className="mt-3 text-2xl font-black">
                التحليلات الأكاديمية
              </h2>

              <p className="mt-1 max-w-3xl text-xs font-bold leading-6 text-[var(--app-primary-foreground)]/75">
                قراءة شاملة لدرجات المواد والسلوك
                والمواظبة مع تحديد الطلاب الأكثر
                احتياجًا للمتابعة.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <HeroStat
                icon={Users}
                label="الطلاب"
                value={studentCount}
              />

              <HeroStat
                icon={CheckCircle2}
                label="نسبة النجاح"
                value={`${subjectPass}%`}
              />

              <HeroStat
                icon={Target}
                label="اكتمال الرصد"
                value={`${subjectCompletion}%`}
              />

              <HeroStat
                icon={AlertTriangle}
                label="حالات حرجة"
                value={highRisks}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <AnalyticsMetricCard
            icon={BarChart3}
            title="متوسط المادة"
            value={`${subjectAverage}%`}
            subtitle={`الوسيط ${subjectMedian}%`}
            percent={subjectAverage}
          />

          <AnalyticsMetricCard
            icon={ShieldCheck}
            title="متوسط السلوك"
            value={`${behaviorAverage}%`}
            subtitle={`${behaviorRows.length} طالب`}
            percent={behaviorAverage}
          />

          <AnalyticsMetricCard
            icon={Clock3}
            title="متوسط المواظبة"
            value={`${attendanceAverage}%`}
            subtitle={`${attendanceRows.length} طالب`}
            percent={attendanceAverage}
          />

          <AnalyticsMetricCard
            icon={TrendingUp}
            title="المؤشر العام"
            value={`${overallAverage}%`}
            subtitle="متوسط المادة والسلوك والمواظبة"
            percent={overallAverage}
          />
        </div>
      </BaseCard>

      <div className="grid gap-3 xl:grid-cols-3">
        <DistributionCard
          title="توزيع درجات المواد"
          icon={BookOpen}
          rows={buildDistribution(subjectRows)}
          total={subjectRows.length}
        />

        <DistributionCard
          title="توزيع السلوك"
          icon={ShieldCheck}
          rows={buildDistribution(behaviorRows)}
          total={behaviorRows.length}
        />

        <DistributionCard
          title="توزيع المواظبة"
          icon={Clock3}
          rows={buildDistribution(attendanceRows)}
          total={attendanceRows.length}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <RankingCard
          title="أفضل 10 طلاب في المادة"
          icon={Trophy}
          rows={topRows(subjectRows, 10)}
          tone="top"
        />

        <RankingCard
          title="أقل 10 طلاب في المادة"
          icon={TrendingDown}
          rows={lowRows(subjectRows, 10)}
          tone="low"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <FollowCard
          title="درجات مواد منخفضة"
          icon={BookOpen}
          rows={subjectRows
            .filter((row) => getValue(row) < 60)
            .sort(
              (first, second) =>
                getValue(first) - getValue(second),
            )
            .slice(0, 8)
            .map((row) => ({
              name: row.student.full_name,
              value: `${getValue(row)}%`,
              subtitle:
                row.student.classroom_name || "-",
            }))}
        />

        <FollowCard
          title="سلوك منخفض"
          icon={ShieldCheck}
          rows={behaviorRows
            .filter((row) => getValue(row) < 75)
            .sort(
              (first, second) =>
                getValue(first) - getValue(second),
            )
            .slice(0, 8)
            .map((row) => ({
              name: row.student.full_name,
              value: `${getValue(row)}/100`,
              subtitle:
                row.student.classroom_name || "-",
            }))}
        />

        <FollowCard
          title="مواظبة منخفضة"
          icon={Clock3}
          rows={attendanceRows
            .filter((row) => getValue(row) < 75)
            .sort(
              (first, second) =>
                getValue(first) - getValue(second),
            )
            .slice(0, 8)
            .map((row) => ({
              name: row.student.full_name,
              value: `${getValue(row)}/100`,
              subtitle:
                row.student.classroom_name || "-",
            }))}
        />
      </div>

      <RiskPanel risks={risks} />

      <div className="grid gap-3 xl:grid-cols-2">
        <ClassroomCard rows={classrooms} />

        <TeacherSummary
          students={studentCount}
          subjectAverage={subjectAverage}
          passRate={subjectPass}
          completion={subjectCompletion}
          risks={risks.length}
        />
      </div>
    </section>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-primary-foreground)]/15 bg-[var(--app-primary-foreground)]/10 px-3 py-2 text-center">
      <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-[var(--app-radius-md)] bg-[var(--app-primary-foreground)]/10">
        <Icon
          aria-hidden="true"
          className="h-4 w-4 text-[var(--app-accent)]"
        />
      </div>

      <div className="text-[10px] font-bold text-[var(--app-primary-foreground)]/70">
        {label}
      </div>

      <div className="mt-0.5 text-base font-black">
        {value}
      </div>
    </div>
  );
}

function AnalyticsMetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
  percent,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  subtitle: string;
  percent: number;
}) {
  const tone = getMetricTone(percent);
  const normalizedPercent = clamp(percent);

  return (
    <BaseCard
      as="article"
      padding="sm"
      variant="soft"
    >
      <div
        className={[
          "mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-lg)]",
          metricToneClasses[tone].icon,
        ].join(" ")}
      >
        <Icon
          aria-hidden="true"
          className="h-5 w-5"
        />
      </div>

      <div className="text-xs font-bold text-[var(--app-text-muted)]">
        {title}
      </div>

      <div className="mt-1 text-2xl font-black text-[var(--app-text)]">
        {value}
      </div>

      <div className="mt-0.5 text-xs font-bold text-[var(--app-text-muted)]">
        {subtitle}
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--app-card)]"
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalizedPercent}
      >
        <div
          className={[
            "h-full rounded-full transition-[width] duration-300",
            metricToneClasses[tone].bar,
          ].join(" ")}
          style={{
            width: `${normalizedPercent}%`,
          }}
        />
      </div>
    </BaseCard>
  );
}

function DistributionCard({
  title,
  icon: Icon,
  rows,
  total,
}: {
  title: string;
  icon: LucideIcon;
  rows: DistributionItem[];
  total: number;
}) {
  return (
    <BaseCard as="article" padding="sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--app-radius-md)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
          <Icon
            aria-hidden="true"
            className="h-4 w-4"
          />
        </div>

        <h3 className="text-sm font-black text-[var(--app-text)]">
          {title}
        </h3>
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const width = total
            ? Math.round((row.count / total) * 100)
            : 0;

          return (
            <div key={row.label}>
              <div className="mb-1 flex justify-between gap-3 text-xs font-bold text-[var(--app-text-muted)]">
                <span>{row.label}</span>

                <span>
                  {row.count} طالب · {width}%
                </span>
              </div>

              <div
                className="h-2.5 overflow-hidden rounded-full bg-[var(--app-card-soft)]"
                role="progressbar"
                aria-label={`${title} ${row.label}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={width}
              >
                <div
                  className={[
                    "h-full rounded-full transition-[width] duration-300",
                    distributionToneClasses[row.tone],
                  ].join(" ")}
                  style={{
                    width: `${width}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </BaseCard>
  );
}

function RankingCard({
  title,
  icon: Icon,
  rows,
  tone,
}: {
  title: string;
  icon: LucideIcon;
  rows: AnalyticsStudentRow[];
  tone: "top" | "low";
}) {
  return (
    <BaseCard as="article" padding="sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--app-text)]">
        <Icon
          aria-hidden="true"
          className="h-4 w-4 text-[var(--app-accent)]"
        />

        {title}
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <Empty text="لا توجد بيانات." />
        ) : (
          rows.map((row, index) => {
            const value = getValue(row);

            return (
              <div
                key={`${row.student.id}-${index}`}
                className="flex items-center justify-between gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 text-xs"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--app-radius-md)] text-xs font-black",
                      tone === "top"
                        ? "bg-[var(--app-green-soft)] text-[var(--app-green)]"
                        : "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
                    ].join(" ")}
                  >
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-black text-[var(--app-text)]">
                      {row.student.full_name}
                    </div>

                    <div className="mt-0.5 truncate font-bold text-[var(--app-text-muted)]">
                      {row.student.classroom_name || "-"}
                    </div>
                  </div>
                </div>

                <StatusBadge tone={getBadgeTone(value)}>
                  {value}%
                </StatusBadge>
              </div>
            );
          })
        )}
      </div>
    </BaseCard>
  );
}

function FollowCard({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: LucideIcon;
  rows: FollowRow[];
}) {
  return (
    <BaseCard as="article" padding="sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--app-text)]">
        <Icon
          aria-hidden="true"
          className="h-4 w-4 text-[var(--app-accent)]"
        />

        {title}
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <Empty text="لا توجد حالات متابعة." />
        ) : (
          rows.map((row, index) => (
            <div
              key={`${row.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 text-xs"
            >
              <div className="min-w-0">
                <div className="truncate font-black text-[var(--app-text)]">
                  {row.name}
                </div>

                <div className="mt-0.5 truncate font-bold text-[var(--app-text-muted)]">
                  {row.subtitle}
                </div>
              </div>

              <StatusBadge tone="danger">
                {row.value}
              </StatusBadge>
            </div>
          ))
        )}
      </div>
    </BaseCard>
  );
}

function RiskPanel({
  risks,
}: {
  risks: RiskItem[];
}) {
  return (
    <BaseCard
      as="section"
      padding="sm"
      className="border-[var(--app-destructive)]/25 bg-[var(--app-destructive-soft)]"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--app-destructive)]">
        <Flame
          aria-hidden="true"
          className="h-4 w-4"
        />

        الطلاب الأكثر حاجة للمتابعة
      </div>

      {risks.length === 0 ? (
        <Empty text="لا توجد حالات متابعة حرجة حاليًا." />
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {risks.map((item, index) => (
            <div
              key={`${item.student.id}-${item.area}-${index}`}
              className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] p-3 text-xs shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-black text-[var(--app-text)]">
                    {item.student.full_name}
                  </div>

                  <div className="mt-0.5 truncate font-bold text-[var(--app-text-muted)]">
                    {item.student.classroom_name || "-"}
                  </div>
                </div>

                <StatusBadge
                  tone={
                    item.severity === "high"
                      ? "danger"
                      : "warning"
                  }
                >
                  {item.severity === "high"
                    ? "حرج"
                    : "متابعة"}
                </StatusBadge>
              </div>

              <div className="mt-3">
                <StatusBadge tone="danger">
                  {item.area} · {item.value}
                </StatusBadge>
              </div>
            </div>
          ))}
        </div>
      )}
    </BaseCard>
  );
}

function ClassroomCard({
  rows,
}: {
  rows: ClassroomSummaryItem[];
}) {
  return (
    <BaseCard as="article" padding="sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--app-text)]">
        <Medal
          aria-hidden="true"
          className="h-4 w-4 text-[var(--app-accent)]"
        />

        ترتيب الفصول حسب متوسط المادة
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <Empty text="لا توجد بيانات فصول." />
        ) : (
          rows.map((row, index) => {
            const tone = getMetricTone(row.average);

            return (
              <div
                key={row.classroom}
                className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate font-black text-[var(--app-text)]">
                    {index + 1}. {row.classroom}
                  </div>

                  <StatusBadge
                    tone={getBadgeTone(row.average)}
                  >
                    {row.average}%
                  </StatusBadge>
                </div>

                <div className="mt-1 flex justify-between gap-3 font-bold text-[var(--app-text-muted)]">
                  <span>{row.students} طالب</span>
                  <span>نجاح {row.pass}%</span>
                </div>

                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-card)]"
                  role="progressbar"
                  aria-label={`متوسط ${row.classroom}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={row.average}
                >
                  <div
                    className={[
                      "h-full rounded-full transition-[width] duration-300",
                      metricToneClasses[tone].bar,
                    ].join(" ")}
                    style={{
                      width: `${clamp(row.average)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </BaseCard>
  );
}

function TeacherSummary({
  students,
  subjectAverage,
  passRate: subjectPassRate,
  completion,
  risks,
}: {
  students: number;
  subjectAverage: number;
  passRate: number;
  completion: number;
  risks: number;
}) {
  const recommendations: string[] = [];

  if (completion < 100) {
    recommendations.push(
      "يوجد رصد غير مكتمل، يفضّل إكمال الدرجات قبل الاعتماد.",
    );
  }

  if (subjectPassRate < 70) {
    recommendations.push(
      "نسبة النجاح منخفضة، يفضّل تنفيذ خطة علاجية قصيرة.",
    );
  }

  if (subjectAverage < 70) {
    recommendations.push(
      "متوسط المادة يحتاج متابعة وتحليل للمكونات الأضعف.",
    );
  }

  if (risks > 0) {
    recommendations.push(
      "توجد حالات تحتاج تدخلًا مباشرًا من المعلم أو المرشد الطلابي.",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "الوضع العام جيد، ويمكن الاستمرار في المتابعة الدورية.",
    );
  }

  return (
    <BaseCard as="article" padding="sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--app-text)]">
        <Target
          aria-hidden="true"
          className="h-4 w-4 text-[var(--app-accent)]"
        />

        ملخص المعلم
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <MiniMetric
          label="الطلاب"
          value={students}
        />

        <MiniMetric
          label="متوسط المادة"
          value={`${subjectAverage}%`}
        />

        <MiniMetric
          label="نسبة النجاح"
          value={`${subjectPassRate}%`}
        />

        <MiniMetric
          label="اكتمال الرصد"
          value={`${completion}%`}
        />
      </div>

      <div className="mt-4">
        <AIRecommendation
          title="توصيات ذكية"
          recommendation={recommendations.join(" • ")}
        />
      </div>
    </BaseCard>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 text-center">
      <div className="text-[10px] font-bold text-[var(--app-text-muted)]">
        {label}
      </div>

      <div className="mt-0.5 text-base font-black text-[var(--app-text)]">
        {value}
      </div>
    </div>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-dashed border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 text-center text-xs font-bold text-[var(--app-text-muted)]">
      {text}
    </div>
  );
}

import {
  BookOpen,
  CalendarDays,
  Shield,
  Sparkles,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/badges";
import { BaseCard } from "@/components/ui/cards";
import { EmptyState } from "@/components/ui/empty-state";

import ActionCard, {
  type QuickAction,
} from "./ActionCard";
import CommandMetric from "./CommandMetric";
import MiniMetric from "./MiniMetric";

export type DashboardStats = {
  students: number;
  teachers: number;
  unreadNotifications: number;
};

export type CommandCenterProps = {
  schoolName: string;
  roleName: string;
  academicYear: string;
  semester: string;
  today: string;
  stats: DashboardStats;
  attendanceRate: number;
  dataQuality: number;
  systemHealth: string;
  loading: boolean;
  quickActions: QuickAction[];
  title?: string;
  description?: string;
  className?: string;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default function CommandCenter({
  schoolName,
  roleName,
  academicYear,
  semester,
  today,
  stats,
  attendanceRate,
  dataQuality,
  systemHealth,
  loading,
  quickActions,
  title = "مركز القيادة اليومي",
  description = "ملخص تنفيذي سريع لحالة المدرسة، الحضور، جودة البيانات، والتنبيهات حسب صلاحية المستخدم.",
  className = "",
}: CommandCenterProps) {
  const normalizedAttendanceRate =
    clampPercent(attendanceRate);

  const normalizedDataQuality =
    clampPercent(dataQuality);

  const stable = systemHealth === "مستقر";

  return (
    <BaseCard
      as="section"
      padding="none"
      variant="elevated"
      className={[
        "overflow-hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="grid gap-0 xl:grid-cols-[1.25fr_1fr]">
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,var(--app-primary-soft),transparent_34%),linear-gradient(135deg,var(--app-card),var(--app-surface))] p-5 sm:p-6">
          <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[var(--app-primary-soft)] blur-3xl" />

          <div className="relative flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-1.5 text-xs font-black text-[var(--app-primary)]">
                  <Sparkles
                    aria-hidden="true"
                    className="h-4 w-4 text-[var(--app-accent)]"
                  />

                  {title}
                </div>

                <h2 className="text-2xl font-black text-[var(--app-text)] sm:text-3xl">
                  {schoolName}
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-[var(--app-text-muted)]">
                  {description}
                </p>
              </div>

              <BaseCard
                as="aside"
                variant="soft"
                padding="sm"
                className="min-w-[180px] text-right"
              >
                <p className="text-xs font-bold text-[var(--app-text-muted)]">
                  الدور
                </p>

                <p className="mt-1 text-sm font-black text-[var(--app-text)]">
                  {roleName}
                </p>

                <p className="mt-2 text-xs font-bold text-[var(--app-text-muted)]">
                  {today}
                </p>
              </BaseCard>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <CommandMetric
                icon={
                  <CalendarDays
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                }
                label="العام الدراسي"
                value={academicYear}
                badge="نشط"
              />

              <CommandMetric
                icon={
                  <BookOpen
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                }
                label="الفصل الدراسي"
                value={semester}
                badge="جاري"
              />

              <CommandMetric
                icon={
                  <Shield
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                }
                label="حالة النظام"
                value={systemHealth}
                badge={
                  normalizedDataQuality >= 75
                    ? "بيانات جيدة"
                    : "تحتاج إكمال"
                }
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <MiniMetric
                label="الحضور"
                value={`${normalizedAttendanceRate}%`}
                loading={loading}
              />

              <MiniMetric
                label="الطلاب"
                value={stats.students}
                loading={loading}
              />

              <MiniMetric
                label="المعلمون"
                value={stats.teachers}
                loading={loading}
              />

              <MiniMetric
                label="التنبيهات"
                value={stats.unreadNotifications}
                loading={loading}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--app-border)] bg-[var(--app-card-soft)] p-5 sm:p-6 xl:border-r xl:border-t-0">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-black text-[var(--app-text)]">
                إجراءات مقترحة
              </h3>

              <p className="mt-1 text-xs font-bold leading-5 text-[var(--app-text-muted)]">
                اختصارات تشغيلية حسب دورك الحالي.
              </p>
            </div>

            <StatusBadge
              tone={stable ? "success" : "warning"}
              icon={
                <Shield
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                />
              }
            >
              {systemHealth}
            </StatusBadge>
          </div>

          {quickActions.length === 0 ? (
            <EmptyState
              title="لا توجد إجراءات"
              description="لا توجد إجراءات مقترحة لهذا الدور حاليًا."
            />
          ) : (
            <div className="space-y-2">
              {quickActions.map((action) => (
                <ActionCard
                  key={`${action.href}-${action.title}`}
                  action={action}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </BaseCard>
  );
}
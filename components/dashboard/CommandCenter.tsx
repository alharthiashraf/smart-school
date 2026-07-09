import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ExternalLink,
  Shield,
  Sparkles,
} from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import CommandMetric from "./CommandMetric";
import MiniMetric from "./MiniMetric";
import type { QuickAction } from "./ActionCard";

type DashboardStats = {
  students: number;
  teachers: number;
  unreadNotifications: number;
};

type CommandCenterProps = {
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
};

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
}: CommandCenterProps) {
  const healthTone =
    systemHealth === "مستقر" ? "text-emerald-600" : "text-amber-600";

  return (
    <section className="overflow-hidden rounded-[32px] border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
      <div className="grid gap-0 xl:grid-cols-[1.25fr_1fr]">
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(15,118,110,0.18),transparent_34%),linear-gradient(135deg,var(--app-card),var(--app-surface))] p-5 sm:p-6">
          <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[var(--app-primary-soft)] blur-3xl" />

          <div className="relative flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1 text-xs font-black text-[var(--app-primary)]">
                  <Sparkles size={14} />
                  مركز القيادة اليومي
                </div>

                <h2 className="text-2xl font-black text-[var(--app-text)] sm:text-3xl">
                  {schoolName}
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-[var(--app-text-muted)]">
                  ملخص تنفيذي سريع لحالة المدرسة، الحضور، جودة البيانات، والتنبيهات حسب صلاحية المستخدم.
                </p>
              </div>

              <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-right shadow-sm">
                <p className="text-xs font-bold text-[var(--app-text-muted)]">
                  الدور
                </p>

                <p className="mt-1 text-sm font-black text-[var(--app-text)]">
                  {roleName}
                </p>

                <p className="mt-2 text-xs font-bold text-[var(--app-text-muted)]">
                  {today}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <CommandMetric
                icon={<CalendarDays size={19} />}
                label="العام الدراسي"
                value={academicYear}
                badge="نشط"
              />

              <CommandMetric
                icon={<BookOpen size={19} />}
                label="الفصل الدراسي"
                value={semester}
                badge="جاري"
              />

              <CommandMetric
                icon={<Shield size={19} />}
                label="حالة النظام"
                value={systemHealth}
                badge={dataQuality >= 75 ? "بيانات جيدة" : "تحتاج إكمال"}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <MiniMetric
                label="الحضور"
                value={`${attendanceRate}%`}
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

        <div className="border-t border-[var(--app-border)] bg-[var(--app-surface)] p-5 sm:p-6 xl:border-r xl:border-t-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-[var(--app-text)]">
                إجراءات مقترحة
              </h3>

              <p className="mt-1 text-xs font-bold text-[var(--app-text-muted)]">
                اختصارات تشغيلية حسب دورك الحالي.
              </p>
            </div>

            <span
              className={`rounded-full bg-[var(--app-card)] px-3 py-1 text-xs font-black ${healthTone}`}
            >
              {systemHealth}
            </span>
          </div>

          {quickActions.length === 0 ? (
            <EmptyState
              title="لا توجد إجراءات"
              description="لا توجد إجراءات مقترحة لهذا الدور حاليًا."
            />
          ) : (
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-3 transition hover:-translate-y-0.5 hover:border-[var(--app-accent)] hover:shadow-sm"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary-soft)] text-[var(--app-primary)] transition group-hover:bg-[var(--app-primary)] group-hover:text-white">
                      <Icon size={18} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-[var(--app-text)]">
                        {action.title}
                      </span>

                      <span className="mt-0.5 block truncate text-xs font-bold text-[var(--app-text-muted)]">
                        {action.description}
                      </span>
                    </span>

                    <ExternalLink
                      size={15}
                      className="text-[var(--app-text-muted)]"
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
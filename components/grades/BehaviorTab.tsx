"use client";

import {
  type LucideIcon,
  AlertTriangle,
  Minus,
  Plus,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/badges";
import {
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/buttons";
import { BaseCard } from "@/components/ui/cards";
import {
  DataTableEmpty,
  DataTableLoading,
} from "@/components/ui/tables";

export type ConductStudent = {
  id: string;
  full_name: string;
  student_number?: string | null;
  classroom_name?: string | null;
};

export type ConductEvent = {
  id?: string;
  student_id: string;
  score_type: "behavior" | "attendance";
  event_type: "increase" | "decrease" | "set";
  points: number;
  reason?: string | null;
  note?: string | null;
  created_at?: string | null;
};

export type ConductRow = {
  student: ConductStudent;
  score: number;
  label: string;
  status: string;
};

export type BehaviorTabProps = {
  loading?: boolean;
  rows: ConductRow[];
  events: ConductEvent[];
  onStudentClick?: (student: ConductStudent) => void;
  onOpenAction: (
    student: ConductStudent,
    scoreType: "behavior",
    action: "increase" | "decrease",
  ) => void;
};

type ScoreTone = "success" | "info" | "warning" | "danger";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function getScoreTone(score: number): ScoreTone {
  if (score >= 95) return "success";
  if (score >= 85) return "info";
  if (score >= 75) return "warning";
  return "danger";
}

function getProgressClass(score: number) {
  if (score >= 95) return "bg-[var(--app-green)]";
  if (score >= 85) return "bg-[var(--app-blue)]";
  if (score >= 75) return "bg-[var(--app-accent)]";
  if (score >= 60) return "bg-[var(--app-warning)]";
  return "bg-[var(--app-destructive)]";
}

function getRowClass(score: number) {
  if (score < 60) {
    return "bg-[var(--app-destructive-soft)]/45";
  }

  if (score < 75) {
    return "bg-[var(--app-accent-soft)]/45";
  }

  return "bg-[var(--app-card)]";
}

function getLatestEvents(
  events: ConductEvent[],
  studentId: string,
  limit = 3,
) {
  return events
    .filter(
      (event) =>
        event.student_id === studentId &&
        event.score_type === "behavior",
    )
    .sort((first, second) => {
      const firstDate = first.created_at
        ? new Date(first.created_at).getTime()
        : 0;

      const secondDate = second.created_at
        ? new Date(second.created_at).getTime()
        : 0;

      return secondDate - firstDate;
    })
    .slice(0, limit);
}

export default function BehaviorTab({
  loading = false,
  rows,
  events,
  onStudentClick,
  onOpenAction,
}: BehaviorTabProps) {
  const average =
    rows.length > 0
      ? Math.round(
          rows.reduce((sum, row) => sum + row.score, 0) /
            rows.length,
        )
      : 0;

  const excellentCount = rows.filter(
    (row) => row.score >= 95,
  ).length;

  const followUpCount = rows.filter(
    (row) => row.score < 75,
  ).length;

  const criticalCount = rows.filter(
    (row) => row.score < 60,
  ).length;

  const sortedRows = [...rows].sort((first, second) => {
    if (first.score !== second.score) {
      return first.score - second.score;
    }

    return first.student.full_name.localeCompare(
      second.student.full_name,
      "ar",
      {
        sensitivity: "base",
      },
    );
  });

  return (
    <BaseCard
      as="section"
      padding="none"
      className="overflow-hidden"
      aria-busy={loading}
    >
      <div className="bg-[var(--app-primary)] px-4 py-4 text-[var(--app-primary-foreground)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-base font-black">
              <ShieldCheck
                aria-hidden="true"
                className="h-5 w-5 text-[var(--app-accent)]"
              />

              مركز رصد السلوك
            </div>

            <p className="mt-1 max-w-3xl text-xs font-bold leading-6 text-[var(--app-primary-foreground)]/75">
              مستقل تمامًا عن المواد — الدرجة الأساسية 100 —
              والتعديل يتم بالخصم أو الإضافة مع توثيق السبب.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <HeaderStat
              icon={Users}
              label="الطلاب"
              value={rows.length}
            />

            <HeaderStat
              icon={UserCheck}
              label="ممتاز"
              value={excellentCount}
            />

            <HeaderStat
              icon={AlertTriangle}
              label="متابعة"
              value={followUpCount}
            />

            <HeaderStat
              icon={TrendingUp}
              label="المتوسط"
              value={`${average}%`}
            />
          </div>
        </div>
      </div>

      {criticalCount > 0 && (
        <div
          className="border-b border-[var(--app-destructive)]/20 bg-[var(--app-destructive-soft)] px-4 py-3 text-xs font-black text-[var(--app-destructive)]"
          role="alert"
        >
          يوجد {criticalCount} طالب بدرجة سلوك حرجة أقل من 60،
          يفضّل مراجعة السجل واتخاذ إجراء تربوي.
        </div>
      )}

      {loading ? (
        <DataTableLoading columns={6} rows={6} />
      ) : sortedRows.length === 0 ? (
        <DataTableEmpty
          title="لا توجد بيانات سلوك"
          description="لا يوجد طلاب مطابقون أو لم تُسجل درجات السلوك بعد."
        />
      ) : (
        <div className="max-h-[64vh] overflow-auto">
          <table className="w-full min-w-[980px] table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-[56px]" />
              <col className="w-[280px]" />
              <col className="w-[130px]" />
              <col className="w-[130px]" />
              <col className="w-[210px]" />
              <col className="w-[230px]" />
            </colgroup>

            <thead className="sticky top-0 z-20">
              <tr className="border-b border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]">
                <th
                  scope="col"
                  className="p-2 text-center font-black"
                >
                  #
                </th>

                <th
                  scope="col"
                  className="sticky right-0 z-30 bg-[var(--app-card-soft)] p-2.5 text-right font-black"
                >
                  الطالب
                </th>

                <th
                  scope="col"
                  className="p-2 text-center font-black"
                >
                  درجة السلوك
                </th>

                <th
                  scope="col"
                  className="p-2 text-center font-black"
                >
                  التقدير
                </th>

                <th
                  scope="col"
                  className="p-2 text-center font-black"
                >
                  آخر العمليات
                </th>

                <th
                  scope="col"
                  className="p-2 text-center font-black"
                >
                  الإجراء
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedRows.map((row, index) => {
                const recentEvents = getLatestEvents(
                  events,
                  row.student.id,
                );

                const normalizedScore = clampScore(row.score);
                const scoreTone = getScoreTone(row.score);

                return (
                  <tr
                    key={row.student.id}
                    className={[
                      "border-b border-[var(--app-border)] transition last:border-b-0 hover:bg-[var(--app-primary-soft)]/35",
                      getRowClass(row.score),
                    ].join(" ")}
                  >
                    <td className="p-2 text-center font-black text-[var(--app-text-muted)]">
                      {index + 1}
                    </td>

                    <td className="sticky right-0 z-10 bg-inherit p-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          onStudentClick?.(row.student)
                        }
                        disabled={!onStudentClick}
                        className="w-full rounded-[var(--app-radius-md)] p-1 text-right transition hover:bg-[var(--app-card)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] disabled:cursor-default"
                      >
                        <div
                          className={[
                            "truncate text-sm font-black",
                            row.score < 75
                              ? "text-[var(--app-destructive)]"
                              : "text-[var(--app-text)]",
                          ].join(" ")}
                        >
                          {row.student.full_name}
                        </div>

                        <div className="mt-0.5 truncate text-[10px] font-bold text-[var(--app-text-muted)]">
                          {row.student.student_number ||
                            "بدون رقم"}{" "}
                          ·{" "}
                          {row.student.classroom_name || "-"}
                        </div>
                      </button>
                    </td>

                    <td className="p-2 text-center">
                      <div className="mx-auto w-28 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] p-2 shadow-sm">
                        <div className="text-base font-black text-[var(--app-text)]">
                          {row.score} / 100
                        </div>

                        <div
                          className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--app-card-soft)]"
                          role="progressbar"
                          aria-label={`درجة سلوك ${row.student.full_name}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={normalizedScore}
                        >
                          <div
                            className={[
                              "h-full rounded-full transition-[width] duration-300",
                              getProgressClass(row.score),
                            ].join(" ")}
                            style={{
                              width: `${normalizedScore}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="p-2 text-center">
                      <StatusBadge tone={scoreTone}>
                        {row.label}
                      </StatusBadge>

                      <div
                        className={[
                          "mt-1 font-black",
                          row.score >= 75
                            ? "text-[var(--app-green)]"
                            : "text-[var(--app-destructive)]",
                        ].join(" ")}
                      >
                        {row.status}
                      </div>
                    </td>

                    <td className="p-2 text-right">
                      {recentEvents.length > 0 ? (
                        <div className="space-y-1">
                          {recentEvents.map(
                            (event, eventIndex) => {
                              const isIncrease =
                                event.event_type ===
                                "increase";

                              const isSet =
                                event.event_type === "set";

                              return (
                                <div
                                  key={
                                    event.id ||
                                    `${event.student_id}-${event.created_at}-${eventIndex}`
                                  }
                                  className="rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-card)] px-2 py-1 text-[10px] font-bold text-[var(--app-text-muted)]"
                                >
                                  <span
                                    className={
                                      isIncrease
                                        ? "font-black text-[var(--app-green)]"
                                        : isSet
                                          ? "font-black text-[var(--app-blue)]"
                                          : "font-black text-[var(--app-destructive)]"
                                    }
                                  >
                                    {isIncrease
                                      ? "إضافة"
                                      : isSet
                                        ? "تعيين"
                                        : "خصم"}{" "}
                                    {event.points}
                                  </span>

                                  {" · "}

                                  {event.reason || "بدون سبب"}
                                </div>
                              );
                            },
                          )}
                        </div>
                      ) : (
                        <span className="font-bold text-[var(--app-text-muted)]">
                          لا توجد عمليات
                        </span>
                      )}
                    </td>

                    <td className="p-2 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <SecondaryButton
                          type="button"
                          onClick={() =>
                            onOpenAction(
                              row.student,
                              "behavior",
                              "decrease",
                            )
                          }
                          icon={
                            <Minus
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
                            />
                          }
                          className="border-[var(--app-destructive)]/25 bg-[var(--app-destructive-soft)] text-[var(--app-destructive)] hover:bg-[var(--app-destructive-soft)]"
                        >
                          خصم
                        </SecondaryButton>

                        <PrimaryButton
                          type="button"
                          onClick={() =>
                            onOpenAction(
                              row.student,
                              "behavior",
                              "increase",
                            )
                          }
                          icon={
                            <Plus
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
                            />
                          }
                        >
                          إضافة
                        </PrimaryButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </BaseCard>
  );
}

function HeaderStat({
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
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-[var(--app-radius-md)] bg-[var(--app-primary-foreground)]/10">
        <Icon
          aria-hidden="true"
          className="h-3.5 w-3.5 text-[var(--app-accent)]"
        />
      </div>

      <div className="text-[10px] font-bold text-[var(--app-primary-foreground)]/70">
        {label}
      </div>

      <div className="mt-0.5 text-sm font-black">
        {value}
      </div>
    </div>
  );
}


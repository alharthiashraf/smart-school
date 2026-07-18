"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";
import {
  type LucideIcon,
  Activity,
  BookOpen,
  CalendarClock,
  Clock3,
  FileText,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/badges";
import { BaseCard } from "@/components/ui/cards";
import { DataTableEmpty } from "@/components/ui/tables";

export type DrawerStudent = {
  id: string;
  full_name: string;
  student_number?: string | null;
  national_id?: string | null;
  classroom_name?: string | null;
};

export type DrawerGradeComponent = {
  id: string;
  component_name: string;
  max_score: number;
  display_order?: number | null;
};

export type DrawerGradeScore = {
  student_id: string;
  component_id: string;
  score: number;
};

export type DrawerConductEvent = {
  id?: string;
  student_id: string;
  score_type: "behavior" | "attendance";
  event_type: "increase" | "decrease" | "set";
  points: number;
  reason?: string | null;
  note?: string | null;
  created_at?: string | null;
};

export type StudentDrawerProps = {
  open: boolean;
  student: DrawerStudent | null;
  components: DrawerGradeComponent[];
  scores: DrawerGradeScore[];
  behaviorScore: number;
  attendanceScore: number;
  events: DrawerConductEvent[];
  onClose: () => void;
};

type ScoreTone =
  | "success"
  | "info"
  | "warning"
  | "danger";

function toNumber(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? numericValue
    : 0;
}

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(max, Math.max(min, value));
}

function getScoreLabel(score: number) {
  if (score >= 95) return "ممتاز";
  if (score >= 85) return "جيد جدًا";
  if (score >= 75) return "جيد";
  if (score >= 60) return "يحتاج متابعة";
  return "خطر";
}

function getScoreTone(score: number): ScoreTone {
  if (score >= 90) return "success";
  if (score >= 80) return "info";
  if (score >= 70) return "warning";
  return "danger";
}

function getProgressClass(percent: number) {
  if (percent >= 90) {
    return "bg-[var(--app-green)]";
  }

  if (percent >= 80) {
    return "bg-[var(--app-blue)]";
  }

  if (percent >= 70) {
    return "bg-[var(--app-accent)]";
  }

  if (percent >= 60) {
    return "bg-[var(--app-warning)]";
  }

  return "bg-[var(--app-destructive)]";
}

function getConductClass(score: number) {
  if (score >= 90) {
    return "border-[var(--app-green)]/25 bg-[var(--app-green-soft)] text-[var(--app-green)]";
  }

  if (score >= 80) {
    return "border-[var(--app-blue)]/25 bg-[var(--app-blue-soft)] text-[var(--app-blue)]";
  }

  if (score >= 70) {
    return "border-[var(--app-accent)]/25 bg-[var(--app-accent-soft)] text-[var(--app-text)]";
  }

  if (score >= 60) {
    return "border-[var(--app-warning)]/25 bg-[var(--app-warning-soft)] text-[var(--app-warning)]";
  }

  return "border-[var(--app-destructive)]/25 bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function StudentDrawer({
  open,
  student,
  components,
  scores,
  behaviorScore,
  attendanceScore,
  events,
  onClose,
}: StudentDrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef =
    useRef<HTMLButtonElement | null>(null);

  const orderedComponents = useMemo(
    () =>
      [...components].sort(
        (first, second) =>
          (first.display_order ?? 999) -
          (second.display_order ?? 999),
      ),
    [components],
  );

  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();

    scores.forEach((score) => {
      map.set(
        `${score.student_id}-${score.component_id}`,
        score.score,
      );
    });

    return map;
  }, [scores]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const timeoutId = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.clearTimeout(timeoutId);
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [onClose, open]);

  if (!open || !student) return null;

  const getScore = (componentId: string) =>
    scoreMap.get(
      `${student.id}-${componentId}`,
    ) ?? 0;

  const subjectTotal = orderedComponents.reduce(
    (sum, component) =>
      sum + toNumber(getScore(component.id)),
    0,
  );

  const subjectMax = orderedComponents.reduce(
    (sum, component) =>
      sum + toNumber(component.max_score),
    0,
  );

  const subjectPercent =
    subjectMax > 0
      ? Math.round(
          (subjectTotal / subjectMax) * 1000,
        ) / 10
      : 0;

  const completedCount =
    orderedComponents.filter((component) =>
      scoreMap.has(
        `${student.id}-${component.id}`,
      ),
    ).length;

  const missingCount = Math.max(
    0,
    orderedComponents.length - completedCount,
  );

  const normalizedBehavior = clamp(
    behaviorScore,
    0,
    100,
  );

  const normalizedAttendance = clamp(
    attendanceScore,
    0,
    100,
  );

  const overallAverage = Math.round(
    (
      subjectPercent +
      normalizedBehavior +
      normalizedAttendance
    ) / 3,
  );

  const studentEvents = events
    .filter(
      (event) =>
        event.student_id === student.id,
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
    .slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) =>
          event.stopPropagation()
        }
        className="flex h-full w-full max-w-xl flex-col border-r border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-[var(--app-shadow)]"
      >
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-card)]/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-xl font-black text-[var(--app-text)]"
            >
              ملف الطالب
            </h2>

            <p
              id={descriptionId}
              className="mt-1 text-xs font-bold text-[var(--app-text-muted)]"
            >
              عرض الدرجات والسلوك والمواظبة
              وآخر العمليات.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="إغلاق ملف الطالب"
            title="إغلاق"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)] transition hover:bg-[var(--app-card-soft)] hover:text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-card)]"
          >
            <X
              aria-hidden="true"
              className="h-5 w-5"
            />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <BaseCard
            as="section"
            variant="hero"
            padding="lg"
            className="relative overflow-hidden"
          >
            <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[var(--app-primary-foreground)]/10" />
            <div className="pointer-events-none absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-[var(--app-accent)]/10" />

            <div className="relative flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--app-radius-xl)] border border-[var(--app-primary-foreground)]/20 bg-[var(--app-primary-foreground)]/10">
                <UserRound
                  aria-hidden="true"
                  className="h-8 w-8 text-[var(--app-accent)]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-2xl font-black">
                  {student.full_name}
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[var(--app-primary-foreground)]/75">
                  <span className="rounded-full bg-[var(--app-primary-foreground)]/10 px-3 py-1">
                    {student.student_number ||
                      "بدون رقم"}
                  </span>

                  <span className="rounded-full bg-[var(--app-primary-foreground)]/10 px-3 py-1">
                    {student.classroom_name || "-"}
                  </span>

                  {student.national_id && (
                    <span className="rounded-full bg-[var(--app-primary-foreground)]/10 px-3 py-1">
                      الهوية: {student.national_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="relative mt-5 rounded-[var(--app-radius-lg)] border border-[var(--app-primary-foreground)]/15 bg-[var(--app-primary-foreground)]/10 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-[var(--app-primary-foreground)]/75">
                <span>المؤشر العام</span>
                <span>{overallAverage}%</span>
              </div>

              <div
                className="h-2.5 overflow-hidden rounded-full bg-[var(--app-primary-foreground)]/20"
                role="progressbar"
                aria-label="المؤشر العام للطالب"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={clamp(
                  overallAverage,
                  0,
                  100,
                )}
              >
                <div
                  className="h-full rounded-full bg-[var(--app-accent)] transition-[width] duration-300"
                  style={{
                    width: `${clamp(
                      overallAverage,
                      0,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </BaseCard>

          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
            <SummaryCard
              icon={BookOpen}
              label="المادة"
              value={`${subjectPercent}%`}
              hint={`${subjectTotal} / ${subjectMax}`}
            />

            <SummaryCard
              icon={ShieldCheck}
              label="السلوك"
              value={`${normalizedBehavior}`}
              hint={getScoreLabel(
                normalizedBehavior,
              )}
            />

            <SummaryCard
              icon={Clock3}
              label="المواظبة"
              value={`${normalizedAttendance}`}
              hint={getScoreLabel(
                normalizedAttendance,
              )}
            />

            <SummaryCard
              icon={Activity}
              label="الاكتمال"
              value={`${completedCount}/${orderedComponents.length}`}
              hint={
                missingCount
                  ? `ناقص ${missingCount}`
                  : "مكتمل"
              }
            />
          </div>

          <SectionTitle
            icon={GraduationCap}
            title="درجات المادة الحالية"
          />

          <div className="space-y-2">
            {orderedComponents.length === 0 ? (
              <BaseCard
                as="div"
                variant="soft"
                padding="none"
              >
                <DataTableEmpty
                  title="لا توجد مكونات درجات"
                  description="لم يتم ربط مكونات درجات بهذا التوزيع بعد."
                />
              </BaseCard>
            ) : (
              orderedComponents.map((component) => {
                const value = getScore(
                  component.id,
                );

                const max = toNumber(
                  component.max_score,
                );

                const percent =
                  max > 0
                    ? Math.round(
                        (value / max) * 100,
                      )
                    : 0;

                const isMissing = !scoreMap.has(
                  `${student.id}-${component.id}`,
                );

                return (
                  <BaseCard
                    key={component.id}
                    as="article"
                    variant={
                      isMissing ? "soft" : "default"
                    }
                    padding="sm"
                    className={
                      isMissing
                        ? "border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)]"
                        : ""
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-black text-[var(--app-text)]">
                          {component.component_name}
                        </div>

                        <div className="mt-0.5 text-[10px] font-bold text-[var(--app-text-muted)]">
                          {isMissing
                            ? "لم يتم الرصد"
                            : "تم الرصد"}
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="font-black text-[var(--app-text)]">
                          {value} / {max}
                        </div>

                        <div className="text-[10px] font-bold text-[var(--app-text-muted)]">
                          {percent}%
                        </div>
                      </div>
                    </div>

                    <div
                      className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--app-card-soft)]"
                      role="progressbar"
                      aria-label={`${component.component_name} للطالب`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={clamp(
                        percent,
                        0,
                        100,
                      )}
                    >
                      <div
                        className={[
                          "h-full rounded-full transition-[width] duration-300",
                          getProgressClass(percent),
                        ].join(" ")}
                        style={{
                          width: `${clamp(
                            percent,
                            0,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </BaseCard>
                );
              })
            )}
          </div>

          <SectionTitle
            icon={TrendingUp}
            title="السلوك والمواظبة"
          />

          <div className="grid grid-cols-2 gap-2">
            <ConductBox
              title="السلوك"
              score={normalizedBehavior}
            />

            <ConductBox
              title="المواظبة"
              score={normalizedAttendance}
            />
          </div>

          <SectionTitle
            icon={CalendarClock}
            title="آخر العمليات"
          />

          <div className="space-y-2">
            {studentEvents.length === 0 ? (
              <BaseCard
                as="div"
                variant="soft"
                padding="none"
              >
                <DataTableEmpty
                  title="لا توجد عمليات"
                  description="لا توجد عمليات مسجلة لهذا الطالب."
                />
              </BaseCard>
            ) : (
              studentEvents.map(
                (event, index) => {
                  const isBehavior =
                    event.score_type === "behavior";

                  const isIncrease =
                    event.event_type ===
                    "increase";

                  const isSet =
                    event.event_type === "set";

                  return (
                    <BaseCard
                      key={
                        event.id ||
                        `${event.student_id}-${event.created_at}-${index}`
                      }
                      as="article"
                      padding="sm"
                      className="text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            tone={
                              isBehavior
                                ? "success"
                                : "info"
                            }
                          >
                            {isBehavior
                              ? "السلوك"
                              : "المواظبة"}
                          </StatusBadge>

                          <StatusBadge
                            tone={
                              isIncrease
                                ? "success"
                                : isSet
                                  ? "info"
                                  : "danger"
                            }
                          >
                            {isIncrease
                              ? "إضافة"
                              : isSet
                                ? "تعيين"
                                : "خصم"}{" "}
                            {event.points}
                          </StatusBadge>
                        </div>

                        <time
                          dateTime={
                            event.created_at ||
                            undefined
                          }
                          className="shrink-0 font-bold text-[var(--app-text-muted)]"
                        >
                          {formatDate(
                            event.created_at,
                          )}
                        </time>
                      </div>

                      <div className="mt-2 font-bold text-[var(--app-text)]">
                        {event.reason ||
                          "بدون سبب"}
                      </div>

                      {event.note && (
                        <div className="mt-2 rounded-[var(--app-radius-md)] bg-[var(--app-card-soft)] p-2 leading-6 text-[var(--app-text-muted)]">
                          {event.note}
                        </div>
                      )}
                    </BaseCard>
                  );
                },
              )
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="mb-3 mt-6 flex items-center gap-2 text-sm font-black text-[var(--app-text)]">
      <div className="flex h-8 w-8 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] text-[var(--app-primary-foreground)]">
        <Icon
          aria-hidden="true"
          className="h-4 w-4 text-[var(--app-accent)]"
        />
      </div>

      {title}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <BaseCard
      as="article"
      variant="soft"
      padding="sm"
      className="text-center"
    >
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] text-[var(--app-primary-foreground)]">
        <Icon
          aria-hidden="true"
          className="h-4 w-4 text-[var(--app-accent)]"
        />
      </div>

      <div className="text-[10px] font-bold text-[var(--app-text-muted)]">
        {label}
      </div>

      <div className="mt-0.5 text-lg font-black text-[var(--app-text)]">
        {value}
      </div>

      <div className="text-[10px] font-bold text-[var(--app-text-muted)]">
        {hint}
      </div>
    </BaseCard>
  );
}

function ConductBox({
  title,
  score,
}: {
  title: string;
  score: number;
}) {
  return (
    <div
      className={[
        "rounded-[var(--app-radius-lg)] border p-4 text-center",
        getConductClass(score),
      ].join(" ")}
    >
      <div className="text-xs font-bold">
        {title}
      </div>

      <div className="mt-1 text-2xl font-black">
        {score}
      </div>

      <div className="mt-1 text-[10px] font-bold">
        {getScoreLabel(score)}
      </div>
    </div>
  );
}


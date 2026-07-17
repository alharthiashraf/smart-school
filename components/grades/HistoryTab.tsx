"use client";

import {
  type LucideIcon,
  CalendarClock,
  Clock3,
  History,
  MinusCircle,
  PlusCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/badges";
import { BaseCard } from "@/components/ui/cards";
import { DataTableEmpty } from "@/components/ui/tables";

export type HistoryStudent = {
  id: string;
  full_name: string;
  student_number?: string | null;
  classroom_name?: string | null;
};

export type HistoryEvent = {
  id?: string;
  student_id: string;
  score_type: "behavior" | "attendance";
  event_type: "increase" | "decrease" | "set";
  points: number;
  reason?: string | null;
  note?: string | null;
  created_at?: string | null;
};

export type HistoryTabProps = {
  students: HistoryStudent[];
  events: HistoryEvent[];
  search?: string;
};

type EventTone = {
  icon: LucideIcon;
  badgeTone: "success" | "danger" | "info";
  borderClass: string;
  iconClass: string;
};

function getStudent(
  students: HistoryStudent[],
  studentId: string,
) {
  return (
    students.find(
      (student) => student.id === studentId,
    ) ?? null
  );
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

function getDateGroup(value?: string | null) {
  if (!value) return "بدون تاريخ";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "بدون تاريخ";
  }

  return date.toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function eventTypeLabel(
  type: HistoryEvent["event_type"],
) {
  if (type === "increase") return "إضافة";
  if (type === "decrease") return "خصم";
  return "تعيين";
}

function eventTone(
  event: HistoryEvent,
): EventTone {
  if (event.event_type === "increase") {
    return {
      icon: PlusCircle,
      badgeTone: "success",
      borderClass:
        "border-[var(--app-green)]/25",
      iconClass: "text-[var(--app-green)]",
    };
  }

  if (event.event_type === "decrease") {
    return {
      icon: MinusCircle,
      badgeTone: "danger",
      borderClass:
        "border-[var(--app-destructive)]/25",
      iconClass:
        "text-[var(--app-destructive)]",
    };
  }

  return {
    icon: History,
    badgeTone: "info",
    borderClass: "border-[var(--app-blue)]/25",
    iconClass: "text-[var(--app-blue)]",
  };
}

function normalizeSearch(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ar")
    .replace(/\s+/g, " ")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

export default function HistoryTab({
  students,
  events,
  search = "",
}: HistoryTabProps) {
  const normalizedQuery = normalizeSearch(search);

  const filteredEvents = events
    .filter((event) => {
      const student = getStudent(
        students,
        event.student_id,
      );

      if (!student) return false;

      const searchableText = normalizeSearch(`
        ${student.full_name || ""}
        ${student.student_number || ""}
        ${student.classroom_name || ""}
        ${event.reason || ""}
        ${event.note || ""}
        ${event.score_type || ""}
        ${event.event_type || ""}
      `);

      return (
        !normalizedQuery ||
        searchableText.includes(normalizedQuery)
      );
    })
    .sort((first, second) => {
      const firstDate = first.created_at
        ? new Date(first.created_at).getTime()
        : 0;

      const secondDate = second.created_at
        ? new Date(second.created_at).getTime()
        : 0;

      return secondDate - firstDate;
    });

  const behaviorCount = filteredEvents.filter(
    (event) => event.score_type === "behavior",
  ).length;

  const attendanceCount = filteredEvents.filter(
    (event) => event.score_type === "attendance",
  ).length;

  const decreaseCount = filteredEvents.filter(
    (event) => event.event_type === "decrease",
  ).length;

  const increaseCount = filteredEvents.filter(
    (event) => event.event_type === "increase",
  ).length;

  const grouped = filteredEvents.reduce<
    Record<string, HistoryEvent[]>
  >((groups, event) => {
    const key = getDateGroup(event.created_at);

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(event);

    return groups;
  }, {});

  return (
    <BaseCard
      as="section"
      padding="none"
      className="overflow-hidden"
    >
      <div className="bg-[var(--app-primary)] px-4 py-4 text-[var(--app-primary-foreground)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-base font-black">
              <History
                aria-hidden="true"
                className="h-5 w-5 text-[var(--app-accent)]"
              />

              سجل السلوك والمواظبة
            </div>

            <p className="mt-1 max-w-3xl text-xs font-bold leading-6 text-[var(--app-primary-foreground)]/75">
              سجل زمني لجميع عمليات الخصم والإضافة
              والتعيين المرتبطة بسلوك الطلاب ومواظبتهم.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat
              icon={ShieldCheck}
              label="السلوك"
              value={behaviorCount}
            />

            <Stat
              icon={Clock3}
              label="المواظبة"
              value={attendanceCount}
            />

            <Stat
              icon={PlusCircle}
              label="إضافات"
              value={increaseCount}
            />

            <Stat
              icon={MinusCircle}
              label="خصومات"
              value={decreaseCount}
            />
          </div>
        </div>
      </div>

      <div className="max-h-[66vh] overflow-auto bg-[var(--app-card-soft)] p-4">
        {filteredEvents.length === 0 ? (
          <BaseCard
            as="div"
            variant="soft"
            padding="none"
          >
            <DataTableEmpty
              title="لا توجد عمليات مطابقة"
              description="غيّر عبارة البحث أو تحقق من وجود سجلات للسلوك والمواظبة."
            />
          </BaseCard>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(
              ([date, dayEvents]) => (
                <section key={date}>
                  <div className="sticky top-0 z-10 mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-2 text-xs font-black text-[var(--app-text)] shadow-sm">
                    <CalendarClock
                      aria-hidden="true"
                      className="h-4 w-4 text-[var(--app-accent)]"
                    />

                    {date}
                  </div>

                  <div className="relative space-y-3 border-r-2 border-[var(--app-border)] pr-4">
                    {dayEvents.map((event, index) => {
                      const student = getStudent(
                        students,
                        event.student_id,
                      );

                      if (!student) return null;

                      const isBehavior =
                        event.score_type === "behavior";

                      const tone = eventTone(event);
                      const Icon = tone.icon;

                      return (
                        <article
                          key={
                            event.id ||
                            `${event.student_id}-${event.created_at}-${index}`
                          }
                          className={[
                            "relative rounded-[var(--app-radius-xl)] border bg-[var(--app-card)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--app-shadow-soft)]",
                            tone.borderClass,
                          ].join(" ")}
                        >
                          <div className="absolute -right-[26px] top-5 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[var(--app-card-soft)] bg-[var(--app-card)] shadow-sm">
                            <Icon
                              aria-hidden="true"
                              className={[
                                "h-5 w-5",
                                tone.iconClass,
                              ].join(" ")}
                            />
                          </div>

                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <StatusBadge
                                  tone={
                                    isBehavior
                                      ? "success"
                                      : "info"
                                  }
                                  icon={
                                    isBehavior ? (
                                      <ShieldCheck
                                        aria-hidden="true"
                                        className="h-3 w-3"
                                      />
                                    ) : (
                                      <Clock3
                                        aria-hidden="true"
                                        className="h-3 w-3"
                                      />
                                    )
                                  }
                                >
                                  {isBehavior
                                    ? "السلوك"
                                    : "المواظبة"}
                                </StatusBadge>

                                <StatusBadge
                                  tone={tone.badgeTone}
                                >
                                  {eventTypeLabel(
                                    event.event_type,
                                  )}{" "}
                                  {event.points} درجة
                                </StatusBadge>
                              </div>

                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]">
                                  <UserRound
                                    aria-hidden="true"
                                    className="h-5 w-5"
                                  />
                                </div>

                                <div className="min-w-0">
                                  <h3 className="truncate text-base font-black text-[var(--app-text)]">
                                    {student.full_name}
                                  </h3>

                                  <p className="mt-0.5 text-xs font-bold text-[var(--app-text-muted)]">
                                    {student.student_number ||
                                      "بدون رقم"}{" "}
                                    ·{" "}
                                    {student.classroom_name ||
                                      "-"}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 text-xs font-bold text-[var(--app-text)]">
                                {event.reason ||
                                  "بدون سبب محدد"}

                                {event.note && (
                                  <div className="mt-2 rounded-[var(--app-radius-md)] bg-[var(--app-card)] p-2 leading-6 text-[var(--app-text-muted)]">
                                    {event.note}
                                  </div>
                                )}
                              </div>
                            </div>

                            <time
                              dateTime={
                                event.created_at || undefined
                              }
                              className="shrink-0 text-right text-xs font-bold text-[var(--app-text-muted)]"
                            >
                              {formatDate(
                                event.created_at,
                              )}
                            </time>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ),
            )}
          </div>
        )}
      </div>
    </BaseCard>
  );
}

function Stat({
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

      <div className="mt-0.5 text-sm font-black text-[var(--app-primary-foreground)]">
        {value}
      </div>
    </div>
  );
}

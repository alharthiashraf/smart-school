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

type Props = {
  students: HistoryStudent[];
  events: HistoryEvent[];
  search?: string;
};

function getStudent(students: HistoryStudent[], studentId: string) {
  return students.find((student) => student.id === studentId) || null;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "-";
  }
}

function getDateGroup(value?: string | null) {
  if (!value) return "بدون تاريخ";

  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "بدون تاريخ";
  }
}

function eventTypeLabel(type: HistoryEvent["event_type"]) {
  if (type === "increase") return "إضافة";
  if (type === "decrease") return "خصم";
  return "تعديل";
}

function eventTone(event: HistoryEvent) {
  if (event.event_type === "increase") {
    return {
      icon: PlusCircle,
      badge: "bg-emerald-50 text-emerald-700",
      border: "border-emerald-200",
      text: "text-emerald-700",
    };
  }

  if (event.event_type === "decrease") {
    return {
      icon: MinusCircle,
      badge: "bg-red-50 text-red-700",
      border: "border-red-200",
      text: "text-red-700",
    };
  }

  return {
    icon: History,
    badge: "bg-slate-50 text-slate-700",
    border: "border-slate-200",
    text: "text-slate-700",
  };
}

export default function HistoryTab({ students, events, search = "" }: Props) {
  const filteredEvents = events
    .filter((event) => {
      const student = getStudent(students, event.student_id);
      if (!student) return false;

      const q = search.trim().toLowerCase();

      const text = `
        ${student.full_name || ""}
        ${student.student_number || ""}
        ${student.classroom_name || ""}
        ${event.reason || ""}
        ${event.note || ""}
        ${event.score_type || ""}
        ${event.event_type || ""}
      `.toLowerCase();

      return !q || text.includes(q);
    })
    .sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

  const behaviorCount = filteredEvents.filter(
    (event) => event.score_type === "behavior"
  ).length;

  const attendanceCount = filteredEvents.filter(
    (event) => event.score_type === "attendance"
  ).length;

  const decreaseCount = filteredEvents.filter(
    (event) => event.event_type === "decrease"
  ).length;

  const increaseCount = filteredEvents.filter(
    (event) => event.event_type === "increase"
  ).length;

  const grouped = filteredEvents.reduce<Record<string, HistoryEvent[]>>(
    (acc, event) => {
      const key = getDateGroup(event.created_at);
      acc[key] = acc[key] || [];
      acc[key].push(event);
      return acc;
    },
    {}
  );

  return (
    <section className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-l from-[#0f1f3d] via-[#18315f] to-[#24477f] px-4 py-4 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-black">
              <History className="h-5 w-5 text-[#d4af37]" />
              سجل السلوك والمواظبة
            </div>

            <div className="mt-1 text-xs font-bold text-slate-200">
              سجل زمني لجميع عمليات الخصم والإضافة من student_conduct_events.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat icon={ShieldCheck} label="السلوك" value={behaviorCount} />
            <Stat icon={Clock3} label="المواظبة" value={attendanceCount} />
            <Stat icon={PlusCircle} label="إضافات" value={increaseCount} />
            <Stat icon={MinusCircle} label="خصومات" value={decreaseCount} />
          </div>
        </div>
      </div>

      <div className="max-h-[66vh] overflow-auto bg-slate-50/60 p-4">
        {filteredEvents.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center text-sm font-black text-slate-500 shadow-sm">
            لا توجد عمليات مطابقة.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, dayEvents]) => (
              <div key={date}>
                <div className="sticky top-0 z-10 mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm">
                  <CalendarClock className="h-4 w-4 text-[#d4af37]" />
                  {date}
                </div>

                <div className="relative space-y-3 border-r-2 border-slate-200 pr-4">
                  {dayEvents.map((event) => {
                    const student = getStudent(students, event.student_id);
                    if (!student) return null;

                    const isBehavior = event.score_type === "behavior";
                    const tone = eventTone(event);
                    const Icon = tone.icon;

                    return (
                      <div
                        key={event.id || `${event.student_id}-${event.created_at}`}
                        className={`relative rounded-3xl border bg-white p-4 shadow-sm ${tone.border}`}
                      >
                        <div className="absolute -right-[26px] top-5 flex h-10 w-10 items-center justify-center rounded-full border-4 border-slate-50 bg-white shadow-sm">
                          <Icon className={`h-5 w-5 ${tone.text}`} />
                        </div>

                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black ${
                                  isBehavior
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-blue-50 text-blue-700"
                                }`}
                              >
                                {isBehavior ? (
                                  <ShieldCheck className="h-3 w-3" />
                                ) : (
                                  <Clock3 className="h-3 w-3" />
                                )}
                                {isBehavior ? "السلوك" : "المواظبة"}
                              </span>

                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${tone.badge}`}
                              >
                                {eventTypeLabel(event.event_type)} {event.points} درجة
                              </span>
                            </div>

                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                                <UserRound className="h-5 w-5 text-slate-500" />
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-base font-black text-slate-900">
                                  {student.full_name}
                                </div>

                                <div className="mt-0.5 text-xs font-bold text-slate-400">
                                  {student.student_number || "بدون رقم"} ·{" "}
                                  {student.classroom_name || "-"}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-700">
                              {event.reason || "بدون سبب محدد"}

                              {event.note && (
                                <div className="mt-2 rounded-xl bg-white p-2 text-slate-500">
                                  {event.note}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right text-xs font-bold text-slate-400">
                            {formatDate(event.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
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
    <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-center">
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-3.5 w-3.5 text-[#d4af37]" />
      </div>
      <div className="text-[10px] font-bold text-slate-300">{label}</div>
      <div className="mt-0.5 text-sm font-black text-white">{value}</div>
    </div>
  );
}
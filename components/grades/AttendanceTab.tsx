"use client";

import {
  AlertTriangle,
  CalendarCheck,
  Clock3,
  Minus,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";

export type AttendanceStudent = {
  id: string;
  full_name: string;
  student_number?: string | null;
  classroom_name?: string | null;
};

export type AttendanceEvent = {
  id?: string;
  student_id: string;
  score_type: "behavior" | "attendance";
  event_type: "increase" | "decrease" | "set";
  points: number;
  reason?: string | null;
  note?: string | null;
  created_at?: string | null;
};

export type AttendanceRow = {
  student: AttendanceStudent;
  score: number;
  label: string;
  status: string;
};

type Props = {
  loading?: boolean;
  rows: AttendanceRow[];
  events: AttendanceEvent[];
  onStudentClick?: (student: AttendanceStudent) => void;
  onOpenAction: (
    student: AttendanceStudent,
    scoreType: "attendance",
    action: "increase" | "decrease"
  ) => void;
};

function percentClass(score: number) {
  if (score >= 95) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (score >= 85) return "bg-blue-50 text-blue-700 ring-blue-200";
  if (score >= 75) return "bg-amber-50 text-amber-700 ring-amber-200";
  if (score >= 60) return "bg-orange-50 text-orange-700 ring-orange-200";
  return "bg-red-50 text-red-700 ring-red-200";
}

function rowTone(score: number) {
  if (score < 60) return "bg-red-50/60";
  if (score < 75) return "bg-amber-50/60";
  return "bg-white";
}

function latestEvents(events: AttendanceEvent[], studentId: string, limit = 3) {
  return events
    .filter(
      (event) =>
        event.student_id === studentId && event.score_type === "attendance"
    )
    .slice(0, limit);
}

export default function AttendanceTab({
  loading = false,
  rows,
  events,
  onStudentClick,
  onOpenAction,
}: Props) {
  const average = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length)
    : 0;

  const excellent = rows.filter((row) => row.score >= 95).length;
  const regular = rows.filter((row) => row.score >= 90).length;
  const follow = rows.filter((row) => row.score < 75).length;
  const critical = rows.filter((row) => row.score < 60).length;

  const sortedRows = [...rows].sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.student.full_name.localeCompare(b.student.full_name, "ar");
  });

  return (
    <section className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-l from-[#0f1f3d] via-[#18315f] to-[#24477f] px-4 py-4 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-black">
              <Clock3 className="h-5 w-5 text-[#d4af37]" />
              مركز رصد المواظبة
            </div>

            <div className="mt-1 text-xs font-bold text-slate-200">
              مستقلة تمامًا عن المواد — الدرجة الأساسية 100 — للغياب والتأخر والانضباط الزمني.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat icon={Users} label="الطلاب" value={rows.length} />
            <Stat icon={CalendarCheck} label="منتظم" value={regular} />
            <Stat icon={AlertTriangle} label="متابعة" value={follow} />
            <Stat icon={TrendingUp} label="المتوسط" value={`${average}%`} />
          </div>
        </div>
      </div>

      {critical > 0 && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-xs font-black text-red-700">
          يوجد {critical} طالب بدرجة مواظبة حرجة أقل من 60، يفضّل مراجعة الغياب والتأخر.
        </div>
      )}

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
            <tr className="bg-slate-100 text-slate-700">
              <th className="p-2 text-center font-black">#</th>
              <th className="sticky right-0 z-30 bg-slate-100 p-2.5 text-right font-black">
                الطالب
              </th>
              <th className="p-2 text-center font-black">درجة المواظبة</th>
              <th className="p-2 text-center font-black">التقدير</th>
              <th className="p-2 text-center font-black">آخر العمليات</th>
              <th className="p-2 text-center font-black">الإجراء</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center font-black text-slate-500">
                  جاري تحميل درجات المواظبة...
                </td>
              </tr>
            ) : sortedRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center font-black text-slate-500">
                  لا يوجد طلاب مطابقون.
                </td>
              </tr>
            ) : (
              sortedRows.map((row, index) => {
                const lastEvents = latestEvents(events, row.student.id);
                const progress = Math.max(0, Math.min(100, row.score));

                return (
                  <tr
                    key={row.student.id}
                    className={`border-t border-slate-100 hover:bg-slate-50 ${rowTone(
                      row.score
                    )}`}
                  >
                    <td className="p-2 text-center font-black text-slate-400">
                      {index + 1}
                    </td>

                    <td className="sticky right-0 z-10 bg-inherit p-2.5">
                      <button
                        type="button"
                        onClick={() => onStudentClick?.(row.student)}
                        className="w-full rounded-xl p-1 text-right hover:bg-white/70"
                      >
                        <div
                          className={`truncate text-sm font-black ${
                            row.score < 75 ? "text-red-700" : "text-slate-900"
                          }`}
                        >
                          {row.student.full_name}
                        </div>

                        <div className="mt-0.5 truncate text-[10px] font-bold text-slate-400">
                          {row.student.student_number || "بدون رقم"} ·{" "}
                          {row.student.classroom_name || "-"}
                        </div>
                      </button>
                    </td>

                    <td className="p-2 text-center">
                      <div className="mx-auto w-28 rounded-2xl bg-white p-2 ring-1 ring-slate-200">
                        <div className="text-base font-black text-slate-900">
                          {row.score} / 100
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                          <div
                            className={
                              row.score >= 75
                                ? "h-full rounded-full bg-blue-600"
                                : row.score >= 60
                                ? "h-full rounded-full bg-amber-500"
                                : "h-full rounded-full bg-red-600"
                            }
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="p-2 text-center">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${percentClass(
                          row.score
                        )}`}
                      >
                        {row.label}
                      </span>

                      <div
                        className={
                          row.score >= 75
                            ? "mt-1 font-black text-blue-700"
                            : "mt-1 font-black text-red-700"
                        }
                      >
                        {row.status}
                      </div>
                    </td>

                    <td className="p-2 text-right">
                      {lastEvents.length > 0 ? (
                        <div className="space-y-1">
                          {lastEvents.map((event) => (
                            <div
                              key={
                                event.id ||
                                `${event.student_id}-${event.created_at}`
                              }
                              className="rounded-xl bg-white px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-100"
                            >
                              <span
                                className={
                                  event.event_type === "increase"
                                    ? "font-black text-emerald-700"
                                    : "font-black text-red-700"
                                }
                              >
                                {event.event_type === "increase" ? "إضافة" : "خصم"}{" "}
                                {event.points}
                              </span>
                              {" · "}
                              {event.reason || "بدون سبب"}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="font-bold text-slate-400">
                          لا توجد عمليات
                        </span>
                      )}
                    </td>

                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenAction(row.student, "attendance", "decrease")
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
                        >
                          <Minus className="h-3.5 w-3.5" />
                          خصم
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onOpenAction(row.student, "attendance", "increase")
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          إضافة
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
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
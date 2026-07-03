"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Save, X } from "lucide-react";

export type ConductScoreType = "behavior" | "attendance";
export type ConductAction = "increase" | "decrease";

export type ConductDrawerStudent = {
  id: string;
  full_name: string;
  student_number?: string | null;
  classroom_name?: string | null;
};

export type ConductDrawerEvent = {
  id?: string;
  student_id: string;
  score_type: ConductScoreType;
  event_type: "increase" | "decrease" | "set";
  points: number;
  reason?: string | null;
  note?: string | null;
  created_at?: string | null;
};

type Props = {
  open: boolean;
  loading?: boolean;
  student: ConductDrawerStudent | null;
  scoreType: ConductScoreType;
  action: ConductAction;
  currentScore: number;
  events: ConductDrawerEvent[];
  onClose: () => void;
  onSubmit: (payload: {
    studentId: string;
    scoreType: ConductScoreType;
    action: ConductAction;
    points: number;
    reason: string;
    note: string | null;
  }) => Promise<void> | void;
};

const behaviorReasons = [
  "مخالفة سلوكية",
  "عدم الالتزام بالتعليمات",
  "إثارة الفوضى داخل الفصل",
  "سوء تعامل مع الزملاء",
  "تحسن ملحوظ في السلوك",
  "التزام مميز",
];

const attendanceReasons = [
  "غياب بدون عذر",
  "تأخر صباحي",
  "تأخر عن الحصة",
  "خروج مبكر",
  "عدم انتظام",
  "تحسن في المواظبة",
  "انتظام مميز",
];

export default function ConductDrawer({
  open,
  loading = false,
  student,
  scoreType,
  action,
  currentScore,
  events,
  onClose,
  onSubmit,
}: Props) {
  const [points, setPoints] = useState(1);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const title = scoreType === "behavior" ? "تعديل درجة السلوك" : "تعديل درجة المواظبة";
  const scoreTitle = scoreType === "behavior" ? "درجة السلوك الحالية" : "درجة المواظبة الحالية";
  const typeLabel = scoreType === "behavior" ? "السلوك" : "المواظبة";

  const reasons = scoreType === "behavior" ? behaviorReasons : attendanceReasons;

  const filteredEvents = useMemo(() => {
    if (!student) return [];

    return events
      .filter(
        (event) =>
          event.student_id === student.id &&
          event.score_type === scoreType
      )
      .slice(0, 10);
  }, [events, student, scoreType]);

  if (!open || !student) return null;

  async function handleSubmit(selectedAction: ConductAction) {
    if (!student) return;

    const cleanPoints = Math.max(1, Math.min(100, Number(points) || 1));

    await onSubmit({
      studentId: student.id,
      scoreType,
      action: selectedAction,
      points: cleanPoints,
      reason: reason.trim(),
      note: note.trim() || null,
    });

    setPoints(1);
    setReason("");
    setNote("");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-[#0f1f3d] to-[#24477f] p-5 text-white">
          <div className="text-lg font-black">{student.full_name}</div>

          <div className="mt-2 text-sm text-slate-200">
            {student.student_number || "بدون رقم"} · {student.classroom_name || "-"}
          </div>

          <div className="mt-5 rounded-2xl bg-white/10 p-4">
            <div className="text-xs text-slate-300">{scoreTitle}</div>
            <div className="mt-1 text-3xl font-black text-[#d4af37]">
              {currentScore} / 100
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-black text-slate-600">
              نوع العملية
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div
                className={`rounded-2xl border px-3 py-3 text-center text-sm font-black ${
                  action === "increase"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                + إضافة
              </div>

              <div
                className={`rounded-2xl border px-3 py-3 text-center text-sm font-black ${
                  action === "decrease"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                - خصم
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black text-slate-600">
              عدد الدرجات
            </label>

            <input
              type="number"
              min={1}
              max={100}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-center text-lg font-black outline-none focus:border-[#d4af37]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-black text-slate-600">
              السبب
            </label>

            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-[#d4af37]"
            >
              <option value="">اختر سببًا</option>
              {reasons.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="أو اكتب سببًا مخصصًا..."
              className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-[#d4af37]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-black text-slate-600">
              ملاحظة إضافية
            </label>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="اكتب تفاصيل مختصرة إن وجدت..."
              rows={4}
              className="w-full resize-none rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-[#d4af37]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              disabled={loading || !reason.trim()}
              onClick={() => handleSubmit("decrease")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
              حفظ كخصم
            </button>

            <button
              type="button"
              disabled={loading || !reason.trim()}
              onClick={() => handleSubmit("increase")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              حفظ كإضافة
            </button>
          </div>

          <button
            type="button"
            disabled={loading || !reason.trim()}
            onClick={() => handleSubmit(action)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f1f3d] px-4 py-3 text-sm font-black text-white hover:bg-[#18315f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4 text-[#d4af37]" />
            حفظ حسب العملية المحددة
          </button>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-black text-slate-900">
            آخر عمليات {typeLabel}
          </h3>

          <div className="space-y-2">
            {filteredEvents.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-center text-xs font-bold text-slate-500">
                لا توجد عمليات سابقة.
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id || `${event.student_id}-${event.created_at}`}
                  className="rounded-2xl border border-slate-200 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        event.event_type === "increase"
                          ? "font-black text-emerald-700"
                          : "font-black text-red-700"
                      }
                    >
                      {event.event_type === "increase" ? "إضافة" : "خصم"}{" "}
                      {event.points} درجة
                    </span>

                    <span className="font-bold text-slate-400">
                      {event.created_at
                        ? new Date(event.created_at).toLocaleDateString("ar-SA")
                        : "-"}
                    </span>
                  </div>

                  <div className="mt-1 font-bold text-slate-600">
                    {event.reason || "بدون سبب"}
                  </div>

                  {event.note && (
                    <div className="mt-1 text-slate-400">{event.note}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
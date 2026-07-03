"use client";

import {
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

type Props = {
  open: boolean;
  student: DrawerStudent | null;
  components: DrawerGradeComponent[];
  scores: DrawerGradeScore[];
  behaviorScore: number;
  attendanceScore: number;
  events: DrawerConductEvent[];
  onClose: () => void;
};

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function label(score: number) {
  if (score >= 95) return "ممتاز";
  if (score >= 85) return "جيد جدًا";
  if (score >= 75) return "جيد";
  if (score >= 60) return "يحتاج متابعة";
  return "خطر";
}

function scoreClass(score: number) {
  if (score >= 90) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (score >= 80) return "bg-blue-50 text-blue-700 ring-blue-200";
  if (score >= 70) return "bg-amber-50 text-amber-700 ring-amber-200";
  if (score >= 60) return "bg-orange-50 text-orange-700 ring-orange-200";
  return "bg-red-50 text-red-700 ring-red-200";
}

function progressColor(percent: number) {
  if (percent >= 90) return "bg-emerald-600";
  if (percent >= 80) return "bg-blue-600";
  if (percent >= 70) return "bg-amber-500";
  if (percent >= 60) return "bg-orange-500";
  return "bg-red-600";
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

export default function StudentDrawer({
  open,
  student,
  components,
  scores,
  behaviorScore,
  attendanceScore,
  events,
  onClose,
}: Props) {
  if (!open || !student) return null;

  const currentStudent = student;

  const orderedComponents = [...components].sort(
    (a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)
  );

  function getScore(componentId: string) {
    return (
      scores.find(
        (score) =>
          score.student_id === currentStudent.id &&
          score.component_id === componentId
      )?.score ?? 0
    );
  }

  const subjectTotal = orderedComponents.reduce(
    (sum, component) => sum + toNumber(getScore(component.id)),
    0
  );

  const subjectMax = orderedComponents.reduce(
    (sum, component) => sum + toNumber(component.max_score),
    0
  );

  const subjectPercent =
    subjectMax > 0 ? Math.round((subjectTotal / subjectMax) * 1000) / 10 : 0;

  const completedCount = orderedComponents.filter((component) =>
    scores.some(
      (score) =>
        score.student_id === currentStudent.id &&
        score.component_id === component.id
    )
  ).length;

  const missingCount = Math.max(0, orderedComponents.length - completedCount);

  const overallAverage = Math.round(
    (subjectPercent + behaviorScore + attendanceScore) / 3
  );

  const studentEvents = events
    .filter((event) => event.student_id === currentStudent.id)
    .slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900">ملف الطالب</h2>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f1f3d] to-[#24477f] p-5 text-white">
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-[#d4af37]/10" />

            <div className="relative flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/15 ring-1 ring-white/20">
                <UserRound className="h-8 w-8 text-[#d4af37]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-2xl font-black">
                  {currentStudent.full_name}
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-200">
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {currentStudent.student_number || "بدون رقم"}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {currentStudent.classroom_name || "-"}
                  </span>
                  {currentStudent.national_id && (
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      الهوية: {currentStudent.national_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="relative mt-5 rounded-2xl bg-white/10 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-200">
                <span>المؤشر العام</span>
                <span>{overallAverage}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-[#d4af37]"
                  style={{ width: `${clamp(overallAverage, 0, 100)}%` }}
                />
              </div>
            </div>
          </div>

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
              value={`${behaviorScore}`}
              hint={label(behaviorScore)}
            />

            <SummaryCard
              icon={Clock3}
              label="المواظبة"
              value={`${attendanceScore}`}
              hint={label(attendanceScore)}
            />

            <SummaryCard
              icon={Activity}
              label="الاكتمال"
              value={`${completedCount}/${orderedComponents.length}`}
              hint={missingCount ? `ناقص ${missingCount}` : "مكتمل"}
            />
          </div>

          <SectionTitle icon={GraduationCap} title="درجات المادة الحالية" />

          <div className="space-y-2">
            {orderedComponents.length === 0 ? (
              <Empty text="لا توجد مكونات درجات." />
            ) : (
              orderedComponents.map((component) => {
                const value = getScore(component.id);
                const max = toNumber(component.max_score);
                const percent = max > 0 ? Math.round((value / max) * 100) : 0;
                const isMissing = !scores.some(
                  (score) =>
                    score.student_id === currentStudent.id &&
                    score.component_id === component.id
                );

                return (
                  <div
                    key={component.id}
                    className={`rounded-2xl border p-3 text-sm ${
                      isMissing
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-black text-slate-800">
                          {component.component_name}
                        </div>
                        <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                          {isMissing ? "لم يتم الرصد" : "تم الرصد"}
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="font-black text-slate-900">
                          {value} / {max}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">
                          {percent}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${progressColor(percent)}`}
                        style={{ width: `${clamp(percent, 0, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <SectionTitle icon={TrendingUp} title="السلوك والمواظبة" />

          <div className="grid grid-cols-2 gap-2">
            <ConductBox title="السلوك" score={behaviorScore} />
            <ConductBox title="المواظبة" score={attendanceScore} />
          </div>

          <SectionTitle icon={CalendarClock} title="آخر العمليات" />

          <div className="space-y-2">
            {studentEvents.length === 0 ? (
              <Empty text="لا توجد عمليات مسجلة لهذا الطالب." />
            ) : (
              studentEvents.map((event) => {
                const isBehavior = event.score_type === "behavior";
                const isIncrease = event.event_type === "increase";

                return (
                  <div
                    key={event.id || `${event.student_id}-${event.created_at}`}
                    className="rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 font-black ${
                            isBehavior
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {isBehavior ? "السلوك" : "المواظبة"}
                        </span>

                        <span
                          className={
                            isIncrease
                              ? "font-black text-emerald-700"
                              : "font-black text-red-700"
                          }
                        >
                          {isIncrease ? "إضافة" : "خصم"} {event.points}
                        </span>
                      </div>

                      <span className="font-bold text-slate-400">
                        {formatDate(event.created_at)}
                      </span>
                    </div>

                    <div className="mt-2 font-bold text-slate-700">
                      {event.reason || "بدون سبب"}
                    </div>

                    {event.note && (
                      <div className="mt-1 rounded-xl bg-slate-50 p-2 text-slate-500">
                        {event.note}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="mb-3 mt-6 flex items-center gap-2 text-sm font-black text-slate-900">
      <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#0f1f3d] text-white">
        <Icon className="h-4 w-4 text-[#d4af37]" />
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
  icon: any;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-[#0f1f3d] text-white">
        <Icon className="h-4 w-4 text-[#d4af37]" />
      </div>
      <div className="text-[10px] font-bold text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-black text-slate-900">{value}</div>
      <div className="text-[10px] font-bold text-slate-400">{hint}</div>
    </div>
  );
}

function ConductBox({ title, score }: { title: string; score: number }) {
  return (
    <div className={`rounded-2xl p-4 text-center ring-1 ${scoreClass(score)}`}>
      <div className="text-xs font-bold">{title}</div>
      <div className="mt-1 text-2xl font-black">{score}</div>
      <div className="mt-1 text-[10px] font-bold">{label(score)}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-center text-xs font-bold text-slate-500">
      <FileText className="mx-auto mb-2 h-5 w-5 text-slate-300" />
      {text}
    </div>
  );
}
"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  type LucideIcon,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";

export type GradeComponent = {
  id: string;
  component_name: string;
  max_score: number;
  display_order?: number | null;
};

export type GradeStudent = {
  id: string;
  full_name: string;
  student_number?: string | null;
  national_id?: string | null;
  classroom_id?: string | null;
  classroom_name?: string | null;
};

export type GradeScore = {
  id?: string;
  student_id: string;
  component_id: string;
  score: number;
  max_score: number;
};

export type CellStatus = "idle" | "dirty" | "saving" | "saved" | "error";

type Props = {
  loading?: boolean;
  students: GradeStudent[];
  components: GradeComponent[];
  scores: GradeScore[];
  totalMax: number;
  search: string;
  onSearchChange: (value: string) => void;
  cellStatus?: Record<string, CellStatus>;
  cellMessage?: Record<string, string>;
  onScoreChange: (
    studentId: string,
    component: GradeComponent,
    value: number
  ) => void;
  onScoreSave: (
    studentId: string,
    component: GradeComponent,
    value: number
  ) => Promise<void> | void;
  onStudentClick?: (student: GradeStudent) => void;
};

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clampScore(value: unknown, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), Math.max(0, Number(max || 0)));
}

function normalizeSearch(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function gradeLabel(percent: number) {
  if (percent >= 90) return "ممتاز";
  if (percent >= 80) return "جيد جدًا";
  if (percent >= 70) return "جيد";
  if (percent >= 60) return "مقبول";
  return "يحتاج متابعة";
}

function percentClass(percent: number) {
  if (percent >= 90) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (percent >= 80) return "bg-blue-50 text-blue-700 ring-blue-200";
  if (percent >= 70) return "bg-amber-50 text-amber-700 ring-amber-200";
  if (percent >= 60) return "bg-orange-50 text-orange-700 ring-orange-200";
  return "bg-red-50 text-red-700 ring-red-200";
}

function inputScoreClass(value: number, max: number, status: CellStatus) {
  if (status === "saved") return "border-emerald-300 bg-emerald-50";
  if (status === "dirty") return "border-amber-300 bg-amber-50";
  if (status === "saving") return "border-blue-300 bg-blue-50";
  if (status === "error") return "border-red-300 bg-red-50 text-red-700";

  if (max > 0 && value === max) return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (value === 0) return "border-red-200 bg-red-50 text-red-700";
  if (max > 0 && value < max * 0.6) return "border-amber-200 bg-amber-50 text-amber-800";

  return "border-slate-200 bg-white";
}

export default function GradesCanvas({
  loading = false,
  students,
  components,
  scores,
  totalMax,
  search,
  onSearchChange,
  cellStatus = {},
  cellMessage = {},
  onScoreChange,
  onScoreSave,
  onStudentClick,
}: Props) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const skipNextBlurSave = useRef<Record<string, boolean>>({});

  const orderedComponents = useMemo(() => {
    return [...components].sort(
      (a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)
    );
  }, [components]);

  const actualMax = useMemo(() => {
    const componentsMax = orderedComponents.reduce(
      (sum, component) => sum + toNumber(component.max_score),
      0
    );

    return componentsMax > 0 ? componentsMax : toNumber(totalMax);
  }, [orderedComponents, totalMax]);

  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();

    for (const score of scores) {
      map.set(`${score.student_id}-${score.component_id}`, score.score);
    }

    return map;
  }, [scores]);

  const getScore = useCallback(
    (studentId: string, componentId: string) =>
      scoreMap.get(`${studentId}-${componentId}`) ?? 0,
    [scoreMap]
  );

  const rows = useMemo(() => {
    const q = normalizeSearch(search);

    return students
      .filter((student) => {
        const text = normalizeSearch(`
          ${student.full_name || ""}
          ${student.student_number || ""}
          ${student.national_id || ""}
          ${student.classroom_name || ""}
        `);

        return !q || text.includes(q);
      })
      .map((student) => {
        const total = orderedComponents.reduce(
          (sum, component) => sum + toNumber(getScore(student.id, component.id)),
          0
        );

        const percent =
          actualMax > 0 ? Math.round((total / actualMax) * 1000) / 10 : 0;

        const missing = orderedComponents.some(
          (component) =>
            !scoreMap.has(`${student.id}-${component.id}`)
        );

        return {
          student,
          total,
          percent,
          missing,
          label: gradeLabel(percent),
          status: percent >= 60 ? "ناجح" : "راسب",
        };
      });
  }, [
    actualMax,
    getScore,
    orderedComponents,
    scoreMap,
    search,
    students,
  ]);

  const summary = useMemo(() => {
    const passed = rows.filter((row) => row.percent >= 60).length;
    const failed = rows.filter((row) => row.percent < 60).length;
    const completed = rows.filter((row) => !row.missing).length;
    const missing = rows.filter((row) => row.missing).length;
    const average = rows.length
      ? Math.round(
          (rows.reduce((sum, row) => sum + row.percent, 0) / rows.length) * 10
        ) / 10
      : 0;

    return { passed, failed, completed, missing, average };
  }, [rows]);

  const componentAverages = useMemo(() => {
    return orderedComponents.map((component) => {
      const values = rows.map((row) => getScore(row.student.id, component.id));
      const avg = values.length
        ? Math.round(
            (values.reduce((sum, value) => sum + value, 0) / values.length) * 10
          ) / 10
        : 0;

      return {
        componentId: component.id,
        average: avg,
      };
    });
  }, [rows, orderedComponents, getScore]);

  function focusCell(rowIndex: number, colIndex: number) {
    const row = rows[rowIndex];
    const component = orderedComponents[colIndex];

    if (!row || !component) return;

    const key = `${row.student.id}-${component.id}`;
    inputRefs.current[key]?.focus();
    inputRefs.current[key]?.select();
  }

  async function saveThenFocus(
    studentId: string,
    component: GradeComponent,
    nextRowIndex: number,
    nextColIndex: number
  ) {
    const key = `${studentId}-${component.id}`;
    skipNextBlurSave.current[key] = true;

    await onScoreSave(studentId, component, getScore(studentId, component.id));
    focusCell(nextRowIndex, nextColIndex);
  }

  async function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number,
    studentId: string,
    component: GradeComponent
  ) {
    const maxRow = Math.max(0, rows.length - 1);
    const maxCol = Math.max(0, orderedComponents.length - 1);

    if (e.key === "Enter") {
      e.preventDefault();
      await saveThenFocus(studentId, component, Math.min(rowIndex + 1, maxRow), colIndex);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();

      const nextCol = e.shiftKey ? colIndex - 1 : colIndex + 1;

      if (nextCol >= 0 && nextCol <= maxCol) {
        await saveThenFocus(studentId, component, rowIndex, nextCol);
      } else if (!e.shiftKey) {
        await saveThenFocus(studentId, component, Math.min(rowIndex + 1, maxRow), 0);
      } else {
        await saveThenFocus(studentId, component, Math.max(rowIndex - 1, 0), maxCol);
      }

      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      await saveThenFocus(studentId, component, Math.min(rowIndex + 1, maxRow), colIndex);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      await saveThenFocus(studentId, component, Math.max(rowIndex - 1, 0), colIndex);
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      await saveThenFocus(studentId, component, rowIndex, Math.min(colIndex + 1, maxCol));
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      await saveThenFocus(studentId, component, rowIndex, Math.max(colIndex - 1, 0));
    }
  }

  async function handleBlur(studentId: string, component: GradeComponent) {
    const key = `${studentId}-${component.id}`;

    if (skipNextBlurSave.current[key]) {
      delete skipNextBlurSave.current[key];
      return;
    }

    await onScoreSave(studentId, component, getScore(studentId, component.id));
  }

  return (
    <section className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">
              📘 Canvas درجات المواد
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              إدخال سريع، حفظ تلقائي، تنقل بالكيبورد والأسهم، وعمود الطالب ثابت.
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="بحث باسم الطالب أو الرقم الأكاديمي..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-10 pl-4 text-sm font-bold outline-none focus:border-[#d4af37]"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard icon={Users} label="الطلاب" value={rows.length} />
          <SummaryCard
            icon={CheckCircle2}
            label="ناجح"
            value={summary.passed}
            tone="success"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="راسب"
            value={summary.failed}
            tone="danger"
          />
          <SummaryCard
            icon={TrendingUp}
            label="متوسط الفصل"
            value={`${summary.average}%`}
          />
          <SummaryCard
            icon={AlertTriangle}
            label="غير مكتمل"
            value={summary.missing}
            tone="warning"
          />
        </div>
      </div>

      {orderedComponents.length === 0 ? (
        <div className="p-8">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 font-bold text-amber-800">
            <div className="flex items-center gap-3">
              <AlertTriangle size={22} />
              لا توجد مكونات درجات مرتبطة بهذا التوزيع.
            </div>
          </div>
        </div>
      ) : (
        <div className="max-h-[64vh] overflow-auto">
          <table className="w-full min-w-[1120px] table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-[280px]" />
              {orderedComponents.map((component) => (
                <col key={component.id} className="w-[100px]" />
              ))}
              <col className="w-[110px]" />
              <col className="w-[90px]" />
              <col className="w-[110px]" />
              <col className="w-[95px]" />
            </colgroup>

            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100 text-slate-700">
                <th className="sticky right-0 z-30 bg-slate-100 p-2.5 text-right font-black">
                  الطالب
                </th>

                {orderedComponents.map((component) => (
                  <th key={component.id} className="p-2 text-center">
                    <div className="truncate font-black">
                      {component.component_name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      من {component.max_score}
                    </div>
                  </th>
                ))}

                <th className="p-2 text-center font-black">المجموع</th>
                <th className="p-2 text-center font-black">النسبة</th>
                <th className="p-2 text-center font-black">التقدير</th>
                <th className="p-2 text-center font-black">الحالة</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={orderedComponents.length + 5}
                    className="p-10 text-center"
                  >
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري تحميل الدرجات...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={orderedComponents.length + 5}
                    className="p-10 text-center font-black text-slate-500"
                  >
                    لا يوجد طلاب مطابقون للبحث.
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIndex) => (
                  <tr
                    key={row.student.id}
                    className={`border-t border-slate-100 hover:bg-slate-50 ${
                      row.missing ? "bg-amber-50/60" : "bg-white"
                    }`}
                  >
                    <td className="sticky right-0 z-10 bg-inherit p-2.5">
                      <button
                        type="button"
                        onClick={() => onStudentClick?.(row.student)}
                        className="w-full rounded-xl p-1 text-right hover:bg-slate-50"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-black text-slate-500">
                            {rowIndex + 1}
                          </span>

                          <div className="min-w-0">
                            <div
                              className={`truncate text-sm font-black ${
                                row.status === "راسب"
                                  ? "text-red-700"
                                  : "text-slate-900"
                              }`}
                            >
                              {row.student.full_name}
                            </div>
                            <div className="mt-0.5 truncate text-[10px] font-bold text-slate-400">
                              {row.student.student_number || "بدون رقم"} ·{" "}
                              {row.student.classroom_name || "-"}
                            </div>
                          </div>
                        </div>
                      </button>
                    </td>

                    {orderedComponents.map((component, colIndex) => {
                      const key = `${row.student.id}-${component.id}`;
                      const status = cellStatus[key] || "idle";
                      const value = getScore(row.student.id, component.id);

                      return (
                        <td key={component.id} className="p-1.5 text-center">
                          <input
                            ref={(el) => {
                              inputRefs.current[key] = el;
                            }}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={component.max_score}
                            value={value}
                            onChange={(e) => {
                              const nextValue = clampScore(
                                e.target.value,
                                component.max_score
                              );

                              onScoreChange(row.student.id, component, nextValue);
                            }}
                            onBlur={() => handleBlur(row.student.id, component)}
                            onKeyDown={(e) =>
                              handleKeyDown(
                                e,
                                rowIndex,
                                colIndex,
                                row.student.id,
                                component
                              )
                            }
                            className={`h-9 w-20 rounded-lg border text-center text-sm font-black outline-none focus:ring-2 focus:ring-[#d4af37]/30 ${inputScoreClass(
                              value,
                              component.max_score,
                              status
                            )}`}
                          />

                          <div className="mt-0.5 h-3 text-[9px] font-black text-slate-400">
                            {cellMessage[key] || ""}
                          </div>
                        </td>
                      );
                    })}

                    <td className="p-2 text-center font-black text-slate-900">
                      {row.total} / {actualMax}
                    </td>

                    <td className="p-2 text-center">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${percentClass(
                          row.percent
                        )}`}
                      >
                        {row.percent}%
                      </span>
                    </td>

                    <td className="p-2 text-center font-black text-slate-700">
                      {row.label}
                    </td>

                    <td className="p-2 text-center">
                      <span
                        className={
                          row.status === "ناجح"
                            ? "inline-flex items-center gap-1 font-black text-emerald-700"
                            : "font-black text-red-700"
                        }
                      >
                        {row.status === "ناجح" && (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {rows.length > 0 && (
              <tfoot className="sticky bottom-0 z-20 bg-slate-100 text-slate-700">
                <tr>
                  <td className="sticky right-0 z-30 bg-slate-100 p-2.5 text-right font-black">
                    متوسط المكون
                  </td>

                  {orderedComponents.map((component) => {
                    const average =
                      componentAverages.find(
                        (item) => item.componentId === component.id
                      )?.average ?? 0;

                    return (
                      <td key={component.id} className="p-2 text-center font-black">
                        {average}
                      </td>
                    );
                  })}

                  <td className="p-2 text-center font-black">-</td>
                  <td className="p-2 text-center font-black">{summary.average}%</td>
                  <td className="p-2 text-center font-black">-</td>
                  <td className="p-2 text-center font-black">-</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black text-slate-500">
          <span>عدد الطلاب: {rows.length}</span>
          <span>
            المكتمل: {summary.completed} · غير المكتمل: {summary.missing}
          </span>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "danger"
        ? "bg-red-50 text-red-700 ring-red-200"
        : tone === "warning"
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : "bg-white text-slate-700 ring-slate-200";

  return (
    <div className={`rounded-2xl p-3 ring-1 ${toneClass}`}>
      <div className="mb-1 flex items-center gap-2 text-[11px] font-bold opacity-80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-lg font-black">{value}</div>
    </div>
  );
}

"use client";

import {
  useCallback,
  useMemo,
  useRef,
  type KeyboardEvent,
} from "react";
import {
  type LucideIcon,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/badges";
import { BaseCard } from "@/components/ui/cards";
import { SearchInput } from "@/components/ui/inputs";
import {
  DataTableEmpty,
  DataTableLoading,
} from "@/components/ui/tables";

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

export type CellStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error";

export type GradesCanvasProps = {
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
    value: number,
  ) => void;
  onScoreSave: (
    studentId: string,
    component: GradeComponent,
    value: number,
  ) => Promise<void> | void;
  onStudentClick?: (student: GradeStudent) => void;
};

type GradeRow = {
  student: GradeStudent;
  total: number;
  percent: number;
  missing: boolean;
  label: string;
  status: "ناجح" | "راسب";
};

type SummaryTone = "default" | "success" | "danger" | "warning";

function toNumber(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function clampScore(value: unknown, max: number) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(
    Math.max(numericValue, 0),
    Math.max(0, Number(max || 0)),
  );
}

function normalizeSearch(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ar")
    .replace(/\s+/g, " ")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function getGradeLabel(percent: number) {
  if (percent >= 90) return "ممتاز";
  if (percent >= 80) return "جيد جدًا";
  if (percent >= 70) return "جيد";
  if (percent >= 60) return "مقبول";
  return "يحتاج متابعة";
}

function getStatusBadgeTone(
  percent: number,
): "success" | "info" | "warning" | "danger" {
  if (percent >= 90) return "success";
  if (percent >= 80) return "info";
  if (percent >= 60) return "warning";
  return "danger";
}

function getInputScoreClass(
  value: number,
  max: number,
  status: CellStatus,
) {
  if (status === "saved") {
    return "border-[var(--app-green)]/40 bg-[var(--app-green-soft)] text-[var(--app-green)]";
  }

  if (status === "dirty") {
    return "border-[var(--app-accent)]/40 bg-[var(--app-accent-soft)] text-[var(--app-text)]";
  }

  if (status === "saving") {
    return "border-[var(--app-blue)]/40 bg-[var(--app-blue-soft)] text-[var(--app-blue)]";
  }

  if (status === "error") {
    return "border-[var(--app-destructive)]/40 bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]";
  }

  if (max > 0 && value === max) {
    return "border-[var(--app-green)]/40 bg-[var(--app-green-soft)] text-[var(--app-green)]";
  }

  if (value === 0) {
    return "border-[var(--app-destructive)]/30 bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]";
  }

  if (max > 0 && value < max * 0.6) {
    return "border-[var(--app-accent)]/35 bg-[var(--app-accent-soft)] text-[var(--app-text)]";
  }

  return "border-[var(--app-input)] bg-[var(--app-card)] text-[var(--app-text)]";
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
}: GradesCanvasProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const skipNextBlurSave = useRef<Record<string, boolean>>({});

  const orderedComponents = useMemo(
    () =>
      [...components].sort(
        (first, second) =>
          (first.display_order ?? 999) -
          (second.display_order ?? 999),
      ),
    [components],
  );

  const actualMax = useMemo(() => {
    const componentsMax = orderedComponents.reduce(
      (sum, component) => sum + toNumber(component.max_score),
      0,
    );

    return componentsMax > 0 ? componentsMax : toNumber(totalMax);
  }, [orderedComponents, totalMax]);

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

  const getScore = useCallback(
    (studentId: string, componentId: string) =>
      scoreMap.get(`${studentId}-${componentId}`) ?? 0,
    [scoreMap],
  );

  const rows = useMemo<GradeRow[]>(() => {
    const normalizedQuery = normalizeSearch(search);

    return students
      .filter((student) => {
        const searchableText = normalizeSearch(`
          ${student.full_name || ""}
          ${student.student_number || ""}
          ${student.national_id || ""}
          ${student.classroom_name || ""}
        `);

        return (
          normalizedQuery.length === 0 ||
          searchableText.includes(normalizedQuery)
        );
      })
      .map((student) => {
        const total = orderedComponents.reduce(
          (sum, component) =>
            sum + toNumber(getScore(student.id, component.id)),
          0,
        );

        const percent =
          actualMax > 0
            ? Math.round((total / actualMax) * 1000) / 10
            : 0;

        const missing = orderedComponents.some(
          (component) =>
            !scoreMap.has(`${student.id}-${component.id}`),
        );

        return {
          student,
          total,
          percent,
          missing,
          label: getGradeLabel(percent),
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
    const average =
      rows.length > 0
        ? Math.round(
            (rows.reduce((sum, row) => sum + row.percent, 0) /
              rows.length) *
              10,
          ) / 10
        : 0;

    return {
      passed,
      failed,
      completed,
      missing,
      average,
    };
  }, [rows]);

  const componentAverages = useMemo(
    () =>
      orderedComponents.map((component) => {
        const values = rows.map((row) =>
          getScore(row.student.id, component.id),
        );

        const componentAverage =
          values.length > 0
            ? Math.round(
                (values.reduce((sum, value) => sum + value, 0) /
                  values.length) *
                  10,
              ) / 10
            : 0;

        return {
          componentId: component.id,
          average: componentAverage,
        };
      }),
    [getScore, orderedComponents, rows],
  );

  function focusCell(rowIndex: number, columnIndex: number) {
    const row = rows[rowIndex];
    const component = orderedComponents[columnIndex];

    if (!row || !component) return;

    const key = `${row.student.id}-${component.id}`;
    inputRefs.current[key]?.focus();
    inputRefs.current[key]?.select();
  }

  async function saveThenFocus(
    studentId: string,
    component: GradeComponent,
    nextRowIndex: number,
    nextColumnIndex: number,
  ) {
    const key = `${studentId}-${component.id}`;
    skipNextBlurSave.current[key] = true;

    await onScoreSave(
      studentId,
      component,
      getScore(studentId, component.id),
    );

    focusCell(nextRowIndex, nextColumnIndex);
  }

  async function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    columnIndex: number,
    studentId: string,
    component: GradeComponent,
  ) {
    const maxRowIndex = Math.max(0, rows.length - 1);
    const maxColumnIndex = Math.max(
      0,
      orderedComponents.length - 1,
    );

    if (event.key === "Enter") {
      event.preventDefault();

      await saveThenFocus(
        studentId,
        component,
        Math.min(rowIndex + 1, maxRowIndex),
        columnIndex,
      );

      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();

      const nextColumnIndex = event.shiftKey
        ? columnIndex - 1
        : columnIndex + 1;

      if (
        nextColumnIndex >= 0 &&
        nextColumnIndex <= maxColumnIndex
      ) {
        await saveThenFocus(
          studentId,
          component,
          rowIndex,
          nextColumnIndex,
        );
      } else if (!event.shiftKey) {
        await saveThenFocus(
          studentId,
          component,
          Math.min(rowIndex + 1, maxRowIndex),
          0,
        );
      } else {
        await saveThenFocus(
          studentId,
          component,
          Math.max(rowIndex - 1, 0),
          maxColumnIndex,
        );
      }

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      await saveThenFocus(
        studentId,
        component,
        Math.min(rowIndex + 1, maxRowIndex),
        columnIndex,
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      await saveThenFocus(
        studentId,
        component,
        Math.max(rowIndex - 1, 0),
        columnIndex,
      );

      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();

      await saveThenFocus(
        studentId,
        component,
        rowIndex,
        Math.min(columnIndex + 1, maxColumnIndex),
      );

      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();

      await saveThenFocus(
        studentId,
        component,
        rowIndex,
        Math.max(columnIndex - 1, 0),
      );
    }
  }

  async function handleBlur(
    studentId: string,
    component: GradeComponent,
  ) {
    const key = `${studentId}-${component.id}`;

    if (skipNextBlurSave.current[key]) {
      delete skipNextBlurSave.current[key];
      return;
    }

    await onScoreSave(
      studentId,
      component,
      getScore(studentId, component.id),
    );
  }

  return (
    <BaseCard
      as="section"
      padding="none"
      className="overflow-hidden"
      aria-busy={loading}
    >
      <div className="border-b border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-black text-[var(--app-text)]">
              Canvas درجات المواد
            </h2>

            <p className="mt-1 text-xs font-bold leading-6 text-[var(--app-text-muted)]">
              إدخال سريع، حفظ تلقائي، تنقل بلوحة المفاتيح والأسهم،
              مع تثبيت عمود الطالب.
            </p>
          </div>

          <div className="w-full lg:max-w-sm">
            <SearchInput
              value={search}
              onChange={onSearchChange}
              placeholder="بحث باسم الطالب أو الرقم الأكاديمي..."
              disabled={loading}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <CanvasSummaryCard
            icon={Users}
            label="الطلاب"
            value={rows.length}
          />

          <CanvasSummaryCard
            icon={CheckCircle2}
            label="ناجح"
            value={summary.passed}
            tone="success"
          />

          <CanvasSummaryCard
            icon={AlertTriangle}
            label="راسب"
            value={summary.failed}
            tone="danger"
          />

          <CanvasSummaryCard
            icon={TrendingUp}
            label="متوسط الفصل"
            value={`${summary.average}%`}
          />

          <CanvasSummaryCard
            icon={AlertTriangle}
            label="غير مكتمل"
            value={summary.missing}
            tone="warning"
          />
        </div>
      </div>

      {orderedComponents.length === 0 ? (
        <div className="p-6">
          <div
            className="rounded-[var(--app-radius-xl)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-5 text-sm font-bold text-[var(--app-text)]"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-[var(--app-accent)]"
              />

              <span>
                لا توجد مكونات درجات مرتبطة بهذا التوزيع.
              </span>
            </div>
          </div>
        </div>
      ) : loading ? (
        <DataTableLoading
          columns={orderedComponents.length + 5}
          rows={6}
        />
      ) : rows.length === 0 ? (
        <DataTableEmpty
          title="لا يوجد طلاب مطابقون"
          description="غيّر عبارة البحث أو تحقق من الطلاب المرتبطين بالفصل."
        />
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
              <tr className="border-b border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]">
                <th
                  scope="col"
                  className="sticky right-0 z-30 bg-[var(--app-card-soft)] p-2.5 text-right font-black"
                >
                  الطالب
                </th>

                {orderedComponents.map((component) => (
                  <th
                    key={component.id}
                    scope="col"
                    className="p-2 text-center"
                  >
                    <div className="truncate font-black text-[var(--app-text)]">
                      {component.component_name}
                    </div>

                    <div className="text-[10px] text-[var(--app-text-muted)]">
                      من {component.max_score}
                    </div>
                  </th>
                ))}

                <th scope="col" className="p-2 text-center font-black">
                  المجموع
                </th>

                <th scope="col" className="p-2 text-center font-black">
                  النسبة
                </th>

                <th scope="col" className="p-2 text-center font-black">
                  التقدير
                </th>

                <th scope="col" className="p-2 text-center font-black">
                  الحالة
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={row.student.id}
                  className={[
                    "border-b border-[var(--app-border)] transition last:border-b-0 hover:bg-[var(--app-primary-soft)]/35",
                    row.missing
                      ? "bg-[var(--app-accent-soft)]/45"
                      : "bg-[var(--app-card)]",
                  ].join(" ")}
                >
                  <td className="sticky right-0 z-10 bg-inherit p-2.5">
                    <button
                      type="button"
                      onClick={() => onStudentClick?.(row.student)}
                      disabled={!onStudentClick}
                      className="w-full rounded-[var(--app-radius-md)] p-1 text-right transition hover:bg-[var(--app-card-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] disabled:cursor-default"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--app-card-soft)] px-1 text-[10px] font-black text-[var(--app-text-muted)]">
                          {rowIndex + 1}
                        </span>

                        <div className="min-w-0">
                          <div
                            className={[
                              "truncate text-sm font-black",
                              row.status === "راسب"
                                ? "text-[var(--app-destructive)]"
                                : "text-[var(--app-text)]",
                            ].join(" ")}
                          >
                            {row.student.full_name}
                          </div>

                          <div className="mt-0.5 truncate text-[10px] font-bold text-[var(--app-text-muted)]">
                            {row.student.student_number || "بدون رقم"} ·{" "}
                            {row.student.classroom_name || "-"}
                          </div>
                        </div>
                      </div>
                    </button>
                  </td>

                  {orderedComponents.map((component, columnIndex) => {
                    const key = `${row.student.id}-${component.id}`;
                    const status = cellStatus[key] ?? "idle";
                    const value = getScore(
                      row.student.id,
                      component.id,
                    );

                    return (
                      <td
                        key={component.id}
                        className="p-1.5 text-center"
                      >
                        <input
                          ref={(element) => {
                            inputRefs.current[key] = element;
                          }}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={component.max_score}
                          value={value}
                          aria-label={`${component.component_name} للطالب ${row.student.full_name}`}
                          aria-invalid={status === "error"}
                          onChange={(event) => {
                            const nextValue = clampScore(
                              event.target.value,
                              component.max_score,
                            );

                            onScoreChange(
                              row.student.id,
                              component,
                              nextValue,
                            );
                          }}
                          onBlur={() =>
                            handleBlur(
                              row.student.id,
                              component,
                            )
                          }
                          onKeyDown={(event) =>
                            handleKeyDown(
                              event,
                              rowIndex,
                              columnIndex,
                              row.student.id,
                              component,
                            )
                          }
                          className={[
                            "h-9 w-20 rounded-[var(--app-radius-md)] border text-center text-sm font-black outline-none transition",
                            "focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-primary-soft)]",
                            getInputScoreClass(
                              value,
                              component.max_score,
                              status,
                            ),
                          ].join(" ")}
                        />

                        <div
                          className={[
                            "mt-0.5 h-3 text-[9px] font-black",
                            status === "error"
                              ? "text-[var(--app-destructive)]"
                              : status === "saved"
                                ? "text-[var(--app-green)]"
                                : status === "saving"
                                  ? "text-[var(--app-blue)]"
                                  : "text-[var(--app-text-muted)]",
                          ].join(" ")}
                          aria-live="polite"
                        >
                          {status === "saving" && !cellMessage[key] ? (
                            <Loader2
                              aria-hidden="true"
                              className="mx-auto h-3 w-3 animate-spin"
                            />
                          ) : (
                            cellMessage[key] || ""
                          )}
                        </div>
                      </td>
                    );
                  })}

                  <td className="p-2 text-center font-black text-[var(--app-text)]">
                    {row.total} / {actualMax}
                  </td>

                  <td className="p-2 text-center">
                    <StatusBadge tone={getStatusBadgeTone(row.percent)}>
                      {row.percent}%
                    </StatusBadge>
                  </td>

                  <td className="p-2 text-center font-black text-[var(--app-text)]">
                    {row.label}
                  </td>

                  <td className="p-2 text-center">
                    <StatusBadge
                      tone={
                        row.status === "ناجح"
                          ? "success"
                          : "danger"
                      }
                      icon={
                        row.status === "ناجح" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      {row.status}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot className="sticky bottom-0 z-20 border-t border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]">
              <tr>
                <td className="sticky right-0 z-30 bg-[var(--app-card-soft)] p-2.5 text-right font-black">
                  متوسط المكون
                </td>

                {orderedComponents.map((component) => {
                  const componentAverage =
                    componentAverages.find(
                      (item) =>
                        item.componentId === component.id,
                    )?.average ?? 0;

                  return (
                    <td
                      key={component.id}
                      className="p-2 text-center font-black text-[var(--app-text)]"
                    >
                      {componentAverage}
                    </td>
                  );
                })}

                <td className="p-2 text-center font-black">-</td>

                <td className="p-2 text-center font-black text-[var(--app-text)]">
                  {summary.average}%
                </td>

                <td className="p-2 text-center font-black">-</td>
                <td className="p-2 text-center font-black">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="border-t border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black text-[var(--app-text-muted)]">
          <span>عدد الطلاب: {rows.length}</span>

          <span>
            المكتمل: {summary.completed} · غير المكتمل:{" "}
            {summary.missing}
          </span>
        </div>
      </div>
    </BaseCard>
  );
}

function CanvasSummaryCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: SummaryTone;
}) {
  const toneClasses: Record<SummaryTone, string> = {
    default:
      "border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)]",
    success:
      "border-[var(--app-green)]/25 bg-[var(--app-green-soft)] text-[var(--app-green)]",
    danger:
      "border-[var(--app-destructive)]/25 bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    warning:
      "border-[var(--app-accent)]/25 bg-[var(--app-accent-soft)] text-[var(--app-text)]",
  };

  return (
    <div
      className={[
        "rounded-[var(--app-radius-lg)] border p-3 shadow-sm",
        toneClasses[tone],
      ].join(" ")}
    >
      <div className="mb-1 flex items-center gap-2 text-[11px] font-bold opacity-80">
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {label}
      </div>

      <div className="text-lg font-black">{value}</div>
    </div>
  );
}

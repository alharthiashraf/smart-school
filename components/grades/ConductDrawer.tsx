"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Loader2,
  Minus,
  Plus,
  Save,
  X,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/badges";
import {
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/buttons";
import {
  NumberField,
  Select,
  Textarea,
  TextField,
} from "@/components/ui/inputs";

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

export type ConductDrawerSubmitPayload = {
  studentId: string;
  scoreType: ConductScoreType;
  action: ConductAction;
  points: number;
  reason: string;
  note: string | null;
};

export type ConductDrawerProps = {
  open: boolean;
  loading?: boolean;
  student: ConductDrawerStudent | null;
  scoreType: ConductScoreType;
  action: ConductAction;
  currentScore: number;
  events: ConductDrawerEvent[];
  onClose: () => void;
  onSubmit: (
    payload: ConductDrawerSubmitPayload,
  ) => Promise<void> | void;
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

function formatEventDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

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
}: ConductDrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const [points, setPoints] = useState(1);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const title =
    scoreType === "behavior"
      ? "تعديل درجة السلوك"
      : "تعديل درجة المواظبة";

  const scoreTitle =
    scoreType === "behavior"
      ? "درجة السلوك الحالية"
      : "درجة المواظبة الحالية";

  const typeLabel =
    scoreType === "behavior" ? "السلوك" : "المواظبة";

  const reasons =
    scoreType === "behavior"
      ? behaviorReasons
      : attendanceReasons;

  const reasonOptions = reasons.map((item) => ({
    label: item,
    value: item,
  }));

  const filteredEvents = useMemo(() => {
    if (!student) return [];

    return events
      .filter(
        (event) =>
          event.student_id === student.id &&
          event.score_type === scoreType,
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
  }, [events, scoreType, student]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timeoutId = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.clearTimeout(timeoutId);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [loading, onClose, open]);

  useEffect(() => {
    if (!open) return;

    setPoints(1);
    setReason("");
    setNote("");
  }, [open, scoreType, student?.id]);

  if (!open || !student) return null;

  const cleanPoints = Math.max(
    1,
    Math.min(100, Number(points) || 1),
  );

  const normalizedCurrentScore = clampScore(currentScore);

  const projectedScore =
    action === "increase"
      ? clampScore(normalizedCurrentScore + cleanPoints)
      : clampScore(normalizedCurrentScore - cleanPoints);

  const canSubmit =
    !loading &&
    reason.trim().length > 0 &&
    cleanPoints >= 1;

  async function handleSubmit(
    selectedAction: ConductAction,
  ) {
    if (!student || !canSubmit) return;

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
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm"
      onClick={() => {
        if (!loading) {
          onClose();
        }
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={loading}
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col border-r border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-[var(--app-shadow)]"
      >
        <header className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="truncate text-xl font-black text-[var(--app-text)]"
            >
              {title}
            </h2>

            <p
              id={descriptionId}
              className="mt-1 text-xs font-bold text-[var(--app-text-muted)]"
            >
              أضف أو اخصم درجات مع توثيق السبب والملاحظة.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="إغلاق النافذة"
            title="إغلاق"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)] transition hover:bg-[var(--app-card-soft)] hover:text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-card)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X
              aria-hidden="true"
              className="h-5 w-5"
            />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <section className="rounded-[var(--app-radius-xl)] bg-[var(--app-primary)] p-5 text-[var(--app-primary-foreground)] shadow-sm">
            <div className="text-lg font-black">
              {student.full_name}
            </div>

            <div className="mt-2 text-sm font-bold text-[var(--app-primary-foreground)]/70">
              {student.student_number || "بدون رقم"} ·{" "}
              {student.classroom_name || "-"}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-primary-foreground)]/15 bg-[var(--app-primary-foreground)]/10 p-4">
                <div className="text-xs font-bold text-[var(--app-primary-foreground)]/70">
                  {scoreTitle}
                </div>

                <div className="mt-1 text-2xl font-black text-[var(--app-accent)]">
                  {normalizedCurrentScore} / 100
                </div>
              </div>

              <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-primary-foreground)]/15 bg-[var(--app-primary-foreground)]/10 p-4">
                <div className="text-xs font-bold text-[var(--app-primary-foreground)]/70">
                  الدرجة المتوقعة
                </div>

                <div className="mt-1 text-2xl font-black">
                  {projectedScore} / 100
                </div>
              </div>
            </div>
          </section>

          <div className="mt-5 space-y-5">
            <section>
              <div className="mb-2 text-xs font-black text-[var(--app-text)]">
                نوع العملية
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div
                  className={[
                    "rounded-[var(--app-radius-lg)] border px-3 py-3 text-center text-sm font-black",
                    action === "increase"
                      ? "border-[var(--app-green)]/30 bg-[var(--app-green-soft)] text-[var(--app-green)]"
                      : "border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
                  ].join(" ")}
                >
                  + إضافة
                </div>

                <div
                  className={[
                    "rounded-[var(--app-radius-lg)] border px-3 py-3 text-center text-sm font-black",
                    action === "decrease"
                      ? "border-[var(--app-destructive)]/30 bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]"
                      : "border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
                  ].join(" ")}
                >
                  - خصم
                </div>
              </div>
            </section>

            <NumberField
              label="عدد الدرجات"
              min={1}
              max={100}
              value={points}
              disabled={loading}
              onChange={(event) =>
                setPoints(Number(event.target.value))
              }
              inputMode="numeric"
              className="text-center text-lg"
            />

            <section className="space-y-2">
              <Select
                label="السبب"
                value={reasons.includes(reason) ? reason : ""}
                options={reasonOptions}
                placeholder="اختر سببًا"
                disabled={loading}
                onChange={(event) =>
                  setReason(event.target.value)
                }
              />

              <TextField
                value={reason}
                disabled={loading}
                onChange={(event) =>
                  setReason(event.target.value)
                }
                placeholder="أو اكتب سببًا مخصصًا..."
                aria-label="سبب مخصص"
              />
            </section>

            <Textarea
              label="ملاحظة إضافية"
              value={note}
              disabled={loading}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="اكتب تفاصيل مختصرة إن وجدت..."
              rows={4}
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <SecondaryButton
                type="button"
                disabled={!canSubmit}
                onClick={() => handleSubmit("decrease")}
                icon={
                  loading ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : (
                    <Minus
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  )
                }
                className="border-[var(--app-destructive)]/25 bg-[var(--app-destructive-soft)] text-[var(--app-destructive)] hover:bg-[var(--app-destructive-soft)]"
              >
                حفظ كخصم
              </SecondaryButton>

              <PrimaryButton
                type="button"
                disabled={!canSubmit}
                onClick={() => handleSubmit("increase")}
                icon={
                  loading ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : (
                    <Plus
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  )
                }
              >
                حفظ كإضافة
              </PrimaryButton>
            </div>

            <PrimaryButton
              type="button"
              disabled={!canSubmit}
              onClick={() => handleSubmit(action)}
              icon={
                loading ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : (
                  <Save
                    aria-hidden="true"
                    className="h-4 w-4 text-[var(--app-accent)]"
                  />
                )
              }
              className="w-full"
            >
              حفظ حسب العملية المحددة
            </PrimaryButton>
          </div>

          <section className="mt-7">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-[var(--app-text)]">
                آخر عمليات {typeLabel}
              </h3>

              <StatusBadge tone="primary">
                {filteredEvents.length}
              </StatusBadge>
            </div>

            <div className="space-y-2">
              {filteredEvents.length === 0 ? (
                <div className="rounded-[var(--app-radius-lg)] border border-dashed border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 text-center text-xs font-bold text-[var(--app-text-muted)]">
                  لا توجد عمليات سابقة.
                </div>
              ) : (
                filteredEvents.map((event, index) => {
                  const isIncrease =
                    event.event_type === "increase";

                  const isSet =
                    event.event_type === "set";

                  return (
                    <article
                      key={
                        event.id ||
                        `${event.student_id}-${event.created_at}-${index}`
                      }
                      className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-3">
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
                          {event.points} درجة
                        </StatusBadge>

                        <span className="shrink-0 font-bold text-[var(--app-text-muted)]">
                          {formatEventDate(event.created_at)}
                        </span>
                      </div>

                      <div className="mt-2 font-bold text-[var(--app-text)]">
                        {event.reason || "بدون سبب"}
                      </div>

                      {event.note && (
                        <div className="mt-1 leading-6 text-[var(--app-text-muted)]">
                          {event.note}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

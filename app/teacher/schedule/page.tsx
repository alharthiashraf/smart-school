"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import PageLoader from "@/components/ui/loading/PageLoader";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";
import UiEmptyState from "@/components/ui/empty-state/EmptyState";

import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Grid2X2,
  LayoutList,
  MapPin,
  RefreshCcw,
  School,
  Timer,
  UserRoundCheck,
} from "lucide-react";

type Teacher = {
  id: string;
  full_name: string;
  email?: string | null;
  subject?: string | null;
  specialization?: string | null;
  department?: string | null;
  weekly_load?: number | null;
};

type ScheduleItem = {
  id: string;
  teacher_id: string;
  day_name?: string | null;
  period_number?: number | null;
  class_name?: string | null;
  section?: string | null;
  subject?: string | null;
  room?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

type QueryLike<T> = PromiseLike<QueryResult<T>>;

type ViewMode = "timeline" | "cards";
type DayFilter = "all" | string;

const ALLOWED_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "teacher",
];

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

const SUBJECT_COLORS = [
  "border-[color-mix(in_srgb,var(--app-primary)_24%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)] text-[var(--app-primary)]",
  "border-[color-mix(in_srgb,var(--app-success)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]",
  "border-[color-mix(in_srgb,var(--app-accent)_30%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]",
  "border-[color-mix(in_srgb,var(--app-info)_24%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-info)_10%,transparent)] text-[var(--app-info)]",
  "border-[color-mix(in_srgb,var(--app-danger)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)]",
  "border-[color-mix(in_srgb,var(--app-primary)_18%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_7%,transparent)] text-[var(--app-text)]",
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function todayArabicDay() {
  return new Date().toLocaleDateString("ar-SA", { weekday: "long" });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

async function safeQuery<T>(
  query: QueryLike<T>,
  fallback: T,
  _label: string,
): Promise<T> {
  try {
    const result = await query;

    if (result.error) {
      return fallback;
    }

    return result.data ?? fallback;
  } catch {
    return fallback;
  }
}

function lessonSubject(item: ScheduleItem, teacher: Teacher | null) {
  return item.subject || teacher?.subject || teacher?.specialization || "مادة غير محددة";
}

function lessonClass(item: ScheduleItem) {
  return `${item.class_name || "فصل غير محدد"}${item.section ? ` / ${item.section}` : ""}`;
}

function subjectColor(subject?: string | null) {
  const text = String(subject || "");
  const index = Array.from(text).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
}

function timeRange(item: ScheduleItem) {
  if (item.start_time && item.end_time) return `${item.start_time.slice(0, 5)} - ${item.end_time.slice(0, 5)}`;
  if (item.start_time) return item.start_time.slice(0, 5);
  return "لم يحدد الوقت";
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function sortByPeriod(first: ScheduleItem, second: ScheduleItem) {
  return Number(first.period_number || 0) - Number(second.period_number || 0);
}

export default function TeacherSchedulePage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  const [selectedDay, setSelectedDay] = useState<DayFilter>(todayArabicDay());
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const today = todayDate();
  const todayName = todayArabicDay();

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  const resetPage = useCallback(() => {
    setTeacher(null);
    setSchedule([]);
    setSelectedDay(todayArabicDay());
  }, []);

  const fetchSchedule = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      const userEmail = user?.email?.trim().toLowerCase() || "";

      if (!user?.id || !userEmail) {
        resetPage();
        setErrorMsg("لم يتم العثور على مستخدم مسجل الدخول.");
        return;
      }

      const teacherData = await safeQuery<Teacher | null>(
        supabase
          .from("teachers")
          .select("id, full_name, email, subject, specialization, department, weekly_load")
          .eq("school_id", currentSchool.id)
          .ilike("email", userEmail)
          .limit(1)
          .maybeSingle(),
        null,
        "teacher",
      );

      if (!teacherData?.id) {
        resetPage();
        setErrorMsg("لم يتم العثور على معلم مطابق لبريد تسجيل الدخول.");
        return;
      }

      setTeacher(teacherData);

      const scheduleData = await safeQuery<ScheduleItem[]>(
        supabase
          .from("teacher_schedule")
          .select("*")
          .eq("school_id", currentSchool.id)
          .eq("teacher_id", teacherData.id)
          .order("day_name", { ascending: true })
          .order("period_number", { ascending: true }),
        [],
        "teacher_schedule",
      );

      setSchedule(scheduleData || []);
    } catch (error) {
      resetPage();
      const message = getErrorMessage(error, "تعذر تحميل جدول المعلم.");
      setErrorMsg(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, resetPage, showToast]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      resetPage();
      setErrorMsg("لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      return;
    }

    queueMicrotask(() => {
      void fetchSchedule();
    });
  }, [currentSchool?.id, fetchSchedule, resetPage, schoolLoading]);

  const scheduleByDay = useMemo(() => {
    return DAYS.map((day) => ({
      day,
      lessons: schedule.filter((item) => item.day_name === day).sort(sortByPeriod),
    }));
  }, [schedule]);

  const todayLessons = useMemo(() => {
    return schedule.filter((item) => item.day_name === todayName).sort(sortByPeriod);
  }, [schedule, todayName]);

  const filteredLessons = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return schedule
      .filter((item) => selectedDay === "all" || item.day_name === selectedDay)
      .filter((item) => {
        const text = [
          item.day_name,
          item.period_number,
          item.class_name,
          item.section,
          item.subject,
          item.room,
          item.start_time,
          item.end_time,
          teacher?.full_name,
        ]
          .join(" ")
          .toLowerCase();

        return !keyword || text.includes(keyword);
      })
      .sort((first, second) => {
        const dayIndexA = DAYS.indexOf(first.day_name || "");
        const dayIndexB = DAYS.indexOf(second.day_name || "");
        if (dayIndexA !== dayIndexB) return dayIndexA - dayIndexB;
        return sortByPeriod(first, second);
      });
  }, [schedule, search, selectedDay, teacher?.full_name]);

  const classesCount = useMemo(() => {
    return new Set(
      schedule
        .map((item) => `${item.class_name || ""}-${item.section || ""}`)
        .filter((value) => value !== "-"),
    ).size;
  }, [schedule]);

  const subjectsCount = useMemo(() => {
    return new Set(
      schedule
        .map((item) => item.subject || teacher?.subject || teacher?.specialization || "")
        .filter(Boolean),
    ).size;
  }, [schedule, teacher]);

  const roomsCount = useMemo(() => {
    return new Set(schedule.map((item) => item.room || "").filter(Boolean)).size;
  }, [schedule]);

  const freeDaysCount = useMemo(() => {
    return scheduleByDay.filter((item) => item.lessons.length === 0).length;
  }, [scheduleByDay]);

  const maxDailyLoad = useMemo(() => {
    return Math.max(0, ...scheduleByDay.map((item) => item.lessons.length));
  }, [scheduleByDay]);

  const currentLesson = todayLessons[0] || null;
  const weeklyLoad = teacher?.weekly_load ?? schedule.length;
  const loadCompletion = percentage(schedule.length, Number(weeklyLoad || schedule.length || 1));

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={ALLOWED_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل جدول المعلم..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool || errorMsg || !teacher) {
    return (
      <RoleGuard allowedRoles={ALLOWED_ROLES}>
        <AppShell>
          <ErrorState description={errorMsg || "تعذر فتح جدول المعلم."} />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <AppShell>
        <main className="space-y-5" dir="rtl">
          {toast && (
            <div className="fixed left-5 top-5 z-50 w-[min(420px,calc(100%-2rem))] print:hidden">
              {toast.type === "success" ? (
                <SuccessBanner description={toast.message} />
              ) : (
                <ErrorState description={toast.message} />
              )}
            </div>
          )}

          <PageHeader
            variant="hero"
            title={`جدول ${teacher.full_name}`}
            description="عرض احترافي لجدول المعلم الأسبوعي، حصص اليوم، الفصول، القاعات، والروابط السريعة للتحضير ومتابعة الحصة."
            badge="بوابة المعلم"
            icon={<CalendarDays size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة المعلم", href: "/teacher-portal" },
              { label: "جدولي" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool.school_name || "—" },
              { label: "المعلم", value: teacher.full_name },
              { label: "اليوم", value: `${todayName} - ${today}` },
              { label: "المادة", value: teacher.subject || teacher.specialization || "غير محددة" },
            ]}
            stats={[
              { label: "حصص اليوم", value: todayLessons.length, icon: <CalendarDays size={20} aria-hidden="true" />, tone: "primary" },
              { label: "إجمالي الحصص", value: schedule.length, icon: <Clock size={20} aria-hidden="true" />, tone: "primary" },
              { label: "الفصول", value: classesCount, icon: <School size={20} aria-hidden="true" />, tone: "gold" },
              { label: "أيام بلا حصص", value: freeDaysCount, icon: <Timer size={20} aria-hidden="true" />, tone: freeDaysCount > 0 ? "green" : "slate" },
            ]}
            actions={
              <>
                <Link
                  href="/teacher-portal"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 text-sm font-black text-[var(--app-text)] shadow-[var(--app-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--app-shadow-md)]"
                >
                  <ArrowRight size={17} aria-hidden="true" />
                  بوابة المعلم
                </Link>

                <Link
                  href="/teacher/preparations"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--app-radius-lg)] bg-[var(--app-accent)] px-4 text-sm font-black text-[var(--app-accent-foreground)] shadow-[var(--app-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--app-shadow-md)]"
                >
                  <BookOpenCheck size={17} aria-hidden="true" />
                  التحضير
                </Link>

                <Link
                  href="/teacher/daily"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] px-4 text-sm font-black text-[var(--app-primary-foreground)] shadow-[var(--app-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--app-shadow-md)]"
                >
                  <CheckCircle2 size={17} aria-hidden="true" />
                  متابعة الحصة
                </Link>

                <SecondaryButton
                  icon={<RefreshCcw size={17} aria-hidden="true" />}
                  onClick={() => void fetchSchedule()}
                  loading={loading}
                >
                  تحديث
                </SecondaryButton>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <ExecutiveCard
              title="حصص اليوم"
              value={todayLessons.length}
              icon={<CalendarDays size={22} aria-hidden="true" />}
              tone="primary"
              subtitle={`${todayName}`}
              progress={maxDailyLoad ? percentage(todayLessons.length, maxDailyLoad) : 0}
            />

            <ExecutiveCard
              title="إجمالي الحصص"
              value={schedule.length}
              icon={<Clock size={22} aria-hidden="true" />}
              tone="primary"
              subtitle={`النصاب: ${weeklyLoad}`}
              progress={Math.min(loadCompletion, 100)}
            />

            <ExecutiveCard
              title="الفصول"
              value={classesCount}
              icon={<School size={22} aria-hidden="true" />}
              tone="gold"
              subtitle="فصول وشعب"
              progress={classesCount ? 100 : 0}
            />

            <ExecutiveCard
              title="المواد"
              value={subjectsCount}
              icon={<GraduationCap size={22} aria-hidden="true" />}
              tone="green"
              subtitle="حسب الجدول"
              progress={subjectsCount ? 100 : 0}
            />

            <ExecutiveCard
              title="القاعات"
              value={roomsCount}
              icon={<MapPin size={22} aria-hidden="true" />}
              tone={roomsCount > 0 ? "blue" : "slate"}
              subtitle="قاعات مستخدمة"
              progress={roomsCount ? 100 : 0}
            />
          </section>

          <SummaryCard
            title="ملخص جدولي"
            description="قراءة تنفيذية لتوزيع الحصص الأسبوعية والحصص اليومية والفصول والقاعات."
            tone={todayLessons.length > 0 ? "green" : "gold"}
            items={[
              { label: "حصص اليوم", value: todayLessons.length },
              { label: "إجمالي الحصص", value: schedule.length },
              { label: "النصاب الأسبوعي", value: weeklyLoad },
              { label: "الفصول", value: classesCount },
              { label: "المواد", value: subjectsCount },
              { label: "أيام بلا حصص", value: freeDaysCount },
            ]}
            footer="يمكن فتح متابعة الحصة أو التحضير الإلكتروني مباشرة من أزرار الصفحة."
          />

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[.95fr_1.05fr]">
            <Panel title="حصص اليوم" icon={<CalendarDays size={24} aria-hidden="true" />}>
              {todayLessons.length === 0 ? (
                <UiEmptyState
                icon={<CalendarDays className="h-8 w-8" aria-hidden="true" />}
                title="لا توجد حصص اليوم"
                description="لا توجد حصص في جدول اليوم."
              />
              ) : (
                <div className="space-y-3">
                  {todayLessons.map((item, index) => (
                    <LessonCard
                      key={item.id}
                      item={item}
                      teacher={teacher}
                      active={index === 0}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="الحصة الأقرب وملخص المعلم" icon={<UserRoundCheck size={24} aria-hidden="true" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="المعلم" value={teacher.full_name} />
                <InfoRow label="المادة الأساسية" value={teacher.subject || teacher.specialization || "—"} />
                <InfoRow label="القسم" value={teacher.department || "—"} />
                <InfoRow label="النصاب الأسبوعي" value={String(weeklyLoad)} />
                <InfoRow label="القاعات" value={String(roomsCount)} />
                <InfoRow
                  label="الحصة الأقرب"
                  value={
                    currentLesson
                      ? `${lessonSubject(currentLesson, teacher)} - ${lessonClass(currentLesson)}`
                      : "لا توجد حصة اليوم"
                  }
                />
              </div>

              {currentLesson && (
                <div className="mt-4 rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
                  <p className="text-xs font-black text-[var(--app-text-muted)]">الحصة الأقرب</p>
                  <h3 className="mt-2 text-xl font-black text-[var(--app-text)]">
                    {lessonSubject(currentLesson, teacher)}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[var(--app-text-muted)]">
                    {lessonClass(currentLesson)} - {currentLesson.room || "بدون قاعة"} - {timeRange(currentLesson)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <ActionLink href="/teacher/daily" label="متابعة الحصة" />
                    <ActionLink href="/teacher/preparations" label="التحضير" gold />
                    <ActionLink href="/grades" label="رصد الدرجات" outline />
                  </div>
                </div>
              )}
            </Panel>
          </section>

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-[var(--app-shadow-sm)]">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث بالمادة، الفصل، الشعبة، القاعة، أو رقم الحصة...",
              }}
              filters={
                <ToolbarSelect value={selectedDay} onChange={setSelectedDay}>
                  <option value="all">كل الأيام</option>
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </ToolbarSelect>
              }
              onRefresh={() => void fetchSchedule()}
              actions={
                <SecondaryButton
                  icon={
                    viewMode === "timeline" ? (
                      <Grid2X2 size={17} aria-hidden="true" />
                    ) : (
                      <LayoutList size={17} aria-hidden="true" />
                    )
                  }
                  onClick={() =>
                    setViewMode(viewMode === "timeline" ? "cards" : "timeline")
                  }
                >
                  {viewMode === "timeline" ? "عرض بطاقات" : "عرض زمني"}
                </SecondaryButton>
              }
            />
          </section>

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-lg)] bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)] text-[var(--app-primary)]">
                  <BookOpenCheck size={24} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[var(--app-text)]">الجدول الأسبوعي</h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--app-text-muted)]">
                    عرض {filteredLessons.length} حصة حسب الفلاتر الحالية.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`rounded-[var(--app-radius-lg)] px-4 py-2 text-sm font-black transition ${
                      selectedDay === day
                        ? "bg-[var(--app-primary)] text-[var(--app-primary-foreground)]"
                        : "bg-[var(--app-card-soft)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {filteredLessons.length === 0 ? (
              <UiEmptyState
              icon={<BookOpenCheck className="h-8 w-8" aria-hidden="true" />}
              title="لا توجد حصص"
              description="لا توجد حصص مطابقة للبحث أو اليوم المحدد."
            />
            ) : viewMode === "cards" ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredLessons.map((item) => (
                  <LessonCard key={item.id} item={item} teacher={teacher} compact />
                ))}
              </div>
            ) : (
              <div className="relative space-y-4 before:absolute before:right-5 before:top-0 before:h-full before:w-px before:bg-[var(--app-border)]">
                {filteredLessons.map((item) => (
                  <TimelineLesson key={item.id} item={item} teacher={teacher} active={item.day_name === todayName} />
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            {scheduleByDay.map(({ day, lessons }) => (
              <div
                key={day}
                className={`rounded-[var(--app-radius-xl)] border p-5 shadow-[var(--app-shadow-sm)] ${
                  day === todayName
                    ? "border-[color-mix(in_srgb,var(--app-accent)_45%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-accent)_14%,transparent)]"
                    : "border-[var(--app-border)] bg-[var(--app-card)]"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-black text-[var(--app-text)]">{day}</h3>
                  <span className="rounded-full bg-[var(--app-card)] px-3 py-1 text-xs font-black text-[var(--app-text-muted)]">
                    {lessons.length} حصص
                  </span>
                </div>

                {lessons.length === 0 ? (
                  <p className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4 text-sm font-bold text-[var(--app-text-muted)]">
                    لا توجد حصص.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {lessons.map((item) => (
                      <LessonCard key={item.id} item={item} teacher={teacher} compact />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-lg)] bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)] text-[var(--app-primary)]">
          {icon}
        </div>
        <h2 className="text-xl font-black text-[var(--app-text)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function LessonCard({
  item,
  teacher,
  compact = false,
  active = false,
}: {
  item: ScheduleItem;
  teacher: Teacher;
  compact?: boolean;
  active?: boolean;
}) {
  const subject = lessonSubject(item, teacher);

  return (
    <div
      className={`rounded-[var(--app-radius-lg)] border bg-[var(--app-card)] p-4 shadow-[var(--app-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--app-shadow-md)] ${
        active ? "border-[var(--app-accent)] ring-2 ring-[color-mix(in_srgb,var(--app-accent)_22%,transparent)]" : "border-[var(--app-border)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {active && (
              <span className="rounded-full bg-[var(--app-accent)] px-3 py-1 text-xs font-black text-[var(--app-text)]">
                الحصة الأقرب
              </span>
            )}

            <span className={`rounded-full border px-3 py-1 text-xs font-black ${subjectColor(subject)}`}>
              {subject}
            </span>
          </div>

          <h3 className="font-black text-[var(--app-text)]">{lessonClass(item)}</h3>

          <p className="mt-2 flex items-center gap-1 text-xs font-bold text-[var(--app-text-subtle)]">
            <Clock size={14} aria-hidden="true" />
            {timeRange(item)}
          </p>

          {!compact && (
            <p className="mt-2 flex items-center gap-1 text-xs font-bold text-[var(--app-text-subtle)]">
              <MapPin size={14} aria-hidden="true" />
              القاعة {item.room || "غير محددة"}
            </p>
          )}

          {compact && item.room && (
            <p className="mt-1 text-xs font-bold text-[var(--app-text-subtle)]">القاعة {item.room}</p>
          )}
        </div>

        <span className="rounded-full bg-[var(--app-primary)] px-3 py-1 text-xs font-black text-white">
          الحصة {item.period_number || "-"}
        </span>
      </div>
    </div>
  );
}

function TimelineLesson({
  item,
  teacher,
  active,
}: {
  item: ScheduleItem;
  teacher: Teacher;
  active: boolean;
}) {
  return (
    <div className="relative pr-12">
      <div
        className={`absolute right-0 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-lg)] border ${
          active ? "border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]" : "border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)]"
        }`}
      >
        <Clock size={16} aria-hidden="true" />
      </div>

      <LessonCard item={item} teacher={teacher} compact active={false} />
    </div>
  );
}

function ActionLink({
  href,
  label,
  gold = false,
  outline = false,
}: {
  href: string;
  label: string;
  gold?: boolean;
  outline?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center justify-center rounded-[var(--app-radius-lg)] px-4 text-sm font-black ${
        outline
          ? "border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)]"
          : gold
            ? "bg-[var(--app-accent)] text-[var(--app-accent-foreground)]"
            : "bg-[var(--app-primary)] text-[var(--app-primary-foreground)]"
      }`}
    >
      {label}
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] px-4 py-3">
      <p className="text-xs font-bold text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-1 line-clamp-1 font-black text-[var(--app-text)]">{value}</p>
    </div>
  );
}



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

import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { type SchoolRole } from "@/lib/permissions";

import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  LayoutList,
  Loader2,
  PencilLine,
  Plus,
  RefreshCcw,
  Save,
  School,
  Search,
  Sparkles,
  Target,
  UserRoundCheck,
  X,
} from "lucide-react";

type Teacher = {
  id: string;
  full_name: string;
  email?: string | null;
  subject?: string | null;
  specialization?: string | null;
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
};

type Preparation = {
  id: string;
  teacher_id?: string | null;
  lesson_date?: string | null;
  period_number?: number | null;
  class_name?: string | null;
  section?: string | null;
  subject?: string | null;
  lesson_title?: string | null;
  objectives?: string | null;
  strategies?: string | null;
  resources?: string | null;
  homework?: string | null;
  notes?: string | null;
  preparation_status?: string | null;
  created_at?: string | null;
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

type StatusFilter = "الكل" | "مكتمل" | "مسودة";

const ALLOWED_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "teacher",
];

const QUICK_TEMPLATES = [
  {
    title: "تعلم نشط",
    objectives: "أن يحدد الطالب المفاهيم الرئيسة في الدرس.\nأن يطبق الطالب المهارة من خلال نشاط جماعي.\nأن يقوّم الطالب تعلمه في نهاية الحصة.",
    strategies: "تعلم تعاوني، عصف ذهني، تعلم باللعب، تذكرة خروج.",
    resources: "الكتاب المدرسي، عرض تقديمي، سبورة تفاعلية، ورقة عمل.",
    homework: "حل النشاط الختامي ومراجعة المفاهيم الرئيسة.",
  },
  {
    title: "علاج الفاقد",
    objectives: "أن يستعيد الطالب المهارات السابقة المرتبطة بالدرس.\nأن يعالج الطالب الأخطاء الشائعة من خلال أمثلة موجهة.",
    strategies: "تشخيص قبلي، مجموعات علاجية، تعلم بالأقران، تغذية راجعة فورية.",
    resources: "بطاقات علاجية، أسئلة قصيرة، أمثلة محلولة، منصة مدرستي.",
    homework: "حل تدريب علاجي قصير وتسليمه في الحصة القادمة.",
  },
  {
    title: "تطبيق عملي",
    objectives: "أن ينفذ الطالب نشاطًا تطبيقيًا مرتبطًا بالدرس.\nأن يفسر الطالب نتائج النشاط بلغة علمية صحيحة.",
    strategies: "تعلم بالممارسة، حل مشكلات، نقاش موجه، تقويم عملي.",
    resources: "أدوات النشاط، ورقة ملاحظة، فيديو قصير، كتاب الطالب.",
    homework: "كتابة ملخص قصير لما تم تطبيقه داخل الحصة.",
  },
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function todayArabicDay() {
  return new Date().toLocaleDateString("ar-SA", { weekday: "long" });
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
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
  label: string,
): Promise<T> {
  try {
    const result = await query;

    if (result.error) {
      console.warn(`teacher preparations query skipped: ${label}`, result.error);
      return fallback;
    }

    return result.data ?? fallback;
  } catch (error) {
    console.warn(`teacher preparations query failed: ${label}`, error);
    return fallback;
  }
}

function lessonName(item: ScheduleItem, teacher: Teacher | null) {
  return item.subject || teacher?.subject || teacher?.specialization || "مادة غير محددة";
}

function className(item: ScheduleItem) {
  return `${item.class_name || "فصل غير محدد"}${item.section ? ` / ${item.section}` : ""}`;
}

function isCompleted(status?: string | null) {
  const value = String(status || "").toLowerCase();
  return (
    value.includes("مكتمل") ||
    value.includes("complete") ||
    value.includes("approved") ||
    value.includes("معتمد")
  );
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function lessonKey(date: string, item: ScheduleItem) {
  return `${date}-${item.period_number || ""}-${item.class_name || ""}-${item.section || ""}`;
}

export default function TeacherPreparationsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [preparations, setPreparations] = useState<Preparation[]>([]);

  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [lessonDate, setLessonDate] = useState(todayDate());
  const [lessonTitle, setLessonTitle] = useState("");
  const [objectives, setObjectives] = useState("");
  const [strategies, setStrategies] = useState("");
  const [resources, setResources] = useState("");
  const [homework, setHomework] = useState("");
  const [notes, setNotes] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("الكل");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setPreparations([]);
    setSelectedLessonId("");
  }, []);

  const fetchPage = useCallback(async () => {
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
          .select("id, full_name, email, subject, specialization")
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

      const [scheduleData, preparationData] = await Promise.all([
        safeQuery<ScheduleItem[]>(
          supabase
            .from("teacher_schedule")
            .select("*")
            .eq("school_id", currentSchool.id)
            .eq("teacher_id", teacherData.id)
            .order("day_name", { ascending: true })
            .order("period_number", { ascending: true }),
          [],
          "teacher_schedule",
        ),
        safeQuery<Preparation[]>(
          supabase
            .from("teacher_lesson_preparations")
            .select("*")
            .eq("school_id", currentSchool.id)
            .eq("teacher_id", teacherData.id)
            .order("lesson_date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(60),
          [],
          "teacher_lesson_preparations",
        ),
      ]);

      setSchedule(scheduleData || []);
      setPreparations(preparationData || []);

      const todayLesson = (scheduleData || []).find((item) => item.day_name === todayName);
      if (todayLesson && !selectedLessonId) {
        setSelectedLessonId(todayLesson.id);
      }
    } catch (error) {
      resetPage();
      const message = getErrorMessage(error, "تعذر تحميل صفحة التحضير.");
      setErrorMsg(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, resetPage, selectedLessonId, showToast, todayName]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      resetPage();
      setErrorMsg("لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      return;
    }

    queueMicrotask(() => {
      void fetchPage();
    });
  }, [currentSchool?.id, fetchPage, resetPage, schoolLoading]);

  const todaySchedule = useMemo(() => {
    return schedule
      .filter((item) => item.day_name === todayName)
      .sort(
        (first, second) =>
          Number(first.period_number || 0) - Number(second.period_number || 0),
      );
  }, [schedule, todayName]);

  const selectedLesson = useMemo(() => {
    return schedule.find((item) => item.id === selectedLessonId) || null;
  }, [schedule, selectedLessonId]);

  const preparedToday = useMemo(() => {
    return preparations.filter((item) => item.lesson_date === today).length;
  }, [preparations, today]);

  const completedCount = useMemo(() => {
    return preparations.filter((item) => isCompleted(item.preparation_status)).length;
  }, [preparations]);

  const draftCount = preparations.length - completedCount;

  const preparationCoverage = todaySchedule.length
    ? Math.min(100, Math.round((preparedToday / todaySchedule.length) * 100))
    : 0;

  const preparedLessonKeys = useMemo(() => {
    const set = new Set<string>();

    preparations.forEach((item) => {
      set.add(
        `${item.lesson_date || ""}-${item.period_number || ""}-${item.class_name || ""}-${item.section || ""}`,
      );
    });

    return set;
  }, [preparations]);

  const filteredPreparations = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return preparations.filter((item) => {
      const completed = isCompleted(item.preparation_status);

      const matchesStatus =
        statusFilter === "الكل" ||
        (statusFilter === "مكتمل" && completed) ||
        (statusFilter === "مسودة" && !completed);

      const text = [
        item.lesson_title,
        item.subject,
        item.class_name,
        item.section,
        item.objectives,
        item.strategies,
        item.resources,
        item.homework,
        item.notes,
        item.preparation_status,
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!keyword || text.includes(keyword));
    });
  }, [preparations, search, statusFilter]);

  function isLessonPrepared(item: ScheduleItem, date = lessonDate) {
    return preparedLessonKeys.has(lessonKey(date, item));
  }

  function fillFromLesson(item: ScheduleItem) {
    setSelectedLessonId(item.id);

    if (!lessonTitle.trim()) {
      setLessonTitle(lessonName(item, teacher));
    }

    setLessonDate(today);
  }

  function applyTemplate(template: (typeof QUICK_TEMPLATES)[number]) {
    setLessonTitle((current) => current || template.title);
    setObjectives(template.objectives);
    setStrategies(template.strategies);
    setResources(template.resources);
    setHomework(template.homework);
    showToast("success", "تم تطبيق قالب التحضير.");
  }

  function clearForm() {
    setSelectedLessonId("");
    setLessonTitle("");
    setObjectives("");
    setStrategies("");
    setResources("");
    setHomework("");
    setNotes("");
  }

  async function savePreparation(status: "مسودة" | "مكتمل") {
    if (!currentSchool?.id || !teacher?.id) return;

    if (!selectedLesson) {
      showToast("error", "اختر الحصة أولًا.");
      return;
    }

    if (!lessonTitle.trim()) {
      showToast("error", "اكتب عنوان الدرس.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        school_id: currentSchool.id,
        teacher_id: teacher.id,
        lesson_date: lessonDate,
        period_number: selectedLesson.period_number || null,
        class_name: selectedLesson.class_name || null,
        section: selectedLesson.section || null,
        subject: selectedLesson.subject || teacher.subject || teacher.specialization || null,
        lesson_title: lessonTitle.trim(),
        objectives: objectives.trim() || null,
        strategies: strategies.trim() || null,
        resources: resources.trim() || null,
        homework: homework.trim() || null,
        notes: notes.trim() || null,
        preparation_status: status,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("teacher_lesson_preparations")
        .insert(payload);

      if (error) throw error;

      showToast(
        "success",
        status === "مكتمل" ? "تم حفظ التحضير كمكتمل." : "تم حفظ التحضير كمسودة.",
      );

      clearForm();
      await fetchPage();
    } catch (error) {
      showToast("error", getErrorMessage(error, "تعذر حفظ التحضير."));
    } finally {
      setSaving(false);
    }
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={ALLOWED_ROLES}>
        <AppShell>
          <LoadingBox text="جاري تحميل التحضير الإلكتروني..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool || errorMsg || !teacher) {
    return (
      <RoleGuard allowedRoles={ALLOWED_ROLES}>
        <AppShell>
          <div className="rounded-[28px] border border-red-100 bg-red-50 p-6 text-center font-bold text-red-700">
            {errorMsg || "تعذر فتح صفحة التحضير."}
          </div>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <AppShell>
        <main className="space-y-5" dir="rtl">
          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="التحضير الإلكتروني"
            description="مركز احترافي لتحضير دروس المعلم، اختيار الحصة من الجدول، استخدام قوالب جاهزة، وحفظ التحضير كمسودة أو مكتمل."
            badge="بوابة المعلم"
            icon={<BookOpenCheck size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة المعلم", href: "/teacher-portal" },
              { label: "التحضير الإلكتروني" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool.school_name || "—" },
              { label: "المعلم", value: teacher.full_name },
              { label: "اليوم", value: `${todayName} - ${today}` },
              { label: "المادة", value: teacher.subject || teacher.specialization || "غير محددة" },
            ]}
            stats={[
              { label: "حصص اليوم", value: todaySchedule.length, icon: <CalendarDays size={20} />, tone: "blue" },
              { label: "تحاضير اليوم", value: preparedToday, icon: <CheckCircle2 size={20} />, tone: preparedToday > 0 ? "green" : "gold" },
              { label: "جاهزية اليوم", value: `${preparationCoverage}%`, icon: <GraduationCap size={20} />, tone: preparationCoverage >= 100 ? "green" : "gold" },
              { label: "المسودات", value: draftCount, icon: <PencilLine size={20} />, tone: draftCount > 0 ? "gold" : "green" },
            ]}
            actions={
              <>
                <Link
                  href="/teacher-portal"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ArrowRight size={17} />
                  بوابة المعلم
                </Link>

                <Link
                  href="/teacher/schedule"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#C1B489] px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <CalendarDays size={17} />
                  الجدول
                </Link>

                <button
                  type="button"
                  onClick={() => void fetchPage()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <ExecutiveCard
              title="المعلم"
              value={teacher.full_name}
              icon={<UserRoundCheck size={22} />}
              tone="blue"
              subtitle="صاحب التحضير"
              progress={100}
            />

            <ExecutiveCard
              title="حصص اليوم"
              value={todaySchedule.length}
              icon={<CalendarDays size={22} />}
              tone="teal"
              subtitle="من الجدول"
              progress={todaySchedule.length ? 100 : 0}
            />

            <ExecutiveCard
              title="تحاضير اليوم"
              value={preparedToday}
              icon={<CheckCircle2 size={22} />}
              tone={preparedToday > 0 ? "green" : "gold"}
              subtitle="محفوظة لهذا اليوم"
              progress={todaySchedule.length ? percentage(preparedToday, todaySchedule.length) : 0}
            />

            <ExecutiveCard
              title="مكتملة"
              value={completedCount}
              icon={<Target size={22} />}
              tone="green"
              subtitle="تحاضير مكتملة"
              progress={preparations.length ? percentage(completedCount, preparations.length) : 0}
            />

            <ExecutiveCard
              title="مسودات"
              value={draftCount}
              icon={<PencilLine size={22} />}
              tone={draftCount > 0 ? "gold" : "green"}
              subtitle="تحتاج إكمال"
              progress={preparations.length ? percentage(draftCount, preparations.length) : 0}
            />
          </section>

          <SummaryCard
            title="ملخص التحضير"
            description="قراءة تنفيذية لجاهزية تحاضير المعلم حسب جدول اليوم والتحاضير المحفوظة."
            tone={preparationCoverage >= 100 ? "green" : "gold"}
            items={[
              { label: "حصص اليوم", value: todaySchedule.length },
              { label: "تحاضير اليوم", value: preparedToday },
              { label: "جاهزية اليوم", value: `${preparationCoverage}%` },
              { label: "إجمالي التحاضير", value: preparations.length },
              { label: "المكتملة", value: completedCount },
              { label: "المسودات", value: draftCount },
            ]}
            footer="يفضل إكمال تحضير حصص اليوم قبل بداية اليوم الدراسي لضمان جاهزية التنفيذ."
          />

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
                  <Plus size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#15445A]">إنشاء تحضير جديد</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    اختر الحصة ثم اكتب عنوان الدرس والأهداف والاستراتيجيات والوسائل والواجب.
                  </p>
                </div>
              </div>

              <div className="mb-5 grid gap-3 md:grid-cols-3">
                {QUICK_TEMPLATES.map((template) => (
                  <button
                    key={template.title}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                  >
                    <Sparkles className="mb-3 text-[#0DA9A6]" size={20} />
                    <p className="font-black text-[#15445A]">{template.title}</p>
                    <p className="mt-1 text-xs leading-6 text-slate-500">تعبئة ذكية لحقول التحضير الأساسية.</p>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <Field label="تاريخ الدرس">
                  <input
                    type="date"
                    value={lessonDate}
                    onChange={(event) => setLessonDate(event.target.value)}
                    className="field"
                  />
                </Field>

                <Field label="اختر الحصة">
                  <select
                    value={selectedLessonId}
                    onChange={(event) => {
                      const id = event.target.value;
                      setSelectedLessonId(id);
                      const item = schedule.find((lesson) => lesson.id === id);
                      if (item && !lessonTitle.trim()) {
                        setLessonTitle(lessonName(item, teacher));
                      }
                    }}
                    className="field"
                  >
                    <option value="">اختر من الجدول</option>
                    {schedule.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.day_name || "-"} - الحصة {item.period_number || "-"} - {className(item)} - {lessonName(item, teacher)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="عنوان الدرس">
                  <input
                    value={lessonTitle}
                    onChange={(event) => setLessonTitle(event.target.value)}
                    placeholder="مثال: تركيب الخلية"
                    className="field"
                  />
                </Field>

                <Field label="أهداف الدرس">
                  <textarea
                    value={objectives}
                    onChange={(event) => setObjectives(event.target.value)}
                    rows={4}
                    placeholder="اكتب أهداف الدرس..."
                    className="field"
                  />
                </Field>

                <Field label="استراتيجيات التدريس">
                  <textarea
                    value={strategies}
                    onChange={(event) => setStrategies(event.target.value)}
                    rows={3}
                    placeholder="تعلم تعاوني، عصف ذهني، حل مشكلات..."
                    className="field"
                  />
                </Field>

                <Field label="الوسائل والمصادر">
                  <textarea
                    value={resources}
                    onChange={(event) => setResources(event.target.value)}
                    rows={3}
                    placeholder="الكتاب، عرض تقديمي، فيديو، ورقة عمل..."
                    className="field"
                  />
                </Field>

                <Field label="التقويم والملاحظات">
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    placeholder="أسئلة تقويمية، ملاحظات تنفيذ، علاج الفاقد..."
                    className="field"
                  />
                </Field>

                <Field label="الواجب">
                  <textarea
                    value={homework}
                    onChange={(event) => setHomework(event.target.value)}
                    rows={3}
                    placeholder="اكتب الواجب أو المتابعة..."
                    className="field"
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void savePreparation("مسودة")}
                    disabled={saving}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 text-sm font-black text-[#15445A] hover:bg-slate-200 disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <PencilLine size={18} />}
                    حفظ كمسودة
                  </button>

                  <button
                    type="button"
                    onClick={() => void savePreparation("مكتمل")}
                    disabled={saving}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-5 text-sm font-black text-white hover:opacity-95 disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    حفظ كمكتمل
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <Panel title="حصص اليوم" icon={<Clock size={24} />}>
                {todaySchedule.length === 0 ? (
                  <EmptyBox text="لا توجد حصص في جدول اليوم." />
                ) : (
                  <div className="space-y-3">
                    {todaySchedule.map((item) => (
                      <LessonBox
                        key={item.id}
                        item={item}
                        teacher={teacher}
                        prepared={isLessonPrepared(item, today)}
                        onSelect={() => fillFromLesson(item)}
                      />
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="فلترة التحاضير" icon={<Search size={24} />}>
                <PageToolbar
                  search={{
                    value: search,
                    onChange: setSearch,
                    placeholder: "ابحث في عنوان الدرس أو المادة أو الفصل...",
                  }}
                  filters={
                    <ToolbarSelect
                      value={statusFilter}
                      onChange={(value) => setStatusFilter(value as StatusFilter)}
                    >
                      <option value="الكل">كل الحالات</option>
                      <option value="مكتمل">مكتمل</option>
                      <option value="مسودة">مسودة</option>
                    </ToolbarSelect>
                  }
                  onRefresh={() => void fetchPage()}
                />
              </Panel>

              <Panel title="التحاضير الأخيرة" icon={<LayoutList size={24} />}>
                {filteredPreparations.length === 0 ? (
                  <EmptyBox text="لا توجد تحاضير مطابقة." />
                ) : (
                  <div className="space-y-3">
                    {filteredPreparations.slice(0, 12).map((item) => (
                      <PreparationCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="ملخص سريع" icon={<School size={24} />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MiniMetric label="إجمالي التحاضير" value={preparations.length} />
                  <MiniMetric label="المكتملة" value={completedCount} />
                  <MiniMetric label="المسودات" value={draftCount} />
                  <MiniMetric label="جاهزية اليوم" value={`${preparationCoverage}%`} />
                </div>
              </Panel>
            </section>
          </section>
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#15445A]">{label}</span>
      {children}
    </label>
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
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          {icon}
        </div>
        <h2 className="text-xl font-black text-[#15445A]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function LessonBox({
  item,
  teacher,
  prepared,
  onSelect,
}: {
  item: ScheduleItem;
  teacher: Teacher | null;
  prepared: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md ${
        prepared ? "border-[#07A869]/20 bg-[#07A869]/10" : "border-slate-100 bg-slate-50"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-black text-[#15445A]">{className(item)}</h3>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            prepared ? "bg-white text-[#07A869]" : "bg-[#C1B489]/20 text-[#15445A]"
          }`}
        >
          {prepared ? "محضرة" : `الحصة ${item.period_number || "-"}`}
        </span>
      </div>

      <p className="text-sm text-slate-500">
        {lessonName(item, teacher)} - القاعة {item.room || "—"}
      </p>
    </button>
  );
}

function PreparationCard({ item }: { item: Preparation }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#15445A]">
          {formatDate(item.lesson_date)}
        </span>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            isCompleted(item.preparation_status)
              ? "bg-[#07A869]/10 text-[#07A869]"
              : "bg-[#C1B489]/20 text-[#15445A]"
          }`}
        >
          {item.preparation_status || "مسودة"}
        </span>
      </div>

      <h3 className="font-black text-[#15445A]">
        {item.lesson_title || "تحضير درس"}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        الحصة {item.period_number || "-"} - {item.class_name || "-"}
        {item.section ? ` / ${item.section}` : ""} - {item.subject || "-"}
      </p>

      {item.objectives && (
        <p className="mt-3 line-clamp-2 rounded-2xl bg-white px-3 py-2 text-sm leading-7 text-slate-500">
          {item.objectives}
        </p>
      )}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#15445A]">{value}</p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="rounded-[28px] bg-white p-6 text-center text-slate-500 shadow-sm">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#15445A]" />
        {text}
      </div>
    </div>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl ${
        toast.type === "success" ? "bg-[#07A869]" : "bg-red-600"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle2 size={18} />
      ) : (
        <AlertCircle size={18} />
      )}
      <span>{toast.message}</span>
    </div>
  );
}

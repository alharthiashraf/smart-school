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

import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Grid2X2,
  LayoutList,
  Loader2,
  RefreshCcw,
  School,
  Search,
  Timer,
  UserRoundCheck,
  XCircle,
} from "lucide-react";

type Teacher = {
  id: string;
  full_name: string;
  email?: string | null;
  subject?: string | null;
  specialization?: string | null;
  department?: string | null;
};

type WaitingPeriod = {
  id: string;
  teacher_id: string;
  class_name?: string | null;
  section?: string | null;
  subject?: string | null;
  period_number?: number | null;
  day_name?: string | null;
  waiting_date?: string | null;
  approval_status?: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type WaitingFilter = "all" | "today" | "pending" | "approved" | "rejected";
type ViewMode = "cards" | "timeline";

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

type QueryLike<T> = PromiseLike<QueryResult<T>>;

const ALLOWED_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "teacher",
];

const FILTERS: { value: WaitingFilter; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "today", label: "اليوم" },
  { value: "pending", label: "بانتظار الاعتماد" },
  { value: "approved", label: "معتمدة" },
  { value: "rejected", label: "مرفوضة" },
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

function normalizeStatus(value?: string | null) {
  const status = String(value || "").trim();

  if (!status) return "بانتظار الاعتماد";

  const lower = status.toLowerCase();

  if (
    lower === "approved" ||
    lower === "active" ||
    lower === "accepted" ||
    status.includes("معتمد") ||
    status.includes("موافق")
  ) {
    return "معتمدة";
  }

  if (lower === "rejected" || lower === "refused" || status.includes("مرفوض")) {
    return "مرفوضة";
  }

  if (
    lower === "pending" ||
    lower === "draft" ||
    lower === "review" ||
    status.includes("انتظار") ||
    status.includes("مراجعة") ||
    status.includes("مسودة")
  ) {
    return "بانتظار الاعتماد";
  }

  return status;
}

function getStatusText(item: WaitingPeriod) {
  return normalizeStatus(item.approval_status || item.status);
}

function isPending(value?: string | null) {
  return normalizeStatus(value) === "بانتظار الاعتماد";
}

function isApproved(value?: string | null) {
  return normalizeStatus(value) === "معتمدة";
}

function isRejected(value?: string | null) {
  return normalizeStatus(value) === "مرفوضة";
}

function getStatusPill(value?: string | null) {
  const status = normalizeStatus(value);

  if (status === "معتمدة") return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
  if (status === "مرفوضة") return "border-red-200 bg-red-50 text-red-700";
  if (status === "بانتظار الاعتماد") return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";

  return "border-[#3D7EB9]/20 bg-[#3D7EB9]/10 text-[#3D7EB9]";
}

function getStatusTone(value?: string | null): "green" | "red" | "gold" | "blue" {
  const status = normalizeStatus(value);

  if (status === "معتمدة") return "green";
  if (status === "مرفوضة") return "red";
  if (status === "بانتظار الاعتماد") return "gold";

  return "blue";
}

async function safeQuery<T>(
  query: QueryLike<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    const result = await query;

    if (result.error) {
      console.warn(`teacher waiting query skipped: ${label}`, result.error);
      return fallback;
    }

    return result.data ?? fallback;
  } catch (error) {
    console.warn(`teacher waiting query failed: ${label}`, error);
    return fallback;
  }
}

function waitingTitle(item: WaitingPeriod) {
  return `${item.class_name || "فصل غير محدد"}${item.section ? ` / ${item.section}` : ""}`;
}

function waitingSubject(item: WaitingPeriod) {
  return item.subject || "انتظار";
}

function periodLabel(item: WaitingPeriod) {
  return item.period_number ? `الحصة ${item.period_number}` : "حصة غير محددة";
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function sortWaiting(first: WaitingPeriod, second: WaitingPeriod) {
  const dateA = first.waiting_date || first.created_at || "";
  const dateB = second.waiting_date || second.created_at || "";

  if (dateA !== dateB) return dateB.localeCompare(dateA);

  return Number(first.period_number || 0) - Number(second.period_number || 0);
}

export default function TeacherWaitingPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [waiting, setWaiting] = useState<WaitingPeriod[]>([]);
  const [filter, setFilter] = useState<WaitingFilter>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

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
    setWaiting([]);
    setFilter("all");
    setSearch("");
  }, []);

  const fetchWaiting = useCallback(async () => {
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
          .select("id, full_name, email, subject, specialization, department")
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

      const waitingData = await safeQuery<WaitingPeriod[]>(
        supabase
          .from("teacher_waiting_periods")
          .select("*")
          .eq("school_id", currentSchool.id)
          .eq("teacher_id", teacherData.id)
          .order("waiting_date", { ascending: false })
          .order("created_at", { ascending: false }),
        [],
        "teacher_waiting_periods",
      );

      setWaiting((waitingData || []).sort(sortWaiting));
    } catch (error) {
      resetPage();
      const message = getErrorMessage(error, "تعذر تحميل حصص الانتظار.");
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
      void fetchWaiting();
    });
  }, [currentSchool?.id, fetchWaiting, resetPage, schoolLoading]);

  const todayWaiting = useMemo(() => {
    return waiting.filter(
      (item) => item.waiting_date === today || item.day_name === todayName,
    );
  }, [waiting, today, todayName]);

  const pendingWaiting = useMemo(() => {
    return waiting.filter((item) => isPending(item.approval_status || item.status));
  }, [waiting]);

  const approvedWaiting = useMemo(() => {
    return waiting.filter((item) => isApproved(item.approval_status || item.status));
  }, [waiting]);

  const rejectedWaiting = useMemo(() => {
    return waiting.filter((item) => isRejected(item.approval_status || item.status));
  }, [waiting]);

  const filteredWaiting = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const base =
      filter === "today"
        ? todayWaiting
        : filter === "pending"
          ? pendingWaiting
          : filter === "approved"
            ? approvedWaiting
            : filter === "rejected"
              ? rejectedWaiting
              : waiting;

    return base
      .filter((item) => {
        const text = [
          item.class_name,
          item.section,
          item.subject,
          item.period_number,
          item.day_name,
          item.waiting_date,
          item.status,
          item.approval_status,
          item.notes,
          teacher?.full_name,
        ]
          .join(" ")
          .toLowerCase();

        return !keyword || text.includes(keyword);
      })
      .sort(sortWaiting);
  }, [
    approvedWaiting,
    filter,
    pendingWaiting,
    rejectedWaiting,
    search,
    teacher?.full_name,
    todayWaiting,
    waiting,
  ]);

  const upcomingWaiting = useMemo(() => {
    return waiting
      .filter((item) => item.waiting_date && item.waiting_date >= today)
      .sort((first, second) => {
        const dateCompare = String(first.waiting_date).localeCompare(String(second.waiting_date));
        if (dateCompare !== 0) return dateCompare;
        return Number(first.period_number || 0) - Number(second.period_number || 0);
      })
      .slice(0, 4);
  }, [waiting, today]);

  const weeklyWaiting = useMemo(() => {
    const now = new Date(today);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const start = weekStart.toISOString().slice(0, 10);
    const end = weekEnd.toISOString().slice(0, 10);

    return waiting.filter((item) => {
      const date = item.waiting_date || "";
      return date >= start && date <= end;
    });
  }, [waiting, today]);

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={ALLOWED_ROLES}>
        <AppShell>
          <LoadingBox text="جاري تحميل حصص الانتظار..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool || errorMsg || !teacher) {
    return (
      <RoleGuard allowedRoles={ALLOWED_ROLES}>
        <AppShell>
          <div className="rounded-[28px] border border-red-100 bg-red-50 p-6 text-center font-bold text-red-700">
            {errorMsg || "تعذر فتح صفحة الانتظار."}
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
            title={`حصص انتظار ${teacher.full_name}`}
            description="متابعة حصص الانتظار المسندة للمعلم، حالة الاعتماد، الحصص القادمة، والفصول المرتبطة بها."
            badge="بوابة المعلم"
            icon={<Timer size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة المعلم", href: "/teacher-portal" },
              { label: "حصص الانتظار" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool.school_name || "—" },
              { label: "المعلم", value: teacher.full_name },
              { label: "اليوم", value: `${todayName} - ${today}` },
              { label: "القسم", value: teacher.department || "غير محدد" },
            ]}
            stats={[
              { label: "انتظار اليوم", value: todayWaiting.length, icon: <Timer size={20} />, tone: "blue" },
              { label: "الأسبوع", value: weeklyWaiting.length, icon: <CalendarDays size={20} />, tone: "teal" },
              { label: "بانتظار الاعتماد", value: pendingWaiting.length, icon: <Clock size={20} />, tone: pendingWaiting.length > 0 ? "gold" : "green" },
              { label: "معتمدة", value: approvedWaiting.length, icon: <CheckCircle2 size={20} />, tone: "green" },
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

                <Link
                  href="/teacher/daily"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ClipboardCheck size={17} />
                  متابعة الحصة
                </Link>

                <button
                  type="button"
                  onClick={() => void fetchWaiting()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <ExecutiveCard
              title="انتظار اليوم"
              value={todayWaiting.length}
              icon={<Timer size={22} />}
              tone="blue"
              subtitle={`${todayName}`}
              progress={waiting.length ? percentage(todayWaiting.length, waiting.length) : 0}
            />

            <ExecutiveCard
              title="إجمالي الانتظار"
              value={waiting.length}
              icon={<ClipboardCheck size={22} />}
              tone="teal"
              subtitle="كل الحصص المسندة"
              progress={waiting.length ? 100 : 0}
            />

            <ExecutiveCard
              title="بانتظار الاعتماد"
              value={pendingWaiting.length}
              icon={<Clock size={22} />}
              tone={pendingWaiting.length > 0 ? "gold" : "green"}
              subtitle="تحتاج مراجعة"
              progress={waiting.length ? percentage(pendingWaiting.length, waiting.length) : 0}
            />

            <ExecutiveCard
              title="معتمدة"
              value={approvedWaiting.length}
              icon={<CheckCircle2 size={22} />}
              tone="green"
              subtitle="تم اعتمادها"
              progress={waiting.length ? percentage(approvedWaiting.length, waiting.length) : 0}
            />

            <ExecutiveCard
              title="مرفوضة"
              value={rejectedWaiting.length}
              icon={<XCircle size={22} />}
              tone={rejectedWaiting.length > 0 ? "red" : "green"}
              subtitle="تحتاج معالجة"
              progress={waiting.length ? percentage(rejectedWaiting.length, waiting.length) : 0}
            />
          </section>

          <SummaryCard
            title="ملخص حصص الانتظار"
            description="قراءة تنفيذية لحصص الانتظار المسندة للمعلم وحالة الاعتماد والمتابعة."
            tone={pendingWaiting.length > 0 || rejectedWaiting.length > 0 ? "gold" : "green"}
            items={[
              { label: "انتظار اليوم", value: todayWaiting.length },
              { label: "انتظار الأسبوع", value: weeklyWaiting.length },
              { label: "الإجمالي", value: waiting.length },
              { label: "بانتظار الاعتماد", value: pendingWaiting.length },
              { label: "معتمدة", value: approvedWaiting.length },
              { label: "مرفوضة", value: rejectedWaiting.length },
            ]}
            footer="تظهر الحصص حسب ما تم إسناده للمعلم في جدول teacher_waiting_periods."
          />

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[.95fr_1.05fr]">
            <Panel title="بيانات المعلم" icon={<UserRoundCheck size={24} />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="المعلم" value={teacher.full_name} />
                <InfoRow label="المادة" value={teacher.subject || teacher.specialization || "—"} />
                <InfoRow label="القسم" value={teacher.department || "—"} />
                <InfoRow label="حصص اليوم" value={String(todayWaiting.length)} />
                <InfoRow label="بانتظار الاعتماد" value={String(pendingWaiting.length)} />
                <InfoRow label="نسبة الاعتماد" value={`${percentage(approvedWaiting.length, waiting.length)}%`} />
              </div>
            </Panel>

            <Panel title="أقرب حصص الانتظار" icon={<FileText size={24} />}>
              {upcomingWaiting.length === 0 ? (
                <EmptyBox text="لا توجد حصص انتظار قادمة." />
              ) : (
                <div className="space-y-3">
                  {upcomingWaiting.map((item) => (
                    <WaitingMiniCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </Panel>
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث بالفصل، الشعبة، المادة، اليوم، الحالة أو الملاحظات...",
              }}
              filters={
                <ToolbarSelect
                  value={filter}
                  onChange={(value) => setFilter(value as WaitingFilter)}
                >
                  {FILTERS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </ToolbarSelect>
              }
              onRefresh={() => void fetchWaiting()}
              actions={
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === "cards" ? "timeline" : "cards")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A]"
                >
                  {viewMode === "cards" ? <LayoutList size={17} /> : <Grid2X2 size={17} />}
                  {viewMode === "cards" ? "عرض زمني" : "عرض بطاقات"}
                </button>
              }
            />
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
                  <ClipboardCheck size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#15445A]">قائمة حصص الانتظار</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    عرض {filteredWaiting.length} حصة حسب الفلاتر الحالية.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                {FILTERS.map((item) => (
                  <FilterButton
                    key={item.value}
                    active={filter === item.value}
                    label={item.label}
                    onClick={() => setFilter(item.value)}
                  />
                ))}
              </div>
            </div>

            {filteredWaiting.length === 0 ? (
              <EmptyBox text="لا توجد حصص انتظار حسب التصفية الحالية." />
            ) : viewMode === "cards" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredWaiting.map((item) => (
                  <WaitingCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="relative space-y-4 before:absolute before:right-5 before:top-0 before:h-full before:w-px before:bg-slate-200">
                {filteredWaiting.map((item) => (
                  <TimelineWaiting key={item.id} item={item} />
                ))}
              </div>
            )}
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

function WaitingMiniCard({ item }: { item: WaitingPeriod }) {
  const status = getStatusText(item);

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-[#15445A]">{waitingTitle(item)}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {waitingSubject(item)} - {periodLabel(item)}
          </p>
        </div>

        <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusPill(status)}`}>
          {status}
        </span>
      </div>

      <p className="mt-2 text-xs font-bold text-slate-400">
        {item.day_name || "—"} - {formatDate(item.waiting_date)}
      </p>
    </div>
  );
}

function WaitingCard({ item }: { item: WaitingPeriod }) {
  const status = getStatusText(item);

  return (
    <div className="rounded-[28px] border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#15445A]">{waitingTitle(item)}</h3>

          <p className="mt-1 text-sm font-bold text-slate-500">
            {waitingSubject(item)} — {periodLabel(item)}
          </p>
        </div>

        <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusPill(status)}`}>
          {status}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoRow label="اليوم" value={item.day_name || "—"} />
        <InfoRow label="التاريخ" value={formatDate(item.waiting_date)} />
      </div>

      {item.notes && (
        <div className="mt-3 rounded-2xl bg-white p-4">
          <p className="mb-1 text-xs font-black text-slate-400">ملاحظات</p>
          <p className="text-sm leading-7 text-slate-600">{item.notes}</p>
        </div>
      )}
    </div>
  );
}

function TimelineWaiting({ item }: { item: WaitingPeriod }) {
  const status = getStatusText(item);
  const tone = getStatusTone(status);

  return (
    <div className="relative pr-12">
      <div className={`absolute right-0 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-2xl border ${circleTone(tone)}`}>
        <Clock size={16} />
      </div>

      <WaitingCard item={item} />
    </div>
  );
}

function circleTone(tone: "green" | "red" | "gold" | "blue") {
  if (tone === "green") return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
  if (tone === "red") return "border-red-200 bg-red-50 text-red-700";
  if (tone === "gold") return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";
  return "border-[#3D7EB9]/20 bg-[#3D7EB9]/10 text-[#3D7EB9]";
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-1 font-black text-[#15445A]">{value}</p>
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 rounded-2xl px-4 text-sm font-black transition ${
        active
          ? "bg-[#15445A] text-white"
          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
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
      {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span>{toast.message}</span>
    </div>
  );
}

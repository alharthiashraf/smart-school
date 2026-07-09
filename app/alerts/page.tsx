"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  HeartPulse,
  Loader2,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
  UserRoundSearch,
  XCircle,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageContainer from "@/components/layout/PageContainer";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import StatCard from "@/components/ui/cards/StatCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/lib/supabase";
import { STAFF_ROLES } from "@/lib/permissions";

type AlertItem = {
  id: string;
  school_id: string;
  student_id: string | null;
  alert_type: string;
  title: string;
  message: string | null;
  severity: "low" | "medium" | "high" | null;
  is_read: boolean | null;
  created_at: string | null;
  source_table: "alerts" | "notifications";
};

type Student = {
  id: string;
  full_name: string;
  classroom: string | null;
  section: string | null;
  grade_level: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const TYPE_OPTIONS = [
  { value: "all", label: "كل التنبيهات" },
  { value: "attendance", label: "الحضور" },
  { value: "repeated_absence", label: "غياب متكرر" },
  { value: "health", label: "تحويل صحي" },
  { value: "academic", label: "تحصيل دراسي" },
  { value: "intervention", label: "تدخل إرشادي" },
  { value: "notification", label: "تنبيه عام" },
];

const SEVERITY_OPTIONS = [
  { value: "all", label: "كل مستويات الخطورة" },
  { value: "high", label: "عالية" },
  { value: "medium", label: "متوسطة" },
  { value: "low", label: "منخفضة" },
];

const READ_OPTIONS = [
  { value: "all", label: "كل الحالات" },
  { value: "unread", label: "غير مقروءة" },
  { value: "read", label: "مقروءة" },
];

const SEVERITY_LABELS: Record<string, string> = {
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

function normalizeSeverity(value?: string | null): AlertItem["severity"] {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "high" || normalized === "عالية" || normalized === "مرتفع") {
    return "high";
  }

  if (normalized === "low" || normalized === "منخفضة" || normalized === "منخفض") {
    return "low";
  }

  return "medium";
}

function normalizeNotificationType(value?: string | null) {
  const normalized = String(value || "").trim();
  return normalized || "notification";
}

function formatDate(value: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

export default function AlertsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (currentSchool?.id) {
      void fetchData();
    }
  }, [currentSchool?.id]);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2500);
  }

  async function fetchAlertsFromMainTable(schoolId: string) {
    const { data, error } = await supabase
      .from("alerts")
      .select("id, school_id, student_id, alert_type, title, message, severity, is_read, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return ((data || []) as Array<Omit<AlertItem, "source_table">>).map((item) => ({
      ...item,
      alert_type: normalizeNotificationType(item.alert_type),
      severity: normalizeSeverity(item.severity),
      source_table: "alerts" as const,
    }));
  }

  async function fetchAlertsFromNotifications(schoolId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, school_id, title, message, type, is_read, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return ((data || []) as Array<{
      id: string;
      school_id: string;
      title: string | null;
      message: string | null;
      type: string | null;
      is_read: boolean | null;
      created_at: string | null;
    }>).map((item) => ({
      id: item.id,
      school_id: item.school_id,
      student_id: null,
      alert_type: normalizeNotificationType(item.type),
      title: item.title || "تنبيه عام",
      message: item.message || null,
      severity: "medium" as const,
      is_read: item.is_read,
      created_at: item.created_at,
      source_table: "notifications" as const,
    }));
  }

  async function fetchData() {
    if (!currentSchool?.id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const [alertsResult, studentsResult] = await Promise.allSettled([
        fetchAlertsFromMainTable(currentSchool.id),
        supabase
          .from("students")
          .select("id, full_name, classroom, section, grade_level")
          .eq("school_id", currentSchool.id),
      ]);

      if (alertsResult.status === "fulfilled") {
        setAlerts(alertsResult.value);
      } else {
        const message =
          alertsResult.reason instanceof Error ? alertsResult.reason.message : "";

        if (message.includes("public.alerts") || message.includes("schema cache")) {
          const fallbackAlerts = await fetchAlertsFromNotifications(currentSchool.id);
          setAlerts(fallbackAlerts);
        } else {
          throw alertsResult.reason;
        }
      }

      if (studentsResult.status === "fulfilled" && !studentsResult.value.error) {
        setStudents((studentsResult.value.data as Student[]) || []);
      } else {
        setStudents([]);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر تحميل مركز التنبيهات.";
      setErrorMsg(message);
      setAlerts([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(alert: AlertItem) {
    if (!currentSchool?.id) return;

    setWorkingId(alert.id);

    const { error } = await supabase
      .from(alert.source_table)
      .update({ is_read: true })
      .eq("id", alert.id)
      .eq("school_id", currentSchool.id);

    setWorkingId(null);

    if (error) {
      showToast("error", error.message);
      return;
    }

    setAlerts((prev) =>
      prev.map((item) =>
        item.id === alert.id ? { ...item, is_read: true } : item,
      ),
    );

    showToast("success", "تم تحديد التنبيه كمقروء.");
  }

  async function markAllAsRead() {
    if (!currentSchool?.id) return;

    const unreadAlerts = alerts.filter((item) => !item.is_read);

    if (unreadAlerts.length === 0) {
      showToast("success", "لا توجد تنبيهات غير مقروءة.");
      return;
    }

    setWorkingId("all");

    const alertIds = unreadAlerts
      .filter((item) => item.source_table === "alerts")
      .map((item) => item.id);

    const notificationIds = unreadAlerts
      .filter((item) => item.source_table === "notifications")
      .map((item) => item.id);

    const [alertsUpdate, notificationsUpdate] = await Promise.all([
      alertIds.length
        ? supabase
            .from("alerts")
            .update({ is_read: true })
            .eq("school_id", currentSchool.id)
            .in("id", alertIds)
        : Promise.resolve({ error: null }),
      notificationIds.length
        ? supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("school_id", currentSchool.id)
            .in("id", notificationIds)
        : Promise.resolve({ error: null }),
    ]);

    setWorkingId(null);

    if (alertsUpdate.error) {
      showToast("error", alertsUpdate.error.message);
      return;
    }

    if (notificationsUpdate.error) {
      showToast("error", notificationsUpdate.error.message);
      return;
    }

    setAlerts((prev) => prev.map((item) => ({ ...item, is_read: true })));
    showToast("success", "تمت قراءة جميع التنبيهات.");
  }

  async function deleteAlert(alert: AlertItem) {
    if (!currentSchool?.id) return;

    const confirmed = window.confirm("هل تريد حذف هذا التنبيه؟");
    if (!confirmed) return;

    setWorkingId(alert.id);

    const { error } = await supabase
      .from(alert.source_table)
      .delete()
      .eq("id", alert.id)
      .eq("school_id", currentSchool.id);

    setWorkingId(null);

    if (error) {
      showToast("error", error.message);
      return;
    }

    setAlerts((prev) => prev.filter((item) => item.id !== alert.id));
    showToast("success", "تم حذف التنبيه.");
  }

  const studentMap = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const filteredAlerts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return alerts.filter((alert) => {
      const student = alert.student_id ? studentMap.get(alert.student_id) : null;

      const text = `
        ${alert.title || ""}
        ${alert.message || ""}
        ${alert.alert_type || ""}
        ${alert.severity || ""}
        ${student?.full_name || ""}
        ${student?.classroom || ""}
        ${student?.section || ""}
        ${student?.grade_level || ""}
      `.toLowerCase();

      const matchesSearch = !keyword || text.includes(keyword);
      const matchesType = typeFilter === "all" || alert.alert_type === typeFilter;
      const matchesRead =
        readFilter === "all" ||
        (readFilter === "read" && alert.is_read) ||
        (readFilter === "unread" && !alert.is_read);
      const matchesSeverity =
        severityFilter === "all" || alert.severity === severityFilter;

      return matchesSearch && matchesType && matchesRead && matchesSeverity;
    });
  }, [alerts, search, typeFilter, readFilter, severityFilter, studentMap]);

  const today = new Date().toISOString().slice(0, 10);

  const total = alerts.length;
  const unread = alerts.filter((item) => !item.is_read).length;
  const high = alerts.filter((item) => item.severity === "high").length;
  const todayCount = alerts.filter((item) =>
    item.created_at ? item.created_at.slice(0, 10) === today : false,
  ).length;

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <PageContainer size="wide">
            <LoadingBox />
          </PageContainer>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AppShell>
        <PageContainer className="space-y-5" size="wide">
          <Breadcrumb />

          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="مركز التنبيهات"
            description="شاشة موحدة لمتابعة الغياب المتكرر، التحويلات الصحية، التنبيهات الأكاديمية، والتنبيهات عالية الخطورة."
            badge="منصة المدرسة الذكية"
            icon={<Bell size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "التنبيهات" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "غير محدد" },
              { label: "إجمالي التنبيهات", value: String(total) },
              { label: "غير مقروءة", value: String(unread) },
              { label: "عالية الخطورة", value: String(high) },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void fetchData()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>

                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  disabled={unread === 0 || workingId === "all"}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                >
                  {workingId === "all" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 size={17} />
                  )}
                  قراءة الكل
                </button>
              </>
            }
          />

          {errorMsg && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
              {errorMsg}
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="إجمالي التنبيهات"
              value={total}
              icon={<Bell size={22} />}
              tone="blue"
            />
            <StatCard
              title="غير مقروءة"
              value={unread}
              icon={<AlertTriangle size={22} />}
              tone="gold"
            />
            <StatCard
              title="عالية الخطورة"
              value={high}
              icon={<ShieldAlert size={22} />}
              tone={high > 0 ? "red" : "green"}
            />
            <StatCard
              title="تنبيهات اليوم"
              value={todayCount}
              icon={<CheckCircle2 size={22} />}
              tone="green"
            />
          </section>

          <SummaryCard
            title="ملخص التنبيهات"
            description="يعرض هذا الملخص حالة التنبيهات الحالية حسب القراءة والخطورة وتاريخ اليوم."
            tone={high > 0 || unread > 0 ? "gold" : "green"}
            items={[
              { label: "الإجمالي", value: total },
              { label: "غير مقروءة", value: unread },
              { label: "عالية الخطورة", value: high },
              { label: "تنبيهات اليوم", value: todayCount },
              { label: "المعروض", value: filteredAlerts.length },
              { label: "المصدر", value: alerts[0]?.source_table === "notifications" ? "notifications" : "alerts" },
            ]}
            footer="إذا لم يكن جدول alerts موجودًا، تعرض الصفحة تلقائيًا التنبيهات العامة من جدول notifications."
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "بحث في التنبيهات...",
              }}
              filters={
                <>
                  <ToolbarSelect value={typeFilter} onChange={setTypeFilter}>
                    {TYPE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect
                    value={severityFilter}
                    onChange={setSeverityFilter}
                  >
                    {SEVERITY_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={readFilter} onChange={setReadFilter}>
                    {READ_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </ToolbarSelect>
                </>
              }
              onRefresh={() => void fetchData()}
            />
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-2xl font-black text-[#15445A]">
              سجل التنبيهات
            </h2>

            {filteredAlerts.length === 0 ? (
              <EmptyBox text="لا توجد تنبيهات مطابقة." />
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => {
                  const student = alert.student_id
                    ? studentMap.get(alert.student_id)
                    : null;

                  return (
                    <div
                      key={`${alert.source_table}-${alert.id}`}
                      className={`rounded-[28px] border p-5 transition hover:-translate-y-0.5 hover:shadow-sm ${
                        alert.is_read
                          ? "border-slate-100 bg-white"
                          : "border-[#C1B489]/40 bg-[#C1B489]/10"
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex gap-3">
                          <AlertIcon
                            type={alert.alert_type}
                            severity={alert.severity}
                          />

                          <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black text-[#15445A]">
                                {alert.title}
                              </h3>

                              <TypeBadge type={alert.alert_type} />
                              <SeverityBadge severity={alert.severity} />

                              {!alert.is_read && (
                                <span className="rounded-full bg-[#C1B489] px-3 py-1 text-xs font-black text-[#15445A]">
                                  جديد
                                </span>
                              )}
                            </div>

                            <p className="text-sm leading-7 text-slate-600">
                              {alert.message || "لا توجد تفاصيل."}
                            </p>

                            <p className="mt-2 text-xs font-bold text-slate-400">
                              الطالب:{" "}
                              {student?.full_name || "غير مرتبط بطالب"} —{" "}
                              {student?.classroom || "—"}
                              {student?.section ? ` - ${student.section}` : ""}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {formatDate(alert.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {alert.student_id && (
                            <Link
                              href={`/counselor/student/${alert.student_id}`}
                              className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                            >
                              <UserRoundSearch size={16} />
                              فتح الطالب
                            </Link>
                          )}

                          {!alert.is_read && (
                            <button
                              type="button"
                              onClick={() => void markAsRead(alert)}
                              disabled={workingId === alert.id}
                              className="inline-flex items-center gap-2 rounded-2xl bg-[#15445A] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                            >
                              {workingId === alert.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 size={16} />
                              )}
                              مقروء
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void deleteAlert(alert)}
                            disabled={workingId === alert.id}
                            className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </PageContainer>
      </AppShell>
    </RoleGuard>
  );
}

function AlertIcon({
  type,
  severity,
}: {
  type: string;
  severity: AlertItem["severity"];
}) {
  if (type === "health") {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        <HeartPulse size={22} />
      </div>
    );
  }

  if (severity === "high") {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700">
        <ShieldAlert size={22} />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
      <AlertTriangle size={22} />
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const label =
    TYPE_OPTIONS.find((item) => item.value === type)?.label || "تنبيه عام";

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
      {label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: AlertItem["severity"] }) {
  const key = severity || "medium";

  const style =
    key === "high"
      ? "bg-red-50 text-red-700"
      : key === "low"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>
      {SEVERITY_LABELS[key] || "متوسطة"}
    </span>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-slate-50 p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-lg ${
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle2 size={18} />
      ) : (
        <XCircle size={18} />
      )}
      {toast.message}
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-3xl border bg-white px-6 py-4 text-slate-600 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-[#15445A]" />
        جاري تحميل مركز التنبيهات...
      </div>
    </div>
  );
}

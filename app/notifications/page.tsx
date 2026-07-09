"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageContainer from "@/components/layout/PageContainer";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  HeartPulse,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  Target,
  Trash2,
  XCircle,
} from "lucide-react";

type Toast = {
  type: "success" | "error";
  message: string;
};

type NotificationRow = {
  id: string;
  school_id: string;
  title: string | null;
  message: string | null;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type AlertRow = {
  id: string;
  school_id: string;
  student_id?: string | null;
  alert_type?: string | null;
  title: string | null;
  message: string | null;
  severity?: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type StudentReferralRow = {
  id: string;
  school_id: string;
  student_id?: string | null;
  student_name?: string | null;
  reason?: string | null;
  teacher_notes?: string | null;
  status?: string | null;
  created_at?: string | null;
  referred_at?: string | null;
};

type StudentInterventionRow = {
  id: string;
  school_id: string;
  student_id?: string | null;
  intervention_type?: string | null;
  title?: string | null;
  notes?: string | null;
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
};

type HealthCaseRow = {
  id: string;
  school_id: string;
  student_id?: string | null;
  case_type?: string | null;
  severity?: string | null;
  diagnosis?: string | null;
  case_status?: string | null;
  created_at?: string | null;
};

type UnifiedNotification = {
  id: string;
  raw_id: string;
  source:
    | "notifications"
    | "alerts"
    | "student_referrals"
    | "student_interventions"
    | "health_cases";
  title: string;
  message: string;
  type: string;
  status: string;
  severity: "low" | "medium" | "high" | "critical";
  is_read: boolean;
  created_at: string | null;
  href: string;
  can_mark_read: boolean;
  can_delete: boolean;
};

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "student_counselor",
  "health_supervisor",
  "activity_leader",
  "teacher",
  "student",
  "parent",
];

const SOURCE_OPTIONS = [
  { value: "all", label: "كل المصادر" },
  { value: "notifications", label: "تنبيهات عامة" },
  { value: "alerts", label: "تنبيهات الطلاب" },
  { value: "student_referrals", label: "الإحالات" },
  { value: "student_interventions", label: "التدخلات" },
  { value: "health_cases", label: "الحالات الصحية" },
];

const READ_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "unread", label: "غير مقروء" },
  { value: "read", label: "مقروء" },
];

const SEVERITY_OPTIONS = [
  { value: "all", label: "كل الأهمية" },
  { value: "critical", label: "حرج" },
  { value: "high", label: "مرتفع" },
  { value: "medium", label: "متوسط" },
  { value: "low", label: "منخفض" },
];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getElapsedLabel(value?: string | null) {
  if (!value) return "—";

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `منذ ${days} يوم`;
  if (hours > 0) return `منذ ${hours} ساعة`;
  if (minutes > 0) return `منذ ${minutes} دقيقة`;

  return "الآن";
}

function isOpenStatus(status?: string | null) {
  const value = String(status || "");

  return ![
    "مغلق",
    "مغلقة",
    "تم الإغلاق",
    "تم التحسن",
    "تم تحقيق الأهداف",
    "عاد للفصل",
    "مغلقة صحيًا",
    "مكتملة",
    "مستقرة",
  ].includes(value);
}

function normalizeSeverity(value?: string | null): UnifiedNotification["severity"] {
  const severity = String(value || "").toLowerCase();

  if (severity === "critical" || severity === "حرج" || severity.includes("حرج")) {
    return "critical";
  }

  if (
    severity === "high" ||
    severity === "مرتفع" ||
    severity === "عالي" ||
    severity.includes("مرتفع")
  ) {
    return "high";
  }

  if (severity === "low" || severity === "منخفض" || severity.includes("منخفض")) {
    return "low";
  }

  return "medium";
}

function getSeverityLabel(severity: UnifiedNotification["severity"]) {
  if (severity === "critical") return "حرج";
  if (severity === "high") return "مرتفع";
  if (severity === "low") return "منخفض";
  return "متوسط";
}

function getSeverityStyle(severity: UnifiedNotification["severity"]) {
  if (severity === "critical") return "bg-red-100 text-red-800";
  if (severity === "high") return "bg-red-50 text-red-700";
  if (severity === "medium") return "bg-[#C1B489]/20 text-[#15445A]";
  return "bg-[#07A869]/10 text-[#07A869]";
}

function getSourceLabel(source: UnifiedNotification["source"]) {
  if (source === "notifications") return "تنبيه عام";
  if (source === "alerts") return "تنبيه طالب";
  if (source === "student_referrals") return "إحالة";
  if (source === "student_interventions") return "تدخل طلابي";
  if (source === "health_cases") return "حالة صحية";
  return "تنبيه";
}

function getSourceIcon(source: UnifiedNotification["source"]) {
  if (source === "notifications") return <Bell size={18} />;
  if (source === "alerts") return <AlertTriangle size={18} />;
  if (source === "student_referrals") return <ClipboardCheck size={18} />;
  if (source === "student_interventions") return <Target size={18} />;
  if (source === "health_cases") return <HeartPulse size={18} />;
  return <Bell size={18} />;
}

function settledRows<T>(result: PromiseSettledResult<any>): T[] {
  if (result.status !== "fulfilled") return [];
  if (result.value?.error) return [];
  return (result.value?.data as T[]) || [];
}

function buildUnifiedNotifications({
  notifications,
  alerts,
  referrals,
  interventions,
  healthCases,
}: {
  notifications: NotificationRow[];
  alerts: AlertRow[];
  referrals: StudentReferralRow[];
  interventions: StudentInterventionRow[];
  healthCases: HealthCaseRow[];
}): UnifiedNotification[] {
  const fromNotifications: UnifiedNotification[] = notifications.map((item) => ({
    id: `notifications-${item.id}`,
    raw_id: item.id,
    source: "notifications",
    title: item.title || "تنبيه عام",
    message: item.message || "لا توجد تفاصيل.",
    type: item.type || "notification",
    status: item.is_read ? "مقروء" : "غير مقروء",
    severity: "medium",
    is_read: Boolean(item.is_read),
    created_at: item.created_at,
    href: "/notifications",
    can_mark_read: true,
    can_delete: true,
  }));

  const fromAlerts: UnifiedNotification[] = alerts.map((item) => ({
    id: `alerts-${item.id}`,
    raw_id: item.id,
    source: "alerts",
    title: item.title || "تنبيه طالب",
    message: item.message || "لا توجد تفاصيل.",
    type: item.alert_type || "alert",
    status: item.is_read ? "مقروء" : "غير مقروء",
    severity: normalizeSeverity(item.severity),
    is_read: Boolean(item.is_read),
    created_at: item.created_at,
    href: item.student_id ? `/students/${item.student_id}/timeline` : "/notifications",
    can_mark_read: true,
    can_delete: true,
  }));

  const fromReferrals: UnifiedNotification[] = referrals
    .filter((item) => isOpenStatus(item.status))
    .map((item) => ({
      id: `student_referrals-${item.id}`,
      raw_id: item.id,
      source: "student_referrals",
      title: `إحالة مفتوحة${item.student_name ? ` - ${item.student_name}` : ""}`,
      message:
        item.reason ||
        item.teacher_notes ||
        "توجد إحالة طالب تحتاج متابعة من الإدارة أو الجهة المختصة.",
      type: "student_referral",
      status: item.status || "مفتوحة",
      severity: "high",
      is_read: false,
      created_at: item.referred_at || item.created_at || null,
      href: "/vice-principal",
      can_mark_read: false,
      can_delete: false,
    }));

  const fromInterventions: UnifiedNotification[] = interventions
    .filter((item) => {
      const priority = String(item.priority || "");
      const statusOpen = isOpenStatus(item.status);
      return statusOpen && ["مرتفع", "حرج", "high", "critical"].includes(priority);
    })
    .map((item) => ({
      id: `student_interventions-${item.id}`,
      raw_id: item.id,
      source: "student_interventions",
      title: item.title || "خطة تدخل عالية الخطورة",
      message:
        item.notes ||
        `تدخل ${item.intervention_type || "طلابي"} بدرجة خطورة ${
          item.priority || "مرتفعة"
        }.`,
      type: "student_intervention",
      status: item.status || "قيد المتابعة",
      severity: normalizeSeverity(item.priority),
      is_read: false,
      created_at: item.created_at || null,
      href: "/student-interventions",
      can_mark_read: false,
      can_delete: false,
    }));

  const fromHealthCases: UnifiedNotification[] = healthCases
    .filter((item) => isOpenStatus(item.case_status))
    .map((item) => ({
      id: `health_cases-${item.id}`,
      raw_id: item.id,
      source: "health_cases",
      title: item.case_type || "حالة صحية نشطة",
      message:
        item.diagnosis ||
        "توجد حالة صحية نشطة تحتاج متابعة من الموجه الصحي.",
      type: "health_case",
      status: item.case_status || "نشطة",
      severity: normalizeSeverity(item.severity),
      is_read: false,
      created_at: item.created_at || null,
      href: "/health",
      can_mark_read: false,
      can_delete: false,
    }));

  return [
    ...fromNotifications,
    ...fromAlerts,
    ...fromReferrals,
    ...fromInterventions,
    ...fromHealthCases,
  ].sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return bTime - aTime;
  });
}

export default function NotificationsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [items, setItems] = useState<UnifiedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (currentSchool?.id) void fetchData();
  }, [currentSchool?.id]);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function fetchData() {
    if (!currentSchool?.id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const [
        notificationsResult,
        alertsResult,
        referralsResult,
        interventionsResult,
        healthCasesResult,
      ] = await Promise.allSettled([
        supabase
          .from("notifications")
          .select("id, school_id, title, message, type, is_read, created_at")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false })
          .limit(200),

        supabase
          .from("alerts")
          .select("id, school_id, student_id, alert_type, title, message, severity, is_read, created_at")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false })
          .limit(200),

        supabase
          .from("student_referrals")
          .select("id, school_id, student_id, student_name, reason, teacher_notes, status, referred_at, created_at")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false })
          .limit(120),

        supabase
          .from("student_interventions")
          .select("id, school_id, student_id, intervention_type, title, notes, status, priority, created_at")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false })
          .limit(120),

        supabase
          .from("health_cases")
          .select("id, school_id, student_id, case_type, severity, diagnosis, case_status, created_at")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false })
          .limit(120),
      ]);

      const notifications = settledRows<NotificationRow>(notificationsResult);
      const alerts = settledRows<AlertRow>(alertsResult);
      const referrals = settledRows<StudentReferralRow>(referralsResult);
      const interventions = settledRows<StudentInterventionRow>(interventionsResult);
      const healthCases = settledRows<HealthCaseRow>(healthCasesResult);

      setItems(
        buildUnifiedNotifications({
          notifications,
          alerts,
          referrals,
          interventions,
          healthCases,
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر تحميل التنبيهات";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      const text = `
        ${item.title}
        ${item.message}
        ${item.type}
        ${item.status}
        ${getSourceLabel(item.source)}
        ${getSeverityLabel(item.severity)}
      `.toLowerCase();

      const matchesSearch = !keyword || text.includes(keyword);
      const matchesSource = sourceFilter === "all" || item.source === sourceFilter;
      const matchesRead =
        readFilter === "all" ||
        (readFilter === "read" && item.is_read) ||
        (readFilter === "unread" && !item.is_read);
      const matchesSeverity =
        severityFilter === "all" || item.severity === severityFilter;

      return matchesSearch && matchesSource && matchesRead && matchesSeverity;
    });
  }, [items, search, sourceFilter, readFilter, severityFilter]);

  const stats = useMemo(
    () => ({
      total: items.length,
      unread: items.filter((item) => !item.is_read).length,
      critical: items.filter((item) => item.severity === "critical").length,
      high: items.filter((item) => item.severity === "high").length,
      actionable: items.filter(
        (item) =>
          item.source === "student_referrals" ||
          item.source === "student_interventions" ||
          item.source === "health_cases",
      ).length,
    }),
    [items],
  );

  async function markAsRead(item: UnifiedNotification) {
    if (!currentSchool?.id || !item.can_mark_read) return;

    setUpdatingId(item.id);

    const { error } = await supabase
      .from(item.source)
      .update({ is_read: true })
      .eq("id", item.raw_id)
      .eq("school_id", currentSchool.id);

    setUpdatingId(null);

    if (error) {
      showToast("error", error.message);
      return;
    }

    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? {
              ...row,
              is_read: true,
              status: "مقروء",
            }
          : row,
      ),
    );

    showToast("success", "تم تحديد التنبيه كمقروء");
  }

  async function markAllAsRead() {
    if (!currentSchool?.id) return;

    setUpdatingId("all");

    const [notificationsResult, alertsResult] = await Promise.all([
      supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("school_id", currentSchool.id)
        .eq("is_read", false),

      supabase
        .from("alerts")
        .update({ is_read: true })
        .eq("school_id", currentSchool.id)
        .eq("is_read", false),
    ]);

    setUpdatingId(null);

    if (notificationsResult.error) {
      showToast("error", notificationsResult.error.message);
      return;
    }

    if (alertsResult.error) {
      showToast("error", alertsResult.error.message);
      return;
    }

    showToast("success", "تم تحديد جميع التنبيهات كمقروءة");
    void fetchData();
  }

  async function deleteItem(item: UnifiedNotification) {
    if (!currentSchool?.id || !item.can_delete) return;

    const confirmed = window.confirm("هل تريد حذف هذا التنبيه؟");
    if (!confirmed) return;

    setUpdatingId(item.id);

    const { error } = await supabase
      .from(item.source)
      .delete()
      .eq("id", item.raw_id)
      .eq("school_id", currentSchool.id);

    setUpdatingId(null);

    if (error) {
      showToast("error", error.message);
      return;
    }

    setItems((prev) => prev.filter((row) => row.id !== item.id));
    showToast("success", "تم حذف التنبيه");
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <LoadingBox />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <PageContainer size="wide" className="space-y-5">
          <Breadcrumb />

          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="التنبيهات"
            description="مركز موحد يجمع التنبيهات العامة، الإحالات المفتوحة، التدخلات عالية الخطورة، والحالات الصحية النشطة في مكان واحد."
            badge="مركز التنبيهات الموحد"
            icon={<Bell size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "التنبيهات" },
            ]}
            meta={[
              { label: "التاريخ", value: getTodayDate() },
              { label: "المدرسة", value: currentSchool?.school_name || "غير محدد" },
              { label: "المعروض", value: filteredItems.length },
              { label: "غير مقروءة", value: stats.unread },
            ]}
            stats={[
              { label: "الإجمالي", value: stats.total, icon: <Bell size={20} />, tone: "blue" },
              { label: "غير مقروءة", value: stats.unread, icon: <EyeIcon />, tone: stats.unread > 0 ? "gold" : "green" },
              { label: "حرجة", value: stats.critical, icon: <ShieldAlert size={20} />, tone: stats.critical > 0 ? "red" : "green" },
              { label: "تحتاج إجراء", value: stats.actionable, icon: <ClipboardCheck size={20} />, tone: stats.actionable > 0 ? "teal" : "green" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void fetchData()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={16} />
                  تحديث
                </button>

                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  disabled={updatingId === "all"}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                >
                  {updatingId === "all" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  تحديد الكل كمقروء
                </button>
              </>
            }
          />

          {errorMsg && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
              {errorMsg}
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ExecutiveCard
              title="حرجة"
              value={stats.critical}
              subtitle="تحتاج انتباهًا فوريًا"
              icon={<ShieldAlert size={22} />}
              tone={stats.critical > 0 ? "red" : "green"}
              progress={stats.total ? Math.round((stats.critical / stats.total) * 100) : 0}
            />

            <ExecutiveCard
              title="مرتفعة"
              value={stats.high}
              subtitle="أولوية متابعة عالية"
              icon={<AlertTriangle size={22} />}
              tone={stats.high > 0 ? "red" : "green"}
              progress={stats.total ? Math.round((stats.high / stats.total) * 100) : 0}
            />

            <ExecutiveCard
              title="تحتاج إجراء"
              value={stats.actionable}
              subtitle="إحالات وتدخلات وحالات صحية"
              icon={<ClipboardCheck size={22} />}
              tone="teal"
              progress={stats.total ? Math.round((stats.actionable / stats.total) * 100) : 0}
            />
          </section>

          <SummaryCard
            title="ملخص التنبيهات"
            description="قراءة تنفيذية سريعة لحالة التنبيهات حسب الأهمية والمصدر وحالة القراءة."
            tone={stats.critical > 0 || stats.high > 0 ? "gold" : "green"}
            items={[
              { label: "الإجمالي", value: stats.total },
              { label: "غير مقروءة", value: stats.unread },
              { label: "حرجة", value: stats.critical },
              { label: "مرتفعة", value: stats.high },
              { label: "تحتاج إجراء", value: stats.actionable },
              { label: "المعروض بعد الفلترة", value: filteredItems.length },
            ]}
            footer="تعرض هذه الصفحة تنبيهات من عدة مصادر دون تعديل الإحالات أو الحالات الصحية نفسها."
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "بحث في التنبيهات...",
              }}
              filters={
                <>
                  <ToolbarSelect value={sourceFilter} onChange={setSourceFilter}>
                    {SOURCE_OPTIONS.map((item) => (
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

                  <ToolbarSelect value={severityFilter} onChange={setSeverityFilter}>
                    {SEVERITY_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </ToolbarSelect>
                </>
              }
              onRefresh={() => void fetchData()}
            />

            <div className="mt-5">
              {filteredItems.length === 0 ? (
                <EmptyBox text="لا توجد تنبيهات مطابقة للفلاتر الحالية." />
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <NotificationCard
                      key={item.id}
                      item={item}
                      updatingId={updatingId}
                      onMarkRead={markAsRead}
                      onDelete={deleteItem}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </PageContainer>
      </AppShell>
    </RoleGuard>
  );
}

function NotificationCard({
  item,
  updatingId,
  onMarkRead,
  onDelete,
}: {
  item: UnifiedNotification;
  updatingId: string | null;
  onMarkRead: (item: UnifiedNotification) => void;
  onDelete: (item: UnifiedNotification) => void;
}) {
  return (
    <div
      className={`rounded-[24px] border p-5 transition hover:-translate-y-0.5 hover:shadow-sm ${
        item.is_read
          ? "border-slate-100 bg-slate-50"
          : "border-[#C1B489]/30 bg-[#C1B489]/10"
      }`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-[#15445A]">
              {getSourceIcon(item.source)}
              {getSourceLabel(item.source)}
            </span>

            <span className={`rounded-full px-3 py-1 text-xs font-black ${getSeverityStyle(item.severity)}`}>
              {getSeverityLabel(item.severity)}
            </span>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
              {item.status}
            </span>

            {!item.is_read && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                جديد
              </span>
            )}
          </div>

          <h3 className="text-xl font-black text-[#15445A]">{item.title}</h3>

          <p className="mt-2 leading-7 text-slate-600">{item.message}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
            <span>{formatDate(item.created_at)}</span>
            <span>•</span>
            <span>{getElapsedLabel(item.created_at)}</span>
            <span>•</span>
            <span>{item.type}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={item.href}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-[#15445A] hover:bg-slate-100"
          >
            <ExternalLink size={15} />
            فتح
          </Link>

          {item.can_mark_read && !item.is_read && (
            <button
              type="button"
              onClick={() => onMarkRead(item)}
              disabled={updatingId === item.id}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#07A869]/10 px-4 py-2 text-sm font-bold text-[#07A869] hover:bg-[#07A869]/15 disabled:opacity-50"
            >
              {updatingId === item.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              مقروء
            </button>
          )}

          {item.can_delete && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              disabled={updatingId === item.id}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 size={15} />
              حذف
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EyeIcon() {
  return <Bell size={20} />;
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  const isSuccess = toast.type === "success";

  return (
    <div
      className={`fixed left-5 top-5 z-50 flex max-w-md items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl print:hidden ${
        isSuccess ? "bg-[#07A869]" : "bg-red-600"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
        {isSuccess ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      </span>
      <span>{toast.message}</span>
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="rounded-[28px] border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="font-bold">جاري تحميل مركز التنبيهات...</p>
      </div>
    </div>
  );
}

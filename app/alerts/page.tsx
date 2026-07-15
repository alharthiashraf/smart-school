"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  FileWarning,
  HeartPulse,
  Loader2,
  RefreshCcw,
  Search,
  ShieldAlert,
  Stethoscope,
  Trash2,
  UserRoundSearch,
  UsersRound,
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

type EventSource =
  | "alerts"
  | "notifications"
  | "student_referrals"
  | "student_interventions"
  | "health_cases";

type Severity = "low" | "medium" | "high" | "critical";
type Priority = "low" | "medium" | "high" | "urgent";

type UnifiedAlertEvent = {
  id: string;
  source: EventSource;
  school_id: string;
  student_id: string | null;

  title: string;
  description: string | null;

  type: string;
  status: string | null;
  priority: Priority | null;
  severity: Severity | null;

  is_read: boolean | null;
  created_at: string | null;
  date_label: string | null;

  source_label: string;
};

type Student = {
  id: string;
  full_name: string;
  classroom?: string | null;
  classroom_name?: string | null;
  section?: string | null;
  grade_level?: string | null;
};

type AlertRow = {
  id: string;
  school_id: string;
  student_id: string | null;
  alert_type: string | null;
  title: string | null;
  message: string | null;
  severity: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type NotificationRow = {
  id: string;
  school_id: string;
  title: string | null;
  body: string | null;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type ReferralRow = {
  id: string;
  school_id: string;
  student_id: string | null;
  referral_type: string | null;
  priority: string | null;
  status: string | null;
  title: string | null;
  description: string | null;
  reason: string | null;
  referral_date: string | null;
  created_at: string | null;
};

type InterventionRow = {
  id: string;
  school_id: string;
  student_id: string | null;
  intervention_type: string | null;
  status: string | null;
  priority: string | null;
  title: string | null;
  description: string | null;
  action_taken: string | null;
  intervention_date: string | null;
  created_at: string | null;
};

type HealthCaseRow = {
  id: string;
  school_id: string;
  student_id: string | null;
  case_type: string | null;
  severity: string | null;
  status: string | null;
  title: string | null;
  symptoms: string | null;
  action_taken: string | null;
  incident_date: string | null;
  created_at: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const SOURCE_OPTIONS = [
  { value: "all", label: "كل المصادر" },
  { value: "alerts", label: "التنبيهات" },
  { value: "notifications", label: "الإشعارات" },
  { value: "student_referrals", label: "الإحالات" },
  { value: "student_interventions", label: "التدخلات" },
  { value: "health_cases", label: "الحالات الصحية" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "كل الحالات" },
  { value: "open", label: "مفتوح" },
  { value: "in_review", label: "قيد المراجعة" },
  { value: "in_progress", label: "قيد المعالجة" },
  { value: "planned", label: "مخطط" },
  { value: "active", label: "نشط" },
  { value: "completed", label: "مكتمل" },
  { value: "resolved", label: "تم الحل" },
  { value: "closed", label: "مغلق" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "كل الأولويات" },
  { value: "urgent", label: "عاجلة" },
  { value: "high", label: "عالية" },
  { value: "medium", label: "متوسطة" },
  { value: "low", label: "منخفضة" },
];

const READ_OPTIONS = [
  { value: "all", label: "كل حالات القراءة" },
  { value: "unread", label: "غير مقروءة" },
  { value: "read", label: "مقروءة" },
];

const SOURCE_LABELS: Record<EventSource, string> = {
  alerts: "تنبيه",
  notifications: "إشعار",
  student_referrals: "إحالة طالب",
  student_interventions: "تدخل طلابي",
  health_cases: "حالة صحية",
};

const STATUS_LABELS: Record<string, string> = {
  open: "مفتوح",
  in_review: "قيد المراجعة",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
  closed: "مغلق",
  cancelled: "ملغي",
  planned: "مخطط",
  active: "نشط",
  completed: "مكتمل",
  failed: "متعثر",
  under_observation: "تحت الملاحظة",
  referred: "محال",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "عاجلة",
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

function normalizeText(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function normalizeSeverity(value?: string | null): Severity {
  const v = normalizeText(value).toLowerCase();

  if (["critical", "urgent", "حرجة", "عاجلة"].includes(v)) return "critical";
  if (["high", "عالية", "مرتفع", "مرتفعة"].includes(v)) return "high";
  if (["low", "منخفض", "منخفضة"].includes(v)) return "low";

  return "medium";
}

function normalizePriority(value?: string | null): Priority {
  const v = normalizeText(value).toLowerCase();

  if (["urgent", "critical", "عاجلة", "عاجل", "حرجة"].includes(v)) return "urgent";
  if (["high", "عالية", "مرتفع", "مرتفعة"].includes(v)) return "high";
  if (["low", "منخفض", "منخفضة"].includes(v)) return "low";

  return "medium";
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

function sortByDateDesc(a: UnifiedAlertEvent, b: UnifiedAlertEvent) {
  return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
}

export default function AlertsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [events, setEvents] = useState<UnifiedAlertEvent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

  const [errorMsg, setErrorMsg] = useState("");
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  const fetchAlerts = useCallback(async (schoolId: string): Promise<UnifiedAlertEvent[]> => {
    const { data, error } = await supabase
      .from("alerts")
      .select("id, school_id, student_id, alert_type, title, message, severity, is_read, created_at")
      .eq("school_id", schoolId);

    if (error) throw error;

    return (data || []).map((item: AlertRow) => ({
      id: item.id,
      source: "alerts",
      school_id: item.school_id,
      student_id: item.student_id,
      title: item.title || "تنبيه",
      description: item.message || null,
      type: item.alert_type || "alert",
      status: item.is_read ? "closed" : "open",
      priority: normalizePriority(item.severity),
      severity: normalizeSeverity(item.severity),
      is_read: item.is_read,
      created_at: item.created_at,
      date_label: item.created_at,
      source_label: SOURCE_LABELS.alerts,
    }));
  }, []);

  const fetchNotifications = useCallback(async (schoolId: string): Promise<UnifiedAlertEvent[]> => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, school_id, title, body, type, is_read, created_at")
      .eq("school_id", schoolId);

    if (error) throw error;

    return (data || []).map((item: NotificationRow) => ({
      id: item.id,
      source: "notifications",
      school_id: item.school_id,
      student_id: null,
      title: item.title || "إشعار عام",
      description: item.body || null,
      type: item.type || "notification",
      status: item.is_read ? "closed" : "open",
      priority: "medium",
      severity: "medium",
      is_read: item.is_read,
      created_at: item.created_at,
      date_label: item.created_at,
      source_label: SOURCE_LABELS.notifications,
    }));
  }, []);

  const fetchReferrals = useCallback(async (schoolId: string): Promise<UnifiedAlertEvent[]> => {
    const { data, error } = await supabase
      .from("student_referrals")
      .select("id, school_id, student_id, referral_type, priority, status, title, description, reason, referral_date, created_at")
      .eq("school_id", schoolId);

    if (error) throw error;

    return (data || []).map((item: ReferralRow) => ({
      id: item.id,
      source: "student_referrals",
      school_id: item.school_id,
      student_id: item.student_id,
      title: item.title || item.reason || "إحالة طالب",
      description: item.description || item.reason || null,
      type: item.referral_type || "referral",
      status: item.status || "open",
      priority: normalizePriority(item.priority),
      severity: normalizeSeverity(item.priority === "urgent" ? "critical" : item.priority),
      is_read: null,
      created_at: item.created_at || item.referral_date,
      date_label: item.referral_date || item.created_at,
      source_label: SOURCE_LABELS.student_referrals,
    }));
  }, []);

  const fetchInterventions = useCallback(async (schoolId: string): Promise<UnifiedAlertEvent[]> => {
    const { data, error } = await supabase
      .from("student_interventions")
      .select("id, school_id, student_id, intervention_type, status, priority, title, description, action_taken, intervention_date, created_at")
      .eq("school_id", schoolId);

    if (error) throw error;

    return (data || []).map((item: InterventionRow) => ({
      id: item.id,
      source: "student_interventions",
      school_id: item.school_id,
      student_id: item.student_id,
      title: item.title || "تدخل طلابي",
      description: item.description || item.action_taken || null,
      type: item.intervention_type || "intervention",
      status: item.status || "planned",
      priority: normalizePriority(item.priority),
      severity: normalizeSeverity(item.priority),
      is_read: null,
      created_at: item.created_at || item.intervention_date,
      date_label: item.intervention_date || item.created_at,
      source_label: SOURCE_LABELS.student_interventions,
    }));
  }, []);

  const fetchHealthCases = useCallback(async (schoolId: string): Promise<UnifiedAlertEvent[]> => {
    const { data, error } = await supabase
      .from("health_cases")
      .select("id, school_id, student_id, case_type, severity, status, title, symptoms, action_taken, incident_date, created_at")
      .eq("school_id", schoolId);

    if (error) throw error;

    return (data || []).map((item: HealthCaseRow) => ({
      id: item.id,
      source: "health_cases",
      school_id: item.school_id,
      student_id: item.student_id,
      title: item.title || "حالة صحية",
      description: item.symptoms || item.action_taken || null,
      type: item.case_type || "health",
      status: item.status || "open",
      priority: normalizePriority(item.severity === "critical" ? "urgent" : item.severity),
      severity: normalizeSeverity(item.severity),
      is_read: null,
      created_at: item.created_at || item.incident_date,
      date_label: item.incident_date || item.created_at,
      source_label: SOURCE_LABELS.health_cases,
    }));
  }, []);

  const fetchData = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const results = await Promise.allSettled([
        fetchAlerts(currentSchool.id),
        fetchNotifications(currentSchool.id),
        fetchReferrals(currentSchool.id),
        fetchInterventions(currentSchool.id),
        fetchHealthCases(currentSchool.id),
        supabase
          .from("students")
          .select("*")
          .eq("school_id", currentSchool.id),
      ]);

      const sourceNames = [
        "التنبيهات",
        "الإشعارات",
        "الإحالات الطلابية",
        "التدخلات الطلابية",
        "الحالات الصحية",
      ];

      const eventResults = results.slice(0, 5) as PromiseSettledResult<
        UnifiedAlertEvent[]
      >[];

      const merged: UnifiedAlertEvent[] = [];
      const failedSources: string[] = [];

      eventResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          merged.push(...result.value);
          return;
        }

        failedSources.push(sourceNames[index] || "مصدر غير معروف");

        if (process.env.NODE_ENV !== "production") {
          console.error(`Alerts Center source failed: ${sourceNames[index]}`, result.reason);
        }
      });

      setSourceErrors(failedSources);

      if (failedSources.length > 0) {
        setErrorMsg(
          `تعذر تحميل بعض المصادر: ${failedSources.join("، ")}. إذا ظهر Permission denied فشغّل أوامر GRANT في Supabase.`,
        );
      } else {
        setErrorMsg("");
      }

      const studentsResult = results[5];

      if (studentsResult.status === "fulfilled" && !studentsResult.value.error) {
        setStudents((studentsResult.value.data as Student[]) || []);
      } else {
        setStudents([]);
      }

      setEvents(merged.sort(sortByDateDesc));
    } catch (error) {
      setSourceErrors([]);
      setErrorMsg(error instanceof Error ? error.message : "تعذر تحميل مركز التنبيهات.");
      setEvents([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [
    currentSchool?.id,
    fetchAlerts,
    fetchNotifications,
    fetchReferrals,
    fetchInterventions,
    fetchHealthCases,
  ]);

  useEffect(() => {
    if (currentSchool?.id) {
      void fetchData();
    }
  }, [currentSchool?.id, fetchData]);

  useEffect(() => {
    if (!currentSchool?.id) return;

    const channel = supabase
      .channel(`alerts-center-${currentSchool.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `school_id=eq.${currentSchool.id}` }, () => void fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `school_id=eq.${currentSchool.id}` }, () => void fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "student_referrals", filter: `school_id=eq.${currentSchool.id}` }, () => void fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "student_interventions", filter: `school_id=eq.${currentSchool.id}` }, () => void fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "health_cases", filter: `school_id=eq.${currentSchool.id}` }, () => void fetchData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentSchool?.id, fetchData]);

  async function markAsRead(event: UnifiedAlertEvent) {
    if (!currentSchool?.id) return;
    if (event.source !== "alerts" && event.source !== "notifications") return;

    setWorkingId(event.id);

    const { error } = await supabase
      .from(event.source)
      .update({ is_read: true })
      .eq("id", event.id)
      .eq("school_id", currentSchool.id);

    setWorkingId(null);

    if (error) {
      showToast("error", error.message);
      return;
    }

    setEvents((prev) =>
      prev.map((item) =>
        item.id === event.id && item.source === event.source
          ? { ...item, is_read: true, status: "closed" }
          : item,
      ),
    );

    showToast("success", "تم تحديد العنصر كمقروء.");
  }

  async function markAllAsRead() {
    if (!currentSchool?.id) return;

    const unread = events.filter(
      (item) =>
        !item.is_read &&
        (item.source === "alerts" || item.source === "notifications"),
    );

    if (unread.length === 0) {
      showToast("success", "لا توجد إشعارات غير مقروءة.");
      return;
    }

    setWorkingId("all");

    const alertIds = unread.filter((item) => item.source === "alerts").map((item) => item.id);
    const notificationIds = unread.filter((item) => item.source === "notifications").map((item) => item.id);

    const [a, n] = await Promise.all([
      alertIds.length
        ? supabase.from("alerts").update({ is_read: true }).eq("school_id", currentSchool.id).in("id", alertIds)
        : Promise.resolve({ error: null }),
      notificationIds.length
        ? supabase.from("notifications").update({ is_read: true }).eq("school_id", currentSchool.id).in("id", notificationIds)
        : Promise.resolve({ error: null }),
    ]);

    setWorkingId(null);

    if (a.error || n.error) {
      showToast("error", a.error?.message || n.error?.message || "تعذر تحديث القراءة.");
      return;
    }

    setEvents((prev) =>
      prev.map((item) =>
        item.source === "alerts" || item.source === "notifications"
          ? { ...item, is_read: true, status: "closed" }
          : item,
      ),
    );

    showToast("success", "تمت قراءة جميع الإشعارات.");
  }

  async function deleteEvent(event: UnifiedAlertEvent) {
    if (!currentSchool?.id) return;

    const allowed = event.source === "alerts" || event.source === "notifications";
    if (!allowed) {
      showToast("error", "الحذف المباشر متاح فقط للتنبيهات والإشعارات.");
      return;
    }

    const confirmed = window.confirm("هل تريد حذف هذا العنصر؟");
    if (!confirmed) return;

    setWorkingId(event.id);

    const { error } = await supabase
      .from(event.source)
      .delete()
      .eq("id", event.id)
      .eq("school_id", currentSchool.id);

    setWorkingId(null);

    if (error) {
      showToast("error", error.message);
      return;
    }

    setEvents((prev) => prev.filter((item) => !(item.id === event.id && item.source === event.source)));
    showToast("success", "تم حذف العنصر.");
  }

  const studentMap = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return events.filter((event) => {
      const student = event.student_id ? studentMap.get(event.student_id) : null;

      const text = `
        ${event.title}
        ${event.description || ""}
        ${event.type}
        ${event.status || ""}
        ${event.priority || ""}
        ${event.severity || ""}
        ${event.source_label}
        ${student?.full_name || ""}
        ${student?.classroom || ""}
        ${student?.classroom_name || ""}
        ${student?.section || ""}
        ${student?.grade_level || ""}
      `.toLowerCase();

      const matchesSearch = !keyword || text.includes(keyword);
      const matchesSource = sourceFilter === "all" || event.source === sourceFilter;
      const matchesStatus = statusFilter === "all" || event.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || event.priority === priorityFilter;
      const matchesRead =
        readFilter === "all" ||
        (readFilter === "read" && event.is_read === true) ||
        (readFilter === "unread" && event.is_read === false);

      return matchesSearch && matchesSource && matchesStatus && matchesPriority && matchesRead;
    });
  }, [events, search, sourceFilter, statusFilter, priorityFilter, readFilter, studentMap]);

  const stats = useMemo(() => {
    return {
      total: events.length,
      alerts: events.filter((e) => e.source === "alerts").length,
      notifications: events.filter((e) => e.source === "notifications").length,
      referralsOpen: events.filter((e) => e.source === "student_referrals" && !["resolved", "closed", "cancelled"].includes(e.status || "")).length,
      interventionsActive: events.filter((e) => e.source === "student_interventions" && ["planned", "active"].includes(e.status || "")).length,
      healthOpen: events.filter((e) => e.source === "health_cases" && !["resolved", "closed"].includes(e.status || "")).length,
      unread: events.filter((e) => e.is_read === false).length,
      critical: events.filter((e) => e.severity === "critical" || e.priority === "urgent").length,
      shown: filteredEvents.length,
    };
  }, [events, filteredEvents.length]);

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
            description="مركز عمليات موحد للتنبيهات، الإشعارات، الإحالات الطلابية، التدخلات، والحالات الصحية."
            badge="Alerts Center Enterprise"
            icon={<Bell size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "مركز التنبيهات" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "غير محدد" },
              { label: "إجمالي الأحداث", value: String(stats.total) },
              { label: "غير مقروءة", value: String(stats.unread) },
              { label: "حرجة", value: String(stats.critical) },
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
                  disabled={stats.unread === 0 || workingId === "all"}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                >
                  {workingId === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={17} />}
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

          {sourceErrors.length > 0 && events.length > 0 && (
            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm font-bold text-amber-800">
              تم عرض البيانات المتاحة، وتعذر تحميل: {sourceErrors.join("، ")}.
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="إجمالي الأحداث" value={stats.total} icon={<Activity size={22} />} tone="blue" />
            <StatCard title="الإحالات المفتوحة" value={stats.referralsOpen} icon={<FileWarning size={22} />} tone={stats.referralsOpen ? "gold" : "green"} />
            <StatCard title="التدخلات النشطة" value={stats.interventionsActive} icon={<UsersRound size={22} />} tone="blue" />
            <StatCard title="الحالات الصحية المفتوحة" value={stats.healthOpen} icon={<HeartPulse size={22} />} tone={stats.healthOpen ? "red" : "green"} />
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="التنبيهات" value={stats.alerts} icon={<AlertTriangle size={22} />} tone="gold" />
            <StatCard title="الإشعارات" value={stats.notifications} icon={<Bell size={22} />} tone="blue" />
            <StatCard title="غير مقروءة" value={stats.unread} icon={<Clock3 size={22} />} tone={stats.unread ? "gold" : "green"} />
            <StatCard title="حرجة أو عاجلة" value={stats.critical} icon={<ShieldAlert size={22} />} tone={stats.critical ? "red" : "green"} />
          </section>

          <SummaryCard
            title="ملخص مركز التنبيهات"
            description="يعرض هذا الملخص قراءة موحدة لجميع مصادر المخاطر والمتابعة داخل المدرسة."
            tone={stats.critical || stats.referralsOpen || stats.healthOpen ? "gold" : "green"}
            items={[
              { label: "الإجمالي", value: stats.total },
              { label: "المعروض", value: stats.shown },
              { label: "الإحالات المفتوحة", value: stats.referralsOpen },
              { label: "التدخلات النشطة", value: stats.interventionsActive },
              { label: "الحالات الصحية", value: stats.healthOpen },
              { label: "غير مقروءة", value: stats.unread },
            ]}
            footer="يتم تحديث المركز تلقائيًا عبر Supabase Realtime عند إضافة أو تعديل أي حدث."
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "بحث في العنوان، الطالب، الحالة، النوع...",
              }}
              filters={
                <>
                  <ToolbarSelect value={sourceFilter} onChange={setSourceFilter}>
                    {SOURCE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={statusFilter} onChange={setStatusFilter}>
                    {STATUS_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={priorityFilter} onChange={setPriorityFilter}>
                    {PRIORITY_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={readFilter} onChange={setReadFilter}>
                    {READ_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </ToolbarSelect>
                </>
              }
              onRefresh={() => void fetchData()}
            />
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#15445A]">Timeline مركز التنبيهات</h2>
                <p className="text-sm font-bold text-slate-500">
                  سجل موحد مرتب حسب أحدث حدث من جميع مصادر المتابعة.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-500">
                <Search size={14} />
                {filteredEvents.length} نتيجة
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <EmptyBox text="لا توجد أحداث مطابقة للفلاتر الحالية." />
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((event) => {
                  const student = event.student_id ? studentMap.get(event.student_id) : null;

                  return (
                    <div
                      key={`${event.source}-${event.id}`}
                      className={`rounded-[28px] border p-5 transition hover:-translate-y-0.5 hover:shadow-sm ${cardTone(event)}`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex gap-3">
                          <EventIcon event={event} />

                          <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black text-[#15445A]">{event.title}</h3>
                              <SourceBadge source={event.source} />
                              <StatusBadge status={event.status} />
                              <PriorityBadge priority={event.priority} />
                              {event.is_read === false && (
                                <span className="rounded-full bg-[#C1B489] px-3 py-1 text-xs font-black text-[#15445A]">
                                  جديد
                                </span>
                              )}
                            </div>

                            <p className="text-sm leading-7 text-slate-600">
                              {event.description || "لا توجد تفاصيل إضافية."}
                            </p>

                            <p className="mt-2 text-xs font-bold text-slate-400">
                              الطالب: {student?.full_name || "غير مرتبط بطالب"} —{" "}
                              {student?.classroom_name || student?.classroom || "—"}
                              {student?.section ? ` - ${student.section}` : ""}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {formatDate(event.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {event.student_id && (
                            <Link
                              href={`/counselor/student/${event.student_id}`}
                              className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                            >
                              <UserRoundSearch size={16} />
                              فتح الطالب
                            </Link>
                          )}

                          {event.is_read === false && (
                            <button
                              type="button"
                              onClick={() => void markAsRead(event)}
                              disabled={workingId === event.id}
                              className="inline-flex items-center gap-2 rounded-2xl bg-[#15445A] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                            >
                              {workingId === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />}
                              مقروء
                            </button>
                          )}

                          {(event.source === "alerts" || event.source === "notifications") && (
                            <button
                              type="button"
                              onClick={() => void deleteEvent(event)}
                              disabled={workingId === event.id}
                              className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                              حذف
                            </button>
                          )}
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

function cardTone(event: UnifiedAlertEvent) {
  if (event.severity === "critical" || event.priority === "urgent") {
    return "border-red-100 bg-red-50/40";
  }

  if (event.is_read === false) {
    return "border-[#C1B489]/40 bg-[#C1B489]/10";
  }

  return "border-slate-100 bg-white";
}

function EventIcon({ event }: { event: UnifiedAlertEvent }) {
  const base = "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl";

  if (event.source === "health_cases") {
    return <div className={`${base} bg-emerald-50 text-emerald-700`}><Stethoscope size={22} /></div>;
  }

  if (event.source === "student_referrals") {
    return <div className={`${base} bg-red-50 text-red-700`}><FileWarning size={22} /></div>;
  }

  if (event.source === "student_interventions") {
    return <div className={`${base} bg-blue-50 text-blue-700`}><UsersRound size={22} /></div>;
  }

  if (event.source === "notifications") {
    return <div className={`${base} bg-violet-50 text-violet-700`}><Bell size={22} /></div>;
  }

  return <div className={`${base} bg-amber-50 text-amber-700`}><AlertTriangle size={22} /></div>;
}

function SourceBadge({ source }: { source: EventSource }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
      {SOURCE_LABELS[source]}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;

  return (
    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) return null;

  const style =
    priority === "urgent"
      ? "bg-red-50 text-red-700"
      : priority === "high"
        ? "bg-orange-50 text-orange-700"
        : priority === "low"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>
      {PRIORITY_LABELS[priority]}
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
      {toast.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
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
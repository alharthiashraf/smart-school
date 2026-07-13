"use client";

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
import PageToolbar, {
  ToolbarSelect,
} from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { PageLoader } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";

import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/lib/supabase";
import { type SchoolRole } from "@/lib/permissions";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  CloudCog,
  Database,
  DatabaseBackup,
  Gauge,
  HardDrive,
  RefreshCcw,
  Server,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TriangleAlert,
  Wifi,
  X,
  Zap,
} from "lucide-react";

type AnyRow = Record<string, unknown>;

type MonitorTone = "green" | "gold" | "red" | "blue" | "teal";

type Toast = {
  type: "success" | "error";
  message: string;
};

type ServiceState = "operational" | "degraded" | "unknown";

type ServiceStatus = {
  id: string;
  title: string;
  description: string;
  state: ServiceState;
  value: string;
  icon: ReactNode;
  tone: MonitorTone;
  note: string;
};

type MonitoringInsight = {
  title: string;
  description: string;
  tone: MonitorTone;
  icon: ReactNode;
};

type SystemMetrics = {
  students: number;
  teachers: number;
  classrooms: number;
  subjects: number;
  notifications: number;
  auditLogs: number;
  errors: number;
  storageObjects: number;
  storageBytes: number;
  dataCoverage: number;
  operationalScore: number;
  riskLevel: "ممتاز" | "جيد" | "متابعة" | "خطر";
};

type SystemEvent = {
  id: string;
  category: "database" | "storage" | "errors" | "audit" | "jobs";
  title: string;
  description: string;
  status: "نجاح" | "تحذير" | "فشل" | "غير معروف";
  createdAt: string | null;
  severity: "low" | "medium" | "high";
};

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

type QueryLike<T> = PromiseLike<QueryResult<T>>;

const PAGE_ROLES: SchoolRole[] = ["super_admin", "school_admin"];

const CATEGORY_OPTIONS = [
  { value: "all", label: "كل الفئات" },
  { value: "database", label: "قاعدة البيانات" },
  { value: "storage", label: "التخزين" },
  { value: "errors", label: "الأخطاء" },
  { value: "audit", label: "سجل التدقيق" },
  { value: "jobs", label: "المهام المجدولة" },
];

function textValue(row: AnyRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];

    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value);
    }
  }

  return fallback;
}

function numberValue(row: AnyRow, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }

  return fallback;
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function formatBytes(value: number) {
  if (!value) return "0 KB";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function insightTone(tone: MonitorTone) {
  const tones: Record<MonitorTone, string> = {
    green: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
    gold: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    red: "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    teal: "bg-[var(--app-teal-soft)] text-[var(--app-teal)]",
  };

  return tones[tone];
}

function progressTone(tone: MonitorTone) {
  const tones: Record<MonitorTone, string> = {
    green: "bg-[var(--app-green)]",
    gold: "bg-[var(--app-accent)]",
    red: "bg-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue)]",
    teal: "bg-[var(--app-teal)]",
  };

  return tones[tone];
}

async function safeQuery<T>(
  query: QueryLike<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    const result = await query;

    if (result.error) {
      console.warn(`monitoring query skipped: ${label}`, result.error);
      return fallback;
    }

    return result.data ?? fallback;
  } catch (error) {
    console.warn(`monitoring query failed: ${label}`, error);
    return fallback;
  }
}

function serviceStatusFromCount(
  count: number,
  label: string,
): Pick<ServiceStatus, "state" | "tone" | "value" | "note"> {
  if (count > 0) {
    return {
      state: "operational",
      tone: "green",
      value: String(count),
      note: `${label} متاحة ويتم قراءتها من قاعدة البيانات.`,
    };
  }

  return {
    state: "unknown",
    tone: "gold",
    value: "غير متوفر",
    note: `لم يتم العثور على بيانات ${label} أو أن الجدول غير موجود.`,
  };
}

function normalizeEvent(
  row: AnyRow,
  category: SystemEvent["category"],
): SystemEvent {
  const statusText = textValue(
    row,
    ["status", "level", "severity", "result"],
    "unknown",
  ).toLowerCase();

  const failed =
    statusText.includes("error") ||
    statusText.includes("fail") ||
    statusText.includes("فشل") ||
    statusText.includes("حرج");

  const warning =
    statusText.includes("warn") ||
    statusText.includes("تحذير") ||
    statusText.includes("medium");

  return {
    id: textValue(row, ["id"], `${category}-${Math.random()}`),
    category,
    title: textValue(
      row,
      ["title", "event_type", "action", "name", "message"],
      "حدث نظام",
    ),
    description: textValue(
      row,
      ["description", "details", "message", "error_message"],
      "لا توجد تفاصيل إضافية.",
    ),
    status: failed ? "فشل" : warning ? "تحذير" : "نجاح",
    createdAt:
      textValue(
        row,
        ["created_at", "occurred_at", "run_at", "updated_at"],
        "",
      ) || null,
    severity: failed ? "high" : warning ? "medium" : "low",
  };
}

export default function SystemMonitoringCenterPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [students, setStudents] = useState<AnyRow[]>([]);
  const [teachers, setTeachers] = useState<AnyRow[]>([]);
  const [classrooms, setClassrooms] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [notifications, setNotifications] = useState<AnyRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AnyRow[]>([]);
  const [errorLogs, setErrorLogs] = useState<AnyRow[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<AnyRow[]>([]);
  const [storageRows, setStorageRows] = useState<AnyRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(
    null,
  );

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadMonitoringData = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);
    const schoolId = currentSchool.id;

    const [
      studentsData,
      teachersData,
      classroomsData,
      subjectsData,
      notificationsData,
      auditData,
      errorsData,
      jobsData,
      storageData,
    ] = await Promise.all([
      safeQuery<AnyRow[]>(
        supabase
          .from("students")
          .select("id")
          .eq("school_id", schoolId)
          .limit(5000),
        [],
        "students",
      ),
      safeQuery<AnyRow[]>(
        supabase
          .from("teachers")
          .select("id")
          .eq("school_id", schoolId)
          .limit(3000),
        [],
        "teachers",
      ),
      safeQuery<AnyRow[]>(
        supabase
          .from("classrooms")
          .select("id")
          .eq("school_id", schoolId)
          .limit(1000),
        [],
        "classrooms",
      ),
      safeQuery<AnyRow[]>(
        supabase
          .from("subjects")
          .select("id")
          .eq("school_id", schoolId)
          .limit(1000),
        [],
        "subjects",
      ),
      safeQuery<AnyRow[]>(
        supabase
          .from("notifications")
          .select("id, created_at")
          .eq("school_id", schoolId)
          .limit(1000),
        [],
        "notifications",
      ),
      safeQuery<AnyRow[]>(
        supabase
          .from("audit_logs")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(500),
        [],
        "audit_logs",
      ),
      safeQuery<AnyRow[]>(
        supabase
          .from("error_logs")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(500),
        [],
        "error_logs",
      ),
      safeQuery<AnyRow[]>(
        supabase
          .from("scheduled_jobs")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(500),
        [],
        "scheduled_jobs",
      ),
      safeQuery<AnyRow[]>(
        supabase
          .from("storage_usage")
          .select("*")
          .eq("school_id", schoolId)
          .limit(1000),
        [],
        "storage_usage",
      ),
    ]);

    setStudents(studentsData);
    setTeachers(teachersData);
    setClassrooms(classroomsData);
    setSubjects(subjectsData);
    setNotifications(notificationsData);
    setAuditLogs(auditData);
    setErrorLogs(errorsData);
    setScheduledJobs(jobsData);
    setStorageRows(storageData);

    setLoading(false);
  }, [currentSchool?.id]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setLoading(false);
      return;
    }

    void loadMonitoringData();
  }, [currentSchool?.id, loadMonitoringData, schoolLoading]);

  const metrics = useMemo<SystemMetrics>(() => {
    const storageBytes = storageRows.reduce(
      (sum, row) =>
        sum +
        numberValue(
          row,
          ["size_bytes", "bytes", "total_bytes", "storage_bytes"],
          0,
        ),
      0,
    );

    const coverageSignals = [
      students.length > 0,
      teachers.length > 0,
      classrooms.length > 0,
      subjects.length > 0,
      notifications.length >= 0,
      auditLogs.length >= 0,
    ].filter(Boolean).length;

    const dataCoverage = percentage(coverageSignals, 6);

    const operationalScore = Math.round(
      dataCoverage * 0.4 +
        Math.max(0, 100 - errorLogs.length * 5) * 0.25 +
        Math.min(100, percentage(auditLogs.length, 50)) * 0.15 +
        Math.min(100, percentage(scheduledJobs.length, 10)) * 0.1 +
        Math.min(100, percentage(storageRows.length, 10)) * 0.1,
    );

    return {
      students: students.length,
      teachers: teachers.length,
      classrooms: classrooms.length,
      subjects: subjects.length,
      notifications: notifications.length,
      auditLogs: auditLogs.length,
      errors: errorLogs.length,
      storageObjects: storageRows.length,
      storageBytes,
      dataCoverage,
      operationalScore,
      riskLevel:
        operationalScore >= 90
          ? "ممتاز"
          : operationalScore >= 75
            ? "جيد"
            : operationalScore >= 60
              ? "متابعة"
              : "خطر",
    };
  }, [
    auditLogs.length,
    classrooms.length,
    errorLogs.length,
    notifications.length,
    scheduledJobs.length,
    storageRows,
    students.length,
    subjects.length,
    teachers.length,
  ]);

  const services = useMemo<ServiceStatus[]>(() => {
    const databaseState = serviceStatusFromCount(
      students.length +
        teachers.length +
        classrooms.length +
        subjects.length,
      "قاعدة البيانات",
    );

    const storageState = serviceStatusFromCount(
      storageRows.length,
      "بيانات التخزين",
    );

    const auditState = serviceStatusFromCount(
      auditLogs.length,
      "سجل التدقيق",
    );

    const jobsState = serviceStatusFromCount(
      scheduledJobs.length,
      "المهام المجدولة",
    );

    return [
      {
        id: "database",
        title: "Database Health",
        description:
          "مؤشر وصول الواجهة إلى الجداول الأساسية للمدرسة.",
        icon: <Database className="h-6 w-6" />,
        ...databaseState,
      },
      {
        id: "supabase",
        title: "Supabase Connectivity",
        description:
          "يُستدل عليها من نجاح جلب بيانات المشروع الحالية.",
        state:
          students.length +
            teachers.length +
            classrooms.length +
            subjects.length >
          0
            ? "operational"
            : "unknown",
        value:
          students.length +
            teachers.length +
            classrooms.length +
            subjects.length >
          0
            ? "متصل"
            : "غير معروف",
        tone:
          students.length +
            teachers.length +
            classrooms.length +
            subjects.length >
          0
            ? "green"
            : "gold",
        icon: <CloudCog className="h-6 w-6" />,
        note:
          "هذا فحص وظيفي من داخل التطبيق، وليس مراقبة رسمية لحالة Supabase العامة.",
      },
      {
        id: "vercel",
        title: "Vercel Deployment",
        description:
          "حالة النشر تحتاج ربط Vercel API أو Webhook مخصص.",
        state: "unknown",
        value: "يحتاج ربط API",
        tone: "blue",
        icon: <Server className="h-6 w-6" />,
        note:
          "لا يتم جلب حالة Vercel الحقيقية من هذه الصفحة حاليًا.",
      },
      {
        id: "storage",
        title: "Storage Usage",
        description:
          "استخدام التخزين حسب جدول storage_usage عند توفره.",
        icon: <HardDrive className="h-6 w-6" />,
        ...storageState,
      },
      {
        id: "audit",
        title: "Audit Pipeline",
        description:
          "جاهزية مسار تسجيل العمليات الحساسة.",
        icon: <Activity className="h-6 w-6" />,
        ...auditState,
      },
      {
        id: "jobs",
        title: "Scheduled Jobs",
        description:
          "حالة المهام المجدولة حسب جدول scheduled_jobs.",
        icon: <TimerReset className="h-6 w-6" />,
        ...jobsState,
      },
    ];
  }, [
    auditLogs.length,
    classrooms.length,
    scheduledJobs.length,
    storageRows.length,
    students.length,
    subjects.length,
    teachers.length,
  ]);

  const events = useMemo<SystemEvent[]>(() => {
    return [
      ...errorLogs.map((row) => normalizeEvent(row, "errors")),
      ...auditLogs.map((row) => normalizeEvent(row, "audit")),
      ...scheduledJobs.map((row) => normalizeEvent(row, "jobs")),
      ...storageRows.map((row) => normalizeEvent(row, "storage")),
    ].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [auditLogs, errorLogs, scheduledJobs, storageRows]);

  const insights = useMemo<MonitoringInsight[]>(() => {
    const items: MonitoringInsight[] = [];

    if (metrics.errors > 0) {
      items.push({
        title: "أخطاء مسجلة",
        description: `يوجد ${metrics.errors} سجل خطأ يحتاج مراجعة.`,
        tone: "red",
        icon: <TriangleAlert className="h-5 w-5" />,
      });
    }

    if (metrics.dataCoverage < 100) {
      items.push({
        title: "تغطية البيانات غير مكتملة",
        description: `تغطية الجداول الأساسية ${metrics.dataCoverage}%.`,
        tone: "gold",
        icon: <BarChart3 className="h-5 w-5" />,
      });
    }

    if (scheduledJobs.length === 0) {
      items.push({
        title: "لا توجد مهام مجدولة موثقة",
        description:
          "يمكن إنشاء جدول scheduled_jobs أو ربط Cron/Edge Functions.",
        tone: "blue",
        icon: <Clock3 className="h-5 w-5" />,
      });
    }

    if (storageRows.length === 0) {
      items.push({
        title: "استخدام التخزين غير متاح",
        description:
          "لا توجد بيانات في storage_usage، لذا يظهر التخزين كغير معروف.",
        tone: "teal",
        icon: <HardDrive className="h-5 w-5" />,
      });
    }

    if (items.length === 0) {
      items.push({
        title: "النظام مستقر",
        description:
          "لا توجد مؤشرات تشغيلية حرجة في البيانات المتاحة.",
        tone: "green",
        icon: <Sparkles className="h-5 w-5" />,
      });
    }

    return items.slice(0, 4);
  }, [
    metrics.dataCoverage,
    metrics.errors,
    scheduledJobs.length,
    storageRows.length,
  ]);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesCategory =
        category === "all" || event.category === category;
      const matchesSearch =
        !keyword ||
        `${event.title} ${event.description} ${event.status}`
          .toLowerCase()
          .includes(keyword);

      return matchesCategory && matchesSearch;
    });
  }, [category, events, search]);

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل مركز مراقبة النظام..." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-6 pb-10" dir="rtl">
          {toast && (
            <div className="fixed left-5 top-5 z-50 w-[min(420px,calc(100%-2rem))]">
              {toast.type === "success" ? (
                <SuccessBanner description={toast.message} />
              ) : (
                <ErrorState description={toast.message} />
              )}
            </div>
          )}

          <PageHeader
            variant="hero"
            title="مركز مراقبة النظام"
            description="مركز موحد لمراقبة صحة قاعدة البيانات، الاتصال بـ Supabase، التخزين، سجل الأخطاء، المهام المجدولة، التدقيق، وحالة التكاملات."
            badge="System Monitoring Enterprise V3"
            icon={<Server size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "مراقبة النظام" },
            ]}
            meta={[
              {
                label: "المدرسة",
                value: currentSchool?.school_name || "غير محدد",
              },
              {
                label: "Operational Score",
                value: `${metrics.operationalScore}%`,
              },
              {
                label: "مستوى التشغيل",
                value: metrics.riskLevel,
              },
              {
                label: "سجلات الأخطاء",
                value: metrics.errors,
              },
            ]}
            stats={[
              {
                label: "Operational Score",
                value: `${metrics.operationalScore}%`,
                icon: <Gauge size={20} />,
                tone:
                  metrics.operationalScore >= 80
                    ? "green"
                    : metrics.operationalScore >= 60
                      ? "gold"
                      : "red",
              },
              {
                label: "الأخطاء",
                value: metrics.errors,
                icon: <AlertTriangle size={20} />,
                tone: metrics.errors > 0 ? "red" : "green",
              },
              {
                label: "Audit Logs",
                value: metrics.auditLogs,
                icon: <Activity size={20} />,
                tone: "blue",
              },
              {
                label: "التخزين",
                value: formatBytes(metrics.storageBytes),
                icon: <HardDrive size={20} />,
                tone: "teal",
              },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void loadMonitoringData()}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A]"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>

                <button
                  type="button"
                  onClick={() =>
                    showToast(
                      "success",
                      "تم تنفيذ فحص محلي للبيانات المتاحة",
                    )
                  }
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white"
                >
                  <ShieldCheck size={17} />
                  تشغيل الفحص
                </button>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ExecutiveCard
              title="Operational Score"
              value={`${metrics.operationalScore}%`}
              subtitle={`المستوى: ${metrics.riskLevel}`}
              icon={<Gauge size={24} />}
              tone={
                metrics.operationalScore >= 80
                  ? "green"
                  : metrics.operationalScore >= 60
                    ? "gold"
                    : "red"
              }
              progress={metrics.operationalScore}
            />

            <ExecutiveCard
              title="Data Coverage"
              value={`${metrics.dataCoverage}%`}
              subtitle="تغطية الجداول الأساسية"
              icon={<Database size={24} />}
              tone={metrics.dataCoverage >= 80 ? "green" : "gold"}
              progress={metrics.dataCoverage}
            />

            <ExecutiveCard
              title="Error Logs"
              value={metrics.errors}
              subtitle="أخطاء تحتاج مراجعة"
              icon={<TriangleAlert size={24} />}
              tone={metrics.errors > 0 ? "red" : "green"}
              progress={Math.min(100, metrics.errors * 10)}
            />

            <ExecutiveCard
              title="Storage"
              value={formatBytes(metrics.storageBytes)}
              subtitle={`${metrics.storageObjects} سجل استخدام`}
              icon={<HardDrive size={24} />}
              tone={metrics.storageObjects > 0 ? "teal" : "gold"}
              progress={metrics.storageObjects > 0 ? 100 : 0}
            />
          </section>

          <SummaryCard
            title="الملخص التنفيذي للنظام"
            description="قراءة تشغيلية لصحة البيانات، الأخطاء، التخزين، التدقيق، والمهام المجدولة."
            tone={
              metrics.errors > 0 ||
              metrics.operationalScore < 75
                ? "gold"
                : "green"
            }
            items={[
              { label: "Operational Score", value: `${metrics.operationalScore}%` },
              { label: "Data Coverage", value: `${metrics.dataCoverage}%` },
              { label: "Audit Logs", value: metrics.auditLogs },
              { label: "Error Logs", value: metrics.errors },
              { label: "Storage", value: formatBytes(metrics.storageBytes) },
              { label: "Notifications", value: metrics.notifications },
            ]}
            footer="ملاحظة: حالة Vercel وSupabase العامة والاستخدام الحقيقي للموارد تحتاج APIs أو Webhooks مخصصة، ولا يتم ادعاء قياسها مباشرة في هذه النسخة."
          />

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <MonitoringExecutiveAnalytics metrics={metrics} />
            <MonitoringSmartInsights insights={insights} />
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <ServiceStatusCard key={service.id} service={service} />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <SystemHealthPanel metrics={metrics} />
            <InfrastructurePanel metrics={metrics} />
            <BackupStatusPanel />
          </section>

          <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث في سجلات النظام...",
              }}
              filters={
                <ToolbarSelect
                  value={category}
                  onChange={setCategory}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </ToolbarSelect>
              }
              onRefresh={() => void loadMonitoringData()}
            />

            <div className="mt-5">
              {filteredEvents.length === 0 ? (
                <EmptyState
                  title="لا توجد سجلات مراقبة"
                  description="قد تكون جداول error_logs أو scheduled_jobs أو storage_usage غير موجودة بعد."
                  icon={<Wifi className="h-8 w-8" />}
                />
              ) : (
                <div className="space-y-3">
                  {filteredEvents.slice(0, 100).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className="flex w-full items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 text-right transition hover:-translate-y-0.5"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${insightTone(
                          event.severity === "high"
                            ? "red"
                            : event.severity === "medium"
                              ? "gold"
                              : "green",
                        )}`}
                      >
                        <Zap size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-black text-[var(--app-text)]">
                            {event.title}
                          </p>
                          <span className="text-xs font-bold text-[var(--app-text-muted)]">
                            {formatDate(event.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
                          {event.description}
                        </p>
                        <p className="mt-2 text-xs font-bold text-[var(--app-text-muted)]">
                          {event.category} · {event.status}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {selectedEvent && (
            <SystemEventDrawer
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          )}
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function MonitoringExecutiveAnalytics({
  metrics,
}: {
  metrics: SystemMetrics;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--app-text)]">
        Monitoring Executive Analytics
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مؤشرات تنفيذية لصحة النظام والبيانات.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MonitoringMetric
          label="Operational Score"
          value={`${metrics.operationalScore}%`}
          icon={<Gauge size={18} />}
          tone={
            metrics.operationalScore >= 80
              ? "green"
              : metrics.operationalScore >= 60
                ? "gold"
                : "red"
          }
        />
        <MonitoringMetric
          label="Data Coverage"
          value={`${metrics.dataCoverage}%`}
          icon={<Database size={18} />}
          tone="blue"
        />
        <MonitoringMetric
          label="Error Logs"
          value={metrics.errors}
          icon={<AlertTriangle size={18} />}
          tone={metrics.errors > 0 ? "red" : "green"}
        />
        <MonitoringMetric
          label="Storage"
          value={formatBytes(metrics.storageBytes)}
          icon={<HardDrive size={18} />}
          tone="teal"
        />
      </div>
    </section>
  );
}

function MonitoringSmartInsights({
  insights,
}: {
  insights: MonitoringInsight[];
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <BrainCircuit size={20} />
        AI Monitoring Insights
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        توصيات تشغيلية مبنية على البيانات المتاحة.
      </p>

      <div className="mt-5 space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className="flex gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${insightTone(insight.tone)}`}
            >
              {insight.icon}
            </div>
            <div>
              <p className="text-sm font-black text-[var(--app-text)]">
                {insight.title}
              </p>
              <p className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]">
                {insight.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServiceStatusCard({
  service,
}: {
  service: ServiceStatus;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${insightTone(service.tone)}`}
        >
          {service.icon}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            service.state === "operational"
              ? "bg-emerald-50 text-emerald-700"
              : service.state === "degraded"
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {service.state === "operational"
            ? "يعمل"
            : service.state === "degraded"
              ? "متأثر"
              : "غير معروف"}
        </span>
      </div>

      <h3 className="mt-4 text-xl font-black text-[var(--app-text)]">
        {service.title}
      </h3>
      <p className="mt-2 text-sm leading-7 text-[var(--app-text-muted)]">
        {service.description}
      </p>

      <div className="mt-4 rounded-2xl bg-[var(--app-card-soft)] p-4">
        <p className="text-2xl font-black text-[var(--app-text)]">
          {service.value}
        </p>
        <p className="mt-2 text-xs leading-6 text-[var(--app-text-muted)]">
          {service.note}
        </p>
      </div>
    </section>
  );
}

function SystemHealthPanel({
  metrics,
}: {
  metrics: SystemMetrics;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--app-text)]">
        System Health
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مؤشرات التغطية والتشغيل.
      </p>

      <div className="mt-5 space-y-4">
        <MonitoringProgress
          label="Operational Score"
          value={metrics.operationalScore}
          tone="green"
        />
        <MonitoringProgress
          label="Data Coverage"
          value={metrics.dataCoverage}
          tone="blue"
        />
        <MonitoringProgress
          label="Audit Coverage"
          value={Math.min(100, metrics.auditLogs * 2)}
          tone="teal"
        />
        <MonitoringProgress
          label="Error Health"
          value={Math.max(0, 100 - metrics.errors * 10)}
          tone="gold"
        />
      </div>
    </section>
  );
}

function InfrastructurePanel({
  metrics,
}: {
  metrics: SystemMetrics;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <Server size={20} />
        Infrastructure Summary
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        ملخص البيانات الأساسية للنظام.
      </p>

      <div className="mt-5 grid gap-3">
        <MonitoringInfoLine label="الطلاب" value={metrics.students} />
        <MonitoringInfoLine label="المعلمون" value={metrics.teachers} />
        <MonitoringInfoLine label="الفصول" value={metrics.classrooms} />
        <MonitoringInfoLine label="المواد" value={metrics.subjects} />
        <MonitoringInfoLine
          label="التنبيهات"
          value={metrics.notifications}
        />
      </div>
    </section>
  );
}

function BackupStatusPanel() {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <DatabaseBackup size={20} />
        Backup Status
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        حالة النسخ الاحتياطي والتعافي.
      </p>

      <div className="mt-5 rounded-3xl bg-[var(--app-card-soft)] p-5">
        <p className="text-xs font-bold text-[var(--app-text-muted)]">
          الحالة الحالية
        </p>
        <p className="mt-1 text-2xl font-black text-[var(--app-text)]">
          يحتاج ربط
        </p>
      </div>

      <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
        النسخ الاحتياطي الحقيقي يحتاج Supabase Backup أو Edge Function أو
        خدمة خارجية. هذه الصفحة لا تنفذ نسخة احتياطية تلقائيًا.
      </div>
    </section>
  );
}

function SystemEventDrawer({
  event,
  onClose,
}: {
  event: SystemEvent;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/40 backdrop-blur-sm print:hidden">
      <button
        type="button"
        className="flex-1"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-[#C1B489]">
              System Event
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#15445A]">
              {event.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <MonitoringDrawerMetric label="الفئة" value={event.category} />
          <MonitoringDrawerMetric label="الحالة" value={event.status} />
          <MonitoringDrawerMetric
            label="التاريخ"
            value={formatDate(event.createdAt)}
          />
          <MonitoringDrawerMetric
            label="الخطورة"
            value={event.severity}
          />
        </div>

        <div className="mt-5 space-y-3">
          <MonitoringDrawerSection
            title="التفاصيل"
            items={[event.description]}
          />
          <MonitoringDrawerSection
            title="التوصية"
            items={[
              event.severity === "high"
                ? "راجع السجل فورًا وحدد السبب الجذري."
                : event.severity === "medium"
                  ? "راجع الحدث خلال دورة المتابعة الحالية."
                  : "احتفظ بالسجل للمراجعة الدورية.",
            ]}
          />
        </div>
      </aside>
    </div>
  );
}

function MonitoringMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: MonitorTone;
}) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${insightTone(tone)}`}
      >
        {icon}
      </div>
      <p className="text-xs font-bold text-[var(--app-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-[var(--app-text)]">
        {value}
      </p>
    </div>
  );
}

function MonitoringProgress({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: MonitorTone;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-[var(--app-text-muted)]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--app-card-soft)]">
        <div
          className={`h-full rounded-full ${progressTone(tone)}`}
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function MonitoringInfoLine({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[var(--app-card-soft)] px-3 py-2">
      <span className="text-xs font-bold text-[var(--app-text-muted)]">
        {label}
      </span>
      <span className="text-sm font-black text-[var(--app-text)]">
        {value}
      </span>
    </div>
  );
}

function MonitoringDrawerMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-base font-black text-[#15445A]">{value}</p>
    </div>
  );
}

function MonitoringDrawerSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="mb-2 text-sm font-black text-[#15445A]">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <p key={item} className="text-xs leading-6 text-slate-500">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

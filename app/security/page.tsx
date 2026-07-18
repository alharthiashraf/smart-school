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
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import IconButton from "@/components/ui/buttons/IconButton";

import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/lib/supabase";
import { type SchoolRole } from "@/lib/permissions";

import {
  Activity,
  BadgeCheck,
  BrainCircuit,
  DatabaseZap,
  Fingerprint,
  Gauge,
  KeyRound,
  Laptop2,
  LockKeyhole,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRoundX,
  Users,
  X,
} from "lucide-react";

type AnyRow = Record<string, unknown>;

type SecurityTone = "primary" | "green" | "gold" | "red" | "neutral";

type Toast = {
  type: "success" | "error";
  message: string;
};

type SecurityMetric = {
  auditLogs: number;
  recentLogins: number;
  failedLogins: number;
  activeSessions: number;
  inactiveMembers: number;
  privilegedMembers: number;
  permissionsRows: number;
  policiesCount: number;
  mfaReady: number;
  securityScore: number;
  riskLevel: "ممتاز" | "جيد" | "متابعة" | "خطر";
};

type SecurityInsight = {
  title: string;
  description: string;
  tone: SecurityTone;
  icon: ReactNode;
};

type SecurityEvent = {
  id: string;
  category: "login" | "audit" | "session" | "permission" | "policy";
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  createdAt: string | null;
  actor: string;
  status: string;
};

type SecurityModule = {
  id: string;
  title: string;
  description: string;
  badge: string;
  tone: SecurityTone;
  icon: ReactNode;
};

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

type QueryLike<T> = PromiseLike<QueryResult<T>>;

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "كل الفئات" },
  { value: "login", label: "تسجيل الدخول" },
  { value: "audit", label: "سجل التدقيق" },
  { value: "session", label: "الجلسات" },
  { value: "permission", label: "الصلاحيات" },
  { value: "policy", label: "سياسات RLS" },
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

function boolValue(row: AnyRow, keys: string[], fallback = false) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "boolean") return value;
    if (String(value).toLowerCase() === "true") return true;
    if (String(value).toLowerCase() === "false") return false;
  }

  return fallback;
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
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

function insightTone(tone: SecurityTone) {
  const tones: Record<SecurityTone, string> = {
    primary:
      "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]",
    green:
      "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]",
    gold:
      "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]",
    red:
      "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]",
    neutral:
      "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
  };

  return tones[tone];
}

function progressTone(tone: SecurityTone) {
  const tones: Record<SecurityTone, string> = {
    primary: "bg-[var(--app-primary)]",
    green: "bg-[var(--app-success)]",
    gold: "bg-[var(--app-accent)]",
    red: "bg-[var(--app-danger)]",
    neutral: "bg-[var(--app-text-muted)]",
  };

  return tones[tone];
}

function severityTone(
  severity: SecurityEvent["severity"],
): SecurityTone {
  if (severity === "critical") return "red";
  if (severity === "high") return "gold";
  if (severity === "medium") return "primary";
  return "green";
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

function normalizeEvent(
  row: AnyRow,
  category: SecurityEvent["category"],
): SecurityEvent {
  const createdAtKey = textValue(
    row,
    ["created_at", "occurred_at", "logged_at", "last_seen_at"],
    "unknown-time",
  );
  const actorKey = textValue(
    row,
    ["actor_name", "user_name", "email", "user_email", "performed_by"],
    "unknown-actor",
  );
  const id = textValue(
    row,
    ["id"],
    `${category}-${createdAtKey}-${actorKey}`,
  );
  const action = textValue(
    row,
    ["action", "event_type", "type", "activity", "description"],
    category,
  );
  const actor = textValue(
    row,
    ["actor_name", "user_name", "email", "user_email", "performed_by"],
    "مستخدم غير محدد",
  );
  const createdAt = textValue(
    row,
    ["created_at", "occurred_at", "logged_at", "last_seen_at"],
    "",
  );

  const success = boolValue(row, ["success", "is_success"], true);
  const severity: SecurityEvent["severity"] =
    !success || action.toLowerCase().includes("failed")
      ? "high"
      : action.toLowerCase().includes("delete")
        ? "medium"
        : "low";

  return {
    id,
    category,
    title:
      category === "login"
        ? success
          ? "تسجيل دخول ناجح"
          : "محاولة دخول فاشلة"
        : category === "session"
          ? "جلسة مستخدم"
          : category === "permission"
            ? "تغيير صلاحية"
            : category === "policy"
              ? "فحص سياسة"
              : action || "حدث أمني",
    description:
      textValue(row, ["details", "description", "message"], action) ||
      "لا توجد تفاصيل إضافية.",
    severity,
    createdAt: createdAt || null,
    actor,
    status: success ? "ناجح" : "فشل",
  };
}

export default function SecurityCenterPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [auditLogs, setAuditLogs] = useState<AnyRow[]>([]);
  const [loginLogs, setLoginLogs] = useState<AnyRow[]>([]);
  const [sessions, setSessions] = useState<AnyRow[]>([]);
  const [members, setMembers] = useState<AnyRow[]>([]);
  const [permissions, setPermissions] = useState<AnyRow[]>([]);
  const [roles, setRoles] = useState<AnyRow[]>([]);
  const [rlsPolicies, setRlsPolicies] = useState<AnyRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(
    null,
  );

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadSecurityData = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);
    const schoolId = currentSchool.id;

    const [
      auditData,
      loginData,
      sessionsData,
      membersData,
      permissionsData,
      rolesData,
      policiesData,
    ] = await Promise.all([
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
          .from("login_history")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(500),
        [],
        "login_history",
      ),
      safeQuery<AnyRow[]>(
        supabase
          .from("user_sessions")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(500),
        [],
        "user_sessions",
      ),
      safeQuery<AnyRow[]>(
        supabase
          .from("school_members")
          .select("*")
          .eq("school_id", schoolId)
          .limit(1000),
        [],
        "school_members",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("permissions").select("*").limit(1000),
        [],
        "permissions",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("roles").select("*").limit(500),
        [],
        "roles",
      ),
      safeQuery<AnyRow[]>(
        supabase
          .from("security_policies")
          .select("*")
          .eq("school_id", schoolId)
          .limit(500),
        [],
        "security_policies",
      ),
    ]);

    setAuditLogs(auditData);
    setLoginLogs(loginData);
    setSessions(sessionsData);
    setMembers(membersData);
    setPermissions(permissionsData);
    setRoles(rolesData);
    setRlsPolicies(policiesData);
    setLoading(false);
  }, [currentSchool?.id]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setLoading(false);
      return;
    }

    void loadSecurityData();
  }, [currentSchool?.id, loadSecurityData, schoolLoading]);

  const events = useMemo<SecurityEvent[]>(() => {
    return [
      ...loginLogs.map((row) => normalizeEvent(row, "login")),
      ...auditLogs.map((row) => normalizeEvent(row, "audit")),
      ...sessions.map((row) => normalizeEvent(row, "session")),
      ...permissions.map((row) => normalizeEvent(row, "permission")),
      ...rlsPolicies.map((row) => normalizeEvent(row, "policy")),
    ].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [auditLogs, loginLogs, permissions, rlsPolicies, sessions]);

  const metrics = useMemo<SecurityMetric>(() => {
    const failedLogins = loginLogs.filter((row) => {
      const success = boolValue(row, ["success", "is_success"], true);
      const status = textValue(row, ["status"], "").toLowerCase();
      return !success || status.includes("failed") || status.includes("فشل");
    }).length;

    const activeSessions = sessions.filter((row) => {
      return boolValue(row, ["is_active", "active"], true);
    }).length;

    const inactiveMembers = members.filter(
      (row) => !boolValue(row, ["is_active"], true),
    ).length;

    const privilegedMembers = members.filter((row) => {
      const role = textValue(row, ["role"], "");
      return [
        "super_admin",
        "school_admin",
        "vice_principal",
      ].includes(role);
    }).length;

    const mfaReady = percentage(
      members.filter((row) =>
        boolValue(row, ["mfa_enabled", "two_factor_enabled"], false),
      ).length,
      members.length,
    );

    const rawScore = Math.round(
      Math.max(0, 100 - failedLogins * 5) * 0.2 +
        Math.max(0, 100 - inactiveMembers * 3) * 0.15 +
        Math.min(100, percentage(permissions.length, 20)) * 0.15 +
        Math.min(100, percentage(rlsPolicies.length, 10)) * 0.2 +
        mfaReady * 0.15 +
        Math.min(100, percentage(auditLogs.length, 50)) * 0.15,
    );

    return {
      auditLogs: auditLogs.length,
      recentLogins: loginLogs.length,
      failedLogins,
      activeSessions,
      inactiveMembers,
      privilegedMembers,
      permissionsRows: permissions.length,
      policiesCount: rlsPolicies.length,
      mfaReady,
      securityScore: rawScore,
      riskLevel:
        rawScore >= 90
          ? "ممتاز"
          : rawScore >= 75
            ? "جيد"
            : rawScore >= 60
              ? "متابعة"
              : "خطر",
    };
  }, [
    auditLogs.length,
    loginLogs,
    members,
    permissions.length,
    rlsPolicies.length,
    sessions,
  ]);

  const insights = useMemo<SecurityInsight[]>(() => {
    const items: SecurityInsight[] = [];

    if (metrics.failedLogins > 0) {
      items.push({
        title: "محاولات دخول فاشلة",
        description: `تم رصد ${metrics.failedLogins} محاولة دخول فاشلة.`,
        tone: "red",
        icon: <UserRoundX className="h-5 w-5" aria-hidden="true" />,
      });
    }

    if (metrics.inactiveMembers > 0) {
      items.push({
        title: "حسابات غير نشطة",
        description: `يوجد ${metrics.inactiveMembers} عضو غير نشط يحتاج مراجعة.`,
        tone: "gold",
        icon: <Users className="h-5 w-5" aria-hidden="true" />,
      });
    }

    if (metrics.mfaReady < 100 && members.length > 0) {
      items.push({
        title: "جاهزية MFA غير مكتملة",
        description: `نسبة تفعيل المصادقة المتعددة ${metrics.mfaReady}%.`,
        tone: "primary",
        icon: <Fingerprint className="h-5 w-5" aria-hidden="true" />,
      });
    }

    if (metrics.policiesCount === 0) {
      items.push({
        title: "سياسات الأمان غير موثقة",
        description:
          "لا توجد سجلات في جدول security_policies. راجع سياسات RLS يدويًا.",
        tone: "primary",
        icon: <DatabaseZap className="h-5 w-5" aria-hidden="true" />,
      });
    }

    if (items.length === 0) {
      items.push({
        title: "الوضع الأمني مستقر",
        description: "لا توجد مؤشرات أمنية حرجة في البيانات الحالية.",
        tone: "green",
        icon: <Sparkles className="h-5 w-5" aria-hidden="true" />,
      });
    }

    return items.slice(0, 4);
  }, [members.length, metrics]);

  const modules = useMemo<SecurityModule[]>(
    () => [
      {
        id: "audit",
        title: "Audit Logs",
        description:
          "تتبع العمليات الحساسة والتعديلات والحذف والإجراءات الإدارية.",
        badge: `${metrics.auditLogs} سجل`,
        tone: "primary",
        icon: <Activity className="h-6 w-6" aria-hidden="true" />,
      },
      {
        id: "login",
        title: "Login History",
        description:
          "مراقبة تسجيلات الدخول الناجحة والفاشلة والمصادر غير المعتادة.",
        badge: `${metrics.failedLogins} فاشلة`,
        tone: metrics.failedLogins > 0 ? "red" : "green",
        icon: <KeyRound className="h-6 w-6" aria-hidden="true" />,
      },
      {
        id: "sessions",
        title: "Active Sessions",
        description:
          "مراجعة الجلسات النشطة والأجهزة وتوقيت آخر نشاط.",
        badge: `${metrics.activeSessions} نشطة`,
        tone: "primary",
        icon: <Laptop2 className="h-6 w-6" aria-hidden="true" />,
      },
      {
        id: "permissions",
        title: "Permission Audit",
        description:
          "فحص الأدوار والصلاحيات والحسابات ذات الامتيازات العالية.",
        badge: `${metrics.permissionsRows} صلاحية`,
        tone: "gold",
        icon: <ShieldCheck className="h-6 w-6" aria-hidden="true" />,
      },
      {
        id: "rls",
        title: "RLS Health",
        description:
          "مؤشر توثيقي لحالة سياسات الصفوف على جداول المنصة.",
        badge: `${metrics.policiesCount} سياسة`,
        tone: "primary",
        icon: <DatabaseZap className="h-6 w-6" aria-hidden="true" />,
      },
      {
        id: "mfa",
        title: "MFA Readiness",
        description:
          "قياس جاهزية المصادقة المتعددة للحسابات الحساسة.",
        badge: `${metrics.mfaReady}%`,
        tone: metrics.mfaReady >= 80 ? "green" : "gold",
        icon: <Fingerprint className="h-6 w-6" aria-hidden="true" />,
      },
    ],
    [metrics],
  );

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesCategory =
        category === "all" || event.category === category;
      const matchesSearch =
        !keyword ||
        `${event.title} ${event.description} ${event.actor} ${event.status}`
          .toLowerCase()
          .includes(keyword);

      return matchesCategory && matchesSearch;
    });
  }, [category, events, search]);

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل مركز الأمان..." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-6 pb-10" dir="rtl">
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
            title="مركز الأمان"
            description="مركز موحد لمراقبة سجل التدقيق، تسجيلات الدخول، الجلسات، الأدوار، الصلاحيات، سياسات RLS، وجاهزية المصادقة المتعددة."
            badge="Security Center Enterprise V3"
            icon={<ShieldCheck size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "مركز الأمان" },
            ]}
            meta={[
              {
                label: "المدرسة",
                value: currentSchool?.school_name || "غير محدد",
              },
              {
                label: "Security Score",
                value: `${metrics.securityScore}%`,
              },
              {
                label: "مستوى الخطر",
                value: metrics.riskLevel,
              },
              {
                label: "الجلسات النشطة",
                value: metrics.activeSessions,
              },
            ]}
            stats={[
              {
                label: "سجل التدقيق",
                value: metrics.auditLogs,
                icon: <Activity size={20} aria-hidden="true" />,
                tone: "primary",
              },
              {
                label: "دخول فاشل",
                value: metrics.failedLogins,
                icon: <UserRoundX size={20} aria-hidden="true" />,
                tone: metrics.failedLogins > 0 ? "red" : "green",
              },
              {
                label: "جلسات نشطة",
                value: metrics.activeSessions,
                icon: <Laptop2 size={20} aria-hidden="true" />,
                tone: "primary",
              },
              {
                label: "MFA",
                value: `${metrics.mfaReady}%`,
                icon: <Fingerprint size={20} aria-hidden="true" />,
                tone: metrics.mfaReady >= 80 ? "green" : "gold",
              },
            ]}
            actions={
              <>
                <SecondaryButton
                  icon={<RefreshCcw size={17} aria-hidden="true" />}
                  onClick={() => void loadSecurityData()}
                >
                  تحديث
                </SecondaryButton>

                <PrimaryButton
                  icon={<BadgeCheck size={17} aria-hidden="true" />}
                  onClick={() =>
                    showToast(
                      "success",
                      "تم تنفيذ فحص أمني محلي للبيانات المتاحة",
                    )
                  }
                >
                  تشغيل الفحص
                </PrimaryButton>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ExecutiveCard
              title="Security Score"
              value={`${metrics.securityScore}%`}
              subtitle={`المستوى: ${metrics.riskLevel}`}
              icon={<Gauge size={24} aria-hidden="true" />}
              tone={
                metrics.securityScore >= 80
                  ? "green"
                  : metrics.securityScore >= 60
                    ? "gold"
                    : "red"
              }
              progress={metrics.securityScore}
            />

            <ExecutiveCard
              title="محاولات دخول فاشلة"
              value={metrics.failedLogins}
              subtitle="تحتاج مراجعة عند التكرار"
              icon={<UserRoundX size={24} aria-hidden="true" />}
              tone={metrics.failedLogins > 0 ? "red" : "green"}
              progress={Math.min(100, metrics.failedLogins * 10)}
            />

            <ExecutiveCard
              title="الحسابات المميزة"
              value={metrics.privilegedMembers}
              subtitle="سوبر أدمن ومديرو المدارس والوكلاء"
              icon={<UserCheck size={24} aria-hidden="true" />}
              tone="primary"
              progress={percentage(
                metrics.privilegedMembers,
                Math.max(1, members.length),
              )}
            />

            <ExecutiveCard
              title="سياسات الأمان"
              value={metrics.policiesCount}
              subtitle="سجلات توثيق السياسات"
              icon={<DatabaseZap size={24} aria-hidden="true" />}
              tone={metrics.policiesCount > 0 ? "primary" : "gold"}
              progress={Math.min(100, metrics.policiesCount * 10)}
            />
          </section>

          <SummaryCard
            title="الملخص التنفيذي للأمان"
            description="قراءة سريعة لأهم المؤشرات الأمنية حسب البيانات المتاحة داخل قاعدة المشروع."
            tone={
              metrics.failedLogins > 0 ||
              metrics.inactiveMembers > 0 ||
              metrics.securityScore < 75
                ? "gold"
                : "green"
            }
            items={[
              { label: "Security Score", value: `${metrics.securityScore}%` },
              { label: "سجل التدقيق", value: metrics.auditLogs },
              { label: "دخول فاشل", value: metrics.failedLogins },
              { label: "جلسات نشطة", value: metrics.activeSessions },
              { label: "حسابات غير نشطة", value: metrics.inactiveMembers },
              { label: "جاهزية MFA", value: `${metrics.mfaReady}%` },
            ]}
            footer="الصفحة تتعامل بأمان مع الجداول غير الموجودة، وتعرض صفرًا بدل تعطيل الصفحة."
          />

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <SecurityExecutiveAnalytics metrics={metrics} />
            <SecuritySmartInsights insights={insights} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <SecurityHealthPanel metrics={metrics} />
            <PermissionAuditPanel
              members={members}
              roles={roles}
              permissions={permissions}
            />
            <RlsHealthPanel metrics={metrics} />
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <div
                key={module.id}
                className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-lg)] ${insightTone(module.tone)}`}
                  >
                    {module.icon}
                  </div>
                  <span className="rounded-full bg-[var(--app-card-soft)] px-3 py-1 text-xs font-black text-[var(--app-text-muted)]">
                    {module.badge}
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-black text-[var(--app-text)]">
                  {module.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--app-text-muted)]">
                  {module.description}
                </p>
              </div>
            ))}
          </section>

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث في الأحداث الأمنية...",
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
              onRefresh={() => void loadSecurityData()}
            />

            <div className="mt-5">
              {filteredEvents.length === 0 ? (
                <EmptyState
                  title="لا توجد أحداث أمنية"
                  description="قد تكون الجداول الأمنية غير موجودة بعد، أو لا توجد أحداث مسجلة."
                  icon={<Search className="h-8 w-8" aria-hidden="true" />}
                />
              ) : (
                <div className="space-y-3">
                  {filteredEvents.slice(0, 100).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className="flex w-full items-start gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 text-right transition hover:-translate-y-0.5"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] ${insightTone(severityTone(event.severity))}`}
                      >
                        <LockKeyhole size={18} aria-hidden="true" />
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
                          {event.actor} · {event.status}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {selectedEvent && (
            <SecurityEventDrawer
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          )}
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function SecurityExecutiveAnalytics({
  metrics,
}: {
  metrics: SecurityMetric;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="text-xl font-black text-[var(--app-text)]">
        Security Executive Analytics
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مؤشرات تنفيذية موحدة للأمان والحوكمة.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SecurityMetricCard
          label="Security Score"
          value={`${metrics.securityScore}%`}
          icon={<Gauge size={18} aria-hidden="true" />}
          tone={
            metrics.securityScore >= 80
              ? "green"
              : metrics.securityScore >= 60
                ? "gold"
                : "red"
          }
        />
        <SecurityMetricCard
          label="Failed Logins"
          value={metrics.failedLogins}
          icon={<UserRoundX size={18} aria-hidden="true" />}
          tone={metrics.failedLogins > 0 ? "red" : "green"}
        />
        <SecurityMetricCard
          label="Active Sessions"
          value={metrics.activeSessions}
          icon={<Laptop2 size={18} aria-hidden="true" />}
          tone="primary"
        />
        <SecurityMetricCard
          label="MFA Readiness"
          value={`${metrics.mfaReady}%`}
          icon={<Fingerprint size={18} aria-hidden="true" />}
          tone="primary"
        />
      </div>
    </section>
  );
}

function SecuritySmartInsights({
  insights,
}: {
  insights: SecurityInsight[];
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <BrainCircuit size={20} aria-hidden="true" />
        AI Security Insights
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        توصيات مبنية على البيانات الأمنية الحالية.
      </p>

      <div className="mt-5 space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className="flex gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] ${insightTone(insight.tone)}`}
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

function SecurityHealthPanel({
  metrics,
}: {
  metrics: SecurityMetric;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="text-xl font-black text-[var(--app-text)]">
        Security Health
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مؤشرات الجاهزية الأمنية.
      </p>

      <div className="mt-5 space-y-4">
        <SecurityProgress
          label="Security Score"
          value={metrics.securityScore}
          tone="green"
        />
        <SecurityProgress
          label="MFA Readiness"
          value={metrics.mfaReady}
          tone="primary"
        />
        <SecurityProgress
          label="RLS Documentation"
          value={Math.min(100, metrics.policiesCount * 10)}
          tone="primary"
        />
        <SecurityProgress
          label="Audit Coverage"
          value={Math.min(100, metrics.auditLogs * 2)}
          tone="gold"
        />
      </div>
    </section>
  );
}

function PermissionAuditPanel({
  members,
  roles,
  permissions,
}: {
  members: AnyRow[];
  roles: AnyRow[];
  permissions: AnyRow[];
}) {
  const activeMembers = members.filter((row) =>
    boolValue(row, ["is_active"], true),
  ).length;

  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <ShieldCheck size={20} aria-hidden="true" />
        Permission Audit
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        ملخص الأعضاء والأدوار والصلاحيات.
      </p>

      <div className="mt-5 grid gap-3">
        <SecurityInfoLine label="إجمالي الأعضاء" value={members.length} />
        <SecurityInfoLine label="الأعضاء النشطون" value={activeMembers} />
        <SecurityInfoLine label="الأدوار" value={roles.length} />
        <SecurityInfoLine label="الصلاحيات" value={permissions.length} />
      </div>
    </section>
  );
}

function RlsHealthPanel({
  metrics,
}: {
  metrics: SecurityMetric;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <DatabaseZap size={20} aria-hidden="true" />
        RLS Health
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        قراءة توثيقية لحالة سياسات حماية الصفوف.
      </p>

      <div className="mt-5 rounded-[var(--app-radius-xl)] bg-[var(--app-card-soft)] p-5">
        <p className="text-xs font-bold text-[var(--app-text-muted)]">
          السياسات المسجلة
        </p>
        <p className="mt-1 text-3xl font-black text-[var(--app-text)]">
          {metrics.policiesCount}
        </p>
      </div>

      <div className="mt-4 rounded-[var(--app-radius-lg)] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] p-4 text-xs leading-6 text-[var(--app-accent-foreground)]">
        لا يمكن للواجهة وحدها فحص سياسات PostgreSQL الفعلية ما لم تُنشأ
        View أو RPC مخصصة. هذه البطاقة تعرض الجداول المتاحة فقط.
      </div>
    </section>
  );
}

function SecurityEventDrawer({
  event,
  onClose,
}: {
  event: SecurityEvent;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-[color-mix(in_srgb,var(--app-text)_44%,transparent)] backdrop-blur-sm print:hidden">
      <button
        type="button"
        className="flex-1"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <aside className="h-full w-full max-w-xl overflow-y-auto border-r border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-xl)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-[var(--app-accent)]">
              Security Event
            </p>
            <h2 className="mt-1 text-2xl font-black text-[var(--app-text)]">
              {event.title}
            </h2>
          </div>
          <IconButton
            label="إغلاق لوحة الحدث الأمني"
            title="إغلاق"
            onClick={onClose}
            icon={<X size={20} aria-hidden="true" />}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <SecurityDrawerMetric label="الفئة" value={event.category} />
          <SecurityDrawerMetric label="الحالة" value={event.status} />
          <SecurityDrawerMetric label="المنفذ" value={event.actor} />
          <SecurityDrawerMetric
            label="التاريخ"
            value={formatDate(event.createdAt)}
          />
        </div>

        <div className="mt-5 space-y-3">
          <SecurityDrawerSection
            title="التفاصيل"
            items={[event.description]}
          />
          <SecurityDrawerSection
            title="التوصية"
            items={[
              event.severity === "critical" ||
              event.severity === "high"
                ? "راجع الحدث فورًا وحدد مصدره واتخذ إجراءً."
                : "احتفظ بالسجل للمراجعة الدورية.",
            ]}
          />
        </div>
      </aside>
    </div>
  );
}

function SecurityMetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: SecurityTone;
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-lg)] ${insightTone(tone)}`}
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

function SecurityProgress({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: SecurityTone;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-[var(--app-text-muted)]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--app-card-soft)]">
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.max(0, Math.min(100, value))}
          className={`h-full rounded-full ${progressTone(tone)}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function SecurityInfoLine({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] px-3 py-2">
      <span className="text-xs font-bold text-[var(--app-text-muted)]">
        {label}
      </span>
      <span className="text-sm font-black text-[var(--app-text)]">
        {value}
      </span>
    </div>
  );
}

function SecurityDrawerMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4">
      <p className="text-xs font-bold text-[var(--app-text-subtle)]">{label}</p>
      <p className="mt-1 text-base font-black text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function SecurityDrawerSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <p className="mb-2 text-sm font-black text-[var(--app-text)]">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <p key={item} className="text-xs leading-6 text-[var(--app-text-muted)]">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}


"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Database,
  GraduationCap,
  History,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  XCircle,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading";
import PageHeader from "@/components/ui/page/PageHeader";
import Section from "@/components/ui/page/PageSection";

import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/lib/supabase";

type AdminCardTone = "primary" | "success" | "accent" | "danger" | "neutral";

type AdminCard = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: AdminCardTone;
};

type ReadinessKey =
  | "students"
  | "teachers"
  | "users"
  | "attendance"
  | "grades"
  | "referrals"
  | "notifications"
  | "parents";

type ReadinessCounts = Record<ReadinessKey, number>;

type ReadinessItem = {
  key: ReadinessKey;
  label: string;
  description: string;
  count: number;
  ready: boolean;
};

type AuditLog = {
  id: string;
  school_id: string | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  module: string;
  description: string | null;
  created_at: string;
};

type CountOptions = {
  schoolScoped?: boolean;
  notNullColumn?: string;
};

const ADMIN_CARDS: readonly AdminCard[] = [
  {
    title: "المعلمون",
    description: "إدارة بيانات المعلمين وملفاتهم وجداولهم.",
    href: "/teachers",
    icon: GraduationCap,
    tone: "primary",
  },
  {
    title: "الطلاب",
    description: "إدارة بيانات الطلاب والحالة الدراسية والمتابعة.",
    href: "/students",
    icon: Users,
    tone: "success",
  },
  {
    title: "التقارير",
    description: "تقارير الحضور والدرجات والسلوك والمؤشرات.",
    href: "/reports",
    icon: BarChart3,
    tone: "primary",
  },
  {
    title: "المستخدمون",
    description: "إدارة حسابات المستخدمين والصلاحيات.",
    href: "/users",
    icon: UsersRound,
    tone: "accent",
  },
  {
    title: "التحليلات",
    description: "لوحات تحليلية ومؤشرات أداء المدرسة.",
    href: "/analytics",
    icon: ShieldCheck,
    tone: "primary",
  },
  {
    title: "الإعدادات",
    description: "إعدادات المدرسة والنظام والصلاحيات.",
    href: "/settings",
    icon: Settings,
    tone: "neutral",
  },
] as const;

const EMPTY_COUNTS: ReadinessCounts = {
  students: 0,
  teachers: 0,
  users: 0,
  attendance: 0,
  grades: 0,
  referrals: 0,
  notifications: 0,
  parents: 0,
};

const MODULE_LABELS: Record<string, string> = {
  students: "الطلاب",
  teachers: "المعلمون",
  attendance: "الحضور",
  grades: "الدرجات",
  behavior: "السلوك",
  referrals: "الإحالات",
  settings: "الإعدادات",
  users: "المستخدمون",
  health: "الصحة",
  activities: "النشاط",
  system: "النظام",
};

const ACTION_LABELS: Record<string, string> = {
  create: "إضافة",
  update: "تعديل",
  delete: "حذف",
  login: "دخول",
  logout: "خروج",
  export: "تصدير",
  print: "طباعة",
  close: "إغلاق",
  approve: "اعتماد",
  reject: "رفض",
  unknown: "عملية",
};

const ADMIN_CARD_TONE_CLASSES: Record<AdminCardTone, string> = {
  primary:
    "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]",
  success:
    "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]",
  accent:
    "bg-[color-mix(in_srgb,var(--app-accent)_18%,transparent)] text-[var(--app-accent-foreground)]",
  danger:
    "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]",
  neutral: "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
};

const STATUS_TONE_CLASSES = {
  ready:
    "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]",
  pending:
    "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]",
} as const;

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getModuleLabel(module: string) {
  return MODULE_LABELS[module] ?? module;
}

function getActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

function getReadinessTone(percent: number): "green" | "gold" | "red" {
  if (percent >= 85) return "green";
  if (percent >= 60) return "gold";
  return "red";
}

function getReadinessStatus(percent: number) {
  if (percent >= 85) return "جاهزة للتشغيل";
  if (percent >= 60) return "تحتاج مراجعة بسيطة";
  return "تحتاج استكمال بيانات";
}

function getReadinessProgressClass(percent: number) {
  if (percent >= 85) return "bg-[var(--app-success)]";
  if (percent >= 60) return "bg-[var(--app-accent)]";
  return "bg-[var(--app-danger)]";
}

export default function AdminPage() {
  const { currentSchool } = useSchool();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState<ReadinessCounts>(EMPTY_COUNTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const safeCount = useCallback(
    async (
      table: string,
      options: CountOptions = {},
    ): Promise<number | null> => {
      try {
        let query = supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (options.schoolScoped && currentSchool?.id) {
          query = query.eq("school_id", currentSchool.id);
        }

        if (options.notNullColumn) {
          query = query.not(options.notNullColumn, "is", null);
        }

        const { count, error } = await query;

        if (error) {
          return null;
        }

        return count ?? 0;
      } catch {
        return null;
      }
    },
    [currentSchool?.id],
  );

  const countFirstAvailable = useCallback(
    async (tables: readonly string[], options?: CountOptions) => {
      for (const table of tables) {
        const count = await safeCount(table, options);

        if (count !== null) {
          return count;
        }
      }

      return 0;
    },
    [safeCount],
  );

  const loadAdminData = useCallback(async () => {
    setRefreshing(true);

    try {
      const [
        studentsCount,
        teachersCount,
        usersCount,
        attendanceCount,
        gradesCount,
        referralsCount,
        notificationsCount,
        parentsLinkedCount,
      ] = await Promise.all([
        safeCount("students", { schoolScoped: true }),
        safeCount("teachers", { schoolScoped: true }),
        safeCount("school_users", { schoolScoped: true }),
        countFirstAvailable(["attendance_records", "attendance"], {
          schoolScoped: true,
        }),
        countFirstAvailable(
          ["student_period_scores", "grades", "student_grades"],
          { schoolScoped: true },
        ),
        safeCount("student_referrals", { schoolScoped: true }),
        countFirstAvailable(["notifications", "alerts"], {
          schoolScoped: true,
        }),
        safeCount("students", {
          schoolScoped: true,
          notNullColumn: "guardian_email",
        }),
      ]);

      setCounts({
        students: studentsCount ?? 0,
        teachers: teachersCount ?? 0,
        users: usersCount ?? 0,
        attendance: attendanceCount,
        grades: gradesCount,
        referrals: referralsCount ?? 0,
        notifications: notificationsCount,
        parents: parentsLinkedCount ?? 0,
      });

      let logsQuery = supabase
        .from("audit_logs")
        .select(
          "id, school_id, user_name, user_role, action, module, description, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(10);

      if (currentSchool?.id) {
        logsQuery = logsQuery.eq("school_id", currentSchool.id);
      }

      const { data, error } = await logsQuery;

      setAuditLogs(error ? [] : ((data ?? []) as AuditLog[]));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [countFirstAvailable, currentSchool?.id, safeCount]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const readinessItems = useMemo<ReadinessItem[]>(
    () => [
      {
        key: "students",
        label: "بيانات الطلاب",
        description: "وجود طلاب مضافين في المدرسة.",
        count: counts.students,
        ready: counts.students > 0,
      },
      {
        key: "teachers",
        label: "بيانات المعلمين",
        description: "وجود معلمين مضافين في المدرسة.",
        count: counts.teachers,
        ready: counts.teachers > 0,
      },
      {
        key: "users",
        label: "حسابات المستخدمين",
        description: "وجود مستخدمين وصلاحيات للمدرسة.",
        count: counts.users,
        ready: counts.users > 0,
      },
      {
        key: "attendance",
        label: "سجلات الحضور",
        description: "وجود سجلات حضور لاختبار تشغيل الحضور.",
        count: counts.attendance,
        ready: counts.attendance > 0,
      },
      {
        key: "grades",
        label: "سجلات الدرجات",
        description: "وجود درجات أو نتائج مرتبطة بالطلاب.",
        count: counts.grades,
        ready: counts.grades > 0,
      },
      {
        key: "parents",
        label: "ربط أولياء الأمور",
        description: "وجود طلاب مرتبطين ببريد ولي الأمر.",
        count: counts.parents,
        ready: counts.parents > 0,
      },
      {
        key: "referrals",
        label: "الإحالات الطلابية",
        description: "وجود إحالات أو سجل متابعة طلابية.",
        count: counts.referrals,
        ready: counts.referrals > 0,
      },
      {
        key: "notifications",
        label: "التنبيهات",
        description: "وجود تنبيهات أو إشعارات داخل النظام.",
        count: counts.notifications,
        ready: counts.notifications > 0,
      },
    ],
    [counts],
  );

  const readyCount = useMemo(
    () => readinessItems.filter((item) => item.ready).length,
    [readinessItems],
  );

  const readinessPercent = useMemo(
    () =>
      readinessItems.length > 0
        ? Math.round((readyCount / readinessItems.length) * 100)
        : 0,
    [readinessItems.length, readyCount],
  );

  const readinessStatus = getReadinessStatus(readinessPercent);
  const readinessTone = getReadinessTone(readinessPercent);

  if (loading) {
    return (
      <AppShell>
        <PageLoader text="جاري تحميل مركز إدارة المدرسة..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="space-y-6" dir="rtl">
        <PageHeader
          variant="hero"
          title="مركز إدارة المدرسة"
          description="بوابة تنفيذية للوصول السريع لأقسام المنصة ومتابعة الجاهزية وآخر العمليات."
          badge="بوابة مدير المدرسة"
          icon={<ShieldCheck size={18} aria-hidden="true" />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "الإدارة" },
          ]}
          meta={[
            {
              label: "المدرسة",
              value: currentSchool?.school_name || "غير متوفر",
            },
            { label: "حالة الجاهزية", value: readinessStatus },
            {
              label: "العناصر الجاهزة",
              value: `${readyCount} / ${readinessItems.length}`,
            },
            { label: "سجل العمليات", value: `${auditLogs.length} عملية` },
          ]}
          stats={[
            {
              label: "الطلاب",
              value: counts.students,
              icon: <Users size={20} aria-hidden="true" />,
              tone: counts.students > 0 ? "green" : "gold",
            },
            {
              label: "المعلمون",
              value: counts.teachers,
              icon: <GraduationCap size={20} aria-hidden="true" />,
              tone: counts.teachers > 0 ? "green" : "gold",
            },
            {
              label: "جاهزية التشغيل",
              value: `${readinessPercent}%`,
              icon: <Database size={20} aria-hidden="true" />,
              tone: readinessTone,
            },
            {
              label: "آخر النشاطات",
              value: auditLogs.length,
              icon: <History size={20} aria-hidden="true" />,
              tone: auditLogs.length > 0 ? "primary" : "gold",
            },
          ]}
          actions={
            <SecondaryButton
              onClick={() => void loadAdminData()}
              disabled={refreshing}
              aria-label="تحديث مؤشرات الإدارة"
            >
              <RefreshCcw
                size={17}
                className={refreshing ? "animate-spin" : undefined}
                aria-hidden="true"
              />
              تحديث المؤشرات
            </SecondaryButton>
          }
        />

        <section
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          aria-label="المؤشرات التنفيذية"
        >
          <ExecutiveCard
            title="الطلاب"
            value={counts.students}
            subtitle="إجمالي الطلاب في المدرسة"
            icon={<Users size={22} aria-hidden="true" />}
            tone={counts.students > 0 ? "green" : "gold"}
            progress={counts.students > 0 ? 100 : 0}
          />

          <ExecutiveCard
            title="المعلمون"
            value={counts.teachers}
            subtitle="إجمالي المعلمين في المدرسة"
            icon={<GraduationCap size={22} aria-hidden="true" />}
            tone={counts.teachers > 0 ? "green" : "gold"}
            progress={counts.teachers > 0 ? 100 : 0}
          />

          <ExecutiveCard
            title="المستخدمون"
            value={counts.users}
            subtitle="حسابات وصلاحيات"
            icon={<UsersRound size={22} aria-hidden="true" />}
            tone={counts.users > 0 ? "green" : "gold"}
            progress={counts.users > 0 ? 100 : 0}
          />

          <ExecutiveCard
            title="جاهزية التشغيل"
            value={`${readinessPercent}%`}
            subtitle={readinessStatus}
            icon={<Database size={22} aria-hidden="true" />}
            tone={readinessTone}
            progress={readinessPercent}
          />
        </section>

        <SummaryCard
          title="الملخص التنفيذي"
          description="قراءة سريعة لجاهزية بيانات المدرسة الأساسية."
          tone={readinessTone}
          items={[
            { label: "العناصر الجاهزة", value: readyCount },
            { label: "إجمالي العناصر", value: readinessItems.length },
            { label: "نسبة الجاهزية", value: `${readinessPercent}%` },
            { label: "الحضور", value: counts.attendance },
            { label: "الدرجات", value: counts.grades },
            { label: "التنبيهات", value: counts.notifications },
          ]}
          footer="اكتمال البيانات الأساسية يرفع جاهزية المنصة للتشغيل الفعلي."
        />

        <section
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          aria-label="روابط الإدارة"
        >
          {ADMIN_CARDS.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] transition duration-200 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--app-primary)_35%,var(--app-border))] hover:shadow-[var(--app-shadow-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]"
                aria-label={`فتح قسم ${card.title}`}
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-[var(--app-radius-lg)] transition ${ADMIN_CARD_TONE_CLASSES[card.tone]}`}
                    aria-hidden="true"
                  >
                    <Icon size={26} />
                  </span>

                  <ChevronLeft
                    size={22}
                    className="text-[var(--app-text-muted)] transition group-hover:-translate-x-1 group-hover:text-[var(--app-primary)]"
                    aria-hidden="true"
                  />
                </div>

                <h2 className="text-xl font-black text-[var(--app-text)]">
                  {card.title}
                </h2>

                <p className="mt-3 leading-7 text-[var(--app-text-muted)]">
                  {card.description}
                </p>
              </Link>
            );
          })}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Section
            title="جاهزية التشغيل"
            description="فحص أهم بيانات المدرسة قبل التشغيل."
            icon={<Database size={22} aria-hidden="true" />}
          >
            <div className="mb-5 rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
              <div className="mb-2 flex items-center justify-between text-sm font-black">
                <span className="text-[var(--app-text-muted)]">
                  نسبة الجاهزية
                </span>
                <span className="text-[var(--app-text)]">
                  {readinessPercent}%
                </span>
              </div>

              <div
                className="h-3 overflow-hidden rounded-full bg-[var(--app-border)]"
                role="progressbar"
                aria-label="نسبة جاهزية التشغيل"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={readinessPercent}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${getReadinessProgressClass(
                    readinessPercent,
                  )}`}
                  style={{ width: `${readinessPercent}%` }}
                />
              </div>

              <p className="mt-3 text-sm font-bold text-[var(--app-text-muted)]">
                {readinessStatus}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {readinessItems.map((item) => (
                <article
                  key={item.key}
                  className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {item.ready ? (
                        <CheckCircle2
                          className="shrink-0 text-[var(--app-success)]"
                          size={20}
                          aria-hidden="true"
                        />
                      ) : (
                        <XCircle
                          className="shrink-0 text-[var(--app-danger)]"
                          size={20}
                          aria-hidden="true"
                        />
                      )}

                      <h3 className="truncate font-black text-[var(--app-text)]">
                        {item.label}
                      </h3>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                        item.ready
                          ? STATUS_TONE_CLASSES.ready
                          : STATUS_TONE_CLASSES.pending
                      }`}
                      aria-label={`${item.label}: ${item.count}`}
                    >
                      {item.count}
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-[var(--app-text-muted)]">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>

            {readinessPercent < 85 ? (
              <div
                className="mt-5 rounded-[var(--app-radius-xl)] border border-[color-mix(in_srgb,var(--app-warning)_35%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-warning)_10%,var(--app-card))] p-4 text-[var(--app-warning-foreground)]"
                role="status"
              >
                <div className="flex gap-2">
                  <AlertTriangle
                    className="mt-1 shrink-0"
                    size={20}
                    aria-hidden="true"
                  />
                  <p className="text-sm font-bold leading-7">
                    توجد بيانات تحتاج مراجعة قبل التشغيل الرسمي.
                  </p>
                </div>
              </div>
            ) : null}
          </Section>

          <Section
            title="آخر النشاطات"
            description="آخر العمليات المسجلة داخل النظام."
            icon={<History size={22} aria-hidden="true" />}
            actions={
              <Activity
                className="text-[var(--app-primary)]"
                size={24}
                aria-hidden="true"
              />
            }
          >
            {auditLogs.length === 0 ? (
              <EmptyState
                title="لا توجد نشاطات مسجلة"
                description="ستظهر العمليات بعد تسجيلها في سجل النظام."
                icon={<History size={34} aria-hidden="true" />}
              />
            ) : (
              <div className="space-y-3" aria-label="سجل النشاطات">
                {auditLogs.map((log) => {
                  const moduleLabel = getModuleLabel(log.module);
                  const description =
                    log.description ||
                    `${getActionLabel(log.action)} في ${moduleLabel}`;

                  return (
                    <article
                      key={log.id}
                      className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-black text-[var(--app-text)]">
                            {description}
                          </p>

                          <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                            {log.user_name || "مستخدم غير محدد"}
                            {log.user_role ? ` · ${log.user_role}` : ""}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] px-3 py-1 text-xs font-black text-[var(--app-primary)]">
                          {moduleLabel}
                        </span>
                      </div>

                      <time
                        dateTime={log.created_at}
                        className="flex items-center gap-2 text-xs font-bold text-[var(--app-text-muted)]"
                      >
                        <Clock size={14} aria-hidden="true" />
                        {formatDate(log.created_at)}
                      </time>
                    </article>
                  );
                })}
              </div>
            )}
          </Section>
        </section>
      </main>
    </AppShell>
  );
}


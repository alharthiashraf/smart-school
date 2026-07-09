"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import Section from "@/components/ui/page/PageSection";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading";

import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

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

type AdminCard = {
  title: string;
  description: string;
  href: string;
  icon: typeof GraduationCap;
  tone: "blue" | "green" | "gold" | "teal" | "red" | "slate";
};

const cards: AdminCard[] = [
  {
    title: "المعلمون",
    description: "إدارة بيانات المعلمين وملفاتهم وجداولهم.",
    href: "/teachers",
    icon: GraduationCap,
    tone: "blue",
  },
  {
    title: "الطلاب",
    description: "إدارة بيانات الطلاب والحالة الدراسية والمتابعة.",
    href: "/students",
    icon: Users,
    tone: "green",
  },
  {
    title: "التقارير",
    description: "تقارير الحضور، الدرجات، السلوك والمؤشرات.",
    href: "/reports",
    icon: BarChart3,
    tone: "teal",
  },
  {
    title: "المستخدمون",
    description: "إدارة حسابات المستخدمين والصلاحيات.",
    href: "/users",
    icon: UsersRound,
    tone: "gold",
  },
  {
    title: "التحليلات",
    description: "لوحات تحليلية ومؤشرات أداء المدرسة.",
    href: "/analytics",
    icon: ShieldCheck,
    tone: "teal",
  },
  {
    title: "الإعدادات",
    description: "إعدادات المدرسة والنظام والصلاحيات.",
    href: "/settings",
    icon: Settings,
    tone: "slate",
  },
];

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

const emptyCounts: ReadinessCounts = {
  students: 0,
  teachers: 0,
  users: 0,
  attendance: 0,
  grades: 0,
  referrals: 0,
  notifications: 0,
  parents: 0,
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function moduleLabel(module: string) {
  const labels: Record<string, string> = {
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

  return labels[module] ?? module;
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
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

  return labels[action] ?? action;
}

function cardToneClass(tone: AdminCard["tone"]) {
  const tones: Record<AdminCard["tone"], string> = {
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    green: "bg-[#07A869]/10 text-[#07A869]",
    gold: "bg-[#C1B489]/20 text-[#15445A]",
    teal: "bg-[#0DA9A6]/10 text-[#0DA9A6]",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return tones[tone];
}

export default function AdminPage() {
  const { currentSchool } = useSchool();

  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<ReadinessCounts>(emptyCounts);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const safeCount = useCallback(
    async (
      table: string,
      options?: {
        schoolScoped?: boolean;
        notNullColumn?: string;
      },
    ) => {
      try {
        let query = supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (options?.schoolScoped && currentSchool?.id) {
          query = query.eq("school_id", currentSchool.id);
        }

        if (options?.notNullColumn) {
          query = query.not(options.notNullColumn, "is", null);
        }

        const { count, error } = await query;

        if (error) {
          console.warn(`Count failed for ${table}:`, error.message);
          return 0;
        }

        return count ?? 0;
      } catch (error) {
        console.warn(`Unexpected count error for ${table}:`, error);
        return 0;
      }
    },
    [currentSchool?.id],
  );

  const countFirstAvailable = useCallback(
    async (
      tables: string[],
      options?: {
        schoolScoped?: boolean;
        notNullColumn?: string;
      },
    ) => {
      for (const table of tables) {
        const value = await safeCount(table, options);
        if (value > 0) return value;
      }

      return 0;
    },
    [safeCount],
  );

  const loadAdminData = useCallback(async () => {
    try {
      setRefreshing(true);

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
        countFirstAvailable(["student_period_scores", "grades", "student_grades"], {
          schoolScoped: true,
        }),
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
        students: studentsCount,
        teachers: teachersCount,
        users: usersCount,
        attendance: attendanceCount,
        grades: gradesCount,
        referrals: referralsCount,
        notifications: notificationsCount,
        parents: parentsLinkedCount,
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

      const { data: logsData, error: logsError } = await logsQuery;

      if (logsError) {
        console.warn("Audit logs load failed:", logsError.message);
        setAuditLogs([]);
      } else {
        setAuditLogs((logsData ?? []) as AuditLog[]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [countFirstAvailable, currentSchool?.id, safeCount]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const readinessItems = useMemo(() => {
    return [
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
    ];
  }, [counts]);

  const readyCount = readinessItems.filter((item) => item.ready).length;
  const readinessPercent = Math.round(
    (readyCount / readinessItems.length) * 100,
  );

  const readinessStatus =
    readinessPercent >= 85
      ? "جاهزة للتشغيل"
      : readinessPercent >= 60
        ? "تحتاج مراجعة بسيطة"
        : "تحتاج استكمال بيانات";

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
          description="بوابة تنفيذية للوصول السريع لأهم أقسام المنصة ومتابعة جاهزية التشغيل وآخر العمليات المسجلة داخل النظام."
          badge="بوابة مدير المدرسة"
          icon={<ShieldCheck size={18} />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "الإدارة" },
          ]}
          meta={[
            { label: "المدرسة", value: currentSchool?.school_name || "غير متوفر" },
            { label: "حالة الجاهزية", value: readinessStatus },
            { label: "العناصر الجاهزة", value: `${readyCount} / ${readinessItems.length}` },
            { label: "سجل العمليات", value: `${auditLogs.length} عملية` },
          ]}
          stats={[
            {
              label: "الطلاب",
              value: counts.students,
              icon: <Users size={20} />,
              tone: counts.students > 0 ? "green" : "gold",
            },
            {
              label: "المعلمون",
              value: counts.teachers,
              icon: <GraduationCap size={20} />,
              tone: counts.teachers > 0 ? "green" : "gold",
            },
            {
              label: "جاهزية التشغيل",
              value: `${readinessPercent}%`,
              icon: <Database size={20} />,
              tone: readinessPercent >= 85 ? "green" : readinessPercent >= 60 ? "gold" : "red",
            },
            {
              label: "آخر النشاطات",
              value: auditLogs.length,
              icon: <History size={20} />,
              tone: auditLogs.length > 0 ? "teal" : "gold",
            },
          ]}
          actions={
            <SecondaryButton onClick={loadAdminData} disabled={refreshing}>
              <RefreshCcw
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />
              تحديث المؤشرات
            </SecondaryButton>
          }
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ExecutiveCard
            title="الطلاب"
            value={counts.students}
            subtitle="إجمالي الطلاب في المدرسة"
            icon={<Users size={22} />}
            tone={counts.students > 0 ? "green" : "gold"}
            progress={counts.students > 0 ? 100 : 0}
          />

          <ExecutiveCard
            title="المعلمون"
            value={counts.teachers}
            subtitle="إجمالي المعلمين في المدرسة"
            icon={<GraduationCap size={22} />}
            tone={counts.teachers > 0 ? "green" : "gold"}
            progress={counts.teachers > 0 ? 100 : 0}
          />

          <ExecutiveCard
            title="المستخدمون"
            value={counts.users}
            subtitle="حسابات وصلاحيات"
            icon={<UsersRound size={22} />}
            tone={counts.users > 0 ? "green" : "gold"}
            progress={counts.users > 0 ? 100 : 0}
          />

          <ExecutiveCard
            title="جاهزية التشغيل"
            value={`${readinessPercent}%`}
            subtitle={readinessStatus}
            icon={<Database size={22} />}
            tone={readinessPercent >= 85 ? "green" : readinessPercent >= 60 ? "gold" : "red"}
            progress={readinessPercent}
          />
        </section>

        <SummaryCard
          title="الملخص التنفيذي للإدارة"
          description="قراءة سريعة لجاهزية بيانات المدرسة الأساسية قبل التشغيل الكامل أو النشر الرسمي."
          tone={readinessPercent >= 85 ? "green" : readinessPercent >= 60 ? "gold" : "red"}
          items={[
            { label: "العناصر الجاهزة", value: readyCount },
            { label: "إجمالي العناصر", value: readinessItems.length },
            { label: "نسبة الجاهزية", value: `${readinessPercent}%` },
            { label: "الحضور", value: counts.attendance },
            { label: "الدرجات", value: counts.grades },
            { label: "التنبيهات", value: counts.notifications },
          ]}
          footer="كلما اكتملت بيانات الطلاب والمعلمين والمستخدمين والحضور والدرجات، أصبحت المنصة أكثر جاهزية للتشغيل الفعلي."
        />

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#0DA9A6]/30 hover:shadow-lg"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl transition ${cardToneClass(
                      card.tone,
                    )}`}
                  >
                    <Icon size={26} />
                  </div>

                  <ChevronLeft
                    size={22}
                    className="text-slate-400 transition group-hover:-translate-x-1 group-hover:text-[#0DA9A6]"
                  />
                </div>

                <h2 className="text-xl font-black text-[#15445A]">
                  {card.title}
                </h2>

                <p className="mt-3 leading-7 text-slate-500">
                  {card.description}
                </p>
              </Link>
            );
          })}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Section
            title="جاهزية التشغيل"
            description="فحص سريع لأهم بيانات المدرسة قبل النشر والتشغيل."
            icon={<Database size={22} />}
          >
            <div className="mb-5 rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm font-black">
                <span className="text-slate-500">نسبة الجاهزية</span>
                <span className="text-[#15445A]">{readinessPercent}%</span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${
                    readinessPercent >= 85
                      ? "bg-[#07A869]"
                      : readinessPercent >= 60
                        ? "bg-[#C1B489]"
                        : "bg-red-600"
                  }`}
                  style={{ width: `${readinessPercent}%` }}
                />
              </div>

              <p className="mt-3 text-sm font-bold text-slate-500">
                {readinessStatus}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {readinessItems.map((item) => (
                <div
                  key={item.key}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {item.ready ? (
                        <CheckCircle2 className="text-emerald-600" size={20} />
                      ) : (
                        <XCircle className="text-rose-500" size={20} />
                      )}

                      <h3 className="font-black text-[#15445A]">
                        {item.label}
                      </h3>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        item.ready
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {item.count}
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            {readinessPercent < 85 && (
              <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-1 shrink-0" size={20} />
                  <p className="text-sm font-bold leading-7">
                    توجد عناصر لم تكتمل بعد. هذا لا يعني وجود خطأ، لكنه يساعدك على معرفة البيانات التي تحتاج مراجعة قبل النشر الرسمي.
                  </p>
                </div>
              </div>
            )}
          </Section>

          <Section
            title="آخر النشاطات"
            description="آخر العمليات المسجلة داخل النظام."
            icon={<History size={22} />}
            actions={<Activity className="text-[#0DA9A6]" size={24} />}
          >
            {auditLogs.length === 0 ? (
              <EmptyState
                title="لا توجد نشاطات مسجلة بعد"
                description="سيبدأ سجل النشاطات بالظهور بعد ربط عمليات الإضافة والتعديل والحذف داخل الصفحات المهمة."
                icon={<History size={34} />}
              />
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#15445A]">
                          {log.description ||
                            `${actionLabel(log.action)} في ${moduleLabel(
                              log.module,
                            )}`}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {log.user_name || "مستخدم غير محدد"}
                          {log.user_role ? ` · ${log.user_role}` : ""}
                        </p>
                      </div>

                      <span className="rounded-full bg-[#0DA9A6]/10 px-3 py-1 text-xs font-black text-[#0DA9A6]">
                        {moduleLabel(log.module)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Clock size={14} />
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </section>
      </main>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageContainer from "@/components/layout/PageContainer";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import PageLoader from "@/components/ui/loading/PageLoader";
import ErrorState from "@/components/ui/feedback/ErrorState";
import UiEmptyState from "@/components/ui/empty-state/EmptyState";

import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderKanban,
  GraduationCap,
  HeartPulse,
  RefreshCcw,
  Search,
  UserCheck,
  Users,
} from "lucide-react";

type StaffStats = {
  students: number;
  teachers: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  openReferrals: number;
  activeHealthCases: number;
  unreadNotifications: number;
  forms: number;
};

type NotificationItem = {
  id: string;
  title?: string | null;
  message?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

type QuickLink = {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  tone: "primary" | "green" | "gold" | "red" | "neutral";
};

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
];

const QUICK_LINKS: readonly QuickLink[] = [
  {
    title: "الطلاب",
    description: "إدارة بيانات الطلاب، البحث، التحديث، والملفات.",
    href: "/students",
    icon: Users,
    tone: "primary",
  },
  {
    title: "المعلمون",
    description: "استعراض بيانات المعلمين والجداول والملفات.",
    href: "/teachers",
    icon: GraduationCap,
    tone: "green",
  },
  {
    title: "الحضور",
    description: "متابعة حضور الطلاب اليومي وسجلات الغياب.",
    href: "/attendance",
    icon: CalendarDays,
    tone: "gold",
  },
  {
    title: "الإحالات",
    description: "متابعة الإحالات الطلابية وحالتها.",
    href: "/student-referrals",
    icon: ClipboardCheck,
    tone: "red",
  },
  {
    title: "النماذج",
    description: "نماذج المدرسة والملفات الإدارية.",
    href: "/forms",
    icon: FolderKanban,
    tone: "primary",
  },
  {
    title: "التقارير",
    description: "التقارير الإدارية والتشغيلية للمدرسة.",
    href: "/reports",
    icon: FileText,
    tone: "primary",
  },
  {
    title: "التنبيهات",
    description: "مركز التنبيهات الموحد.",
    href: "/notifications",
    icon: Bell,
    tone: "gold",
  },
  {
    title: "البحث الشامل",
    description: "البحث في الطلاب والمعلمين والسجلات.",
    href: "/search",
    icon: Search,
    tone: "primary",
  },
];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayLabel() {
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
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
    return "—";
  }
}

type RowsQueryResult<T> = {
  data: T[] | null;
  error: unknown;
};

function rows<T>(
  result: PromiseSettledResult<RowsQueryResult<T>>,
): T[] {
  if (result.status !== "fulfilled") return [];
  if (result.value?.error) return [];
  return (result.value?.data as T[]) || [];
}

function normalizeStatus(status?: string | null) {
  return String(status || "").trim().toLowerCase();
}

function isPresent(status?: string | null) {
  const value = normalizeStatus(status);
  return value === "حاضر" || value === "present" || value === "حضور";
}

function isAbsent(status?: string | null) {
  const value = normalizeStatus(status);
  return value === "غائب" || value === "absent" || value === "غياب";
}

function isLate(status?: string | null) {
  const value = normalizeStatus(status);
  return value === "متأخر" || value === "late" || value === "تأخر" || value === "تاخر";
}

function isOpenStatus(status?: string | null) {
  const value = String(status || "").trim();

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
    "closed",
    "done",
    "resolved",
  ].includes(value);
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function toneClass(tone: QuickLink["tone"]) {
  const classes: Record<QuickLink["tone"], string> = {
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

  return classes[tone];
}

export default function StaffPage() {
  const {
    currentSchool,
    loading: schoolLoading,
  } = useSchool();

  const [stats, setStats] = useState<StaffStats>({
    students: 0,
    teachers: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    openReferrals: 0,
    activeHealthCases: 0,
    unreadNotifications: 0,
    forms: 0,
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const today = getTodayDate();

  const loadPage = useCallback(async (isRefresh = false) => {
    if (!currentSchool?.id) {
      setLoading(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setErrorMsg("");

    try {
      const [
        studentsResult,
        teachersResult,
        attendanceResult,
        referralsResult,
        healthCasesResult,
        notificationsResult,
        formsResult,
      ] = await Promise.allSettled([
        supabase.from("students").select("id").eq("school_id", currentSchool.id),
        supabase.from("teachers").select("id").eq("school_id", currentSchool.id),
        supabase
          .from("attendance")
          .select("id, status")
          .eq("school_id", currentSchool.id)
          .eq("attendance_date", today),
        supabase
          .from("student_referrals")
          .select("id, status")
          .eq("school_id", currentSchool.id),
        supabase
          .from("health_cases")
          .select("id, case_status")
          .eq("school_id", currentSchool.id),
        supabase
          .from("notifications")
          .select("id, title, message, is_read, created_at")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase.from("school_forms").select("id").eq("school_id", currentSchool.id),
      ]);

      const studentsRows = rows<{ id: string }>(studentsResult);
      const teachersRows = rows<{ id: string }>(teachersResult);
      const attendanceRows = rows<{ id: string; status: string | null }>(attendanceResult);
      const referralRows = rows<{ id: string; status: string | null }>(referralsResult);
      const healthRows = rows<{ id: string; case_status: string | null }>(healthCasesResult);
      const notificationRows = rows<NotificationItem>(notificationsResult);
      const formRows = rows<{ id: string }>(formsResult);

      setStats({
        students: studentsRows.length,
        teachers: teachersRows.length,
        presentToday: attendanceRows.filter((item) => isPresent(item.status)).length,
        absentToday: attendanceRows.filter((item) => isAbsent(item.status)).length,
        lateToday: attendanceRows.filter((item) => isLate(item.status)).length,
        openReferrals: referralRows.filter((item) => isOpenStatus(item.status)).length,
        activeHealthCases: healthRows.filter((item) => isOpenStatus(item.case_status)).length,
        unreadNotifications: notificationRows.filter((item) => item.is_read === false).length,
        forms: formRows.length,
      });

      setNotifications(notificationRows);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل بوابة الإداري";
      setErrorMsg(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentSchool?.id, today]);

  useEffect(() => {
    if (schoolLoading) return;
    void loadPage(false);
  }, [loadPage, schoolLoading]);

  const attendanceRate = useMemo(() => {
    const total = stats.presentToday + stats.absentToday + stats.lateToday;
    return percentage(stats.presentToday, total);
  }, [stats.presentToday, stats.absentToday, stats.lateToday]);

  const followUpTotal =
    stats.absentToday +
    stats.lateToday +
    stats.openReferrals +
    stats.activeHealthCases +
    stats.unreadNotifications;

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل بوابة الإداري..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <ErrorState description="لا توجد مدرسة مرتبطة بالمستخدم الحالي." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <PageContainer size="wide" className="space-y-5">
          <Breadcrumb />
          <PageHeader
            variant="hero"
            title="خدمات الإدارة المدرسية"
            description="مركز إداري لمتابعة الطلاب، المعلمين، الحضور، النماذج، التقارير، التنبيهات، والخدمات التشغيلية اليومية."
            badge="بوابة الإداري"
            icon={<UserCheck size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة الإداري" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "غير محدد" },
              { label: "التاريخ", value: getTodayLabel() },
              { label: "اليوم", value: today },
              { label: "نسبة الحضور", value: `${attendanceRate}%` },
            ]}
            stats={[
              { label: "الطلاب", value: stats.students, icon: <Users size={20} aria-hidden="true" />, tone: "primary" },
              { label: "المعلمون", value: stats.teachers, icon: <GraduationCap size={20} aria-hidden="true" />, tone: "primary" },
              { label: "الحضور اليوم", value: `${attendanceRate}%`, icon: <CheckCircle2 size={20} aria-hidden="true" />, tone: attendanceRate >= 85 ? "green" : "gold" },
              { label: "تنبيهات", value: stats.unreadNotifications, icon: <Bell size={20} aria-hidden="true" />, tone: stats.unreadNotifications > 0 ? "red" : "green" },
            ]}
            actions={
              <>
                <SecondaryButton
                  icon={<RefreshCcw size={16} aria-hidden="true" />}
                  onClick={() => void loadPage(true)}
                  loading={refreshing}
                >
                  تحديث
                </SecondaryButton>

                <Link
                  href="/search"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] px-4 text-sm font-black text-[var(--app-primary-foreground)] shadow-[var(--app-shadow-sm)] transition hover:opacity-90"
                >
                  <Search size={16} aria-hidden="true" />
                  البحث
                </Link>

                <Link
                  href="/notifications"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--app-radius-lg)] bg-[var(--app-accent)] px-4 text-sm font-black text-[var(--app-accent-foreground)] shadow-[var(--app-shadow-sm)] transition hover:opacity-90"
                >
                  <Bell size={16} aria-hidden="true" />
                  التنبيهات
                </Link>
              </>
            }
          />

          {errorMsg && <ErrorState description={errorMsg} />}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ExecutiveCard
              title="الطلاب"
              value={stats.students}
              icon={<Users size={22} aria-hidden="true" />}
              tone="primary"
              subtitle="إجمالي الطلاب"
              progress={stats.students > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="المعلمون"
              value={stats.teachers}
              icon={<GraduationCap size={22} aria-hidden="true" />}
              tone="primary"
              subtitle="إجمالي المعلمين"
              progress={stats.teachers > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="الحضور اليوم"
              value={`${attendanceRate}%`}
              icon={<CheckCircle2 size={22} aria-hidden="true" />}
              tone={attendanceRate >= 85 ? "green" : "gold"}
              subtitle="نسبة الحضور"
              progress={attendanceRate}
            />

            <ExecutiveCard
              title="غياب اليوم"
              value={stats.absentToday}
              icon={<AlertTriangle size={22} aria-hidden="true" />}
              tone={stats.absentToday > 0 ? "red" : "green"}
              subtitle="سجلات الغياب"
              progress={stats.absentToday > 0 ? Math.min(100, stats.absentToday * 10) : 0}
            />

            <ExecutiveCard
              title="النماذج"
              value={stats.forms}
              icon={<FolderKanban size={22} aria-hidden="true" />}
              tone="gold"
              subtitle="نماذج المدرسة"
              progress={stats.forms > 0 ? 100 : 0}
            />
          </section>

          <SummaryCard
            title="ملخص إداري سريع"
            description="قراءة تنفيذية للحالة التشغيلية اليومية للإداري داخل المدرسة."
            tone={followUpTotal > 0 ? "gold" : "green"}
            items={[
              { label: "حاضر اليوم", value: stats.presentToday },
              { label: "متأخر اليوم", value: stats.lateToday },
              { label: "إحالات مفتوحة", value: stats.openReferrals },
              { label: "حالات صحية نشطة", value: stats.activeHealthCases },
              { label: "تنبيهات غير مقروءة", value: stats.unreadNotifications },
              { label: "نماذج", value: stats.forms },
            ]}
            footer="هذه البوابة تجمع الخدمات اليومية للإداري دون الدخول في تفاصيل صلاحيات المدير أو المعلم."
          />

          <PageToolbar
            search={{
              value: "",
              onChange: () => undefined,
              placeholder: "استخدم البحث الشامل من زر البحث أعلى الصفحة...",
            }}
            onRefresh={() => void loadPage(true)}
          />

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <Panel title="مؤشرات المتابعة اليومية" icon={<ClipboardCheck size={24} aria-hidden="true" />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <MiniInfo label="حاضر اليوم" value={stats.presentToday} icon={<CheckCircle2 size={18} aria-hidden="true" />} />
                <MiniInfo label="متأخر اليوم" value={stats.lateToday} icon={<CalendarDays size={18} aria-hidden="true" />} />
                <MiniInfo label="إحالات مفتوحة" value={stats.openReferrals} icon={<ClipboardCheck size={18} aria-hidden="true" />} />
                <MiniInfo label="حالات صحية نشطة" value={stats.activeHealthCases} icon={<HeartPulse size={18} aria-hidden="true" />} />
                <MiniInfo label="تنبيهات غير مقروءة" value={stats.unreadNotifications} icon={<Bell size={18} aria-hidden="true" />} />
                <MiniInfo label="عدد النماذج" value={stats.forms} icon={<FolderKanban size={18} aria-hidden="true" />} />
              </div>
            </Panel>

            <Panel title="التنبيهات الأخيرة" icon={<Bell size={24} aria-hidden="true" />}>
              {notifications.length === 0 ? (
                <UiEmptyState
                  icon={<Bell className="h-8 w-8" aria-hidden="true" />}
                  title="لا توجد تنبيهات"
                  description="لا توجد تنبيهات جديدة حاليًا."
                />
              ) : (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <Link
                      key={item.id}
                      href="/notifications"
                      className="block rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 transition hover:bg-[var(--app-card)] hover:shadow-[var(--app-shadow-sm)]"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <h3 className="line-clamp-1 font-black text-[var(--app-text)]">
                          {item.title || "تنبيه"}
                        </h3>

                        {item.is_read === false && (
                          <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)]0" />
                        )}
                      </div>

                      <p className="line-clamp-2 text-sm leading-7 text-[var(--app-text-muted)]">
                        {item.message || "لا توجد تفاصيل."}
                      </p>

                      <p className="mt-2 text-xs font-bold text-[var(--app-text-subtle)]">
                        {formatDate(item.created_at)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>
          </section>

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
            <div className="mb-5">
              <h2 className="text-2xl font-black text-[var(--app-text)]">خدمات بوابة الإداري</h2>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                أهم الخدمات اليومية التي يحتاجها الإداري داخل المدرسة.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {QUICK_LINKS.map((link) => (
                <QuickLinkCard key={link.href} link={link} />
              ))}
            </div>
          </section>
        </PageContainer>
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
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-lg)] bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]">
          {icon}
        </div>

        <h2 className="text-2xl font-black text-[var(--app-text)]">{title}</h2>
      </div>

      {children}
    </section>
  );
}

function MiniInfo({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-[var(--app-primary)]">
        {icon}
        <p className="text-xs font-black text-[var(--app-text-muted)]">{label}</p>
      </div>

      <p className="text-lg font-black text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function QuickLinkCard({ link }: { link: QuickLink }) {
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      className="group rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-5 transition hover:-translate-y-0.5 hover:bg-[var(--app-card)] hover:shadow-[var(--app-shadow-md)]"
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-lg)] transition ${toneClass(link.tone)}`}>
        <Icon size={24} />
      </div>

      <h3 className="text-xl font-black text-[var(--app-text)]">{link.title}</h3>

      <p className="mt-3 line-clamp-2 text-sm leading-7 text-[var(--app-text-muted)]">
        {link.description}
      </p>

      <div className="mt-5 rounded-[var(--app-radius-lg)] bg-[var(--app-card)] px-4 py-3 text-center text-sm font-black text-[var(--app-text)] transition group-hover:bg-[var(--app-primary)] group-hover:text-[var(--app-primary-foreground)]">
        فتح
      </div>
    </Link>
  );
}




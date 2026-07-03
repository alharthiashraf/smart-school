"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

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
  Loader2,
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
  tone: "blue" | "green" | "gold" | "red" | "teal" | "primary";
};

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
];

const QUICK_LINKS: QuickLink[] = [
  {
    title: "الطلاب",
    description: "إدارة بيانات الطلاب، البحث، التحديث، والملفات.",
    href: "/students",
    icon: Users,
    tone: "blue",
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
    tone: "blue",
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

function rows<T>(result: PromiseSettledResult<any>): T[] {
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
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    green: "bg-[#07A869]/10 text-[#07A869]",
    gold: "bg-[#C1B489]/20 text-[#15445A]",
    red: "bg-red-50 text-red-700",
    teal: "bg-[#0DA9A6]/10 text-[#0DA9A6]",
    primary: "bg-[#15445A]/10 text-[#15445A]",
  };

  return classes[tone];
}

export default function StaffPage() {
  const schoolContext = useSchool() as any;
  const currentSchool = schoolContext?.currentSchool || schoolContext?.school || null;
  const schoolLoading = Boolean(schoolContext?.loading);

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

  async function loadPage(isRefresh = false) {
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
  }

  useEffect(() => {
    if (!schoolLoading) void loadPage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolLoading, currentSchool?.id]);

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
          <LoadingBox />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-5" dir="rtl">
          <PageHeader
            variant="hero"
            title="خدمات الإدارة المدرسية"
            description="مركز إداري لمتابعة الطلاب، المعلمين، الحضور، النماذج، التقارير، التنبيهات، والخدمات التشغيلية اليومية."
            badge="بوابة الإداري"
            icon={<UserCheck size={18} />}
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
              { label: "الطلاب", value: stats.students, icon: <Users size={20} />, tone: "blue" },
              { label: "المعلمون", value: stats.teachers, icon: <GraduationCap size={20} />, tone: "teal" },
              { label: "الحضور اليوم", value: `${attendanceRate}%`, icon: <CheckCircle2 size={20} />, tone: attendanceRate >= 85 ? "green" : "gold" },
              { label: "تنبيهات", value: stats.unreadNotifications, icon: <Bell size={20} />, tone: stats.unreadNotifications > 0 ? "red" : "green" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void loadPage(true)}
                  disabled={refreshing}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw size={16} />}
                  تحديث
                </button>

                <Link
                  href="/search"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Search size={16} />
                  البحث
                </Link>

                <Link
                  href="/notifications"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Bell size={16} />
                  التنبيهات
                </Link>
              </>
            }
          />

          {errorMsg && (
            <div className="rounded-[28px] border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
              {errorMsg}
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ExecutiveCard
              title="الطلاب"
              value={stats.students}
              icon={<Users size={22} />}
              tone="blue"
              subtitle="إجمالي الطلاب"
              progress={stats.students > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="المعلمون"
              value={stats.teachers}
              icon={<GraduationCap size={22} />}
              tone="teal"
              subtitle="إجمالي المعلمين"
              progress={stats.teachers > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="الحضور اليوم"
              value={`${attendanceRate}%`}
              icon={<CheckCircle2 size={22} />}
              tone={attendanceRate >= 85 ? "green" : "gold"}
              subtitle="نسبة الحضور"
              progress={attendanceRate}
            />

            <ExecutiveCard
              title="غياب اليوم"
              value={stats.absentToday}
              icon={<AlertTriangle size={22} />}
              tone={stats.absentToday > 0 ? "red" : "green"}
              subtitle="سجلات الغياب"
              progress={stats.absentToday > 0 ? Math.min(100, stats.absentToday * 10) : 0}
            />

            <ExecutiveCard
              title="النماذج"
              value={stats.forms}
              icon={<FolderKanban size={22} />}
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

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <PageToolbar
              search={{
                value: "",
                onChange: () => undefined,
                placeholder: "استخدم البحث الشامل من زر البحث أعلى الصفحة...",
              }}
              onRefresh={() => void loadPage(true)}
            />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <Panel title="مؤشرات المتابعة اليومية" icon={<ClipboardCheck size={24} />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <MiniInfo label="حاضر اليوم" value={stats.presentToday} icon={<CheckCircle2 size={18} />} />
                <MiniInfo label="متأخر اليوم" value={stats.lateToday} icon={<CalendarDays size={18} />} />
                <MiniInfo label="إحالات مفتوحة" value={stats.openReferrals} icon={<ClipboardCheck size={18} />} />
                <MiniInfo label="حالات صحية نشطة" value={stats.activeHealthCases} icon={<HeartPulse size={18} />} />
                <MiniInfo label="تنبيهات غير مقروءة" value={stats.unreadNotifications} icon={<Bell size={18} />} />
                <MiniInfo label="عدد النماذج" value={stats.forms} icon={<FolderKanban size={18} />} />
              </div>
            </Panel>

            <Panel title="التنبيهات الأخيرة" icon={<Bell size={24} />}>
              {notifications.length === 0 ? (
                <EmptyBox text="لا توجد تنبيهات حاليًا." />
              ) : (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <Link
                      key={item.id}
                      href="/notifications"
                      className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <h3 className="line-clamp-1 font-black text-[#15445A]">
                          {item.title || "تنبيه"}
                        </h3>

                        {item.is_read === false && (
                          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        )}
                      </div>

                      <p className="line-clamp-2 text-sm leading-7 text-slate-500">
                        {item.message || "لا توجد تفاصيل."}
                      </p>

                      <p className="mt-2 text-xs font-bold text-slate-400">
                        {formatDate(item.created_at)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-black text-[#15445A]">خدمات بوابة الإداري</h2>
              <p className="mt-1 text-sm text-slate-500">
                أهم الخدمات اليومية التي يحتاجها الإداري داخل المدرسة.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {QUICK_LINKS.map((link) => (
                <QuickLinkCard key={link.href} link={link} />
              ))}
            </div>
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

        <h2 className="text-2xl font-black text-[#15445A]">{title}</h2>
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
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-[#0DA9A6]">
        {icon}
        <p className="text-xs font-black text-slate-500">{label}</p>
      </div>

      <p className="text-lg font-black text-[#15445A]">{value}</p>
    </div>
  );
}

function QuickLinkCard({ link }: { link: QuickLink }) {
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      className="group rounded-[24px] border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition ${toneClass(link.tone)}`}>
        <Icon size={24} />
      </div>

      <h3 className="text-xl font-black text-[#15445A]">{link.title}</h3>

      <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-500">
        {link.description}
      </p>

      <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-[#15445A] transition group-hover:bg-[#15445A] group-hover:text-white">
        فتح
      </div>
    </Link>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
      {text}
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
        <p className="font-bold">جاري تحميل بوابة الإداري...</p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  GraduationCap,
  HeartPulse,
  Loader2,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/lib/supabase";
import type { SchoolRole } from "@/lib/permissions";

type AdminStats = {
  students: number;
  teachers: number;
  classrooms: number;
  subjects: number;
  scheduledLessons: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  behaviorToday: number;
  healthVisitsToday: number;
  unreadNotifications: number;
  averageScore: number;
  scoreRows: number;
};

type NotificationItem = {
  id: string;
  title: string | null;
  body?: string | null;
  message?: string | null;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type AuditItem = {
  id: string;
  action: string | null;
  table_name: string | null;
  created_at: string | null;
};

type AttendanceTrendItem = {
  date: string;
  present: number;
  absent: number;
  late: number;
};

type QuickLink = {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  tone: "blue" | "green" | "gold" | "red" | "slate" | "teal";
};

type CountResult = {
  count: number | null;
  error: unknown;
};

type RowsResult<T> = {
  data: T[] | null;
  error: unknown;
};

const PAGE_ROLES: SchoolRole[] = ["super_admin", "school_admin"];

const QUICK_LINKS: QuickLink[] = [
  { title: "الطلاب", description: "إدارة بيانات الطلاب والفصول والسجل المدرسي.", href: "/students", icon: Users, tone: "blue" },
  { title: "المعلمون", description: "إدارة المعلمين والملفات وإسناد المواد.", href: "/teachers", icon: GraduationCap, tone: "green" },
  { title: "الفصول", description: "إنشاء الفصول وربطها بالمراحل والطلاب.", href: "/classrooms", icon: Building2, tone: "gold" },
  { title: "المواد", description: "إدارة المواد الدراسية وربطها بالصفوف.", href: "/subjects", icon: BookOpen, tone: "teal" },
  { title: "إسناد المعلمين", description: "ربط المعلم بالمادة والصف والفصل.", href: "/teacher-subjects", icon: ClipboardCheck, tone: "green" },
  { title: "الجداول", description: "متابعة الجداول الدراسية والحصص اليومية.", href: "/schedules", icon: CalendarDays, tone: "blue" },
  { title: "الحضور والغياب", description: "متابعة حضور الطلاب والغياب والتأخر.", href: "/attendance", icon: CheckCircle2, tone: "green" },
  { title: "الدرجات", description: "متابعة الرصد والتحليل ومتوسطات الأداء.", href: "/grades", icon: BarChart3, tone: "blue" },
  { title: "السلوك والمواظبة", description: "متابعة الملاحظات السلوكية والانضباط.", href: "/behavior", icon: AlertTriangle, tone: "red" },
  { title: "التقارير", description: "تقارير تشغيلية وتنفيذية للمدرسة.", href: "/reports", icon: FileText, tone: "slate" },
  { title: "التحليلات", description: "لوحات مؤشرات وتحليل الأداء العام.", href: "/analytics", icon: TrendingUp, tone: "teal" },
  { title: "المستخدمون", description: "إدارة حسابات المستخدمين والصلاحيات.", href: "/users", icon: UserCheck, tone: "gold" },
  { title: "الإعدادات", description: "إعدادات المدرسة والفصول والصلاحيات.", href: "/settings", icon: Settings, tone: "slate" },
];

const ROLE_LABELS: Partial<Record<SchoolRole, string>> = {
  super_admin: "مدير النظام",
  school_admin: "مدير المدرسة",
  vice_principal: "وكيل المدرسة",
  administrative_staff: "إداري",
  student_counselor: "الموجه الطلابي",
  health_supervisor: "الموجه الصحي",
  activity_leader: "رائد النشاط",
  teacher: "معلم",
  student: "طالب",
  parent: "ولي أمر",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function todayLabel() {
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function formatDateTime(value?: string | null) {
  if (!value) return "غير محدد";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "غير محدد";
  }
}

function roleLabel(role?: SchoolRole | null) {
  if (!role) return "غير محدد";
  return ROLE_LABELS[role] ?? role;
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function safeCount(result: PromiseSettledResult<CountResult>) {
  if (result.status !== "fulfilled") return 0;
  if (result.value.error) return 0;
  return result.value.count ?? 0;
}

function safeRows<T>(result: PromiseSettledResult<RowsResult<T>>) {
  if (result.status !== "fulfilled") return [];
  if (result.value.error) return [];
  return result.value.data ?? [];
}

function attendanceStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (["present", "حاضر", "حضور"].includes(value)) return "present";
  if (["absent", "غائب", "غياب"].includes(value)) return "absent";
  if (["late", "متأخر", "تأخر", "تاخر"].includes(value)) return "late";

  return "other";
}

function averageScore(rows: { score: number | null; max_score: number | null }[]) {
  const validRows = rows.filter((row) => Number(row.max_score ?? 0) > 0);

  if (!validRows.length) return 0;

  const total = validRows.reduce((sum, row) => {
    const score = Number(row.score ?? 0);
    const maxScore = Number(row.max_score ?? 100);
    return sum + (score / maxScore) * 100;
  }, 0);

  return Math.round(total / validRows.length);
}

function buildAttendanceTrend(rows: { attendance_date: string | null; status: string | null }[]) {
  const dates = Array.from({ length: 7 }, (_, index) => daysAgoISO(6 - index));

  return dates.map((date) => {
    const dayRows = rows.filter((row) => row.attendance_date === date);

    return {
      date,
      present: dayRows.filter((row) => attendanceStatus(row.status) === "present").length,
      absent: dayRows.filter((row) => attendanceStatus(row.status) === "absent").length,
      late: dayRows.filter((row) => attendanceStatus(row.status) === "late").length,
    };
  });
}

function translateAction(action?: string | null) {
  if (action === "INSERT") return "إضافة";
  if (action === "UPDATE") return "تعديل";
  if (action === "DELETE") return "حذف";
  return action || "عملية";
}

function translateTable(tableName?: string | null) {
  const map: Record<string, string> = {
    students: "الطلاب",
    teachers: "المعلمون",
    classrooms: "الفصول",
    subjects: "المواد",
    teacher_subjects: "إسناد المعلمين",
    teacher_schedule: "الجداول",
    schedules: "الجداول",
    student_attendance: "الحضور",
    attendance: "الحضور",
    student_scores: "الدرجات",
    student_grade_scores: "الدرجات",
    student_behavior: "السلوك",
    health_visits: "الصحة المدرسية",
    health_cases: "الصحة المدرسية",
    notifications: "التنبيهات",
    tasks: "المهام",
  };

  return tableName ? map[tableName] || tableName : "النظام";
}

function toneColor(tone: QuickLink["tone"]) {
  const colors: Record<QuickLink["tone"], string> = {
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    green: "bg-[#07A869]/10 text-[#07A869]",
    gold: "bg-[#C1B489]/20 text-[#15445A]",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
    teal: "bg-[#0DA9A6]/10 text-[#0DA9A6]",
  };

  return colors[tone];
}

export default function SchoolAdminPage() {
  const schoolContext = useSchool() as any;

  const currentSchool = schoolContext?.currentSchool || schoolContext?.school || schoolContext?.selectedSchool || null;
  const currentRole = schoolContext?.currentRole || currentSchool?.role || null;
  const academicYear = schoolContext?.academicYear || currentSchool?.academicYearName || "العام الدراسي";
  const semester = schoolContext?.semester || currentSchool?.semester || "الفصل الدراسي";
  const schoolLoading = Boolean(schoolContext?.loading);

  const [stats, setStats] = useState<AdminStats>({
    students: 0,
    teachers: 0,
    classrooms: 0,
    subjects: 0,
    scheduledLessons: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    behaviorToday: 0,
    healthVisitsToday: 0,
    unreadNotifications: 0,
    averageScore: 0,
    scoreRows: 0,
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);

  const today = todayISO();

  const attendanceTotal = stats.presentToday + stats.absentToday + stats.lateToday;
  const attendanceRate = percent(stats.presentToday, attendanceTotal);
  const followUpCount =
    stats.absentToday +
    stats.lateToday +
    stats.behaviorToday +
    stats.healthVisitsToday +
    stats.unreadNotifications;

  const riskLabel = followUpCount >= 20 ? "مرتفع" : followUpCount >= 8 ? "متوسط" : "مستقر";
  const riskTone = followUpCount >= 20 ? "red" : followUpCount >= 8 ? "gold" : "green";
  const riskPercent = Math.min(100, Math.round((followUpCount / 30) * 100));

  const loadPage = useCallback(async () => {
    if (!currentSchool?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const schoolId = currentSchool.id;

      const [
        studentsResult,
        teachersResult,
        classroomsResult,
        subjectsResult,
        todayAttendanceResult,
        behaviorResult,
        healthResult,
        notificationsResult,
        scheduleResult,
        scoresResult,
        trendAttendanceResult,
        auditLogsResult,
      ] = await Promise.allSettled([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase.from("classrooms").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase.from("subjects").select("id", { count: "exact", head: true }).eq("school_id", schoolId),

        supabase
          .from("student_attendance")
          .select("id, status")
          .eq("school_id", schoolId)
          .eq("attendance_date", today),

        supabase
          .from("student_behavior")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("behavior_date", today),

        supabase
          .from("health_visits")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("visit_date", today),

        supabase
          .from("notifications")
          .select("id, title, body, message, type, is_read, created_at")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(6),

        supabase
          .from("teacher_schedule")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("is_active", true),

        supabase.from("student_scores").select("score, max_score").eq("school_id", schoolId),

        supabase
          .from("student_attendance")
          .select("attendance_date, status")
          .eq("school_id", schoolId)
          .gte("attendance_date", daysAgoISO(6)),

        supabase
          .from("audit_logs")
          .select("id, action, table_name, created_at")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      const todayAttendanceRows = safeRows<{ id: string; status: string | null }>(todayAttendanceResult);
      const notificationRows = safeRows<NotificationItem>(notificationsResult);
      const scoreRows = safeRows<{ score: number | null; max_score: number | null }>(scoresResult);
      const trendRows = safeRows<{ attendance_date: string | null; status: string | null }>(trendAttendanceResult);
      const auditRows = safeRows<AuditItem>(auditLogsResult);

      setStats({
        students: safeCount(studentsResult),
        teachers: safeCount(teachersResult),
        classrooms: safeCount(classroomsResult),
        subjects: safeCount(subjectsResult),
        scheduledLessons: safeCount(scheduleResult),
        presentToday: todayAttendanceRows.filter((row) => attendanceStatus(row.status) === "present").length,
        absentToday: todayAttendanceRows.filter((row) => attendanceStatus(row.status) === "absent").length,
        lateToday: todayAttendanceRows.filter((row) => attendanceStatus(row.status) === "late").length,
        behaviorToday: safeCount(behaviorResult),
        healthVisitsToday: safeCount(healthResult),
        unreadNotifications: notificationRows.filter((item) => item.is_read === false).length,
        averageScore: averageScore(scoreRows),
        scoreRows: scoreRows.length,
      });

      setNotifications(notificationRows);
      setAttendanceTrend(buildAttendanceTrend(trendRows));
      setAuditLogs(auditRows);
      setLastSync(new Date().toISOString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل بوابة مدير المدرسة.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, today]);

  useEffect(() => {
    if (!schoolLoading) void loadPage();
  }, [schoolLoading, loadPage]);

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
            title={currentSchool?.school_name || "بوابة مدير المدرسة"}
            description="مركز قيادة مدير المدرسة لمتابعة الطلاب والمعلمين والحضور والسلوك والصحة المدرسية والتنبيهات والروابط التشغيلية."
            badge="بوابة مدير المدرسة"
            icon={<ShieldCheck size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة مدير المدرسة" },
            ]}
            meta={[
              { label: "التاريخ", value: todayLabel() },
              { label: "الدور", value: roleLabel(currentRole) },
              { label: "السنة الدراسية", value: academicYear },
              { label: "الفصل الدراسي", value: semester },
            ]}
            stats={[
              { label: "الطلاب", value: stats.students, icon: <Users size={20} />, tone: "blue" },
              { label: "المعلمون", value: stats.teachers, icon: <GraduationCap size={20} />, tone: "teal" },
              { label: "نسبة الحضور", value: `${attendanceRate}%`, icon: <CheckCircle2 size={20} />, tone: attendanceRate >= 85 ? "green" : "gold" },
              { label: "تنبيهات", value: stats.unreadNotifications, icon: <Bell size={20} />, tone: stats.unreadNotifications > 0 ? "red" : "green" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void loadPage()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={16} />
                  تحديث
                </button>

                <Link
                  href="/notifications"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Bell size={16} />
                  التنبيهات
                </Link>

                <Link
                  href="/search"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Search size={16} />
                  البحث
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
            <ExecutiveCard title="الطلاب" value={stats.students} icon={<Users size={22} />} tone="blue" subtitle="إجمالي الطلاب" progress={stats.students > 0 ? 100 : 0} />
            <ExecutiveCard title="المعلمون" value={stats.teachers} icon={<GraduationCap size={22} />} tone="teal" subtitle="إجمالي المعلمين" progress={stats.teachers > 0 ? 100 : 0} />
            <ExecutiveCard title="الفصول" value={stats.classrooms} icon={<Building2 size={22} />} tone="gold" subtitle="الفصول والشعب" progress={stats.classrooms > 0 ? 100 : 0} />
            <ExecutiveCard title="الحضور اليوم" value={`${attendanceRate}%`} icon={<CheckCircle2 size={22} />} tone={attendanceRate >= 85 ? "green" : "gold"} subtitle="نسبة الحضور" progress={attendanceRate} />
            <ExecutiveCard title="تنبيهات" value={stats.unreadNotifications} icon={<Bell size={22} />} tone={stats.unreadNotifications > 0 ? "red" : "green"} subtitle="غير مقروءة" progress={stats.unreadNotifications > 0 ? Math.min(100, stats.unreadNotifications * 10) : 0} />
          </section>

          <SummaryCard
            title="ملخص حالة المدرسة اليوم"
            description="قراءة تنفيذية للمؤشرات التشغيلية التي تحتاج متابعة يومية من مدير المدرسة."
            tone={riskTone as any}
            items={[
              { label: "حاضر", value: stats.presentToday },
              { label: "غائب", value: stats.absentToday },
              { label: "متأخر", value: stats.lateToday },
              { label: "سلوك", value: stats.behaviorToday },
              { label: "صحة", value: stats.healthVisitsToday },
              { label: "مستوى المتابعة", value: riskLabel },
            ]}
            footer={`آخر مزامنة: ${formatDateTime(lastSync)}`}
          />

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_.8fr]">
            <Panel title="المؤشرات التشغيلية" icon={<Activity size={24} />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <MiniInfo label="حاضر اليوم" value={stats.presentToday} icon={<CheckCircle2 size={18} />} />
                <MiniInfo label="غائب اليوم" value={stats.absentToday} icon={<AlertTriangle size={18} />} />
                <MiniInfo label="متأخر اليوم" value={stats.lateToday} icon={<CalendarDays size={18} />} />
                <MiniInfo label="ملاحظات سلوكية" value={stats.behaviorToday} icon={<ClipboardCheck size={18} />} />
                <MiniInfo label="زيارات صحية" value={stats.healthVisitsToday} icon={<HeartPulse size={18} />} />
                <MiniInfo label="حصص مجدولة" value={stats.scheduledLessons} icon={<CalendarDays size={18} />} />
                <MiniInfo label="المواد" value={stats.subjects} icon={<BookOpen size={18} />} />
                <MiniInfo label="متوسط الدرجات" value={`${stats.averageScore}%`} icon={<BarChart3 size={18} />} />
                <MiniInfo label="سجلات الدرجات" value={stats.scoreRows} icon={<Database size={18} />} />
              </div>

              <div className="mt-5 rounded-[24px] bg-slate-50 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-black text-[#15445A]">مستوى المتابعة اليومي</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${riskTone === "green" ? "bg-[#07A869]/10 text-[#07A869]" : riskTone === "gold" ? "bg-[#C1B489]/20 text-[#15445A]" : "bg-red-50 text-red-700"}`}>
                    {riskLabel}
                  </span>
                </div>

                <ProgressBar value={riskPercent} />

                <p className="mt-3 text-sm leading-7 text-slate-500">
                  يحسب المؤشر من الغياب والتأخر والملاحظات السلوكية والزيارات الصحية والتنبيهات غير المقروءة.
                </p>
              </div>

              <div className="mt-5 rounded-[24px] bg-slate-50 p-5">
                <div className="mb-4">
                  <p className="font-black text-[#15445A]">اتجاه الحضور آخر 7 أيام</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">قراءة مختصرة للحضور والغياب والتأخر.</p>
                </div>

                <AttendanceTrend data={attendanceTrend} />
              </div>
            </Panel>

            <Panel title="التنبيهات الأخيرة" icon={<Bell size={24} />}>
              {notifications.length === 0 ? (
                <EmptyBox text="لا توجد تنبيهات حاليًا." />
              ) : (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <Link key={item.id} href="/notifications" className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <h3 className="line-clamp-1 font-black text-[#15445A]">{item.title || "تنبيه"}</h3>
                        {item.is_read === false && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
                      </div>

                      <p className="line-clamp-2 text-sm leading-7 text-slate-500">
                        {item.body || item.message || "لا توجد تفاصيل."}
                      </p>

                      <p className="mt-2 text-xs font-bold text-slate-400">{formatDateTime(item.created_at)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_.9fr]">
            <Panel title="خدمات بوابة مدير المدرسة" icon={<Sparkles size={24} />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {QUICK_LINKS.map((link) => (
                  <QuickLinkCard key={link.href} link={link} />
                ))}
              </div>
            </Panel>

            <Panel title="آخر النشاطات" icon={<TrendingUp size={24} />}>
              {auditLogs.length === 0 ? (
                <EmptyBox text="لا توجد نشاطات حديثة." />
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="font-black text-[#15445A]">
                        {translateAction(log.action)} في {translateTable(log.table_name)}
                      </p>
                      <p className="mt-2 text-xs font-bold text-slate-400">{formatDateTime(log.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
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

function MiniInfo({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
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
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition ${toneColor(link.tone)}`}>
        <Icon size={24} />
      </div>

      <h3 className="text-lg font-black text-[#15445A]">{link.title}</h3>
      <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-500">{link.description}</p>

      <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-[#15445A] transition group-hover:bg-[#15445A] group-hover:text-white">
        فتح
      </div>
    </Link>
  );
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  const color = safeValue >= 75 ? "bg-red-600" : safeValue >= 40 ? "bg-[#C1B489]" : "bg-[#07A869]";

  return (
    <div className="h-4 overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function AttendanceTrend({ data }: { data: AttendanceTrendItem[] }) {
  if (data.length === 0) return <EmptyBox text="لا توجد بيانات كافية للرسم." />;

  const maxValue = Math.max(1, ...data.flatMap((item) => [item.present, item.absent, item.late]));

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const label = new Intl.DateTimeFormat("ar-SA", { weekday: "short" }).format(new Date(item.date));

        return (
          <div key={item.date} className="grid grid-cols-[70px_1fr] items-center gap-3">
            <span className="text-xs font-black text-slate-500">{label}</span>
            <div className="space-y-1">
              <ChartBar value={item.present} max={maxValue} label="حضور" className="bg-[#07A869]" />
              <ChartBar value={item.absent} max={maxValue} label="غياب" className="bg-red-600" />
              <ChartBar value={item.late} max={maxValue} label="تأخر" className="bg-[#C1B489]" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChartBar({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label: string;
  className: string;
}) {
  const width = Math.max(4, Math.round((value / max) * 100));

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-16 text-xs font-bold text-slate-500">
        {label}: {value}
      </span>
    </div>
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
        <p className="font-bold">جاري تحميل بوابة مدير المدرسة...</p>
      </div>
    </div>
  );
}

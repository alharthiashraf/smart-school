"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ElementType } from "react";
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
  ExternalLink,
  FileText,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  RefreshCcw,
  School,
  Search,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  UsersRound,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import Section from "@/components/ui/page/Section";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import KpiCard from "@/components/ui/cards/KpiCard";
import StatCard from "@/components/ui/cards/StatCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/lib/supabase";
import type { SchoolRole } from "@/lib/permissions";

type DashboardStats = {
  schools: number;
  students: number;
  teachers: number;
  classrooms: number;
  subjects: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  behaviorNotes: number;
  unreadNotifications: number;
  scheduleLessons: number;
  averageScore: number;
  scoresCount: number;
};

type NotificationItem = {
  id: string;
  title: string | null;
  body: string | null;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type AttendanceTrendItem = {
  date: string;
  present: number;
  absent: number;
  late: number;
};

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  roles: SchoolRole[];
  tone: "primary" | "gold" | "blue" | "green" | "red" | "teal";
};

type PortalCard = {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  roles: SchoolRole[];
};

type ExternalSystem = {
  title: string;
  description: string;
  href: string;
  tag: string;
};

type CountResult = {
  count: number | null;
  error: unknown;
};

type RowsResult<T> = {
  data: T[] | null;
  error: unknown;
};

const ROLE_NAME_MAP: Record<SchoolRole, string> = {
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

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "إدارة المدارس",
    description: "إضافة المدارس ومراجعة بياناتها.",
    href: "/schools",
    icon: School,
    roles: ["super_admin"],
    tone: "primary",
  },
  {
    title: "المستخدمون",
    description: "إدارة الحسابات والصلاحيات.",
    href: "/users",
    icon: UserCheck,
    roles: ["super_admin", "school_admin"],
    tone: "teal",
  },
  {
    title: "إضافة طالب",
    description: "فتح صفحة الطلاب لإضافة أو تعديل البيانات.",
    href: "/students",
    icon: UsersRound,
    roles: ["super_admin", "school_admin", "vice_principal", "administrative_staff"],
    tone: "blue",
  },
  {
    title: "إضافة معلم",
    description: "إدارة بيانات المعلمين وربطهم بالمدرسة.",
    href: "/teachers",
    icon: GraduationCap,
    roles: ["super_admin", "school_admin"],
    tone: "green",
  },
  {
    title: "الفصول",
    description: "إدارة الفصول وربط الطلاب بها.",
    href: "/classrooms",
    icon: Building2,
    roles: ["super_admin", "school_admin"],
    tone: "gold",
  },
  {
    title: "الجداول",
    description: "مراجعة الجداول والحصص اليومية.",
    href: "/schedules",
    icon: CalendarDays,
    roles: ["super_admin", "school_admin", "vice_principal"],
    tone: "primary",
  },
  {
    title: "تسجيل الحضور",
    description: "رصد الحضور والغياب والتأخر.",
    href: "/attendance",
    icon: ClipboardCheck,
    roles: ["super_admin", "school_admin", "vice_principal", "administrative_staff", "teacher"],
    tone: "green",
  },
  {
    title: "رصد الدرجات",
    description: "إدخال ومراجعة درجات الطلاب.",
    href: "/grades",
    icon: BarChart3,
    roles: ["super_admin", "school_admin", "teacher"],
    tone: "blue",
  },
  {
    title: "السلوك والمواظبة",
    description: "متابعة الملاحظات السلوكية والانضباط.",
    href: "/behavior",
    icon: AlertTriangle,
    roles: ["super_admin", "school_admin", "vice_principal", "administrative_staff", "teacher", "student_counselor"],
    tone: "red",
  },
  {
    title: "التقارير",
    description: "استعراض التقارير التشغيلية والتنفيذية.",
    href: "/reports",
    icon: FileText,
    roles: ["super_admin", "school_admin", "vice_principal", "administrative_staff", "teacher"],
    tone: "gold",
  },
  {
    title: "الإعدادات",
    description: "ضبط إعدادات المدرسة والمنصة.",
    href: "/settings",
    icon: Settings,
    roles: ["super_admin", "school_admin"],
    tone: "teal",
  },
];

const PORTAL_CARDS: PortalCard[] = [
  {
    title: "بوابة الإدارة",
    description: "مؤشرات المدرسة والبيانات التشغيلية.",
    href: "/school-admin",
    icon: Shield,
    roles: ["super_admin", "school_admin"],
  },
  {
    title: "بوابة المعلم",
    description: "الحصص والحضور والدرجات والتحضير.",
    href: "/teacher-portal",
    icon: GraduationCap,
    roles: ["super_admin", "school_admin", "teacher"],
  },
  {
    title: "بوابة الطالب",
    description: "الدرجات والحضور والسلوك.",
    href: "/student-portal",
    icon: BookOpen,
    roles: ["super_admin", "school_admin", "student"],
  },
  {
    title: "بوابة ولي الأمر",
    description: "متابعة الأبناء والنتائج والانضباط.",
    href: "/parent-portal",
    icon: UsersRound,
    roles: ["super_admin", "school_admin", "parent"],
  },
  {
    title: "الإرشاد الطلابي",
    description: "الحالات والتدخلات والتقارير الإرشادية.",
    href: "/counselor",
    icon: HeartPulse,
    roles: ["super_admin", "school_admin", "student_counselor"],
  },
  {
    title: "الصحة المدرسية",
    description: "الزيارات الصحية والحالات والتقارير.",
    href: "/health",
    icon: HeartPulse,
    roles: ["super_admin", "school_admin", "health_supervisor"],
  },
  {
    title: "الأنشطة",
    description: "الأنشطة والفرق والمسابقات.",
    href: "/activities",
    icon: Trophy,
    roles: ["super_admin", "school_admin", "activity_leader"],
  },
];

const EXTERNAL_SYSTEMS: ExternalSystem[] = [
  {
    title: "منصة مدرستي",
    description: "الدخول إلى خدمات التعليم الإلكتروني.",
    href: "https://schools.madrasati.sa/",
    tag: "مدرستي",
  },
  {
    title: "نظام نور",
    description: "خدمات الطلاب وأولياء الأمور والنتائج.",
    href: "https://noor.moe.gov.sa/",
    tag: "نور",
  },
  {
    title: "نظام فارس",
    description: "خدمات الموظفين والموارد البشرية.",
    href: "https://sshr.moe.gov.sa/",
    tag: "فارس",
  },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
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

function todayLabel() {
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function hasRole(currentRole: SchoolRole | null, allowedRoles: SchoolRole[]) {
  if (!currentRole) return false;
  if (currentRole === "super_admin") return true;
  return allowedRoles.includes(currentRole);
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

function averageScore(rows: { score: number | null; max_score: number | null }[]) {
  const validRows = rows.filter(
    (row) => Number(row.max_score ?? 0) > 0 && Number(row.score ?? 0) >= 0,
  );

  if (!validRows.length) return 0;

  const total = validRows.reduce((sum, row) => {
    const score = Number(row.score ?? 0);
    const maxScore = Number(row.max_score ?? 100);
    return sum + (score / maxScore) * 100;
  }, 0);

  return Math.round(total / validRows.length);
}

function attendanceStatus(status?: string | null) {
  const value = String(status || "").toLowerCase();

  if (["present", "حاضر"].includes(value)) return "present";
  if (["absent", "غائب"].includes(value)) return "absent";
  if (["late", "متأخر"].includes(value)) return "late";

  return "other";
}

function buildAttendanceTrend(
  rows: { attendance_date: string | null; status: string | null }[],
): AttendanceTrendItem[] {
  const dates = Array.from({ length: 7 }, (_, index) => daysAgoISO(6 - index));

  return dates.map((date) => {
    const dateRows = rows.filter((row) => row.attendance_date === date);

    return {
      date,
      present: dateRows.filter((row) => attendanceStatus(row.status) === "present").length,
      absent: dateRows.filter((row) => attendanceStatus(row.status) === "absent").length,
      late: dateRows.filter((row) => attendanceStatus(row.status) === "late").length,
    };
  });
}

export default function DashboardPage() {
  const {
    currentSchool,
    currentRole,
    academicYear,
    semester,
    loading: schoolLoading,
  } = useSchool();

  const [userName, setUserName] = useState("مستخدم");
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const [stats, setStats] = useState<DashboardStats>({
    schools: 0,
    students: 0,
    teachers: 0,
    classrooms: 0,
    subjects: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    behaviorNotes: 0,
    unreadNotifications: 0,
    scheduleLessons: 0,
    averageScore: 0,
    scoresCount: 0,
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrendItem[]>([]);

  const roleName = currentRole ? ROLE_NAME_MAP[currentRole] : "مستخدم";
  const today = todayISO();

  const visibleActions = useMemo(
    () => QUICK_ACTIONS.filter((action) => hasRole(currentRole, action.roles)),
    [currentRole],
  );

  const filteredActions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return visibleActions.filter((action) => {
      const matchesSearch =
        !keyword ||
        `${action.title} ${action.description}`.toLowerCase().includes(keyword);

      const matchesFilter = actionFilter === "all" || action.tone === actionFilter;

      return matchesSearch && matchesFilter;
    });
  }, [actionFilter, search, visibleActions]);

  const visiblePortals = useMemo(
    () => PORTAL_CARDS.filter((portal) => hasRole(currentRole, portal.roles)),
    [currentRole],
  );

  const attendanceTotal = stats.presentToday + stats.absentToday + stats.lateToday;
  const attendanceRate = percent(stats.presentToday, attendanceTotal);
  const absenceRate = percent(stats.absentToday + stats.lateToday, attendanceTotal);

  const systemHealth =
    stats.unreadNotifications === 0 && stats.absentToday === 0
      ? "مستقر"
      : "يحتاج متابعة";

  const dataQuality = Math.round(
    ((stats.students > 0 ? 25 : 0) +
      (stats.teachers > 0 ? 25 : 0) +
      (stats.classrooms > 0 ? 25 : 0) +
      (stats.subjects > 0 ? 25 : 0)),
  );

  useEffect(() => {
    void loadUser();
  }, []);

  useEffect(() => {
    if (!schoolLoading) {
      void loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolLoading, currentSchool?.id]);

  async function loadUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return;

    setUserName(
      user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        "مستخدم",
    );
  }

  async function loadDashboard() {
    setLoading(true);
    setErrorMsg("");

    if (!currentSchool?.id && currentRole !== "super_admin") {
      setLoading(false);
      return;
    }

    try {
      const schoolId = currentSchool?.id;

      const [
        schoolsResult,
        studentsResult,
        teachersResult,
        classroomsResult,
        subjectsResult,
        todayAttendanceResult,
        behaviorResult,
        notificationsResult,
        scheduleResult,
        scoresResult,
        trendAttendanceResult,
      ] = await Promise.allSettled([
        supabase.from("schools").select("id", { count: "exact", head: true }),

        schoolId
          ? supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId)
          : Promise.resolve({ count: 0, error: null }),

        schoolId
          ? supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", schoolId)
          : Promise.resolve({ count: 0, error: null }),

        schoolId
          ? supabase.from("classrooms").select("id", { count: "exact", head: true }).eq("school_id", schoolId)
          : Promise.resolve({ count: 0, error: null }),

        schoolId
          ? supabase.from("subjects").select("id", { count: "exact", head: true }).eq("school_id", schoolId)
          : Promise.resolve({ count: 0, error: null }),

        schoolId
          ? supabase
              .from("student_attendance")
              .select("id, status")
              .eq("school_id", schoolId)
              .eq("attendance_date", today)
          : Promise.resolve({ data: [], error: null }),

        schoolId
          ? supabase
              .from("student_behavior")
              .select("id", { count: "exact", head: true })
              .eq("school_id", schoolId)
              .eq("behavior_date", today)
          : Promise.resolve({ count: 0, error: null }),

        schoolId
          ? supabase
              .from("notifications")
              .select("id, title, body, type, is_read, created_at")
              .eq("school_id", schoolId)
              .order("created_at", { ascending: false })
              .limit(6)
          : Promise.resolve({ data: [], error: null }),

        schoolId
          ? supabase
              .from("schedules")
              .select("id", { count: "exact", head: true })
              .eq("school_id", schoolId)
              .eq("is_active", true)
          : Promise.resolve({ count: 0, error: null }),

        schoolId
          ? supabase
              .from("student_grade_scores")
              .select("score, max_score")
              .eq("school_id", schoolId)
          : Promise.resolve({ data: [], error: null }),

        schoolId
          ? supabase
              .from("student_attendance")
              .select("attendance_date, status")
              .eq("school_id", schoolId)
              .gte("attendance_date", daysAgoISO(6))
          : Promise.resolve({ data: [], error: null }),
      ]);

      const todayAttendanceRows = safeRows<{ id: string; status: string | null }>(
        todayAttendanceResult,
      );
      const scoreRows = safeRows<{ score: number | null; max_score: number | null }>(
        scoresResult,
      );
      const notificationRows = safeRows<NotificationItem>(notificationsResult);
      const trendRows = safeRows<{
        attendance_date: string | null;
        status: string | null;
      }>(trendAttendanceResult);

      setStats({
        schools: safeCount(schoolsResult),
        students: safeCount(studentsResult),
        teachers: safeCount(teachersResult),
        classrooms: safeCount(classroomsResult),
        subjects: safeCount(subjectsResult),
        presentToday: todayAttendanceRows.filter(
          (row) => attendanceStatus(row.status) === "present",
        ).length,
        absentToday: todayAttendanceRows.filter(
          (row) => attendanceStatus(row.status) === "absent",
        ).length,
        lateToday: todayAttendanceRows.filter(
          (row) => attendanceStatus(row.status) === "late",
        ).length,
        behaviorNotes: safeCount(behaviorResult),
        unreadNotifications: notificationRows.filter((item) => item.is_read === false)
          .length,
        scheduleLessons: safeCount(scheduleResult),
        averageScore: averageScore(scoreRows),
        scoresCount: scoreRows.length,
      });

      setNotifications(notificationRows);
      setAttendanceTrend(buildAttendanceTrend(trendRows));
      setLastSync(new Date().toISOString());
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر تحميل لوحة التحكم. تحقق من الاتصال أو صلاحيات قاعدة البيانات.";

      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-6" dir="rtl">
        <PageHeader
          variant="hero"
          title={`أهلًا، ${userName}`}
          description="لوحة القيادة الرسمية لمنصة المدرسة الذكية 2.0. تعرض المؤشرات اليومية، البوابات، التنبيهات، والإجراءات السريعة حسب صلاحية المستخدم."
          badge="لوحة التحكم التنفيذية"
          icon={<LayoutDashboard size={18} />}
          breadcrumbs={[
            { label: "الرئيسية", href: "/" },
            { label: "لوحة التحكم" },
          ]}
          lastUpdated={formatDateTime(lastSync)}
          meta={[
            { label: "الدور", value: roleName },
            { label: "المدرسة", value: currentSchool?.school_name || "لم يتم تحديد مدرسة" },
            { label: "العام والفصل", value: `${academicYear || "العام الدراسي"} · ${semester || "الفصل الدراسي"}` },
            { label: "اليوم", value: todayLabel() },
          ]}
          stats={[
            { label: "الحالة", value: systemHealth, icon: <Shield size={20} />, tone: systemHealth === "مستقر" ? "green" : "red" },
            { label: "جودة البيانات", value: `${dataQuality}%`, icon: <CheckCircle2 size={20} />, tone: dataQuality >= 75 ? "green" : "gold" },
            { label: "الحضور", value: `${attendanceRate}%`, icon: <ClipboardCheck size={20} />, tone: attendanceRate >= 85 ? "green" : "blue" },
            { label: "التنبيهات", value: stats.unreadNotifications, icon: <Bell size={20} />, tone: stats.unreadNotifications > 0 ? "gold" : "teal" },
          ]}
          actions={
            <>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <RefreshCcw size={17} />
                تحديث
              </button>

              <Link
                href="/search"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0DA9A6] hover:shadow-md"
              >
                <Search size={17} />
                البحث الشامل
              </Link>
            </>
          }
        />

        {errorMsg && (
          <SummaryCard
            title="تعذر تحميل بعض البيانات"
            description={errorMsg}
            tone="red"
            icon={<AlertTriangle size={22} />}
          />
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ExecutiveCard
            title="الطلاب"
            value={stats.students}
            subtitle="إجمالي الطلاب في المدرسة"
            icon={<Users size={22} />}
            tone="blue"
            loading={schoolLoading || loading}
            progress={stats.students > 0 ? 100 : 0}
          />
          <ExecutiveCard
            title="المعلمون"
            value={stats.teachers}
            subtitle="إجمالي الكادر التعليمي"
            icon={<GraduationCap size={22} />}
            tone="green"
            loading={schoolLoading || loading}
            progress={stats.teachers > 0 ? 100 : 0}
          />
          <ExecutiveCard
            title="الفصول"
            value={stats.classrooms}
            subtitle="الفصول النشطة في المدرسة"
            icon={<Building2 size={22} />}
            tone="gold"
            loading={schoolLoading || loading}
            progress={stats.classrooms > 0 ? 100 : 0}
          />
          <ExecutiveCard
            title="المواد"
            value={stats.subjects}
            subtitle="المواد الدراسية المعتمدة"
            icon={<BookOpen size={22} />}
            tone="teal"
            loading={schoolLoading || loading}
            progress={stats.subjects > 0 ? 100 : 0}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="حضور اليوم"
            value={stats.presentToday}
            caption={`نسبة الحضور الفعلي ${attendanceRate}%`}
            icon={<CheckCircle2 size={20} />}
            tone="green"
            loading={schoolLoading || loading}
          />
          <KpiCard
            title="غياب وتأخر"
            value={stats.absentToday + stats.lateToday}
            caption={`نسبة المتابعة ${absenceRate}%`}
            icon={<AlertTriangle size={20} />}
            tone="red"
            loading={schoolLoading || loading}
          />
          <KpiCard
            title="متوسط الدرجات"
            value={`${stats.averageScore}%`}
            caption={`${stats.scoresCount} سجل درجات`}
            icon={<BarChart3 size={20} />}
            tone="blue"
            loading={schoolLoading || loading}
          />
          <KpiCard
            title="تنبيهات"
            value={stats.unreadNotifications}
            caption="تنبيهات غير مقروءة"
            icon={<Bell size={20} />}
            tone="gold"
            loading={schoolLoading || loading}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Section
            title="المشهد التشغيلي اليومي"
            description="قراءة مباشرة لحضور اليوم، السلوك، الجداول، والمؤشرات التشغيلية."
            icon={<Activity size={20} />}
            className="xl:col-span-2"
            badge="مباشر"
            actions={
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
                آخر مزامنة: {formatDateTime(lastSync)}
              </span>
            }
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <StatCard title="حاضر" value={stats.presentToday} icon={<CheckCircle2 size={18} />} tone="green" loading={loading} />
              <StatCard title="غائب" value={stats.absentToday} icon={<AlertTriangle size={18} />} tone="red" loading={loading} />
              <StatCard title="متأخر" value={stats.lateToday} icon={<Activity size={18} />} tone="gold" loading={loading} />
              <StatCard title="ملاحظات سلوكية" value={stats.behaviorNotes} icon={<ClipboardCheck size={18} />} tone="teal" loading={loading} />
              <StatCard title="نسبة الحضور" value={`${attendanceRate}%`} icon={<TrendingUp size={18} />} tone="blue" loading={loading} />
              <StatCard title="حصص مجدولة" value={stats.scheduleLessons} icon={<CalendarDays size={18} />} tone="primary" loading={loading} />
            </div>

            <div className="mt-5 rounded-[28px] bg-slate-50 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-[#15445A]">
                    اتجاه الحضور آخر 7 أيام
                  </h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    قراءة مبسطة تساعد الإدارة على متابعة الانضباط.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                  حضور / غياب / تأخر
                </span>
              </div>

              <SimpleAttendanceChart data={attendanceTrend} />
            </div>
          </Section>

          <Section
            title="آخر التنبيهات"
            description="تنبيهات النظام غير المقروءة وآخر الرسائل المهمة."
            icon={<Bell size={20} />}
            actions={
              <Link href="/alerts" className="text-xs font-black text-[#15445A] hover:underline">
                عرض الكل
              </Link>
            }
          >
            {notifications.length === 0 ? (
              <EmptyState text="لا توجد تنبيهات حاليًا. النظام مستقر ولا توجد رسائل تحتاج إجراء." />
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href="/alerts"
                    className="block rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="line-clamp-1 font-black text-[#15445A]">
                        {notification.title || "تنبيه"}
                      </p>
                      {notification.is_read === false && (
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                      {notification.body || "لا توجد تفاصيل."}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {formatDateTime(notification.created_at)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </section>

        <SummaryCard
          title="الملخص التنفيذي"
          description="قراءة سريعة للحالة العامة اليوم بناءً على البيانات المتاحة."
          tone={systemHealth === "مستقر" ? "green" : "gold"}
          items={[
            { label: "حالة النظام", value: systemHealth },
            { label: "جودة البيانات الأساسية", value: `${dataQuality}%` },
            { label: "نسبة الحضور", value: `${attendanceRate}%` },
            { label: "عدد التنبيهات", value: stats.unreadNotifications },
          ]}
          footer="هذه المؤشرات تعتمد على البيانات المسجلة في قاعدة البيانات، وتزداد دقتها كلما اكتملت بيانات الحضور والدرجات والجداول."
        />

        <PageToolbar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "ابحث في الإجراءات السريعة والبوابات...",
          }}
          filters={
            <ToolbarSelect value={actionFilter} onChange={setActionFilter}>
              <option value="all">كل الإجراءات</option>
              <option value="primary">الإدارة</option>
              <option value="blue">أكاديمي</option>
              <option value="green">تشغيلي</option>
              <option value="gold">تقارير وإعدادات</option>
              <option value="red">متابعة</option>
            </ToolbarSelect>
          }
          onRefresh={() => void loadDashboard()}
          refreshLabel="تحديث"
        />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Section
            title="الإجراءات السريعة"
            description="أهم الإجراءات المتاحة حسب صلاحية المستخدم."
            icon={<Sparkles size={20} />}
            className="xl:col-span-2"
            badge={`${filteredActions.length} إجراء`}
          >
            {filteredActions.length === 0 ? (
              <EmptyState text="لا توجد إجراءات متاحة حسب البحث أو الفلتر الحالي." />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {filteredActions.slice(0, 8).map((action) => (
                  <ActionCard key={action.href} action={action} />
                ))}
              </div>
            )}
          </Section>

          <Section title="مؤشرات مختصرة" icon={<TrendingUp size={20} />} badge="KPI">
            <div className="space-y-3">
              <StatCard title="المدارس" value={stats.schools} icon={<School size={18} />} tone="primary" loading={loading} />
              <StatCard title="الحضور" value={`${attendanceRate}%`} icon={<ClipboardCheck size={18} />} tone="green" loading={loading} />
              <StatCard title="متوسط الدرجات" value={`${stats.averageScore}%`} icon={<BarChart3 size={18} />} tone="blue" loading={loading} />
            </div>
          </Section>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Section
            title="البوابات الرئيسية"
            description="روابط مباشرة للبوابات حسب الدور والصلاحيات."
            icon={<LayoutDashboard size={20} />}
            className="xl:col-span-2"
          >
            {visiblePortals.length === 0 ? (
              <EmptyState text="لا توجد بوابات متاحة لهذا الحساب." />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {visiblePortals.map((portal) => (
                  <PortalLink key={portal.href} portal={portal} />
                ))}
              </div>
            )}
          </Section>

          <Section title="الأنظمة الخارجية" icon={<ExternalLink size={20} />}>
            <div className="space-y-3">
              {EXTERNAL_SYSTEMS.map((system) => (
                <ExternalSystemCard key={system.href} system={system} />
              ))}
            </div>
          </Section>
        </section>
      </div>
    </AuthGuard>
  );
}

function SimpleAttendanceChart({ data }: { data: AttendanceTrendItem[] }) {
  if (data.length === 0) {
    return <EmptyState text="لا توجد بيانات كافية للرسم." />;
  }

  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => [item.present, item.absent, item.late]),
  );

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const label = new Intl.DateTimeFormat("ar-SA", {
          weekday: "short",
        }).format(new Date(item.date));

        return (
          <div key={item.date} className="grid grid-cols-[70px_1fr] items-center gap-3">
            <span className="text-xs font-black text-slate-500">{label}</span>
            <div className="space-y-1">
              <ChartBar value={item.present} max={maxValue} label="حضور" className="bg-[#07A869]" />
              <ChartBar value={item.absent} max={maxValue} label="غياب" className="bg-red-500" />
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

function ActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon;
  const tones = {
    primary: "bg-[#15445A]/10 text-[#15445A]",
    gold: "bg-[#C1B489]/20 text-[#15445A]",
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    green: "bg-[#07A869]/10 text-[#07A869]",
    red: "bg-red-50 text-red-700",
    teal: "bg-[#0DA9A6]/10 text-[#0DA9A6]",
  };

  return (
    <Link
      href={action.href}
      className="group block rounded-[24px] border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tones[action.tone]}`}>
          <Icon size={21} />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-black text-[#15445A]">{action.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
            {action.description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function PortalLink({ portal }: { portal: PortalCard }) {
  const Icon = portal.icon;

  return (
    <Link
      href={portal.href}
      className="group block rounded-[24px] border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#15445A]/10 text-[#15445A] transition group-hover:bg-[#0DA9A6]/10 group-hover:text-[#0DA9A6]">
          <Icon size={21} />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-black text-[#15445A]">{portal.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
            {portal.description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ExternalSystemCard({ system }: { system: ExternalSystem }) {
  return (
    <a
      href={system.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-[24px] border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="rounded-2xl bg-[#15445A]/10 px-3 py-2 text-xs font-black text-[#15445A] transition group-hover:bg-[#C1B489]/20">
          {system.tag}
        </div>
        <ExternalLink className="h-4 w-4 text-slate-400" />
      </div>
      <h3 className="font-black text-[#15445A]">{system.title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{system.description}</p>
    </a>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

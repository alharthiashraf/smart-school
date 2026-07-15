"use client";

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
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
  FileText,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  School,
  Settings,
  Shield,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
  UsersRound,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import {
  ActivityFeed,
  ExecutiveCharts,
  ExecutiveHealth,
  ExecutiveHero,
  ExecutiveStats,
  ExternalSystems,
  PortalGrid,
  QuickLauncher,
  SmartInsights,
} from "@/components/dashboard";
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

type InsightTone = "green" | "gold" | "red" | "blue" | "teal";

type InsightItem = {
  title: string;
  description: string;
  tone: InsightTone;
  icon: ReactNode;
};

type ActivityItem = {
  id: string;
  time: string;
  title: string;
  description: string;
  tone: InsightTone;
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

function buildInsights({
  stats,
  attendanceRate,
  dataQuality,
  systemHealth,
}: {
  stats: DashboardStats;
  attendanceRate: number;
  dataQuality: number;
  systemHealth: string;
}): InsightItem[] {
  const insights: InsightItem[] = [];

  if (systemHealth === "مستقر") {
    insights.push({
      title: "الحالة التشغيلية مستقرة",
      description: "لا توجد مؤشرات حرجة حاليًا، ويمكن متابعة العمل اليومي بشكل طبيعي.",
      tone: "green",
      icon: <CheckCircle2 className="h-5 w-5" />,
    });
  } else {
    insights.push({
      title: "توجد عناصر تحتاج متابعة",
      description: "راجع التنبيهات والغياب والتأخر قبل نهاية اليوم الدراسي.",
      tone: "gold",
      icon: <AlertTriangle className="h-5 w-5" />,
    });
  }

  if (attendanceRate >= 90) {
    insights.push({
      title: "انضباط حضور ممتاز",
      description: `نسبة الحضور اليوم ${attendanceRate}% وهي ضمن المستوى المستهدف.`,
      tone: "green",
      icon: <ClipboardCheck className="h-5 w-5" />,
    });
  } else if (attendanceRate > 0) {
    insights.push({
      title: "الحضور يحتاج متابعة",
      description: `نسبة الحضور اليوم ${attendanceRate}%، يفضّل مراجعة سجلات الغياب والتأخر.`,
      tone: "red",
      icon: <Activity className="h-5 w-5" />,
    });
  }

  if (dataQuality < 75) {
    insights.push({
      title: "جودة البيانات غير مكتملة",
      description: "أكمل بيانات الطلاب والمعلمين والفصول والمواد حتى تصبح مؤشرات المنصة أدق.",
      tone: "blue",
      icon: <Sparkles className="h-5 w-5" />,
    });
  }

  if (stats.averageScore > 0 && stats.averageScore < 70) {
    insights.push({
      title: "متوسط الدرجات منخفض",
      description: "قد تحتاج بعض المواد أو الفصول إلى خطة علاجية أو متابعة مع المعلمين.",
      tone: "gold",
      icon: <BarChart3 className="h-5 w-5" />,
    });
  }

  if (stats.unreadNotifications > 0) {
    insights.push({
      title: "تنبيهات غير مقروءة",
      description: `يوجد ${stats.unreadNotifications} تنبيهًا يحتاج مراجعة في مركز التنبيهات.`,
      tone: "teal",
      icon: <Bell className="h-5 w-5" />,
    });
  }

  return insights.slice(0, 4);
}

function buildActivityFeed(
  notifications: NotificationItem[],
  stats: DashboardStats,
  lastSync: string | null,
): ActivityItem[] {
  const feed: ActivityItem[] = notifications.slice(0, 4).map((item) => ({
    id: item.id,
    time: formatDateTime(item.created_at),
    title: item.title || "تنبيه جديد",
    description: item.body || "لا توجد تفاصيل إضافية.",
    tone: item.is_read === false ? "gold" : "teal",
  }));

  feed.push({
    id: "attendance",
    time: "اليوم",
    title: "حالة الحضور",
    description: `حاضر: ${stats.presentToday} · غائب: ${stats.absentToday} · متأخر: ${stats.lateToday}`,
    tone: stats.absentToday + stats.lateToday > 0 ? "gold" : "green",
  });

  feed.push({
    id: "sync",
    time: formatDateTime(lastSync),
    title: "آخر مزامنة",
    description: "تم تحديث مؤشرات لوحة التحكم من قاعدة البيانات.",
    tone: "blue",
  });

  return feed.slice(0, 6);
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

  const insights = useMemo(
    () =>
      buildInsights({
        stats,
        attendanceRate,
        dataQuality,
        systemHealth,
      }),
    [stats, attendanceRate, dataQuality, systemHealth],
  );

  const activityFeed = useMemo(
    () => buildActivityFeed(notifications, stats, lastSync),
    [notifications, stats, lastSync],
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
          variant="compact"
          title="لوحة التحكم"
          description="ملخص تنفيذي مباشر لحالة المدرسة ومؤشرات اليوم."
          badge="Dashboard V4"
          icon={<LayoutDashboard size={18} />}
          breadcrumbs={[
            { label: "الرئيسية", href: "/" },
            { label: "لوحة التحكم" },
          ]}
          lastUpdated={formatDateTime(lastSync)}
        />

        {errorMsg && (
          <SummaryCard
            title="تعذر تحميل بعض البيانات"
            description={errorMsg}
            tone="red"
            icon={<AlertTriangle size={22} />}
          />
        )}

        <ExecutiveHero
          userName={userName}
          schoolName={currentSchool?.school_name || "لم يتم تحديد مدرسة"}
          roleName={roleName}
          academicYear={academicYear}
          semester={semester}
          today={todayLabel()}
          systemHealth={systemHealth}
          lastSync={formatDateTime(lastSync)}
          onRefresh={() => void loadDashboard()}
        />

        <ExecutiveStats
          items={[
            {
              title: "الطلاب",
              value: stats.students,
              subtitle: "إجمالي الطلاب في المدرسة",
              icon: <Users size={22} />,
              tone: "blue",
              large: true,
              progress: stats.students > 0 ? 100 : 0,
              loading: schoolLoading || loading,
            },
            {
              title: "المعلمون",
              value: stats.teachers,
              subtitle: "إجمالي الكادر التعليمي",
              icon: <GraduationCap size={22} />,
              tone: "green",
              large: true,
              progress: stats.teachers > 0 ? 100 : 0,
              loading: schoolLoading || loading,
            },
            {
              title: "الفصول",
              value: stats.classrooms,
              caption: "الفصول النشطة في المدرسة",
              icon: <Building2 size={20} />,
              tone: "gold",
              loading: schoolLoading || loading,
            },
            {
              title: "المواد",
              value: stats.subjects,
              caption: "المواد الدراسية المعتمدة",
              icon: <BookOpen size={20} />,
              tone: "teal",
              loading: schoolLoading || loading,
            },
          ]}
        />

        <ExecutiveHealth
          systemHealth={systemHealth}
          dataQuality={dataQuality}
          attendanceRate={attendanceRate}
          unreadNotifications={stats.unreadNotifications}
        />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <SmartInsights insights={insights} />
          <ActivityFeed items={activityFeed} />
        </section>

        <ExecutiveCharts
          attendance={attendanceTrend}
          averageScore={stats.averageScore}
          behaviorNotes={stats.behaviorNotes}
        />

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
          <div className="xl:col-span-2">
            <QuickLauncher actions={filteredActions.slice(0, 8)} />
          </div>

          <ExternalSystems systems={EXTERNAL_SYSTEMS} />
        </section>

        <PortalGrid portals={visiblePortals} />
      </div>
    </AuthGuard>
  );
}

"use client";

import Link from "next/link";
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
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryInsightCard from "@/components/ui/cards/SummaryCard";
import Section from "@/components/ui/page/PageSection";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading";
import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Award,
  Bell,
  BookOpenCheck,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  Clock3,
  GraduationCap,
  HeartPulse,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  User,
} from "lucide-react";

type StudentProfile = {
  id: string;
  school_id?: string | null;
  full_name?: string | null;
  name?: string | null;
  student_name?: string | null;
  student_number?: string | null;
  grade_level?: string | null;
  grade_name?: string | null;
  classroom?: string | null;
  classroom_name?: string | null;
  class_name?: string | null;
  section?: string | null;
  status?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  email?: string | null;
  student_email?: string | null;
  auth_user_id?: string | null;
  user_id?: string | null;
};

type AttendanceRow = {
  id: string;
  attendance_date?: string | null;
  status?: string | null;
  attendance_status?: string | null;
  period_number?: number | null;
  notes?: string | null;
  created_at?: string | null;
};

type GradeRow = {
  id: string;
  subject?: string | null;
  subject_name?: string | null;
  score?: number | null;
  max_score?: number | null;
  total_score?: number | null;
  percentage?: number | null;
  grade_label?: string | null;
  result_status?: string | null;
  semester?: string | null;
  academic_year?: string | null;
  created_at?: string | null;
};

type BehaviorRow = {
  id: string;
  violation_type?: string | null;
  violation_level?: string | null;
  status?: string | null;
  behavior_date?: string | null;
  created_at?: string | null;
};

type ReferralRow = {
  id: string;
  reason?: string | null;
  status?: string | null;
  referred_at?: string | null;
  created_at?: string | null;
};

type NotificationItem = {
  id: string;
  title?: string | null;
  message?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

type ScheduleRow = {
  id: string;
  day_name?: string | null;
  period_number?: number | null;
  class_name?: string | null;
  classroom_name?: string | null;
  section?: string | null;
  subject?: string | null;
  subject_name?: string | null;
  room?: string | null;
};

type HealthVisit = {
  id: string;
  visit_date?: string | null;
  symptoms?: string | null;
  visit_status?: string | null;
};

type TimelineRow = {
  id: string;
  event_type?: string | null;
  event_title?: string | null;
  event_description?: string | null;
  event_time?: string | null;
  created_at?: string | null;
};

type QueryResult<T> = { data: T | null; error: unknown };
type QueryLike<T> = PromiseLike<QueryResult<T>>;

type QuickLink = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: "blue" | "green" | "amber" | "red" | "slate";
};

type StudentInsightTone = "green" | "gold" | "red" | "blue" | "teal";

type StudentInsight = {
  title: string;
  description: string;
  tone: StudentInsightTone;
  icon: ReactNode;
};

type StudentHealth = {
  academicScore: number;
  attendanceScore: number;
  behaviorScore: number;
  engagementScore: number;
  successScore: number;
  riskLevel: "مستقر" | "متابعة" | "خطر";
};

type DistributionItem = {
  name: string;
  value: number;
};


const PAGE_ROLES: SchoolRole[] = ["super_admin", "school_admin", "student"];

const QUICK_LINKS: QuickLink[] = [
  {
    title: "درجاتي",
    description: "عرض الدرجات حسب المواد والفصل الدراسي.",
    href: "/student-portal/grades",
    icon: Award,
    color: "blue",
  },
  {
    title: "حضوري",
    description: "متابعة سجل الحضور والغياب والتأخر.",
    href: "/student-portal/attendance",
    icon: CalendarDays,
    color: "green",
  },
  {
    title: "إنجازاتي",
    description: "الأنشطة، المشاركات، الشواهد، والتكريمات.",
    href: "/student-portfolio",
    icon: Trophy,
    color: "amber",
  },
  {
    title: "التنبيهات",
    description: "آخر الرسائل والتنبيهات المهمة.",
    href: "/notifications",
    icon: Bell,
    color: "red",
  },
  {
    title: "البحث",
    description: "البحث في البيانات المتاحة لك داخل المنصة.",
    href: "/search",
    icon: Search,
    color: "slate",
  },
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function todayArabicDay() {
  return new Date().toLocaleDateString("ar-SA", { weekday: "long" });
}

function todayLabel() {
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
    return value;
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

async function safeQuery<T>(
  query: QueryLike<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    const result = await query;

    if (result.error) {
      console.warn(`student portal query skipped: ${label}`, result.error);
      return fallback;
    }

    return result.data ?? fallback;
  } catch (error) {
    console.warn(`student portal query failed: ${label}`, error);
    return fallback;
  }
}

function studentName(student: StudentProfile | null) {
  return student?.full_name || student?.student_name || student?.name || "الطالب";
}

function studentClass(student: StudentProfile | null) {
  return student?.classroom_name || student?.classroom || student?.class_name || "";
}

function classLabel(student: StudentProfile | null) {
  if (!student) return "—";

  const grade = student.grade_name || student.grade_level || "مرحلة غير محددة";
  const classroom = studentClass(student) || "فصل غير محدد";
  const section = student.section ? ` - ${student.section}` : "";

  return `${grade} | ${classroom}${section}`;
}

function normalizeAttendanceStatus(value?: string | null) {
  const status = String(value || "").trim();

  if (status === "present" || status === "حاضر") return "حاضر";
  if (status === "absent" || status === "غائب") return "غائب";
  if (status === "late" || status === "متأخر") return "متأخر";
  if (status === "excused" || status === "مستأذن") return "مستأذن";

  return status || "غير مسجل";
}

function isPresent(status?: string | null) {
  return normalizeAttendanceStatus(status) === "حاضر";
}

function isAbsent(status?: string | null) {
  return normalizeAttendanceStatus(status) === "غائب";
}

function isLate(status?: string | null) {
  return normalizeAttendanceStatus(status) === "متأخر";
}

function isOpenReferral(status?: string | null) {
  const value = String(status || "").trim();

  return ![
    "مغلق",
    "مغلقة",
    "تم الإغلاق",
    "مكتملة",
    "مستقرة",
    "عاد للفصل",
    "تم التحسن",
    "تم تحقيق الأهداف",
  ].includes(value);
}

function gradePercentage(item: GradeRow) {
  const explicit = Number(item.percentage);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const total = Number(item.total_score);
  if (Number.isFinite(total) && total > 0) return total;

  const score = Number(item.score);
  const max = Number(item.max_score);

  if (Number.isFinite(score) && Number.isFinite(max) && max > 0) {
    return Math.round((score / max) * 100);
  }

  return 0;
}

function gradeColor(value: number) {
  if (value >= 90) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (value >= 75) return "bg-blue-50 text-blue-700 border-blue-100";
  if (value >= 60) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-red-50 text-red-700 border-red-100";
}

function attendanceColor(value: number) {
  if (value >= 90) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (value >= 80) return "bg-blue-50 text-blue-700 border-blue-100";
  if (value >= 70) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-red-50 text-red-700 border-red-100";
}

function quickColorClasses(color: QuickLink["color"]) {
  const colors = {
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    green: "bg-[#07A869]/10 text-[#07A869]",
    amber: "bg-[#C1B489]/20 text-[#15445A]",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return colors[color];
}

function isAchievementEvent(item: TimelineRow) {
  const text = `${item.event_type || ""} ${item.event_title || ""}`.toLowerCase();

  return (
    text.includes("achievement") ||
    text.includes("award") ||
    text.includes("activity") ||
    text.includes("إنجاز") ||
    text.includes("تكريم") ||
    text.includes("نشاط") ||
    text.includes("مشاركة") ||
    text.includes("شهادة")
  );
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function insightTone(tone: StudentInsightTone) {
  const tones: Record<StudentInsightTone, string> = {
    green: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
    gold: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    red: "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    teal: "bg-[var(--app-teal-soft)] text-[var(--app-teal)]",
  };

  return tones[tone];
}

function progressTone(tone: StudentInsightTone) {
  const tones: Record<StudentInsightTone, string> = {
    green: "bg-[var(--app-green)]",
    gold: "bg-[var(--app-accent)]",
    red: "bg-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue)]",
    teal: "bg-[var(--app-teal)]",
  };

  return tones[tone];
}

function buildStudyRecommendations(
  health: StudentHealth,
  stats: {
    absent: number;
    late: number;
    averageGrade: number;
    behaviorCount: number;
    achievements: number;
    openReferrals: number;
  },
) {
  const recommendations: string[] = [];

  if (health.academicScore < 70) {
    recommendations.push("خصص وقتًا يوميًا للمراجعة وابدأ بالمواد الأقل نتيجة.");
  }

  if (health.attendanceScore < 85 || stats.absent >= 3) {
    recommendations.push("رفع الانتظام والحضور سيحسن أداءك الأكاديمي بشكل مباشر.");
  }

  if (stats.late >= 3) {
    recommendations.push("جهّز حقيبتك ونومك مبكرًا لتقليل حالات التأخر.");
  }

  if (health.behaviorScore < 85 || stats.behaviorCount > 0) {
    recommendations.push("راجع السجلات السلوكية واستفد من دعم المرشد الطلابي.");
  }

  if (stats.openReferrals > 0) {
    recommendations.push("تابع الإحالة المفتوحة مع الجهة المختصة حتى الإغلاق.");
  }

  if (stats.achievements === 0) {
    recommendations.push("شارك في نشاط أو مسابقة هذا الفصل لبناء ملف إنجاز قوي.");
  }

  return recommendations.length
    ? recommendations
    : ["أداؤك مستقر؛ حافظ على نفس المستوى وحدد هدفًا أعلى للفترة القادمة."];
}


export default function StudentPortalPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [behavior, setBehavior] = useState<BehaviorRow[]>([]);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [healthVisits, setHealthVisits] = useState<HealthVisit[]>([]);

  const [loading, setLoading] = useState(true);
  const [studentDataLoading, setStudentDataLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const today = todayDate();
  const todayName = todayArabicDay();

  const resetPage = useCallback(() => {
    setStudent(null);
    setAttendance([]);
    setGrades([]);
    setBehavior([]);
    setReferrals([]);
    setNotifications([]);
    setSchedule([]);
    setTimeline([]);
    setHealthVisits([]);
  }, []);

  const loadStudentProfile = useCallback(async (): Promise<StudentProfile | null> => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;

    const email = user?.email?.trim().toLowerCase() || "";

    if (!email || !currentSchool?.id) return null;

    const attempts = [
      supabase
        .from("students")
        .select("*")
        .eq("school_id", currentSchool.id)
        .eq("auth_user_id", user?.id || "")
        .maybeSingle(),
      supabase
        .from("students")
        .select("*")
        .eq("school_id", currentSchool.id)
        .eq("user_id", user?.id || "")
        .maybeSingle(),
      supabase
        .from("students")
        .select("*")
        .eq("school_id", currentSchool.id)
        .eq("email", email)
        .maybeSingle(),
      supabase
        .from("students")
        .select("*")
        .eq("school_id", currentSchool.id)
        .eq("student_email", email)
        .maybeSingle(),
    ];

    for (const attempt of attempts) {
      const result = await safeQuery<StudentProfile | null>(
        attempt,
        null,
        "student-profile",
      );

      if (result?.id) return result;
    }

    return null;
  }, [currentSchool?.id]);

  const loadNotifications = useCallback(async () => {
    if (!currentSchool?.id) return;

    const rows = await safeQuery<NotificationItem[]>(
      supabase
        .from("notifications")
        .select("id, title, message, is_read, created_at")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false })
        .limit(6),
      [],
      "notifications",
    );

    setNotifications(rows);
  }, [currentSchool?.id]);

  const loadStudentData = useCallback(
    async (loadedStudent: StudentProfile) => {
      if (!currentSchool?.id) return;

      const studentId = loadedStudent.id;
      const className = studentClass(loadedStudent);
      const section = loadedStudent.section || "";

      setStudentDataLoading(true);

      let scheduleQuery = supabase
        .from("teacher_schedule")
        .select("id, day_name, period_number, class_name, section, subject, room")
        .eq("school_id", currentSchool.id)
        .eq("class_name", className)
        .order("period_number", { ascending: true });

      if (section) {
        scheduleQuery = scheduleQuery.eq("section", section);
      }

      const [
        attendanceRows,
        gradeRows,
        behaviorRows,
        referralRows,
        scheduleRows,
        timelineRows,
        healthRows,
      ] = await Promise.all([
        safeQuery<AttendanceRow[]>(
          supabase
            .from("student_attendance_records")
            .select(
              "id, attendance_date, status, attendance_status, period_number, notes, created_at",
            )
            .eq("school_id", currentSchool.id)
            .eq("student_id", studentId)
            .order("attendance_date", { ascending: false })
            .limit(30),
          [],
          "student_attendance_records",
        ),
        safeQuery<GradeRow[]>(
          supabase
            .from("grades")
            .select(
              "id, subject, subject_name, score, max_score, total_score, percentage, grade_label, result_status, semester, academic_year, created_at",
            )
            .eq("school_id", currentSchool.id)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
            .limit(20),
          [],
          "grades",
        ),
        safeQuery<BehaviorRow[]>(
          supabase
            .from("student_behavior")
            .select("id, violation_type, violation_level, status, behavior_date, created_at")
            .eq("school_id", currentSchool.id)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
            .limit(10),
          [],
          "student_behavior",
        ),
        safeQuery<ReferralRow[]>(
          supabase
            .from("student_referrals")
            .select("id, reason, status, referred_at, created_at")
            .eq("school_id", currentSchool.id)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
            .limit(10),
          [],
          "student_referrals",
        ),
        safeQuery<ScheduleRow[]>(scheduleQuery, [], "teacher_schedule"),
        safeQuery<TimelineRow[]>(
          supabase
            .from("student_timeline")
            .select("id, event_type, event_title, event_description, event_time, created_at")
            .eq("school_id", currentSchool.id)
            .eq("student_id", studentId)
            .order("event_time", { ascending: false })
            .limit(30),
          [],
          "student_timeline",
        ),
        safeQuery<HealthVisit[]>(
          supabase
            .from("health_visits")
            .select("id, visit_date, symptoms, visit_status")
            .eq("school_id", currentSchool.id)
            .eq("student_id", studentId)
            .order("visit_date", { ascending: false })
            .limit(10),
          [],
          "health_visits",
        ),
      ]);

      setAttendance(attendanceRows);
      setGrades(gradeRows);
      setBehavior(behaviorRows);
      setReferrals(referralRows);
      setSchedule(scheduleRows);
      setTimeline(timelineRows);
      setHealthVisits(healthRows);
      setStudentDataLoading(false);
    },
    [currentSchool?.id],
  );

  const loadPage = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const loadedStudent = await loadStudentProfile();
      setStudent(loadedStudent);

      await loadNotifications();

      if (loadedStudent?.id) {
        await loadStudentData(loadedStudent);
      } else {
        setAttendance([]);
        setGrades([]);
        setBehavior([]);
        setReferrals([]);
        setSchedule([]);
        setTimeline([]);
        setHealthVisits([]);
      }
    } catch (error) {
      resetPage();
      setErrorMsg(getErrorMessage(error, "تعذر تحميل بوابة الطالب."));
    } finally {
      setLoading(false);
    }
  }, [
    currentSchool?.id,
    loadNotifications,
    loadStudentData,
    loadStudentProfile,
    resetPage,
  ]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      resetPage();
      setErrorMsg("لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      setLoading(false);
      return;
    }

    queueMicrotask(() => {
      void loadPage();
    });
  }, [currentSchool?.id, loadPage, resetPage, schoolLoading]);

  const stats = useMemo(() => {
    const validAttendance = attendance.filter((item) =>
      ["حاضر", "present", "غائب", "absent", "متأخر", "late"].includes(
        String(item.attendance_status || item.status || ""),
      ),
    );

    const present = validAttendance.filter((item) =>
      isPresent(item.attendance_status || item.status),
    ).length;
    const absent = validAttendance.filter((item) =>
      isAbsent(item.attendance_status || item.status),
    ).length;
    const late = validAttendance.filter((item) =>
      isLate(item.attendance_status || item.status),
    ).length;

    const numericGrades = grades
      .map((item) => gradePercentage(item))
      .filter((value) => value > 0);

    const averageGrade = numericGrades.length
      ? Math.round(
          numericGrades.reduce((sum, value) => sum + value, 0) /
            numericGrades.length,
        )
      : 0;

    const openReferrals = referrals.filter((item) =>
      isOpenReferral(item.status),
    ).length;

    const achievements = timeline.filter(isAchievementEvent).length;

    return {
      attendanceRecords: validAttendance.length,
      attendanceRate: validAttendance.length
        ? Math.round((present / validAttendance.length) * 100)
        : 0,
      absent,
      late,
      averageGrade,
      behaviorCount: behavior.length,
      healthCount: healthVisits.length,
      openReferrals,
      achievements,
      scheduleCount: schedule.length,
      unreadNotifications: notifications.filter(
        (item) => item.is_read === false,
      ).length,
    };
  }, [attendance, grades, behavior, referrals, notifications, schedule, timeline, healthVisits]);

  const smartAlerts = useMemo(() => {
    const items: string[] = [];

    if (stats.attendanceRecords === 0) {
      items.push("لا توجد سجلات حضور كافية لاحتساب نسبة الحضور.");
    }

    if (stats.absent >= 3) {
      items.push(`لديك ${stats.absent} حالات غياب، احرص على الانتظام.`);
    }

    if (stats.late >= 3) {
      items.push(`لديك ${stats.late} حالات تأخر، حاول الحضور مبكرًا.`);
    }

    if (stats.averageGrade > 0 && stats.averageGrade < 70) {
      items.push("متوسط الدرجات يحتاج تحسينًا ومتابعة مستمرة.");
    }

    if (stats.behaviorCount > 0) {
      items.push("توجد سجلات سلوكية مسجلة، راجع الإرشاد الطلابي عند الحاجة.");
    }

    if (stats.openReferrals > 0) {
      items.push("توجد إحالة مفتوحة قيد المتابعة.");
    }

    if (stats.scheduleCount === 0) {
      items.push("لم يتم العثور على جدول دراسي مرتبط بفصلك حتى الآن.");
    }

    return items;
  }, [stats]);

  const health = useMemo<StudentHealth>(() => {
    const academicScore = stats.averageGrade || 0;
    const attendanceScore =
      stats.attendanceRecords > 0 ? stats.attendanceRate : 0;
    const behaviorScore = Math.max(
      0,
      100 - stats.behaviorCount * 8 - stats.openReferrals * 10,
    );
    const engagementScore = Math.min(
      100,
      stats.achievements * 15 +
        Math.min(25, stats.scheduleCount * 3) +
        Math.max(0, 25 - stats.unreadNotifications * 2),
    );

    const weightedValues = [
      { value: academicScore, weight: 0.4 },
      { value: attendanceScore, weight: 0.3 },
      { value: behaviorScore, weight: 0.2 },
      { value: engagementScore, weight: 0.1 },
    ];

    const successScore = Math.round(
      weightedValues.reduce(
        (sum, item) => sum + item.value * item.weight,
        0,
      ),
    );

    return {
      academicScore,
      attendanceScore,
      behaviorScore,
      engagementScore,
      successScore,
      riskLevel:
        successScore >= 80
          ? "مستقر"
          : successScore >= 60
            ? "متابعة"
            : "خطر",
    };
  }, [stats]);

  const subjectDistribution = useMemo<DistributionItem[]>(() => {
    return grades
      .map((item) => ({
        name: item.subject_name || item.subject || "مادة",
        value: gradePercentage(item),
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [grades]);

  const timelineFeed = useMemo(() => {
    const items = [
      ...timeline.map((item) => ({
        id: `timeline-${item.id}`,
        title: item.event_title || item.event_type || "حدث",
        description: item.event_description || "حدث مسجل في ملف الطالب.",
        date: item.event_time || item.created_at,
        tone: "blue" as StudentInsightTone,
      })),
      ...notifications.map((item) => ({
        id: `notification-${item.id}`,
        title: item.title || "تنبيه",
        description: item.message || "تنبيه جديد.",
        date: item.created_at,
        tone: item.is_read === false
          ? ("gold" as StudentInsightTone)
          : ("teal" as StudentInsightTone),
      })),
      ...attendance.slice(0, 8).map((item) => ({
        id: `attendance-${item.id}`,
        title: `الحضور: ${normalizeAttendanceStatus(
          item.attendance_status || item.status,
        )}`,
        description: item.notes || "تم تحديث سجل الحضور.",
        date: item.attendance_date || item.created_at,
        tone: isAbsent(item.attendance_status || item.status)
          ? ("red" as StudentInsightTone)
          : ("green" as StudentInsightTone),
      })),
    ];

    return items
      .sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10);
  }, [attendance, notifications, timeline]);

  const enterpriseInsights = useMemo<StudentInsight[]>(() => {
    const items: StudentInsight[] = [];

    if (health.riskLevel === "خطر") {
      items.push({
        title: "مؤشر النجاح يحتاج تدخلًا",
        description: `مؤشر النجاح الحالي ${health.successScore}% ويحتاج خطة تحسين واضحة.`,
        tone: "red",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    }

    if (stats.averageGrade > 0 && stats.averageGrade < 70) {
      items.push({
        title: "الأداء الأكاديمي يحتاج دعمًا",
        description: `متوسط الدرجات الحالي ${stats.averageGrade}%.`,
        tone: "gold",
        icon: <TrendingUp className="h-5 w-5" />,
      });
    }

    if (stats.attendanceRecords > 0 && stats.attendanceRate < 85) {
      items.push({
        title: "الانتظام يؤثر على الأداء",
        description: `نسبة الحضور الحالية ${stats.attendanceRate}% وتحتاج إلى تحسن.`,
        tone: "blue",
        icon: <CalendarDays className="h-5 w-5" />,
      });
    }

    if (stats.achievements > 0) {
      items.push({
        title: "ملف إنجاز نشط",
        description: `لديك ${stats.achievements} إنجازات أو مشاركات مسجلة.`,
        tone: "teal",
        icon: <Trophy className="h-5 w-5" />,
      });
    }

    if (items.length === 0) {
      items.push({
        title: "أداؤك مستقر",
        description: "لا توجد مؤشرات حرجة حاليًا؛ استمر في التقدم.",
        tone: "green",
        icon: <Sparkles className="h-5 w-5" />,
      });
    }

    return items.slice(0, 4);
  }, [health, stats]);

  const studyRecommendations = useMemo(
    () =>
      buildStudyRecommendations(health, {
        absent: stats.absent,
        late: stats.late,
        averageGrade: stats.averageGrade,
        behaviorCount: stats.behaviorCount,
        achievements: stats.achievements,
        openReferrals: stats.openReferrals,
      }),
    [health, stats],
  );

  const todayAttendance = useMemo(() => {
    return attendance.find((item) => item.attendance_date === today) || null;
  }, [attendance, today]);

  const nextScheduleItems = useMemo(() => {
    const todayItems = schedule.filter((item) => item.day_name === todayName);
    return (todayItems.length > 0 ? todayItems : schedule).slice(0, 6);
  }, [schedule, todayName]);

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
        <main className="space-y-6" dir="rtl">
          <PageHeader
            variant="hero"
            title={`أهلًا، ${studentName(student)}`}
            description="بوابة الطالب لمتابعة الدرجات، الحضور، السلوك، الإحالات، التنبيهات، الجدول الدراسي، والإنجازات في مكان واحد."
            badge="بوابة الطالب"
            icon={<GraduationCap size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة الطالب" },
            ]}
            meta={[
              { label: "اليوم", value: todayLabel() },
              { label: "المدرسة", value: currentSchool?.school_name || "غير محدد" },
              { label: "الصف والفصل", value: classLabel(student) },
              { label: "رقم الطالب", value: student?.student_number || "—" },
            ]}
            stats={[
              { label: "نسبة الحضور", value: stats.attendanceRecords > 0 ? `${stats.attendanceRate}%` : "—", icon: <CalendarDays size={20} />, tone: stats.attendanceRate >= 90 ? "green" : stats.attendanceRate >= 75 ? "gold" : "red" },
              { label: "متوسط الدرجات", value: stats.averageGrade ? `${stats.averageGrade}%` : "—", icon: <Award size={20} />, tone: stats.averageGrade >= 90 ? "green" : stats.averageGrade >= 70 ? "gold" : stats.averageGrade > 0 ? "red" : "slate" },
              { label: "الإنجازات", value: stats.achievements, icon: <Trophy size={20} />, tone: stats.achievements > 0 ? "green" : "teal" },
              { label: "التنبيهات", value: stats.unreadNotifications, icon: <Bell size={20} />, tone: stats.unreadNotifications > 0 ? "gold" : "green" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void loadPage()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>

                <Link
                  href="/notifications"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0DA9A6] hover:shadow-md"
                >
                  <Bell size={17} />
                  التنبيهات
                </Link>

                <Link
                  href="/search"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Search size={17} />
                  البحث
                </Link>
              </>
            }
          />

          {errorMsg && (
            <SummaryInsightCard
              title="تعذر تحميل بعض البيانات"
              description={errorMsg}
              tone="red"
              icon={<AlertTriangle size={22} />}
            />
          )}

          {!student ? (
            <EmptyBox text="لم يتم العثور على ملف طالب مرتبط بهذا الحساب. تأكد أن بريد الطالب أو auth_user_id في جدول students مطابق لحساب تسجيل الدخول." />
          ) : (
            <>
              {studentDataLoading && (
                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-700">
                  جاري تحديث بيانات الطالب...
                </div>
              )}
              {smartAlerts.length > 0 && (
                <SummaryInsightCard
                  title="تنبيهات ذكية تحتاج انتباهك"
                  description="ملاحظات سريعة مبنية على بيانات الحضور والدرجات والسلوك."
                  tone="gold"
                  icon={<AlertTriangle size={22} />}
                  items={smartAlerts.map((item) => item)}
                />
              )}

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-7">
                <ExecutiveCard
                  title="نسبة الحضور"
                  value={stats.attendanceRecords > 0 ? `${stats.attendanceRate}%` : "—"}
                  subtitle="آخر سجلات الحضور"
                  icon={<CalendarDays size={22} />}
                  tone={stats.attendanceRecords === 0 ? "primary" : stats.attendanceRate >= 90 ? "green" : stats.attendanceRate >= 75 ? "gold" : "red"}
                  progress={stats.attendanceRate}
                />

                <ExecutiveCard
                  title="متوسط الدرجات"
                  value={stats.averageGrade ? `${stats.averageGrade}%` : "—"}
                  subtitle="متوسط آخر الدرجات"
                  icon={<Award size={22} />}
                  tone={stats.averageGrade >= 90 ? "green" : stats.averageGrade >= 70 ? "gold" : stats.averageGrade > 0 ? "red" : "primary"}
                  progress={stats.averageGrade}
                />

                <ExecutiveCard
                  title="غياب / تأخر"
                  value={`${stats.absent} / ${stats.late}`}
                  subtitle="حالات تحتاج متابعة"
                  icon={<AlertTriangle size={22} />}
                  tone={stats.absent > 2 || stats.late > 2 ? "red" : "gold"}
                />

                <ExecutiveCard
                  title="حالة اليوم"
                  value={normalizeAttendanceStatus(todayAttendance?.attendance_status || todayAttendance?.status)}
                  subtitle="آخر حالة مسجلة"
                  icon={<CheckCircle2 size={22} />}
                  tone={todayAttendance ? "green" : "primary"}
                />

                <ExecutiveCard
                  title="السلوك"
                  value={stats.behaviorCount}
                  subtitle="سجلات سلوكية"
                  icon={<ShieldAlert size={22} />}
                  tone={stats.behaviorCount > 0 ? "gold" : "green"}
                />

                <ExecutiveCard
                  title="الإنجازات"
                  value={stats.achievements}
                  subtitle="إنجازات ومشاركات"
                  icon={<Trophy size={22} />}
                  tone={stats.achievements > 0 ? "green" : "primary"}
                />

                <ExecutiveCard
                  title="تنبيهات"
                  value={stats.unreadNotifications}
                  subtitle="غير مقروءة"
                  icon={<Bell size={22} />}
                  tone={stats.unreadNotifications > 0 ? "red" : "green"}
                />
              </section>

              <SummaryInsightCard
                title="الملخص التنفيذي للطالب"
                description="قراءة سريعة لحالة الطالب الأكاديمية والسلوكية والحضور."
                tone={stats.averageGrade >= 70 && stats.attendanceRate >= 80 ? "green" : "gold"}
                items={[
                  { label: "مؤشر الحضور", value: stats.attendanceRecords > 0 ? `${stats.attendanceRate}%` : "—" },
                  { label: "متوسط الدرجات", value: stats.averageGrade ? `${stats.averageGrade}%` : "—" },
                  { label: "الغياب", value: stats.absent },
                  { label: "التأخر", value: stats.late },
                  { label: "الإحالات المفتوحة", value: stats.openReferrals },
                  { label: "الإنجازات", value: stats.achievements },
                ]}
                footer="تعتمد هذه المؤشرات على البيانات المسجلة في المنصة، وتزداد دقتها مع اكتمال الحضور والدرجات والجدول."
              />


              <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <StudentSuccessAnalytics
                  health={health}
                  stats={stats}
                  className={classLabel(student)}
                />

                <StudentSmartInsights insights={enterpriseInsights} />
              </section>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <StudentHealthPanel health={health} />

                <StudentAcademicProgress
                  subjects={subjectDistribution}
                  average={stats.averageGrade}
                />

                <StudentStudyPlan recommendations={studyRecommendations} />
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[.85fr_1.15fr]">
                <Panel title="بطاقة الطالب" icon={<User size={24} />}>
                  <div className="space-y-3">
                    <InfoRow label="الاسم" value={studentName(student)} />
                    <InfoRow
                      label="رقم الطالب"
                      value={student.student_number || "—"}
                    />
                    <InfoRow
                      label="المرحلة والفصل"
                      value={classLabel(student)}
                    />
                    <InfoRow label="الحالة" value={student.status || "منتظم"} />
                    <InfoRow
                      label="ولي الأمر"
                      value={student.guardian_name || "—"}
                    />
                    <InfoRow
                      label="جوال ولي الأمر"
                      value={student.guardian_phone || "—"}
                    />
                  </div>
                </Panel>

                <Panel title="مؤشرات الطالب" icon={<Sparkles size={24} />}>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <MetricBox
                      title="مؤشر الحضور"
                      value={
                        stats.attendanceRecords > 0
                          ? `${stats.attendanceRate}%`
                          : "—"
                      }
                      className={attendanceColor(stats.attendanceRate)}
                      description="يعتمد على آخر سجلات الحضور المسجلة."
                    />

                    <MetricBox
                      title="المستوى الدراسي"
                      value={stats.averageGrade ? `${stats.averageGrade}%` : "—"}
                      className={gradeColor(stats.averageGrade)}
                      description="متوسط آخر درجات الطالب المتاحة."
                    />

                    <MetricBox
                      title="زيارات العيادة"
                      value={stats.healthCount}
                      className="bg-blue-50 text-blue-700 border-blue-100"
                      description="زيارات أو تحويلات صحية مسجلة للطالب."
                    />

                    <MetricBox
                      title="الإحالات المفتوحة"
                      value={stats.openReferrals}
                      className={
                        stats.openReferrals === 0
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-red-50 text-red-700 border-red-100"
                      }
                      description="الإحالات التي لا تزال قيد المتابعة."
                    />
                  </div>
                </Panel>
              </section>


              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <StudentTodayHub
                  schedule={nextScheduleItems}
                  attendance={todayAttendance}
                  unreadNotifications={stats.unreadNotifications}
                />

                <StudentUnifiedTimeline items={timelineFeed} />
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {QUICK_LINKS.map((link) => (
                  <QuickLinkCard key={link.href} link={link} />
                ))}
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
                <Panel title="جدولي الدراسي" icon={<BookOpenCheck size={24} />}>
                  {nextScheduleItems.length === 0 ? (
                    <EmptyBox text="لا يوجد جدول دراسي مرتبط بفصلك حتى الآن." />
                  ) : (
                    <div className="space-y-2">
                      {nextScheduleItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                        >
                          <div>
                            <p className="font-black text-[#15445A]">
                              {item.subject || item.subject_name || "مادة غير محددة"}
                            </p>

                            <p className="text-xs text-slate-400">
                              {item.day_name || "—"} • الحصة{" "}
                              {item.period_number || "—"} • القاعة{" "}
                              {item.room || "—"}
                            </p>
                          </div>

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                            {item.class_name || item.classroom_name || student.class_name || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="آخر الدرجات" icon={<Award size={24} />}>
                  {grades.length === 0 ? (
                    <EmptyBox text="لا توجد درجات مسجلة حتى الآن." />
                  ) : (
                    <div className="space-y-3">
                      {grades.slice(0, 6).map((item) => {
                        const percent = gradePercentage(item);

                        return (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-black text-[#15445A]">
                                  {item.subject_name || item.subject || "مادة"}
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                  {item.semester || "الفصل الدراسي"} —{" "}
                                  {item.academic_year || "العام الدراسي"}
                                </p>
                              </div>

                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-black ${gradeColor(
                                  percent,
                                )}`}
                              >
                                {percent ? `${percent}%` : "—"}
                              </span>
                            </div>

                            <p className="mt-3 text-sm font-bold text-slate-500">
                              {item.grade_label || item.result_status || "—"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Panel>
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
                <Panel title="سجل الحضور الأخير" icon={<CalendarDays size={24} />}>
                  {todayAttendance && (
                    <div className="mb-4 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-400">
                        حضور اليوم
                      </p>

                      <p className="mt-1 text-xl font-black text-[#15445A]">
                        {normalizeAttendanceStatus(
                          todayAttendance.attendance_status || todayAttendance.status,
                        )}
                      </p>
                    </div>
                  )}

                  {attendance.length === 0 ? (
                    <EmptyBox text="لا توجد سجلات حضور." />
                  ) : (
                    <div className="space-y-2">
                      {attendance.slice(0, 8).map((item) => {
                        const status = normalizeAttendanceStatus(
                          item.attendance_status || item.status,
                        );

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                          >
                            <div>
                              <p className="font-black text-[#15445A]">
                                {formatDate(item.attendance_date)}
                              </p>

                              <p className="text-xs text-slate-400">
                                {item.notes || "—"}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                status === "حاضر"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : status === "غائب"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
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

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
                <Panel title="السلوك والإحالات" icon={<ShieldAlert size={24} />}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="mb-3 font-black text-[#15445A]">
                        السجلات السلوكية
                      </h3>

                      {behavior.length === 0 ? (
                        <EmptyBox text="لا توجد سجلات سلوكية." />
                      ) : (
                        <div className="space-y-2">
                          {behavior.slice(0, 4).map((item) => (
                            <SmallRecord
                              key={item.id}
                              title={item.violation_type || "سجل سلوكي"}
                              subtitle={item.violation_level || item.status || "—"}
                              date={item.behavior_date || item.created_at}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="mb-3 font-black text-[#15445A]">
                        الإحالات
                      </h3>

                      {referrals.length === 0 ? (
                        <EmptyBox text="لا توجد إحالات." />
                      ) : (
                        <div className="space-y-2">
                          {referrals.slice(0, 4).map((item) => (
                            <SmallRecord
                              key={item.id}
                              title={item.reason || "إحالة"}
                              subtitle={item.status || "—"}
                              date={item.referred_at || item.created_at}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Panel>

                <Panel title="آخر الإنجازات" icon={<Trophy size={24} />}>
                  {timeline.filter(isAchievementEvent).length === 0 ? (
                    <EmptyBox text="لا توجد إنجازات أو مشاركات مسجلة حتى الآن." />
                  ) : (
                    <div className="space-y-2">
                      {timeline
                        .filter(isAchievementEvent)
                        .slice(0, 6)
                        .map((item) => (
                          <SmallRecord
                            key={item.id}
                            title={item.event_title || "إنجاز"}
                            subtitle={item.event_description || item.event_type || "—"}
                            date={item.event_time || item.created_at}
                          />
                        ))}
                    </div>
                  )}
                </Panel>
              </section>
            </>
          )}
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
    <Section title={title} icon={icon} className="transition hover:shadow-md">
      {children}
    </Section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className="text-left font-black text-[#15445A]">{value}</span>
    </div>
  );
}

function MetricBox({
  title,
  value,
  description,
  className,
}: {
  title: string;
  value: string | number;
  description: string;
  className: string;
}) {
  return (
    <div className={`rounded-3xl border p-5 ${className}`}>
      <p className="text-sm font-bold opacity-80">{title}</p>
      <h3 className="mt-2 text-3xl font-black">{value}</h3>
      <p className="mt-3 text-sm leading-7 opacity-80">{description}</p>
    </div>
  );
}

function QuickLinkCard({ link }: { link: QuickLink }) {
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#0DA9A6]/30 hover:shadow-lg"
    >
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition ${quickColorClasses(
          link.color,
        )}`}
      >
        <Icon size={24} />
      </div>

      <h3 className="text-xl font-black text-[#15445A]">{link.title}</h3>

      <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-500">
        {link.description}
      </p>

      <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-black text-[#15445A] transition group-hover:bg-[#15445A] group-hover:text-white">
        فتح
      </div>
    </Link>
  );
}

function SmallRecord({
  title,
  subtitle,
  date,
}: {
  title: string;
  subtitle: string;
  date?: string | null;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="line-clamp-1 font-black text-[#15445A]">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <p className="mt-1 text-xs font-bold text-slate-400">
        {formatDate(date)}
      </p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <EmptyState
      title="لا توجد بيانات"
      description={text}
      className="bg-slate-50"
    />
  );
}

function LoadingBox() {
  return <PageLoader text="جاري تحميل بوابة الطالب..." />;
}


function StudentSuccessAnalytics({
  health,
  stats,
  className,
}: {
  health: StudentHealth;
  stats: {
    attendanceRecords: number;
    attendanceRate: number;
    absent: number;
    late: number;
    averageGrade: number;
    behaviorCount: number;
    healthCount: number;
    openReferrals: number;
    achievements: number;
    scheduleCount: number;
    unreadNotifications: number;
  };
  className: string;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black text-[var(--app-text)]">
          Student Success Analytics
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          مؤشر شامل يجمع التحصيل والحضور والسلوك والمشاركة.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StudentPortalMetric label="مؤشر النجاح" value={`${health.successScore}%`} icon={<Target size={18} />} tone={health.riskLevel === "مستقر" ? "green" : health.riskLevel === "متابعة" ? "gold" : "red"} />
        <StudentPortalMetric label="الأكاديمي" value={`${health.academicScore}%`} icon={<Award size={18} />} tone="blue" />
        <StudentPortalMetric label="الانتظام" value={`${health.attendanceScore}%`} icon={<CalendarDays size={18} />} tone="teal" />
        <StudentPortalMetric label="السلوك" value={`${health.behaviorScore}%`} icon={<ShieldAlert size={18} />} tone="green" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <StudentPortalInfoLine label="التصنيف الحالي" value={health.riskLevel} />
        <StudentPortalInfoLine label="الصف والفصل" value={className} />
        <StudentPortalInfoLine label="الإنجازات" value={stats.achievements} />
        <StudentPortalInfoLine label="الإحالات المفتوحة" value={stats.openReferrals} />
      </div>
    </section>
  );
}

function StudentSmartInsights({
  insights,
}: {
  insights: StudentInsight[];
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
          <BrainCircuit size={20} />
          AI Student Insights
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          ملاحظات شخصية مبنية على بياناتك الحالية.
        </p>
      </div>

      <div className="space-y-3">
        {insights.map((item) => (
          <div
            key={item.title}
            className="flex gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${insightTone(item.tone)}`}>
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-black text-[var(--app-text)]">{item.title}</p>
              <p className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StudentHealthPanel({
  health,
}: {
  health: StudentHealth;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <HeartPulse size={20} />
        Student Health
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        توازن المؤشرات الأكاديمية والسلوكية.
      </p>

      <div className="mt-5 space-y-4">
        <StudentPortalProgress label="الأكاديمي" value={health.academicScore} total={100} tone="blue" suffix="%" />
        <StudentPortalProgress label="الحضور" value={health.attendanceScore} total={100} tone="green" suffix="%" />
        <StudentPortalProgress label="السلوك" value={health.behaviorScore} total={100} tone="teal" suffix="%" />
        <StudentPortalProgress label="المشاركة" value={health.engagementScore} total={100} tone="gold" suffix="%" />
      </div>
    </section>
  );
}

function StudentAcademicProgress({
  subjects,
  average,
}: {
  subjects: DistributionItem[];
  average: number;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <ChartNoAxesCombined size={20} />
        Academic Progress
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مقارنة أحدث نتائج المواد بمتوسطك العام.
      </p>

      <div className="mt-5 space-y-4">
        {subjects.length === 0 ? (
          <p className="text-sm text-[var(--app-text-muted)]">
            لا توجد درجات كافية لعرض التحليل.
          </p>
        ) : (
          subjects.map((item) => (
            <StudentPortalProgress
              key={item.name}
              label={item.name}
              value={item.value}
              total={100}
              tone={item.value >= average ? "green" : item.value >= 60 ? "gold" : "red"}
              suffix="%"
            />
          ))
        )}
      </div>
    </section>
  );
}

function StudentStudyPlan({
  recommendations,
}: {
  recommendations: string[];
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <TrendingUp size={20} />
        Smart Study Plan
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        خطوات عملية مقترحة للفترة القادمة.
      </p>

      <div className="mt-5 space-y-3">
        {recommendations.map((item, index) => (
          <div
            key={`${index}-${item}`}
            className="flex gap-3 rounded-2xl bg-[var(--app-card-soft)] p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--app-teal-soft)] text-sm font-black text-[var(--app-teal)]">
              {index + 1}
            </span>
            <p className="text-sm leading-7 text-[var(--app-text)]">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StudentTodayHub({
  schedule,
  attendance,
  unreadNotifications,
}: {
  schedule: ScheduleRow[];
  attendance: AttendanceRow | null;
  unreadNotifications: number;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <Clock3 size={20} />
        Today Hub
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        ما يهمك اليوم في مكان واحد.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StudentPortalInfoLine
          label="حالة الحضور"
          value={normalizeAttendanceStatus(
            attendance?.attendance_status || attendance?.status,
          )}
        />
        <StudentPortalInfoLine
          label="حصص اليوم"
          value={schedule.length}
        />
        <StudentPortalInfoLine
          label="تنبيهات غير مقروءة"
          value={unreadNotifications}
        />
      </div>

      <div className="mt-4 space-y-2">
        {schedule.slice(0, 4).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-2xl bg-[var(--app-card-soft)] px-4 py-3"
          >
            <div>
              <p className="font-black text-[var(--app-text)]">
                {item.subject || item.subject_name || "مادة"}
              </p>
              <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                الحصة {item.period_number || "—"} · القاعة {item.room || "—"}
              </p>
            </div>
            <CalendarDays size={18} className="text-[var(--app-teal)]" />
          </div>
        ))}
      </div>
    </section>
  );
}

function StudentUnifiedTimeline({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    description: string;
    date?: string | null;
    tone: StudentInsightTone;
  }>;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <Activity size={20} />
        Unified Timeline
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        أحدث الأحداث والتنبيهات والتحديثات.
      </p>

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--app-text-muted)]">
            لا توجد أحداث حديثة.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 rounded-2xl bg-[var(--app-card-soft)] p-4"
            >
              <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${progressTone(item.tone)}`} />
              <div>
                <p className="text-sm font-black text-[var(--app-text)]">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]">
                  {item.description}
                </p>
                <p className="mt-1 text-[11px] font-bold text-[var(--app-text-muted)]">
                  {formatDate(item.date)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function StudentPortalMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: StudentInsightTone;
}) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${insightTone(tone)}`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function StudentPortalInfoLine({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[var(--app-card-soft)] px-3 py-2">
      <span className="text-xs font-bold text-[var(--app-text-muted)]">{label}</span>
      <span className="text-sm font-black text-[var(--app-text)]">{value}</span>
    </div>
  );
}

function StudentPortalProgress({
  label,
  value,
  total,
  tone,
  suffix = "",
}: {
  label: string;
  value: number;
  total: number;
  tone: StudentInsightTone;
  suffix?: string;
}) {
  const width = Math.min(100, Math.max(4, percentage(value, total)));

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-[var(--app-text-muted)]">
        <span>{label}</span>
        <span>{value}{suffix}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--app-card-soft)]">
        <div className={`h-full rounded-full ${progressTone(tone)}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

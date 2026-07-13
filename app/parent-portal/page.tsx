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
import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import { PageLoader } from "@/components/ui/loading";
import { EmptyState as UiEmptyState } from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/feedback/ErrorState";
import RoleGuard from "@/components/auth/RoleGuard";
import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Award,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  GraduationCap,
  HeartPulse,
  MessagesSquare,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
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
  guardian_email?: string | null;
  parent_email?: string | null;
};

type ParentStudentLink = {
  id: string;
  school_id: string;
  parent_user_id: string | null;
  student_id: string;
  parent_national_id: string | null;
  relationship: string | null;
  link_method: string | null;
  status: string | null;
  is_primary_guardian: boolean | null;
  created_at?: string | null;
};

type AttendanceRow = {
  id: string;
  student_id?: string | null;
  attendance_date?: string | null;
  status?: string | null;
  attendance_status?: string | null;
  notes?: string | null;
};

type GradeRow = {
  id: string;
  student_id?: string | null;
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
  student_id?: string | null;
  violation_type?: string | null;
  violation_level?: string | null;
  status?: string | null;
  behavior_date?: string | null;
  created_at?: string | null;
};

type ReferralRow = {
  id: string;
  student_id?: string | null;
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

type SchoolUserRow = {
  id: string;
  school_id?: string | null;
  full_name?: string | null;
  role?: string | null;
  is_active?: boolean | null;
};

type QueryResult<T> = { data: T | null; error: unknown };
type QueryLike<T> = PromiseLike<QueryResult<T>>;

type ParentInsightTone = "green" | "gold" | "red" | "blue" | "teal";

type ParentInsight = {
  title: string;
  description: string;
  tone: ParentInsightTone;
  icon: ReactNode;
};

type ParentHealth = {
  academicScore: number;
  attendanceScore: number;
  behaviorScore: number;
  followUpScore: number;
  overallScore: number;
  level: "مستقر" | "متابعة" | "عاجل";
};

type ChildComparisonItem = {
  studentId: string;
  studentName: string;
  attendanceRate: number;
  averageGrade: number;
  behaviorCount: number;
  openReferrals: number;
  overallScore: number;
};


const PAGE_ROLES: SchoolRole[] = ["super_admin", "school_admin", "parent"];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
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
      console.warn(`parent portal query skipped: ${label}`, result.error);
      return fallback;
    }

    return result.data ?? fallback;
  } catch (error) {
    console.warn(`parent portal query failed: ${label}`, error);
    return fallback;
  }
}

function studentName(student: StudentProfile | null) {
  return student?.full_name || student?.student_name || student?.name || "الطالب";
}

function classLabel(student: StudentProfile | null) {
  if (!student) return "—";

  const grade = student.grade_name || student.grade_level || "مرحلة غير محددة";
  const classroom =
    student.classroom_name ||
    student.classroom ||
    student.class_name ||
    "فصل غير محدد";
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
    "closed",
  ].includes(value);
}

function gradeValue(item: GradeRow) {
  const percentage = Number(item.percentage);
  if (Number.isFinite(percentage) && percentage > 0) return percentage;

  const total = Number(item.total_score);
  if (Number.isFinite(total) && total > 0) return total;

  const score = Number(item.score);
  const max = Number(item.max_score);

  if (Number.isFinite(score) && Number.isFinite(max) && max > 0) {
    return Math.round((score / max) * 100);
  }

  return 0;
}

function attendanceStatusTone(status?: string | null) {
  const normalized = normalizeAttendanceStatus(status);

  if (normalized === "حاضر") return "bg-emerald-50 text-emerald-700";
  if (normalized === "غائب") return "bg-red-50 text-red-700";
  if (normalized === "متأخر") return "bg-amber-50 text-amber-700";

  return "bg-slate-100 text-slate-700";
}

function isAdminRole(role?: string | null) {
  return [
    "super_admin",
    "school_admin",
    "vice_principal",
    "administrative_staff",
  ].includes(String(role || "").trim());
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function insightTone(tone: ParentInsightTone) {
  const tones: Record<ParentInsightTone, string> = {
    green: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
    gold: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    red: "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    teal: "bg-[var(--app-teal-soft)] text-[var(--app-teal)]",
  };

  return tones[tone];
}

function progressTone(tone: ParentInsightTone) {
  const tones: Record<ParentInsightTone, string> = {
    green: "bg-[var(--app-green)]",
    gold: "bg-[var(--app-accent)]",
    red: "bg-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue)]",
    teal: "bg-[var(--app-teal)]",
  };

  return tones[tone];
}

function buildParentRecommendations(
  health: ParentHealth,
  stats: {
    absent: number;
    late: number;
    averageGrade: number;
    behaviorCount: number;
    openReferrals: number;
  },
) {
  const items: string[] = [];

  if (health.academicScore < 70) {
    items.push("راجع المواد الأقل نتيجة وحدد خطة مراجعة أسبوعية مع ابنك.");
  }

  if (health.attendanceScore < 85 || stats.absent >= 3) {
    items.push("تابع الانتظام يوميًا وتواصل مع المدرسة عند تكرر الغياب.");
  }

  if (stats.late >= 3) {
    items.push("نظّم وقت النوم والاستعداد الصباحي لتقليل التأخر.");
  }

  if (health.behaviorScore < 85 || stats.behaviorCount > 0) {
    items.push("راجع السجلات السلوكية ونسّق مع المرشد الطلابي.");
  }

  if (stats.openReferrals > 0) {
    items.push("تابع الإحالات المفتوحة حتى إغلاقها وتوثيق النتائج.");
  }

  return items.length
    ? items
    : ["وضع الطالب مستقر؛ استمر في المتابعة والتحفيز الدوري."];
}


export default function ParentPortalPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [parentLinks, setParentLinks] = useState<ParentStudentLink[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [behavior, setBehavior] = useState<BehaviorRow[]>([]);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [studentDataLoading, setStudentDataLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [childrenComparison, setChildrenComparison] = useState<ChildComparisonItem[]>([]);

  const selectedStudent = useMemo(() => {
    return (
      students.find((student) => student.id === selectedStudentId) ||
      students[0] ||
      null
    );
  }, [students, selectedStudentId]);

  const selectedLink = useMemo(() => {
    if (!selectedStudent) return null;

    return parentLinks.find((link) => link.student_id === selectedStudent.id) || null;
  }, [parentLinks, selectedStudent]);

  const resetStudentData = useCallback(() => {
    setAttendance([]);
    setGrades([]);
    setBehavior([]);
    setReferrals([]);
  }, []);

  const loadStudentData = useCallback(
    async (studentId: string) => {
      if (!currentSchool?.id) return;

      setStudentDataLoading(true);

      const [attendanceRows, gradeRows, behaviorRows, referralRows] =
        await Promise.all([
          safeQuery<AttendanceRow[]>(
            supabase
              .from("student_attendance_records")
              .select("id, student_id, attendance_date, status, attendance_status, notes")
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
                "id, student_id, subject, subject_name, score, max_score, total_score, percentage, grade_label, result_status, semester, academic_year, created_at",
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
              .select("id, student_id, violation_type, violation_level, status, behavior_date, created_at")
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
              .select("id, student_id, reason, status, referred_at, created_at")
              .eq("school_id", currentSchool.id)
              .eq("student_id", studentId)
              .order("created_at", { ascending: false })
              .limit(10),
            [],
            "student_referrals",
          ),
        ]);

      setAttendance(attendanceRows);
      setGrades(gradeRows);
      setBehavior(behaviorRows);
      setReferrals(referralRows);
      setStudentDataLoading(false);
    },
    [currentSchool?.id],
  );

  const loadPage = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user?.id) {
        setStudents([]);
        setParentLinks([]);
        setSelectedStudentId("");
        resetStudentData();
        setErrorMsg("لم يتم العثور على حساب مستخدم نشط.");
        return;
      }

      const schoolUser = await safeQuery<SchoolUserRow | null>(
        supabase
          .from("school_members")
          .select("id, school_id, full_name, role, is_active")
          .eq("auth_user_id", user.id)
          .eq("school_id", currentSchool.id)
          .maybeSingle(),
        null,
        "school_members",
      );

      const adminViewer = isAdminRole(schoolUser?.role);
      let loadedLinks: ParentStudentLink[] = [];

      if (schoolUser?.id) {
        loadedLinks = await safeQuery<ParentStudentLink[]>(
          supabase
            .from("parent_students")
            .select(
              "id, school_id, parent_user_id, student_id, parent_national_id, relationship, link_method, status, is_primary_guardian, created_at",
            )
            .eq("school_id", currentSchool.id)
            .eq("status", "verified")
            .eq("parent_user_id", schoolUser.id)
            .order("is_primary_guardian", { ascending: false }),
          [],
          "parent_students",
        );
      }

      if (loadedLinks.length === 0 && adminViewer) {
        loadedLinks = await safeQuery<ParentStudentLink[]>(
          supabase
            .from("parent_students")
            .select(
              "id, school_id, parent_user_id, student_id, parent_national_id, relationship, link_method, status, is_primary_guardian, created_at",
            )
            .eq("school_id", currentSchool.id)
            .eq("status", "verified")
            .order("created_at", { ascending: false })
            .limit(10),
          [],
          "parent_students-admin",
        );
      }

      setParentLinks(loadedLinks);

      const studentIds = Array.from(
        new Set(
          loadedLinks
            .map((link) => link.student_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      if (studentIds.length === 0) {
        setStudents([]);
        setSelectedStudentId("");
        setChildrenComparison([]);
        resetStudentData();
      } else {
        const loadedStudents = await safeQuery<StudentProfile[]>(
          supabase
            .from("students")
            .select("*")
            .eq("school_id", currentSchool.id)
            .in("id", studentIds)
            .order("full_name", { ascending: true }),
          [],
          "students",
        );

        setStudents(loadedStudents);

        if (loadedStudents.length > 0) {
          const comparisonRows = await Promise.all(
            loadedStudents.map(async (child) => {
              const [childAttendance, childGrades, childBehavior, childReferrals] =
                await Promise.all([
                  safeQuery<AttendanceRow[]>(
                    supabase
                      .from("student_attendance_records")
                      .select("id, attendance_status, status")
                      .eq("school_id", currentSchool.id)
                      .eq("student_id", child.id)
                      .limit(30),
                    [],
                    "children-attendance",
                  ),
                  safeQuery<GradeRow[]>(
                    supabase
                      .from("grades")
                      .select("id, score, max_score, total_score, percentage")
                      .eq("school_id", currentSchool.id)
                      .eq("student_id", child.id)
                      .limit(20),
                    [],
                    "children-grades",
                  ),
                  safeQuery<BehaviorRow[]>(
                    supabase
                      .from("student_behavior")
                      .select("id")
                      .eq("school_id", currentSchool.id)
                      .eq("student_id", child.id)
                      .limit(20),
                    [],
                    "children-behavior",
                  ),
                  safeQuery<ReferralRow[]>(
                    supabase
                      .from("student_referrals")
                      .select("id, status")
                      .eq("school_id", currentSchool.id)
                      .eq("student_id", child.id)
                      .limit(20),
                    [],
                    "children-referrals",
                  ),
                ]);

              const attendanceRecords = childAttendance.filter((item) =>
                ["حاضر", "present", "غائب", "absent", "متأخر", "late"].includes(
                  String(item.attendance_status || item.status || ""),
                ),
              );

              const presentCount = attendanceRecords.filter((item) =>
                isPresent(item.attendance_status || item.status),
              ).length;

              const attendanceRate = attendanceRecords.length
                ? percentage(presentCount, attendanceRecords.length)
                : 0;

              const numericGrades = childGrades
                .map(gradeValue)
                .filter((value) => value > 0);

              const averageGrade = numericGrades.length
                ? Math.round(
                    numericGrades.reduce((sum, value) => sum + value, 0) /
                      numericGrades.length,
                  )
                : 0;

              const openReferrals = childReferrals.filter((item) =>
                isOpenReferral(item.status),
              ).length;

              const behaviorScore = Math.max(0, 100 - childBehavior.length * 8);
              const referralScore = Math.max(0, 100 - openReferrals * 15);
              const overallScore = Math.round(
                averageGrade * 0.4 +
                  attendanceRate * 0.35 +
                  behaviorScore * 0.15 +
                  referralScore * 0.1,
              );

              return {
                studentId: child.id,
                studentName: studentName(child),
                attendanceRate,
                averageGrade,
                behaviorCount: childBehavior.length,
                openReferrals,
                overallScore,
              } satisfies ChildComparisonItem;
            }),
          );

          setChildrenComparison(comparisonRows);

          setSelectedStudentId((current) => {
            const stillExists = loadedStudents.some((student) => student.id === current);
            return stillExists ? current : loadedStudents[0].id;
          });
        } else {
          setSelectedStudentId("");
          setChildrenComparison([]);
          resetStudentData();
        }
      }

      const notificationsRows = await safeQuery<NotificationItem[]>(
        supabase
          .from("notifications")
          .select("id, title, message, is_read, created_at")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false })
          .limit(6),
        [],
        "notifications",
      );

      setNotifications(notificationsRows);
    } catch (error) {
      setErrorMsg(getErrorMessage(error, "تعذر تحميل بوابة ولي الأمر."));
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, resetStudentData]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setStudents([]);
      setParentLinks([]);
      setSelectedStudentId("");
      resetStudentData();
      setErrorMsg("لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      setLoading(false);
      return;
    }

    queueMicrotask(() => {
      void loadPage();
    });
  }, [currentSchool?.id, loadPage, resetStudentData, schoolLoading]);

  useEffect(() => {
    if (selectedStudent?.id) {
      void loadStudentData(selectedStudent.id);
    } else {
      resetStudentData();
    }
  }, [selectedStudent?.id, loadStudentData, resetStudentData]);

  const stats = useMemo(() => {
    const records = attendance.filter((item) =>
      ["حاضر", "present", "غائب", "absent", "متأخر", "late"].includes(
        String(item.attendance_status || item.status || ""),
      ),
    );

    const present = records.filter((item) =>
      isPresent(item.attendance_status || item.status),
    ).length;
    const absent = records.filter((item) =>
      isAbsent(item.attendance_status || item.status),
    ).length;
    const late = records.filter((item) =>
      isLate(item.attendance_status || item.status),
    ).length;

    const numericGrades = grades.map(gradeValue).filter((value) => value > 0);

    const averageGrade = numericGrades.length
      ? Math.round(
          numericGrades.reduce((sum, value) => sum + value, 0) /
            numericGrades.length,
        )
      : 0;

    const openReferrals = referrals.filter((item) =>
      isOpenReferral(item.status),
    ).length;

    const followUpScore =
      absent * 2 +
      late +
      behavior.length * 2 +
      openReferrals * 3 +
      (averageGrade > 0 && averageGrade < 70 ? 4 : 0);

    const followUpLabel =
      followUpScore >= 8
        ? "يحتاج متابعة عاجلة"
        : followUpScore >= 4
          ? "يحتاج متابعة"
          : "مستقر";

    return {
      attendanceRate: records.length
        ? Math.round((present / records.length) * 100)
        : 0,
      attendanceRecords: records.length,
      present,
      absent,
      late,
      averageGrade,
      behaviorCount: behavior.length,
      openReferrals,
      unreadNotifications: notifications.filter(
        (item) => item.is_read === false,
      ).length,
      followUpScore,
      followUpLabel,
    };
  }, [attendance, grades, behavior, referrals, notifications]);

  const todayAttendance = useMemo(() => {
    return attendance.find((item) => item.attendance_date === todayDate()) || null;
  }, [attendance]);

  const health = useMemo<ParentHealth>(() => {
    const academicScore = stats.averageGrade || 0;
    const attendanceScore =
      stats.attendanceRecords > 0 ? stats.attendanceRate : 0;
    const behaviorScore = Math.max(
      0,
      100 - stats.behaviorCount * 8 - stats.openReferrals * 10,
    );
    const followUpScore = Math.max(
      0,
      100 -
        stats.absent * 8 -
        stats.late * 4 -
        stats.openReferrals * 12 -
        (stats.averageGrade > 0 && stats.averageGrade < 70 ? 15 : 0),
    );

    const overallScore = Math.round(
      academicScore * 0.4 +
        attendanceScore * 0.3 +
        behaviorScore * 0.2 +
        followUpScore * 0.1,
    );

    return {
      academicScore,
      attendanceScore,
      behaviorScore,
      followUpScore,
      overallScore,
      level:
        overallScore >= 80
          ? "مستقر"
          : overallScore >= 60
            ? "متابعة"
            : "عاجل",
    };
  }, [stats]);

  const subjectDistribution = useMemo(
    () =>
      grades
        .map((item) => ({
          name: item.subject_name || item.subject || "مادة",
          value: gradeValue(item),
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [grades],
  );

  const parentInsights = useMemo<ParentInsight[]>(() => {
    const items: ParentInsight[] = [];

    if (health.level === "عاجل") {
      items.push({
        title: "متابعة عاجلة مطلوبة",
        description: `المؤشر العام الحالي ${health.overallScore}% ويحتاج تدخلًا منظمًا.`,
        tone: "red",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    }

    if (stats.averageGrade > 0 && stats.averageGrade < 70) {
      items.push({
        title: "تحصيل دراسي منخفض",
        description: `متوسط الدرجات الحالي ${stats.averageGrade}%.`,
        tone: "gold",
        icon: <Award className="h-5 w-5" />,
      });
    }

    if (stats.attendanceRecords > 0 && stats.attendanceRate < 85) {
      items.push({
        title: "الحضور يحتاج تحسينًا",
        description: `نسبة الحضور الحالية ${stats.attendanceRate}%.`,
        tone: "blue",
        icon: <CalendarDays className="h-5 w-5" />,
      });
    }

    if (stats.openReferrals > 0) {
      items.push({
        title: "إحالات قيد المتابعة",
        description: `يوجد ${stats.openReferrals} إحالة مفتوحة.`,
        tone: "teal",
        icon: <HeartPulse className="h-5 w-5" />,
      });
    }

    if (items.length === 0) {
      items.push({
        title: "الوضع مستقر",
        description: "لا توجد مؤشرات حرجة حاليًا، واستمرار المتابعة كافٍ.",
        tone: "green",
        icon: <Sparkles className="h-5 w-5" />,
      });
    }

    return items.slice(0, 4);
  }, [health, stats]);

  const parentRecommendations = useMemo(
    () =>
      buildParentRecommendations(health, {
        absent: stats.absent,
        late: stats.late,
        averageGrade: stats.averageGrade,
        behaviorCount: stats.behaviorCount,
        openReferrals: stats.openReferrals,
      }),
    [health, stats],
  );

  const parentTimeline = useMemo(() => {
    const items = [
      ...notifications.map((item) => ({
        id: `notification-${item.id}`,
        title: item.title || "تنبيه",
        description: item.message || "تنبيه جديد.",
        date: item.created_at,
        tone: item.is_read === false
          ? ("gold" as ParentInsightTone)
          : ("teal" as ParentInsightTone),
      })),
      ...attendance.slice(0, 8).map((item) => ({
        id: `attendance-${item.id}`,
        title: `الحضور: ${normalizeAttendanceStatus(
          item.attendance_status || item.status,
        )}`,
        description: item.notes || "تم تحديث سجل الحضور.",
        date: item.attendance_date,
        tone: isAbsent(item.attendance_status || item.status)
          ? ("red" as ParentInsightTone)
          : ("green" as ParentInsightTone),
      })),
      ...referrals.slice(0, 6).map((item) => ({
        id: `referral-${item.id}`,
        title: item.reason || "إحالة",
        description: item.status || "قيد المتابعة",
        date: item.referred_at || item.created_at,
        tone: isOpenReferral(item.status)
          ? ("red" as ParentInsightTone)
          : ("green" as ParentInsightTone),
      })),
    ];

    return items
      .sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10);
  }, [attendance, notifications, referrals]);

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل بوابة ولي الأمر..." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main dir="rtl" className="space-y-6">
          <PageHeader
            variant="hero"
            title="متابعة الأبناء"
            description="متابعة حضور الأبناء، الدرجات، السلوك، الإحالات، والتنبيهات المهمة من المدرسة في مكان واحد."
            badge="بوابة ولي الأمر"
            icon={<Users size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة ولي الأمر" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "منصة المدرسة الذكية" },
              { label: "اليوم", value: todayLabel() },
              { label: "عدد الأبناء", value: students.length },
              { label: "الطالب المحدد", value: selectedStudent ? studentName(selectedStudent) : "لا يوجد طالب مرتبط" },
            ]}
            stats={[
              { label: "نسبة الحضور", value: stats.attendanceRecords > 0 ? `${stats.attendanceRate}%` : "—", icon: <CalendarDays size={20} />, tone: stats.attendanceRecords === 0 ? "slate" : stats.attendanceRate >= 90 ? "green" : stats.attendanceRate >= 75 ? "gold" : "red" },
              { label: "متوسط الدرجات", value: stats.averageGrade ? `${stats.averageGrade}%` : "—", icon: <Award size={20} />, tone: stats.averageGrade >= 90 ? "green" : stats.averageGrade >= 70 ? "gold" : stats.averageGrade > 0 ? "red" : "slate" },
              { label: "التنبيهات", value: stats.unreadNotifications, icon: <Bell size={20} />, tone: stats.unreadNotifications > 0 ? "red" : "green" },
              { label: "مؤشر المتابعة", value: stats.followUpLabel, icon: <ShieldAlert size={20} />, tone: stats.followUpLabel === "يحتاج متابعة عاجلة" ? "red" : stats.followUpLabel === "يحتاج متابعة" ? "gold" : "green" },
            ]}
            actions={
              <>
                {students.length > 1 && (
                  <select
                    value={selectedStudent?.id || ""}
                    onChange={(event) => setSelectedStudentId(event.target.value)}
                    className="h-11 min-w-[220px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm outline-none transition focus:border-[#0DA9A6]"
                  >
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {studentName(student)}
                      </option>
                    ))}
                  </select>
                )}

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
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Bell size={17} />
                  التنبيهات
                </Link>
              </>
            }
          />

          {errorMsg && (
            <ErrorState
              title="تعذر تحميل البيانات"
              description={errorMsg}
            />
          )}

          {!selectedStudent ? (
            <EmptyBox text="لم يتم العثور على طالب مرتبط بحساب ولي الأمر الحالي. يجب وجود ربط معتمد في جدول parent_students بحالة verified." />
          ) : (
            <>
              {studentDataLoading && (
                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-700">
                  جاري تحديث بيانات الطالب...
                </div>
              )}

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-7">
                <ExecutiveCard
                  title="نسبة الحضور"
                  value={stats.attendanceRecords > 0 ? `${stats.attendanceRate}%` : "—"}
                  subtitle="حسب آخر سجلات الحضور"
                  icon={<CalendarDays size={22} />}
                  tone={
                    stats.attendanceRecords === 0
                      ? "slate"
                      : stats.attendanceRate >= 90
                        ? "green"
                        : stats.attendanceRate >= 75
                          ? "gold"
                          : "red"
                  }
                  progress={stats.attendanceRecords > 0 ? stats.attendanceRate : 0}
                />

                <ExecutiveCard
                  title="غياب / تأخر"
                  value={`${stats.absent} / ${stats.late}`}
                  subtitle="مؤشرات تحتاج متابعة"
                  icon={<AlertTriangle size={22} />}
                  tone={stats.absent > 2 ? "red" : "gold"}
                />

                <ExecutiveCard
                  title="تنبيهات"
                  value={stats.unreadNotifications}
                  subtitle="تنبيهات غير مقروءة"
                  icon={<Bell size={22} />}
                  tone={stats.unreadNotifications > 0 ? "red" : "green"}
                />

                <ExecutiveCard
                  title="حالة اليوم"
                  value={normalizeAttendanceStatus(
                    todayAttendance?.attendance_status || todayAttendance?.status,
                  )}
                  subtitle="حضور اليوم الحالي"
                  icon={<CheckCircle2 size={22} />}
                  tone={todayAttendance ? "green" : "slate"}
                />

                <ExecutiveCard
                  title="متوسط الدرجات"
                  value={stats.averageGrade ? `${stats.averageGrade}%` : "—"}
                  subtitle="متوسط النتائج المسجلة"
                  icon={<Award size={22} />}
                  tone={
                    stats.averageGrade >= 90
                      ? "green"
                      : stats.averageGrade >= 70
                        ? "gold"
                        : stats.averageGrade > 0
                          ? "red"
                          : "slate"
                  }
                  progress={stats.averageGrade || 0}
                />

                <ExecutiveCard
                  title="السلوك"
                  value={stats.behaviorCount}
                  subtitle="سجلات سلوكية"
                  icon={<ShieldAlert size={22} />}
                  tone={stats.behaviorCount > 0 ? "gold" : "green"}
                />

                <ExecutiveCard
                  title="إحالات مفتوحة"
                  value={stats.openReferrals}
                  subtitle="إحالات قيد المتابعة"
                  icon={<HeartPulse size={22} />}
                  tone={stats.openReferrals > 0 ? "red" : "green"}
                />
              </section>

              <section
                className={`rounded-3xl border p-5 shadow-sm ${
                  stats.followUpLabel === "يحتاج متابعة عاجلة"
                    ? "border-red-100 bg-red-50 text-red-700"
                    : stats.followUpLabel === "يحتاج متابعة"
                      ? "border-amber-100 bg-amber-50 text-amber-700"
                      : "border-emerald-100 bg-emerald-50 text-emerald-700"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-black">مؤشر متابعة ولي الأمر</p>
                    <h2 className="mt-2 text-3xl font-black">
                      {stats.followUpLabel}
                    </h2>
                    <p className="mt-2 text-sm font-bold leading-7">
                      المؤشر يعتمد على الغياب، التأخر، السلوك، الإحالات،
                      وانخفاض الدرجات.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/70 px-5 py-4 text-center">
                    <p className="text-xs font-black">درجة المتابعة</p>
                    <p className="mt-1 text-3xl font-black">
                      {stats.followUpScore}
                    </p>
                  </div>
                </div>
              </section>


              <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <ParentExecutiveAnalytics
                  health={health}
                  stats={stats}
                  studentNameValue={studentName(selectedStudent)}
                />

                <ParentSmartInsights insights={parentInsights} />
              </section>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <ParentHealthPanel health={health} />

                <ParentAcademicProgress
                  subjects={subjectDistribution}
                  average={stats.averageGrade}
                />

                <ParentActionPlan recommendations={parentRecommendations} />
              </section>

              {childrenComparison.length > 1 && (
                <ChildrenComparisonPanel
                  items={childrenComparison}
                  selectedStudentId={selectedStudent.id}
                  onSelect={setSelectedStudentId}
                />
              )}

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[.85fr_1.15fr]">
                <Panel title="بطاقة الطالب" icon={<User size={24} />}>
                  <div className="space-y-3">
                    <InfoRow label="الاسم" value={studentName(selectedStudent)} />
                    <InfoRow
                      label="رقم الطالب"
                      value={selectedStudent.student_number || "—"}
                    />
                    <InfoRow
                      label="المرحلة والفصل"
                      value={classLabel(selectedStudent)}
                    />
                    <InfoRow
                      label="الحالة"
                      value={selectedStudent.status || "منتظم"}
                    />
                    <InfoRow
                      label="ولي الأمر"
                      value={selectedStudent.guardian_name || "—"}
                    />
                    <InfoRow
                      label="جوال ولي الأمر"
                      value={selectedStudent.guardian_phone || "—"}
                    />
                    <InfoRow
                      label="صلة القرابة"
                      value={selectedLink?.relationship || "—"}
                    />
                    <InfoRow
                      label="طريقة الربط"
                      value={selectedLink?.link_method || "—"}
                    />
                    <InfoRow
                      label="هوية ولي الأمر"
                      value={selectedLink?.parent_national_id || "—"}
                    />
                  </div>
                </Panel>

                <Panel title="مؤشرات المتابعة" icon={<Sparkles size={24} />}>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <MetricBox
                      title="مؤشر الحضور"
                      value={
                        stats.attendanceRecords > 0
                          ? `${stats.attendanceRate}%`
                          : "—"
                      }
                      description="يعتمد على آخر سجلات الحضور المسجلة."
                      icon={<CalendarDays size={24} />}
                    />

                    <MetricBox
                      title="المستوى الدراسي"
                      value={stats.averageGrade ? `${stats.averageGrade}%` : "—"}
                      description="متوسط الدرجات المسجلة للطالب."
                      icon={<Award size={24} />}
                    />

                    <MetricBox
                      title="السلوك"
                      value={stats.behaviorCount}
                      description="عدد السجلات السلوكية المسجلة."
                      icon={<ShieldAlert size={24} />}
                    />

                    <MetricBox
                      title="الإحالات المفتوحة"
                      value={stats.openReferrals}
                      description="الإحالات التي لا تزال قيد المتابعة."
                      icon={<HeartPulse size={24} />}
                    />
                  </div>
                </Panel>
              </section>


              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <ParentCommunicationHub
                  unreadNotifications={stats.unreadNotifications}
                  openReferrals={stats.openReferrals}
                  selectedStudentId={selectedStudent.id}
                />

                <ParentUnifiedTimeline items={parentTimeline} />
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <QuickLink
                  href="/parent-portal/attendance"
                  title="الحضور والغياب"
                  description="متابعة حضور الطالب والغياب والتأخر."
                  icon={<CalendarDays size={24} />}
                />

                <QuickLink
                  href="/parent-portal/grades"
                  title="الدرجات"
                  description="متابعة الدرجات والنتائج الدراسية."
                  icon={<Award size={24} />}
                />

                <QuickLink
                  href="/parent-portal/behavior"
                  title="السلوك"
                  description="متابعة السجلات السلوكية والإجراءات."
                  icon={<ShieldAlert size={24} />}
                />

                <QuickLink
                  href="/notifications"
                  title="التنبيهات"
                  description="آخر التنبيهات والرسائل المهمة."
                  icon={<Bell size={24} />}
                />

                <QuickLink
                  href={`/students/${selectedStudent.id}`}
                  title="ملف الطالب"
                  description="عرض الملف الشامل للطالب."
                  icon={<GraduationCap size={24} />}
                />

                <QuickLink
                  href="/student-referrals"
                  title="الإحالات"
                  description="متابعة الإحالات وحالة المعالجة."
                  icon={<HeartPulse size={24} />}
                />
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
                <Panel title="سجل الحضور الأخير" icon={<CalendarDays size={24} />}>
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
                              <p className="font-black text-[#0f1f3d]">
                                {formatDate(item.attendance_date)}
                              </p>

                              <p className="text-xs text-slate-400">
                                {item.notes || "—"}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${attendanceStatusTone(
                                status,
                              )}`}
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
                            <h3 className="line-clamp-1 font-black text-[#0f1f3d]">
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
                <Panel title="آخر الدرجات" icon={<Award size={24} />}>
                  {grades.length === 0 ? (
                    <EmptyBox text="لا توجد درجات مسجلة حتى الآن." />
                  ) : (
                    <div className="space-y-3">
                      {grades.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-black text-[#0f1f3d]">
                                {item.subject_name || item.subject || "مادة"}
                              </h3>

                              <p className="mt-1 text-sm text-slate-500">
                                {item.semester || "الفصل الدراسي"} —{" "}
                                {item.academic_year || "العام الدراسي"}
                              </p>
                            </div>

                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                              {gradeValue(item) ? `${gradeValue(item)}%` : "—"}
                            </span>
                          </div>

                          <p className="mt-3 text-sm font-bold text-slate-500">
                            {item.grade_label || item.result_status || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="السلوك والإحالات" icon={<ShieldAlert size={24} />}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="mb-3 font-black text-[#0f1f3d]">
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
                      <h3 className="mb-3 font-black text-[#0f1f3d]">
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
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f1f3d]/5 text-[#0f1f3d]">
          {icon}
        </div>

        <h2 className="text-2xl font-black text-[#0f1f3d]">{title}</h2>
      </div>

      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className="text-left font-black text-[#0f1f3d]">{value}</span>
    </div>
  );
}

function MetricBox({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0f1f3d]">
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-black text-[#0f1f3d]">{value}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#24477f]/30 hover:shadow-lg"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[#0f1f3d]">
        {icon}
      </div>

      <h3 className="text-xl font-black text-[#0f1f3d]">{title}</h3>

      <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-500">
        {description}
      </p>

      <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-black text-[#0f1f3d] transition group-hover:bg-[#0f1f3d] group-hover:text-white">
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
      <p className="line-clamp-1 font-black text-[#0f1f3d]">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <p className="mt-1 text-xs font-bold text-slate-400">
        {formatDate(date)}
      </p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <UiEmptyState
      title="لا توجد بيانات"
      description={text}
    />
  );
}


function ParentExecutiveAnalytics({
  health,
  stats,
  studentNameValue,
}: {
  health: ParentHealth;
  stats: {
    attendanceRate: number;
    attendanceRecords: number;
    present: number;
    absent: number;
    late: number;
    averageGrade: number;
    behaviorCount: number;
    openReferrals: number;
    unreadNotifications: number;
    followUpScore: number;
    followUpLabel: string;
  };
  studentNameValue: string;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black text-[var(--app-text)]">
          Parent Executive Analytics
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          قراءة تنفيذية شاملة لأداء الطالب واحتياجات المتابعة.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ParentMetric label="المؤشر العام" value={`${health.overallScore}%`} icon={<Target size={18} />} tone={health.level === "مستقر" ? "green" : health.level === "متابعة" ? "gold" : "red"} />
        <ParentMetric label="الأكاديمي" value={`${health.academicScore}%`} icon={<Award size={18} />} tone="blue" />
        <ParentMetric label="الحضور" value={`${health.attendanceScore}%`} icon={<CalendarDays size={18} />} tone="teal" />
        <ParentMetric label="السلوك" value={`${health.behaviorScore}%`} icon={<ShieldAlert size={18} />} tone="green" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ParentInfoLine label="الطالب" value={studentNameValue} />
        <ParentInfoLine label="التصنيف" value={health.level} />
        <ParentInfoLine label="الغياب / التأخر" value={`${stats.absent} / ${stats.late}`} />
        <ParentInfoLine label="الإحالات المفتوحة" value={stats.openReferrals} />
      </div>
    </section>
  );
}

function ParentSmartInsights({
  insights,
}: {
  insights: ParentInsight[];
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
          <BrainCircuit size={20} />
          AI Parent Insights
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          توصيات ذكية تساعد ولي الأمر في المتابعة اليومية.
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

function ParentHealthPanel({
  health,
}: {
  health: ParentHealth;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <Activity size={20} />
        Parent Monitoring Health
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        توازن الأداء والحضور والسلوك والمتابعة.
      </p>

      <div className="mt-5 space-y-4">
        <ParentProgress label="الأكاديمي" value={health.academicScore} total={100} tone="blue" suffix="%" />
        <ParentProgress label="الحضور" value={health.attendanceScore} total={100} tone="green" suffix="%" />
        <ParentProgress label="السلوك" value={health.behaviorScore} total={100} tone="teal" suffix="%" />
        <ParentProgress label="المتابعة" value={health.followUpScore} total={100} tone="gold" suffix="%" />
      </div>
    </section>
  );
}

function ParentAcademicProgress({
  subjects,
  average,
}: {
  subjects: Array<{ name: string; value: number }>;
  average: number;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <ChartNoAxesCombined size={20} />
        Academic Progress
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مقارنة نتائج المواد بمتوسط الطالب.
      </p>

      <div className="mt-5 space-y-4">
        {subjects.length === 0 ? (
          <p className="text-sm text-[var(--app-text-muted)]">
            لا توجد درجات كافية للتحليل.
          </p>
        ) : (
          subjects.map((item) => (
            <ParentProgress
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

function ParentActionPlan({
  recommendations,
}: {
  recommendations: string[];
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <TrendingUp size={20} />
        Parent Action Plan
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        خطوات عملية مقترحة لولي الأمر.
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

function ChildrenComparisonPanel({
  items,
  selectedStudentId,
  onSelect,
}: {
  items: ChildComparisonItem[];
  selectedStudentId: string;
  onSelect: (studentId: string) => void;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
          <BarChart3 size={20} />
          مقارنة الأبناء
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          مقارنة سريعة للحضور والتحصيل والمتابعة.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.studentId}
            type="button"
            onClick={() => onSelect(item.studentId)}
            className={`rounded-3xl border p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md ${
              selectedStudentId === item.studentId
                ? "border-[var(--app-teal)] bg-[var(--app-teal-soft)]"
                : "border-[var(--app-border)] bg-[var(--app-card-soft)]"
            }`}
          >
            <p className="font-black text-[var(--app-text)]">{item.studentName}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <ParentInfoLine label="الحضور" value={`${item.attendanceRate}%`} />
              <ParentInfoLine label="الدرجات" value={`${item.averageGrade}%`} />
              <ParentInfoLine label="السلوك" value={item.behaviorCount} />
              <ParentInfoLine label="المؤشر" value={`${item.overallScore}%`} />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function ParentCommunicationHub({
  unreadNotifications,
  openReferrals,
  selectedStudentId,
}: {
  unreadNotifications: number;
  openReferrals: number;
  selectedStudentId: string;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <MessagesSquare size={20} />
        Communication Hub
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        بوابة سريعة للتنبيهات والإحالات وملف الطالب.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Link href="/notifications" className="rounded-2xl bg-[var(--app-card-soft)] p-4 text-center transition hover:-translate-y-0.5">
          <Bell className="mx-auto text-[var(--app-teal)]" size={22} />
          <p className="mt-2 text-sm font-black text-[var(--app-text)]">التنبيهات</p>
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">{unreadNotifications} غير مقروءة</p>
        </Link>

        <Link href="/student-referrals" className="rounded-2xl bg-[var(--app-card-soft)] p-4 text-center transition hover:-translate-y-0.5">
          <HeartPulse className="mx-auto text-[var(--app-teal)]" size={22} />
          <p className="mt-2 text-sm font-black text-[var(--app-text)]">الإحالات</p>
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">{openReferrals} مفتوحة</p>
        </Link>

        <Link href={`/students/${selectedStudentId}`} className="rounded-2xl bg-[var(--app-card-soft)] p-4 text-center transition hover:-translate-y-0.5">
          <GraduationCap className="mx-auto text-[var(--app-teal)]" size={22} />
          <p className="mt-2 text-sm font-black text-[var(--app-text)]">ملف الطالب</p>
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">عرض شامل</p>
        </Link>
      </div>
    </section>
  );
}

function ParentUnifiedTimeline({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    description: string;
    date?: string | null;
    tone: ParentInsightTone;
  }>;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <Activity size={20} />
        Unified Timeline
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        أحدث التنبيهات والحضور والإحالات.
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
                <p className="text-sm font-black text-[var(--app-text)]">{item.title}</p>
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

function ParentMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: ParentInsightTone;
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

function ParentInfoLine({
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

function ParentProgress({
  label,
  value,
  total,
  tone,
  suffix = "",
}: {
  label: string;
  value: number;
  total: number;
  tone: ParentInsightTone;
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

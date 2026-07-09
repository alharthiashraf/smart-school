"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { PageLoader } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";

import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  AlertCircle,
  ArrowRight,
  Award,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FileText,
  GraduationCap,
  LayoutDashboard,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

type Teacher = {
  id: string;
  school_id?: string | null;
  full_name: string;
  employee_number?: string | null;
  photo_url?: string | null;
  subject?: string | null;
  specialization?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  weekly_load?: number | null;
  status?: string | null;
};

type TeacherSchedule = {
  id: string;
  teacher_id: string;
  day_name?: string | null;
  period_number?: number | null;
  class_name?: string | null;
  section?: string | null;
  subject?: string | null;
  room?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

type WaitingPeriod = {
  id: string;
  teacher_id: string;
  class_name?: string | null;
  section?: string | null;
  subject?: string | null;
  period_number?: number | null;
  day_name?: string | null;
  waiting_date?: string | null;
  approval_status?: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type PortfolioItem = {
  id: string;
  teacher_id: string;
  evidence_type_id?: number | null;
  category?: string | null;
  review_status?: string | null;
  created_at?: string | null;
};

type EvaluationElement = {
  id: number;
  element_number: number;
  element_name: string;
  is_active?: boolean | null;
};

type EvidenceType = {
  id: number;
  element_id: number;
  evidence_name: string;
  is_required?: boolean | null;
};

type TeacherClass = {
  id: string;
  teacher_id: string;
  class_name?: string | null;
  section?: string | null;
  grade_level?: string | null;
};

type TeacherSubject = {
  id: string;
  teacher_id: string;
  subject_name?: string | null;
  subject?: string | null;
};

type LessonPreparation = {
  id: string;
  teacher_id?: string | null;
  lesson_date?: string | null;
  period_number?: number | null;
  class_name?: string | null;
  section?: string | null;
  subject?: string | null;
  lesson_title?: string | null;
  preparation_status?: string | null;
  created_at?: string | null;
};

type AttendanceSession = {
  id: string;
  teacher_id?: string | null;
  attendance_date?: string | null;
  class_name?: string | null;
  section?: string | null;
  period_number?: number | null;
  status?: string | null;
};

type NotificationItem = {
  id: string;
  title?: string | null;
  message?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type QuickLink = {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  tone: "blue" | "green" | "gold" | "red" | "teal" | "slate";
};

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

type QueryLike<T> = PromiseLike<QueryResult<T>>;

const TEACHER_PORTAL_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "teacher",
];

const MANAGER_ROLES = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
];

const QUICK_LINKS: QuickLink[] = [
  {
    title: "متابعة الحصة",
    description: "الحضور والغياب والسلوك والتحويل للعيادة.",
    href: "/teacher/daily",
    icon: UserCheck,
    tone: "green",
  },
  {
    title: "التحضير الإلكتروني",
    description: "تحضير حصص اليوم وقوالب جاهزة.",
    href: "/teacher/preparations",
    icon: BookOpenCheck,
    tone: "blue",
  },
  {
    title: "جدولي",
    description: "عرض الجدول الأسبوعي والحصة القادمة.",
    href: "/teacher/schedule",
    icon: CalendarDays,
    tone: "teal",
  },
  {
    title: "حصص الانتظار",
    description: "متابعة الانتظار وحالة الاعتماد.",
    href: "/teacher/waiting",
    icon: Timer,
    tone: "gold",
  },
  {
    title: "رصد الدرجات",
    description: "إدخال ومراجعة درجات الطلاب.",
    href: "/grades",
    icon: Award,
    tone: "red",
  },
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function arabicTodayLabel() {
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function arabicDayName() {
  return new Date().toLocaleDateString("ar-SA", { weekday: "long" });
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

function periodLabel(period?: number | string | null) {
  if (!period) return "حصة غير محددة";
  return `الحصة ${period}`;
}

function lessonClass(item?: TeacherSchedule | WaitingPeriod | LessonPreparation | null) {
  if (!item) return "—";
  return `${item.class_name || "فصل غير محدد"}${item.section ? ` / ${item.section}` : ""}`;
}

function lessonSubject(item?: TeacherSchedule | WaitingPeriod | LessonPreparation | null, teacher?: Teacher | null) {
  return item?.subject || teacher?.subject || teacher?.specialization || "مادة غير محددة";
}

function isPending(value?: string | null) {
  const status = String(value || "").trim().toLowerCase();

  return (
    !status ||
    status === "pending" ||
    status === "draft" ||
    status === "review" ||
    status.includes("انتظار") ||
    status.includes("مراجعة") ||
    status.includes("مسودة")
  );
}

function isApproved(value?: string | null) {
  const status = String(value || "").trim().toLowerCase();

  return (
    status === "approved" ||
    status === "active" ||
    status === "completed" ||
    status.includes("معتمد") ||
    status.includes("مكتمل") ||
    status.includes("موافق")
  );
}

function isManagerRole(roles: string[]) {
  return roles.some((role) => MANAGER_ROLES.includes(role));
}

function isToday(value?: string | null) {
  if (!value) return false;
  return value.slice(0, 10) === todayDate();
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
    const timeout = new Promise<QueryResult<T>>((resolve) => {
      window.setTimeout(() => {
        resolve({
          data: fallback,
          error: new Error(`timeout: ${label}`),
        });
      }, 8000);
    });

    const result = await Promise.race([query, timeout]);

    if (result.error) {
      console.warn(`Teacher portal query skipped: ${label}`, result.error);
      return fallback;
    }

    return result.data ?? fallback;
  } catch (error) {
    console.warn(`Teacher portal query failed: ${label}`, error);
    return fallback;
  }
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function statusPill(value?: string | null) {
  const status = String(value || "").trim().toLowerCase();

  if (isApproved(status) || status.includes("تم")) {
    return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
  }

  if (isPending(status)) {
    return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";
  }

  if (status.includes("مرفوض") || status.includes("متأخر")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-[#3D7EB9]/20 bg-[#3D7EB9]/10 text-[#3D7EB9]";
}

function sortByPeriod<T extends { period_number?: number | null }>(items: T[]) {
  return [...items].sort((first, second) => Number(first.period_number || 0) - Number(second.period_number || 0));
}

function teacherInitials(name?: string | null) {
  const parts = String(name || "").trim().split(" ").filter(Boolean);
  if (!parts.length) return "م";
  return parts.slice(0, 2).map((part) => part[0]).join("");
}

export default function TeacherPortalPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [canChooseTeacher, setCanChooseTeacher] = useState(false);

  const [schedule, setSchedule] = useState<TeacherSchedule[]>([]);
  const [waiting, setWaiting] = useState<WaitingPeriod[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [elements, setElements] = useState<EvaluationElement[]>([]);
  const [evidenceTypes, setEvidenceTypes] = useState<EvidenceType[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [preparations, setPreparations] = useState<LessonPreparation[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const today = todayDate();
  const todayName = arabicDayName();

  const resetTeacherPortal = useCallback(() => {
    setTeacher(null);
    setAllTeachers([]);
    setCanChooseTeacher(false);
    setSchedule([]);
    setWaiting([]);
    setPortfolio([]);
    setElements([]);
    setEvidenceTypes([]);
    setTeacherClasses([]);
    setTeacherSubjects([]);
    setPreparations([]);
    setAttendanceSessions([]);
    setNotifications([]);
  }, []);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  const fetchTeacherPortal = useCallback(async () => {
    if (!currentSchool?.id) {
      setLoading(false);
      setErrorMsg("لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      const userEmail = user?.email?.trim().toLowerCase() || "";

      if (!user?.id || !userEmail) {
        resetTeacherPortal();
        setErrorMsg("لم يتم العثور على مستخدم مسجل الدخول.");
        return;
      }

      const schoolMember = await safeQuery<{ id: string; role: string } | null>(
        supabase
          .from("school_members")
          .select("id, role")
          .eq("auth_user_id", user.id)
          .eq("school_id", currentSchool.id)
          .maybeSingle(),
        null,
        "school_members",
      );

      if (!schoolMember?.id) {
        resetTeacherPortal();
        setErrorMsg("حسابك غير مرتبط بهذه المدرسة في جدول school_members.");
        return;
      }

      const extraRoles = await safeQuery<{ role: string }[]>(
        supabase
          .from("user_roles")
          .select("role")
          .eq("school_user_id", schoolMember.id),
        [],
        "user_roles",
      );

      const roles = [schoolMember.role, ...extraRoles.map((item) => item.role)]
        .filter(Boolean)
        .map(String);

      const manager = isManagerRole(roles);
      setCanChooseTeacher(manager);

      let loadedTeachers: Teacher[] = [];

      if (manager) {
        loadedTeachers = await safeQuery<Teacher[]>(
          supabase
            .from("teachers")
            .select("*")
            .eq("school_id", currentSchool.id)
            .order("full_name", { ascending: true }),
          [],
          "teachers-manager",
        );
      } else {
        loadedTeachers = await safeQuery<Teacher[]>(
          supabase
            .from("teachers")
            .select("*")
            .eq("school_id", currentSchool.id)
            .ilike("email", userEmail),
          [],
          "teachers-by-email",
        );

        if (loadedTeachers.length === 0) {
          loadedTeachers = await safeQuery<Teacher[]>(
            supabase
              .from("teachers")
              .select("*")
              .eq("school_id", currentSchool.id)
              .eq("email", userEmail),
            [],
            "teachers-by-email-exact",
          );
        }
      }

      setAllTeachers(loadedTeachers);

      if (loadedTeachers.length === 0) {
        resetTeacherPortal();
        setErrorMsg("لم يتم العثور على معلم مطابق لهذا الحساب. تأكد أن بريد teachers.email مطابق لبريد الدخول.");
        return;
      }

      let teacherRow: Teacher | null = null;

      if (manager) {
        teacherRow = loadedTeachers.find((item) => item.id === selectedTeacherId) || loadedTeachers[0];

        if (!selectedTeacherId && teacherRow?.id) {
          setSelectedTeacherId(teacherRow.id);
        }
      } else {
        teacherRow = loadedTeachers[0];
      }

      if (!teacherRow?.id) {
        resetTeacherPortal();
        setErrorMsg("تعذر تحديد سجل المعلم.");
        return;
      }

      setTeacher(teacherRow);

      const [
        scheduleData,
        waitingData,
        portfolioData,
        elementsData,
        evidenceData,
        classesData,
        subjectsData,
        preparationsData,
        attendanceData,
        notificationsData,
      ] = await Promise.all([
        safeQuery<TeacherSchedule[]>(
          supabase
            .from("teacher_schedule")
            .select("*")
            .eq("school_id", currentSchool.id)
            .eq("teacher_id", teacherRow.id)
            .order("day_name", { ascending: true })
            .order("period_number", { ascending: true }),
          [],
          "teacher_schedule",
        ),
        safeQuery<WaitingPeriod[]>(
          supabase
            .from("teacher_waiting_periods")
            .select("*")
            .eq("school_id", currentSchool.id)
            .eq("teacher_id", teacherRow.id)
            .order("created_at", { ascending: false }),
          [],
          "teacher_waiting_periods",
        ),
        safeQuery<PortfolioItem[]>(
          supabase
            .from("teacher_portfolio")
            .select("*")
            .eq("school_id", currentSchool.id)
            .eq("teacher_id", teacherRow.id)
            .order("created_at", { ascending: false }),
          [],
          "teacher_portfolio",
        ),
        safeQuery<EvaluationElement[]>(
          supabase
            .from("teacher_evaluation_elements")
            .select("id, element_number, element_name, is_active")
            .order("element_number", { ascending: true }),
          [],
          "teacher_evaluation_elements",
        ),
        safeQuery<EvidenceType[]>(
          supabase
            .from("teacher_evidence_types")
            .select("id, element_id, evidence_name, is_required")
            .order("element_id", { ascending: true })
            .order("id", { ascending: true }),
          [],
          "teacher_evidence_types",
        ),
        safeQuery<TeacherClass[]>(
          supabase
            .from("teacher_classes")
            .select("*")
            .eq("school_id", currentSchool.id)
            .eq("teacher_id", teacherRow.id),
          [],
          "teacher_classes",
        ),
        safeQuery<TeacherSubject[]>(
          supabase
            .from("teacher_subjects")
            .select("*")
            .eq("school_id", currentSchool.id)
            .eq("teacher_id", teacherRow.id),
          [],
          "teacher_subjects",
        ),
        safeQuery<LessonPreparation[]>(
          supabase
            .from("teacher_lesson_preparations")
            .select("id, teacher_id, lesson_date, period_number, class_name, section, subject, lesson_title, preparation_status, created_at")
            .eq("school_id", currentSchool.id)
            .eq("teacher_id", teacherRow.id)
            .order("lesson_date", { ascending: false })
            .limit(10),
          [],
          "teacher_lesson_preparations",
        ),
        safeQuery<AttendanceSession[]>(
          supabase
            .from("student_attendance_sessions")
            .select("id, teacher_id, attendance_date, class_name, section, period_number, status")
            .eq("school_id", currentSchool.id)
            .eq("teacher_id", teacherRow.id)
            .eq("attendance_date", today)
            .order("period_number", { ascending: true }),
          [],
          "student_attendance_sessions",
        ),
        safeQuery<NotificationItem[]>(
          supabase
            .from("notifications")
            .select("id, title, message, is_read, created_at")
            .eq("school_id", currentSchool.id)
            .order("created_at", { ascending: false })
            .limit(6),
          [],
          "notifications",
        ),
      ]);

      setSchedule(scheduleData);
      setWaiting(waitingData);
      setPortfolio(portfolioData);
      setElements(elementsData.filter((item) => item.is_active !== false));
      setEvidenceTypes(evidenceData);
      setTeacherClasses(classesData);
      setTeacherSubjects(subjectsData);
      setPreparations(preparationsData);
      setAttendanceSessions(attendanceData);
      setNotifications(notificationsData);
    } catch (error) {
      resetTeacherPortal();
      const message = getErrorMessage(error, "تعذر تحميل بوابة المعلم.");
      setErrorMsg(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, resetTeacherPortal, selectedTeacherId, showToast, today]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      resetTeacherPortal();
      setErrorMsg("لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      setLoading(false);
      return;
    }

    queueMicrotask(() => {
      void fetchTeacherPortal();
    });
  }, [schoolLoading, currentSchool?.id, selectedTeacherId, fetchTeacherPortal, resetTeacherPortal]);

  const todaySchedule = useMemo(() => {
    return sortByPeriod(schedule.filter((item) => item.day_name === todayName));
  }, [schedule, todayName]);

  const todayWaiting = useMemo(() => {
    return waiting.filter((item) => item.waiting_date === today || item.day_name === todayName);
  }, [waiting, today, todayName]);

  const todayPreparations = useMemo(() => {
    return preparations.filter((item) => isToday(item.lesson_date));
  }, [preparations]);

  const pendingWaiting = useMemo(() => {
    return waiting.filter((item) => isPending(item.approval_status || item.status)).length;
  }, [waiting]);

  const approvedPortfolio = useMemo(() => {
    return portfolio.filter((item) => isApproved(item.review_status)).length;
  }, [portfolio]);

  const pendingPortfolio = useMemo(() => {
    return portfolio.filter((item) => isPending(item.review_status)).length;
  }, [portfolio]);

  const unreadNotifications = useMemo(() => {
    return notifications.filter((item) => item.is_read === false).length;
  }, [notifications]);

  const requiredEvidence = useMemo(() => {
    return evidenceTypes.filter((item) => item.is_required !== false);
  }, [evidenceTypes]);

  const uploadedRequiredCount = useMemo(() => {
    return requiredEvidence.filter((evidence) => {
      return portfolio.some(
        (item) => item.evidence_type_id === evidence.id || item.category === evidence.evidence_name,
      );
    }).length;
  }, [requiredEvidence, portfolio]);

  const completionPercent =
    requiredEvidence.length > 0
      ? Math.round((uploadedRequiredCount / requiredEvidence.length) * 100)
      : portfolio.length > 0
        ? 100
        : 0;

  const readinessLabel =
    completionPercent >= 85 ? "جاهز" : completionPercent >= 55 ? "قيد الاكتمال" : "يحتاج استكمال";

  const currentLesson = todaySchedule[0] || null;
  const nextLesson = todaySchedule[1] || null;
  const weeklyLoad = teacher?.weekly_load ?? schedule.length;

  const dailyReadiness = todaySchedule.length
    ? Math.round(((todayPreparations.length + attendanceSessions.length) / (todaySchedule.length * 2)) * 100)
    : 0;

  const timelineItems = useMemo(() => {
    return todaySchedule.map((item) => {
      const hasPreparation = todayPreparations.some(
        (prep) =>
          prep.period_number === item.period_number &&
          prep.class_name === item.class_name &&
          prep.section === item.section,
      );

      const hasAttendance = attendanceSessions.some(
        (session) =>
          session.period_number === item.period_number &&
          session.class_name === item.class_name &&
          session.section === item.section,
      );

      return {
        ...item,
        hasPreparation,
        hasAttendance,
      };
    });
  }, [attendanceSessions, todayPreparations, todaySchedule]);

  function getExportRows() {
    if (!teacher) return [];

    return [
      ["اسم المعلم", teacher.full_name || "-"],
      ["المادة", teacher.subject || teacher.specialization || "-"],
      ["القسم", teacher.department || "-"],
      ["النصاب الأسبوعي", teacher.weekly_load ?? "-"],
      ["حصص اليوم", todaySchedule.length],
      ["تحاضير اليوم", todayPreparations.length],
      ["جلسات حضور اليوم", attendanceSessions.length],
      ["حصص الانتظار اليوم", todayWaiting.length],
      ["إجمالي حصص الانتظار", waiting.length],
      ["الفصول المسندة", teacherClasses.length],
      ["المواد المسندة", teacherSubjects.length],
      ["الشواهد", portfolio.length],
      ["جاهزية الشواهد", `${completionPercent}%`],
      ["جاهزية اليوم", `${dailyReadiness}%`],
    ];
  }

  async function exportTeacherPortalExcel() {
    if (!teacher) return;

    await exportTableToExcel({
      title: "تقرير بوابة المعلم",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: `${teacher.full_name} — ${teacher.subject || teacher.specialization || "-"}`,
      headers: ["المؤشر", "القيمة"],
      rows: getExportRows(),
      fileName: `teacher-portal-${teacher.full_name}-${today}.xlsx`,
      sheetName: "Teacher Portal",
    } as any);

    showToast("success", "تم تصدير تقرير بوابة المعلم Excel");
  }

  function exportTeacherPortalPDF() {
    if (!teacher) return;

    exportTableToPDF({
      title: "تقرير بوابة المعلم",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: `${teacher.full_name} — ${teacher.subject || teacher.specialization || "-"}`,
      headers: ["المؤشر", "القيمة"],
      rows: getExportRows(),
      fileName: `teacher-portal-${teacher.full_name}-${today}.pdf`,
    } as any);

    showToast("success", "تم تجهيز PDF لبوابة المعلم");
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={TEACHER_PORTAL_ROLES}>
        <AppShell>
          <LoadingBox text="جاري تحميل بوابة المعلم..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool || errorMsg || !teacher) {
    return (
      <RoleGuard allowedRoles={TEACHER_PORTAL_ROLES}>
        <AppShell>
          <SummaryCard
            title="تعذر تحميل بوابة المعلم"
            description={errorMsg || "لا توجد مدرسة مرتبطة بالمستخدم الحالي."}
            tone="red"
            icon={<AlertCircle size={22} />}
          />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={TEACHER_PORTAL_ROLES}>
      <AppShell>
        <main className="space-y-5" dir="rtl">
          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title={`أهلًا، ${teacher.full_name}`}
            description="بوابة يومية موحدة للمعلم تجمع الحصة الحالية، التحضير، الحضور، الجدول، الانتظار، الدرجات، التنبيهات، وجاهزية ملف الإنجاز."
            badge="بوابة المعلم"
            icon={<GraduationCap size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة المعلم" },
            ]}
            meta={[
              { label: "اليوم", value: arabicTodayLabel() },
              { label: "المدرسة", value: currentSchool.school_name },
              { label: "المادة", value: teacher.subject || teacher.specialization || "معلم" },
              { label: "جاهزية اليوم", value: `${dailyReadiness}%` },
            ]}
            stats={[
              { label: "حصص اليوم", value: todaySchedule.length, icon: <CalendarDays size={20} />, tone: "blue" },
              { label: "تحاضير اليوم", value: todayPreparations.length, icon: <BookOpenCheck size={20} />, tone: todayPreparations.length >= todaySchedule.length && todaySchedule.length > 0 ? "green" : "gold" },
              { label: "جلسات الحضور", value: attendanceSessions.length, icon: <UserCheck size={20} />, tone: attendanceSessions.length >= todaySchedule.length && todaySchedule.length > 0 ? "green" : "teal" },
              { label: "التنبيهات", value: unreadNotifications, icon: <Bell size={20} />, tone: unreadNotifications > 0 ? "gold" : "green" },
            ]}
            actions={
              <>
                {canChooseTeacher && allTeachers.length > 0 && (
                  <select
                    value={teacher?.id || selectedTeacherId}
                    onChange={(event) => setSelectedTeacherId(event.target.value)}
                    className="h-11 min-w-[230px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] outline-none"
                  >
                    {allTeachers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.full_name}
                      </option>
                    ))}
                  </select>
                )}

                <Link
                  href="/teacher/daily"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0DA9A6] hover:shadow-md"
                >
                  <UserCheck size={17} />
                  متابعة الحصة
                </Link>

                <button
                  type="button"
                  onClick={() => void exportTeacherPortalExcel()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Download size={17} />
                  Excel
                </button>

                <button
                  type="button"
                  onClick={exportTeacherPortalPDF}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <FileText size={17} />
                  PDF
                </button>

                <button
                  type="button"
                  onClick={() => void fetchTeacherPortal()}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <RefreshCcw size={17} className={loading ? "animate-spin" : ""} />
                  تحديث
                </button>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <ExecutiveCard
              title="حصص اليوم"
              value={todaySchedule.length}
              subtitle={`${todayName}`}
              icon={<CalendarDays size={22} />}
              tone="blue"
              progress={todaySchedule.length > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="تحاضير اليوم"
              value={todayPreparations.length}
              subtitle="تحاضير محفوظة"
              icon={<BookOpenCheck size={22} />}
              tone={todayPreparations.length >= todaySchedule.length && todaySchedule.length > 0 ? "green" : "gold"}
              progress={todaySchedule.length ? percentage(todayPreparations.length, todaySchedule.length) : 0}
            />

            <ExecutiveCard
              title="حضور اليوم"
              value={attendanceSessions.length}
              subtitle="جلسات محفوظة"
              icon={<UserCheck size={22} />}
              tone={attendanceSessions.length >= todaySchedule.length && todaySchedule.length > 0 ? "green" : "teal"}
              progress={todaySchedule.length ? percentage(attendanceSessions.length, todaySchedule.length) : 0}
            />

            <ExecutiveCard
              title="حصص انتظار"
              value={todayWaiting.length}
              subtitle="لهذا اليوم"
              icon={<ClipboardCheck size={22} />}
              tone={todayWaiting.length > 0 ? "gold" : "green"}
              progress={todayWaiting.length ? 100 : 0}
            />

            <ExecutiveCard
              title="الشواهد"
              value={`${completionPercent}%`}
              subtitle={readinessLabel}
              icon={<BadgeCheck size={22} />}
              tone={completionPercent >= 75 ? "green" : "gold"}
              progress={completionPercent}
            />

            <ExecutiveCard
              title="جاهزية اليوم"
              value={`${dailyReadiness}%`}
              subtitle="تحضير + حضور"
              icon={<Sparkles size={22} />}
              tone={dailyReadiness >= 80 ? "green" : "gold"}
              progress={dailyReadiness}
            />
          </section>

          <SummaryCard
            title="الملخص التنفيذي للمعلم"
            description="قراءة سريعة لحالة اليوم الدراسي، جاهزية التحضير والحضور، والتنبيهات التي تحتاج متابعة."
            tone={dailyReadiness >= 75 && completionPercent >= 70 ? "green" : "gold"}
            items={[
              { label: "الحصة الحالية", value: currentLesson ? periodLabel(currentLesson.period_number) : "لا توجد حصة" },
              { label: "الحصة القادمة", value: nextLesson ? periodLabel(nextLesson.period_number) : "لا توجد" },
              { label: "جاهزية الشواهد", value: `${completionPercent}%` },
              { label: "تحاضير اليوم", value: todayPreparations.length },
              { label: "حضور اليوم", value: attendanceSessions.length },
              { label: "انتظار بانتظار الاعتماد", value: pendingWaiting },
            ]}
            footer="تعتمد المؤشرات على البيانات المسجلة في الجداول الحالية دون إنشاء أي جداول جديدة."
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="grid gap-5 xl:grid-cols-[auto_1fr_auto] xl:items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-[#15445A] text-3xl font-black text-[#C1B489]">
                {teacher.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={teacher.photo_url} alt={teacher.full_name} className="h-full w-full rounded-[28px] object-cover" />
                ) : (
                  teacherInitials(teacher.full_name)
                )}
              </div>

              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <MiniBadge tone="blue">{teacher.subject || teacher.specialization || "معلم"}</MiniBadge>
                  <MiniBadge tone={completionPercent >= 70 ? "green" : "gold"}>الشواهد: {readinessLabel}</MiniBadge>
                  <MiniBadge tone={dailyReadiness >= 75 ? "green" : "gold"}>جاهزية اليوم: {dailyReadiness}%</MiniBadge>
                </div>

                <h2 className="text-2xl font-black text-[#15445A]">{teacher.full_name}</h2>

                <p className="mt-2 text-sm leading-7 text-slate-500">
                  {teacher.department || "قسم غير محدد"} • النصاب الأسبوعي: {weeklyLoad || "—"} • الفصول المسندة: {teacherClasses.length}
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-400">الحصة الأقرب</p>
                <h3 className="mt-2 text-lg font-black text-[#15445A]">
                  {currentLesson ? lessonSubject(currentLesson, teacher) : "لا توجد حصة اليوم"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {currentLesson ? `${periodLabel(currentLesson.period_number)} — ${lessonClass(currentLesson)}` : "اليوم بدون حصص مجدولة"}
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_.95fr]">
            <Panel title="الحصة الحالية" icon={<Clock size={24} />}>
              {!currentLesson ? (
                <EmptyBox text="لا توجد حصص مجدولة اليوم." />
              ) : (
                <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#3D7EB9]/10 px-3 py-1 text-xs font-black text-[#3D7EB9]">
                      {periodLabel(currentLesson.period_number)}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                      {lessonSubject(currentLesson, teacher)}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                      {lessonClass(currentLesson)}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-[#15445A]">
                    {lessonSubject(currentLesson, teacher)}
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    القاعة: {currentLesson.room || "—"}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <ActionLink href="/teacher/daily" label="متابعة الحصة" icon={<UserCheck size={16} />} gold />
                    <ActionLink href="/teacher/preparations" label="التحضير" icon={<BookOpenCheck size={16} />} dark />
                    <ActionLink href="/grades" label="الدرجات" icon={<Award size={16} />} />
                  </div>
                </div>
              )}
            </Panel>

            <Panel title="الحصة القادمة والتنبيهات" icon={<Bell size={24} />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="الحصة القادمة" value={nextLesson ? `${periodLabel(nextLesson.period_number)} — ${lessonSubject(nextLesson, teacher)}` : "لا توجد"} />
                <InfoRow label="الفصل القادم" value={nextLesson ? lessonClass(nextLesson) : "—"} />
                <InfoRow label="تنبيهات غير مقروءة" value={String(unreadNotifications)} />
                <InfoRow label="انتظار قيد الاعتماد" value={String(pendingWaiting)} />
              </div>

              {notifications.length > 0 && (
                <div className="mt-4 space-y-2">
                  {notifications.slice(0, 3).map((item) => (
                    <MiniItem
                      key={item.id}
                      title={item.title || "تنبيه"}
                      desc={item.message || formatDate(item.created_at)}
                      status={item.is_read === false ? "جديد" : "مقروء"}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5 print:hidden">
            {QUICK_LINKS.map((link) => (
              <QuickLinkCard key={link.href} link={link} />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Panel title="خط اليوم الدراسي" icon={<LayoutDashboard size={24} />}>
              {timelineItems.length === 0 ? (
                <EmptyBox text="لا توجد حصص اليوم." />
              ) : (
                <div className="relative space-y-3 before:absolute before:right-5 before:top-0 before:h-full before:w-px before:bg-slate-200">
                  {timelineItems.slice(0, 7).map((item) => (
                    <div key={item.id} className="relative pr-12">
                      <div className="absolute right-0 top-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-[#0DA9A6]/20 bg-[#0DA9A6]/10 text-[#0DA9A6]">
                        <Clock size={16} />
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-black text-[#15445A]">{lessonSubject(item, teacher)}</h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {periodLabel(item.period_number)} — {lessonClass(item)}
                            </p>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className={`rounded-full px-2 py-1 text-[11px] font-black ${item.hasPreparation ? "bg-[#07A869]/10 text-[#07A869]" : "bg-[#C1B489]/20 text-[#15445A]"}`}>
                              {item.hasPreparation ? "محضرة" : "تحتاج تحضير"}
                            </span>

                            <span className={`rounded-full px-2 py-1 text-[11px] font-black ${item.hasAttendance ? "bg-[#07A869]/10 text-[#07A869]" : "bg-slate-100 text-slate-500"}`}>
                              {item.hasAttendance ? "حضور محفوظ" : "لم يحفظ الحضور"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="التحاضير الأخيرة" icon={<FileText size={24} />}>
              {preparations.length === 0 ? (
                <EmptyBox text="لم يتم تسجيل تحاضير بعد." />
              ) : (
                <div className="space-y-3">
                  {preparations.slice(0, 6).map((item) => (
                    <MiniItem
                      key={item.id}
                      title={item.lesson_title || item.subject || "تحضير درس"}
                      desc={`${formatDate(item.lesson_date)} — ${periodLabel(item.period_number)}`}
                      status={item.preparation_status || "مسودة"}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="ملف الإنجاز والشواهد" icon={<ShieldCheck size={24} />}>
              <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between text-sm font-black">
                  <span className="text-slate-500">جاهزية الشواهد</span>
                  <span className="text-[#15445A]">{completionPercent}%</span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${completionPercent >= 70 ? "bg-[#07A869]" : "bg-[#C1B489]"}`}
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>

                <p className="mt-3 text-sm font-bold text-slate-500">
                  {uploadedRequiredCount} من {requiredEvidence.length || portfolio.length} شاهد مكتمل.
                </p>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <MiniStat label="الشواهد" value={portfolio.length} />
                <MiniStat label="معتمدة" value={approvedPortfolio} />
                <MiniStat label="قيد المراجعة" value={pendingPortfolio} />
                <MiniStat label="العناصر" value={elements.length} />
              </div>

              <Link
                href={`/teachers/${teacher.id}/portfolio`}
                className="mt-4 flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] text-sm font-black text-white"
              >
                <Award size={17} />
                فتح ملف الإنجاز
              </Link>
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Panel title="جدول اليوم" icon={<BookOpenCheck size={24} />}>
              {todaySchedule.length === 0 ? (
                <EmptyBox text="لا توجد حصص اليوم." />
              ) : (
                <div className="space-y-3">
                  {todaySchedule.slice(0, 6).map((item) => (
                    <LessonCard
                      key={item.id}
                      period={item.period_number || "-"}
                      title={lessonClass(item)}
                      desc={`${lessonSubject(item, teacher)} — ${item.room || "بدون قاعة"}`}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="حصص الانتظار" icon={<Timer size={24} />}>
              {waiting.length === 0 ? (
                <EmptyBox text="لا توجد حصص انتظار مسندة." />
              ) : (
                <div className="space-y-3">
                  {waiting.slice(0, 5).map((item) => (
                    <MiniItem
                      key={item.id}
                      title={`${lessonClass(item)} — ${periodLabel(item.period_number)}`}
                      desc={`${item.day_name || "—"} — ${formatDate(item.waiting_date)}`}
                      status={item.approval_status || item.status || "بانتظار الاعتماد"}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="بيانات مختصرة" icon={<UserRoundCheck size={24} />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="المعلم" value={teacher.full_name || "-"} />
                <InfoRow label="المادة" value={teacher.subject || teacher.specialization || "-"} />
                <InfoRow label="القسم" value={teacher.department || "-"} />
                <InfoRow label="النصاب" value={String(teacher.weekly_load ?? "-")} />
                <InfoRow label="الفصول" value={String(teacherClasses.length)} />
                <InfoRow label="المواد" value={String(teacherSubjects.length)} />
              </div>
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
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          {icon}
        </div>

        <h2 className="text-xl font-black text-[#15445A]">{title}</h2>
      </div>

      {children}
    </section>
  );
}

function LessonCard({
  period,
  title,
  desc,
}: {
  period: string | number;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-[#15445A]">{title}</h3>

        <span className="rounded-full bg-[#C1B489]/15 px-3 py-1 text-xs font-black text-[#15445A]">
          الحصة {period}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-500">{desc}</p>
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
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClasses(link.tone)}`}>
        <Icon size={24} />
      </div>

      <h3 className="text-lg font-black text-[#15445A]">{link.title}</h3>

      <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500">
        {link.description}
      </p>

      <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 text-xs font-black text-[#15445A] transition group-hover:bg-[#15445A] group-hover:text-white">
        <Eye size={15} />
        فتح
      </div>
    </Link>
  );
}

function toneClasses(tone: QuickLink["tone"]) {
  const tones: Record<QuickLink["tone"], string> = {
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    green: "bg-[#07A869]/10 text-[#07A869]",
    gold: "bg-[#C1B489]/20 text-[#15445A]",
    red: "bg-red-50 text-red-700",
    teal: "bg-[#0DA9A6]/10 text-[#0DA9A6]",
    slate: "bg-slate-100 text-slate-700",
  };

  return tones[tone];
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-1 font-black text-[#15445A]">{value}</p>
    </div>
  );
}

function MiniItem({
  title,
  desc,
  status,
}: {
  title: string;
  desc: string;
  status: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="line-clamp-1 font-black text-[#15445A]">{title}</h3>

        <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusPill(status)}`}>
          {status}
        </span>
      </div>

      <p className="text-sm text-slate-500">{desc}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:bg-white">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className="text-xl font-black text-[#15445A]">{value}</span>
    </div>
  );
}

function MiniBadge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "blue" | "green" | "gold" | "red";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-[#3D7EB9]/20 bg-[#3D7EB9]/10 text-[#3D7EB9]",
    green: "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]",
    gold: "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]",
    red: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${tones[tone]}`}>
      {children}
    </span>
  );
}

function ActionLink({
  href,
  label,
  icon,
  dark,
  gold,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  dark?: boolean;
  gold?: boolean;
}) {
  const style = dark
    ? "bg-[#15445A] text-white"
    : gold
      ? "bg-[#C1B489] text-[#15445A]"
      : "bg-white text-[#15445A]";

  return (
    <Link
      href={href}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${style}`}
    >
      {icon}
      {label}
    </Link>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <EmptyState
      title="لا توجد بيانات"
      description={text}
    />
  );
}

function LoadingBox({ text }: { text: string }) {
  return <PageLoader text={text} />;
}

function ToastBox({ toast }: { toast: Toast }) {
  if (toast.type === "success") {
    return <SuccessBanner description={toast.message} className="print:hidden" />;
  }

  return (
    <ErrorState
      title="حدث خطأ"
      description={toast.message}
      className="print:hidden"
    />
  );
}

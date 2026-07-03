"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import RoleGuard from "@/components/auth/RoleGuard";
import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  AlertCircle,
  Award,
  BarChart3,
  Brain,
  CalendarCheck,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HeartPulse,
  Loader2,
  PieChart,
  Printer,
  RefreshCcw,
  Search,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";

type Student = {
  id: string;
  full_name?: string | null;
  student_number?: string | null;
  parent_phone?: string | null;
  guardian_phone?: string | null;
  guardian_name?: string | null;
  guardian_email?: string | null;
  grade_level?: string | null;
  grade_name?: string | null;
  classroom?: string | null;
  classroom_name?: string | null;
  class_name?: string | null;
  section?: string | null;
  status?: string | null;
};

type AttendanceRow = {
  id: string;
  student_id?: string | null;
  status?: string | null;
  attendance_status?: string | null;
  attendance_date?: string | null;
};

type GradeRow = {
  id: string;
  student_id?: string | null;
  assessment_name?: string | null;
  subject?: string | null;
  subject_name?: string | null;
  homework_score?: number | null;
  participation_score?: number | null;
  quiz_score?: number | null;
  midterm_score?: number | null;
  final_score?: number | null;
  total_score?: number | null;
  score?: number | null;
  max_score?: number | null;
  percentage?: number | null;
  grade_label?: string | null;
  result_status?: string | null;
  semester?: string | null;
  academic_year?: string | null;
};

type ClassRow = {
  id: string;
  name?: string | null;
  class_name?: string | null;
  classroom_name?: string | null;
  grade_level?: string | null;
  grade_name?: string | null;
  section?: string | null;
};

type BehaviorRow = {
  id: string;
  student_id?: string | null;
  violation_type?: string | null;
  violation_level?: string | null;
  status?: string | null;
  behavior_date?: string | null;
};

type ReferralRow = {
  id: string;
  student_id?: string | null;
  reason?: string | null;
  status?: string | null;
  referred_at?: string | null;
};

type RiskStudent = Student & {
  absent: number;
  late: number;
  behaviorCount: number;
  openReferrals: number;
  gradeAverage: number;
  riskScore: number;
  riskLabel: "مرتفع" | "متوسط" | "منخفض" | "مستقر";
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type ExportData = {
  title: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
};

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

type QueryLike<T> = PromiseLike<QueryResult<T>>;

type Tone = "blue" | "green" | "amber" | "red" | "slate" | "purple";

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayArabicLabel() {
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

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function studentName(student: Student) {
  return student.full_name || "طالب بدون اسم";
}

function studentClassLabel(student: Student) {
  const grade = student.grade_name || student.grade_level || "";
  const classroom = student.classroom_name || student.class_name || student.classroom || "";
  const section = student.section || "";

  return [grade, classroom, section].filter(Boolean).join(" - ") || "غير محدد";
}

function classLabel(item: ClassRow) {
  const grade = item.grade_name || item.grade_level || "";
  const name = item.classroom_name || item.name || item.class_name || "";
  const section = item.section || "";

  return [grade, name, section].filter(Boolean).join(" - ") || "فصل غير محدد";
}

function normalizeAttendanceStatus(value?: string | null) {
  const status = String(value || "").trim();

  if (status === "present" || status === "حاضر") return "حاضر";
  if (status === "absent" || status === "غائب") return "غائب";
  if (status === "late" || status === "متأخر") return "متأخر";
  if (status === "excused" || status === "مستأذن" || status === "بعذر") return "مستأذن";

  return status || "غير مرصود";
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

function isExcused(status?: string | null) {
  return normalizeAttendanceStatus(status) === "مستأذن";
}

function isOpenReferral(status?: string | null) {
  const value = String(status || "").trim();

  return ![
    "مغلق",
    "مغلقة",
    "تم الإغلاق",
    "مكتملة",
    "مستقرة",
    "closed",
  ].includes(value);
}

function gradePercent(item: GradeRow) {
  const percentage = Number(item.percentage);
  if (Number.isFinite(percentage) && percentage > 0) return Math.round(percentage);

  const totalScore = Number(item.total_score);
  if (Number.isFinite(totalScore) && totalScore > 0) return Math.round(totalScore);

  const score = Number(item.score);
  const maxScore = Number(item.max_score);

  if (Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0) {
    return Math.round((score / maxScore) * 100);
  }

  const scores = [
    item.homework_score,
    item.participation_score,
    item.quiz_score,
    item.midterm_score,
    item.final_score,
  ]
    .map((value) => Number(value || 0))
    .filter((value) => value > 0);

  if (scores.length === 0) return 0;

  return Math.min(
    100,
    Math.round(scores.reduce((sum, value) => sum + value, 0)),
  );
}

function riskLabel(score: number): RiskStudent["riskLabel"] {
  if (score >= 70) return "مرتفع";
  if (score >= 35) return "متوسط";
  if (score > 0) return "منخفض";
  return "مستقر";
}

function colorForRate(value: number): Tone {
  if (value >= 85) return "green";
  if (value >= 70) return "amber";
  return "red";
}

function gradeTone(value: number): Tone {
  if (value >= 85) return "green";
  if (value >= 70) return "amber";
  if (value > 0) return "red";
  return "slate";
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
      console.warn(`analytics query skipped: ${label}`, result.error);
      return fallback;
    }

    return result.data ?? fallback;
  } catch (error) {
    console.warn(`analytics query failed: ${label}`, error);
    return fallback;
  }
}

export default function AnalyticsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [behavior, setBehavior] = useState<BehaviorRow[]>([]);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);

  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedDate, setSelectedDate] = useState(todayDate());

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const [
        studentsData,
        attendanceData,
        gradesData,
        classesData,
        behaviorData,
        referralsData,
      ] = await Promise.all([
        safeQuery<Student[]>(
          supabase
            .from("students")
            .select(
              "id, full_name, student_number, parent_phone, guardian_phone, guardian_name, guardian_email, grade_level, grade_name, classroom, classroom_name, class_name, section, status",
            )
            .eq("school_id", currentSchool.id),
          [],
          "students",
        ),
        safeQuery<AttendanceRow[]>(
          supabase
            .from("student_attendance_records")
            .select("id, student_id, status, attendance_status, attendance_date")
            .eq("school_id", currentSchool.id)
            .limit(1500),
          [],
          "student_attendance_records",
        ),
        safeQuery<GradeRow[]>(
          supabase
            .from("grades")
            .select(
              "id, student_id, assessment_name, subject, subject_name, homework_score, participation_score, quiz_score, midterm_score, final_score, total_score, score, max_score, percentage, grade_label, result_status, semester, academic_year",
            )
            .eq("school_id", currentSchool.id)
            .limit(1500),
          [],
          "grades",
        ),
        safeQuery<ClassRow[]>(
          supabase
            .from("classes")
            .select("id, name, class_name, classroom_name, grade_level, grade_name, section")
            .eq("school_id", currentSchool.id),
          [],
          "classes",
        ),
        safeQuery<BehaviorRow[]>(
          supabase
            .from("student_behavior")
            .select("id, student_id, violation_type, violation_level, status, behavior_date")
            .eq("school_id", currentSchool.id)
            .limit(800),
          [],
          "student_behavior",
        ),
        safeQuery<ReferralRow[]>(
          supabase
            .from("student_referrals")
            .select("id, student_id, reason, status, referred_at")
            .eq("school_id", currentSchool.id)
            .limit(800),
          [],
          "student_referrals",
        ),
      ]);

      setStudents(studentsData);
      setAttendance(attendanceData);
      setGrades(gradesData);
      setClasses(classesData);
      setBehavior(behaviorData);
      setReferrals(referralsData);
    } catch (error) {
      const message = getErrorMessage(error, "تعذر تحميل صفحة التحليلات.");
      setErrorMsg(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, showToast]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setErrorMsg("لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      setLoading(false);
      return;
    }

    queueMicrotask(() => {
      void loadAnalytics();
    });
  }, [currentSchool?.id, loadAnalytics, schoolLoading]);

  const classOptions = useMemo(() => {
    const fromClasses = classes.map((item) => classLabel(item));
    const fromStudents = students.map((student) => studentClassLabel(student));

    return Array.from(new Set([...fromClasses, ...fromStudents]))
      .filter((value) => value && value !== "غير محدد" && value !== "فصل غير محدد")
      .sort((a, b) => a.localeCompare(b, "ar"));
  }, [classes, students]);

  const filteredStudents = useMemo(() => {
    const q = normalizeText(search);

    return students.filter((student) => {
      const phone = student.parent_phone || student.guardian_phone || "";

      const matchSearch =
        !q ||
        normalizeText(student.full_name).includes(q) ||
        normalizeText(student.student_number).includes(q) ||
        normalizeText(student.guardian_name).includes(q) ||
        normalizeText(student.guardian_email).includes(q) ||
        normalizeText(phone).includes(q);

      const matchClass =
        selectedClass === "all" || studentClassLabel(student) === selectedClass;

      return matchSearch && matchClass;
    });
  }, [students, search, selectedClass]);

  const filteredStudentIds = useMemo(() => {
    return new Set(filteredStudents.map((student) => student.id));
  }, [filteredStudents]);

  const attendanceToday = useMemo(() => {
    return attendance.filter(
      (item) =>
        item.student_id &&
        filteredStudentIds.has(item.student_id) &&
        item.attendance_date === selectedDate,
    );
  }, [attendance, filteredStudentIds, selectedDate]);

  const attendanceStats = useMemo(() => {
    const present = attendanceToday.filter((item) =>
      isPresent(item.attendance_status || item.status),
    ).length;

    const absent = attendanceToday.filter((item) =>
      isAbsent(item.attendance_status || item.status),
    ).length;

    const late = attendanceToday.filter((item) =>
      isLate(item.attendance_status || item.status),
    ).length;

    const excused = attendanceToday.filter((item) =>
      isExcused(item.attendance_status || item.status),
    ).length;

    const marked = present + absent + late + excused;

    return {
      present,
      absent,
      late,
      excused,
      unmarked: Math.max(filteredStudents.length - marked, 0),
      totalMarked: marked,
    };
  }, [attendanceToday, filteredStudents.length]);

  const attendanceRate = useMemo(() => {
    if (filteredStudents.length === 0) return 0;

    return Math.round((attendanceStats.present / filteredStudents.length) * 100);
  }, [attendanceStats.present, filteredStudents.length]);

  const filteredGrades = useMemo(() => {
    return grades.filter(
      (item) => item.student_id && filteredStudentIds.has(item.student_id),
    );
  }, [grades, filteredStudentIds]);

  const averageGrade = useMemo(() => {
    const values = filteredGrades.map(gradePercent).filter((value) => value > 0);

    if (values.length === 0) return 0;

    return Math.round(
      values.reduce((sum, value) => sum + value, 0) / values.length,
    );
  }, [filteredGrades]);

  const weeklyAttendanceData = useMemo(() => {
    const grouped: Record<
      string,
      { date: string; present: number; absent: number; late: number }
    > = {};

    attendance.forEach((item) => {
      if (!item.student_id || !filteredStudentIds.has(item.student_id)) return;
      if (!item.attendance_date) return;

      if (!grouped[item.attendance_date]) {
        grouped[item.attendance_date] = {
          date: item.attendance_date,
          present: 0,
          absent: 0,
          late: 0,
        };
      }

      if (isPresent(item.attendance_status || item.status)) {
        grouped[item.attendance_date].present += 1;
      }

      if (isAbsent(item.attendance_status || item.status)) {
        grouped[item.attendance_date].absent += 1;
      }

      if (isLate(item.attendance_status || item.status)) {
        grouped[item.attendance_date].late += 1;
      }
    });

    return Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
  }, [attendance, filteredStudentIds]);

  const gradeDistribution = useMemo(() => {
    const ranges = {
      "90-100": 0,
      "80-89": 0,
      "70-79": 0,
      "60-69": 0,
      "أقل من 60": 0,
    };

    filteredGrades.forEach((item) => {
      const percent = gradePercent(item);

      if (percent <= 0) return;

      if (percent >= 90) ranges["90-100"] += 1;
      else if (percent >= 80) ranges["80-89"] += 1;
      else if (percent >= 70) ranges["70-79"] += 1;
      else if (percent >= 60) ranges["60-69"] += 1;
      else ranges["أقل من 60"] += 1;
    });

    return Object.entries(ranges).map(([range, count]) => ({
      range,
      count,
    }));
  }, [filteredGrades]);

  const classPerformance = useMemo(() => {
    return classOptions.map((className) => {
      const classStudents = filteredStudents.filter(
        (student) => studentClassLabel(student) === className,
      );

      const ids = new Set(classStudents.map((student) => student.id));

      const classGrades = grades.filter(
        (item) => item.student_id && ids.has(item.student_id),
      );

      const values = classGrades.map(gradePercent).filter((value) => value > 0);

      const average = values.length
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        : 0;

      const classAttendance = attendance.filter(
        (item) => item.student_id && ids.has(item.student_id),
      );

      const present = classAttendance.filter((item) =>
        isPresent(item.attendance_status || item.status),
      ).length;

      const rate = classAttendance.length
        ? Math.round((present / classAttendance.length) * 100)
        : 0;

      return {
        className,
        studentsCount: classStudents.length,
        average,
        attendanceRate: rate,
      };
    }).filter((item) => item.studentsCount > 0);
  }, [classOptions, filteredStudents, grades, attendance]);

  const studentRiskList = useMemo<RiskStudent[]>(() => {
    return filteredStudents
      .map((student) => {
        const studentAttendance = attendance.filter(
          (item) => item.student_id === student.id,
        );

        const absent = studentAttendance.filter((item) =>
          isAbsent(item.attendance_status || item.status),
        ).length;

        const late = studentAttendance.filter((item) =>
          isLate(item.attendance_status || item.status),
        ).length;

        const studentGrades = grades.filter(
          (item) => item.student_id === student.id,
        );

        const values = studentGrades
          .map(gradePercent)
          .filter((value) => value > 0);

        const gradeAverage =
          values.length === 0
            ? 0
            : Math.round(
                values.reduce((sum, value) => sum + value, 0) / values.length,
              );

        const behaviorCount = behavior.filter(
          (item) => item.student_id === student.id,
        ).length;

        const openReferrals = referrals.filter(
          (item) => item.student_id === student.id && isOpenReferral(item.status),
        ).length;

        const riskScore =
          absent * 12 +
          late * 6 +
          behaviorCount * 8 +
          openReferrals * 12 +
          (values.length > 0 && gradeAverage < 60 ? 35 : 0) +
          (values.length > 0 && gradeAverage < 75 ? 15 : 0);

        return {
          ...student,
          absent,
          late,
          behaviorCount,
          openReferrals,
          gradeAverage,
          riskScore,
          riskLabel: riskLabel(riskScore),
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);
  }, [filteredStudents, attendance, grades, behavior, referrals]);

  const riskStudentsCount = studentRiskList.filter(
    (item) => item.riskScore > 0,
  ).length;

  const attendancePieData = [
    { name: "حاضر", value: attendanceStats.present },
    { name: "غائب", value: attendanceStats.absent },
    { name: "متأخر", value: attendanceStats.late },
    { name: "مستأذن", value: attendanceStats.excused },
    { name: "غير مرصود", value: attendanceStats.unmarked },
  ];

  const followUpTotal =
    attendanceStats.absent +
    attendanceStats.late +
    attendanceStats.unmarked +
    riskStudentsCount;

  const aiInsights = [
    attendanceRate < 80
      ? "مؤشر الحضور منخفض، يوصى بمتابعة الغياب وإشعار أولياء الأمور للحالات المتكررة."
      : "مؤشر الحضور جيد حاليًا، مع أهمية الاستمرار في متابعة الحالات المتكررة.",
    averageGrade > 0 && averageGrade < 70
      ? "متوسط الدرجات يحتاج خطة علاجية للطلاب المتعثرين ومراجعة أداء المواد."
      : "متوسط التحصيل الدراسي مطمئن حاليًا حسب البيانات المتاحة.",
    riskStudentsCount > 0
      ? `يوجد ${riskStudentsCount} طالب يحتاج متابعة وفق مؤشر التعثر.`
      : "لا توجد مؤشرات خطر واضحة حاليًا حسب البيانات المتاحة.",
  ];

  function getExportData(): ExportData {
    return {
      title: "تقرير التحليلات الذكية",
      headers: [
        "اسم الطالب",
        "رقم الطالب",
        "الفصل",
        "ولي الأمر",
        "جوال ولي الأمر",
        "الغياب",
        "التأخر",
        "السلوك",
        "الإحالات المفتوحة",
        "متوسط الدرجات",
        "مؤشر التعثر",
        "تصنيف التعثر",
      ],
      rows: studentRiskList.map((student) => [
        studentName(student),
        student.student_number || "",
        studentClassLabel(student),
        student.guardian_name || "",
        student.parent_phone || student.guardian_phone || "",
        student.absent,
        student.late,
        student.behaviorCount,
        student.openReferrals,
        student.gradeAverage > 0 ? `${student.gradeAverage}%` : "لا توجد درجات",
        student.riskScore,
        student.riskLabel,
      ]),
    };
  }

  function exportPDF() {
    const data = getExportData();

    (exportTableToPDF as any)({
      title: data.title,
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "تقرير صادر من مركز التحليلات الذكية",
      headers: data.headers,
      rows: data.rows,
      fileName: `${data.title}.pdf`,
    });

    showToast("success", "تم تصدير تقرير التحليلات PDF");
  }

  function exportExcel() {
    const data = getExportData();

    (exportTableToExcel as any)({
      title: data.title,
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "تقرير صادر من مركز التحليلات الذكية",
      headers: data.headers,
      rows: data.rows,
      fileName: `${data.title}.xlsx`,
      sheetName: "Analytics",
    });

    showToast("success", "تم تصدير تقرير التحليلات Excel");
  }

  function printAnalytics() {
    window.print();
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <div className="flex min-h-[55vh] items-center justify-center">
            <div className="rounded-[28px] border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <p className="font-bold">جاري تحميل مركز التحليلات...</p>
            </div>
          </div>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-5" dir="rtl">
          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="مركز التحليلات الذكية"
            description="لوحة تنفيذية لتحليل الحضور والدرجات والفصول ومؤشرات التعثر مع توصيات تساعد الإدارة المدرسية على اتخاذ القرار اليومي."
            badge="منصة المدرسة الذكية"
            icon={<Brain size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "التحليلات" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "منصة المدرسة الذكية" },
              { label: "اليوم", value: getTodayArabicLabel() },
              { label: "تاريخ التحليل", value: selectedDate },
              { label: "الفصل المحدد", value: selectedClass === "all" ? "كل الفصول" : selectedClass },
            ]}
            stats={[
              { label: "الطلاب", value: filteredStudents.length, icon: <Users size={20} />, tone: "blue" },
              { label: "نسبة الحضور", value: `${attendanceRate}%`, icon: <CalendarCheck size={20} />, tone: colorForRate(attendanceRate) === "amber" ? "gold" : colorForRate(attendanceRate) },
              { label: "متوسط الدرجات", value: averageGrade > 0 ? `${averageGrade}%` : "—", icon: <GraduationCap size={20} />, tone: gradeTone(averageGrade) === "amber" ? "gold" : gradeTone(averageGrade) === "purple" ? "primary" : gradeTone(averageGrade) },
              { label: "مؤشرات المتابعة", value: followUpTotal, icon: <ShieldAlert size={20} />, tone: followUpTotal > 0 ? "red" : "green" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void loadAnalytics()}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <RefreshCcw size={17} className={loading ? "animate-spin" : ""} />
                  تحديث
                </button>

                <button
                  type="button"
                  onClick={printAnalytics}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Printer size={17} />
                  طباعة
                </button>

                <button
                  type="button"
                  onClick={exportPDF}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <FileText size={17} />
                  PDF
                </button>

                <button
                  type="button"
                  onClick={exportExcel}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <FileSpreadsheet size={17} />
                  Excel
                </button>
              </>
            }
          />

          {errorMsg && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
              {errorMsg}
            </div>
          )}

          <PageToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "بحث باسم الطالب أو الرقم أو ولي الأمر...",
            }}
            filters={
              <>
                <ToolbarSelect value={selectedClass} onChange={setSelectedClass}>
                  <option value="all">كل الفصول</option>
                  {classOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </ToolbarSelect>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-[#15445A] outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                />
              </>
            }
            onRefresh={() => void loadAnalytics()}
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
            onPrint={printAnalytics}
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ExecutiveCard
              title="الطلاب"
              value={filteredStudents.length}
              subtitle="حسب الفلاتر الحالية"
              icon={<Users size={24} />}
              tone="blue"
              progress={filteredStudents.length > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="نسبة الحضور"
              value={`${attendanceRate}%`}
              subtitle={`${attendanceStats.present} حاضر — ${attendanceStats.absent} غائب`}
              icon={<CalendarCheck size={24} />}
              tone={colorForRate(attendanceRate) === "amber" ? "gold" : colorForRate(attendanceRate)}
              progress={attendanceRate}
            />

            <ExecutiveCard
              title="متوسط الدرجات"
              value={averageGrade > 0 ? `${averageGrade}%` : "—"}
              subtitle={averageGrade > 0 ? "متوسط الدرجات المسجلة" : "لا توجد درجات مسجلة"}
              icon={<GraduationCap size={24} />}
              tone={gradeTone(averageGrade) === "amber" ? "gold" : gradeTone(averageGrade)}
              progress={averageGrade}
            />

            <ExecutiveCard
              title="السلوك والإحالات"
              value={behavior.length + referrals.length}
              subtitle={`${behavior.length} سلوك — ${referrals.length} إحالة`}
              icon={<HeartPulse size={24} />}
              tone={behavior.length + referrals.length > 0 ? "gold" : "green"}
              progress={behavior.length + referrals.length > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="مؤشرات تحتاج متابعة"
              value={followUpTotal}
              subtitle="غياب وتأخر وغير مرصود وتعثر"
              icon={<ShieldAlert size={24} />}
              tone={followUpTotal > 0 ? "red" : "green"}
              progress={followUpTotal > 0 ? 100 : 0}
            />
          </section>

          <SummaryCard
            title="الملخص التنفيذي للتحليلات"
            description="قراءة سريعة لأهم مؤشرات المدرسة حسب الفلاتر الحالية: الحضور، الدرجات، السلوك، الإحالات، ومؤشرات التعثر."
            tone={followUpTotal > 0 ? "gold" : "green"}
            items={[
              { label: "الطلاب", value: filteredStudents.length },
              { label: "نسبة الحضور", value: `${attendanceRate}%` },
              { label: "متوسط الدرجات", value: averageGrade > 0 ? `${averageGrade}%` : "—" },
              { label: "الغياب", value: attendanceStats.absent },
              { label: "التأخر", value: attendanceStats.late },
              { label: "مؤشرات متابعة", value: followUpTotal },
            ]}
            footer="تتأثر دقة التحليلات باكتمال رصد الحضور والدرجات والسلوك والإحالات داخل المنصة."
          />

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel title="المؤشر الأسبوعي للحضور" icon={<TrendingUp size={22} />}>
              {weeklyAttendanceData.length === 0 ? (
                <EmptyBox text="لا توجد بيانات حضور كافية لعرض المؤشر." />
              ) : (
                <div className="space-y-3">
                  {weeklyAttendanceData.map((item) => (
                    <div key={item.date} className="rounded-2xl bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-black text-[#15445A]">
                          {formatDate(item.date)}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          حضور {item.present} / غياب {item.absent} / تأخر{" "}
                          {item.late}
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[#0DA9A6]"
                          style={{
                            width: `${Math.min(
                              Math.round(
                                (item.present /
                                  Math.max(
                                    item.present + item.absent + item.late,
                                    1,
                                  )) *
                                  100,
                              ),
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="توزيع حضور اليوم" icon={<PieChart size={22} />}>
              <div className="space-y-3">
                {attendancePieData.map((item) => (
                  <ProgressRow
                    key={item.name}
                    label={item.name}
                    value={item.value}
                    total={filteredStudents.length || 1}
                  />
                ))}
              </div>
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel title="توزيع الدرجات" icon={<BarChart3 size={22} />}>
              <div className="space-y-3">
                {gradeDistribution.map((item) => (
                  <ProgressRow
                    key={item.range}
                    label={item.range}
                    value={item.count}
                    total={Math.max(filteredGrades.length, 1)}
                  />
                ))}
              </div>
            </Panel>

            <section className="rounded-3xl bg-gradient-to-l from-[#15445A] via-[#15445A] to-[#0DA9A6] p-5 text-white shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Brain className="text-[#C1B489]" />
                <h2 className="text-xl font-black">توصيات ذكية</h2>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {aiInsights.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm leading-7 text-slate-100"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-[#15445A]">
                  أداء الفصول
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  مقارنة مبسطة بين الفصول حسب متوسط الدرجات والحضور.
                </p>
              </div>
              <Award className="text-[#15445A]" />
            </div>

            {classPerformance.length === 0 ? (
              <EmptyBox text="لا توجد بيانات كافية لعرض أداء الفصول." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {classPerformance.slice(0, 8).map((item) => (
                  <div key={item.className} className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-black text-[#15445A]">
                        {item.className}
                      </h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                        {item.studentsCount} طالب
                      </span>
                    </div>

                    <ProgressRow
                      label="متوسط الدرجات"
                      value={item.average}
                      total={100}
                    />
                    <div className="mt-2">
                      <ProgressRow
                        label="نسبة الحضور"
                        value={item.attendanceRate}
                        total={100}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#15445A]">
                  الطلاب الأعلى احتياجًا للمتابعة
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  يعتمد المؤشر على الغياب، التأخر، السلوك، الإحالات، وانخفاض الدرجات.
                </p>
              </div>

              <span className="w-fit rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-500">
                أعلى 10 طلاب
              </span>
            </div>

            {studentRiskList.length === 0 ? (
              <EmptyBox text="لا توجد بيانات كافية لعرض الطلاب المتعثرين." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-right text-xs font-black text-slate-500">
                      <th className="rounded-r-2xl px-4 py-3">الطالب</th>
                      <th className="px-4 py-3">الفصل</th>
                      <th className="px-4 py-3">ولي الأمر</th>
                      <th className="px-4 py-3">الغياب</th>
                      <th className="px-4 py-3">التأخر</th>
                      <th className="px-4 py-3">السلوك</th>
                      <th className="px-4 py-3">الإحالات</th>
                      <th className="px-4 py-3">متوسط الدرجات</th>
                      <th className="px-4 py-3">مؤشر التعثر</th>
                      <th className="rounded-l-2xl px-4 py-3">التصنيف</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {studentRiskList.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4 font-black text-[#15445A]">
                          <div>{studentName(student)}</div>
                          <div className="mt-1 text-xs font-bold text-slate-400">
                            {student.student_number || "—"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {studentClassLabel(student)}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          <div>{student.guardian_name || "—"}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            {student.parent_phone ||
                              student.guardian_phone ||
                              "—"}
                          </div>
                        </td>

                        <td className="px-4 py-4 font-black text-red-600">
                          {student.absent}
                        </td>

                        <td className="px-4 py-4 font-black text-amber-600">
                          {student.late}
                        </td>

                        <td className="px-4 py-4 font-black text-slate-700">
                          {student.behaviorCount}
                        </td>

                        <td className="px-4 py-4 font-black text-slate-700">
                          {student.openReferrals}
                        </td>

                        <td className="px-4 py-4 font-black text-blue-700">
                          {student.gradeAverage > 0
                            ? `${student.gradeAverage}%`
                            : "—"}
                        </td>

                        <td className="px-4 py-4 font-black text-[#15445A]">
                          {student.riskScore}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              student.riskLabel === "مرتفع"
                                ? "bg-red-50 text-red-700"
                                : student.riskLabel === "متوسط"
                                  ? "bg-[#C1B489]/20 text-[#15445A]"
                                  : student.riskLabel === "منخفض"
                                    ? "bg-[#3D7EB9]/10 text-[#3D7EB9]"
                                    : "bg-[#07A869]/10 text-[#07A869]"
                            }`}
                          >
                            {student.riskLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          {icon}
        </div>

        <h2 className="text-xl font-black text-[#15445A]">{title}</h2>
      </div>

      {children}
    </section>
  );
}

function ProgressRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-black text-[#15445A]">{label}</span>
        <span className="text-xs font-bold text-slate-500">
          {value} — {percent}%
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[#0DA9A6]"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
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

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-lg print:hidden ${
        toast.type === "success"
          ? "bg-[#07A869] text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle2 size={18} />
      ) : (
        <AlertCircle size={18} />
      )}

      {toast.message}
    </div>
  );
}

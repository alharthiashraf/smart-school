"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { PageLoader } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";
import RoleGuard from "@/components/auth/RoleGuard";
import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  AlertTriangle,
  Award,
  BarChart3,
  Brain,
  BrainCircuit,
  CalendarCheck,
  ChartNoAxesCombined,
  CheckCircle2,
  Gauge,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HeartPulse,
  PieChart,
  Printer,
  RefreshCcw,
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

type Tone = "primary" | "green" | "amber" | "red" | "slate";

type AnalyticsInsightTone = "green" | "gold" | "red" | "primary" | "neutral";

type AnalyticsInsight = {
  title: string;
  description: string;
  tone: AnalyticsInsightTone;
  icon: ReactNode;
};

type SchoolHealth = {
  academic: number;
  attendance: number;
  behavior: number;
  engagement: number;
  dataQuality: number;
  overall: number;
  level: "ممتاز" | "جيد" | "متابعة" | "خطر";
};

type SubjectPerformance = {
  subject: string;
  average: number;
  records: number;
};

type StagePerformance = {
  stage: string;
  students: number;
  averageGrade: number;
  attendanceRate: number;
};

type AnalyticsDrilldown = {
  title: string;
  subtitle: string;
  items: string[];
};


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
  _label: string,
): Promise<T> {
  try {
    const result = await query;

    if (result.error) {
      return fallback;
    }

    return result.data ?? fallback;
  } catch {
    return fallback;
  }
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function insightTone(tone: AnalyticsInsightTone) {
  const tones: Record<AnalyticsInsightTone, string> = {
    green:
      "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]",
    gold:
      "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]",
    red:
      "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]",
    primary:
      "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]",
    neutral:
      "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
  };

  return tones[tone];
}

function progressTone(tone: AnalyticsInsightTone) {
  const tones: Record<AnalyticsInsightTone, string> = {
    green: "bg-[var(--app-success)]",
    gold: "bg-[var(--app-accent)]",
    red: "bg-[var(--app-danger)]",
    primary: "bg-[var(--app-primary)]",
    neutral: "bg-[var(--app-text-muted)]",
  };

  return tones[tone];
}

function stageFromStudent(student: Student) {
  return student.grade_name || student.grade_level || "غير محدد";
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
  const [drilldown, setDrilldown] = useState<AnalyticsDrilldown | null>(null);

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

  const subjectPerformance = useMemo<SubjectPerformance[]>(() => {
    const map = new Map<string, number[]>();

    filteredGrades.forEach((item) => {
      const subject = item.subject_name || item.subject || "غير محدد";
      const value = gradePercent(item);
      if (value <= 0) return;

      const current = map.get(subject) || [];
      current.push(value);
      map.set(subject, current);
    });

    return Array.from(map.entries())
      .map(([subject, values]) => ({
        subject,
        average: Math.round(
          values.reduce((sum, value) => sum + value, 0) / values.length,
        ),
        records: values.length,
      }))
      .sort((a, b) => b.average - a.average);
  }, [filteredGrades]);

  const stagePerformance = useMemo<StagePerformance[]>(() => {
    const stages = Array.from(
      new Set(filteredStudents.map(stageFromStudent).filter(Boolean)),
    );

    return stages
      .map((stage) => {
        const stageStudents = filteredStudents.filter(
          (student) => stageFromStudent(student) === stage,
        );
        const ids = new Set(stageStudents.map((student) => student.id));

        const stageGrades = grades.filter(
          (item) => item.student_id && ids.has(item.student_id),
        );
        const gradeValues = stageGrades
          .map(gradePercent)
          .filter((value) => value > 0);

        const averageStageGrade = gradeValues.length
          ? Math.round(
              gradeValues.reduce((sum, value) => sum + value, 0) /
                gradeValues.length,
            )
          : 0;

        const stageAttendance = attendance.filter(
          (item) => item.student_id && ids.has(item.student_id),
        );
        const present = stageAttendance.filter((item) =>
          isPresent(item.attendance_status || item.status),
        ).length;

        return {
          stage,
          students: stageStudents.length,
          averageGrade: averageStageGrade,
          attendanceRate: stageAttendance.length
            ? percentage(present, stageAttendance.length)
            : 0,
        };
      })
      .sort((a, b) => b.students - a.students);
  }, [attendance, filteredStudents, grades]);

  const schoolHealth = useMemo<SchoolHealth>(() => {
    const academic = averageGrade;
    const attendanceScore = attendanceRate;
    const behaviorScore = Math.max(
      0,
      100 -
        behavior.length * 2 -
        referrals.filter((item) => isOpenReferral(item.status)).length * 4,
    );
    const engagement = Math.max(
      0,
      Math.min(100, 100 - riskStudentsCount * 6),
    );
    const dataQuality = Math.round(
      ([
        students.length > 0,
        attendance.length > 0,
        grades.length > 0,
        classes.length > 0,
        behavior.length >= 0,
        referrals.length >= 0,
      ].filter(Boolean).length /
        6) *
        100,
    );

    const overall = Math.round(
      academic * 0.35 +
        attendanceScore * 0.3 +
        behaviorScore * 0.15 +
        engagement * 0.1 +
        dataQuality * 0.1,
    );

    return {
      academic,
      attendance: attendanceScore,
      behavior: behaviorScore,
      engagement,
      dataQuality,
      overall,
      level:
        overall >= 90
          ? "ممتاز"
          : overall >= 80
            ? "جيد"
            : overall >= 60
              ? "متابعة"
              : "خطر",
    };
  }, [
    attendance.length,
    attendanceRate,
    averageGrade,
    behavior.length,
    classes.length,
    grades.length,
    referrals,
    riskStudentsCount,
    students.length,
  ]);

  const analyticsInsights = useMemo<AnalyticsInsight[]>(() => {
    const items: AnalyticsInsight[] = [];

    if (schoolHealth.level === "خطر") {
      items.push({
        title: "مؤشر صحة المدرسة منخفض",
        description: `المؤشر العام ${schoolHealth.overall}% ويحتاج خطة تحسين عاجلة.`,
        tone: "red",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    }

    if (attendanceRate < 85) {
      items.push({
        title: "الحضور أقل من المستهدف",
        description: `نسبة الحضور الحالية ${attendanceRate}%.`,
        tone: "gold",
        icon: <CalendarCheck className="h-5 w-5" />,
      });
    }

    if (subjectPerformance.length > 0) {
      const weakest = [...subjectPerformance].sort(
        (a, b) => a.average - b.average,
      )[0];

      if (weakest.average < 70) {
        items.push({
          title: "مادة تحتاج تدخلًا",
          description: `${weakest.subject} بمتوسط ${weakest.average}%.`,
          tone: "primary",
          icon: <GraduationCap className="h-5 w-5" />,
        });
      }
    }

    if (riskStudentsCount > 0) {
      items.push({
        title: "طلاب معرضون للتعثر",
        description: `يوجد ${riskStudentsCount} طالب يحتاج متابعة.`,
        tone: "primary",
        icon: <ShieldAlert className="h-5 w-5" />,
      });
    }

    if (items.length === 0) {
      items.push({
        title: "المؤشرات مستقرة",
        description: "لا توجد إشارات حرجة في التحليلات الحالية.",
        tone: "green",
        icon: <CheckCircle2 className="h-5 w-5" />,
      });
    }

    return items.slice(0, 4);
  }, [
    attendanceRate,
    riskStudentsCount,
    schoolHealth.level,
    schoolHealth.overall,
    subjectPerformance,
  ]);

  const monthlyAttendanceData = useMemo(() => {
    const grouped = new Map<
      string,
      { label: string; present: number; absent: number; late: number }
    >();

    attendance.forEach((item) => {
      if (!item.attendance_date) return;
      if (!item.student_id || !filteredStudentIds.has(item.student_id)) return;

      const date = new Date(item.attendance_date);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const label = new Intl.DateTimeFormat("ar-SA", {
        month: "short",
        year: "numeric",
      }).format(date);

      const current = grouped.get(key) || {
        label,
        present: 0,
        absent: 0,
        late: 0,
      };

      if (isPresent(item.attendance_status || item.status)) current.present += 1;
      if (isAbsent(item.attendance_status || item.status)) current.absent += 1;
      if (isLate(item.attendance_status || item.status)) current.late += 1;

      grouped.set(key, current);
    });

    return Array.from(grouped.values()).slice(-6);
  }, [attendance, filteredStudentIds]);

  function runSmartSearch(command: string) {
    const value = normalizeText(command);

    setSearch("");
    setSelectedClass("all");

    if (value.includes("عالي الخطوره") || value.includes("عالي الخطورة")) {
      setSearch(
        studentRiskList.find((item) => item.riskLabel === "مرتفع")?.full_name ||
          "",
      );
      return;
    }

    if (value.includes("افضل فصل") || value.includes("أفضل فصل")) {
      const best = [...classPerformance].sort(
        (a, b) => b.average - a.average,
      )[0];
      if (best) setSelectedClass(best.className);
      return;
    }

    if (value.includes("اضعف ماده") || value.includes("أضعف مادة")) {
      const weakest = [...subjectPerformance].sort(
        (a, b) => a.average - b.average,
      )[0];
      if (weakest) setSearch(weakest.subject);
      return;
    }

    setSearch(command.trim());
  }


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

    exportTableToPDF({
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

    exportTableToExcel({
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
          <PageLoader text="جاري تحميل مركز التحليلات..." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-5" dir="rtl">
          {toast?.type === "success" ? (
            <SuccessBanner description={toast.message} />
          ) : toast ? (
            <ErrorState description={toast.message} />
          ) : null}

          <PageHeader
            variant="hero"
            title="مركز التحليلات"
            description="تحليل الحضور والدرجات ومؤشرات التعثر."
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
              { label: "الطلاب", value: filteredStudents.length, icon: <Users size={20} />, tone: "primary" },
              { label: "نسبة الحضور", value: `${attendanceRate}%`, icon: <CalendarCheck size={20} />, tone: colorForRate(attendanceRate) === "amber" ? "gold" : colorForRate(attendanceRate) },
              { label: "متوسط الدرجات", value: averageGrade > 0 ? `${averageGrade}%` : "—", icon: <GraduationCap size={20} />, tone: gradeTone(averageGrade) === "amber" ? "gold" : gradeTone(averageGrade) === "primary" ? "primary" : gradeTone(averageGrade) },
              { label: "مؤشرات المتابعة", value: followUpTotal, icon: <ShieldAlert size={20} />, tone: followUpTotal > 0 ? "red" : "green" },
            ]}
            actions={
              <>
                <SecondaryButton
                  onClick={() => void loadAnalytics()}
                  disabled={loading}
                >
                  <RefreshCcw
                    size={17}
                    className={loading ? "animate-spin" : ""}
                    aria-hidden="true"
                  />
                  تحديث
                </SecondaryButton>

                <SecondaryButton onClick={printAnalytics}>
                  <Printer size={17} aria-hidden="true" />
                  طباعة
                </SecondaryButton>

                <PrimaryButton onClick={exportPDF}>
                  <FileText size={17} aria-hidden="true" />
                  PDF
                </PrimaryButton>

                <PrimaryButton onClick={exportExcel}>
                  <FileSpreadsheet size={17} aria-hidden="true" />
                  Excel
                </PrimaryButton>
              </>
            }
          />

          {errorMsg ? <ErrorState description={errorMsg} /> : null}

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
                  className="h-11 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
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
              tone="primary"
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
            description="ملخص الحضور والدرجات والمتابعة."
            tone={followUpTotal > 0 ? "gold" : "green"}
            items={[
              { label: "الطلاب", value: filteredStudents.length },
              { label: "نسبة الحضور", value: `${attendanceRate}%` },
              { label: "متوسط الدرجات", value: averageGrade > 0 ? `${averageGrade}%` : "—" },
              { label: "الغياب", value: attendanceStats.absent },
              { label: "التأخر", value: attendanceStats.late },
              { label: "مؤشرات متابعة", value: followUpTotal },
            ]}
            footer="تعتمد الدقة على اكتمال البيانات."
          />


          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <AnalyticsExecutiveCenter
              health={schoolHealth}
              attendanceRate={attendanceRate}
              averageGrade={averageGrade}
              studentsCount={filteredStudents.length}
              riskStudentsCount={riskStudentsCount}
            />

            <AnalyticsSmartInsights insights={analyticsInsights} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <SchoolHealthPanel health={schoolHealth} />

            <SubjectAnalyticsPanel
              subjects={subjectPerformance}
              onDrilldown={(subject) =>
                setDrilldown({
                  title: subject.subject,
                  subtitle: `متوسط ${subject.average}%`,
                  items: [
                    `عدد السجلات: ${subject.records}`,
                    `المتوسط: ${subject.average}%`,
                    subject.average < 60
                      ? "تحتاج خطة علاجية عاجلة."
                      : subject.average < 75
                        ? "تحتاج متابعة وتحسين."
                        : "الأداء جيد.",
                  ],
                })
              }
            />

            <StageAnalyticsPanel
              stages={stagePerformance}
              onDrilldown={(stage) =>
                setDrilldown({
                  title: stage.stage,
                  subtitle: `${stage.students} طالب`,
                  items: [
                    `متوسط الدرجات: ${stage.averageGrade}%`,
                    `نسبة الحضور: ${stage.attendanceRate}%`,
                    `عدد الطلاب: ${stage.students}`,
                  ],
                })
              }
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <MonthlyTrendPanel items={monthlyAttendanceData} />
            <PredictiveAnalyticsPanel
              students={studentRiskList}
              schoolHealth={schoolHealth}
            />
          </section>

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] print:hidden">
            <div className="mb-4">
              <h2 className="text-xl font-black text-[var(--app-text)]">
                البحث الذكي والتحليل السريع
              </h2>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                جرّب: الطلاب عالي الخطورة، أفضل فصل، أضعف مادة، حضور منخفض.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {["الطلاب عالي الخطورة", "أفضل فصل", "أضعف مادة", "حضور منخفض"].map((command) => (
                <button
                  key={command}
                  type="button"
                  onClick={() => runSmartSearch(command)}
                  className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-2 text-sm font-black text-[var(--app-text)] transition hover:-translate-y-0.5 hover:border-[var(--app-primary)] hover:text-[var(--app-primary)]"
                >
                  {command}
                </button>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel title="المؤشر الأسبوعي للحضور" icon={<TrendingUp size={22} />}>
              {weeklyAttendanceData.length === 0 ? (
                <EmptyState
                  title="لا توجد بيانات"
                  description="لا توجد بيانات حضور كافية لعرض المؤشر."
                />
              ) : (
                <div className="space-y-3">
                  {weeklyAttendanceData.map((item) => (
                    <div key={item.date} className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-black text-[var(--app-text)]">
                          {formatDate(item.date)}
                        </span>
                        <span className="text-xs font-bold text-[var(--app-text-muted)]">
                          حضور {item.present} / غياب {item.absent} / تأخر{" "}
                          {item.late}
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-[var(--app-border)]">
                        <div
                          className="h-full rounded-full bg-[var(--app-primary)]"
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

            <section className="rounded-[var(--app-radius-xl)] bg-gradient-to-l from-[var(--app-primary)] via-[var(--app-primary)] to-[var(--app-primary-hover)] p-5 text-[var(--app-text-inverse)] shadow-[var(--app-shadow-sm)]">
              <div className="mb-4 flex items-center gap-2">
                <Brain className="text-[var(--app-accent)]" />
                <h2 className="text-xl font-black">توصيات ذكية</h2>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {aiInsights.map((item) => (
                  <div
                    key={item}
                    className="rounded-[var(--app-radius-lg)] border border-white/10 bg-[var(--app-card)]/10 p-4 text-sm leading-7 text-slate-100"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </section>

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] transition hover:shadow-[var(--app-shadow-md)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-[var(--app-text)]">
                  أداء الفصول
                </h2>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  مقارنة مبسطة بين الفصول حسب متوسط الدرجات والحضور.
                </p>
              </div>
              <Award className="text-[var(--app-text)]" />
            </div>

            {classPerformance.length === 0 ? (
              <EmptyState
                title="لا توجد بيانات"
                description="لا توجد بيانات كافية لعرض أداء الفصول."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {classPerformance.slice(0, 8).map((item) => (
                  <div key={item.className} className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-black text-[var(--app-text)]">
                        {item.className}
                      </h3>
                      <span className="rounded-full bg-[var(--app-card)] px-3 py-1 text-xs font-black text-[var(--app-text-muted)]">
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

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] transition hover:shadow-[var(--app-shadow-md)]">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-[var(--app-text)]">
                  الطلاب الأعلى احتياجًا للمتابعة
                </h2>

                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  يعتمد المؤشر على الغياب، التأخر، السلوك، الإحالات، وانخفاض الدرجات.
                </p>
              </div>

              <span className="w-fit rounded-full bg-[var(--app-card-soft)] px-4 py-2 text-xs font-black text-[var(--app-text-muted)]">
                أعلى 10 طلاب
              </span>
            </div>

            {studentRiskList.length === 0 ? (
              <EmptyState
                title="لا توجد بيانات"
                description="لا توجد بيانات كافية لعرض الطلاب المتعثرين."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-sm">
                  <thead>
                    <tr className="bg-[var(--app-card-soft)] text-right text-xs font-black text-[var(--app-text-muted)]">
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

                  <tbody className="divide-y divide-[var(--app-border)]">
                    {studentRiskList.map((student) => (
                      <tr key={student.id} className="hover:bg-[var(--app-card-soft)]">
                        <td className="px-4 py-4 font-black text-[var(--app-text)]">
                          <div>{studentName(student)}</div>
                          <div className="mt-1 text-xs font-bold text-[var(--app-text-subtle)]">
                            {student.student_number || "—"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-[var(--app-text-muted)]">
                          {studentClassLabel(student)}
                        </td>

                        <td className="px-4 py-4 text-[var(--app-text-muted)]">
                          <div>{student.guardian_name || "—"}</div>
                          <div className="mt-1 text-xs text-[var(--app-text-subtle)]">
                            {student.parent_phone ||
                              student.guardian_phone ||
                              "—"}
                          </div>
                        </td>

                        <td className="px-4 py-4 font-black text-[var(--app-danger)]">
                          {student.absent}
                        </td>

                        <td className="px-4 py-4 font-black text-[var(--app-warning-foreground)]">
                          {student.late}
                        </td>

                        <td className="px-4 py-4 font-black text-[var(--app-text)]">
                          {student.behaviorCount}
                        </td>

                        <td className="px-4 py-4 font-black text-[var(--app-text)]">
                          {student.openReferrals}
                        </td>

                        <td className="px-4 py-4 font-black text-[var(--app-primary)]">
                          {student.gradeAverage > 0
                            ? `${student.gradeAverage}%`
                            : "—"}
                        </td>

                        <td className="px-4 py-4 font-black text-[var(--app-text)]">
                          {student.riskScore}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              student.riskLabel === "مرتفع"
                                ? "bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)]"
                                : student.riskLabel === "متوسط"
                                  ? "bg-[color-mix(in_srgb,var(--app-accent)_20%,transparent)] text-[var(--app-text)]"
                                  : student.riskLabel === "منخفض"
                                    ? "bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)] text-[var(--app-primary)]"
                                    : "bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]"
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

          {drilldown && (
            <AnalyticsDrilldownDrawer
              data={drilldown}
              onClose={() => setDrilldown(null)}
            />
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
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] transition hover:shadow-[var(--app-shadow-md)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[var(--app-radius-lg)] bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)] text-[var(--app-primary)]">
          {icon}
        </div>

        <h2 className="text-xl font-black text-[var(--app-text)]">{title}</h2>
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
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-black text-[var(--app-text)]">{label}</span>
        <span className="text-xs font-bold text-[var(--app-text-muted)]">
          {value} — {percent}%
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-[var(--app-border)]">
        <div
          className="h-full rounded-full bg-[var(--app-primary)]"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}



function AnalyticsExecutiveCenter({
  health,
  attendanceRate,
  averageGrade,
  studentsCount,
  riskStudentsCount,
}: {
  health: SchoolHealth;
  attendanceRate: number;
  averageGrade: number;
  studentsCount: number;
  riskStudentsCount: number;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <div className="mb-4">
        <h2 className="text-xl font-black text-[var(--app-text)]">
          التحليلات التنفيذية
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          ملخص صحة المدرسة والأداء.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetric label="صحة المدرسة" value={`${health.overall}%`} icon={<Gauge size={18} />} tone={health.level === "ممتاز" || health.level === "جيد" ? "green" : health.level === "متابعة" ? "gold" : "red"} />
        <AnalyticsMetric label="الصحة الأكاديمية" value={`${averageGrade}%`} icon={<GraduationCap size={18} />} tone="primary" />
        <AnalyticsMetric label="صحة الحضور" value={`${attendanceRate}%`} icon={<CalendarCheck size={18} />} tone="primary" />
        <AnalyticsMetric label="طلاب المخاطر" value={riskStudentsCount} icon={<ShieldAlert size={18} />} tone={riskStudentsCount > 0 ? "red" : "green"} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <AnalyticsInfoLine label="عدد الطلاب" value={studentsCount} />
        <AnalyticsInfoLine label="مستوى المدرسة" value={health.level} />
        <AnalyticsInfoLine label="جودة البيانات" value={`${health.dataQuality}%`} />
        <AnalyticsInfoLine label="المشاركة" value={`${health.engagement}%`} />
      </div>
    </section>
  );
}

function AnalyticsSmartInsights({
  insights,
}: {
  insights: AnalyticsInsight[];
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
          <BrainCircuit size={20} />
          الرؤى الذكية
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          توصيات مبنية على المؤشرات.
        </p>
      </div>

      <div className="space-y-3">
        {insights.map((item) => (
          <div
            key={item.title}
            className="flex gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] ${insightTone(item.tone)}`}>
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

function SchoolHealthPanel({
  health,
}: {
  health: SchoolHealth;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="text-xl font-black text-[var(--app-text)]">صحة المدرسة Index</h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مؤشر مركب لصحة المدرسة.
      </p>

      <div className="mt-5 space-y-4">
        <AnalyticsProgress label="الأكاديمي" value={health.academic} total={100} tone="primary" suffix="%" />
        <AnalyticsProgress label="الحضور" value={health.attendance} total={100} tone="green" suffix="%" />
        <AnalyticsProgress label="السلوك" value={health.behavior} total={100} tone="primary" suffix="%" />
        <AnalyticsProgress label="المشاركة" value={health.engagement} total={100} tone="gold" suffix="%" />
        <AnalyticsProgress label="جودة البيانات" value={health.dataQuality} total={100} tone="primary" suffix="%" />
      </div>
    </section>
  );
}

function SubjectAnalyticsPanel({
  subjects,
  onDrilldown,
}: {
  subjects: SubjectPerformance[];
  onDrilldown: (item: SubjectPerformance) => void;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <BarChart3 size={20} />
        تحليل المواد
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        أفضل وأضعف المواد حسب المتوسط.
      </p>

      <div className="mt-5 space-y-3">
        {subjects.slice(0, 6).map((item) => (
          <button
            key={item.subject}
            type="button"
            onClick={() => onDrilldown(item)}
            className="w-full rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-3 text-right transition hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-black text-[var(--app-text)]">{item.subject}</span>
              <span className="text-sm font-black text-[var(--app-primary)]">{item.average}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-card)]">
              <div className="h-full rounded-full bg-[var(--app-primary)]" style={{ width: `${item.average}%` }} />
            </div>
          </button>
        ))}

        {subjects.length === 0 && (
          <p className="text-sm text-[var(--app-text-muted)]">لا توجد بيانات مواد.</p>
        )}
      </div>
    </section>
  );
}

function StageAnalyticsPanel({
  stages,
  onDrilldown,
}: {
  stages: StagePerformance[];
  onDrilldown: (item: StagePerformance) => void;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <ChartNoAxesCombined size={20} />
        تحليل المراحل
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مقارنة التحصيل والحضور.
      </p>

      <div className="mt-5 space-y-3">
        {stages.slice(0, 6).map((item) => (
          <button
            key={item.stage}
            type="button"
            onClick={() => onDrilldown(item)}
            className="w-full rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-3 text-right transition hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-black text-[var(--app-text)]">{item.stage}</span>
              <span className="text-xs font-bold text-[var(--app-text-muted)]">{item.students} طالب</span>
            </div>
            <p className="mt-2 text-xs text-[var(--app-text-muted)]">
              الدرجات {item.averageGrade}% · الحضور {item.attendanceRate}%
            </p>
          </button>
        ))}

        {stages.length === 0 && (
          <p className="text-sm text-[var(--app-text-muted)]">لا توجد بيانات مراحل.</p>
        )}
      </div>
    </section>
  );
}

function MonthlyTrendPanel({
  items,
}: {
  items: Array<{ label: string; present: number; absent: number; late: number }>;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <TrendingUp size={20} />
        الاتجاه الشهري
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        اتجاه الحضور خلال الأشهر الأخيرة.
      </p>

      <div className="mt-5 space-y-3">
        {items.map((item) => {
          const total = item.present + item.absent + item.late;
          return (
            <div key={item.label} className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-black text-[var(--app-text)]">{item.label}</span>
                <span className="text-xs text-[var(--app-text-muted)]">
                  {total} سجل
                </span>
              </div>
              <AnalyticsProgress label="الحضور" value={item.present} total={Math.max(1, total)} tone="green" />
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="text-sm text-[var(--app-text-muted)]">لا توجد بيانات شهرية.</p>
        )}
      </div>
    </section>
  );
}

function PredictiveAnalyticsPanel({
  students,
  schoolHealth,
}: {
  students: RiskStudent[];
  schoolHealth: SchoolHealth;
}) {
  const high = students.filter((item) => item.riskLabel === "مرتفع").length;
  const medium = students.filter((item) => item.riskLabel === "متوسط").length;
  const low = students.filter((item) => item.riskLabel === "منخفض").length;

  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <Brain size={20} />
        التحليل التنبؤي
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        قراءة تنبؤية مبنية على المؤشرات المتاحة.
      </p>

      <div className="mt-5 space-y-4">
        <AnalyticsProgress label="خطر مرتفع" value={high} total={Math.max(1, students.length)} tone="red" />
        <AnalyticsProgress label="خطر متوسط" value={medium} total={Math.max(1, students.length)} tone="gold" />
        <AnalyticsProgress label="خطر منخفض" value={low} total={Math.max(1, students.length)} tone="primary" />
      </div>

      <div className="mt-5 rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4">
        <p className="text-xs font-bold text-[var(--app-text-muted)]">توقع الأداء القادم</p>
        <p className="mt-1 text-2xl font-black text-[var(--app-text)]">
          {schoolHealth.overall >= 80 ? "اتجاه مستقر" : schoolHealth.overall >= 60 ? "تحسن مشروط" : "يحتاج تدخل"}
        </p>
      </div>
    </section>
  );
}

function AnalyticsDrilldownDrawer({
  data,
  onClose,
}: {
  data: AnalyticsDrilldown;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-[color-mix(in_srgb,var(--app-text)_40%,transparent)] backdrop-blur-sm print:hidden" role="dialog" aria-modal="true" aria-label={data.title}>
      <button type="button" className="flex-1" onClick={onClose} aria-label="إغلاق" />
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-xl)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-[var(--app-accent)]">تفاصيل التحليل</p>
            <h2 className="mt-1 text-2xl font-black text-[var(--app-text)]">{data.title}</h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">{data.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-[var(--app-card-soft)] p-2 text-[var(--app-text-muted)]">
            ×
          </button>
        </div>

        <div className="space-y-3">
          {data.items.map((item) => (
            <div key={item} className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4 text-sm leading-7 text-[var(--app-text-muted)]">
              {item}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function AnalyticsMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: AnalyticsInsightTone;
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-lg)] ${insightTone(tone)}`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function AnalyticsInfoLine({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] px-3 py-2">
      <span className="text-xs font-bold text-[var(--app-text-muted)]">{label}</span>
      <span className="text-sm font-black text-[var(--app-text)]">{value}</span>
    </div>
  );
}

function AnalyticsProgress({
  label,
  value,
  total,
  tone,
  suffix = "",
}: {
  label: string;
  value: number;
  total: number;
  tone: AnalyticsInsightTone;
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

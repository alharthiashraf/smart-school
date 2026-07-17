"use client";

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
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import ExportButton from "@/components/ui/buttons/ExportButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ErrorState from "@/components/ui/feedback/ErrorState";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading";
import SummaryCard from "@/components/ui/cards/SummaryCard";

import { supabase } from "@/lib/supabase";
import type { SchoolRole } from "@/lib/permissions";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  Award,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  RefreshCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserRound,
  UsersRound,
} from "lucide-react";

type Student = {
  id: string;
  full_name: string | null;
  national_id?: string | null;
  grade_name?: string | null;
  classroom_name?: string | null;
  guardian_email?: string | null;
  status?: string | null;
};

type Subject = {
  id: string;
  subject_name?: string | null;
  name?: string | null;
  title?: string | null;
  grade_name?: string | null;
  is_active?: boolean | null;
};

type GradePeriod = {
  id: string;
  period_name?: string | null;
  name?: string | null;
  title?: string | null;
  semester?: string | null;
  academic_year?: string | null;
};

type RawScore = Record<string, unknown>;

type GradeRow = {
  id: string;
  student_id: string;
  subject_id?: string | null;
  period_id?: string | null;
  subject_name: string;
  period_name: string;
  semester: string;
  academic_year: string;
  homework_score: number | null;
  participation_score: number | null;
  quiz_score: number | null;
  midterm_score: number | null;
  final_score: number | null;
  total_score: number | null;
  max_score: number;
  percentage: number | null;
  grade_label: string;
  result_status: string;
  notes?: string | null;
  created_at?: string | null;
};

type LevelKey = "all" | "excellent" | "very_good" | "good" | "pass" | "risk";
type SemesterKey = "all" | string;
type ExportCell = string | number | null | undefined;


function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const normalized = String(value).trim();
  return normalized || null;
}

function asRequiredString(value: unknown, fallback: string) {
  return asNullableString(value) ?? fallback;
}


const PARENT_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "parent",
];

function currentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  return `${year}-${year + 1}`;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function roundNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

function pickNumber(row: RawScore, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = toNumber(row[key]);
    if (value !== null) return value;
  }

  return null;
}

function pickText(row: RawScore, keys: readonly string[], fallback = "—") {
  for (const key of keys) {
    const value = row[key];

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function subjectTitle(subject?: Subject | null) {
  return subject?.subject_name || subject?.name || subject?.title || "مادة غير محددة";
}

function periodTitle(period?: GradePeriod | null) {
  return period?.period_name || period?.name || period?.title || "فترة غير محددة";
}

function getGradeLabel(percentage: number | null | undefined) {
  if (percentage === null || percentage === undefined) return "لا توجد درجة";
  if (percentage >= 90) return "ممتاز";
  if (percentage >= 80) return "جيد جدًا";
  if (percentage >= 70) return "جيد";
  if (percentage >= 60) return "مقبول";
  return "يحتاج متابعة";
}

function getResultStatus(percentage: number | null | undefined) {
  if (percentage === null || percentage === undefined) return "غير مكتمل";
  if (percentage >= 60) return "ناجح";
  return "يحتاج متابعة";
}

function levelFromPercentage(percentage: number | null | undefined): LevelKey {
  if (percentage === null || percentage === undefined) return "risk";
  if (percentage >= 90) return "excellent";
  if (percentage >= 80) return "very_good";
  if (percentage >= 70) return "good";
  if (percentage >= 60) return "pass";
  return "risk";
}

function gradeBadgeClass(
  percentage: number | null | undefined,
) {
  if (percentage === null || percentage === undefined) {
    return "border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]";
  }

  if (percentage >= 90) {
    return "border-[color-mix(in_srgb,var(--app-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
  }

  if (percentage >= 80) {
    return "border-[color-mix(in_srgb,var(--app-primary)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]";
  }

  if (percentage >= 60) {
    return "border-[color-mix(in_srgb,var(--app-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";
  }

  return "border-[color-mix(in_srgb,var(--app-danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]";
}

function progressClass(
  percentage: number | null | undefined,
) {
  if (percentage === null || percentage === undefined) {
    return "bg-[var(--app-text-muted)]";
  }

  if (percentage >= 90) return "bg-[var(--app-success)]";
  if (percentage >= 80) return "bg-[var(--app-primary)]";
  if (percentage >= 60) return "bg-[var(--app-accent)]";

  return "bg-[var(--app-danger)]";
}

function safePercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(value);
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function calculatePercentage(row: RawScore) {
  const directPercentage = pickNumber(row, ["percentage", "percent", "score_percentage"]);
  if (directPercentage !== null) return roundNumber(directPercentage);

  const total = pickNumber(row, ["total_score", "score", "mark", "degree", "total", "final_total"]);

  const max = pickNumber(row, ["max_score", "full_mark", "total_mark", "out_of", "maximum_score"]);

  if (total !== null && max !== null && max > 0) {
    return roundNumber((total / max) * 100);
  }

  if (total !== null && total <= 100) return roundNumber(total);

  return null;
}

function calculateTotal(row: RawScore) {
  const directTotal = pickNumber(row, ["total_score", "score", "mark", "degree", "total", "final_total"]);

  if (directTotal !== null) return roundNumber(directTotal);

  const parts = [
    pickNumber(row, ["homework_score", "homework", "assignments_score"]),
    pickNumber(row, ["participation_score", "participation", "classwork_score"]),
    pickNumber(row, ["quiz_score", "quiz", "quizzes_score"]),
    pickNumber(row, ["midterm_score", "midterm", "midterm_exam_score"]),
    pickNumber(row, ["final_score", "final", "final_exam_score"]),
  ].filter((item): item is number => item !== null);

  if (!parts.length) return null;

  return roundNumber(parts.reduce((sum, item) => sum + item, 0));
}

function getMaxScore(row: RawScore) {
  const max = pickNumber(row, ["max_score", "full_mark", "total_mark", "out_of", "maximum_score"]);
  return max || 100;
}

export default function ParentGradesPage() {
  const { currentSchool } = useSchool();
  const schoolId = currentSchool?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [parentEmail, setParentEmail] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedSemester, setSelectedSemester] = useState<SemesterKey>("all");
  const [selectedLevel, setSelectedLevel] = useState<LevelKey>("all");
  const [search, setSearch] = useState("");

  const loadParentStudents = useCallback(async (email: string) => {
    let query = supabase
      .from("students")
      .select("id, full_name, national_id, grade_name, classroom_name, guardian_email, status")
      .eq("guardian_email", email)
      .order("full_name", { ascending: true });

    if (schoolId) query = query.eq("school_id", schoolId);

    const { data, error: studentsError } = await query;

    if (studentsError) throw new Error(studentsError.message);

    return (data || []) as Student[];
  }, [schoolId]);

  const loadSubjects = useCallback(async () => {
    try {
      let query = supabase.from("school_grade_subjects").select("*");

      if (schoolId) query = query.eq("school_id", schoolId);

      const { data, error: subjectsError } = await query;
      if (subjectsError) throw subjectsError;

      return (data || []) as Subject[];
    } catch {
      return [];
    }
  }, [schoolId]);

  const loadPeriods = useCallback(async () => {
    try {
      let query = supabase.from("school_grade_periods").select("*");

      if (schoolId) query = query.eq("school_id", schoolId);

      const { data, error: periodsError } = await query;
      if (periodsError) throw periodsError;

      return (data || []) as GradePeriod[];
    } catch {
      return [];
    }
  }, [schoolId]);

  const mapProfessionalScore = useCallback(
    (
      row: RawScore,
      subjectMap: Map<string, Subject>,
      periodMap: Map<string, GradePeriod>,
    ): GradeRow => {
    const subjectId = asNullableString(
      row.subject_id ??
        row.grade_subject_id ??
        row.school_grade_subject_id,
    );

    const periodId = asNullableString(
      row.period_id ??
        row.grade_period_id ??
        row.school_grade_period_id,
    );

    const subject = subjectId ? subjectMap.get(subjectId) : null;
    const period = periodId ? periodMap.get(periodId) : null;

    const total = calculateTotal(row);
    const percentage = calculatePercentage(row);
    const maxScore = getMaxScore(row);

    return {
      id: asRequiredString(row.id, `${asRequiredString(row.student_id, "row")}-${asRequiredString(row.subject_id, "subject")}-${asRequiredString(row.period_id, "period")}`),
      student_id: asRequiredString(row.student_id, ""),
      subject_id: subjectId,
      period_id: periodId,
      subject_name: pickText(row, ["subject_name", "subject"], subjectTitle(subject)),
      period_name: pickText(row, ["period_name", "period"], periodTitle(period)),
      semester: pickText(row, ["semester"], period?.semester || "غير محدد"),
      academic_year: pickText(row, ["academic_year", "year"], period?.academic_year || currentAcademicYear()),
      homework_score: pickNumber(row, ["homework_score", "homework", "assignments_score"]),
      participation_score: pickNumber(row, ["participation_score", "participation", "classwork_score"]),
      quiz_score: pickNumber(row, ["quiz_score", "quiz", "quizzes_score"]),
      midterm_score: pickNumber(row, ["midterm_score", "midterm", "midterm_exam_score"]),
      final_score: pickNumber(row, ["final_score", "final", "final_exam_score"]),
      total_score: total,
      max_score: maxScore,
      percentage,
      grade_label: pickText(row, ["grade_label"], getGradeLabel(percentage)),
      result_status: pickText(row, ["result_status"], getResultStatus(percentage)),
      notes: asNullableString(row.notes ?? row.teacher_notes),
      created_at: asNullableString(row.created_at),
    };
    },
    [],
  );

  const mapSimpleScore = useCallback((row: RawScore): GradeRow => {
    const percentage = calculatePercentage(row);
    const total = calculateTotal(row);

    return {
      id: asRequiredString(row.id, `${asRequiredString(row.student_id, "row")}-${asRequiredString(row.subject_id, "subject")}-${asRequiredString(row.period_id, "period")}`),
      student_id: asRequiredString(row.student_id, ""),
      subject_id: asNullableString(row.subject_id),
      period_id: asNullableString(row.period_id),
      subject_name: pickText(row, ["subject_name", "subject", "course_name"], "مادة غير محددة"),
      period_name: pickText(row, ["period_name", "period", "exam_name"], "فترة غير محددة"),
      semester: pickText(row, ["semester", "term"], "غير محدد"),
      academic_year: pickText(row, ["academic_year", "year"], currentAcademicYear()),
      homework_score: pickNumber(row, ["homework_score", "homework"]),
      participation_score: pickNumber(row, ["participation_score", "participation"]),
      quiz_score: pickNumber(row, ["quiz_score", "quiz"]),
      midterm_score: pickNumber(row, ["midterm_score", "midterm"]),
      final_score: pickNumber(row, ["final_score", "final"]),
      total_score: total,
      max_score: getMaxScore(row),
      percentage,
      grade_label: pickText(row, ["grade_label"], getGradeLabel(percentage)),
      result_status: pickText(row, ["result_status"], getResultStatus(percentage)),
      notes: asNullableString(row.notes ?? row.teacher_notes),
      created_at: asNullableString(row.created_at),
    };
  }, []);

  const loadProfessionalGrades = useCallback(async (studentIds: string[]) => {
    let query = supabase
      .from("student_period_scores")
      .select("*")
      .in("student_id", studentIds);

    if (schoolId) query = query.eq("school_id", schoolId);

    const { data, error: scoresError } = await query;

    if (scoresError) throw scoresError;

    const [subjects, periods] = await Promise.all([loadSubjects(), loadPeriods()]);

    const subjectMap = new Map<string, Subject>();
    subjects.forEach((subject) => subjectMap.set(subject.id, subject));

    const periodMap = new Map<string, GradePeriod>();
    periods.forEach((period) => periodMap.set(period.id, period));

    return ((data || []) as RawScore[]).map((row) =>
      mapProfessionalScore(row, subjectMap, periodMap),
    );
  }, [loadPeriods, loadSubjects, mapProfessionalScore, schoolId]);

  const loadSimpleGradesFromTable = useCallback(async (
    tableName: string,
    studentIds: string[],
  ) => {
    let query = supabase.from(tableName).select("*").in("student_id", studentIds);

    if (schoolId) query = query.eq("school_id", schoolId);

    const { data, error: tableError } = await query;

    if (tableError) throw tableError;

    return ((data || []) as RawScore[]).map(mapSimpleScore);
  }, [mapSimpleScore, schoolId]);

  const loadGrades = useCallback(async (studentIds: string[]) => {
    try {
      const professionalRows = await loadProfessionalGrades(studentIds);
      if (professionalRows.length) return professionalRows;
    } catch {
      // fallback below
    }

    try {
      const simpleRows = await loadSimpleGradesFromTable("grades", studentIds);
      if (simpleRows.length) return simpleRows;
    } catch {
      // fallback below
    }

    try {
      return await loadSimpleGradesFromTable("student_grades", studentIds);
    } catch {
      return [];
    }
  }, [loadProfessionalGrades, loadSimpleGradesFromTable]);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw new Error(userError.message);

      const email = user?.email || "";

      if (!email) {
        setParentEmail("");
        setStudents([]);
        setGrades([]);
        setError("تعذر التعرف على بريد ولي الأمر الحالي.");
        return;
      }

      setParentEmail(email);

      const children = await loadParentStudents(email);
      setStudents(children);

      if (!children.length) {
        setGrades([]);
        return;
      }

      const studentIds = children.map((student) => student.id);
      const rows = await loadGrades(studentIds);

      setGrades(
        rows.sort((a, b) => {
          const studentA = a.student_id.localeCompare(b.student_id);
          if (studentA !== 0) return studentA;

          const subjectA = a.subject_name.localeCompare(b.subject_name, "ar");
          if (subjectA !== 0) return subjectA;

          return a.period_name.localeCompare(b.period_name, "ar");
        }),
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل بيانات الدرجات.",
      );
      setStudents([]);
      setGrades([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadGrades, loadParentStudents]);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const studentsMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((student) => map.set(student.id, student));
    return map;
  }, [students]);

  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    grades.forEach((row) => {
      if (row.subject_name && row.subject_name !== "—") set.add(row.subject_name);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [grades]);

  const semesterOptions = useMemo(() => {
    const set = new Set<string>();
    grades.forEach((row) => {
      if (row.semester && row.semester !== "—") set.add(row.semester);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [grades]);

  const filteredGrades = useMemo(() => {
    const text = search.trim().toLowerCase();

    return grades.filter((row) => {
      const student = studentsMap.get(row.student_id);
      const level = levelFromPercentage(row.percentage);

      const matchesStudent =
        selectedStudentId === "all" || row.student_id === selectedStudentId;
      const matchesSubject =
        selectedSubject === "all" || row.subject_name === selectedSubject;
      const matchesSemester =
        selectedSemester === "all" || row.semester === selectedSemester;
      const matchesLevel = selectedLevel === "all" || level === selectedLevel;

      const matchesSearch =
        !text ||
        String(student?.full_name || "").toLowerCase().includes(text) ||
        String(student?.national_id || "").toLowerCase().includes(text) ||
        String(row.subject_name || "").toLowerCase().includes(text) ||
        String(row.period_name || "").toLowerCase().includes(text) ||
        String(row.notes || "").toLowerCase().includes(text);

      return matchesStudent && matchesSubject && matchesSemester && matchesLevel && matchesSearch;
    });
  }, [
    grades,
    studentsMap,
    selectedStudentId,
    selectedSubject,
    selectedSemester,
    selectedLevel,
    search,
  ]);

  const stats = useMemo(() => {
    const validPercentages = filteredGrades
      .map((row) => row.percentage)
      .filter((item): item is number => item !== null && item !== undefined);

    const totalRows = filteredGrades.length;
    const average = validPercentages.length
      ? roundNumber(validPercentages.reduce((sum, item) => sum + item, 0) / validPercentages.length)
      : null;

    const excellent = filteredGrades.filter(
      (row) => row.percentage !== null && row.percentage >= 90,
    ).length;

    const risk = filteredGrades.filter(
      (row) => row.percentage !== null && row.percentage < 60,
    ).length;

    const completed = filteredGrades.filter(
      (row) => row.percentage !== null && row.percentage !== undefined,
    ).length;

    const highest = validPercentages.length ? Math.max(...validPercentages) : null;
    const lowest = validPercentages.length ? Math.min(...validPercentages) : null;

    return {
      totalRows,
      completed,
      average,
      excellent,
      risk,
      highest: highest === null ? null : roundNumber(highest),
      lowest: lowest === null ? null : roundNumber(lowest),
    };
  }, [filteredGrades]);

  const studentSummary = useMemo(() => {
    return students.map((student) => {
      const rows = grades.filter((row) => row.student_id === student.id);
      const valid = rows
        .map((row) => row.percentage)
        .filter((item): item is number => item !== null && item !== undefined);

      const average = valid.length
        ? roundNumber(valid.reduce((sum, item) => sum + item, 0) / valid.length)
        : null;

      return {
        student,
        count: rows.length,
        average,
        label: getGradeLabel(average),
      };
    });
  }, [students, grades]);

  const exportRows = useMemo(() => {
    return filteredGrades.map((row, index) => {
      const student = studentsMap.get(row.student_id);

      return {
        "#": index + 1,
        "اسم الطالب": student?.full_name || "—",
        "رقم الهوية": student?.national_id || "—",
        "الصف": student?.grade_name || "—",
        "الفصل": student?.classroom_name || "—",
        "المادة": row.subject_name || "—",
        "الفترة": row.period_name || "—",
        "الفصل الدراسي": row.semester || "—",
        "العام الدراسي": row.academic_year || "—",
        "الواجبات": row.homework_score ?? "—",
        "المشاركة": row.participation_score ?? "—",
        "الاختبارات القصيرة": row.quiz_score ?? "—",
        "نصف الفصل": row.midterm_score ?? "—",
        "النهائي": row.final_score ?? "—",
        "المجموع": row.total_score ?? "—",
        "النسبة": row.percentage !== null ? `${row.percentage}%` : "—",
        "التقدير": row.grade_label,
        "الحالة": row.result_status,
        "ملاحظات": row.notes || "—",
      };
    });
  }, [filteredGrades, studentsMap]);

  function handleExportPDF() {
    exportTableToPDF({
      title: "تقرير درجات أبناء ولي الأمر",
      headers: Object.keys(exportRows[0] ?? {}),
      rows: exportRows.map(
        (row) => Object.values(row) as ExportCell[],
      ),
      fileName: "parent-grades-report.pdf",
    });
  }

  function handleExportExcel() {
    exportTableToExcel({
      title: "تقرير درجات أبناء ولي الأمر",
      headers: Object.keys(exportRows[0] ?? {}),
      rows: exportRows.map(
        (row) => Object.values(row) as ExportCell[],
      ),
      fileName: "parent-grades-report.xlsx",
    });
  }

  return (
    <RoleGuard allowedRoles={PARENT_ROLES}>
      <AppShell>
        <div dir="rtl" className="space-y-5">
          <PageHeader
            variant="hero"
            title="متابعة درجات الأبناء"
            description="درجات الأبناء ومؤشرات المستوى الدراسي."
            badge="بوابة ولي الأمر"
            icon={<ShieldCheck size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة ولي الأمر", href: "/parent-portal" },
              { label: "الدرجات" },
            ]}
            meta={[
              { label: "البريد المستخدم للربط", value: parentEmail || "غير محدد" },
              { label: "عدد الأبناء", value: students.length },
              { label: "المواد", value: subjectOptions.length },
              { label: "النتائج المعروضة", value: filteredGrades.length },
            ]}
            stats={[
              { label: "السجلات", value: stats.totalRows, icon: <BookOpenCheck size={20} aria-hidden="true" />, tone: "primary" },
              { label: "متوسط الأداء", value: stats.average !== null ? `${stats.average}%` : "—", icon: <BarChart3 size={20} aria-hidden="true" />, tone: stats.average !== null && stats.average >= 80 ? "green" : "gold" },
              { label: "ممتاز", value: stats.excellent, icon: <Award size={20} aria-hidden="true" />, tone: "green" },
              { label: "يحتاج متابعة", value: stats.risk, icon: <TrendingDown size={20} aria-hidden="true" />, tone: stats.risk > 0 ? "red" : "green" },
            ]}
            actions={
              <>
                <SecondaryButton
                  onClick={() => void loadData(true)}
                  disabled={refreshing}
                  aria-busy={refreshing}
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                  تحديث
                </SecondaryButton>

                <ExportButton
                  onClick={handleExportPDF}
                  disabled={!exportRows.length}
                  icon={<FileText className="h-4 w-4" aria-hidden="true" />}
                >
                  PDF
                </ExportButton>

                <ExportButton
                  onClick={handleExportExcel}
                  disabled={!exportRows.length}
                  icon={
                    <FileSpreadsheet
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  }
                >
                  Excel
                </ExportButton>
              </>
            }
          />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <ExecutiveCard
              title="سجلات الدرجات"
              value={stats.totalRows}
              subtitle="حسب الفلاتر الحالية"
              icon={<BookOpenCheck size={22} aria-hidden="true" />}
              tone="primary"
              progress={stats.totalRows > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="مكتملة"
              value={stats.completed}
              subtitle="لها نسبة أو درجة"
              icon={<CheckCircle2 size={22} aria-hidden="true" />}
              tone="green"
              progress={stats.totalRows ? percentage(stats.completed, stats.totalRows) : 0}
            />

            <ExecutiveCard
              title="متوسط الأداء"
              value={stats.average !== null ? `${stats.average}%` : "—"}
              subtitle={getGradeLabel(stats.average)}
              icon={<BarChart3 size={22} aria-hidden="true" />}
              tone={stats.average !== null && stats.average >= 80 ? "green" : "gold"}
              progress={stats.average || 0}
            />

            <ExecutiveCard
              title="ممتاز"
              value={stats.excellent}
              subtitle="90% فأعلى"
              icon={<Award size={22} aria-hidden="true" />}
              tone="green"
              progress={stats.totalRows ? percentage(stats.excellent, stats.totalRows) : 0}
            />

            <ExecutiveCard
              title="أعلى نتيجة"
              value={stats.highest !== null ? `${stats.highest}%` : "—"}
              subtitle="ضمن النتائج المعروضة"
              icon={<TrendingUp size={22} aria-hidden="true" />}
              tone="primary"
              progress={stats.highest || 0}
            />

            <ExecutiveCard
              title="يحتاج متابعة"
              value={stats.risk}
              subtitle="أقل من 60%"
              icon={<TrendingDown size={22} aria-hidden="true" />}
              tone={stats.risk > 0 ? "red" : "green"}
              progress={stats.totalRows ? percentage(stats.risk, stats.totalRows) : 0}
            />
          </section>

          <SummaryCard
            title="ملخص درجات الأبناء"
            description="ملخص النتائج الحالية."
            tone={stats.risk > 0 ? "gold" : "green"}
            items={[
              { label: "الأبناء المرتبطون", value: students.length },
              { label: "سجلات الدرجات", value: stats.totalRows },
              { label: "متوسط الأداء", value: stats.average !== null ? `${stats.average}%` : "—" },
              { label: "ممتاز", value: stats.excellent },
              { label: "أعلى نتيجة", value: stats.highest !== null ? `${stats.highest}%` : "—" },
              { label: "يحتاج متابعة", value: stats.risk },
            ]}
            footer="تُعرض النتائج المرتبطة ببريد ولي الأمر."
          />

          {!!studentSummary.length && (
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {studentSummary.map(({ student, count, average, label }) => (
                <div
                  key={student.id}
                  className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-[var(--app-shadow-sm)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] text-[var(--app-text-inverse)]">
                        <UserRound className="h-6 w-6" aria-hidden="true" />
                      </div>

                      <div>
                        <h3 className="font-black text-[var(--app-text)]">
                          {student.full_name || "طالب بدون اسم"}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                          {student.grade_name || "—"} / {student.classroom_name || "—"}
                        </p>
                      </div>
                    </div>

                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${gradeBadgeClass(average)}`}>
                      {label}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-[var(--app-text-muted)]">
                      <span>المتوسط</span>
                      <span className="font-bold text-[var(--app-text)]">
                        {average !== null ? `${average}%` : "—"}
                      </span>
                    </div>

                    <div
                      className="h-2 overflow-hidden rounded-full bg-[var(--app-card-soft)]"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={safePercent(average)}
                    >
                      <div
                        className={`h-full rounded-full ${progressClass(average)}`}
                        style={{ width: `${safePercent(average)}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-[var(--app-text-muted)]">
                    عدد سجلات الدرجات:{" "}
                    <span className="font-bold text-[var(--app-text)]">{count}</span>
                  </p>
                </div>
              ))}
            </section>
          )}

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-[var(--app-shadow-sm)]">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "بحث بالطالب أو المادة أو الفترة...",
              }}
              filters={
                <>
                  <ToolbarSelect value={selectedStudentId} onChange={setSelectedStudentId}>
                    <option value="all">جميع الأبناء</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name || "طالب بدون اسم"}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={selectedSubject} onChange={setSelectedSubject}>
                    <option value="all">جميع المواد</option>
                    {subjectOptions.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={selectedSemester} onChange={setSelectedSemester}>
                    <option value="all">كل الفصول</option>
                    {semesterOptions.map((semester) => (
                      <option key={semester} value={semester}>
                        {semester}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect
                    value={selectedLevel}
                    onChange={(value) => setSelectedLevel(value as LevelKey)}
                  >
                    <option value="all">كل المستويات</option>
                    <option value="excellent">ممتاز</option>
                    <option value="very_good">جيد جدًا</option>
                    <option value="good">جيد</option>
                    <option value="pass">مقبول</option>
                    <option value="risk">يحتاج متابعة</option>
                  </ToolbarSelect>
                </>
              }
              onRefresh={() => void loadData(true)}
              onExportPDF={handleExportPDF}
              onExportExcel={handleExportExcel}
            />
          </section>

          {error ? (
            <ErrorState
              title="تعذر تحميل البيانات"
              description={error}
            />
          ) : null}

          {loading ? (
            <PageLoader text="جاري تحميل سجل الدرجات..." />
          ) : !students.length ? (
            <EmptyState
              icon={<UsersRound className="h-9 w-9" aria-hidden="true" />}
              title="لا يوجد أبناء مرتبطون"
              description="تحقق من ربط بريد ولي الأمر بالطلاب."
            />
          ) : !filteredGrades.length ? (
            <EmptyState
              icon={<GraduationCap className="h-9 w-9" aria-hidden="true" />}
              title="لا توجد درجات مطابقة"
              description="غيّر الفلاتر أو تحقق من السجلات."
            />
          ) : (
            <section className="overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] shadow-[var(--app-shadow-sm)]">
              <div className="flex flex-col gap-2 border-b border-[var(--app-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-[var(--app-text)]">سجل الدرجات</h2>
                  <p className="text-sm text-[var(--app-text-muted)]">
                    عدد النتائج: {filteredGrades.length}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-2 text-sm font-bold text-[var(--app-text-muted)]">
                  تصدير النتائج الحالية
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-right text-sm">
                  <thead className="bg-[var(--app-primary)] text-[var(--app-text-inverse)]">
                    <tr>
                      <th className="px-4 py-3 font-bold">الطالب</th>
                      <th className="px-4 py-3 font-bold">المادة</th>
                      <th className="px-4 py-3 font-bold">الفترة</th>
                      <th className="px-4 py-3 font-bold">الفصل الدراسي</th>
                      <th className="px-4 py-3 font-bold">الأعمال</th>
                      <th className="px-4 py-3 font-bold">نصف الفصل</th>
                      <th className="px-4 py-3 font-bold">النهائي</th>
                      <th className="px-4 py-3 font-bold">المجموع</th>
                      <th className="px-4 py-3 font-bold">النسبة</th>
                      <th className="px-4 py-3 font-bold">التقدير</th>
                      <th className="px-4 py-3 font-bold">ملاحظات</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--app-border)]">
                    {filteredGrades.map((row) => {
                      const student = studentsMap.get(row.student_id);
                      const workScores = [
                        row.homework_score,
                        row.participation_score,
                        row.quiz_score,
                      ].filter((item): item is number => item !== null);

                      const workTotal = workScores.length
                        ? roundNumber(workScores.reduce((sum, item) => sum + item, 0))
                        : null;

                      return (
                        <tr key={row.id} className="transition hover:bg-[var(--app-card-soft)]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] text-[var(--app-text-inverse)]">
                                <UserRound className="h-5 w-5" aria-hidden="true" />
                              </div>

                              <div>
                                <p className="font-bold text-[var(--app-text)]">
                                  {student?.full_name || "طالب غير محدد"}
                                </p>
                                <p className="text-xs text-[var(--app-text-muted)]">
                                  {student?.grade_name || "—"} /{" "}
                                  {student?.classroom_name || "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-bold text-[var(--app-text)]">{row.subject_name}</p>
                            <p className="text-xs text-[var(--app-text-muted)]">{row.academic_year}</p>
                          </td>

                          <td className="px-4 py-3 text-[var(--app-text)]">{row.period_name}</td>
                          <td className="px-4 py-3 text-[var(--app-text)]">{row.semester}</td>
                          <td className="px-4 py-3 text-[var(--app-text)]">{workTotal ?? "—"}</td>
                          <td className="px-4 py-3 text-[var(--app-text)]">{row.midterm_score ?? "—"}</td>
                          <td className="px-4 py-3 text-[var(--app-text)]">{row.final_score ?? "—"}</td>

                          <td className="px-4 py-3">
                            <span className="font-black text-[var(--app-text)]">
                              {row.total_score ?? "—"}
                            </span>
                            <span className="text-xs text-[var(--app-text-subtle)]"> / {row.max_score || 100}</span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="min-w-[120px]">
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="font-bold text-[var(--app-text)]">
                                  {row.percentage !== null ? `${row.percentage}%` : "—"}
                                </span>
                              </div>

                              <div
                                className="h-2 overflow-hidden rounded-full bg-[var(--app-card-soft)]"
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={safePercent(row.percentage)}
                              >
                                <div
                                  className={`h-full rounded-full ${progressClass(row.percentage)}`}
                                  style={{ width: `${safePercent(row.percentage)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${gradeBadgeClass(row.percentage)}`}
                            >
                              {row.grade_label}
                            </span>
                          </td>

                          <td className="max-w-[260px] px-4 py-3 text-[var(--app-text-muted)]">
                            <p className="line-clamp-2">
                              {row.notes || "لا توجد ملاحظات"}
                            </p>

                            {row.created_at && (
                              <p className="mt-1 text-[11px] text-[var(--app-text-subtle)]">
                                آخر تحديث: {formatDate(row.created_at)}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </AppShell>
    </RoleGuard>
  );
}


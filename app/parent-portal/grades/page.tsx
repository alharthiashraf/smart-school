"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
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

type RawScore = Record<string, any>;

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

const PARENT_ROLES = ["super_admin", "school_admin", "parent"] as any;

function currentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  return `${year}-${year + 1}`;
}

function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function roundNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

function pickNumber(row: RawScore, keys: string[]): number | null {
  for (const key of keys) {
    const value = toNumber(row?.[key]);
    if (value !== null) return value;
  }

  return null;
}

function pickText(row: RawScore, keys: string[], fallback = "—") {
  for (const key of keys) {
    const value = row?.[key];

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

function gradeBadgeClass(percentage: number | null | undefined) {
  if (percentage === null || percentage === undefined) {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  if (percentage >= 90) return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
  if (percentage >= 80) return "border-[#3D7EB9]/20 bg-[#3D7EB9]/10 text-[#3D7EB9]";
  if (percentage >= 70) return "border-[#0DA9A6]/20 bg-[#0DA9A6]/10 text-[#0DA9A6]";
  if (percentage >= 60) return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";

  return "border-red-200 bg-red-50 text-red-700";
}

function progressClass(percentage: number | null | undefined) {
  if (percentage === null || percentage === undefined) return "bg-slate-300";
  if (percentage >= 90) return "bg-[#07A869]";
  if (percentage >= 80) return "bg-[#3D7EB9]";
  if (percentage >= 70) return "bg-[#0DA9A6]";
  if (percentage >= 60) return "bg-[#C1B489]";
  return "bg-red-600";
}

function safePercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
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
  const schoolContext = useSchool() as any;
  const schoolId =
    schoolContext?.currentSchool?.id ||
    schoolContext?.schoolId ||
    schoolContext?.school?.id ||
    schoolContext?.selectedSchool?.id ||
    null;

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

  async function loadParentStudents(email: string) {
    let query = supabase
      .from("students")
      .select("id, full_name, national_id, grade_name, classroom_name, guardian_email, status")
      .eq("guardian_email", email)
      .order("full_name", { ascending: true });

    if (schoolId) query = query.eq("school_id", schoolId);

    const { data, error: studentsError } = await query;

    if (studentsError) throw new Error(studentsError.message);

    return (data || []) as Student[];
  }

  async function loadSubjects() {
    try {
      let query = supabase.from("school_grade_subjects").select("*");

      if (schoolId) query = query.eq("school_id", schoolId);

      const { data, error: subjectsError } = await query;
      if (subjectsError) throw subjectsError;

      return (data || []) as Subject[];
    } catch {
      return [];
    }
  }

  async function loadPeriods() {
    try {
      let query = supabase.from("school_grade_periods").select("*");

      if (schoolId) query = query.eq("school_id", schoolId);

      const { data, error: periodsError } = await query;
      if (periodsError) throw periodsError;

      return (data || []) as GradePeriod[];
    } catch {
      return [];
    }
  }

  function mapProfessionalScore(
    row: RawScore,
    subjectMap: Map<string, Subject>,
    periodMap: Map<string, GradePeriod>,
  ): GradeRow {
    const subjectId =
      row.subject_id || row.grade_subject_id || row.school_grade_subject_id || null;

    const periodId =
      row.period_id || row.grade_period_id || row.school_grade_period_id || null;

    const subject = subjectId ? subjectMap.get(subjectId) : null;
    const period = periodId ? periodMap.get(periodId) : null;

    const total = calculateTotal(row);
    const percentage = calculatePercentage(row);
    const maxScore = getMaxScore(row);

    return {
      id: String(row.id),
      student_id: String(row.student_id),
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
      notes: row.notes || row.teacher_notes || null,
      created_at: row.created_at || null,
    };
  }

  function mapSimpleScore(row: RawScore): GradeRow {
    const percentage = calculatePercentage(row);
    const total = calculateTotal(row);

    return {
      id: String(row.id),
      student_id: String(row.student_id),
      subject_id: row.subject_id || null,
      period_id: row.period_id || null,
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
      notes: row.notes || row.teacher_notes || null,
      created_at: row.created_at || null,
    };
  }

  async function loadProfessionalGrades(studentIds: string[]) {
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
  }

  async function loadSimpleGradesFromTable(tableName: string, studentIds: string[]) {
    let query = supabase.from(tableName).select("*").in("student_id", studentIds);

    if (schoolId) query = query.eq("school_id", schoolId);

    const { data, error: tableError } = await query;

    if (tableError) throw tableError;

    return ((data || []) as RawScore[]).map(mapSimpleScore);
  }

  async function loadGrades(studentIds: string[]) {
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
  }

  async function loadData(isRefresh = false) {
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
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تحميل بيانات الدرجات.");
      setStudents([]);
      setGrades([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

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
      fileName: "parent-grades-report.pdf",
      rows: exportRows,
    } as any);
  }

  function handleExportExcel() {
    exportTableToExcel({
      fileName: "parent-grades-report.xlsx",
      sheetName: "Grades",
      rows: exportRows,
    } as any);
  }

  return (
    <RoleGuard allowedRoles={PARENT_ROLES}>
      <AppShell>
        <div dir="rtl" className="space-y-5">
          <PageHeader
            variant="hero"
            title="متابعة درجات الأبناء"
            description="تعرض هذه الصفحة درجات الأبناء المرتبطين ببريد ولي الأمر، مع مؤشرات مختصرة تساعد على متابعة المستوى الدراسي."
            badge="بوابة ولي الأمر"
            icon={<ShieldCheck size={18} />}
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
              { label: "السجلات", value: stats.totalRows, icon: <BookOpenCheck size={20} />, tone: "blue" },
              { label: "متوسط الأداء", value: stats.average !== null ? `${stats.average}%` : "—", icon: <BarChart3 size={20} />, tone: stats.average !== null && stats.average >= 80 ? "green" : "gold" },
              { label: "ممتاز", value: stats.excellent, icon: <Award size={20} />, tone: "green" },
              { label: "يحتاج متابعة", value: stats.risk, icon: <TrendingDown size={20} />, tone: stats.risk > 0 ? "red" : "green" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void loadData(true)}
                  disabled={refreshing}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  تحديث
                </button>

                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={!exportRows.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={!exportRows.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </button>
              </>
            }
          />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <ExecutiveCard
              title="سجلات الدرجات"
              value={stats.totalRows}
              subtitle="حسب الفلاتر الحالية"
              icon={<BookOpenCheck size={22} />}
              tone="blue"
              progress={stats.totalRows > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="مكتملة"
              value={stats.completed}
              subtitle="لها نسبة أو درجة"
              icon={<CheckCircle2 size={22} />}
              tone="green"
              progress={stats.totalRows ? percentage(stats.completed, stats.totalRows) : 0}
            />

            <ExecutiveCard
              title="متوسط الأداء"
              value={stats.average !== null ? `${stats.average}%` : "—"}
              subtitle={getGradeLabel(stats.average)}
              icon={<BarChart3 size={22} />}
              tone={stats.average !== null && stats.average >= 80 ? "green" : "gold"}
              progress={stats.average || 0}
            />

            <ExecutiveCard
              title="ممتاز"
              value={stats.excellent}
              subtitle="90% فأعلى"
              icon={<Award size={22} />}
              tone="green"
              progress={stats.totalRows ? percentage(stats.excellent, stats.totalRows) : 0}
            />

            <ExecutiveCard
              title="أعلى نتيجة"
              value={stats.highest !== null ? `${stats.highest}%` : "—"}
              subtitle="ضمن النتائج المعروضة"
              icon={<TrendingUp size={22} />}
              tone="teal"
              progress={stats.highest || 0}
            />

            <ExecutiveCard
              title="يحتاج متابعة"
              value={stats.risk}
              subtitle="أقل من 60%"
              icon={<TrendingDown size={22} />}
              tone={stats.risk > 0 ? "red" : "green"}
              progress={stats.totalRows ? percentage(stats.risk, stats.totalRows) : 0}
            />
          </section>

          <SummaryCard
            title="ملخص درجات الأبناء"
            description="قراءة سريعة لمستوى الأبناء حسب الفلاتر الحالية والسجلات المتاحة في النظام."
            tone={stats.risk > 0 ? "gold" : "green"}
            items={[
              { label: "الأبناء المرتبطون", value: students.length },
              { label: "سجلات الدرجات", value: stats.totalRows },
              { label: "متوسط الأداء", value: stats.average !== null ? `${stats.average}%` : "—" },
              { label: "ممتاز", value: stats.excellent },
              { label: "أعلى نتيجة", value: stats.highest !== null ? `${stats.highest}%` : "—" },
              { label: "يحتاج متابعة", value: stats.risk },
            ]}
            footer="يتم عرض البيانات حسب بريد ولي الأمر المخزن في عمود guardian_email داخل جدول الطلاب."
          />

          {!!studentSummary.length && (
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {studentSummary.map(({ student, count, average, label }) => (
                <div
                  key={student.id}
                  className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#15445A] text-white">
                        <UserRound className="h-6 w-6" />
                      </div>

                      <div>
                        <h3 className="font-black text-[#15445A]">
                          {student.full_name || "طالب بدون اسم"}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {student.grade_name || "—"} / {student.classroom_name || "—"}
                        </p>
                      </div>
                    </div>

                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${gradeBadgeClass(average)}`}>
                      {label}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                      <span>المتوسط</span>
                      <span className="font-bold text-[#15445A]">
                        {average !== null ? `${average}%` : "—"}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${progressClass(average)}`}
                        style={{ width: `${safePercent(average)}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    عدد سجلات الدرجات:{" "}
                    <span className="font-bold text-[#15445A]">{count}</span>
                  </p>
                </div>
              ))}
            </section>
          )}

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث باسم الطالب، المادة، الفترة، أو الملاحظة...",
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

          {error && (
            <div className="rounded-[28px] border border-red-100 bg-red-50 p-4 text-sm leading-7 text-red-700">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">تعذر تحميل البيانات</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <LoadingBox />
          ) : !students.length ? (
            <EmptyState
              icon={<UsersRound className="h-9 w-9" />}
              title="لا يوجد أبناء مرتبطون بهذا الحساب"
              description="تأكد أن بريد ولي الأمر محفوظ في عمود guardian_email داخل جدول students لنفس بريد الحساب الحالي."
            />
          ) : !filteredGrades.length ? (
            <EmptyState
              icon={<GraduationCap className="h-9 w-9" />}
              title="لا توجد درجات مطابقة"
              description="جرّب تغيير الفلاتر الحالية، أو تأكد من وجود درجات مرتبطة بأبناء ولي الأمر."
            />
          ) : (
            <section className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#15445A]">سجل الدرجات</h2>
                  <p className="text-sm text-slate-500">
                    عدد النتائج: {filteredGrades.length}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
                  التصدير حسب النتائج المعروضة
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-right text-sm">
                  <thead className="bg-[#15445A] text-white">
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

                  <tbody className="divide-y divide-slate-100">
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
                        <tr key={row.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#15445A] text-white">
                                <UserRound className="h-5 w-5" />
                              </div>

                              <div>
                                <p className="font-bold text-[#15445A]">
                                  {student?.full_name || "طالب غير محدد"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {student?.grade_name || "—"} /{" "}
                                  {student?.classroom_name || "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-bold text-[#15445A]">{row.subject_name}</p>
                            <p className="text-xs text-slate-500">{row.academic_year}</p>
                          </td>

                          <td className="px-4 py-3 text-slate-700">{row.period_name}</td>
                          <td className="px-4 py-3 text-slate-700">{row.semester}</td>
                          <td className="px-4 py-3 text-slate-700">{workTotal ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-700">{row.midterm_score ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-700">{row.final_score ?? "—"}</td>

                          <td className="px-4 py-3">
                            <span className="font-black text-[#15445A]">
                              {row.total_score ?? "—"}
                            </span>
                            <span className="text-xs text-slate-400"> / {row.max_score || 100}</span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="min-w-[120px]">
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="font-bold text-[#15445A]">
                                  {row.percentage !== null ? `${row.percentage}%` : "—"}
                                </span>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
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

                          <td className="max-w-[260px] px-4 py-3 text-slate-600">
                            <p className="line-clamp-2">
                              {row.notes || "لا توجد ملاحظات"}
                            </p>

                            {row.created_at && (
                              <p className="mt-1 text-[11px] text-slate-400">
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

function LoadingBox() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-slate-100 bg-white">
      <div className="flex flex-col items-center gap-3 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <p className="text-sm font-bold">جاري تحميل سجل الدرجات...</p>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-slate-100 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          {icon}
        </div>

        <h2 className="mt-4 text-xl font-black text-[#15445A]">{title}</h2>

        <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

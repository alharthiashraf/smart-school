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
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";

type Student = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  student_email?: string | null;
  national_id?: string | null;
  grade_name?: string | null;
  classroom_name?: string | null;
  status?: string | null;
  user_id?: string | null;
  auth_user_id?: string | null;
};

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

type RawScore = Record<string, any>;
type SubjectRow = Record<string, any>;
type PeriodRow = Record<string, any>;
type LevelKey = "all" | "excellent" | "very_good" | "good" | "pass" | "risk";

const STUDENT_ROLES = ["super_admin", "school_admin", "student"] as any;

function currentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  return `${year}-${year + 1}`;
}

function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
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

  if (total !== null && max !== null && max > 0) return roundNumber((total / max) * 100);
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
  return pickNumber(row, ["max_score", "full_mark", "total_mark", "out_of", "maximum_score"]) || 100;
}

function subjectTitle(subject?: SubjectRow | null) {
  if (!subject) return "مادة غير محددة";
  return subject.subject_name || subject.name || subject.title || subject.course_name || "مادة غير محددة";
}

function periodTitle(period?: PeriodRow | null) {
  if (!period) return "فترة غير محددة";
  return period.period_name || period.name || period.title || period.exam_name || "فترة غير محددة";
}

async function safeSingleStudentQuery(query: any) {
  const { data, error } = await query.limit(1);

  if (error) throw error;

  return Array.isArray(data) && data.length ? (data[0] as Student) : null;
}

async function selectWithOptionalSchool(table: string, schoolId: string | null) {
  if (schoolId) {
    const withSchool = await supabase.from(table).select("*").eq("school_id", schoolId);

    if (!withSchool.error) return withSchool.data || [];
  }

  const withoutSchool = await supabase.from(table).select("*");

  if (withoutSchool.error) throw withoutSchool.error;

  return withoutSchool.data || [];
}

export default function StudentGradesPage() {
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

  const [currentEmail, setCurrentEmail] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<GradeRow[]>([]);

  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState<LevelKey>("all");
  const [search, setSearch] = useState("");

  async function findStudentForCurrentUser(userId: string, email: string) {
    const applySchool = (query: any) => {
      if (schoolId) return query.eq("school_id", schoolId);
      return query;
    };

    const attempts = [
      () => safeSingleStudentQuery(applySchool(supabase.from("students").select("*").eq("auth_user_id", userId))),
      () => safeSingleStudentQuery(applySchool(supabase.from("students").select("*").eq("user_id", userId))),
      () => safeSingleStudentQuery(applySchool(supabase.from("students").select("*").eq("email", email))),
      () => safeSingleStudentQuery(applySchool(supabase.from("students").select("*").eq("student_email", email))),
    ];

    for (const attempt of attempts) {
      try {
        const result = await attempt();
        if (result) return result;
      } catch {
        // بعض الأعمدة قد لا تكون موجودة في كل نسخة من قاعدة البيانات.
      }
    }

    return null;
  }

  async function loadSubjects() {
    try {
      const data = await selectWithOptionalSchool("school_grade_subjects", schoolId);
      return data as SubjectRow[];
    } catch {
      return [];
    }
  }

  async function loadPeriods() {
    try {
      const data = await selectWithOptionalSchool("school_grade_periods", schoolId);
      return data as PeriodRow[];
    } catch {
      return [];
    }
  }

  function mapProfessionalScore(
    row: RawScore,
    subjectMap: Map<string, SubjectRow>,
    periodMap: Map<string, PeriodRow>,
  ): GradeRow {
    const subjectId = row.subject_id || row.grade_subject_id || row.school_grade_subject_id || null;
    const periodId = row.period_id || row.grade_period_id || row.school_grade_period_id || null;

    const subject = subjectId ? subjectMap.get(String(subjectId)) : null;
    const period = periodId ? periodMap.get(String(periodId)) : null;

    const total = calculateTotal(row);
    const percentageValue = calculatePercentage(row);
    const maxScore = getMaxScore(row);

    return {
      id: String(row.id),
      student_id: String(row.student_id),
      subject_id: subjectId,
      period_id: periodId,
      subject_name: pickText(row, ["subject_name", "subject", "course_name"], subjectTitle(subject)),
      period_name: pickText(row, ["period_name", "period", "exam_name"], periodTitle(period)),
      semester: pickText(row, ["semester", "term"], period?.semester || "غير محدد"),
      academic_year: pickText(row, ["academic_year", "year"], period?.academic_year || currentAcademicYear()),
      homework_score: pickNumber(row, ["homework_score", "homework", "assignments_score"]),
      participation_score: pickNumber(row, ["participation_score", "participation", "classwork_score"]),
      quiz_score: pickNumber(row, ["quiz_score", "quiz", "quizzes_score"]),
      midterm_score: pickNumber(row, ["midterm_score", "midterm", "midterm_exam_score"]),
      final_score: pickNumber(row, ["final_score", "final", "final_exam_score"]),
      total_score: total,
      max_score: maxScore,
      percentage: percentageValue,
      grade_label: pickText(row, ["grade_label"], getGradeLabel(percentageValue)),
      result_status: pickText(row, ["result_status"], getResultStatus(percentageValue)),
      notes: row.notes || row.teacher_notes || null,
      created_at: row.created_at || null,
    };
  }

  function mapSimpleScore(row: RawScore): GradeRow {
    const percentageValue = calculatePercentage(row);
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
      percentage: percentageValue,
      grade_label: pickText(row, ["grade_label"], getGradeLabel(percentageValue)),
      result_status: pickText(row, ["result_status"], getResultStatus(percentageValue)),
      notes: row.notes || row.teacher_notes || null,
      created_at: row.created_at || null,
    };
  }

  async function loadProfessionalGrades(studentId: string) {
    let response = schoolId
      ? await supabase.from("student_period_scores").select("*").eq("student_id", studentId).eq("school_id", schoolId)
      : await supabase.from("student_period_scores").select("*").eq("student_id", studentId);

    if (response.error && schoolId) {
      response = await supabase.from("student_period_scores").select("*").eq("student_id", studentId);
    }

    if (response.error) throw response.error;

    const [subjects, periods] = await Promise.all([loadSubjects(), loadPeriods()]);

    const subjectMap = new Map<string, SubjectRow>();
    subjects.forEach((subject) => {
      if (subject.id) subjectMap.set(String(subject.id), subject);
    });

    const periodMap = new Map<string, PeriodRow>();
    periods.forEach((period) => {
      if (period.id) periodMap.set(String(period.id), period);
    });

    return ((response.data || []) as RawScore[]).map((row) =>
      mapProfessionalScore(row, subjectMap, periodMap),
    );
  }

  async function loadSimpleGradesFromTable(tableName: string, studentId: string) {
    let response = schoolId
      ? await supabase.from(tableName).select("*").eq("student_id", studentId).eq("school_id", schoolId)
      : await supabase.from(tableName).select("*").eq("student_id", studentId);

    if (response.error && schoolId) {
      response = await supabase.from(tableName).select("*").eq("student_id", studentId);
    }

    if (response.error) throw response.error;

    return ((response.data || []) as RawScore[]).map(mapSimpleScore);
  }

  async function loadStudentGrades(studentId: string) {
    try {
      const professionalRows = await loadProfessionalGrades(studentId);
      if (professionalRows.length) return professionalRows;
    } catch {
      // fallback
    }

    try {
      const simpleRows = await loadSimpleGradesFromTable("grades", studentId);
      if (simpleRows.length) return simpleRows;
    } catch {
      // fallback
    }

    try {
      return await loadSimpleGradesFromTable("student_grades", studentId);
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

      const userId = user?.id || "";
      const email = user?.email || "";

      setCurrentEmail(email);

      if (!userId || !email) {
        setStudent(null);
        setGrades([]);
        setError("تعذر التعرف على حساب الطالب الحالي.");
        return;
      }

      const currentStudent = await findStudentForCurrentUser(userId, email);

      if (!currentStudent) {
        setStudent(null);
        setGrades([]);
        return;
      }

      setStudent(currentStudent);

      const rows = await loadStudentGrades(currentStudent.id);

      setGrades(
        rows.sort((a, b) => {
          const subjectCompare = a.subject_name.localeCompare(b.subject_name, "ar");
          if (subjectCompare !== 0) return subjectCompare;
          return a.period_name.localeCompare(b.period_name, "ar");
        }),
      );
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تحميل بيانات الدرجات.");
      setStudent(null);
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
      const level = levelFromPercentage(row.percentage);
      const matchesSubject = selectedSubject === "all" || row.subject_name === selectedSubject;
      const matchesSemester = selectedSemester === "all" || row.semester === selectedSemester;
      const matchesLevel = selectedLevel === "all" || level === selectedLevel;

      const matchesSearch =
        !text ||
        String(row.subject_name || "").toLowerCase().includes(text) ||
        String(row.period_name || "").toLowerCase().includes(text) ||
        String(row.notes || "").toLowerCase().includes(text) ||
        String(row.grade_label || "").toLowerCase().includes(text);

      return matchesSubject && matchesSemester && matchesLevel && matchesSearch;
    });
  }, [grades, selectedSubject, selectedSemester, selectedLevel, search]);

  const stats = useMemo(() => {
    const validPercentages = filteredGrades
      .map((row) => row.percentage)
      .filter((item): item is number => item !== null && item !== undefined);

    const totalRows = filteredGrades.length;

    const average = validPercentages.length
      ? roundNumber(validPercentages.reduce((sum, item) => sum + item, 0) / validPercentages.length)
      : null;

    const excellent = filteredGrades.filter((row) => row.percentage !== null && row.percentage >= 90).length;
    const risk = filteredGrades.filter((row) => row.percentage !== null && row.percentage < 60).length;
    const completed = filteredGrades.filter((row) => row.percentage !== null && row.percentage !== undefined).length;

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

  const exportRows = useMemo(() => {
    return filteredGrades.map((row, index) => ({
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
    }));
  }, [filteredGrades, student]);

  function handleExportPDF() {
    exportTableToPDF({
      title: "تقرير درجات الطالب",
      fileName: "student-grades-report.pdf",
      rows: exportRows,
    } as any);
  }

  function handleExportExcel() {
    exportTableToExcel({
      fileName: "student-grades-report.xlsx",
      sheetName: "Grades",
      rows: exportRows,
    } as any);
  }

  return (
    <RoleGuard allowedRoles={STUDENT_ROLES}>
      <AppShell>
        <main dir="rtl" className="space-y-5">
          <PageHeader
            variant="hero"
            title="درجاتي"
            description="متابعة درجاتك حسب المواد والفترات الدراسية، مع مؤشرات الأداء والتقدير والحالة الأكاديمية."
            badge="بوابة الطالب"
            icon={<GraduationCap size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة الطالب", href: "/student-portal" },
              { label: "درجاتي" },
            ]}
            meta={[
              { label: "البريد المستخدم للربط", value: currentEmail || "غير محدد" },
              { label: "الطالب", value: student?.full_name || "غير محدد" },
              { label: "الصف", value: student?.grade_name || "غير محدد" },
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

          {student && (
            <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#15445A] text-white">
                    <UserRound className="h-7 w-7" />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-[#15445A]">
                      {student.full_name || "طالب بدون اسم"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {student.grade_name || "—"} / {student.classroom_name || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                    الهوية: {student.national_id || "—"}
                  </span>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                    الحالة: {student.status || "نشط"}
                  </span>
                </div>
              </div>
            </section>
          )}

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
            title="ملخص درجاتي"
            description="قراءة سريعة لمستوى الأداء حسب الفلاتر الحالية والسجلات المتاحة في النظام."
            tone={stats.risk > 0 ? "gold" : "green"}
            items={[
              { label: "سجلات الدرجات", value: stats.totalRows },
              { label: "متوسط الأداء", value: stats.average !== null ? `${stats.average}%` : "—" },
              { label: "ممتاز", value: stats.excellent },
              { label: "أعلى نتيجة", value: stats.highest !== null ? `${stats.highest}%` : "—" },
              { label: "أقل نتيجة", value: stats.lowest !== null ? `${stats.lowest}%` : "—" },
              { label: "يحتاج متابعة", value: stats.risk },
            ]}
            footer="يتم عرض البيانات حسب حساب الطالب المرتبط بالبريد أو معرف المستخدم."
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث بالمادة، الفترة، التقدير، أو الملاحظة...",
              }}
              filters={
                <>
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
          ) : !student ? (
            <EmptyState
              icon={<UserRound className="h-9 w-9" />}
              title="لم يتم العثور على حساب طالب مرتبط"
              description="تأكد أن حساب الطالب مرتبط في جدول students عبر auth_user_id أو user_id أو email أو student_email."
            />
          ) : !filteredGrades.length ? (
            <EmptyState
              icon={<GraduationCap className="h-9 w-9" />}
              title="لا توجد درجات مطابقة"
              description="جرّب تغيير الفلاتر الحالية، أو تأكد من وجود درجات مرتبطة بحساب الطالب."
            />
          ) : (
            <section className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#15445A]">تفاصيل الدرجات</h2>
                  <p className="text-sm text-slate-500">
                    عدد النتائج: {filteredGrades.length}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
                  التصدير حسب النتائج المعروضة
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-right text-sm">
                  <thead className="bg-[#15445A] text-white">
                    <tr>
                      <th className="px-4 py-3 font-bold">المادة</th>
                      <th className="px-4 py-3 font-bold">الفترة</th>
                      <th className="px-4 py-3 font-bold">الفصل الدراسي</th>
                      <th className="px-4 py-3 font-bold">الأعمال</th>
                      <th className="px-4 py-3 font-bold">نصف الفصل</th>
                      <th className="px-4 py-3 font-bold">النهائي</th>
                      <th className="px-4 py-3 font-bold">المجموع</th>
                      <th className="px-4 py-3 font-bold">النسبة</th>
                      <th className="px-4 py-3 font-bold">التقدير</th>
                      <th className="px-4 py-3 font-bold">الحالة</th>
                      <th className="px-4 py-3 font-bold">ملاحظات</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredGrades.map((row) => {
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
                            <p className="font-bold text-[#15445A]">{row.subject_name}</p>
                            <p className="mt-1 text-xs text-slate-500">{row.academic_year}</p>
                          </td>

                          <td className="px-4 py-3 text-slate-700">{row.period_name}</td>
                          <td className="px-4 py-3 text-slate-700">{row.semester}</td>
                          <td className="px-4 py-3 text-slate-700">{workTotal ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-700">{row.midterm_score ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-700">{row.final_score ?? "—"}</td>

                          <td className="px-4 py-3">
                            <span className="font-black text-[#15445A]">{row.total_score ?? "—"}</span>
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
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${gradeBadgeClass(row.percentage)}`}>
                              {row.grade_label}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${gradeBadgeClass(row.percentage)}`}>
                              {row.result_status}
                            </span>
                          </td>

                          <td className="max-w-[260px] px-4 py-3 text-slate-600">
                            <p className="line-clamp-2">{row.notes || "لا توجد ملاحظات"}</p>
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
        </main>
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

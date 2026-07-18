import { supabase } from "@/lib/supabase";
import { buildGradeAnalytics, type GradeAnalyticsInput } from "./gradingAnalytics";

export type StudentPortalGradeBookStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "locked"
  | "reopened";

export type StudentPortalGradeComponent = {
  key: string;
  name: string;
  max_score: number;
  is_required?: boolean;
};

export type StudentPortalGradeValues = Record<string, number | null | undefined>;

export type StudentPortalSubject = {
  id: string;
  subject_name?: string | null;
  subject_code?: string | null;
};

export type StudentPortalGradeBook = {
  id: string;
  school_id: string;
  subject_id?: string | null;
  classroom_id?: string | null;
  academic_year?: string | null;
  semester?: string | null;
  status?: StudentPortalGradeBookStatus | null;
  max_score?: number | null;
  components?: StudentPortalGradeComponent[] | string | null;
  subjects?: StudentPortalSubject | StudentPortalSubject[] | null;
};

export type StudentPortalGradeEntry = {
  id: string;
  student_id: string;
  grade_book_id?: string | null;
  values?: StudentPortalGradeValues | string | null;
  total_score?: number | null;
  max_score?: number | null;
  percentage?: number | null;
  grade_label?: string | null;
  result_status?: string | null;
  notes?: string | null;
  grade_books?: StudentPortalGradeBook | StudentPortalGradeBook[] | null;
};

export type StudentPortalConductScore = {
  id?: string;
  school_id: string;
  student_id: string;
  score_type: "behavior" | "attendance";
  score?: number | null;
  max_score?: number | null;
  academic_year?: string | null;
  semester?: string | null;
};

export type StudentPortalSubjectGrade = {
  id: string;
  gradeBookId: string;
  subjectId: string | null;
  subjectName: string;
  subjectCode: string | null;
  academicYear: string | null;
  semester: string | null;
  status: StudentPortalGradeBookStatus | null;
  statusLabel: string;
  isVisibleToStudent: boolean;
  totalScore: number;
  maxScore: number;
  percentage: number;
  gradeLabel: string;
  resultStatus: string;
  notes: string | null;
  components: Array<{
    key: string;
    name: string;
    score: number | null;
    maxScore: number;
    isRequired: boolean;
  }>;
};

export type StudentPortalSummary = {
  totalSubjects: number;
  visibleSubjects: number;
  averagePercentage: number;
  passRate: number;
  highestSubject: StudentPortalSubjectGrade | null;
  lowestSubject: StudentPortalSubjectGrade | null;
  weakSubjects: StudentPortalSubjectGrade[];
  excellentSubjects: StudentPortalSubjectGrade[];
  behaviorScore: number;
  attendanceScore: number;
  behaviorLabel: string;
  attendanceLabel: string;
};

export type StudentPortalDashboard = {
  grades: StudentPortalSubjectGrade[];
  conduct: {
    behavior: StudentPortalConductScore | null;
    attendance: StudentPortalConductScore | null;
  };
  analytics: ReturnType<typeof buildGradeAnalytics>;
  summary: StudentPortalSummary;
  recommendations: string[];
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  return {};
}

function parseComponents(value: StudentPortalGradeBook["components"]) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as StudentPortalGradeComponent[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function statusLabel(status?: StudentPortalGradeBookStatus | null) {
  const labels: Record<StudentPortalGradeBookStatus, string> = {
    draft: "مسودة",
    submitted: "بانتظار الاعتماد",
    approved: "معتمد",
    locked: "مقفل",
    reopened: "معاد فتحه",
  };

  return status ? labels[status] ?? "غير مهيأ" : "غير مهيأ";
}

function isVisibleToStudent(status?: StudentPortalGradeBookStatus | null) {
  return status === "approved" || status === "locked";
}

function conductLabel(score: number) {
  if (score >= 95) return "ممتاز";
  if (score >= 85) return "جيد جدًا";
  if (score >= 75) return "جيد";
  if (score >= 60) return "يحتاج متابعة";
  return "خطر";
}

function buildSubjectGrade(entry: StudentPortalGradeEntry): StudentPortalSubjectGrade {
  const book = first(entry.grade_books);
  const subject = first(book?.subjects);
  const components = parseComponents(book?.components);
  const values = parseJsonObject(entry.values);

  const maxScore =
    toNumber(entry.max_score, 0) ||
    toNumber(book?.max_score, 0) ||
    components.reduce((sum, component) => sum + toNumber(component.max_score), 0) ||
    100;

  const totalScore = toNumber(entry.total_score, 0);
  const percentage =
    entry.percentage !== null && entry.percentage !== undefined
      ? toNumber(entry.percentage)
      : maxScore > 0
        ? Math.round((totalScore / maxScore) * 100)
        : 0;

  return {
    id: entry.id,
    gradeBookId: book?.id ?? entry.grade_book_id ?? "",
    subjectId: book?.subject_id ?? subject?.id ?? null,
    subjectName: subject?.subject_name || subject?.subject_code || "مادة غير محددة",
    subjectCode: subject?.subject_code ?? null,
    academicYear: book?.academic_year ?? null,
    semester: book?.semester ?? null,
    status: book?.status ?? null,
    statusLabel: statusLabel(book?.status),
    isVisibleToStudent: isVisibleToStudent(book?.status),
    totalScore,
    maxScore,
    percentage,
    gradeLabel: entry.grade_label || "غير محدد",
    resultStatus: entry.result_status || (percentage >= 60 ? "ناجح" : "راسب"),
    notes: entry.notes ?? null,
    components: components.map((component) => ({
      key: component.key,
      name: component.name,
      score:
        values[component.key] === null || values[component.key] === undefined
          ? null
          : toNumber(values[component.key]),
      maxScore: toNumber(component.max_score),
      isRequired: Boolean(component.is_required),
    })),
  };
}

function buildRecommendations(input: {
  grades: StudentPortalSubjectGrade[];
  behaviorScore: number;
  attendanceScore: number;
}) {
  const recommendations: string[] = [];
  const weakSubjects = input.grades.filter((grade) => grade.percentage > 0 && grade.percentage < 60);
  const watchSubjects = input.grades.filter((grade) => grade.percentage >= 60 && grade.percentage < 70);

  if (weakSubjects.length > 0) {
    recommendations.push(
      `ركز على المواد التي تحتاج دعمًا: ${weakSubjects
        .slice(0, 3)
        .map((grade) => grade.subjectName)
        .join("، ")}.`,
    );
  }

  if (watchSubjects.length > 0) {
    recommendations.push(
      `لديك مواد قريبة من مستوى الاستقرار، راجعها مبكرًا: ${watchSubjects
        .slice(0, 3)
        .map((grade) => grade.subjectName)
        .join("، ")}.`,
    );
  }

  if (input.behaviorScore < 75) {
    recommendations.push("درجة السلوك تحتاج متابعة؛ احرص على الالتزام بالتعليمات المدرسية.");
  }

  if (input.attendanceScore < 75) {
    recommendations.push("درجة المواظبة تحتاج تحسين؛ قلل الغياب والتأخر قدر الإمكان.");
  }

  if (recommendations.length === 0 && input.grades.length > 0) {
    recommendations.push("أداؤك مستقر، استمر على نفس المستوى وحافظ على انتظامك.");
  }

  if (input.grades.length === 0) {
    recommendations.push("لا توجد درجات معتمدة حاليًا للعرض.");
  }

  return recommendations;
}

function buildSummary(input: {
  grades: StudentPortalSubjectGrade[];
  analytics: ReturnType<typeof buildGradeAnalytics>;
  behavior: StudentPortalConductScore | null;
  attendance: StudentPortalConductScore | null;
}): StudentPortalSummary {
  const behaviorScore = toNumber(input.behavior?.score, 100);
  const attendanceScore = toNumber(input.attendance?.score, 100);
  const visibleGrades = input.grades.filter((grade) => grade.isVisibleToStudent);

  return {
    totalSubjects: input.grades.length,
    visibleSubjects: visibleGrades.length,
    averagePercentage: input.analytics.averagePercentage,
    passRate: input.analytics.passRate,
    highestSubject:
      visibleGrades.reduce<StudentPortalSubjectGrade | null>(
        (best, grade) => (!best || grade.percentage > best.percentage ? grade : best),
        null,
      ) ?? null,
    lowestSubject:
      visibleGrades.reduce<StudentPortalSubjectGrade | null>(
        (worst, grade) => (!worst || grade.percentage < worst.percentage ? grade : worst),
        null,
      ) ?? null,
    weakSubjects: visibleGrades.filter((grade) => grade.percentage > 0 && grade.percentage < 60),
    excellentSubjects: visibleGrades.filter((grade) => grade.percentage >= 90),
    behaviorScore,
    attendanceScore,
    behaviorLabel: conductLabel(behaviorScore),
    attendanceLabel: conductLabel(attendanceScore),
  };
}

export const GradingStudentPortal = {
  async listStudentGrades(input: {
    schoolId: string;
    studentId: string;
    academicYear?: string;
    semester?: string;
    includeDraft?: boolean;
  }): Promise<StudentPortalSubjectGrade[]> {
    let query = supabase
      .from("grade_entries")
      .select(`
        id,
        grade_book_id,
        student_id,
        values,
        total_score,
        max_score,
        percentage,
        grade_label,
        result_status,
        notes,
        grade_books (
          id,
          school_id,
          subject_id,
          classroom_id,
          academic_year,
          semester,
          status,
          max_score,
          components,
          subjects (id, subject_name, subject_code)
        )
      `)
      .eq("student_id", input.studentId)
      .eq("grade_books.school_id", input.schoolId);

    if (input.academicYear) {
      query = query.eq("grade_books.academic_year", input.academicYear);
    }

    if (input.semester) {
      query = query.eq("grade_books.semester", input.semester);
    }

    const { data, error } = await query;

    if (error) throw error;

    const grades = ((data ?? []) as StudentPortalGradeEntry[])
      .map(buildSubjectGrade)
      .filter((grade) => input.includeDraft || grade.isVisibleToStudent)
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "ar"));

    return grades;
  },

  async getConductScores(input: {
    schoolId: string;
    studentId: string;
    academicYear?: string;
    semester?: string;
  }) {
    let query = supabase
      .from("student_conduct_scores")
      .select("*")
      .eq("school_id", input.schoolId)
      .eq("student_id", input.studentId);

    if (input.academicYear) {
      query = query.eq("academic_year", input.academicYear);
    }

    if (input.semester) {
      query = query.eq("semester", input.semester);
    }

    const { data, error } = await query;
    if (error) throw error;

    const scores = (data ?? []) as StudentPortalConductScore[];

    return {
      behavior: scores.find((score) => score.score_type === "behavior") ?? null,
      attendance: scores.find((score) => score.score_type === "attendance") ?? null,
    };
  },

  async getStudentDashboard(input: {
    schoolId: string;
    studentId: string;
    academicYear?: string;
    semester?: string;
    includeDraft?: boolean;
  }): Promise<StudentPortalDashboard> {
    const [grades, conduct] = await Promise.all([
      this.listStudentGrades(input),
      this.getConductScores(input),
    ]);

    const analyticsInput: GradeAnalyticsInput[] = grades.map((grade) => ({
      student_id: input.studentId,
      student_name: undefined,
      total_score: grade.totalScore,
      max_score: grade.maxScore,
      percentage: grade.percentage,
      result_status: grade.resultStatus,
      grade_label: grade.gradeLabel,
    }));

    const analytics = buildGradeAnalytics(analyticsInput);
    const summary = buildSummary({
      grades,
      analytics,
      behavior: conduct.behavior,
      attendance: conduct.attendance,
    });

    return {
      grades,
      conduct,
      analytics,
      summary,
      recommendations: buildRecommendations({
        grades,
        behaviorScore: summary.behaviorScore,
        attendanceScore: summary.attendanceScore,
      }),
    };
  },

  async getSubjectDetails(input: {
    schoolId: string;
    studentId: string;
    gradeBookId: string;
  }): Promise<StudentPortalSubjectGrade | null> {
    const { data, error } = await supabase
      .from("grade_entries")
      .select(`
        id,
        grade_book_id,
        student_id,
        values,
        total_score,
        max_score,
        percentage,
        grade_label,
        result_status,
        notes,
        grade_books (
          id,
          school_id,
          subject_id,
          classroom_id,
          academic_year,
          semester,
          status,
          max_score,
          components,
          subjects (id, subject_name, subject_code)
        )
      `)
      .eq("student_id", input.studentId)
      .eq("grade_book_id", input.gradeBookId)
      .eq("grade_books.school_id", input.schoolId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const grade = buildSubjectGrade(data as StudentPortalGradeEntry);
    return grade.isVisibleToStudent ? grade : null;
  },
};

export default GradingStudentPortal;


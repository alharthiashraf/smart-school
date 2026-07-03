import { supabase } from "@/lib/supabase";
import { buildGradeAnalytics, type GradeAnalyticsInput } from "./gradingAnalytics";
import {
  GradingStudentPortal,
  type StudentPortalConductScore,
  type StudentPortalDashboard,
  type StudentPortalSubjectGrade,
} from "./gradingStudentPortal";

export type ParentPortalStudent = {
  id: string;
  full_name?: string | null;
  student_name?: string | null;
  student_number?: string | null;
  national_id?: string | null;
  classroom_id?: string | null;
};

export type ParentChildGradeSummary = {
  student: ParentPortalStudent;
  dashboard: StudentPortalDashboard;
  riskLevel: "excellent" | "stable" | "watch" | "risk";
  riskLabel: string;
  alerts: string[];
};

export type ParentPortalDashboard = {
  children: ParentChildGradeSummary[];
  totals: {
    childrenCount: number;
    subjectsCount: number;
    averagePercentage: number;
    passRate: number;
    weakSubjectsCount: number;
    alertsCount: number;
  };
  analytics: ReturnType<typeof buildGradeAnalytics>;
  alerts: Array<{
    studentId: string;
    studentName: string;
    message: string;
    level: "info" | "warning" | "danger";
  }>;
  recommendations: string[];
};

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function studentName(student?: ParentPortalStudent | null) {
  return (
    student?.full_name ||
    student?.student_name ||
    student?.student_number ||
    "طالب غير محدد"
  );
}

function getRiskLevel(input: {
  grades: StudentPortalSubjectGrade[];
  behavior: StudentPortalConductScore | null;
  attendance: StudentPortalConductScore | null;
}) {
  const weakCount = input.grades.filter(
    (grade) => grade.percentage > 0 && grade.percentage < 60,
  ).length;

  const average =
    input.grades.length > 0
      ? input.grades.reduce((sum, grade) => sum + grade.percentage, 0) /
        input.grades.length
      : 0;

  const behaviorScore = toNumber(input.behavior?.score, 100);
  const attendanceScore = toNumber(input.attendance?.score, 100);

  if (weakCount >= 2 || average < 60 || behaviorScore < 60 || attendanceScore < 60) {
    return "risk" as const;
  }

  if (weakCount === 1 || average < 70 || behaviorScore < 75 || attendanceScore < 75) {
    return "watch" as const;
  }

  if (average >= 90 && behaviorScore >= 90 && attendanceScore >= 90) {
    return "excellent" as const;
  }

  return "stable" as const;
}

function riskLabel(level: ParentChildGradeSummary["riskLevel"]) {
  if (level === "excellent") return "متفوق";
  if (level === "stable") return "مستقر";
  if (level === "watch") return "يحتاج متابعة";
  return "متعثر";
}

function buildChildAlerts(input: {
  student: ParentPortalStudent;
  dashboard: StudentPortalDashboard;
}) {
  const alerts: string[] = [];
  const weakSubjects = input.dashboard.summary.weakSubjects;
  const behaviorScore = input.dashboard.summary.behaviorScore;
  const attendanceScore = input.dashboard.summary.attendanceScore;

  if (weakSubjects.length > 0) {
    alerts.push(
      `لدى ${studentName(input.student)} مواد تحتاج متابعة: ${weakSubjects
        .slice(0, 3)
        .map((grade) => grade.subjectName)
        .join("، ")}.`,
    );
  }

  if (behaviorScore < 75) {
    alerts.push(`درجة السلوك لدى ${studentName(input.student)} تحتاج متابعة.`);
  }

  if (attendanceScore < 75) {
    alerts.push(`درجة المواظبة لدى ${studentName(input.student)} تحتاج متابعة.`);
  }

  if (input.dashboard.grades.length === 0) {
    alerts.push(`لا توجد درجات معتمدة حاليًا للطالب ${studentName(input.student)}.`);
  }

  return alerts;
}

function buildParentRecommendations(children: ParentChildGradeSummary[]) {
  const recommendations: string[] = [];
  const riskChildren = children.filter((child) => child.riskLevel === "risk");
  const watchChildren = children.filter((child) => child.riskLevel === "watch");
  const excellentChildren = children.filter((child) => child.riskLevel === "excellent");

  if (riskChildren.length > 0) {
    recommendations.push(
      `الأولوية للمتابعة مع: ${riskChildren
        .map((child) => studentName(child.student))
        .join("، ")}.`,
    );
  }

  if (watchChildren.length > 0) {
    recommendations.push(
      `يحتاج متابعة خفيفة: ${watchChildren
        .map((child) => studentName(child.student))
        .join("، ")}.`,
    );
  }

  if (excellentChildren.length > 0) {
    recommendations.push(
      `حافظ على دعم الطلاب المتفوقين: ${excellentChildren
        .map((child) => studentName(child.student))
        .join("، ")}.`,
    );
  }

  if (recommendations.length === 0 && children.length > 0) {
    recommendations.push("وضع الأبناء مستقر، استمر في المتابعة الأسبوعية للدرجات والمواظبة.");
  }

  if (children.length === 0) {
    recommendations.push("لا يوجد أبناء مرتبطون بحساب ولي الأمر حاليًا.");
  }

  return recommendations;
}

async function getStudentsByIds(input: {
  schoolId: string;
  studentIds: string[];
}) {
  if (input.studentIds.length === 0) return new Map<string, ParentPortalStudent>();

  const { data, error } = await supabase
    .from("students")
    .select("id, full_name, student_name, student_number, national_id, classroom_id")
    .eq("school_id", input.schoolId)
    .in("id", input.studentIds);

  if (error) throw error;

  return new Map(
    ((data ?? []) as ParentPortalStudent[]).map((student) => [student.id, student]),
  );
}

export const GradingParentPortal = {
  async listChildrenGrades(input: {
    schoolId: string;
    studentIds: string[];
    academicYear?: string;
    semester?: string;
    includeDraft?: boolean;
  }) {
    if (input.studentIds.length === 0) return [];

    const dashboards = await Promise.all(
      input.studentIds.map(async (studentId) => {
        const grades = await GradingStudentPortal.listStudentGrades({
          schoolId: input.schoolId,
          studentId,
          academicYear: input.academicYear,
          semester: input.semester,
          includeDraft: input.includeDraft,
        });

        return grades.map((grade) => ({
          ...grade,
          student_id: studentId,
        }));
      }),
    );

    return dashboards.flat();
  },

  async getChildrenDashboards(input: {
    schoolId: string;
    studentIds: string[];
    academicYear?: string;
    semester?: string;
    includeDraft?: boolean;
  }): Promise<ParentChildGradeSummary[]> {
    if (input.studentIds.length === 0) return [];

    const studentsMap = await getStudentsByIds({
      schoolId: input.schoolId,
      studentIds: input.studentIds,
    });

    const children = await Promise.all(
      input.studentIds.map(async (studentId) => {
        const student =
          studentsMap.get(studentId) ??
          ({
            id: studentId,
            full_name: "طالب غير محدد",
          } satisfies ParentPortalStudent);

        const dashboard = await GradingStudentPortal.getStudentDashboard({
          schoolId: input.schoolId,
          studentId,
          academicYear: input.academicYear,
          semester: input.semester,
          includeDraft: input.includeDraft,
        });

        const riskLevel = getRiskLevel({
          grades: dashboard.grades,
          behavior: dashboard.conduct.behavior,
          attendance: dashboard.conduct.attendance,
        });

        return {
          student,
          dashboard,
          riskLevel,
          riskLabel: riskLabel(riskLevel),
          alerts: buildChildAlerts({ student, dashboard }),
        };
      }),
    );

    return children.sort((a, b) =>
      studentName(a.student).localeCompare(studentName(b.student), "ar"),
    );
  },

  async getParentDashboard(input: {
    schoolId: string;
    studentIds: string[];
    academicYear?: string;
    semester?: string;
    includeDraft?: boolean;
  }): Promise<ParentPortalDashboard> {
    const children = await this.getChildrenDashboards(input);
    const allGrades = children.flatMap((child) => child.dashboard.grades);

    const analyticsInput: GradeAnalyticsInput[] = allGrades.map((grade) => ({
      student_id: grade.id,
      student_name: grade.subjectName,
      total_score: grade.totalScore,
      max_score: grade.maxScore,
      percentage: grade.percentage,
      result_status: grade.resultStatus,
      grade_label: grade.gradeLabel,
    }));

    const analytics = buildGradeAnalytics(analyticsInput);

    const alerts = children.flatMap((child) =>
      child.alerts.map((message) => ({
        studentId: child.student.id,
        studentName: studentName(child.student),
        message,
        level:
          child.riskLevel === "risk"
            ? ("danger" as const)
            : child.riskLevel === "watch"
              ? ("warning" as const)
              : ("info" as const),
      })),
    );

    const weakSubjectsCount = children.reduce(
      (sum, child) => sum + child.dashboard.summary.weakSubjects.length,
      0,
    );

    return {
      children,
      totals: {
        childrenCount: children.length,
        subjectsCount: allGrades.length,
        averagePercentage: analytics.averagePercentage,
        passRate: analytics.passRate,
        weakSubjectsCount,
        alertsCount: alerts.length,
      },
      analytics,
      alerts,
      recommendations: buildParentRecommendations(children),
    };
  },

  async getChildDashboard(input: {
    schoolId: string;
    studentId: string;
    academicYear?: string;
    semester?: string;
    includeDraft?: boolean;
  }): Promise<ParentChildGradeSummary> {
    const [studentsMap, dashboard] = await Promise.all([
      getStudentsByIds({
        schoolId: input.schoolId,
        studentIds: [input.studentId],
      }),
      GradingStudentPortal.getStudentDashboard(input),
    ]);

    const student =
      studentsMap.get(input.studentId) ??
      ({
        id: input.studentId,
        full_name: "طالب غير محدد",
      } satisfies ParentPortalStudent);

    const riskLevel = getRiskLevel({
      grades: dashboard.grades,
      behavior: dashboard.conduct.behavior,
      attendance: dashboard.conduct.attendance,
    });

    return {
      student,
      dashboard,
      riskLevel,
      riskLabel: riskLabel(riskLevel),
      alerts: buildChildAlerts({ student, dashboard }),
    };
  },
};

export default GradingParentPortal;

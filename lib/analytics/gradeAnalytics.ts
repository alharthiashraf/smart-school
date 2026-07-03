import type { GradeRecord } from "@/types/grade";
import {
  buildGradeAnalytics,
  type GradeAnalyticsInput,
} from "@/services/gradingAnalytics";

export function getGradeAnalytics(records: GradeRecord[]) {
  const entries: GradeAnalyticsInput[] = records.map((record) => {
    const maxScore = Number(record.max_score || 100);
    const score = Number(record.score || 0);
    const percentage =
      record.percentage ??
      (maxScore > 0 ? Math.round((score / maxScore) * 100) : 0);

    return {
      student_id: record.student_id,
      student_name: undefined,
      total_score: score,
      max_score: maxScore,
      percentage,
      grade_label: record.grade_label ?? "",
      result_status:
        record.result_status ?? (percentage >= 60 ? "ناجح" : "راسب"),
    };
  });

  const analytics = buildGradeAnalytics(entries);

  return {
    total: analytics.total,
    average: Math.round(analytics.averagePercentage),
    highest: analytics.highest?.percentage ?? 0,
    lowest: analytics.lowest?.percentage ?? 0,
    passed: analytics.passed,
    failed: analytics.failed,
    passRate: Math.round(analytics.passRate),
    excellent: analytics.excellent,
    weak: analytics.weak,
    distribution: analytics.distribution,
    medianPercentage: analytics.medianPercentage,
    standardDeviation: analytics.standardDeviation,
    ranked: analytics.ranked,
    weakStudents: analytics.weakStudents,
    watchStudents: analytics.watchStudents,
  };
}
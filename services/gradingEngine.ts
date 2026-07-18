import { clampScore, toNumber, type GradeComponent, type GradeValueMap } from "./gradingValidation";

export type GradeLabel = "ممتاز" | "جيد جدًا" | "جيد" | "مقبول" | "ضعيف";
export type ResultStatus = "ناجح" | "راسب" | "غير مكتمل";

export type GradeCalculationResult = {
  total: number;
  maxTotal: number;
  percentage: number;
  grade_label: GradeLabel;
  result_status: ResultStatus;
  missing_required: string[];
  normalized_values: Record<string, number>;
};

export function getGradeLabel(percentage: number): GradeLabel {
  if (percentage >= 90) return "ممتاز";
  if (percentage >= 80) return "جيد جدًا";
  if (percentage >= 70) return "جيد";
  if (percentage >= 50) return "مقبول";
  return "ضعيف";
}

export function getResultStatus(percentage: number, missingRequired: string[]): ResultStatus {
  if (missingRequired.length > 0) return "غير مكتمل";
  return percentage >= 50 ? "ناجح" : "راسب";
}

export function calculateGrade(input: {
  components: GradeComponent[];
  values: GradeValueMap;
}): GradeCalculationResult {
  const normalized: Record<string, number> = {};
  const missingRequired: string[] = [];

  let total = 0;
  let maxTotal = 0;

  for (const component of input.components) {
    const maxScore = Number(component.max_score || 0);
    if (maxScore <= 0) continue;

    const value = toNumber(input.values[component.key]);

    maxTotal += maxScore;

    if (value === null) {
      normalized[component.key] = 0;
      if (component.is_required) missingRequired.push(component.key);
      continue;
    }

    const safeValue = clampScore(value, 0, maxScore);
    normalized[component.key] = safeValue;
    total += safeValue;
  }

  const percentage = maxTotal > 0 ? Number(((total / maxTotal) * 100).toFixed(2)) : 0;

  return {
    total: Number(total.toFixed(2)),
    maxTotal,
    percentage,
    grade_label: getGradeLabel(percentage),
    result_status: getResultStatus(percentage, missingRequired),
    missing_required: missingRequired,
    normalized_values: normalized,
  };
}

export function calculateClassAverage(entries: Array<{ total_score?: number | null; percentage?: number | null }>) {
  if (entries.length === 0) return { averageTotal: 0, averagePercentage: 0 };
  const total = entries.reduce((sum, item) => sum + Number(item.total_score || 0), 0);
  const percentage = entries.reduce((sum, item) => sum + Number(item.percentage || 0), 0);
  return {
    averageTotal: Number((total / entries.length).toFixed(2)),
    averagePercentage: Number((percentage / entries.length).toFixed(2)),
  };
}


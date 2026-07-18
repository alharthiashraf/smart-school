export type GradeAnalyticsInput = {
  student_id: string;
  student_name?: string | null;
  total_score: number;
  max_score?: number;
  percentage: number;
  result_status: string;
  grade_label: string;
};

export type GradeRiskLevel = "excellent" | "stable" | "watch" | "risk";

export function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function median(values: number[]) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return round((sorted[middle - 1] + sorted[middle]) / 2);
  }

  return round(sorted[middle]);
}

function standardDeviation(values: number[]) {
  if (values.length === 0) return 0;

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;

  return round(Math.sqrt(variance));
}

function getRiskLevel(percentage: number): GradeRiskLevel {
  if (percentage >= 90) return "excellent";
  if (percentage >= 70) return "stable";
  if (percentage >= 60) return "watch";
  return "risk";
}

function getRiskLabel(level: GradeRiskLevel) {
  if (level === "excellent") return "متفوق";
  if (level === "stable") return "مستقر";
  if (level === "watch") return "يحتاج متابعة";
  return "متعثر";
}

export function buildGradeAnalytics(entries: GradeAnalyticsInput[]) {
  const total = entries.length;
  const percentages = entries.map((item) => Number(item.percentage || 0));
  const scores = entries.map((item) => Number(item.total_score || 0));

  const passed = entries.filter((item) => item.result_status === "ناجح").length;
  const failed = entries.filter((item) => item.result_status === "راسب").length;

  const averagePercentage =
    total > 0
      ? round(percentages.reduce((sum, value) => sum + value, 0) / total)
      : 0;

  const averageScore =
    total > 0 ? round(scores.reduce((sum, value) => sum + value, 0) / total) : 0;

  const highest =
    entries.reduce<GradeAnalyticsInput | null>(
      (best, item) => (!best || item.percentage > best.percentage ? item : best),
      null,
    ) ?? null;

  const lowest =
    entries.reduce<GradeAnalyticsInput | null>(
      (worst, item) =>
        !worst || item.percentage < worst.percentage ? item : worst,
      null,
    ) ?? null;

  const distribution = {
    excellent: entries.filter((item) => item.percentage >= 90).length,
    veryGood: entries.filter(
      (item) => item.percentage >= 80 && item.percentage < 90,
    ).length,
    good: entries.filter(
      (item) => item.percentage >= 70 && item.percentage < 80,
    ).length,
    acceptable: entries.filter(
      (item) => item.percentage >= 60 && item.percentage < 70,
    ).length,
    weak: entries.filter((item) => item.percentage < 60).length,
  };

  const riskGroups = {
    excellent: entries.filter((item) => getRiskLevel(item.percentage) === "excellent"),
    stable: entries.filter((item) => getRiskLevel(item.percentage) === "stable"),
    watch: entries.filter((item) => getRiskLevel(item.percentage) === "watch"),
    risk: entries.filter((item) => getRiskLevel(item.percentage) === "risk"),
  };

  const ranked = [...entries]
    .sort((a, b) => b.percentage - a.percentage)
    .map((item, index) => {
      const riskLevel = getRiskLevel(item.percentage);

      return {
        ...item,
        rank: index + 1,
        risk_level: riskLevel,
        risk_label: getRiskLabel(riskLevel),
      };
    });

  return {
    total,
    passed,
    failed,

    passRate: total > 0 ? round((passed / total) * 100) : 0,
    failRate: total > 0 ? round((failed / total) * 100) : 0,

    averagePercentage,
    averageScore,
    medianPercentage: median(percentages),
    standardDeviation: standardDeviation(percentages),

    highest,
    lowest,

    excellent: distribution.excellent,
    weak: distribution.weak,

    distribution,

    risk: {
      excellent: riskGroups.excellent.length,
      stable: riskGroups.stable.length,
      watch: riskGroups.watch.length,
      risk: riskGroups.risk.length,
    },

    topStudents: ranked.slice(0, 10),
    weakStudents: ranked
      .filter((item) => item.percentage < 60)
      .sort((a, b) => a.percentage - b.percentage),

    watchStudents: ranked.filter(
      (item) => item.percentage >= 60 && item.percentage < 70,
    ),

    ranked,
  };
}

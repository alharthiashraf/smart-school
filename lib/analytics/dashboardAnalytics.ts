import type { DashboardStats } from "@/types/dashboard";

export function getDashboardAnalytics(stats: DashboardStats) {
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round((stats.attendanceRate + stats.averageGrade) / 2) -
        stats.openAlerts * 2,
    ),
  );

  const risks: string[] = [];
  const strengths: string[] = [];

  if (stats.attendanceRate >= 90) {
    strengths.push("الحضور مستقر.");
  } else {
    risks.push("الحضور يحتاج متابعة.");
  }

  if (stats.averageGrade >= 80) {
    strengths.push("متوسط التحصيل جيد.");
  } else {
    risks.push("متوسط التحصيل يحتاج تحسين.");
  }

  if (stats.openAlerts > 0) {
    risks.push("توجد تنبيهات مفتوحة.");
  }

  return {
    healthScore,
    strengths,
    risks,
    level:
      healthScore >= 85 ? "مرتفع" : healthScore >= 65 ? "متوسط" : "منخفض",
  };
}

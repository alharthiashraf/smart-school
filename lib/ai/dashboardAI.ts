export type DashboardMetrics = {
  attendanceRate?: number;
  averageGrade?: number;
  openAlerts?: number;
  studentsCount?: number;
  teachersCount?: number;
};

export function analyzeDashboard(metrics: DashboardMetrics) {
  const attendanceRate = metrics.attendanceRate ?? 0;
  const averageGrade = metrics.averageGrade ?? 0;
  const openAlerts = metrics.openAlerts ?? 0;

  const insights: string[] = [];
  const risks: string[] = [];
  const recommendations: string[] = [];

  if (attendanceRate < 85) {
    risks.push("انخفاض مؤشر الحضور.");
    recommendations.push("تحليل الغياب المتكرر والتواصل مع أولياء الأمور.");
  } else {
    insights.push("مؤشر الحضور ضمن المستوى المقبول.");
  }

  if (averageGrade < 70) {
    risks.push("انخفاض متوسط التحصيل.");
    recommendations.push("تفعيل خطة علاجية للمواد أو الفصول الأقل أداءً.");
  } else {
    insights.push("متوسط التحصيل مستقر نسبيًا.");
  }

  if (openAlerts > 0) {
    risks.push("وجود تنبيهات مفتوحة.");
    recommendations.push("إغلاق التنبيهات حسب الأولوية.");
  }

  if (!insights.length && !risks.length) {
    insights.push("المؤشرات العامة مستقرة ولا توجد مخاطر بارزة حاليًا.");
  }

  const healthScore = Math.max(
    0,
    Math.min(100, Math.round((attendanceRate + averageGrade) / 2) - openAlerts * 2),
  );

  return {
    healthScore,
    insights,
    risks,
    recommendations,
    summary:
      healthScore >= 85
        ? "الوضع العام للمدرسة مستقر وقوي."
        : healthScore >= 65
          ? "الوضع العام متوسط ويحتاج متابعة لبعض المؤشرات."
          : "الوضع العام يحتاج إلى تدخل إداري وتحسيني عاجل.",
  };
}
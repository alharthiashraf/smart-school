export type BehaviorInput = {
  studentName?: string;
  type: string;
  severity?: "low" | "medium" | "high" | string;
};

export function analyzeBehavior(rows: BehaviorInput[]) {
  const total = rows.length;
  const high = rows.filter((row) => row.severity === "high").length;
  const medium = rows.filter((row) => row.severity === "medium").length;
  const low = rows.filter((row) => row.severity === "low").length;

  const riskLevel = high > 0 ? "مرتفع" : medium >= 3 ? "متوسط" : "منخفض";

  const repeatedTypes = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.type] = (acc[row.type] || 0) + 1;
    return acc;
  }, {});

  return {
    total,
    high,
    medium,
    low,
    riskLevel,
    repeatedTypes,
    summary:
      riskLevel === "مرتفع"
        ? "توجد حالات سلوكية عالية الخطورة تستدعي تدخلًا عاجلًا."
        : riskLevel === "متوسط"
          ? "توجد مؤشرات سلوكية متكررة تحتاج متابعة إرشادية."
          : "الوضع السلوكي مستقر مع أهمية الاستمرار في الوقاية والتعزيز.",
    recommendations:
      riskLevel === "مرتفع"
        ? [
            "فتح خطة تدخل فردية للحالات العالية.",
            "إشراك الموجه الطلابي وولي الأمر.",
            "توثيق التدخلات والنتائج.",
          ]
        : [
            "تعزيز السلوك الإيجابي.",
            "متابعة الحالات المتكررة.",
            "تنفيذ برامج وقائية قصيرة.",
          ],
  };
}

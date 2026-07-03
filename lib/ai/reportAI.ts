export function buildExecutiveSummary({
  title,
  highlights,
  risks,
  recommendations,
}: {
  title: string;
  highlights: string[];
  risks: string[];
  recommendations: string[];
}) {
  return {
    title,
    summary: [
      `يعرض هذا التقرير ملخصًا تنفيذيًا حول ${title}.`,
      highlights.length
        ? `أبرز نقاط القوة: ${highlights.join("، ")}.`
        : "لا توجد نقاط قوة محددة.",
      risks.length
        ? `أبرز المخاطر: ${risks.join("، ")}.`
        : "لا توجد مخاطر عالية واضحة.",
      recommendations.length
        ? `التوصيات: ${recommendations.join("، ")}.`
        : "يوصى بالاستمرار في المتابعة الدورية.",
    ].join(" "),
  };
}

export function buildActionPlan(items: string[]) {
  return items.map((item, index) => ({
    id: index + 1,
    action: item,
    owner: "غير متوفر",
    dueDate: "غير متوفر",
    evidence: "غير متوفر",
    status: "بانتظار",
  }));
}
export type GradeInput = {
  studentName: string;
  score: number;
  maxScore: number;
  subjectName?: string;
};

export function analyzeGrades(rows: GradeInput[]) {
  const total = rows.length;

  const enriched = rows.map((row) => {
    const percentage = row.maxScore > 0 ? Math.round((row.score / row.maxScore) * 100) : 0;

    return {
      ...row,
      percentage,
      level:
        percentage >= 90
          ? "ممتاز"
          : percentage >= 80
            ? "جيد جدًا"
            : percentage >= 70
              ? "جيد"
              : percentage >= 60
                ? "مقبول"
                : "يحتاج متابعة",
      result: percentage >= 50 ? "ناجح" : "متعثر",
    };
  });

  const average = total
    ? Math.round(enriched.reduce((sum, row) => sum + row.percentage, 0) / total)
    : 0;

  const passed = enriched.filter((row) => row.result === "ناجح").length;
  const failed = total - passed;
  const excellent = enriched.filter((row) => row.percentage >= 90).length;
  const weak = enriched.filter((row) => row.percentage < 60);

  return {
    total,
    average,
    passed,
    failed,
    passRate: total ? Math.round((passed / total) * 100) : 0,
    excellent,
    weakCount: weak.length,
    weakStudents: weak.map((row) => row.studentName),
    topStudents: [...enriched]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5),
    lowStudents: [...enriched]
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 5),
    distribution: {
      excellent: enriched.filter((row) => row.percentage >= 90).length,
      veryGood: enriched.filter((row) => row.percentage >= 80 && row.percentage < 90).length,
      good: enriched.filter((row) => row.percentage >= 70 && row.percentage < 80).length,
      acceptable: enriched.filter((row) => row.percentage >= 60 && row.percentage < 70).length,
      weak: enriched.filter((row) => row.percentage < 60).length,
    },
    summary:
      average >= 80
        ? "مستوى التحصيل جيد جدًا، مع ضرورة الحفاظ على برامج الإثراء والمتابعة."
        : average >= 60
          ? "مستوى التحصيل متوسط ويحتاج إلى خطة علاجية للفئات الأقل أداءً."
          : "مستوى التحصيل منخفض ويحتاج إلى تدخل عاجل وخطة معالجة واضحة.",
    recommendations:
      average >= 80
        ? [
            "تنفيذ أنشطة إثرائية للطلاب المتفوقين.",
            "متابعة الطلاب القريبين من الانخفاض.",
            "تحليل أسئلة الاختبارات لتحديد فرص التحسين.",
          ]
        : [
            "إعداد خطة علاجية للطلاب منخفضي الأداء.",
            "تحليل المهارات غير المتقنة.",
            "تنفيذ قياس قبلي وبعدي لقياس أثر المعالجة.",
          ],
  };
}

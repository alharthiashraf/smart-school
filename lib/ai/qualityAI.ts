export function analyzeQualityScore(score: number) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  if (safeScore >= 85) {
    return {
      score: safeScore,
      level: "مرتفع",
      summary: "مستوى الجودة مرتفع ويعكس جاهزية جيدة للتقييم.",
      recommendation: "المحافظة على مستوى الشواهد وتحديثها دوريًا.",
    };
  }

  if (safeScore >= 60) {
    return {
      score: safeScore,
      level: "متوسط",
      summary: "مستوى الجودة متوسط ويحتاج إلى إغلاق بعض الفجوات.",
      recommendation: "تعزيز الأثر والتوثيق وربط الشواهد بالمؤشرات.",
    };
  }

  return {
    score: safeScore,
    level: "منخفض",
    summary: "مستوى الجودة منخفض ويحتاج إلى تدخل عاجل.",
    recommendation: "بناء خطة تحسين مركزة ومراجعة جميع الشواهد قبل الرفع.",
  };
}
export type EvidenceStrength = "قوي" | "متوسط" | "ضعيف";
export type EvidenceReadiness = "منخفض" | "متوسط" | "مرتفع";
export type EvidenceUploadStatus = "نعم" | "يحتاج تحسين" | "لا";

export type EvidenceInput = {
  id: string;
  name: string;
  type: string;
  proves?: string | null;
  impact?: string | null;
  notes?: string | null;
  hasDate?: boolean;
  hasOwner?: boolean;
  hasResult?: boolean;
  hasSignature?: boolean;
  hasVisualProof?: boolean;
};

export type EvidenceAuditRow = EvidenceInput & {
  score: number;
  strength: EvidenceStrength;
  uploadStatus: EvidenceUploadStatus;
  reason: string;
  aiAdvice: string;
};

export type EvidenceAnalysisResult = {
  rows: EvidenceAuditRow[];
  readiness: EvidenceReadiness;
  averageScore: number;
  strongestEvidence: EvidenceAuditRow[];
  weakEvidence: string[];
  missingEvidence: string[];
  betterDocumentation: string[];
  unclearData: string[];
  executiveSummary: string;
  evaluatorQuestions: string[];
  urgentImprovements: string[];
  actionPlan: {
    add: string;
    owner: string;
    date: string;
    document: string;
    acceptance: string;
  }[];
};

function textLength(value?: string | null) {
  return value?.trim().length ?? 0;
}

function hasText(value?: string | null) {
  return textLength(value) > 0;
}

export function scoreEvidence(item: EvidenceInput): EvidenceAuditRow {
  let score = 0;

  const nameLength = textLength(item.name);
  const provesLength = textLength(item.proves);
  const impactLength = textLength(item.impact);

  if (nameLength >= 4) score += 10;
  if (provesLength >= 8) score += 20;
  if (impactLength >= 8) score += 25;
  if (item.hasDate === true) score += 10;
  if (item.hasOwner === true) score += 10;
  if (item.hasResult === true) score += 15;
  if (item.hasSignature === true) score += 5;
  if (item.hasVisualProof === true) score += 5;

  const missing: string[] = [];

  if (!hasText(item.name)) missing.push("اسم الشاهد غير واضح");
  if (!hasText(item.proves)) missing.push("لا يوضح ماذا يثبت");
  if (!hasText(item.impact)) missing.push("لا يوضح الأثر");
  if (item.hasDate !== true) missing.push("لا يحتوي تاريخًا واضحًا");
  if (item.hasOwner !== true) missing.push("لا يحدد المسؤول");
  if (item.hasResult !== true) missing.push("لا يثبت نتيجة أو أثرًا");
  if (item.hasSignature !== true) missing.push("لا يحتوي اعتمادًا عند الحاجة");
  if (item.hasVisualProof !== true) missing.push("لا يحتوي توثيقًا بصريًا");

  const strength: EvidenceStrength =
    score >= 75 ? "قوي" : score >= 45 ? "متوسط" : "ضعيف";

  const uploadStatus: EvidenceUploadStatus =
    score >= 75 ? "نعم" : score >= 45 ? "يحتاج تحسين" : "لا";

  const reason =
    strength === "قوي"
      ? "الشاهد واضح، موثق، ويربط بين الإجراء والأثر المتوقع."
      : strength === "متوسط"
        ? `الشاهد مقبول مبدئيًا لكنه يحتاج تحسينًا: ${
            missing.slice(0, 2).join("، ") || "استكمال عناصر التوثيق"
          }.`
        : `الشاهد ضعيف أو شكلي: ${
            missing.slice(0, 3).join("، ") || "لا يثبت أثرًا واضحًا"
          }.`;

  const aiAdvice =
    strength === "قوي"
      ? "يحافظ على قوته عند إرفاقه مع تاريخ واضح، مصدر بيانات، ومؤشر أثر مختصر."
      : strength === "متوسط"
        ? "اجعله شاهدًا قويًا بإضافة نتيجة قابلة للقياس وربطه بالمؤشر المستهدف."
        : "لا يفضل رفعه بصورته الحالية؛ يحتاج استكمال البيانات والأثر والتوثيق.";

  return {
    ...item,
    score,
    strength,
    uploadStatus,
    reason,
    aiAdvice,
  };
}

export function getEvidenceReadiness(score: number): EvidenceReadiness {
  if (score >= 75) return "مرتفع";
  if (score >= 45) return "متوسط";
  return "منخفض";
}

export function analyzeEvidence(params: {
  items: EvidenceInput[];
  schoolName?: string;
  domain?: string;
  category?: string;
  academicYear?: string;
  preparedBy?: string;
  principal?: string;
}): EvidenceAnalysisResult {
  const rows = params.items.map(scoreEvidence);

  const averageScore =
    rows.length > 0
      ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length)
      : 0;

  const readiness = getEvidenceReadiness(averageScore);

  const strong = rows.filter((row) => row.strength === "قوي");
  const medium = rows.filter((row) => row.strength === "متوسط");
  const weak = rows.filter((row) => row.strength === "ضعيف");

  const missingEvidence = new Set<string>();
  const betterDocumentation = new Set<string>();
  const unclearData = new Set<string>();

  if (!hasText(params.schoolName)) unclearData.add("اسم المدرسة غير متوفر.");
  if (!hasText(params.academicYear)) unclearData.add("العام الدراسي غير متوفر.");

  if (!hasText(params.domain) || params.domain === "غير متوفر") {
    unclearData.add("المجال أو المؤشر غير محدد.");
  }

  if (!hasText(params.category) || params.category === "غير متوفر") {
    unclearData.add("الفئة غير محددة.");
  }

  if (rows.length === 0) {
    missingEvidence.add("لا توجد شواهد مدخلة للفحص.");
    missingEvidence.add("يجب إضافة شواهد متنوعة تثبت الإجراء والأثر.");
  }

  rows.forEach((row) => {
    const rowName = hasText(row.name) ? row.name : "غير مسمى";

    if (row.hasResult !== true) {
      missingEvidence.add("إضافة شواهد تثبت الأثر أو النتيجة بعد التنفيذ.");
      betterDocumentation.add("إرفاق مقارنة قبلية وبعدية أو مؤشر تحسن رقمي.");
    }

    if (row.hasDate !== true) {
      missingEvidence.add("إضافة تاريخ واضح لكل شاهد.");
    }

    if (row.hasOwner !== true) {
      missingEvidence.add("تحديد المسؤول عن تنفيذ أو متابعة الشاهد.");
    }

    if (row.hasSignature !== true) {
      betterDocumentation.add("إضافة اعتماد رسمي أو توقيع أو ختم عند الحاجة.");
    }

    if (row.hasVisualProof !== true) {
      betterDocumentation.add("إرفاق صورة أو لقطة شاشة داعمة للشاهد.");
    }

    if (!hasText(row.proves)) {
      unclearData.add(`الشاهد "${rowName}" لا يوضح ماذا يثبت.`);
    }

    if (!hasText(row.impact)) {
      unclearData.add(`الشاهد "${rowName}" لا يوضح الأثر.`);
    }
  });

  return {
    rows,
    readiness,
    averageScore,
    strongestEvidence: [...strong]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
    weakEvidence:
      weak.length > 0
        ? weak.map((row) => (hasText(row.name) ? row.name : "شاهد غير مسمى"))
        : ["غير متوفر"],
    missingEvidence: Array.from(missingEvidence).slice(0, 6),
    betterDocumentation: Array.from(betterDocumentation).slice(0, 6),
    unclearData: Array.from(unclearData).slice(0, 6),
    executiveSummary:
      rows.length > 0
        ? `يعكس الملف مستوى جاهزية ${readiness} بنسبة ${averageScore}%. يحتوي على ${strong.length} شواهد قوية، و${medium.length} شواهد متوسطة، و${weak.length} شواهد ضعيفة. يحتاج الملف إلى تعزيز الأثر، وضبط التوثيق، وربط كل شاهد بالمؤشر قبل الرفع النهائي.`
        : "الملف غير جاهز للفحص؛ لا توجد شواهد مدخلة. يلزم إضافة شواهد موثقة مرتبطة بالمؤشر وتثبت الأثر.",
    evaluatorQuestions: [
      "ما الأثر الذي تحقق بعد تنفيذ هذا الإجراء؟",
      "كيف تم اختيار الفئة المستهدفة أو الطلاب المستفيدين؟",
      "هل توجد مقارنة قبلية وبعدية تثبت التحسن؟",
      "ما مصدر البيانات المستخدمة في قياس الأثر؟",
      "من المسؤول عن التنفيذ والمتابعة؟",
      "هل الشاهد معتمد بتاريخ وتوقيع أو مصدر واضح؟",
    ],
    urgentImprovements: [
      "إضافة أثر رقمي أو نتيجة قابلة للقياس لكل شاهد.",
      "إرفاق تاريخ التنفيذ واسم المسؤول في جميع الشواهد.",
      "تحويل الصور المنفردة إلى شاهد مكتمل: صورة + وصف + مستفيدون + نتيجة.",
      "ربط كل شاهد بالمجال أو المؤشر المستهدف بوضوح.",
      "إضافة اعتماد رسمي أو محضر أو تقرير ختامي للشواهد المهمة.",
    ],
    actionPlan: [
      {
        add: "تقرير أثر مختصر",
        owner: params.principal || "مدير المدرسة / مسؤول الجودة",
        date: "خلال أسبوع",
        document: "نموذج تقرير يتضمن قبل/بعد ونسبة التحسن",
        acceptance: "وجود نتيجة رقمية واضحة ومصدر بيانات",
      },
      {
        add: "محضر اعتماد الشواهد",
        owner: "لجنة الجودة",
        date: "قبل الرفع",
        document: "محضر اجتماع موقع ومعتمد",
        acceptance: "تاريخ + حضور + توصيات + توقيع",
      },
      {
        add: "مربعات توثيق بصري",
        owner: "منسق المجال",
        date: "فوري",
        document: "لقطات شاشة أو صور منظمة مع وصف",
        acceptance: "الصورة مرتبطة بإجراء وأثر",
      },
    ],
  };
}

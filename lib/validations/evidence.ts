type EvidenceLike = {
  name?: string;
  type?: string;
  proves?: string;
  impact?: string;
  hasDate?: boolean;
  hasOwner?: boolean;
  hasResult?: boolean;
  hasSignature?: boolean;
  hasVisualProof?: boolean;
};

export function validateEvidence(item: EvidenceLike) {
  const errors: string[] = [];

  if (!item.name?.trim()) errors.push("اسم الشاهد غير مكتمل.");
  if (!item.type?.trim()) errors.push("نوع الشاهد غير محدد.");
  if (!item.proves?.trim()) errors.push("لم يتم توضيح ما يثبته الشاهد.");
  if (!item.hasDate) errors.push("ينقص الشاهد تاريخ واضح.");
  if (!item.hasOwner) errors.push("ينقص الشاهد مسؤول/مالك واضح.");

  if ((item.type === "تقرير" || item.type === "ملف Excel") && !item.hasResult && !item.impact?.trim()) {
    errors.push("ينقص الشاهد أثر أو نتيجة قابلة للقياس.");
  }

  if (item.type === "محضر" && !item.hasSignature) {
    errors.push("المحضر يحتاج توقيع أو اعتماد.");
  }

  if (item.type === "صورة" && !item.hasVisualProof) {
    errors.push("الصورة تحتاج دلالة بصرية واضحة.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


export type GradeBookStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "locked"
  | "reopened";

export type GradeWorkflowAction = "save" | "submit" | "approve" | "lock" | "reopen" | "import";

export type GradeComponent = {
  key: string;
  name: string;
  max_score: number;
  is_required?: boolean;
};

export type GradeValueMap = Record<string, number | null | undefined>;

export type GradeValidationIssue = {
  field: string;
  message: string;
  level: "error" | "warning";
};

export type GradeEntryValidationInput = {
  student_id?: string | null;
  values: GradeValueMap;
  total_score?: number | null;
  max_score?: number | null;
  percentage?: number | null;
  components: GradeComponent[];
};

export type GradeBookValidationInput = {
  action: GradeWorkflowAction;
  status?: GradeBookStatus | null;
  components: GradeComponent[];
  entries: GradeEntryValidationInput[];
  expectedStudentCount?: number;
};

export type ConductScoreValidationInput = {
  score: unknown;
  maxScore?: number;
  minScore?: number;
  field?: string;
};

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    const normalized = value
      .trim()
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .replace(",", ".");

    if (normalized === "") return null;

    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function roundScore(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function clampScore(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function hasBlockingIssues(issues: GradeValidationIssue[]) {
  return issues.some((issue) => issue.level === "error");
}

export function getBlockingIssues(issues: GradeValidationIssue[]) {
  return issues.filter((issue) => issue.level === "error");
}

export function getWarningIssues(issues: GradeValidationIssue[]) {
  return issues.filter((issue) => issue.level === "warning");
}

export function sumComponents(components: GradeComponent[]) {
  return roundScore(
    components.reduce((sum, component) => sum + Number(component.max_score || 0), 0),
  );
}

export function calculateEntryTotals(input: {
  components: GradeComponent[];
  values: GradeValueMap;
}) {
  const maxScore = sumComponents(input.components);

  const totalScore = roundScore(
    input.components.reduce((sum, component) => {
      const value = toNumber(input.values[component.key]);
      return sum + (value ?? 0);
    }, 0),
  );

  const percentage =
    maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  let gradeLabel = "ضعيف";
  if (percentage >= 90) gradeLabel = "ممتاز";
  else if (percentage >= 80) gradeLabel = "جيد جدًا";
  else if (percentage >= 70) gradeLabel = "جيد";
  else if (percentage >= 60) gradeLabel = "مقبول";

  const requiredMissing = input.components.some(
    (component) =>
      component.is_required &&
      (input.values[component.key] === null ||
        input.values[component.key] === undefined),
  );

  const resultStatus = requiredMissing
    ? "غير مكتمل"
    : percentage >= 60
      ? "ناجح"
      : "راسب";

  return {
    total_score: totalScore,
    max_score: maxScore,
    percentage,
    grade_label: gradeLabel,
    result_status: resultStatus,
  };
}

export function validateGradeValue(input: {
  field: string;
  label?: string;
  value: unknown;
  maxScore: number;
  minScore?: number;
  required?: boolean;
}): GradeValidationIssue[] {
  const issues: GradeValidationIssue[] = [];
  const label = input.label ?? input.field;
  const minScore = input.minScore ?? 0;
  const value = toNumber(input.value);

  if (input.required && value === null) {
    issues.push({
      field: input.field,
      message: `${label} مطلوب.`,
      level: "error",
    });
    return issues;
  }

  if (value === null) return issues;

  if (value < minScore) {
    issues.push({
      field: input.field,
      message: `${label} لا يمكن أن يكون أقل من ${minScore}.`,
      level: "error",
    });
  }

  if (value > input.maxScore) {
    issues.push({
      field: input.field,
      message: `${label} لا يمكن أن يتجاوز ${input.maxScore}.`,
      level: "error",
    });
  }

  if (value % 0.25 !== 0) {
    issues.push({
      field: input.field,
      message: `${label} يفضل أن يكون بربع درجة مثل 0.25 أو 0.5.`,
      level: "warning",
    });
  }

  return issues;
}

export function validateComponents(components: GradeComponent[]) {
  const issues: GradeValidationIssue[] = [];

  if (components.length === 0) {
    issues.push({
      field: "components",
      message: "لا توجد مكونات درجات مهيأة.",
      level: "error",
    });
    return issues;
  }

  const seenKeys = new Set<string>();

  for (const component of components) {
    if (!component.key?.trim()) {
      issues.push({
        field: "components",
        message: "يوجد مكون بدون مفتاح.",
        level: "error",
      });
    }

    if (seenKeys.has(component.key)) {
      issues.push({
        field: component.key,
        message: `مفتاح المكون ${component.key} مكرر.`,
        level: "error",
      });
    }

    seenKeys.add(component.key);

    if (!component.name?.trim()) {
      issues.push({
        field: component.key,
        message: "يوجد مكون بدون اسم.",
        level: "error",
      });
    }

    if (!Number.isFinite(Number(component.max_score)) || component.max_score <= 0) {
      issues.push({
        field: component.key,
        message: `النهاية العظمى للمكون ${component.name || component.key} غير صحيحة.`,
        level: "error",
      });
    }
  }

  const total = sumComponents(components);

  if (total > 100) {
    issues.push({
      field: "components",
      message: `مجموع مكونات الدرجات ${total} ويتجاوز 100.`,
      level: "error",
    });
  }

  if (total < 100) {
    issues.push({
      field: "components",
      message: `مجموع مكونات الدرجات ${total} أقل من 100. تأكد أن هذا مقصود.`,
      level: "warning",
    });
  }

  return issues;
}

export function validateGradeEntry(input: GradeEntryValidationInput): GradeValidationIssue[] {
  const issues: GradeValidationIssue[] = [];

  issues.push(...validateComponents(input.components));

  for (const component of input.components) {
    issues.push(
      ...validateGradeValue({
        field: component.key,
        label: component.name,
        value: input.values[component.key],
        maxScore: component.max_score,
        required: component.is_required,
      }),
    );
  }

  const calculated = calculateEntryTotals({
    components: input.components,
    values: input.values,
  });

  const suppliedTotal = toNumber(input.total_score);
  const suppliedMax = toNumber(input.max_score);
  const suppliedPercentage = toNumber(input.percentage);

  if (suppliedTotal !== null && Math.abs(suppliedTotal - calculated.total_score) > 0.01) {
    issues.push({
      field: "total_score",
      message: `المجموع المحفوظ لا يطابق مجموع المكونات. الصحيح ${calculated.total_score}.`,
      level: "error",
    });
  }

  if (suppliedMax !== null && Math.abs(suppliedMax - calculated.max_score) > 0.01) {
    issues.push({
      field: "max_score",
      message: `النهاية المحفوظة لا تطابق مجموع المكونات. الصحيح ${calculated.max_score}.`,
      level: "error",
    });
  }

  if (
    suppliedPercentage !== null &&
    Math.abs(suppliedPercentage - calculated.percentage) > 1
  ) {
    issues.push({
      field: "percentage",
      message: `النسبة المحفوظة لا تطابق الحساب الفعلي. الصحيح ${calculated.percentage}%.`,
      level: "warning",
    });
  }

  return issues;
}

export function validateConductScore(input: ConductScoreValidationInput): GradeValidationIssue[] {
  const maxScore = input.maxScore ?? 100;
  const minScore = input.minScore ?? 0;

  return validateGradeValue({
    field: input.field ?? "conduct_score",
    label: input.field ?? "درجة السلوك/المواظبة",
    value: input.score,
    minScore,
    maxScore,
    required: true,
  });
}

export function isBookEditable(status?: GradeBookStatus | null) {
  return status === "draft" || status === "reopened";
}

export function isBookSubmittable(status?: GradeBookStatus | null) {
  return status === "draft" || status === "reopened";
}

export function isBookApprovable(status?: GradeBookStatus | null) {
  return status === "submitted";
}

export function isBookLockable(status?: GradeBookStatus | null) {
  return status === "approved";
}

export function canSaveGradeBook(status?: GradeBookStatus | null) {
  return isBookEditable(status);
}

export function validateBookStatusForAction(input: {
  status?: GradeBookStatus | null;
  action: GradeWorkflowAction;
}): GradeValidationIssue[] {
  const status = input.status ?? "draft";

  if (input.action === "save" || input.action === "import") {
    if (!canSaveGradeBook(status)) {
      return [
        {
          field: "status",
          message: "لا يمكن تعديل أو حفظ درجات سجل غير قابل للتحرير.",
          level: "error",
        },
      ];
    }
  }

  if (input.action === "submit" && !isBookSubmittable(status)) {
    return [
      {
        field: "status",
        message: "لا يمكن رفع السجل للاعتماد إلا من حالة مسودة أو معاد فتحه.",
        level: "error",
      },
    ];
  }

  if (input.action === "approve" && !isBookApprovable(status)) {
    return [
      {
        field: "status",
        message: "لا يمكن اعتماد السجل إلا بعد رفعه للاعتماد.",
        level: "error",
      },
    ];
  }

  if (input.action === "lock" && !isBookLockable(status)) {
    return [
      {
        field: "status",
        message: "لا يمكن إقفال السجل إلا بعد اعتماده.",
        level: "error",
      },
    ];
  }

  if (input.action === "reopen" && status === "draft") {
    return [
      {
        field: "status",
        message: "السجل في حالة مسودة ولا يحتاج إلى إعادة فتح.",
        level: "warning",
      },
    ];
  }

  return [];
}

export function validateGradeBookForAction(
  input: GradeBookValidationInput,
): GradeValidationIssue[] {
  const issues: GradeValidationIssue[] = [];

  issues.push(
    ...validateBookStatusForAction({
      status: input.status,
      action: input.action,
    }),
  );

  issues.push(...validateComponents(input.components));

  if (input.expectedStudentCount !== undefined) {
    if (input.entries.length < input.expectedStudentCount) {
      issues.push({
        field: "entries",
        message: `عدد سجلات الدرجات ${input.entries.length} أقل من عدد الطلاب ${input.expectedStudentCount}.`,
        level: input.action === "submit" || input.action === "approve" || input.action === "lock"
          ? "error"
          : "warning",
      });
    }
  }

  if (
    (input.action === "submit" ||
      input.action === "approve" ||
      input.action === "lock") &&
    input.entries.length === 0
  ) {
    issues.push({
      field: "entries",
      message: "لا يمكن تنفيذ الإجراء على سجل لا يحتوي على درجات.",
      level: "error",
    });
  }

  for (const entry of input.entries) {
    const entryIssues = validateGradeEntry({
      ...entry,
      components: input.components,
    });

    issues.push(
      ...entryIssues.map((issue) => ({
        ...issue,
        field: entry.student_id ? `${entry.student_id}.${issue.field}` : issue.field,
      })),
    );
  }

  return issues;
}

export function validateImportedGradeRow(input: {
  rowIndex: number;
  studentName?: string | null;
  nationalId?: string | null;
  values: GradeValueMap;
  components: GradeComponent[];
}): GradeValidationIssue[] {
  const issues: GradeValidationIssue[] = [];

  if (!input.studentName && !input.nationalId) {
    issues.push({
      field: `row_${input.rowIndex}`,
      message: `الصف رقم ${input.rowIndex} لا يحتوي على اسم طالب أو رقم هوية.`,
      level: "error",
    });
  }

  issues.push(
    ...validateGradeEntry({
      student_id: input.nationalId ?? input.studentName ?? `row_${input.rowIndex}`,
      values: input.values,
      components: input.components,
    }),
  );

  return issues;
}

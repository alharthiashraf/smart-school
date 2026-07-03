export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationIssue = {
  field?: string;
  message: string;
  severity: ValidationSeverity;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export const ValidationEngine = {
  required(value: unknown, field: string, label = field): ValidationIssue | null {
    if (value === null || value === undefined || String(value).trim() === "") {
      return { field, message: `${label} مطلوب`, severity: "error" };
    }
    return null;
  },

  numberRange(value: unknown, field: string, min: number, max: number, label = field): ValidationIssue | null {
    const num = Number(value);
    if (!Number.isFinite(num) || num < min || num > max) {
      return { field, message: `${label} يجب أن يكون بين ${min} و ${max}`, severity: "error" };
    }
    return null;
  },

  unique<T>(items: T[], key: (item: T) => string, message: string): ValidationIssue | null {
    const seen = new Set<string>();
    for (const item of items) {
      const value = key(item);
      if (seen.has(value)) return { message, severity: "error" };
      seen.add(value);
    }
    return null;
  },

  collect(issues: Array<ValidationIssue | null | undefined>): ValidationResult {
    const clean = issues.filter(Boolean) as ValidationIssue[];
    return { valid: !clean.some((issue) => issue.severity === "error"), issues: clean };
  },
};

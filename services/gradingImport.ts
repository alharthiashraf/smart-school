import {
  calculateEntryTotals,
  canSaveGradeBook,
  toNumber,
  validateImportedGradeRow,
  type GradeBookStatus,
  type GradeComponent,
  type GradeValidationIssue,
  type GradeValueMap,
} from "./gradingValidation";

export type ImportMatchStatus =
  | "matched"
  | "partial_match"
  | "unmatched"
  | "invalid";

export type ImportApplyMode = "valid_only" | "all_matched";

export type StudentImportTarget = {
  id: string;
  full_name?: string | null;
  national_id?: string | null;
  student_number?: string | null;
};

export type ImportedGradeRow = {
  row_index: number;
  student_name?: string;
  national_id?: string;
  student_number?: string;
  values: GradeValueMap;
  raw: Record<string, unknown>;
};

export type ImportedGradePreviewRow = ImportedGradeRow & {
  match_status: ImportMatchStatus;
  matched_student?: StudentImportTarget | null;
  match_score: number;
  issues: GradeValidationIssue[];
  calculation: ReturnType<typeof calculateEntryTotals>;
  action: "update" | "skip";
};

export type ImportPreviewSummary = {
  total_rows: number;
  matched: number;
  partial_match: number;
  unmatched: number;
  invalid: number;
  updatable: number;
  skipped: number;
  blocking_errors: number;
  warnings: number;
};

export type ImportPreviewResult = {
  rows: ImportedGradePreviewRow[];
  summary: ImportPreviewSummary;
  issues: GradeValidationIssue[];
};

export type GradeEntryImportPayload = {
  grade_book_id: string;
  student_id: string;
  values: GradeValueMap;
  total_score: number;
  max_score: number;
  percentage: number;
  grade_label: string;
  result_status: string;
  updated_at: string;
};

const STUDENT_NAME_HEADERS = [
  "اسم الطالب",
  "الطالب",
  "الاسم",
  "اسم",
  "اسم المتعلم",
  "اسم الطالبة",
  "اسم الطالب/ة",
  "student_name",
  "student name",
  "name",
];

const NATIONAL_ID_HEADERS = [
  "السجل المدني",
  "رقم السجل المدني",
  "رقم الهوية",
  "الهوية",
  "هوية الطالب",
  "national_id",
  "national id",
  "id",
];

const STUDENT_NUMBER_HEADERS = [
  "رقم الطالب",
  "رقم الطالبة",
  "student_number",
  "student number",
  "student_code",
  "student code",
  "code",
];

function normalizeArabicText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDigits(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/\s+/g, "");
}

function normalizeHeader(value: unknown) {
  return normalizeArabicText(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findHeader(headers: string[], candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeHeader);

  return (
    headers.find((header) =>
      normalizedCandidates.includes(normalizeHeader(header)),
    ) ?? null
  );
}

function findComponentHeader(headers: string[], component: GradeComponent) {
  const normalizedKey = normalizeHeader(component.key);
  const normalizedName = normalizeHeader(component.name);

  return (
    headers.find((header) => {
      const normalized = normalizeHeader(header);

      return (
        normalized === normalizedKey ||
        normalized === normalizedName ||
        normalized.includes(normalizedName) ||
        normalized.includes(normalizedKey)
      );
    }) ?? null
  );
}

function nameSimilarity(a: string, b: string) {
  const left = normalizeArabicText(a);
  const right = normalizeArabicText(b);

  if (!left || !right) return 0;
  if (left === right) return 100;
  if (left.includes(right) || right.includes(left)) return 85;

  const leftParts = new Set(left.split(" ").filter(Boolean));
  const rightParts = new Set(right.split(" ").filter(Boolean));

  if (leftParts.size === 0 || rightParts.size === 0) return 0;

  const common = [...leftParts].filter((part) => rightParts.has(part)).length;
  const total = Math.max(leftParts.size, rightParts.size);

  return Math.round((common / total) * 100);
}

function hasBlockingIssues(issues: GradeValidationIssue[]) {
  return issues.some((issue) => issue.level === "error");
}

function buildSummary(rows: ImportedGradePreviewRow[]): ImportPreviewSummary {
  return {
    total_rows: rows.length,
    matched: rows.filter((row) => row.match_status === "matched").length,
    partial_match: rows.filter((row) => row.match_status === "partial_match").length,
    unmatched: rows.filter((row) => row.match_status === "unmatched").length,
    invalid: rows.filter((row) => row.match_status === "invalid").length,
    updatable: rows.filter((row) => row.action === "update").length,
    skipped: rows.filter((row) => row.action === "skip").length,
    blocking_errors: rows.reduce(
      (sum, row) =>
        sum + row.issues.filter((issue) => issue.level === "error").length,
      0,
    ),
    warnings: rows.reduce(
      (sum, row) =>
        sum + row.issues.filter((issue) => issue.level === "warning").length,
      0,
    ),
  };
}

export function normalizeImportedRows(input: {
  rows: Record<string, unknown>[];
  components: GradeComponent[];
}): ImportedGradeRow[] {
  if (input.rows.length === 0) return [];

  const headers = Object.keys(input.rows[0] ?? {});
  const nameHeader = findHeader(headers, STUDENT_NAME_HEADERS);
  const nationalIdHeader = findHeader(headers, NATIONAL_ID_HEADERS);
  const studentNumberHeader = findHeader(headers, STUDENT_NUMBER_HEADERS);

  return input.rows
    .map((row, index) => {
      const values: GradeValueMap = {};

      for (const component of input.components) {
        const matchingHeader = findComponentHeader(headers, component);
        const rawValue = matchingHeader ? row[matchingHeader] : null;
        values[component.key] = toNumber(rawValue);
      }

      return {
        row_index: index + 1,
        student_name: nameHeader
          ? String(row[nameHeader] ?? "").trim() || undefined
          : undefined,
        national_id: nationalIdHeader
          ? normalizeDigits(row[nationalIdHeader]) || undefined
          : undefined,
        student_number: studentNumberHeader
          ? normalizeDigits(row[studentNumberHeader]) || undefined
          : undefined,
        values,
        raw: row,
      };
    })
    .filter((row) => row.student_name || row.national_id || row.student_number);
}

export function matchImportedRowToStudent(input: {
  row: ImportedGradeRow;
  students: StudentImportTarget[];
}): {
  status: ImportMatchStatus;
  student: StudentImportTarget | null;
  score: number;
} {
  const nationalId = normalizeDigits(input.row.national_id);
  const studentNumber = normalizeDigits(input.row.student_number);
  const studentName = normalizeArabicText(input.row.student_name);

  if (nationalId) {
    const matched = input.students.find(
      (student) => normalizeDigits(student.national_id) === nationalId,
    );

    if (matched) return { status: "matched", student: matched, score: 100 };
  }

  if (studentNumber) {
    const matched = input.students.find(
      (student) => normalizeDigits(student.student_number) === studentNumber,
    );

    if (matched) return { status: "matched", student: matched, score: 95 };
  }

  if (studentName) {
    const ranked = input.students
      .map((student) => ({
        student,
        score: nameSimilarity(studentName, student.full_name ?? ""),
      }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];

    if (best?.score >= 90) {
      return { status: "matched", student: best.student, score: best.score };
    }

    if (best?.score >= 65) {
      return {
        status: "partial_match",
        student: best.student,
        score: best.score,
      };
    }
  }

  return { status: "unmatched", student: null, score: 0 };
}

export function previewImportedGrades(input: {
  rows: Record<string, unknown>[];
  components: GradeComponent[];
  students: StudentImportTarget[];
  gradeBookStatus?: GradeBookStatus | null;
}): ImportPreviewResult {
  const issues: GradeValidationIssue[] = [];

  if (!canSaveGradeBook(input.gradeBookStatus ?? "draft")) {
    issues.push({
      field: "status",
      level: "error",
      message: "لا يمكن الاستيراد على سجل درجات معتمد أو مقفل.",
    });
  }

  const normalized = normalizeImportedRows({
    rows: input.rows,
    components: input.components,
  });

  const previewRows: ImportedGradePreviewRow[] = normalized.map((row) => {
    const match = matchImportedRowToStudent({
      row,
      students: input.students,
    });

    const rowIssues = validateImportedGradeRow({
      rowIndex: row.row_index,
      studentName: row.student_name,
      nationalId: row.national_id,
      values: row.values,
      components: input.components,
    });

    if (match.status === "unmatched") {
      rowIssues.push({
        field: `row_${row.row_index}`,
        level: "error",
        message: `لم يتم العثور على طالب مطابق في الصف رقم ${row.row_index}.`,
      });
    }

    if (match.status === "partial_match") {
      rowIssues.push({
        field: `row_${row.row_index}`,
        level: "warning",
        message: `تم العثور على تطابق محتمل بنسبة ${match.score}%. راجع الطالب قبل الحفظ.`,
      });
    }

    const calculation = calculateEntryTotals({
      components: input.components,
      values: row.values,
    });

    const status: ImportMatchStatus = hasBlockingIssues(rowIssues)
      ? "invalid"
      : match.status;

    return {
      ...row,
      match_status: status,
      matched_student: match.student,
      match_score: match.score,
      issues: rowIssues,
      calculation,
      action:
        !hasBlockingIssues(rowIssues) && match.student ? "update" : "skip",
    };
  });

  return {
    rows: previewRows,
    summary: buildSummary(previewRows),
    issues,
  };
}

export function buildGradeEntryImportPayload(input: {
  gradeBookId: string;
  previewRows: ImportedGradePreviewRow[];
  mode?: ImportApplyMode;
}): GradeEntryImportPayload[] {
  const mode = input.mode ?? "valid_only";
  const now = new Date().toISOString();

  return input.previewRows
    .filter((row) => {
      if (!row.matched_student) return false;
      if (row.action !== "update") return false;
      if (mode === "valid_only") return !hasBlockingIssues(row.issues);
      return row.match_status === "matched" || row.match_status === "partial_match";
    })
    .map((row) => ({
      grade_book_id: input.gradeBookId,
      student_id: row.matched_student!.id,
      values: row.values,
      total_score: row.calculation.total_score,
      max_score: row.calculation.max_score,
      percentage: row.calculation.percentage,
      grade_label: row.calculation.grade_label,
      result_status: row.calculation.result_status,
      updated_at: now,
    }));
}

export function chunkImportPayload<T>(items: T[], size = 50): T[][] {
  if (size <= 0) return [items];

  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export const GradingImport = {
  normalizeImportedRows,
  previewImportedGrades,
  matchImportedRowToStudent,
  buildGradeEntryImportPayload,
  chunkImportPayload,
};


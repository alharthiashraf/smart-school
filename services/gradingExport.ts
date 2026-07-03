import { ExportEngine } from "@/core";

export type GradeExportReportType =
  | "teacher_grade_sheet"
  | "final_grade_sheet"
  | "student_report"
  | "class_report"
  | "subject_report"
  | "behavior_report"
  | "attendance_report";

export type GradeExportOrientation = "portrait" | "landscape";
export type GradeExportFormat = "pdf" | "excel";

export type GradeExportRow = Record<string, unknown> & {
  student_name: string;
  national_id?: string | null;
  student_number?: string | null;
  total_score: number;
  max_score: number;
  percentage: number;
  grade_label: string;
  result_status: string;
  behavior_score?: number | null;
  attendance_score?: number | null;
  notes?: string | null;
};

export type GradeExportContext = {
  schoolName?: string | null;
  schoolLogoUrl?: string | null;
  educationOffice?: string | null;
  academicYear?: string | null;
  semester?: string | null;
  subjectName?: string | null;
  teacherName?: string | null;
  classroomName?: string | null;
  gradeName?: string | null;
  reportTitle?: string | null;
  printedBy?: string | null;
  printedAt?: Date | string | null;
};

export type GradeExportOptions = {
  reportType?: GradeExportReportType;
  orientation?: GradeExportOrientation;
  includeIdentity?: boolean;
  includeStudentNumber?: boolean;
  includeBehavior?: boolean;
  includeAttendance?: boolean;
  includeNotes?: boolean;
  includeSignatures?: boolean;
  fileName?: string;
};

type ExportColumn = {
  header: string;
  key: string;
};

const REPORT_TITLES: Record<GradeExportReportType, string> = {
  teacher_grade_sheet: "كشف رصد درجات المعلم",
  final_grade_sheet: "كشف الدرجات النهائي",
  student_report: "تقرير درجات الطالب",
  class_report: "تقرير درجات الفصل",
  subject_report: "تقرير درجات المادة",
  behavior_report: "كشف السلوك",
  attendance_report: "كشف المواظبة",
};

function safeText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value?: Date | string | null) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString("ar-SA");
  }

  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getReportTitle(type: GradeExportReportType, context?: GradeExportContext) {
  return context?.reportTitle || REPORT_TITLES[type];
}

function buildSubtitle(context?: GradeExportContext) {
  return [
    context?.schoolName,
    context?.educationOffice,
    context?.academicYear ? `العام الدراسي: ${context.academicYear}` : null,
    context?.semester,
    context?.subjectName ? `المادة: ${context.subjectName}` : null,
    context?.teacherName ? `المعلم: ${context.teacherName}` : null,
    context?.classroomName ? `الفصل: ${context.classroomName}` : null,
  ]
    .filter(Boolean)
    .join(" — ");
}

function buildFooter(context?: GradeExportContext) {
  return [
    `تاريخ الطباعة: ${formatDate(context?.printedAt)}`,
    context?.printedBy ? `طبع بواسطة: ${context.printedBy}` : null,
  ]
    .filter(Boolean)
    .join(" — ");
}

function normalizeRows(rows: GradeExportRow[]) {
  return rows.map((row, index) => ({
    ...row,
    serial: index + 1,
    student_name: safeText(row.student_name),
    national_id: row.national_id ?? "-",
    student_number: row.student_number ?? "-",
    total_score: Number(row.total_score ?? 0),
    max_score: Number(row.max_score ?? 100),
    percentage: Number(row.percentage ?? 0),
    grade_label: safeText(row.grade_label),
    result_status: safeText(row.result_status),
    behavior_score:
      row.behavior_score === null || row.behavior_score === undefined
        ? "-"
        : row.behavior_score,
    attendance_score:
      row.attendance_score === null || row.attendance_score === undefined
        ? "-"
        : row.attendance_score,
    notes: row.notes ?? "",
  }));
}

function buildColumns(options?: GradeExportOptions): ExportColumn[] {
  const columns: ExportColumn[] = [
    { header: "م", key: "serial" },
    { header: "الطالب", key: "student_name" },
  ];

  if (options?.includeStudentNumber) {
    columns.push({ header: "رقم الطالب", key: "student_number" });
  }

  if (options?.includeIdentity) {
    columns.push({ header: "الهوية", key: "national_id" });
  }

  columns.push(
    { header: "المجموع", key: "total_score" },
    { header: "النهاية", key: "max_score" },
    { header: "النسبة", key: "percentage" },
    { header: "التقدير", key: "grade_label" },
    { header: "الحالة", key: "result_status" },
  );

  if (options?.includeBehavior || options?.reportType === "behavior_report") {
    columns.push({ header: "السلوك", key: "behavior_score" });
  }

  if (options?.includeAttendance || options?.reportType === "attendance_report") {
    columns.push({ header: "المواظبة", key: "attendance_score" });
  }

  if (options?.includeNotes) {
    columns.push({ header: "ملاحظات", key: "notes" });
  }

  return columns;
}

function buildSignatureRows() {
  return [
    {},
    {
      serial: "",
      student_name: "توقيع المعلم",
      total_score: "رئيس القسم",
      max_score: "الوكيل",
      percentage: "مدير المدرسة",
      grade_label: "",
      result_status: "",
    },
    {
      serial: "",
      student_name: "................",
      total_score: "................",
      max_score: "................",
      percentage: "................",
      grade_label: "",
      result_status: "",
    },
  ];
}

function buildExportRows(rows: GradeExportRow[], options?: GradeExportOptions) {
  const normalized = normalizeRows(rows);

  if (!options?.includeSignatures) return normalized;

  return [...normalized, ...buildSignatureRows()];
}

function defaultFileName(input: {
  type: GradeExportReportType;
  context?: GradeExportContext;
  extension: "pdf" | "xlsx";
}) {
  const title = getReportTitle(input.type, input.context);
  const subject = input.context?.subjectName || input.context?.classroomName || "";
  const year = input.context?.academicYear || "";
  return safeFileName([title, subject, year].filter(Boolean).join(" - ")) + `.${input.extension}`;
}

function exportExcel(input: {
  rows: GradeExportRow[];
  context?: GradeExportContext;
  options?: GradeExportOptions;
}) {
  const reportType = input.options?.reportType ?? "teacher_grade_sheet";
  const title = getReportTitle(reportType, input.context);
  const subtitle = buildSubtitle(input.context);
  const footer = buildFooter(input.context);
  const columns = buildColumns(input.options);
  const rows = buildExportRows(input.rows, input.options);

  const fileName =
    input.options?.fileName ||
    defaultFileName({
      type: reportType,
      context: input.context,
      extension: "xlsx",
    });

  return ExportEngine.excel(
    safeFileName(fileName.replace(/\.xlsx$/i, "")),
    [
      {
        serial: title,
        student_name: subtitle,
        total_score: footer,
      },
      {},
      ...rows,
    ],
    columns,
  );
}

function exportPDF(input: {
  rows: GradeExportRow[];
  context?: GradeExportContext;
  options?: GradeExportOptions;
}) {
  const reportType = input.options?.reportType ?? "teacher_grade_sheet";
  const title = getReportTitle(reportType, input.context);
  const subtitle = buildSubtitle(input.context);
  const footer = buildFooter(input.context);
  const columns = buildColumns(input.options);
  const rows = buildExportRows(input.rows, input.options);

  return ExportEngine.pdf(
    subtitle ? `${title}\n${subtitle}\n${footer}` : title,
    rows,
    columns,
  );
}

export const GradingExport = {
  columns: buildColumns,

  normalizeRows,

  teacherGradeSheetExcel(
    rows: GradeExportRow[],
    context?: GradeExportContext,
    options?: GradeExportOptions,
  ) {
    return exportExcel({
      rows,
      context,
      options: {
        includeStudentNumber: true,
        includeIdentity: true,
        includeSignatures: true,
        ...options,
        reportType: "teacher_grade_sheet",
      },
    });
  },

  teacherGradeSheetPDF(
    rows: GradeExportRow[],
    context?: GradeExportContext,
    options?: GradeExportOptions,
  ) {
    return exportPDF({
      rows,
      context,
      options: {
        includeStudentNumber: true,
        includeIdentity: true,
        includeSignatures: true,
        orientation: "landscape",
        ...options,
        reportType: "teacher_grade_sheet",
      },
    });
  },

  finalGradeSheetExcel(
    rows: GradeExportRow[],
    context?: GradeExportContext,
    options?: GradeExportOptions,
  ) {
    return exportExcel({
      rows,
      context,
      options: {
        includeStudentNumber: true,
        includeIdentity: true,
        includeBehavior: true,
        includeAttendance: true,
        includeSignatures: true,
        ...options,
        reportType: "final_grade_sheet",
      },
    });
  },

  finalGradeSheetPDF(
    rows: GradeExportRow[],
    context?: GradeExportContext,
    options?: GradeExportOptions,
  ) {
    return exportPDF({
      rows,
      context,
      options: {
        includeStudentNumber: true,
        includeIdentity: true,
        includeBehavior: true,
        includeAttendance: true,
        includeSignatures: true,
        orientation: "landscape",
        ...options,
        reportType: "final_grade_sheet",
      },
    });
  },

  behaviorExcel(
    rows: GradeExportRow[],
    context?: GradeExportContext,
    options?: GradeExportOptions,
  ) {
    return exportExcel({
      rows,
      context,
      options: {
        includeStudentNumber: true,
        includeBehavior: true,
        includeNotes: true,
        ...options,
        reportType: "behavior_report",
      },
    });
  },

  behaviorPDF(
    rows: GradeExportRow[],
    context?: GradeExportContext,
    options?: GradeExportOptions,
  ) {
    return exportPDF({
      rows,
      context,
      options: {
        includeStudentNumber: true,
        includeBehavior: true,
        includeNotes: true,
        ...options,
        reportType: "behavior_report",
      },
    });
  },

  attendanceExcel(
    rows: GradeExportRow[],
    context?: GradeExportContext,
    options?: GradeExportOptions,
  ) {
    return exportExcel({
      rows,
      context,
      options: {
        includeStudentNumber: true,
        includeAttendance: true,
        includeNotes: true,
        ...options,
        reportType: "attendance_report",
      },
    });
  },

  attendancePDF(
    rows: GradeExportRow[],
    context?: GradeExportContext,
    options?: GradeExportOptions,
  ) {
    return exportPDF({
      rows,
      context,
      options: {
        includeStudentNumber: true,
        includeAttendance: true,
        includeNotes: true,
        ...options,
        reportType: "attendance_report",
      },
    });
  },

  excel(filename: string, rows: GradeExportRow[]) {
    return exportExcel({
      rows,
      options: {
        fileName: filename,
        reportType: "teacher_grade_sheet",
      },
    });
  },

  pdf(title: string, rows: GradeExportRow[]) {
    return exportPDF({
      rows,
      context: {
        reportTitle: title,
      },
      options: {
        reportType: "teacher_grade_sheet",
      },
    });
  },
};

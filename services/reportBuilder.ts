import { supabase } from "@/lib/supabase";
import {
  ExportEngine,
  type ExportColumn,
  type PdfExportOptions,
} from "../core/export/ExportEngine";

export type ReportFormat = "pdf" | "excel" | "print";

export type ReportBuilderResult = {
  success: boolean;
  error: string | null;
};

export type GradeReportKind =
  | "teacher_grade_sheet"
  | "final_grade_sheet"
  | "student_report"
  | "class_report"
  | "subject_report";

export type ConductReportKind =
  | "behavior_report"
  | "attendance_report"
  | "conduct_report";

export type BaseReportInput = {
  schoolId: string;
  format?: ReportFormat;
  fileName?: string;
  printedBy?: string | null;
};

export type GradeSheetInput = BaseReportInput & {
  gradeBookId: string;
  kind?: GradeReportKind;
  includeIdentity?: boolean;
  includeStudentNumber?: boolean;
  includeNotes?: boolean;
};

export type ConductReportInput = BaseReportInput & {
  academicYear: string;
  semester: string;
  scoreType?: "behavior" | "attendance";
  classroomId?: string | null;
  kind?: ConductReportKind;
};

export type StudentsReportInput = BaseReportInput & {
  classroomId?: string | null;
};

type SchoolRow = {
  id: string;
  school_code?: string | null;
  school_name?: string | null;
  school_type?: string | null;
  education_system?: string | null;
  logo_url?: string | null;
  school_logo_url?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  country?: string | null;
  is_active?: boolean | null;
  semester_system?: number | null;
};

type GradeBookComponent = {
  key: string;
  name: string;
  max_score: number;
  is_required?: boolean;
};

type GradeBookRow = {
  id: string;
  school_id: string;
  teacher_subject_id: string | null;
  teacher_id: string | null;
  subject_id: string | null;
  classroom_id: string | null;
  academic_year: string | number | null;
  semester: string | null;
  status: string | null;
  max_score: number | null;
  components: GradeBookComponent[] | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  approved_at?: string | null;
};

type GradeEntryRow = {
  id?: string;
  grade_book_id: string;
  student_id: string;
  values?: Record<string, number | null> | string | null;
  total_score?: number | null;
  max_score?: number | null;
  percentage?: number | null;
  grade_label?: string | null;
  result_status?: string | null;
  notes?: string | null;
};

type StudentRow = {
  id: string;
  school_id?: string | null;
  student_number?: string | null;
  national_id?: string | null;
  full_name?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  stage_id?: string | null;
  grade_id?: string | null;
  classroom_id?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  status?: string | null;
};

type TeacherRow = {
  id: string;
  school_id?: string | null;
  user_id?: string | null;
  employee_number?: string | null;
  full_name?: string | null;
  national_id?: string | null;
  email?: string | null;
  phone?: string | null;
  specialization?: string | null;
  qualification?: string | null;
  status?: string | null;
};

type SubjectRow = {
  id: string;
  subject_name?: string | null;
  name?: string | null;
  subject_code?: string | null;
};

type ClassroomRow = {
  id: string;
  classroom_name?: string | null;
  name?: string | null;
  grade_id?: string | null;
};

type GradeRow = {
  id: string;
  grade_name?: string | null;
  name?: string | null;
  stage_id?: string | null;
};

type StageRow = {
  id: string;
  stage_name?: string | null;
  name?: string | null;
};

type ConductScoreRow = {
  id?: string;
  school_id: string;
  student_id: string;
  grading_scheme_id?: string | null;
  component_id?: string | null;
  score?: number | null;
  max_score?: number | null;
  semester?: string | null;
  academic_year?: string | number | null;
  score_type: "behavior" | "attendance";
};

type GradeReportRow = Record<string, unknown> & {
  student_name: string;
  student_number: string;
  national_id: string;
  total_score: number;
  max_score: number;
  percentage: number;
  grade_label: string;
  result_status: string;
  notes: string;
};

type ConductReportRow = Record<string, unknown> & {
  student_name: string;
  student_number: string;
  national_id: string;
  score: number;
  max_score: number;
  percentage: number;
  grade_label: string;
  result_status: string;
};

type StudentReportRow = Record<string, unknown> & {
  full_name: string;
  student_number: string;
  national_id: string;
  classroom_name: string;
  guardian_name: string;
  guardian_phone: string;
  status: string;
};

function ok(): ReportBuilderResult {
  return { success: true, error: null };
}

function fail(error: unknown): ReportBuilderResult {
  return {
    success: false,
    error:
      error instanceof Error
        ? error.message
        : String(error || "تعذر إنشاء التقرير."),
  };
}

function safeText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function gradeLabel(percentage: number) {
  if (percentage >= 90) return "ممتاز";
  if (percentage >= 80) return "جيد جدًا";
  if (percentage >= 70) return "جيد";
  if (percentage >= 60) return "مقبول";
  return "ضعيف";
}

function resultStatus(percentage: number) {
  return percentage >= 60 ? "ناجح" : "راسب";
}

function fileSafe(value: string) {
  return safeText(value, "report")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ");
}

function parseComponents(value: GradeBookRow["components"]): GradeBookComponent[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function parseValues(value: GradeEntryRow["values"]): Record<string, number | null> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }

  return {};
}

async function maybeSingle<T>(
  table: string,
  select: string,
  column: string,
  value?: string | null,
): Promise<T | null> {
  if (!value) return null;

  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq(column, value)
    .maybeSingle();

  if (error) throw error;
  return (data as T) ?? null;
}

async function getSchool(schoolId: string) {
  return maybeSingle<SchoolRow>("schools", "*", "id", schoolId);
}

async function getGradeBook(gradeBookId: string) {
  return maybeSingle<GradeBookRow>("grade_books", "*", "id", gradeBookId);
}

async function getGradeEntries(gradeBookId: string) {
  const { data, error } = await supabase
    .from("grade_entries")
    .select("*")
    .eq("grade_book_id", gradeBookId);

  if (error) throw error;
  return (data ?? []) as GradeEntryRow[];
}

async function getStudentsByIds(studentIds: string[], schoolId: string) {
  if (studentIds.length === 0) return new Map<string, StudentRow>();

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("school_id", schoolId)
    .in("id", studentIds);

  if (error) throw error;
  return new Map(((data ?? []) as StudentRow[]).map((row) => [row.id, row]));
}

async function getStudentsByClassroom(input: {
  schoolId: string;
  classroomId?: string | null;
}) {
  let query = supabase
    .from("students")
    .select("*")
    .eq("school_id", input.schoolId)
    .order("full_name", { ascending: true });

  if (input.classroomId) query = query.eq("classroom_id", input.classroomId);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as StudentRow[];
}

async function getTeacher(id?: string | null) {
  return maybeSingle<TeacherRow>("teachers", "*", "id", id);
}

async function getSubject(id?: string | null) {
  return maybeSingle<SubjectRow>("subjects", "*", "id", id);
}

async function getClassroom(id?: string | null) {
  return maybeSingle<ClassroomRow>("classrooms", "*", "id", id);
}

async function getGrade(id?: string | null) {
  return maybeSingle<GradeRow>("grades", "*", "id", id);
}

async function getStage(id?: string | null) {
  return maybeSingle<StageRow>("stages", "*", "id", id);
}

function buildPdfOptions(input: {
  school?: SchoolRow | null;
  teacher?: TeacherRow | null;
  subject?: SubjectRow | null;
  classroom?: ClassroomRow | null;
  grade?: GradeRow | null;
  stage?: StageRow | null;
  academicYear?: string | number | null;
  semester?: string | null;
  printedBy?: string | null;
  fileName?: string;
  approvedAt?: string | null;
  reportType?: PdfExportOptions["reportType"];
  stats?: PdfExportOptions["stats"];
}): PdfExportOptions {
  return {
    reportType: input.reportType ?? "grades",
    orientation: "auto",
    ministryName: "وزارة التعليم",
    educationOffice: input.school?.city ?? undefined,
    schoolName: input.school?.school_name ?? "منصة المدرسة الذكية 2.0",
    schoolLogoUrl:
      input.school?.school_logo_url ?? input.school?.logo_url ?? undefined,
    academicYear:
      input.academicYear !== null && input.academicYear !== undefined
        ? String(input.academicYear)
        : undefined,
    semester: input.semester ?? undefined,
    stageName:
      input.stage?.stage_name ?? input.stage?.name ?? undefined,
    gradeName:
      input.grade?.grade_name ?? input.grade?.name ?? undefined,
    classroomName:
      input.classroom?.classroom_name ?? input.classroom?.name ?? undefined,
    subjectName:
      input.subject?.subject_name ?? input.subject?.name ?? undefined,
    teacherName: input.teacher?.full_name ?? undefined,
    printedBy: input.printedBy ?? undefined,
    approvedAt: input.approvedAt ?? undefined,
    fileName: input.fileName,
    showStats: true,
    showSignatures: true,
    showFooter: true,
    showWatermark: true,
    showQr: true,
    stats: input.stats,
  };
}

function exportWithFormat<T extends Record<string, unknown>>(input: {
  format: ReportFormat;
  title: string;
  rows: T[];
  columns: ExportColumn<T>[];
  pdfOptions: PdfExportOptions;
  fileName: string;
  excelMeta?: Record<string, unknown>;
}) {
  if (input.format === "excel") {
    ExportEngine.excel(input.fileName, input.rows, input.columns, {
      sheetName: input.title.slice(0, 31),
      rtl: true,
      includeMeta: true,
      meta: input.excelMeta ?? {},
    });
    return;
  }

  if (input.format === "print") {
    ExportEngine.print(input.title, input.rows, input.columns, input.pdfOptions);
    return;
  }

  ExportEngine.pdf(input.title, input.rows, input.columns, input.pdfOptions);
}

function buildGradeColumns(
  components: GradeBookComponent[],
  options?: {
    includeIdentity?: boolean;
    includeStudentNumber?: boolean;
    includeNotes?: boolean;
  },
): ExportColumn<GradeReportRow>[] {
  const columns: ExportColumn<GradeReportRow>[] = [
    { header: "الطالب", key: "student_name", align: "right" },
  ];

  if (options?.includeStudentNumber) {
    columns.push({ header: "رقم الطالب", key: "student_number" });
  }

  if (options?.includeIdentity) {
    columns.push({ header: "الهوية", key: "national_id" });
  }

  for (const component of components) {
    columns.push({
      header: `${component.name} / ${component.max_score}`,
      key: component.key,
    });
  }

  columns.push(
    { header: "المجموع", key: "total_score" },
    { header: "النهاية", key: "max_score" },
    {
      header: "النسبة",
      key: "percentage",
      format: (value: unknown) => `${toNumber(value)}%`,
    },
    { header: "التقدير", key: "grade_label" },
    { header: "الحالة", key: "result_status" },
  );

  if (options?.includeNotes) {
    columns.push({ header: "ملاحظات", key: "notes", align: "right" });
  }

  return columns;
}

function buildGradeRows(
  entries: GradeEntryRow[],
  studentsMap: Map<string, StudentRow>,
  components: GradeBookComponent[],
): GradeReportRow[] {
  return entries
    .map((entry) => {
      const student = studentsMap.get(entry.student_id);
      const values = parseValues(entry.values);
      const maxScore =
        toNumber(entry.max_score, 0) ||
        components.reduce(
          (sum, component) => sum + toNumber(component.max_score),
          0,
        ) ||
        100;
      const totalScore = toNumber(entry.total_score, 0);
      const percentage =
        entry.percentage !== null && entry.percentage !== undefined
          ? toNumber(entry.percentage)
          : maxScore > 0
            ? Math.round((totalScore / maxScore) * 100)
            : 0;

      const row: GradeReportRow = {
        student_name: safeText(student?.full_name, "طالب بدون اسم"),
        national_id: safeText(student?.national_id),
        student_number: safeText(student?.student_number),
        total_score: totalScore,
        max_score: maxScore,
        percentage,
        grade_label: entry.grade_label || gradeLabel(percentage),
        result_status: entry.result_status || resultStatus(percentage),
        notes: safeText(entry.notes, ""),
      };

      for (const component of components) {
        row[component.key] = values[component.key] ?? "";
      }

      return row;
    })
    .sort((a, b) =>
      String(a.student_name).localeCompare(String(b.student_name), "ar"),
    );
}

async function buildGradeContext(book: GradeBookRow, schoolId: string) {
  const [school, teacher, subject, classroom] = await Promise.all([
    getSchool(schoolId),
    getTeacher(book.teacher_id),
    getSubject(book.subject_id),
    getClassroom(book.classroom_id),
  ]);

  const grade = await getGrade(classroom?.grade_id ?? null);
  const stage = await getStage(grade?.stage_id ?? null);

  return { school, teacher, subject, classroom, grade, stage };
}

export const ReportBuilder = {
  async gradeSheet(input: GradeSheetInput): Promise<ReportBuilderResult> {
    try {
      const format = input.format ?? "pdf";
      const kind = input.kind ?? "teacher_grade_sheet";
      const book = await getGradeBook(input.gradeBookId);

      if (!book) throw new Error("لم يتم العثور على سجل الدرجات.");

      const components = parseComponents(book.components);
      const entries = await getGradeEntries(book.id);
      const studentIds = entries.map((entry) => entry.student_id);
      const studentsMap = await getStudentsByIds(studentIds, input.schoolId);
      const context = await buildGradeContext(book, input.schoolId);

      const rows = buildGradeRows(entries, studentsMap, components);
      const columns = buildGradeColumns(components, {
        includeIdentity: input.includeIdentity ?? true,
        includeStudentNumber: input.includeStudentNumber ?? true,
        includeNotes: input.includeNotes ?? false,
      });

      const title =
        kind === "final_grade_sheet"
          ? "كشف الدرجات النهائي"
          : kind === "student_report"
            ? "تقرير درجات الطالب"
            : "كشف رصد الدرجات";

      const fileName =
        input.fileName ||
        fileSafe(
          [
            title,
            context.subject?.subject_name ?? context.subject?.name,
            context.classroom?.classroom_name ?? context.classroom?.name,
            book.academic_year,
          ]
            .filter(Boolean)
            .join(" - "),
        );

      const pdfOptions = buildPdfOptions({
        ...context,
        academicYear: book.academic_year,
        semester: book.semester,
        approvedAt: book.approved_at,
        printedBy: input.printedBy,
        fileName,
        reportType: kind === "final_grade_sheet" ? "final_grades" : "grades",
      });

      exportWithFormat({
        format,
        title,
        rows,
        columns,
        pdfOptions,
        fileName,
        excelMeta: {
          المدرسة: context.school?.school_name,
          المادة: context.subject?.subject_name ?? context.subject?.name,
          المعلم: context.teacher?.full_name,
          الفصل: context.classroom?.classroom_name ?? context.classroom?.name,
          العام: book.academic_year,
          الفصل_الدراسي: book.semester,
          الحالة: book.status,
        },
      });

      return ok();
    } catch (error) {
      return fail(error);
    }
  },

  async conductReport(input: ConductReportInput): Promise<ReportBuilderResult> {
    try {
      const format = input.format ?? "pdf";
      const scoreType = input.scoreType ?? "behavior";
      const school = await getSchool(input.schoolId);
      const students = await getStudentsByClassroom({
        schoolId: input.schoolId,
        classroomId: input.classroomId ?? null,
      });

      let scoresQuery = supabase
        .from("student_conduct_scores")
        .select("*")
        .eq("school_id", input.schoolId)
        .eq("academic_year", input.academicYear)
        .eq("semester", input.semester);

      scoresQuery = scoresQuery.eq("score_type", scoreType);

      const { data: scoresData, error: scoresError } = await scoresQuery;

      if (scoresError) throw scoresError;

      const scoresMap = new Map(
        ((scoresData ?? []) as ConductScoreRow[]).map((score) => [
          `${score.student_id}-${score.score_type}`,
          score,
        ]),
      );

      const rows: ConductReportRow[] = students.map((student) => {
        const score = scoresMap.get(`${student.id}-${scoreType}`);
        const finalScore = toNumber(score?.score, 100);
        const maxScore = toNumber(score?.max_score, 100);
        const percentage =
          maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;

        return {
          student_name: safeText(student.full_name, "طالب بدون اسم"),
          national_id: safeText(student.national_id),
          student_number: safeText(student.student_number),
          score: finalScore,
          max_score: maxScore,
          percentage,
          grade_label: gradeLabel(percentage),
          result_status: percentage >= 75 ? "مستقر" : "يحتاج متابعة",
        };
      });

      const columns: ExportColumn<ConductReportRow>[] = [
        { header: "الطالب", key: "student_name", align: "right" },
        { header: "رقم الطالب", key: "student_number" },
        { header: "الهوية", key: "national_id" },
        { header: "الدرجة", key: "score" },
        { header: "النهاية", key: "max_score" },
        {
          header: "النسبة",
          key: "percentage",
          format: (value: unknown) => `${toNumber(value)}%`,
        },
        { header: "التقدير", key: "grade_label" },
        { header: "الحالة", key: "result_status" },
      ];

      const title =
        scoreType === "attendance"
          ? "كشف المواظبة"
          : scoreType === "behavior"
            ? "كشف السلوك"
            : "كشف السلوك والمواظبة";

      const fileName =
        input.fileName ||
        fileSafe(
          [title, input.academicYear, input.semester]
            .filter(Boolean)
            .join(" - "),
        );

      const pdfOptions = buildPdfOptions({
        school,
        academicYear: input.academicYear,
        semester: input.semester,
        printedBy: input.printedBy,
        fileName,
        reportType: scoreType === "attendance" ? "conduct" : "behavior",
      });

      exportWithFormat({
        format,
        title,
        rows,
        columns,
        pdfOptions,
        fileName,
        excelMeta: {
          المدرسة: school?.school_name,
          العام: input.academicYear,
          الفصل_الدراسي: input.semester,
          نوع_التقرير: title,
        },
      });

      return ok();
    } catch (error) {
      return fail(error);
    }
  },

  async studentsReport(input: StudentsReportInput): Promise<ReportBuilderResult> {
    try {
      const format = input.format ?? "pdf";
      const [school, students] = await Promise.all([
        getSchool(input.schoolId),
        getStudentsByClassroom({
          schoolId: input.schoolId,
          classroomId: input.classroomId ?? null,
        }),
      ]);

      const classroom = await getClassroom(input.classroomId ?? null);

      const rows: StudentReportRow[] = students.map((student) => ({
        full_name: safeText(student.full_name, "طالب بدون اسم"),
        student_number: safeText(student.student_number),
        national_id: safeText(student.national_id),
        classroom_name: safeText(
          classroom?.classroom_name ?? classroom?.name,
        ),
        guardian_name: safeText(student.guardian_name),
        guardian_phone: safeText(student.guardian_phone),
        status: student.status === "inactive" ? "غير نشط" : "نشط",
      }));

      const columns: ExportColumn<StudentReportRow>[] = [
        { header: "الطالب", key: "full_name", align: "right" },
        { header: "رقم الطالب", key: "student_number" },
        { header: "الهوية", key: "national_id" },
        { header: "الفصل", key: "classroom_name" },
        { header: "ولي الأمر", key: "guardian_name", align: "right" },
        { header: "جوال ولي الأمر", key: "guardian_phone" },
        { header: "الحالة", key: "status" },
      ];

      const title = "تقرير الطلاب";
      const fileName =
        input.fileName ||
        fileSafe(
          [title, classroom?.classroom_name ?? classroom?.name, school?.school_name]
            .filter(Boolean)
            .join(" - "),
        );

      const pdfOptions = buildPdfOptions({
        school,
        classroom,
        printedBy: input.printedBy,
        fileName,
        reportType: "students",
      });

      exportWithFormat({
        format,
        title,
        rows,
        columns,
        pdfOptions,
        fileName,
        excelMeta: {
          المدرسة: school?.school_name,
          الفصل: classroom?.classroom_name ?? classroom?.name,
          عدد_الطلاب: rows.length,
        },
      });

      return ok();
    } catch (error) {
      return fail(error);
    }
  },
};

export default ReportBuilder;

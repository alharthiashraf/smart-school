import { supabase } from "@/lib/supabase";
import { handleError, type ServiceResult } from "./base.service";
import {
  calculateEntryTotals,
  canSaveGradeBook,
  hasBlockingIssues,
  validateConductScore,
  validateGradeEntry,
} from "./gradingValidation";
import { buildGradeAnalytics, type GradeAnalyticsInput } from "./gradingAnalytics";
import { GradingWorkflow } from "./gradingWorkflow";
import { ReportBuilder, type ReportFormat } from "./reportBuilder";

export type GradeBookStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "locked"
  | "reopened";

export type ConductScoreType = "behavior" | "attendance";
export type ConductAction = "increase" | "decrease" | "set";

export type TeacherForGrades = {
  id: string;
  full_name?: string | null;
  email?: string | null;
};

export type SubjectForGrades = {
  id: string;
  subject_name?: string | null;
  subject_code?: string | null;
};

export type ClassroomForGrades = {
  id: string;
  classroom_name?: string | null;
  grade_id?: string | null;
};

export type TeacherSubjectForGrades = {
  id: string;
  school_id: string;
  teacher_id: string | null;
  subject_id: string | null;
  grade_id?: string | null;
  classroom_id: string | null;
  academic_year: string | null;
  semester: string | null;
  is_active?: boolean | null;
  teachers?: TeacherForGrades | null;
  subjects?: SubjectForGrades | null;
  classrooms?: ClassroomForGrades | null;
};

export type GradeComponent = {
  key: string;
  name: string;
  max_score: number;
  is_required?: boolean;
};

export type GradeValueMap = Record<string, number | null>;

export type GradeBook = {
  id: string;
  school_id: string;
  teacher_subject_id: string;
  teacher_id: string | null;
  subject_id: string | null;
  classroom_id: string | null;
  academic_year: string;
  semester: string;
  status: GradeBookStatus;
  max_score: number;
  components: GradeComponent[] | null;
  created_at?: string | null;
  updated_at?: string | null;
  approved_at?: string | null;
};

export type GradeEntry = {
  id?: string;
  grade_book_id: string;
  student_id: string;
  values: GradeValueMap;
  total_score: number;
  max_score: number;
  percentage: number;
  grade_label: string;
  result_status: string;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StudentForGrades = {
  id: string;
  school_id: string | null;
  full_name: string | null;
  national_id?: string | null;
  student_number?: string | null;
  classroom_id?: string | null;
};

export type ConductScore = {
  id?: string;
  school_id: string;
  student_id: string;
  grading_scheme_id?: string | null;
  component_id?: string | null;
  score_type: ConductScoreType;
  score: number;
  max_score: number;
  semester?: string | null;
  academic_year?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ConductEvent = {
  id?: string;
  school_id: string;
  student_id: string;
  score_type: ConductScoreType;
  event_type: ConductAction;
  points: number;
  notes?: string | null;
  recorded_by?: string | null;
  semester?: string | null;
  academic_year?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EnsureGradeBookPayload = {
  school_id: string;
  teacher_subject_id: string;
  teacher_id?: string | null;
  subject_id?: string | null;
  classroom_id?: string | null;
  academic_year: string;
  semester: string;
  components: GradeComponent[];
};

export type UpsertGradeEntryPayload = Omit<GradeEntry, "id" | "created_at">;

export type LegacyGradeRecord = {
  id: string;
  school_id: string | null;
  student_id: string;
  subject_name: string;
  score: number;
  max_score: number;
  semester?: string;
  academic_year?: string;
  grade_label?: string;
  result_status?: "ناجح" | "متعثر" | string;
  created_at?: string | null;
};

export type GradeSaveResult = {
  saved: number;
  analytics: ReturnType<typeof buildGradeAnalytics>;
};

function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}

function fail<T>(error: unknown): ServiceResult<T> {
  return { data: null, error: handleError(error) };
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function isMissingTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("does not exist") ||
    message.includes("404") ||
    message.includes("Could not find") ||
    message.includes("relation")
  );
}

function normalizeComponents(value: GradeBook["components"]): GradeComponent[] {
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

function toServiceError(message: string) {
  return new Error(message);
}

function normalizeEntry(entry: UpsertGradeEntryPayload, components: GradeComponent[]) {
  const calculated = calculateEntryTotals({
    components,
    values: entry.values,
  });

  return {
    grade_book_id: entry.grade_book_id,
    student_id: entry.student_id,
    values: entry.values,
    total_score: calculated.total_score,
    max_score: calculated.max_score,
    percentage: calculated.percentage,
    grade_label: calculated.grade_label,
    result_status: calculated.result_status,
    notes: entry.notes ?? null,
    updated_at: new Date().toISOString(),
  };
}

async function getSubjectNames(schoolId: string, subjectIds: string[]) {
  if (subjectIds.length === 0) return new Map<string, SubjectForGrades>();

  const { data, error } = await supabase
    .from("subjects")
    .select("id, subject_name, subject_code")
    .eq("school_id", schoolId)
    .in("id", subjectIds);

  if (error) throw error;
  return new Map(((data ?? []) as SubjectForGrades[]).map((item) => [item.id, item]));
}

async function writeGradeAuditLog(input: {
  gradeBookId: string;
  action: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  actorUserId?: string | null;
  note?: string | null;
}) {
  try {
    await supabase.from("student_grade_audit_logs").insert({
      grade_book_id: input.gradeBookId,
      action: input.action,
      before_value: input.beforeValue ?? null,
      after_value: input.afterValue ?? null,
      actor_user_id: input.actorUserId ?? null,
      note: input.note ?? null,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Audit should not break grading in development if schema differs.
  }
}

export const GradesService = {
  isMissingTableError,

  async getTeacherSubjects(params: {
    schoolId: string;
    academicYear?: string | null;
    semester?: string | null;
  }): Promise<ServiceResult<TeacherSubjectForGrades[]>> {
    try {
      const { data, error } = await supabase
        .from("teacher_subjects")
        .select(
          "id, school_id, teacher_id, subject_id, grade_id, classroom_id, academic_year, semester, is_active, created_at",
        )
        .eq("school_id", params.schoolId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) return fail<TeacherSubjectForGrades[]>(error);

      const assignments = ((data ?? []) as TeacherSubjectForGrades[]).map((item) => ({
        ...item,
        teacher_id: item.teacher_id ?? null,
        subject_id: item.subject_id ?? null,
        classroom_id: item.classroom_id ?? null,
        academic_year: item.academic_year ?? params.academicYear ?? "1447",
        semester: item.semester ?? params.semester ?? "الفصل الدراسي الأول",
        is_active: item.is_active ?? true,
      }));

      if (assignments.length === 0) return ok([]);

      const teacherIds = uniqueIds(assignments.map((item) => item.teacher_id));
      const subjectIds = uniqueIds(assignments.map((item) => item.subject_id));
      const classroomIds = uniqueIds(assignments.map((item) => item.classroom_id));

      const [teachersResult, subjectsResult, classroomsResult] = await Promise.all([
        teacherIds.length > 0
          ? supabase
              .from("teachers")
              .select("id, full_name, email")
              .eq("school_id", params.schoolId)
              .in("id", teacherIds)
          : Promise.resolve({ data: [], error: null }),
        subjectIds.length > 0
          ? supabase
              .from("subjects")
              .select("id, subject_name, subject_code")
              .eq("school_id", params.schoolId)
              .in("id", subjectIds)
          : Promise.resolve({ data: [], error: null }),
        classroomIds.length > 0
          ? supabase
              .from("classrooms")
              .select("id, classroom_name, grade_id")
              .eq("school_id", params.schoolId)
              .in("id", classroomIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (teachersResult.error) return fail<TeacherSubjectForGrades[]>(teachersResult.error);
      if (subjectsResult.error) return fail<TeacherSubjectForGrades[]>(subjectsResult.error);
      if (classroomsResult.error) return fail<TeacherSubjectForGrades[]>(classroomsResult.error);

      const teachersMap = new Map(
        ((teachersResult.data ?? []) as TeacherForGrades[]).map((teacher) => [teacher.id, teacher]),
      );
      const subjectsMap = new Map(
        ((subjectsResult.data ?? []) as SubjectForGrades[]).map((subject) => [subject.id, subject]),
      );
      const classroomsMap = new Map(
        ((classroomsResult.data ?? []) as ClassroomForGrades[]).map((classroom) => [classroom.id, classroom]),
      );

      return ok(
        assignments.map((item) => ({
          ...item,
          teachers: item.teacher_id ? teachersMap.get(item.teacher_id) ?? null : null,
          subjects: item.subject_id ? subjectsMap.get(item.subject_id) ?? null : null,
          classrooms: item.classroom_id ? classroomsMap.get(item.classroom_id) ?? null : null,
        })),
      );
    } catch (error) {
      return fail<TeacherSubjectForGrades[]>(error);
    }
  },

  async getStudents(params: {
    schoolId: string;
    classroomId?: string | null;
  }): Promise<ServiceResult<StudentForGrades[]>> {
    try {
      let query = supabase
        .from("students")
        .select("id, school_id, full_name, national_id, student_number, classroom_id")
        .eq("school_id", params.schoolId)
        .order("full_name", { ascending: true });

      if (params.classroomId) query = query.eq("classroom_id", params.classroomId);

      const { data, error } = await query;
      if (error) return fail<StudentForGrades[]>(error);

      return ok((data ?? []) as StudentForGrades[]);
    } catch (error) {
      return fail<StudentForGrades[]>(error);
    }
  },

  async getGradeBook(params: {
    schoolId: string;
    teacherSubjectId: string;
    academicYear: string;
    semester: string;
  }): Promise<ServiceResult<GradeBook | null>> {
    try {
      const { data, error } = await supabase
        .from("grade_books")
        .select("*")
        .eq("school_id", params.schoolId)
        .eq("teacher_subject_id", params.teacherSubjectId)
        .eq("academic_year", params.academicYear)
        .eq("semester", params.semester)
        .maybeSingle();

      if (error) return fail<GradeBook | null>(error);
      return ok((data as GradeBook) ?? null);
    } catch (error) {
      return fail<GradeBook | null>(error);
    }
  },

  async getGradeBookById(gradeBookId: string): Promise<ServiceResult<GradeBook | null>> {
    try {
      const { data, error } = await supabase
        .from("grade_books")
        .select("*")
        .eq("id", gradeBookId)
        .maybeSingle();

      if (error) return fail<GradeBook | null>(error);
      return ok((data as GradeBook) ?? null);
    } catch (error) {
      return fail<GradeBook | null>(error);
    }
  },

  async ensureGradeBook(payload: EnsureGradeBookPayload): Promise<ServiceResult<GradeBook>> {
    const existing = await this.getGradeBook({
      schoolId: payload.school_id,
      teacherSubjectId: payload.teacher_subject_id,
      academicYear: payload.academic_year,
      semester: payload.semester,
    });

    if (existing.error) return fail<GradeBook>(existing.error);
    if (existing.data) return ok(existing.data);

    try {
      const components = normalizeComponents(payload.components);
      const maxScore =
        components.reduce((sum, component) => sum + Number(component.max_score || 0), 0) || 100;

      const { data, error } = await supabase
        .from("grade_books")
        .insert({
          school_id: payload.school_id,
          teacher_subject_id: payload.teacher_subject_id,
          teacher_id: payload.teacher_id ?? null,
          subject_id: payload.subject_id ?? null,
          classroom_id: payload.classroom_id ?? null,
          academic_year: payload.academic_year,
          semester: payload.semester,
          status: "draft",
          max_score: maxScore,
          components,
        })
        .select()
        .single();

      if (error) return fail<GradeBook>(error);
      return ok(data as GradeBook);
    } catch (error) {
      return fail<GradeBook>(error);
    }
  },

  async getEntries(gradeBookId: string): Promise<ServiceResult<GradeEntry[]>> {
    try {
      const { data, error } = await supabase
        .from("grade_entries")
        .select("*")
        .eq("grade_book_id", gradeBookId);

      if (error) return fail<GradeEntry[]>(error);
      return ok((data ?? []) as GradeEntry[]);
    } catch (error) {
      return fail<GradeEntry[]>(error);
    }
  },

  async upsertEntries(
    entries: UpsertGradeEntryPayload[],
    options?: {
      actorUserId?: string | null;
      validateOnly?: boolean;
    },
  ): Promise<ServiceResult<GradeSaveResult>> {
    if (entries.length === 0) {
      return ok({
        saved: 0,
        analytics: buildGradeAnalytics([]),
      });
    }

    try {
      const gradeBookId = entries[0].grade_book_id;
      const sameBook = entries.every((entry) => entry.grade_book_id === gradeBookId);

      if (!sameBook) {
        return fail<GradeSaveResult>(
          toServiceError("لا يمكن حفظ درجات تابعة لأكثر من سجل درجات في نفس العملية."),
        );
      }

      const bookResult = await this.getGradeBookById(gradeBookId);
      if (bookResult.error) return fail<GradeSaveResult>(bookResult.error);
      if (!bookResult.data) return fail<GradeSaveResult>(toServiceError("لم يتم العثور على سجل الدرجات."));

      const book = bookResult.data;
      if (!canSaveGradeBook(book.status)) {
        return fail<GradeSaveResult>(
          toServiceError("لا يمكن تعديل سجل درجات غير قابل للتحرير أو مقفل."),
        );
      }

      const components = normalizeComponents(book.components);

      const normalized = entries.map((entry) => {
        const issues = validateGradeEntry({
          student_id: entry.student_id,
          values: entry.values,
          total_score: entry.total_score,
          max_score: entry.max_score,
          percentage: entry.percentage,
          components,
        });

        if (hasBlockingIssues(issues)) {
          throw toServiceError(issues.find((issue) => issue.level === "error")?.message ?? "توجد أخطاء في الدرجات.");
        }

        return normalizeEntry(entry, components);
      });

      const analyticsInput: GradeAnalyticsInput[] = normalized.map((entry) => ({
        student_id: entry.student_id,
        total_score: entry.total_score,
        max_score: entry.max_score,
        percentage: entry.percentage,
        grade_label: entry.grade_label,
        result_status: entry.result_status,
      }));

      const analytics = buildGradeAnalytics(analyticsInput);

      if (options?.validateOnly) {
        return ok({
          saved: 0,
          analytics,
        });
      }

      const { error } = await supabase.from("grade_entries").upsert(normalized, {
        onConflict: "grade_book_id,student_id",
      });

      if (error) return fail<GradeSaveResult>(error);

      await writeGradeAuditLog({
        gradeBookId,
        action: "upsert_entries",
        afterValue: normalized,
        actorUserId: options?.actorUserId ?? null,
      });

      return ok({
        saved: normalized.length,
        analytics,
      });
    } catch (error) {
      return fail<GradeSaveResult>(error);
    }
  },

  async updateStatus(params: {
    gradeBookId: string;
    status: GradeBookStatus;
    actorUserId?: string | null;
    role?: "super_admin" | "school_admin" | "vice_principal" | "teacher" | "student" | "parent" | null;
    note?: string | null;
  }): Promise<ServiceResult<GradeBook>> {
    try {
      const context =
        params.role || params.actorUserId
          ? {
              actor: {
                userId: params.actorUserId ?? null,
                role: params.role ?? null,
              },
              note: params.note ?? null,
            }
          : undefined;

      if (context) {
        const updated =
          params.status === "submitted"
            ? await GradingWorkflow.submit(params.gradeBookId, context)
            : params.status === "approved"
              ? await GradingWorkflow.approve(params.gradeBookId, context)
              : params.status === "locked"
                ? await GradingWorkflow.lock(params.gradeBookId, context)
                : params.status === "reopened"
                  ? await GradingWorkflow.reopen(params.gradeBookId, context)
                  : null;

        if (updated) return ok(updated as GradeBook);
      }

      const bookResult = await this.getGradeBookById(params.gradeBookId);
      if (bookResult.error) return fail<GradeBook>(bookResult.error);
      if (!bookResult.data) return fail<GradeBook>(toServiceError("لم يتم العثور على سجل الدرجات."));

      if (bookResult.data.status === "locked" && params.status !== "reopened") {
        return fail<GradeBook>(toServiceError("لا يمكن تعديل حالة سجل مقفل إلا بإعادة فتحه."));
      }

      const { data, error } = await supabase
        .from("grade_books")
        .update({
          status: params.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.gradeBookId)
        .select()
        .single();

      if (error) return fail<GradeBook>(error);

      await writeGradeAuditLog({
        gradeBookId: params.gradeBookId,
        action: `status_${params.status}`,
        beforeValue: bookResult.data.status,
        afterValue: params.status,
        actorUserId: params.actorUserId ?? null,
        note: params.note ?? null,
      });

      return ok(data as GradeBook);
    } catch (error) {
      return fail<GradeBook>(error);
    }
  },

  async getConductScores(params: {
    schoolId: string;
    academicYear: string;
    semester: string;
  }): Promise<ServiceResult<ConductScore[]>> {
    try {
      const { data, error } = await supabase
        .from("student_conduct_scores")
        .select("*")
        .eq("school_id", params.schoolId)
        .eq("academic_year", params.academicYear)
        .eq("semester", params.semester);

      if (error) {
        if (isMissingTableError(error)) return ok([]);
        return fail<ConductScore[]>(error);
      }

      return ok((data ?? []) as ConductScore[]);
    } catch (error) {
      return fail<ConductScore[]>(error);
    }
  },

  async upsertConductScore(
    payload: Omit<ConductScore, "id" | "created_at"> & { id?: string },
  ): Promise<ServiceResult<ConductScore>> {
    try {
      const issues = validateConductScore({
        score: payload.score,
        maxScore: payload.max_score,
        field: payload.score_type === "behavior" ? "السلوك" : "المواظبة",
      });

      if (hasBlockingIssues(issues)) {
        return fail<ConductScore>(
          toServiceError(issues.find((issue) => issue.level === "error")?.message ?? "درجة السلوك/المواظبة غير صحيحة."),
        );
      }

      const dataToSave = {
        school_id: payload.school_id,
        student_id: payload.student_id,
        grading_scheme_id: payload.grading_scheme_id ?? null,
        component_id: payload.component_id ?? null,
        score_type: payload.score_type,
        score: payload.score,
        max_score: payload.max_score,
        semester: payload.semester ?? null,
        academic_year: payload.academic_year ?? null,
        updated_at: new Date().toISOString(),
      };

      const result = payload.id
        ? await supabase
            .from("student_conduct_scores")
            .update(dataToSave)
            .eq("id", payload.id)
            .select()
            .single()
        : await supabase
            .from("student_conduct_scores")
            .insert(dataToSave)
            .select()
            .single();

      if (result.error) return fail<ConductScore>(result.error);
      return ok(result.data as ConductScore);
    } catch (error) {
      return fail<ConductScore>(error);
    }
  },

  async getConductEvents(params: {
    schoolId: string;
    academicYear: string;
    semester: string;
  }): Promise<ServiceResult<ConductEvent[]>> {
    try {
      const { data, error } = await supabase
        .from("student_conduct_events")
        .select("*")
        .eq("school_id", params.schoolId)
        .eq("academic_year", params.academicYear)
        .eq("semester", params.semester)
        .order("created_at", { ascending: false });

      if (error) {
        if (isMissingTableError(error)) return ok([]);
        return fail<ConductEvent[]>(error);
      }

      return ok((data ?? []) as ConductEvent[]);
    } catch (error) {
      return fail<ConductEvent[]>(error);
    }
  },

  async createConductEvent(payload: Omit<ConductEvent, "id" | "created_at">): Promise<ServiceResult<ConductEvent>> {
    try {
      const issues = validateConductScore({
        score: payload.points,
        maxScore: 100,
        field: payload.score_type === "behavior" ? "نقاط السلوك" : "نقاط المواظبة",
      });

      if (payload.points < 0 || hasBlockingIssues(issues)) {
        return fail<ConductEvent>(toServiceError("نقاط الحدث غير صحيحة."));
      }

      const { data, error } = await supabase
        .from("student_conduct_events")
        .insert({
          school_id: payload.school_id,
          student_id: payload.student_id,
          score_type: payload.score_type,
          event_type: payload.event_type,
          points: payload.points,
          notes: payload.notes ?? null,
          recorded_by: payload.recorded_by ?? null,
          semester: payload.semester ?? null,
          academic_year: payload.academic_year ?? null,
        })
        .select()
        .single();

      if (error) return fail<ConductEvent>(error);
      return ok(data as ConductEvent);
    } catch (error) {
      return fail<ConductEvent>(error);
    }
  },

  async getAnalytics(gradeBookId: string): Promise<ServiceResult<ReturnType<typeof buildGradeAnalytics>>> {
    try {
      const entriesResult = await this.getEntries(gradeBookId);
      if (entriesResult.error) return fail<ReturnType<typeof buildGradeAnalytics>>(entriesResult.error);

      const analyticsInput: GradeAnalyticsInput[] = (entriesResult.data ?? []).map((entry) => ({
        student_id: entry.student_id,
        total_score: Number(entry.total_score ?? 0),
        max_score: Number(entry.max_score ?? 100),
        percentage: Number(entry.percentage ?? 0),
        grade_label: entry.grade_label,
        result_status: entry.result_status,
      }));

      return ok(buildGradeAnalytics(analyticsInput));
    } catch (error) {
      return fail<ReturnType<typeof buildGradeAnalytics>>(error);
    }
  },

  async exportGradeSheet(params: {
    schoolId: string;
    gradeBookId: string;
    format?: ReportFormat;
    printedBy?: string | null;
  }): Promise<ServiceResult<null>> {
    try {
      const result = await ReportBuilder.gradeSheet({
        schoolId: params.schoolId,
        gradeBookId: params.gradeBookId,
        format: params.format ?? "pdf",
        printedBy: params.printedBy ?? null,
      });

      if (!result.success) return fail<null>(toServiceError(result.error ?? "تعذر إنشاء التقرير."));
      return ok(null);
    } catch (error) {
      return fail<null>(error);
    }
  },

  async getAll(schoolId?: string): Promise<ServiceResult<LegacyGradeRecord[]>> {
    if (!schoolId) return ok([]);

    try {
      const { data, error } = await supabase
        .from("grade_books")
        .select("id, school_id, subject_id, academic_year, semester, grade_entries(*)")
        .eq("school_id", schoolId);

      if (error) return fail<LegacyGradeRecord[]>(error);

      const books = (data ?? []) as Array<GradeBook & { grade_entries?: GradeEntry[] }>;
      const subjectMap = await getSubjectNames(schoolId, uniqueIds(books.map((book) => book.subject_id)));

      const rows = books.flatMap((book) =>
        (book.grade_entries ?? []).map((entry) => ({
          id: entry.id ?? `${book.id}-${entry.student_id}`,
          school_id: book.school_id,
          student_id: entry.student_id,
          subject_name: book.subject_id
            ? subjectMap.get(book.subject_id)?.subject_name ?? "غير محدد"
            : "غير محدد",
          score: Number(entry.total_score ?? 0),
          max_score: Number(entry.max_score ?? 100),
          semester: book.semester,
          academic_year: book.academic_year,
          grade_label: entry.grade_label,
          result_status: entry.result_status,
          created_at: entry.created_at ?? null,
        })),
      );

      return ok(rows);
    } catch (error) {
      return fail<LegacyGradeRecord[]>(error);
    }
  },

  async getByStudent(params: {
    schoolId: string;
    studentId: string;
  }): Promise<ServiceResult<LegacyGradeRecord[]>> {
    const all = await this.getAll(params.schoolId);
    if (all.error) return fail<LegacyGradeRecord[]>(all.error);
    return ok((all.data ?? []).filter((item) => item.student_id === params.studentId));
  },
};


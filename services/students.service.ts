import { supabase } from "@/lib/supabase";
import type { Student } from "@/types/student";
import { handleError, type ServiceResult } from "./base.service";

const STUDENTS_TABLE = "students";
const ATTENDANCE_TABLE = "student_attendance";
const STAGES_TABLE = "stages";
const GRADES_TABLE = "grades";
const CLASSROOMS_TABLE = "classrooms";

export type StudentRecord = {
  id: string;
  school_id: string | null;
  student_number?: string | null;
  national_id?: string | null;
  full_name: string;
  gender?: "ذكر" | "أنثى" | null;
  birth_date?: string | null;
  stage_id?: string | null;
  grade_id?: string | null;
  classroom_id?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type StageRecord = {
  id: string;
  stage_name: string | null;
};

type GradeRecord = {
  id: string;
  grade_name: string | null;
};

type ClassroomRecord = {
  id: string;
  classroom_name: string | null;
};

export type StudentAttendanceRecord = {
  id: string;
  school_id?: string | null;
  student_id: string;
  attendance_date: string;
  status: string;
};

export type StudentPeriodScoreRecord = {
  id?: string;
  school_id: string;
  student_id: string;
  school_subject_id: string;
  school_period_id?: string | null;
  school_item_id?: string | null;
  score: number | null;
};

export type SchoolGradeSubjectRecord = {
  id: string;
  school_id: string;
  grade_level: string | null;
  subject: string | null;
  total_score: number | null;
  is_active: boolean | null;
};

export type StudentPayload = {
  school_id: string;
  full_name: string;
  student_number?: string | null;
  national_id?: string | null;
  gender?: "ذكر" | "أنثى" | null;
  birth_date?: string | null;
  stage_id?: string | null;
  grade_id?: string | null;
  classroom_id?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  status?: string | null;
};

export type StudentsDashboardData = {
  students: Student[];
  attendance: StudentAttendanceRecord[];
  scores: StudentPeriodScoreRecord[];
  gradeSubjects: SchoolGradeSubjectRecord[];
};

export type AttendanceStatus = "حاضر" | "غائب" | "متأخر" | "عيادة";

function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}

function fail<T>(error: unknown): ServiceResult<T> {
  return { data: null, error: handleError(error) };
}

function normalizeStatus(status?: string | null): "active" | "inactive" {
  return status === "inactive" ? "inactive" : "active";
}

function mapStudentRecordToStudent(
  row: StudentRecord,
  stagesMap: Map<string, string>,
  gradesMap: Map<string, string>,
  classroomsMap: Map<string, string>,
): Student {
  return {
    id: row.id,
    school_id: row.school_id ?? null,

    student_number: row.student_number ?? null,
    national_id: row.national_id ?? null,
    full_name: row.full_name,

    gender: row.gender ?? null,
    birth_date: row.birth_date ?? null,

    stage_name: row.stage_id ? stagesMap.get(row.stage_id) ?? null : null,
    grade_name: row.grade_id ? gradesMap.get(row.grade_id) ?? null : null,
    classroom_name: row.classroom_id
      ? classroomsMap.get(row.classroom_id) ?? null
      : null,

    academic_year: null,
    semester: null,

    guardian_name: row.guardian_name ?? null,
    guardian_phone: row.guardian_phone ?? null,
    guardian_email: row.guardian_email ?? null,

    status: normalizeStatus(row.status),

    created_at: row.created_at ?? null,
    updated_at: null,
  };
}

async function getLookups(schoolId?: string) {
  let stagesQuery = supabase.from(STAGES_TABLE).select("id, stage_name");
  let gradesQuery = supabase.from(GRADES_TABLE).select("id, grade_name");
  let classroomsQuery = supabase
    .from(CLASSROOMS_TABLE)
    .select("id, classroom_name");

  if (schoolId) {
    stagesQuery = stagesQuery.eq("school_id", schoolId);
    gradesQuery = gradesQuery.eq("school_id", schoolId);
    classroomsQuery = classroomsQuery.eq("school_id", schoolId);
  }

  const [stagesResult, gradesResult, classroomsResult] = await Promise.all([
    stagesQuery,
    gradesQuery,
    classroomsQuery,
  ]);

  if (stagesResult.error) throw stagesResult.error;
  if (gradesResult.error) throw gradesResult.error;
  if (classroomsResult.error) throw classroomsResult.error;

  const stagesMap = new Map(
    ((stagesResult.data ?? []) as StageRecord[]).map((item) => [
      item.id,
      item.stage_name ?? "",
    ]),
  );

  const gradesMap = new Map(
    ((gradesResult.data ?? []) as GradeRecord[]).map((item) => [
      item.id,
      item.grade_name ?? "",
    ]),
  );

  const classroomsMap = new Map(
    ((classroomsResult.data ?? []) as ClassroomRecord[]).map((item) => [
      item.id,
      item.classroom_name ?? "",
    ]),
  );

  return { stagesMap, gradesMap, classroomsMap };
}

export const StudentsService = {
  async getAll(schoolId?: string): Promise<ServiceResult<Student[]>> {
    try {
      let query = supabase
        .from(STUDENTS_TABLE)
        .select(
          "id, school_id, student_number, national_id, full_name, gender, birth_date, stage_id, grade_id, classroom_id, guardian_name, guardian_phone, guardian_email, status, created_at",
        )
        .order("created_at", { ascending: false });

      if (schoolId) query = query.eq("school_id", schoolId);

      const { data, error } = await query;

      if (error) return fail<Student[]>(error);

      const { stagesMap, gradesMap, classroomsMap } = await getLookups(
        schoolId,
      );

      const students = ((data ?? []) as StudentRecord[]).map((row) =>
        mapStudentRecordToStudent(row, stagesMap, gradesMap, classroomsMap),
      );

      return ok(students);
    } catch (error) {
      return fail<Student[]>(error);
    }
  },

  async getById(id: string): Promise<ServiceResult<StudentRecord>> {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select(
        "id, school_id, student_number, national_id, full_name, gender, birth_date, stage_id, grade_id, classroom_id, guardian_name, guardian_phone, guardian_email, status, created_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return fail<StudentRecord>(error);
    return ok(data as StudentRecord);
  },

  async getAttendance(
    schoolId: string,
  ): Promise<ServiceResult<StudentAttendanceRecord[]>> {
    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .select("id, school_id, student_id, attendance_date, status")
      .eq("school_id", schoolId);

    if (error) return fail<StudentAttendanceRecord[]>(error);
    return ok((data ?? []) as StudentAttendanceRecord[]);
  },

  async getScores(
    schoolId: string,
  ): Promise<ServiceResult<StudentPeriodScoreRecord[]>> {
    void schoolId;
    return ok([]);
  },

  async getGradeSubjects(
    schoolId: string,
  ): Promise<ServiceResult<SchoolGradeSubjectRecord[]>> {
    void schoolId;
    return ok([]);
  },

  async getDashboard(
    schoolId: string,
  ): Promise<ServiceResult<StudentsDashboardData>> {
    const [students, attendance, scores, gradeSubjects] = await Promise.all([
      this.getAll(schoolId),
      this.getAttendance(schoolId),
      this.getScores(schoolId),
      this.getGradeSubjects(schoolId),
    ]);

    const firstError =
      students.error || attendance.error || scores.error || gradeSubjects.error;

    return {
      data: {
        students: students.data ?? [],
        attendance: attendance.data ?? [],
        scores: scores.data ?? [],
        gradeSubjects: gradeSubjects.data ?? [],
      },
      error: firstError,
    };
  },

  async create(payload: StudentPayload): Promise<ServiceResult<StudentRecord>> {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .insert(payload)
      .select(
        "id, school_id, student_number, national_id, full_name, gender, birth_date, stage_id, grade_id, classroom_id, guardian_name, guardian_phone, guardian_email, status, created_at",
      )
      .single();

    if (error) return fail<StudentRecord>(error);
    return ok(data as StudentRecord);
  },

  async update(
    schoolId: string,
    id: string,
    payload: StudentPayload,
  ): Promise<ServiceResult<StudentRecord>> {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .update(payload)
      .eq("id", id)
      .eq("school_id", schoolId)
      .select(
        "id, school_id, student_number, national_id, full_name, gender, birth_date, stage_id, grade_id, classroom_id, guardian_name, guardian_phone, guardian_email, status, created_at",
      )
      .single();

    if (error) return fail<StudentRecord>(error);
    return ok(data as StudentRecord);
  },

  async remove(schoolId: string, id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from(STUDENTS_TABLE)
      .delete()
      .eq("id", id)
      .eq("school_id", schoolId);

    if (error) return fail<null>(error);
    return ok(null);
  },

  async removeMany(
    schoolId: string,
    ids: string[],
  ): Promise<ServiceResult<null>> {
    if (ids.length === 0) return ok(null);

    const { error } = await supabase
      .from(STUDENTS_TABLE)
      .delete()
      .eq("school_id", schoolId)
      .in("id", ids);

    if (error) return fail<null>(error);
    return ok(null);
  },

  async updateStatus(
    schoolId: string,
    ids: string[],
    status: string,
  ): Promise<ServiceResult<null>> {
    if (ids.length === 0) return ok(null);

    const { error } = await supabase
      .from(STUDENTS_TABLE)
      .update({ status })
      .eq("school_id", schoolId)
      .in("id", ids);

    if (error) return fail<null>(error);
    return ok(null);
  },

  async markAttendance(params: {
    schoolId: string;
    studentId: string;
    date: string;
    status: AttendanceStatus;
  }): Promise<ServiceResult<null>> {
    const { error } = await supabase.from(ATTENDANCE_TABLE).upsert(
      {
        school_id: params.schoolId,
        student_id: params.studentId,
        attendance_date: params.date,
        status: params.status,
      },
      {
        onConflict: "student_id,attendance_date",
      },
    );

    if (error) return fail<null>(error);
    return ok(null);
  },
};

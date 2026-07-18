import { supabase } from "@/lib/supabase";

type TeacherRelation = {
  id: string;
  full_name: string | null;
  email: string | null;
} | null;

type SubjectRelation = {
  id: string;
  subject_name: string | null;
  subject_code: string | null;
} | null;

type ClassroomRelation = {
  id: string;
  classroom_name: string | null;
  grade_name: string | null;
  section: string | null;
} | null;

export type TeacherSubjectRow = {
  id: string;
  school_id: string;
  teacher_id: string | null;
  subject_id: string | null;
  classroom_id: string | null;
  academic_year: string | null;
  semester: string | null;
  is_active: boolean | null;
  created_at: string | null;
  teachers?: TeacherRelation;
  subjects?: SubjectRelation;
  classrooms?: ClassroomRelation;
};

export type TeacherSubjectFormInput = {
  school_id: string;
  teacher_id: string;
  subject_id: string;
  classroom_id: string;
  academic_year: string;
  semester: string;
  is_active?: boolean;
};

type TeacherSubjectPayload = {
  school_id?: string;
  teacher_id?: string;
  subject_id?: string;
  classroom_id?: string;
  academic_year?: string;
  semester?: string;
  is_active?: boolean;
};

function firstRelation<T>(value: unknown): T | null {
  if (Array.isArray(value)) {
    return (value[0] ?? null) as T | null;
  }

  return (value ?? null) as T | null;
}

function normalizeTeacher(value: unknown): TeacherRelation {
  const teacher = firstRelation<{
    id?: unknown;
    full_name?: string | null;
    email?: string | null;
  }>(value);

  if (!teacher) return null;

  return {
    id: String(teacher.id ?? ""),
    full_name: teacher.full_name ?? null,
    email: teacher.email ?? null,
  };
}

function normalizeSubject(value: unknown): SubjectRelation {
  const subject = firstRelation<{
    id?: unknown;
    subject_name?: string | null;
    subject_code?: string | null;
  }>(value);

  if (!subject) return null;

  return {
    id: String(subject.id ?? ""),
    subject_name: subject.subject_name ?? null,
    subject_code: subject.subject_code ?? null,
  };
}

function normalizeClassroom(value: unknown): ClassroomRelation {
  const classroom = firstRelation<{
    id?: unknown;
    classroom_name?: string | null;
    grade_name?: string | null;
    section?: string | null;
  }>(value);

  if (!classroom) return null;

  return {
    id: String(classroom.id ?? ""),
    classroom_name: classroom.classroom_name ?? null,
    grade_name: classroom.grade_name ?? null,
    section: classroom.section ?? null,
  };
}

function normalizeTeacherSubjectRow(row: unknown): TeacherSubjectRow {
  const item = row as TeacherSubjectRow & {
    teachers?: unknown;
    subjects?: unknown;
    classrooms?: unknown;
  };

  return {
    id: String(item.id),
    school_id: String(item.school_id),
    teacher_id: item.teacher_id ?? null,
    subject_id: item.subject_id ?? null,
    classroom_id: item.classroom_id ?? null,
    academic_year: item.academic_year ?? null,
    semester: item.semester ?? null,
    is_active: item.is_active ?? null,
    created_at: item.created_at ?? null,
    teachers: normalizeTeacher(item.teachers),
    subjects: normalizeSubject(item.subjects),
    classrooms: normalizeClassroom(item.classrooms),
  };
}

function normalizeRows(data: unknown[] | null): TeacherSubjectRow[] {
  return (data ?? []).map(normalizeTeacherSubjectRow);
}

function buildCreatePayload(
  input: TeacherSubjectFormInput,
): TeacherSubjectPayload {
  return {
    school_id: input.school_id,
    teacher_id: input.teacher_id,
    subject_id: input.subject_id,
    classroom_id: input.classroom_id,
    academic_year: input.academic_year,
    semester: input.semester,
    is_active: input.is_active ?? true,
  };
}

function buildUpdatePayload(
  input: Partial<TeacherSubjectFormInput>,
): TeacherSubjectPayload {
  const payload: TeacherSubjectPayload = {};

  if ("school_id" in input && input.school_id !== undefined) {
    payload.school_id = input.school_id;
  }

  if ("teacher_id" in input && input.teacher_id !== undefined) {
    payload.teacher_id = input.teacher_id;
  }

  if ("subject_id" in input && input.subject_id !== undefined) {
    payload.subject_id = input.subject_id;
  }

  if ("classroom_id" in input && input.classroom_id !== undefined) {
    payload.classroom_id = input.classroom_id;
  }

  if ("academic_year" in input && input.academic_year !== undefined) {
    payload.academic_year = input.academic_year;
  }

  if ("semester" in input && input.semester !== undefined) {
    payload.semester = input.semester;
  }

  if ("is_active" in input && input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  return payload;
}

const TEACHER_SUBJECT_SELECT = `
  id,
  school_id,
  teacher_id,
  subject_id,
  classroom_id,
  academic_year,
  semester,
  is_active,
  created_at,
  teachers (
    id,
    full_name,
    email
  ),
  subjects (
    id,
    subject_name,
    subject_code
  ),
  classrooms (
    id,
    classroom_name,
    grade_name,
    section
  )
`;

const TEACHER_SUBJECT_TEACHER_SELECT = `
  id,
  school_id,
  teacher_id,
  subject_id,
  classroom_id,
  academic_year,
  semester,
  is_active,
  created_at,
  subjects (
    id,
    subject_name,
    subject_code
  ),
  classrooms (
    id,
    classroom_name,
    grade_name,
    section
  )
`;

export const TeacherSubjectsService = {
  async listBySchool(schoolId: string): Promise<TeacherSubjectRow[]> {
    const { data, error } = await supabase
      .from("teacher_subjects")
      .select(TEACHER_SUBJECT_SELECT)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return normalizeRows(data as unknown[]);
  },

  async listByTeacher(input: {
    schoolId: string;
    teacherId: string;
    academicYear?: string;
    semester?: string;
  }): Promise<TeacherSubjectRow[]> {
    let query = supabase
      .from("teacher_subjects")
      .select(TEACHER_SUBJECT_TEACHER_SELECT)
      .eq("school_id", input.schoolId)
      .eq("teacher_id", input.teacherId)
      .eq("is_active", true);

    if (input.academicYear) {
      query = query.eq("academic_year", input.academicYear);
    }

    if (input.semester) {
      query = query.eq("semester", input.semester);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    return normalizeRows(data as unknown[]);
  },

  async create(input: TeacherSubjectFormInput): Promise<TeacherSubjectRow> {
    const { data, error } = await supabase
      .from("teacher_subjects")
      .insert(buildCreatePayload(input))
      .select(TEACHER_SUBJECT_SELECT)
      .single();

    if (error) throw error;

    return normalizeTeacherSubjectRow(data);
  },

  async update(
    id: string,
    input: Partial<TeacherSubjectFormInput>,
  ): Promise<TeacherSubjectRow> {
    const { data, error } = await supabase
      .from("teacher_subjects")
      .update(buildUpdatePayload(input))
      .eq("id", id)
      .select(TEACHER_SUBJECT_SELECT)
      .single();

    if (error) throw error;

    return normalizeTeacherSubjectRow(data);
  },

  async setActive(
    id: string,
    isActive: boolean,
  ): Promise<TeacherSubjectRow> {
    const { data, error } = await supabase
      .from("teacher_subjects")
      .update({ is_active: isActive })
      .eq("id", id)
      .select(TEACHER_SUBJECT_SELECT)
      .single();

    if (error) throw error;

    return normalizeTeacherSubjectRow(data);
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("teacher_subjects")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return true;
  },
};

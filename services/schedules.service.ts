import { supabase } from "@/lib/supabase";

type TeacherRelation = {
  id: string;
  full_name: string | null;
  teacher_name?: string | null;
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

export type TeacherSubjectScheduleRow = {
  id: string;
  school_id: string;
  teacher_id: string;
  subject_id: string;
  classroom_id: string | null;
  academic_year: string | null;
  semester: string | null;
  is_active: boolean | null;
  teachers?: TeacherRelation;
  subjects?: SubjectRelation;
  classrooms?: ClassroomRelation;
};

export type ScheduleRow = {
  id: string;
  school_id: string;
  teacher_subject_id: string;
  day_name: string;
  period_number: number;
  start_time: string | null;
  end_time: string | null;
  room_name: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

export type ScheduleInput = {
  school_id: string;
  teacher_subject_id: string;
  day_name: string;
  period_number: number;
  start_time?: string | null;
  end_time?: string | null;
  room_name?: string | null;
  is_active?: boolean;
};

type SchedulePayload = {
  school_id?: string;
  teacher_subject_id?: string;
  day_name?: string;
  period_number?: number;
  start_time?: string | null;
  end_time?: string | null;
  room_name?: string | null;
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
    teacher_name?: string | null;
    email?: string | null;
  }>(value);

  if (!teacher) return null;

  return {
    id: String(teacher.id ?? ""),
    full_name: teacher.full_name ?? null,
    teacher_name: teacher.teacher_name ?? null,
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

function normalizeAssignmentRow(row: unknown): TeacherSubjectScheduleRow {
  const item = row as TeacherSubjectScheduleRow & {
    teachers?: unknown;
    subjects?: unknown;
    classrooms?: unknown;
  };

  return {
    id: String(item.id),
    school_id: String(item.school_id),
    teacher_id: String(item.teacher_id ?? ""),
    subject_id: String(item.subject_id ?? ""),
    classroom_id: item.classroom_id ?? null,
    academic_year: item.academic_year ?? null,
    semester: item.semester ?? null,
    is_active: item.is_active ?? null,
    teachers: normalizeTeacher(item.teachers),
    subjects: normalizeSubject(item.subjects),
    classrooms: normalizeClassroom(item.classrooms),
  };
}

function normalizeAssignmentRows(
  data: unknown[] | null,
): TeacherSubjectScheduleRow[] {
  return (data ?? []).map(normalizeAssignmentRow);
}

function normalizeScheduleRow(row: unknown): ScheduleRow {
  const item = row as ScheduleRow;

  return {
    id: String(item.id),
    school_id: String(item.school_id),
    teacher_subject_id: String(item.teacher_subject_id),
    day_name: String(item.day_name),
    period_number: Number(item.period_number),
    start_time: item.start_time ?? null,
    end_time: item.end_time ?? null,
    room_name: item.room_name ?? null,
    is_active: item.is_active ?? null,
    created_at: item.created_at ?? null,
  };
}

function normalizeScheduleRows(data: unknown[] | null): ScheduleRow[] {
  return (data ?? []).map(normalizeScheduleRow);
}

function buildSchedulePayload(input: ScheduleInput): SchedulePayload {
  return {
    school_id: input.school_id,
    teacher_subject_id: input.teacher_subject_id,
    day_name: input.day_name,
    period_number: input.period_number,
    start_time: input.start_time ?? null,
    end_time: input.end_time ?? null,
    room_name: input.room_name ?? null,
    is_active: input.is_active ?? true,
  };
}

function buildUpdatePayload(input: Partial<ScheduleInput>): SchedulePayload {
  const payload: SchedulePayload = {};

  if ("school_id" in input && input.school_id !== undefined) {
    payload.school_id = input.school_id;
  }

  if ("teacher_subject_id" in input && input.teacher_subject_id !== undefined) {
    payload.teacher_subject_id = input.teacher_subject_id;
  }

  if ("day_name" in input && input.day_name !== undefined) {
    payload.day_name = input.day_name;
  }

  if ("period_number" in input && input.period_number !== undefined) {
    payload.period_number = input.period_number;
  }

  if ("start_time" in input) {
    payload.start_time = input.start_time ?? null;
  }

  if ("end_time" in input) {
    payload.end_time = input.end_time ?? null;
  }

  if ("room_name" in input) {
    payload.room_name = input.room_name ?? null;
  }

  if ("is_active" in input && input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  return payload;
}

const TEACHER_ASSIGNMENT_SELECT = `
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
    teacher_name,
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

const SCHEDULE_SELECT = `
  id,
  school_id,
  teacher_subject_id,
  day_name,
  period_number,
  start_time,
  end_time,
  room_name,
  is_active,
  created_at
`;

export const SchedulesService = {
  async listAssignments(
    schoolId: string,
  ): Promise<TeacherSubjectScheduleRow[]> {
    const { data, error } = await supabase
      .from("teacher_subjects")
      .select(TEACHER_ASSIGNMENT_SELECT)
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return normalizeAssignmentRows(data as unknown[]);
  },

  async listBySchool(schoolId: string): Promise<ScheduleRow[]> {
    const { data, error } = await supabase
      .from("schedules")
      .select(SCHEDULE_SELECT)
      .eq("school_id", schoolId)
      .order("day_name", { ascending: true })
      .order("period_number", { ascending: true });

    if (error) throw error;

    return normalizeScheduleRows(data as unknown[]);
  },

  async create(input: ScheduleInput): Promise<ScheduleRow> {
    const { data, error } = await supabase
      .from("schedules")
      .insert(buildSchedulePayload(input))
      .select(SCHEDULE_SELECT)
      .single();

    if (error) throw error;

    return normalizeScheduleRow(data);
  },

  async bulkCreate(items: ScheduleInput[]): Promise<ScheduleRow[]> {
    if (items.length === 0) return [];

    const payload = items.map(buildSchedulePayload);

    const { data, error } = await supabase
      .from("schedules")
      .insert(payload)
      .select(SCHEDULE_SELECT);

    if (error) throw error;

    return normalizeScheduleRows(data as unknown[]);
  },

  async update(
    id: string,
    input: Partial<ScheduleInput>,
  ): Promise<ScheduleRow> {
    const { data, error } = await supabase
      .from("schedules")
      .update(buildUpdatePayload(input))
      .eq("id", id)
      .select(SCHEDULE_SELECT)
      .single();

    if (error) throw error;

    return normalizeScheduleRow(data);
  },

  async move(
    id: string,
    dayName: string,
    periodNumber: number,
  ): Promise<ScheduleRow> {
    return this.update(id, {
      day_name: dayName,
      period_number: periodNumber,
    });
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return true;
  },
};

import { supabase } from "@/lib/supabase";

type StageRelation =
  | {
      id: string;
      stage_name: string | null;
    }
  | null;

export type ClassroomRow = {
  id: string;
  school_id: string;
  stage_id: string | null;
  classroom_name: string | null;
  grade_name: string | null;
  track_name: string | null;
  section: string | null;
  capacity: number | null;
  is_active: boolean | null;
  created_at: string | null;
  stages?: StageRelation;
};

export type ClassroomFormInput = {
  school_id: string;
  stage_id?: string | null;
  classroom_name: string;
  grade_name?: string | null;
  track_name?: string | null;
  section?: string | null;
  capacity?: number | null;
  is_active?: boolean;
};

type ClassroomPayload = {
  school_id?: string;
  stage_id?: string | null;
  classroom_name?: string;
  grade_name?: string | null;
  track_name?: string | null;
  section?: string | null;
  capacity?: number | null;
  is_active?: boolean;
};

function normalizeStage(value: unknown): StageRelation {
  if (Array.isArray(value)) {
    const first = value[0];
    if (!first || typeof first !== "object") return null;

    return {
      id: String((first as { id?: unknown }).id ?? ""),
      stage_name:
        ((first as { stage_name?: string | null }).stage_name ?? null),
    };
  }

  if (!value || typeof value !== "object") return null;

  return {
    id: String((value as { id?: unknown }).id ?? ""),
    stage_name:
      ((value as { stage_name?: string | null }).stage_name ?? null),
  };
}

function normalizeClassroomRow(row: unknown): ClassroomRow {
  const item = row as ClassroomRow & { stages?: unknown };

  return {
    id: String(item.id),
    school_id: String(item.school_id),
    stage_id: item.stage_id ?? null,
    classroom_name: item.classroom_name ?? null,
    grade_name: item.grade_name ?? null,
    track_name: item.track_name ?? null,
    section: item.section ?? null,
    capacity: item.capacity ?? null,
    is_active: item.is_active ?? null,
    created_at: item.created_at ?? null,
    stages: normalizeStage(item.stages),
  };
}

function normalizeRows(data: unknown[] | null): ClassroomRow[] {
  return (data ?? []).map(normalizeClassroomRow);
}

function buildCreatePayload(input: ClassroomFormInput): ClassroomPayload {
  return {
    school_id: input.school_id,
    stage_id: input.stage_id ?? null,
    classroom_name: input.classroom_name,
    grade_name: input.grade_name ?? null,
    track_name: input.track_name ?? null,
    section: input.section ?? null,
    capacity: input.capacity ?? null,
    is_active: input.is_active ?? true,
  };
}

function buildUpdatePayload(input: Partial<ClassroomFormInput>): ClassroomPayload {
  const payload: ClassroomPayload = {};

  if ("school_id" in input) payload.school_id = input.school_id;
  if ("stage_id" in input) payload.stage_id = input.stage_id ?? null;
  if ("classroom_name" in input && input.classroom_name !== undefined) {
    payload.classroom_name = input.classroom_name;
  }
  if ("grade_name" in input) payload.grade_name = input.grade_name ?? null;
  if ("track_name" in input) payload.track_name = input.track_name ?? null;
  if ("section" in input) payload.section = input.section ?? null;
  if ("capacity" in input) payload.capacity = input.capacity ?? null;
  if ("is_active" in input && input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  return payload;
}

const CLASSROOM_SELECT = `
  id,
  school_id,
  stage_id,
  classroom_name,
  grade_name,
  track_name,
  section,
  capacity,
  is_active,
  created_at,
  stages (
    id,
    stage_name
  )
`;

const CLASSROOM_BASIC_SELECT = `
  id,
  school_id,
  stage_id,
  classroom_name,
  grade_name,
  track_name,
  section,
  capacity,
  is_active,
  created_at
`;

export const ClassroomsService = {
  async listBySchool(schoolId: string): Promise<ClassroomRow[]> {
    const { data, error } = await supabase
      .from("classrooms")
      .select(CLASSROOM_SELECT)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return normalizeRows(data as unknown[]);
  },

  async listByStage(
    schoolId: string,
    stageId: string,
  ): Promise<ClassroomRow[]> {
    const { data, error } = await supabase
      .from("classrooms")
      .select(CLASSROOM_BASIC_SELECT)
      .eq("school_id", schoolId)
      .eq("stage_id", stageId)
      .eq("is_active", true)
      .order("grade_name", { ascending: true })
      .order("section", { ascending: true });

    if (error) throw error;

    return normalizeRows(data as unknown[]);
  },

  async getById(id: string): Promise<ClassroomRow> {
    const { data, error } = await supabase
      .from("classrooms")
      .select(CLASSROOM_SELECT)
      .eq("id", id)
      .single();

    if (error) throw error;

    return normalizeClassroomRow(data);
  },

  async create(input: ClassroomFormInput): Promise<ClassroomRow> {
    const { data, error } = await supabase
      .from("classrooms")
      .insert(buildCreatePayload(input))
      .select(CLASSROOM_SELECT)
      .single();

    if (error) throw error;

    return normalizeClassroomRow(data);
  },

  async update(
    id: string,
    input: Partial<ClassroomFormInput>,
  ): Promise<ClassroomRow> {
    const { data, error } = await supabase
      .from("classrooms")
      .update(buildUpdatePayload(input))
      .eq("id", id)
      .select(CLASSROOM_SELECT)
      .single();

    if (error) throw error;

    return normalizeClassroomRow(data);
  },

  async setActive(id: string, isActive: boolean): Promise<ClassroomRow> {
    const { data, error } = await supabase
      .from("classrooms")
      .update({ is_active: isActive })
      .eq("id", id)
      .select(CLASSROOM_SELECT)
      .single();

    if (error) throw error;

    return normalizeClassroomRow(data);
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("classrooms")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return true;
  },
};

import { supabase } from "@/lib/supabase";

type StageRelation = {
  id: string;
  stage_name: string | null;
} | null;

export type SubjectRow = {
  id: string;
  school_id: string;
  stage_id: string | null;
  subject_name: string | null;
  subject_code: string | null;
  subject_type: string | null;
  is_active: boolean | null;
  created_at: string | null;
  stages?: StageRelation;
};

export type SubjectFormInput = {
  school_id: string;
  stage_id?: string | null;
  subject_name: string;
  subject_code?: string | null;
  subject_type?: string | null;
  is_active?: boolean;
};

type SubjectPayload = {
  school_id?: string;
  stage_id?: string | null;
  subject_name?: string;
  subject_code?: string | null;
  subject_type?: string | null;
  is_active?: boolean;
};

function firstRelation<T>(value: unknown): T | null {
  if (Array.isArray(value)) {
    return (value[0] ?? null) as T | null;
  }

  return (value ?? null) as T | null;
}

function normalizeStage(value: unknown): StageRelation {
  const stage = firstRelation<{
    id?: unknown;
    stage_name?: string | null;
  }>(value);

  if (!stage) return null;

  return {
    id: String(stage.id ?? ""),
    stage_name: stage.stage_name ?? null,
  };
}

function normalizeSubjectRow(row: unknown): SubjectRow {
  const item = row as SubjectRow & {
    stages?: unknown;
  };

  return {
    id: String(item.id),
    school_id: String(item.school_id),
    stage_id: item.stage_id ?? null,
    subject_name: item.subject_name ?? null,
    subject_code: item.subject_code ?? null,
    subject_type: item.subject_type ?? null,
    is_active: item.is_active ?? null,
    created_at: item.created_at ?? null,
    stages: normalizeStage(item.stages),
  };
}

function normalizeRows(data: unknown[] | null): SubjectRow[] {
  return (data ?? []).map(normalizeSubjectRow);
}

function buildCreatePayload(input: SubjectFormInput): SubjectPayload {
  return {
    school_id: input.school_id,
    stage_id: input.stage_id ?? null,
    subject_name: input.subject_name,
    subject_code: input.subject_code ?? null,
    subject_type: input.subject_type ?? "أساسية",
    is_active: input.is_active ?? true,
  };
}

function buildUpdatePayload(input: Partial<SubjectFormInput>): SubjectPayload {
  const payload: SubjectPayload = {};

  if ("school_id" in input && input.school_id !== undefined) {
    payload.school_id = input.school_id;
  }

  if ("stage_id" in input) {
    payload.stage_id = input.stage_id ?? null;
  }

  if ("subject_name" in input && input.subject_name !== undefined) {
    payload.subject_name = input.subject_name;
  }

  if ("subject_code" in input) {
    payload.subject_code = input.subject_code ?? null;
  }

  if ("subject_type" in input) {
    payload.subject_type = input.subject_type ?? null;
  }

  if ("is_active" in input && input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  return payload;
}

const SUBJECT_SELECT = `
  id,
  school_id,
  stage_id,
  subject_name,
  subject_code,
  subject_type,
  is_active,
  created_at,
  stages (
    id,
    stage_name
  )
`;

const SUBJECT_BASIC_SELECT = `
  id,
  school_id,
  stage_id,
  subject_name,
  subject_code,
  subject_type,
  is_active,
  created_at
`;

export const SubjectsService = {
  async listBySchool(schoolId: string): Promise<SubjectRow[]> {
    const { data, error } = await supabase
      .from("subjects")
      .select(SUBJECT_SELECT)
      .eq("school_id", schoolId)
      .order("subject_name", { ascending: true });

    if (error) throw error;

    return normalizeRows(data as unknown[]);
  },

  async listByStage(
    schoolId: string,
    stageId: string,
  ): Promise<SubjectRow[]> {
    const { data, error } = await supabase
      .from("subjects")
      .select(SUBJECT_BASIC_SELECT)
      .eq("school_id", schoolId)
      .eq("stage_id", stageId)
      .eq("is_active", true)
      .order("subject_name", { ascending: true });

    if (error) throw error;

    return normalizeRows(data as unknown[]);
  },

  async getById(id: string): Promise<SubjectRow> {
    const { data, error } = await supabase
      .from("subjects")
      .select(SUBJECT_SELECT)
      .eq("id", id)
      .single();

    if (error) throw error;

    return normalizeSubjectRow(data);
  },

  async create(input: SubjectFormInput): Promise<SubjectRow> {
    const { data, error } = await supabase
      .from("subjects")
      .insert(buildCreatePayload(input))
      .select(SUBJECT_SELECT)
      .single();

    if (error) throw error;

    return normalizeSubjectRow(data);
  },

  async update(
    id: string,
    input: Partial<SubjectFormInput>,
  ): Promise<SubjectRow> {
    const { data, error } = await supabase
      .from("subjects")
      .update(buildUpdatePayload(input))
      .eq("id", id)
      .select(SUBJECT_SELECT)
      .single();

    if (error) throw error;

    return normalizeSubjectRow(data);
  },

  async setActive(id: string, isActive: boolean): Promise<SubjectRow> {
    const { data, error } = await supabase
      .from("subjects")
      .update({ is_active: isActive })
      .eq("id", id)
      .select(SUBJECT_SELECT)
      .single();

    if (error) throw error;

    return normalizeSubjectRow(data);
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return true;
  },
};
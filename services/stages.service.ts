import { supabase } from "@/lib/supabase";

export type StageRow = {
  id: string;
  school_id: string;
  stage_key: string | null;
  stage_name: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
};

export type StageFormInput = {
  school_id: string;
  stage_key?: string | null;
  stage_name: string;
  sort_order?: number | null;
  is_active?: boolean;
};

export const StagesService = {
  async listBySchool(schoolId: string) {
    const { data, error } = await supabase
      .from("stages")
      .select("id, school_id, stage_key, stage_name, sort_order, is_active, created_at")
      .eq("school_id", schoolId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as StageRow[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("stages")
      .select("id, school_id, stage_key, stage_name, sort_order, is_active, created_at")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as StageRow;
  },

  async create(input: StageFormInput) {
    const { data, error } = await supabase
      .from("stages")
      .insert({
        school_id: input.school_id,
        stage_key: input.stage_key ?? null,
        stage_name: input.stage_name,
        sort_order: input.sort_order ?? 1,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as StageRow;
  },

  async update(id: string, input: Partial<StageFormInput>) {
    const { data, error } = await supabase
      .from("stages")
      .update({
        stage_key: input.stage_key,
        stage_name: input.stage_name,
        sort_order: input.sort_order,
        is_active: input.is_active,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as StageRow;
  },

  async setActive(id: string, isActive: boolean) {
    const { data, error } = await supabase
      .from("stages")
      .update({ is_active: isActive })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as StageRow;
  },

  async remove(id: string) {
    const { error } = await supabase.from("stages").delete().eq("id", id);
    if (error) throw error;
    return true;
  },
};

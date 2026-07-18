import { supabase } from "@/lib/supabase";

export type SchoolRow = {
  id: string;
  school_name: string | null;
  school_code?: string | null;
  city?: string | null;
  district?: string | null;
  educational_stage?: string | null;
  semester_system?: string | null;
  logo_url?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

export type SchoolFormInput = {
  school_name: string;
  school_code?: string | null;
  city?: string | null;
  district?: string | null;
  educational_stage?: string | null;
  semester_system?: string | null;
  logo_url?: string | null;
  is_active?: boolean;
};

export const SchoolsService = {
  async list() {
    const { data, error } = await supabase
      .from("schools")
      .select(
        `
        id,
        school_name,
        school_code,
        city,
        district,
        educational_stage,
        semester_system,
        logo_url,
        is_active,
        created_at
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as SchoolRow[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("schools")
      .select(
        `
        id,
        school_name,
        school_code,
        city,
        district,
        educational_stage,
        semester_system,
        logo_url,
        is_active,
        created_at
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as SchoolRow;
  },

  async create(input: SchoolFormInput) {
    const { data, error } = await supabase
      .from("schools")
      .insert({
        school_name: input.school_name,
        school_code: input.school_code ?? null,
        city: input.city ?? null,
        district: input.district ?? null,
        educational_stage: input.educational_stage ?? null,
        semester_system: input.semester_system ?? "2",
        logo_url: input.logo_url ?? null,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as SchoolRow;
  },

  async update(id: string, input: Partial<SchoolFormInput>) {
    const { data, error } = await supabase
      .from("schools")
      .update({
        ...input,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as SchoolRow;
  },

  async setActive(id: string, isActive: boolean) {
    const { data, error } = await supabase
      .from("schools")
      .update({ is_active: isActive })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as SchoolRow;
  },

  async remove(id: string) {
    const { error } = await supabase.from("schools").delete().eq("id", id);

    if (error) throw error;
    return true;
  },
};

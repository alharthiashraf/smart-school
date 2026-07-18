import { supabase } from "@/lib/supabase";
import type { SchoolRole } from "@/lib/permissions";

export type SchoolMemberRow = {
  id: string;
  school_id: string;
  auth_user_id: string;
  role: SchoolRole;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export const SchoolMembersService = {
  async listBySchool(schoolId: string) {
    const { data, error } = await supabase
      .from("school_members")
      .select(
        `
        id,
        school_id,
        auth_user_id,
        role,
        is_active,
        created_at,
        updated_at
      `,
      )
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as SchoolMemberRow[];
  },

  async upsertMember(input: {
    school_id: string;
    auth_user_id: string;
    role: SchoolRole;
    is_active?: boolean;
  }) {
    const { data, error } = await supabase
      .from("school_members")
      .upsert(
        {
          school_id: input.school_id,
          auth_user_id: input.auth_user_id,
          role: input.role,
          is_active: input.is_active ?? true,
        },
        {
          onConflict: "school_id,auth_user_id",
        },
      )
      .select()
      .single();

    if (error) throw error;
    return data as SchoolMemberRow;
  },

  async setActive(id: string, isActive: boolean) {
    const { data, error } = await supabase
      .from("school_members")
      .update({ is_active: isActive })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as SchoolMemberRow;
  },

  async remove(id: string) {
    const { error } = await supabase
      .from("school_members")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },
};

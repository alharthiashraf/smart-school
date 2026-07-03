import type { Teacher } from "@/types/teacher";
import { mapTeacher, mapTeachers } from "@/mappers/teacher.mapper";
import {
  deleteRow,
  handleError,
  insertRow,
  selectById,
  updateRow,
  type ServiceResult,
} from "./base.service";
import { supabase } from "@/lib/supabase";

const TABLE = "teachers";

export const TeachersService = {
  async getAll(schoolId?: string): Promise<ServiceResult<Teacher[]>> {
    let query = supabase.from(TABLE).select("*").order("full_name");

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    const { data, error } = await query;

    return {
      data: mapTeachers(data ?? []),
      error: handleError(error),
    };
  },

  async getById(id: string): Promise<ServiceResult<Teacher>> {
    const result = await selectById<Teacher>(TABLE, id);
    return {
      data: result.data ? mapTeacher(result.data) : null,
      error: result.error,
    };
  },

  create(payload: Partial<Teacher>) {
    return insertRow<Teacher>(TABLE, payload);
  },

  update(id: string, payload: Partial<Teacher>) {
    return updateRow<Teacher>(TABLE, id, payload);
  },

  remove(id: string) {
    return deleteRow(TABLE, id);
  },
};
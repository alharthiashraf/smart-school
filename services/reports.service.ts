import type { Report } from "@/types/report";
import {
  deleteRow,
  handleError,
  insertRow,
  selectAll,
  selectById,
  updateRow,
  type ServiceResult,
} from "./base.service";
import { supabase } from "@/lib/supabase";

const TABLE = "reports";

export const ReportsService = {
  async getAll(schoolId?: string): Promise<ServiceResult<Report[]>> {
    if (!schoolId) {
      return selectAll<Report>(TABLE);
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    return {
      data: (data as Report[]) ?? [],
      error: handleError(error),
    };
  },

  getById(id: string) {
    return selectById<Report>(TABLE, id);
  },

  create(payload: Partial<Report>) {
    return insertRow<Report>(TABLE, payload);
  },

  update(id: string, payload: Partial<Report>) {
    return updateRow<Report>(TABLE, id, payload);
  },

  remove(id: string) {
    return deleteRow(TABLE, id);
  },
};
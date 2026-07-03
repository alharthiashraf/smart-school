import type { QualityEvidence } from "@/types/quality";
import { mapEvidence, mapEvidences } from "@/mappers/evidence.mapper";
import {
  deleteRow,
  handleError,
  insertRow,
  selectById,
  updateRow,
  type ServiceResult,
} from "./base.service";
import { supabase } from "@/lib/supabase";

const TABLE = "quality_evidence";

export const QualityService = {
  async getAll(schoolId?: string): Promise<ServiceResult<QualityEvidence[]>> {
    let query = supabase.from(TABLE).select("*").order("uploaded_at", {
      ascending: false,
    });

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    const { data, error } = await query;

    return {
      data: mapEvidences(data ?? []),
      error: handleError(error),
    };
  },

  async getById(id: string): Promise<ServiceResult<QualityEvidence>> {
    const result = await selectById<QualityEvidence>(TABLE, id);
    return {
      data: result.data ? mapEvidence(result.data) : null,
      error: result.error,
    };
  },

  create(payload: Partial<QualityEvidence>) {
    return insertRow<QualityEvidence>(TABLE, payload);
  },

  update(id: string, payload: Partial<QualityEvidence>) {
    return updateRow<QualityEvidence>(TABLE, id, payload);
  },

  remove(id: string) {
    return deleteRow(TABLE, id);
  },
};
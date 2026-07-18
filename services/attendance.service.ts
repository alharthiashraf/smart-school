import type { AttendanceRecord } from "@/types/attendance";
import {
  mapAttendance,
  mapAttendanceList,
} from "@/mappers/attendance.mapper";
import {
  deleteRow,
  handleError,
  insertRow,
  selectById,
  updateRow,
  type ServiceResult,
} from "./base.service";
import { supabase } from "@/lib/supabase";

const TABLE = "student_attendance";

export const AttendanceService = {
  async getAll(schoolId?: string): Promise<ServiceResult<AttendanceRecord[]>> {
    let query = supabase
      .from(TABLE)
      .select("*")
      .order("attendance_date", { ascending: false });

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    const { data, error } = await query;

    return {
      data: mapAttendanceList(data ?? []),
      error: handleError(error),
    };
  },

  async getByDate(
    attendanceDate: string,
    schoolId?: string,
  ): Promise<ServiceResult<AttendanceRecord[]>> {
    let query = supabase
      .from(TABLE)
      .select("*")
      .eq("attendance_date", attendanceDate);

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    const { data, error } = await query;

    return {
      data: mapAttendanceList(data ?? []),
      error: handleError(error),
    };
  },

  async getById(id: string): Promise<ServiceResult<AttendanceRecord>> {
    const result = await selectById<AttendanceRecord>(TABLE, id);
    return {
      data: result.data ? mapAttendance(result.data) : null,
      error: result.error,
    };
  },

  create(payload: Partial<AttendanceRecord>) {
    return insertRow<AttendanceRecord>(TABLE, payload);
  },

  update(id: string, payload: Partial<AttendanceRecord>) {
    return updateRow<AttendanceRecord>(TABLE, id, payload);
  },

  remove(id: string) {
    return deleteRow(TABLE, id);
  },
};

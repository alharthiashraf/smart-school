import { supabase } from "@/lib/supabase";
import { handleError, type ServiceResult } from "./base.service";

export type ResolveTeacherSubjectPayload = {
  schoolId: string;
  teacherId?: string | null;
  subjectId: string;
  gradeId?: string | null;
  classroomId?: string | null;
  semester?: string | null;
  academicYear?: string | null;
};

export type TeacherSubjectResolved = {
  id: string;
  school_id: string;
  teacher_id: string | null;
  subject_id: string | null;
  grade_id: string | null;
  classroom_id: string | null;
  semester: string | null;
  academic_year: string | null;
  is_active: boolean | null;
};

export const TeacherSubjectResolverService = {
  async resolve(
    payload: ResolveTeacherSubjectPayload,
  ): Promise<ServiceResult<TeacherSubjectResolved>> {
    if (!payload.schoolId) {
      return { data: null, error: "schoolId مطلوب" };
    }

    if (!payload.subjectId) {
      return { data: null, error: "subjectId مطلوب" };
    }

    let query = supabase
      .from("teacher_subjects")
      .select("*")
      .eq("school_id", payload.schoolId)
      .eq("subject_id", payload.subjectId)
      .eq("is_active", true);

    if (payload.teacherId) {
      query = query.eq("teacher_id", payload.teacherId);
    }

    if (payload.gradeId !== undefined) {
      query =
        payload.gradeId === null
          ? query.is("grade_id", null)
          : query.eq("grade_id", payload.gradeId);
    }

    if (payload.classroomId !== undefined) {
      query =
        payload.classroomId === null
          ? query.is("classroom_id", null)
          : query.eq("classroom_id", payload.classroomId);
    }

    if (payload.semester !== undefined) {
      query =
        payload.semester === null
          ? query.is("semester", null)
          : query.eq("semester", payload.semester);
    }

    if (payload.academicYear !== undefined) {
      query =
        payload.academicYear === null
          ? query.is("academic_year", null)
          : query.eq("academic_year", payload.academicYear);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return { data: null, error: handleError(error) };
    }

    if (!data) {
      return {
        data: null,
        error: "لا يوجد إسناد مطابق لهذه المادة والفصل",
      };
    }

    return {
      data: data as TeacherSubjectResolved,
      error: null,
    };
  },

  async getTeacherAssignments(params: {
    schoolId: string;
    teacherId?: string | null;
  }): Promise<ServiceResult<TeacherSubjectResolved[]>> {
    let query = supabase
      .from("teacher_subjects")
      .select("*")
      .eq("school_id", params.schoolId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (params.teacherId) {
      query = query.eq("teacher_id", params.teacherId);
    }

    const { data, error } = await query;

    return {
      data: (data as TeacherSubjectResolved[]) ?? [],
      error: handleError(error),
    };
  },
};
import type { DashboardStats } from "@/types/dashboard";
import { supabase } from "@/lib/supabase";
import { handleError, type ServiceResult } from "./base.service";

export const DashboardService = {
  async getStats(schoolId?: string): Promise<ServiceResult<DashboardStats>> {
    const schoolFilter = schoolId ? { school_id: schoolId } : null;

    const [students, teachers, classrooms, subjects, alerts] =
      await Promise.all([
        schoolFilter
          ? supabase
              .from("students")
              .select("id", { count: "exact", head: true })
              .eq("school_id", schoolId)
          : supabase
              .from("students")
              .select("id", { count: "exact", head: true }),

        schoolFilter
          ? supabase
              .from("teachers")
              .select("id", { count: "exact", head: true })
              .eq("school_id", schoolId)
          : supabase
              .from("teachers")
              .select("id", { count: "exact", head: true }),

        schoolFilter
          ? supabase
              .from("classrooms")
              .select("id", { count: "exact", head: true })
              .eq("school_id", schoolId)
          : supabase
              .from("classrooms")
              .select("id", { count: "exact", head: true }),

        schoolFilter
          ? supabase
              .from("subjects")
              .select("id", { count: "exact", head: true })
              .eq("school_id", schoolId)
          : supabase
              .from("subjects")
              .select("id", { count: "exact", head: true }),

        schoolFilter
          ? supabase
              .from("alerts")
              .select("id", { count: "exact", head: true })
              .eq("school_id", schoolId)
          : supabase
              .from("alerts")
              .select("id", { count: "exact", head: true }),
      ]);

    const error =
      students.error ||
      teachers.error ||
      classrooms.error ||
      subjects.error ||
      alerts.error;

    return {
      data: {
        schools: 0,
        students: students.count ?? 0,
        teachers: teachers.count ?? 0,
        classrooms: classrooms.count ?? 0,
        subjects: subjects.count ?? 0,
        attendanceRate: 0,
        averageGrade: 0,
        openAlerts: alerts.count ?? 0,
      },
      error: handleError(error),
    };
  },
};
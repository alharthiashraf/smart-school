export type Student = {
  id: string;

  school_id: string | null;

  student_number?: string | null;

  national_id?: string | null;

  full_name: string;

  gender?: "ذكر" | "أنثى" | null;

  birth_date?: string | null;

  stage_name?: string | null;

  grade_name?: string | null;

  classroom_name?: string | null;

  academic_year?: string | null;

  semester?: string | null;

  guardian_name?: string | null;

  guardian_phone?: string | null;

  guardian_email?: string | null;

  status?: "active" | "inactive";

  created_at?: string | null;

  updated_at?: string | null;
};

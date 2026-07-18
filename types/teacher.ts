export type Teacher = {
  id: string;

  school_id: string | null;

  employee_number?: string | null;

  national_id?: string | null;

  full_name: string;

  email?: string | null;

  phone?: string | null;

  specialization?: string | null;

  qualification?: string | null;

  hire_date?: string | null;

  status?: "active" | "inactive";

  created_at?: string | null;

  updated_at?: string | null;
};

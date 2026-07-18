export type School = {
  id: string;

  school_name: string;

  school_code?: string;

  logo_url?: string;

  educational_stage?: string;

  city?: string;

  district?: string;

  semester_system?:
    | "2"
    | "3";

  is_active?: boolean;

  created_at?: string;
};

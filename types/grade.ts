export type GradeRecord = {
  id: string;

  school_id: string | null;

  student_id: string;

  subject_name: string;

  homework?: number;

  participation?: number;

  quiz?: number;

  midterm?: number;

  final_exam?: number;

  score: number;

  max_score: number;

  percentage?: number;

  grade_label?: string;

  result_status?: "ناجح" | "متعثر";

  semester?: string;

  academic_year?: string;

  created_at?: string | null;
};

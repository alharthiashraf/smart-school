import type { GradeRecord } from "@/types/grade";
import { fallback } from "@/lib/utils/format";

export type GradeRow = {
  id?: string;
  school_id?: string | null;
  student_id?: string | null;
  subject_name?: string | null;
  score?: number | null;
  max_score?: number | null;
  semester?: string | null;
};

export function mapGrade(row: GradeRow): GradeRecord {
  return {
    id: fallback(row.id),
    school_id: row.school_id ?? null,
    student_id: fallback(row.student_id),
    subject_name: row.subject_name ?? "",
    score: typeof row.score === "number" ? row.score : 0,
    max_score:
      typeof row.max_score === "number" && row.max_score > 0
        ? row.max_score
        : 100,
    semester: row.semester ?? "",
  };
}

export function mapGrades(rows: GradeRow[] = []) {
  return rows.map(mapGrade);
}
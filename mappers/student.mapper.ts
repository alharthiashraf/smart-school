import type { Student } from "@/types/student";

type Raw = Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function mapStudent(row: Raw): Student {
  const status = row.status === "inactive" ? "inactive" : "active";

  return {
    id: text(row.id),
    school_id: text(row.school_id, "") || null,
    student_number: text(row.student_number, "") || null,
    national_id: text(row.national_id, "") || null,
    full_name: text(row.full_name, "غير محدد"),
    gender: row.gender === "ذكر" || row.gender === "أنثى" ? row.gender : null,
    birth_date: text(row.birth_date, "") || null,
    stage_name: text(row.stage_name, "") || null,
    grade_name: text(row.grade_name, "") || null,
    classroom_name: text(row.classroom_name, "") || null,
    academic_year: text(row.academic_year, "") || null,
    semester: text(row.semester, "") || null,
    guardian_name: text(row.guardian_name, "") || null,
    guardian_phone: text(row.guardian_phone, "") || null,
    guardian_email: text(row.guardian_email, "") || null,
    status,
    created_at: text(row.created_at, "") || null,
    updated_at: text(row.updated_at, "") || null,
  };
}

export function mapStudents(rows: Raw[]): Student[] {
  return rows.map(mapStudent);
}


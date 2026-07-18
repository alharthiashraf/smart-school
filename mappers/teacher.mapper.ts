import type { Teacher } from "@/types/teacher";

type Raw = Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function mapTeacher(row: Raw): Teacher {
  const status = row.status === "inactive" ? "inactive" : "active";

  return {
    id: text(row.id),
    school_id: text(row.school_id, "") || null,
    employee_number: text(row.employee_number, "") || null,
    national_id: text(row.national_id, "") || null,
    full_name: text(row.full_name, "غير محدد"),
    email: text(row.email, "") || null,
    phone: text(row.phone, "") || null,
    specialization: text(row.specialization, "") || null,
    qualification: text(row.qualification, "") || null,
    hire_date: text(row.hire_date, "") || null,
    status,
    created_at: text(row.created_at, "") || null,
    updated_at: text(row.updated_at, "") || null,
  };
}

export function mapTeachers(rows: Raw[]): Teacher[] {
  return rows.map(mapTeacher);
}


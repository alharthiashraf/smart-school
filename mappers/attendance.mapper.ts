import type { AttendanceRecord, AttendanceStatus } from "@/types/attendance";

type Raw = Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function status(value: unknown): AttendanceStatus {
  if (value === "present" || value === "absent" || value === "late" || value === "excused") return value;
  return "present";
}

export function mapAttendance(row: Raw): AttendanceRecord {
  return {
    id: text(row.id),
    school_id: text(row.school_id, "") || null,
    student_id: text(row.student_id),
    attendance_date: text(row.attendance_date),
    period: typeof row.period === "number" ? row.period : null,
    status: status(row.status),
    notes: text(row.notes, "") || null,
    teacher_id: text(row.teacher_id, "") || null,
    created_at: text(row.created_at, "") || null,
  };
}

export function mapAttendanceList(rows: Raw[]): AttendanceRecord[] {
  return rows.map(mapAttendance);
}

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "excused";

export type AttendanceRecord = {
  id: string;

  school_id: string | null;

  student_id: string;

  attendance_date: string;

  period?: number | null;

  status: AttendanceStatus;

  notes?: string | null;

  teacher_id?: string | null;

  created_at?: string | null;
};

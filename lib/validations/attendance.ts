import { required } from "@/lib/utils/validation";

export type AttendanceValidationInput = {
  student_id?: string | null;
  attendance_date?: string | null;
  status?: string | null;
};

export function validateAttendance(input: AttendanceValidationInput) {
  const errors: string[] = [];

  if (!required(input.student_id)) {
    errors.push("معرف الطالب مطلوب.");
  }

  if (!required(input.attendance_date)) {
    errors.push("تاريخ الحضور مطلوب.");
  }

  if (!required(input.status)) {
    errors.push("حالة الحضور مطلوبة.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
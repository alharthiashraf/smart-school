import { required } from "@/lib/utils/validation";

export type StudentValidationInput = {
  full_name?: string | null;
  grade_name?: string | null;
  classroom_name?: string | null;
};

export function validateStudent(input: StudentValidationInput) {
  const errors: string[] = [];

  if (!required(input.full_name)) {
    errors.push("اسم الطالب مطلوب.");
  }

  if (!required(input.grade_name)) {
    errors.push("الصف الدراسي مطلوب.");
  }

  if (!required(input.classroom_name)) {
    errors.push("الفصل مطلوب.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
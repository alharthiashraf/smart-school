import { isEmail, required } from "@/lib/utils/validation";

export type TeacherValidationInput = {
  full_name?: string | null;
  email?: string | null;
  specialization?: string | null;
};

export function validateTeacher(input: TeacherValidationInput) {
  const errors: string[] = [];

  if (!required(input.full_name)) {
    errors.push("اسم المعلم مطلوب.");
  }

  if (input.email && !isEmail(input.email)) {
    errors.push("البريد الإلكتروني غير صحيح.");
  }

  if (!required(input.specialization)) {
    errors.push("التخصص مطلوب.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

import { required } from "@/lib/utils/validation";

export type GradeValidationInput = {
  student_id?: string | null;
  subject_name?: string | null;
  score?: number | null;
  max_score?: number | null;
};

export function validateGrade(input: GradeValidationInput) {
  const errors: string[] = [];

  if (!required(input.student_id)) {
    errors.push("معرف الطالب مطلوب.");
  }

  if (!required(input.subject_name)) {
    errors.push("اسم المادة مطلوب.");
  }

  if (typeof input.score !== "number") {
    errors.push("درجة الطالب مطلوبة.");
  }

  if (typeof input.max_score !== "number" || input.max_score <= 0) {
    errors.push("مجموع الدرجة غير صحيح.");
  }

  if (
    typeof input.score === "number" &&
    typeof input.max_score === "number" &&
    input.score > input.max_score
  ) {
    errors.push("درجة الطالب لا يمكن أن تكون أكبر من مجموع الدرجة.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

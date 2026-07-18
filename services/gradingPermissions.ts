import type { SchoolRole } from "@/lib/permissions";

export type GradingAction =
  | "view"
  | "edit"
  | "approve"
  | "lock"
  | "reopen"
  | "import"
  | "export"
  | "analytics";

const ACTION_ROLES: Record<GradingAction, SchoolRole[]> = {
  view: ["super_admin", "school_admin", "vice_principal", "teacher", "student", "parent"],
  edit: ["super_admin", "school_admin", "vice_principal", "teacher"],
  approve: ["super_admin", "school_admin", "vice_principal"],
  lock: ["super_admin", "school_admin", "vice_principal"],
  reopen: ["super_admin", "school_admin"],
  import: ["super_admin", "school_admin", "vice_principal", "teacher"],
  export: ["super_admin", "school_admin", "vice_principal", "teacher"],
  analytics: ["super_admin", "school_admin", "vice_principal", "teacher"],
};

export function canGrade(role: SchoolRole | null | undefined, action: GradingAction) {
  if (!role) return false;
  return ACTION_ROLES[action].includes(role);
}

export function assertCanGrade(role: SchoolRole | null | undefined, action: GradingAction) {
  if (!canGrade(role, action)) {
    throw new Error("لا تملك الصلاحية المطلوبة لتنفيذ هذا الإجراء في الدرجات.");
  }
}

export function canTeacherEditBook(input: {
  role: SchoolRole | null | undefined;
  bookTeacherId?: string | null;
  currentTeacherId?: string | null;
  isLocked?: boolean;
}) {
  if (input.isLocked) return false;
  if (input.role === "super_admin" || input.role === "school_admin" || input.role === "vice_principal") return true;
  if (input.role !== "teacher") return false;
  return !!input.bookTeacherId && !!input.currentTeacherId && input.bookTeacherId === input.currentTeacherId;
}


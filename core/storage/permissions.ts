import { StorageBuckets } from "./buckets";
import type { StorageOwnerType } from "./storage.types";

export type StorageAction = "upload" | "download" | "delete" | "preview" | "manage";
export type StorageRole =
  | "super_admin" | "school_admin" | "vice_principal" | "teacher" | "administrative_staff"
  | "student_counselor" | "health_supervisor" | "activity_leader" | "student" | "parent";

const adminRoles: StorageRole[] = ["super_admin", "school_admin"];
const staffRoles: StorageRole[] = ["super_admin", "school_admin", "vice_principal", "teacher", "administrative_staff", "student_counselor", "health_supervisor", "activity_leader"];

export function canAccessStorage(input: { role?: StorageRole | null; bucket: string; action: StorageAction; ownerType?: StorageOwnerType }) {
  const role = input.role;
  if (!role) return false;
  if (adminRoles.includes(role)) return true;
  if (input.action === "manage" || input.action === "delete") return role === "vice_principal";

  if ([StorageBuckets.SCHOOL_LOGOS, StorageBuckets.STUDENT_PHOTOS, StorageBuckets.TEACHER_PHOTOS].includes(input.bucket)) {
    return true;
  }
  if (input.bucket === StorageBuckets.TEACHER_FILES) return staffRoles.includes(role);
  if (input.bucket === StorageBuckets.STUDENT_FILES) return staffRoles.includes(role) || role === "parent" || role === "student";
  if (input.bucket === StorageBuckets.BEHAVIOR_FILES) return ["vice_principal", "student_counselor"].includes(role);
  if (input.bucket === StorageBuckets.HEALTH_FILES) return ["health_supervisor", "vice_principal"].includes(role);
  if (input.bucket === StorageBuckets.GUIDANCE_FILES) return ["student_counselor", "vice_principal"].includes(role);
  if (input.bucket === StorageBuckets.ACTIVITY_FILES) return ["activity_leader", "vice_principal"].includes(role);
  if ([StorageBuckets.REPORTS, StorageBuckets.IMPORTS, StorageBuckets.EXPORTS].includes(input.bucket)) return staffRoles.includes(role);
  if (input.bucket === StorageBuckets.TEMP) return staffRoles.includes(role);
  return false;
}

export const StoragePermissionEngine = { canAccessStorage };

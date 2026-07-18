import type { RoleKey } from "./roles";

export const permissionKeys = [
  "view_dashboard",
  "manage_schools",
  "manage_users",
  "manage_students",
  "manage_teachers",
  "manage_attendance",
  "manage_grades",
  "manage_behavior",
  "manage_quality",
  "view_quality",
  "manage_reports",
  "view_reports",
  "manage_activities",
  "manage_health",
  "manage_counseling",
  "view_teacher_portal",
  "view_student_portal",
  "view_parent_portal",
] as const;

export type PermissionKey = (typeof permissionKeys)[number];

export const rolePermissions: Record<RoleKey, PermissionKey[]> = {
  super_admin: [...permissionKeys],

  school_admin: [
    "view_dashboard",
    "manage_users",
    "manage_students",
    "manage_teachers",
    "manage_attendance",
    "manage_grades",
    "manage_behavior",
    "manage_quality",
    "view_quality",
    "manage_reports",
    "view_reports",
    "manage_activities",
    "manage_health",
    "manage_counseling",
  ],

  vice_principal: [
    "view_dashboard",
    "manage_students",
    "manage_attendance",
    "manage_behavior",
    "manage_reports",
    "view_reports",
  ],

  administrative_staff: [
    "view_dashboard",
    "manage_students",
    "manage_attendance",
    "view_reports",
  ],

  student_counselor: [
    "view_dashboard",
    "manage_behavior",
    "manage_counseling",
    "view_reports",
  ],

  health_supervisor: [
    "view_dashboard",
    "manage_health",
    "view_reports",
  ],

  activity_leader: [
    "view_dashboard",
    "manage_activities",
    "view_reports",
  ],

  teacher: [
    "view_teacher_portal",
    "manage_attendance",
    "manage_grades",
    "view_reports",
  ],

  student: [
    "view_student_portal",
  ],

  parent: [
    "view_parent_portal",
  ],
};

export function hasPermission(
  role: RoleKey | null | undefined,
  permission: PermissionKey,
): boolean {
  if (!role) return false;

  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(
  role: RoleKey | null | undefined,
  permissions: PermissionKey[],
): boolean {
  if (!role) return false;

  return permissions.some((permission) =>
    hasPermission(role, permission),
  );
}

export function hasAllPermissions(
  role: RoleKey | null | undefined,
  permissions: PermissionKey[],
): boolean {
  if (!role) return false;

  return permissions.every((permission) =>
    hasPermission(role, permission),
  );
}

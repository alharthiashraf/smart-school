// lib/permissions/guards.ts

import type { PermissionKey } from "./permissions";
import { hasPermission } from "./permissions";
import type { SchoolRole } from "./roles";
import { ADMIN_ROLES, LEADERSHIP_ROLES, STAFF_ROLES } from "./roles";

export function isAdminRole(role: SchoolRole | null | undefined) {
  return !!role && ADMIN_ROLES.includes(role);
}

export function isLeadershipRole(role: SchoolRole | null | undefined) {
  return !!role && LEADERSHIP_ROLES.includes(role);
}

export function isStaffRole(role: SchoolRole | null | undefined) {
  return !!role && STAFF_ROLES.includes(role);
}

export function can(role: SchoolRole | null | undefined, permission: PermissionKey) {
  return hasPermission(role, permission);
}

export function canAny(
  role: SchoolRole | null | undefined,
  permissions: PermissionKey[],
) {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function canAll(
  role: SchoolRole | null | undefined,
  permissions: PermissionKey[],
) {
  return permissions.every((permission) => hasPermission(role, permission));
}

export function canManageAcademicStructure(role: SchoolRole | null | undefined) {
  return canAny(role, [
    "stages.manage",
    "classrooms.manage",
    "subjects.manage",
    "teacher_subjects.manage",
    "schedules.manage",
  ]);
}

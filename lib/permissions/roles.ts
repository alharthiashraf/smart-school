// lib/permissions/roles.ts

export const SCHOOL_ROLES = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "teacher",
  "administrative_staff",
  "student_counselor",
  "health_supervisor",
  "activity_leader",
  "student",
  "parent",
] as const;

export type SchoolRole = (typeof SCHOOL_ROLES)[number];

export const ADMIN_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
];

export const LEADERSHIP_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
];

export const STAFF_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "teacher",
  "administrative_staff",
  "student_counselor",
  "health_supervisor",
  "activity_leader",
];

export function isSchoolRole(value: unknown): value is SchoolRole {
  return typeof value === "string" && SCHOOL_ROLES.includes(value as SchoolRole);
}
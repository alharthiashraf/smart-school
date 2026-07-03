// lib/permissions/permissions.ts

import type { SchoolRole } from "./roles";

export type PermissionKey =
  | "schools.view"
  | "schools.manage"
  | "stages.view"
  | "stages.manage"
  | "classrooms.view"
  | "classrooms.manage"
  | "subjects.view"
  | "subjects.manage"
  | "teacher_subjects.view"
  | "teacher_subjects.manage"
  | "schedules.view"
  | "schedules.manage"
  | "users.view"
  | "users.manage"
  | "students.view"
  | "students.manage"
  | "teachers.view"
  | "teachers.manage"
  | "attendance.view"
  | "attendance.manage"
  | "grades.view"
  | "grades.manage"
  | "behavior.view"
  | "behavior.manage"
  | "reports.view"
  | "reports.export"
  | "settings.manage";

export const ROLE_PERMISSIONS: Record<SchoolRole, PermissionKey[]> = {
  super_admin: [
    "schools.view",
    "schools.manage",
    "stages.view",
    "stages.manage",
    "classrooms.view",
    "classrooms.manage",
    "subjects.view",
    "subjects.manage",
    "teacher_subjects.view",
    "teacher_subjects.manage",
    "schedules.view",
    "schedules.manage",
    "users.view",
    "users.manage",
    "students.view",
    "students.manage",
    "teachers.view",
    "teachers.manage",
    "attendance.view",
    "attendance.manage",
    "grades.view",
    "grades.manage",
    "behavior.view",
    "behavior.manage",
    "reports.view",
    "reports.export",
    "settings.manage",
  ],

  school_admin: [
    "schools.view",
    "schools.manage",
    "stages.view",
    "stages.manage",
    "classrooms.view",
    "classrooms.manage",
    "subjects.view",
    "subjects.manage",
    "teacher_subjects.view",
    "teacher_subjects.manage",
    "schedules.view",
    "schedules.manage",
    "users.view",
    "users.manage",
    "students.view",
    "students.manage",
    "teachers.view",
    "teachers.manage",
    "attendance.view",
    "attendance.manage",
    "grades.view",
    "grades.manage",
    "behavior.view",
    "behavior.manage",
    "reports.view",
    "reports.export",
    "settings.manage",
  ],

  vice_principal: [
    "schools.view",
    "stages.view",
    "classrooms.view",
    "subjects.view",
    "teacher_subjects.view",
    "teacher_subjects.manage",
    "schedules.view",
    "schedules.manage",
    "students.view",
    "students.manage",
    "teachers.view",
    "attendance.view",
    "attendance.manage",
    "behavior.view",
    "behavior.manage",
    "reports.view",
    "reports.export",
  ],

  teacher: [
    "schools.view",
    "stages.view",
    "classrooms.view",
    "subjects.view",
    "teacher_subjects.view",
    "schedules.view",
    "students.view",
    "attendance.view",
    "attendance.manage",
    "grades.view",
    "grades.manage",
    "behavior.view",
    "reports.view",
  ],

  administrative_staff: [
    "schools.view",
    "students.view",
    "students.manage",
    "attendance.view",
    "attendance.manage",
    "reports.view",
    "reports.export",
  ],

  student_counselor: [
    "schools.view",
    "students.view",
    "attendance.view",
    "behavior.view",
    "behavior.manage",
    "reports.view",
  ],

  health_supervisor: [
    "schools.view",
    "students.view",
    "reports.view",
  ],

  activity_leader: [
    "schools.view",
    "students.view",
    "reports.view",
  ],

  student: [
    "schools.view",
    "attendance.view",
    "grades.view",
    "behavior.view",
  ],

  parent: [
    "schools.view",
    "attendance.view",
    "grades.view",
    "behavior.view",
  ],
};

export function getRolePermissions(role: SchoolRole | null | undefined) {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(
  role: SchoolRole | null | undefined,
  permission: PermissionKey,
) {
  return getRolePermissions(role).includes(permission);
}
import { roles } from "./roles";

type RoleKey = (typeof roles)[keyof typeof roles];

export const permissions = {
  viewDashboard: "view_dashboard",

  manageSchools: "manage_schools",
  manageUsers: "manage_users",
  manageStudents: "manage_students",
  manageTeachers: "manage_teachers",

  manageAttendance: "manage_attendance",
  manageGrades: "manage_grades",
  manageBehavior: "manage_behavior",

  manageQuality: "manage_quality",
  viewQuality: "view_quality",

  manageReports: "manage_reports",
  viewReports: "view_reports",

  manageActivities: "manage_activities",
  manageHealth: "manage_health",
  manageCounseling: "manage_counseling",

  viewTeacherPortal: "view_teacher_portal",
  viewStudentPortal: "view_student_portal",
  viewParentPortal: "view_parent_portal",
} as const;

export type PermissionKey =
  (typeof permissions)[keyof typeof permissions];

export const rolePermissions: Record<RoleKey, PermissionKey[]> = {
  [roles.superAdmin]: Object.values(permissions),

  [roles.schoolAdmin]: [
    permissions.viewDashboard,
    permissions.manageUsers,
    permissions.manageStudents,
    permissions.manageTeachers,
    permissions.manageAttendance,
    permissions.manageGrades,
    permissions.manageBehavior,
    permissions.manageQuality,
    permissions.viewQuality,
    permissions.manageReports,
    permissions.viewReports,
    permissions.manageActivities,
    permissions.manageHealth,
    permissions.manageCounseling,
  ],

  [roles.vicePrincipal]: [
    permissions.viewDashboard,
    permissions.manageStudents,
    permissions.manageAttendance,
    permissions.manageBehavior,
    permissions.manageReports,
    permissions.viewReports,
  ],

  [roles.administrativeStaff]: [
    permissions.viewDashboard,
    permissions.manageStudents,
    permissions.manageAttendance,
    permissions.viewReports,
  ],

  [roles.studentCounselor]: [
    permissions.viewDashboard,
    permissions.manageBehavior,
    permissions.manageCounseling,
    permissions.viewReports,
  ],

  [roles.healthSupervisor]: [
    permissions.viewDashboard,
    permissions.manageHealth,
    permissions.viewReports,
  ],

  [roles.activityLeader]: [
    permissions.viewDashboard,
    permissions.manageActivities,
    permissions.viewReports,
  ],

  [roles.teacher]: [
    permissions.viewTeacherPortal,
    permissions.manageAttendance,
    permissions.manageGrades,
    permissions.viewReports,
  ],

  [roles.student]: [
    permissions.viewStudentPortal,
  ],

  [roles.parent]: [
    permissions.viewParentPortal,
  ],
};

export function hasPermission(
  role: RoleKey | null | undefined,
  permission: PermissionKey,
): boolean {
  if (!role) return false;

  const permissionsForRole = rolePermissions[role] ?? [];

  return permissionsForRole.includes(permission);
}

export function hasAnyPermission(
  role: RoleKey | null | undefined,
  requiredPermissions: PermissionKey[],
): boolean {
  if (!role) return false;

  return requiredPermissions.some((permission) =>
    hasPermission(role, permission),
  );
}

export function hasAllPermissions(
  role: RoleKey | null | undefined,
  requiredPermissions: PermissionKey[],
): boolean {
  if (!role) return false;

  return requiredPermissions.every((permission) =>
    hasPermission(role, permission),
  );
}
export const roles = {
  superAdmin: "super_admin",
  schoolAdmin: "school_admin",
  vicePrincipal: "vice_principal",
  administrativeStaff: "administrative_staff",
  studentCounselor: "student_counselor",
  healthSupervisor: "health_supervisor",
  activityLeader: "activity_leader",
  teacher: "teacher",
  student: "student",
  parent: "parent",
} as const;

export type RoleKey = (typeof roles)[keyof typeof roles];

export const roleLabels: Record<RoleKey, string> = {
  super_admin: "مدير النظام",
  school_admin: "مدير المدرسة",
  vice_principal: "وكيل المدرسة",
  administrative_staff: "إداري",
  student_counselor: "الموجه الطلابي",
  health_supervisor: "الموجه الصحي",
  activity_leader: "رائد النشاط",
  teacher: "معلم",
  student: "طالب",
  parent: "ولي أمر",
};

export const leadershipRoles: RoleKey[] = [
  roles.superAdmin,
  roles.schoolAdmin,
  roles.vicePrincipal,
];

export const staffRoles: RoleKey[] = [
  roles.superAdmin,
  roles.schoolAdmin,
  roles.vicePrincipal,
  roles.administrativeStaff,
  roles.studentCounselor,
  roles.healthSupervisor,
  roles.activityLeader,
  roles.teacher,
];

export const portalRoles: RoleKey[] = [
  roles.teacher,
  roles.student,
  roles.parent,
];

export const adminRoles: RoleKey[] = [
  roles.superAdmin,
  roles.schoolAdmin,
];

export function isLeadershipRole(role: RoleKey | null | undefined): boolean {
  return !!role && leadershipRoles.includes(role);
}

export function isStaffRole(role: RoleKey | null | undefined): boolean {
  return !!role && staffRoles.includes(role);
}

export function isPortalRole(role: RoleKey | null | undefined): boolean {
  return !!role && portalRoles.includes(role);
}

export function getRoleLabel(role: RoleKey): string {
  return roleLabels[role];
}
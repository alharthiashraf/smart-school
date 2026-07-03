export const roleKeys = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "student_counselor",
  "health_supervisor",
  "activity_leader",
  "teacher",
  "student",
  "parent",
] as const;

export type RoleKey = (typeof roleKeys)[number];

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

export const adminRoles: RoleKey[] = [
  "super_admin",
  "school_admin",
];

export const leadershipRoles: RoleKey[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
];

export const staffRoles: RoleKey[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "student_counselor",
  "health_supervisor",
  "activity_leader",
  "teacher",
];

export const portalRoles: RoleKey[] = [
  "teacher",
  "student",
  "parent",
];

export function isAdminRole(role: RoleKey | null | undefined): boolean {
  return !!role && adminRoles.includes(role);
}

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
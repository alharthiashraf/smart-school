export type PermissionRule<Role extends string = string, Permission extends string = string> = Record<Role, Permission[]>;

export const PermissionEngine = {
  has<Role extends string, Permission extends string>(rules: PermissionRule<Role, Permission>, role: Role | null | undefined, permission: Permission) {
    if (!role) return false;
    return (rules[role] ?? []).includes(permission);
  },

  hasAny<Role extends string, Permission extends string>(rules: PermissionRule<Role, Permission>, role: Role | null | undefined, permissions: Permission[]) {
    return permissions.some((permission) => this.has(rules, role, permission));
  },

  hasAll<Role extends string, Permission extends string>(rules: PermissionRule<Role, Permission>, role: Role | null | undefined, permissions: Permission[]) {
    return permissions.every((permission) => this.has(rules, role, permission));
  },
};

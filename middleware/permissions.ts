import {
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
} from "@/constants/permissions";

import type { PermissionKey } from "@/constants/permissions";
import type { RoleKey } from "@/constants/roles";

export type PermissionResult = {
  allowed: boolean;
  reason?: string;
};

export function hasPermission(
  role: RoleKey | null | undefined,
  permission: PermissionKey,
): boolean {
  return checkPermission(role, permission);
}

export function hasAnyPermission(
  role: RoleKey | null |undefined,
  permissions: PermissionKey[],
): boolean {
  return checkAnyPermission(role, permissions);
}

export function hasAllPermissions(
  role: RoleKey | null | undefined,
  permissions: PermissionKey[],
): boolean {
  if (!role) return false;
  return permissions.every((permission) =>
    checkPermission(role, permission),
  );
}

export function requirePermission(
  role: RoleKey | null | undefined,
  permission: PermissionKey,
): PermissionResult {
  if (!role) {
    return {
      allowed: false,
      reason: "لم يتم تسجيل الدخول.",
    };
  }

  if (!checkPermission(role, permission)) {
    return {
      allowed: false,
      reason: "ليس لديك صلاحية للوصول إلى هذه الصفحة.",
    };
  }

  return { allowed: true };
}

export function requireAnyPermission(
  role: RoleKey | null | undefined,
  permissions: PermissionKey[],
): PermissionResult {
  if (!role) {
    return {
      allowed: false,
      reason: "لم يتم تسجيل الدخول.",
    };
  }

  if (!checkAnyPermission(role, permissions)) {
    return {
      allowed: false,
      reason: "ليس لديك أي من الصلاحيات المطلوبة.",
    };
  }

  return { allowed: true };
}

export function requireAllPermissions(
  role: RoleKey | null | undefined,
  permissions: PermissionKey[],
): PermissionResult {
  if (!role) {
    return {
      allowed: false,
      reason: "لم يتم تسجيل الدخول.",
    };
  }

  if (!permissions.every((permission) => checkPermission(role, permission))) {
    return {
      allowed: false,
      reason: "لا تملك جميع الصلاحيات المطلوبة.",
    };
  }

  return { allowed: true };
}

export function filterNavigationItems<
  T extends {
    permission?: PermissionKey;
  },
>(role: RoleKey | null | undefined, items: T[]): T[] {
  if (!role) return [];

  return items.filter((item) => {
    if (!item.permission) return true;
    return checkPermission(role, item.permission);
  });
}

export function protectPage(
  role: RoleKey | null | undefined,
  permission: PermissionKey,
): true {
  const result = requirePermission(role, permission);

  if (!result.allowed) {
    throw new Error(result.reason);
  }

  return true;
}
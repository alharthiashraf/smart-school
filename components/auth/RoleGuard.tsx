"use client";

import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { useSchool } from "@/contexts/SchoolContext";

export type RoleGuardProps = {
  allowedRoles: readonly string[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
};

function resolveSchoolRole(school: unknown): string | null {
  if (!school || typeof school !== "object") {
    return null;
  }

  const record = school as Record<string, unknown>;

  const candidates = [
    record.role,
    record.user_role,
    record.member_role,
  ];

  const role = candidates.find(
    (value): value is string =>
      typeof value === "string" &&
      value.trim().length > 0,
  );

  return role?.trim() ?? null;
}

export default function RoleGuard({
  allowedRoles,
  children,
  fallback,
  loadingFallback,
}: RoleGuardProps) {
  const {
    currentSchool,
    loading,
  } = useSchool();

  if (loading) {
    return (
      loadingFallback ?? (
        <EmptyState
          title="جاري التحقق"
          description="يتم التحقق من صلاحيات المستخدم..."
        />
      )
    );
  }

  if (!currentSchool) {
    return (
      fallback ?? (
        <EmptyState
          title="لا توجد مدرسة"
          description="لا توجد مدرسة مرتبطة بالمستخدم الحالي."
        />
      )
    );
  }

  const role = resolveSchoolRole(currentSchool);

  if (!role || !allowedRoles.includes(role)) {
    return (
      fallback ?? (
        <EmptyState
          title="غير مصرح"
          description="ليس لديك صلاحية للوصول إلى هذه الصفحة."
        />
      )
    );
  }

  return <>{children}</>;
}
"use client";

import type { ReactNode } from "react";

import { useSchool } from "@/contexts/SchoolContext";

type RoleGuardProps = {
  allowedRoles: readonly string[];
  children: ReactNode;
};

function resolveSchoolRole(school: unknown): string | null {
  if (!school || typeof school !== "object") return null;

  const record = school as Record<string, unknown>;
  const candidates = [record.role, record.user_role, record.member_role];

  const role = candidates.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  return role?.trim() ?? null;
}

export default function RoleGuard({
  allowedRoles,
  children,
}: RoleGuardProps) {
  const { currentSchool, loading } = useSchool();

  if (loading) {
    return <div>جاري التحقق من الصلاحيات...</div>;
  }

  if (!currentSchool) {
    return <div>لا توجد مدرسة مرتبطة بالمستخدم الحالي.</div>;
  }

  const role = resolveSchoolRole(currentSchool);

  if (!role || !allowedRoles.includes(role)) {
    return <div>لا تملك صلاحية الدخول لهذه الصفحة.</div>;
  }

  return <>{children}</>;
}

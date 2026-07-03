"use client";

import { ReactNode } from "react";
import { useSchool } from "@/contexts/SchoolContext";

export default function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: readonly string[];
  children: ReactNode;
}) {
  const { currentSchool, loading } = useSchool();

  if (loading) {
    return <div>جاري التحقق من الصلاحيات...</div>;
  }

  if (!currentSchool) {
    return <div>لا توجد مدرسة مرتبطة بالمستخدم الحالي.</div>;
  }

  const role =
    (currentSchool as any).role ||
    (currentSchool as any).user_role ||
    (currentSchool as any).member_role ||
    "school_admin";

  if (!allowedRoles.includes(role)) {
    return <div>لا تملك صلاحية الدخول لهذه الصفحة.</div>;
  }

  return <>{children}</>;
}
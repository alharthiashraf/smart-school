"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { useSchool } from "@/contexts/SchoolContext";
import type { PermissionKey, SchoolRole } from "@/lib/permissions";

type AuthGuardProps = {
  children: ReactNode;
  roles?: SchoolRole[];
  permissions?: PermissionKey[];
  requireAllPermissions?: boolean;
};

export default function AuthGuard({
  children,
  roles,
  permissions,
  requireAllPermissions = false,
}: AuthGuardProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    currentRole,
    loading: schoolLoading,
    hasAnyPermission,
    hasAllPermissions,
  } = useSchool();

  const loading = authLoading || schoolLoading;

  const hasRoleAccess =
    !roles || roles.length === 0 || (!!currentRole && roles.includes(currentRole));

  const hasPermissionAccess =
    !permissions ||
    permissions.length === 0 ||
    (requireAllPermissions
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions));

  const allowed = hasRoleAccess && hasPermissionAccess;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="text-sm font-black text-slate-800">
            جاري التحقق من الصلاحيات...
          </div>
          <div className="mt-2 text-xs font-bold text-slate-400">
            لحظات فقط
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <div className="text-lg font-black text-rose-700">
            لا تملك صلاحية الوصول
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            هذه الصفحة مخصصة لأدوار أو صلاحيات محددة داخل المدرسة الحالية.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
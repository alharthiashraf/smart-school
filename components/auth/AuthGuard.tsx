"use client";

import {
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { useSchool } from "@/contexts/SchoolContext";
import type {
  PermissionKey,
  SchoolRole,
} from "@/lib/permissions";

export type AuthGuardProps = {
  children: ReactNode;
  roles?: readonly SchoolRole[];
  permissions?: readonly PermissionKey[];
  requireAllPermissions?: boolean;
  loadingFallback?: ReactNode;
  unauthorizedFallback?: ReactNode;
};

export default function AuthGuard({
  children,
  roles,
  permissions,
  requireAllPermissions = false,
  loadingFallback,
  unauthorizedFallback,
}: AuthGuardProps) {
  const router = useRouter();

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const {
    currentRole,
    loading: schoolLoading,
    hasAnyPermission,
    hasAllPermissions,
  } = useSchool();

  const loading =
    authLoading || schoolLoading;

  const hasRoleAccess =
    !roles ||
    roles.length === 0 ||
    (
      Boolean(currentRole) &&
      roles.includes(currentRole as SchoolRole)
    );

  const hasPermissionAccess =
    !permissions ||
    permissions.length === 0 ||
    (
      requireAllPermissions
        ? hasAllPermissions([...permissions])
        : hasAnyPermission([...permissions])
    );

  const allowed =
    hasRoleAccess &&
    hasPermissionAccess;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [
    authLoading,
    router,
    user,
  ]);

  if (loading) {
    return (
      <>
        {loadingFallback ?? (
          <div className="flex min-h-screen items-center justify-center bg-[var(--app-background)] px-4">
            <div className="w-full max-w-md">
              <PageLoader text="جاري التحقق من الصلاحيات..." />
            </div>
          </div>
        )}
      </>
    );
  }

  if (!user) {
    return null;
  }

  if (!allowed) {
    return (
      <>
        {unauthorizedFallback ?? (
          <div className="flex min-h-screen items-center justify-center bg-[var(--app-background)] px-4">
            <div className="w-full max-w-lg">
              <EmptyState
                title="لا تملك صلاحية الوصول"
                description="هذه الصفحة مخصصة لأدوار أو صلاحيات محددة داخل المدرسة الحالية."
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
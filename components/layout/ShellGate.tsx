"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppShell from "./AppShell";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
]);

type ShellGateProps = {
  children: ReactNode;
};

export default function ShellGate({
  children,
}: ShellGateProps) {
  const pathname = usePathname();

  const isPublicRoute =
    PUBLIC_ROUTES.has(pathname) ||
    [...PUBLIC_ROUTES].some(
      (route) => route !== "/" && pathname.startsWith(`${route}/`),
    );

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
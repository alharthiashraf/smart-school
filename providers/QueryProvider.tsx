"use client";

import { ReactNode } from "react";

export default function QueryProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
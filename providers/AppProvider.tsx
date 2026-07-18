"use client";

import { ReactNode } from "react";

import ThemeProvider from "./ThemeProvider";
import QueryProvider from "./QueryProvider";

import { AuthProvider } from "@/contexts/AuthContext";
import { SchoolProvider } from "@/contexts/SchoolContext";

export default function AppProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <SchoolProvider>{children}</SchoolProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

import type { Metadata } from "next";
import "./globals.css";

import ShellGate from "@/components/layout/ShellGate";
import { AuthProvider } from "@/contexts/AuthContext";
import { SchoolProvider } from "@/contexts/SchoolContext";

export const metadata: Metadata = {
  title: "منصة المدرسة الذكية 2.0",
  description: "منصة مدرسية ذكية متعددة المدارس والصلاحيات",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <SchoolProvider>
            <ShellGate>{children}</ShellGate>
          </SchoolProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
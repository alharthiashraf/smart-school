import type { Metadata } from "next";
import "./globals.css";

import ShellGate from "@/components/layout/ShellGate";
import { AuthProvider } from "@/contexts/AuthContext";
import { SchoolProvider } from "@/contexts/SchoolContext";

export const metadata: Metadata = {
  title: {
    default: "منصة المدرسة الذكية",
    template: "%s | منصة المدرسة الذكية",
  },
  description:
    "منصة مدرسية ذكية لإدارة الطلاب والمعلمين والحضور والدرجات والجداول والتقارير والصلاحيات.",
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

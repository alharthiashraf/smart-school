import type { Metadata } from "next";
import "./globals.css";

import ShellGate from "@/components/layout/ShellGate";
import { AuthProvider } from "@/contexts/AuthContext";
import { SchoolProvider } from "@/contexts/SchoolContext";

export const metadata: Metadata = {
  title: "منصة المدرسة الذكية",
  description: "منصة مدرسية ذكية متعددة المدارس والصلاحيات",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-slate-50 text-[#15445A] antialiased"
      >
        <AuthProvider>
          <SchoolProvider>
            <ShellGate>{children}</ShellGate>
          </SchoolProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
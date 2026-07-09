import type { Metadata } from "next";
import "./globals.css";

import ShellGate from "@/components/layout/ShellGate";
import { AuthProvider } from "@/contexts/AuthContext";
import { SchoolProvider } from "@/contexts/SchoolContext";
import ThemeProvider from "@/providers/ThemeProvider";

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
        className="min-h-screen bg-background text-foreground antialiased"
      >
        <ThemeProvider>
          <AuthProvider>
            <SchoolProvider>
              <ShellGate>{children}</ShellGate>
            </SchoolProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

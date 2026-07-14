import type { Metadata } from "next";
import "./globals.css";

import ShellGate from "@/components/layout/ShellGate";
import { AuthProvider } from "@/contexts/AuthContext";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    default: "منصة المدرسة الذكية",
    template: "%s | منصة المدرسة الذكية",
  },
  description:
    "منصة مدرسية ذكية لإدارة الطلاب والمعلمين والحضور والدرجات والجداول والتقارير والصلاحيات.",

  other: {
    "domain-verification":
      "c73ffc47d67500d4beb490e572f4a46e2d67d2b82a9a96b3ae47bc8c24c779af",
  },
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
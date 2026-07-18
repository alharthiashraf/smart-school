import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { AuthProvider } from "@/contexts/AuthContext";
import { SchoolProvider } from "@/contexts/SchoolContext";
import ThemeProvider from "@/providers/ThemeProvider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "منصة المدرسة الذكية",
    template: "%s | منصة المدرسة الذكية",
  },
  description:
    "منصة مدرسية ذكية موحدة لإدارة الطلاب والمعلمين والحضور والدرجات والجداول والتقارير والخدمات المدرسية.",
  applicationName: "منصة المدرسة الذكية",

  other: {
    "domain-verification":
      "353bd6034df0a2260d336ec2fd05aefc4db72323ba3f9ec6c1e4621ab00af610",
  },
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--app-background)] text-[var(--app-text)]">
        <ThemeProvider>
          <AuthProvider>
            <SchoolProvider>{children}</SchoolProvider>
          </AuthProvider>
        </ThemeProvider>

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

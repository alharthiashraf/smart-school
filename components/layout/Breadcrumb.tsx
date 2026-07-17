"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Home } from "lucide-react";

const PAGE_NAMES: Record<string, string> = {
  dashboard: "لوحة التحكم",
  schools: "المدارس",
  users: "المستخدمون",
  students: "الطلاب",
  teachers: "المعلمون",
  stages: "المراحل",
  classrooms: "الفصول",
  subjects: "المواد",
  "teacher-subjects": "إسناد المعلمين",
  schedules: "الجداول",
  attendance: "الحضور",
  grades: "الدرجات",
  analyzer: "تحليل الدرجات",
  reports: "التقارير",
  analytics: "التحليلات",
  activities: "الأنشطة",
  counselor: "الإرشاد الطلابي",
  health: "الصحة المدرسية",
  behavior: "السلوك والمواظبة",
  settings: "الإعدادات",
  alerts: "التنبيهات",
  notifications: "الإشعارات",
  "teacher-portal": "بوابة المعلم",
  "student-portal": "بوابة الطالب",
  "parent-portal": "بوابة ولي الأمر",
  quality: "الجودة",
  "evidence-auditor": "مدقق الشواهد",
  search: "البحث",
  administration: "الإدارة",
  "school-admin": "إدارة المدرسة",
  "student-interventions": "التدخلات الطلابية",
  "noor-import": "استيراد نور",
};

function getPageName(segment: string) {
  return PAGE_NAMES[segment] ?? decodeURIComponent(segment);
}

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || pathname === "/dashboard") {
    return null;
  }

  return (
    <nav
      className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--app-text-muted)]"
      aria-label="مسار الصفحة"
    >
      <Link
        href="/dashboard"
        className="
          inline-flex items-center gap-2
          rounded-xl
          border border-[var(--app-border)]
          bg-[var(--app-card)]
          px-4 py-2
          shadow-sm
          transition-all duration-200
          hover:border-[var(--app-gold)]
          hover:text-[var(--app-gold)]
        "
      >
        <Home className="h-4 w-4" />
        الرئيسية
      </Link>

      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;

        return (
          <span key={href} className="inline-flex items-center gap-2">
            <ChevronLeft className="h-4 w-4 text-[var(--app-text-muted)]" />

            {isLast ? (
              <span
                className="
                  rounded-xl
                  bg-[var(--app-gold-soft)]
                  px-4 py-2
                  font-bold
                  text-[var(--app-gold)]
                "
              >
                {getPageName(segment)}
              </span>
            ) : (
              <Link
                href={href}
                className="
                  rounded-xl
                  border border-[var(--app-border)]
                  bg-[var(--app-card)]
                  px-4 py-2
                  transition-all duration-200
                  hover:border-[var(--app-gold)]
                  hover:text-[var(--app-gold)]
                "
              >
                {getPageName(segment)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
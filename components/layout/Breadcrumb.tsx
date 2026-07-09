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

  if (segments.length === 0 || pathname === "/dashboard") return null;

  return (
    <nav
      className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400"
      aria-label="مسار الصفحة"
    >
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-600 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
      >
        <Home className="h-4 w-4" />
        الرئيسية
      </Link>

      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;

        return (
          <span key={href} className="inline-flex items-center gap-2">
            <ChevronLeft className="h-3.5 w-3.5 text-slate-300" />

            {isLast ? (
              <span className="rounded-2xl bg-emerald-50 px-3 py-2 text-emerald-700">
                {getPageName(segment)}
              </span>
            ) : (
              <Link
                href={href}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-600 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
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
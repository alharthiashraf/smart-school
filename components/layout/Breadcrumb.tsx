"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Home } from "lucide-react";

const PAGE_NAMES = {
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

  reports: "التقارير",
  analytics: "التحليلات",

  activities: "الأنشطة",

  counselor: "الإرشاد الطلابي",
  health: "الصحة المدرسية",
  behavior: "السلوك والمواظبة",

  settings: "الإعدادات",

  alerts: "التنبيهات",

  "teacher-portal": "بوابة المعلم",
  "student-portal": "بوابة الطالب",
  "parent-portal": "بوابة ولي الأمر",

  quality: "الجودة",
  "evidence-auditor": "مدقق الشواهد",

  search: "البحث",
} as const;

function getPageName(segment: string) {
  return (
    PAGE_NAMES[segment as keyof typeof PAGE_NAMES] ??
    decodeURIComponent(segment)
  );
}

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || pathname === "/dashboard") {
    return null;
  }

  return (
    <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 rounded-xl bg-white px-3 py-2 shadow-sm transition hover:text-slate-950"
      >
        <Home size={16} />
        لوحة التحكم
      </Link>

      {segments.map((segment, index) => {
        const currentHref = `/${segments.slice(0, index + 1).join("/")}`;

        return (
          <div
            key={currentHref}
            className="flex items-center gap-2"
          >
            <ChevronLeft
              size={16}
              className="text-slate-400"
            />

            <Link
              href={currentHref}
              className="rounded-xl bg-white px-3 py-2 shadow-sm transition hover:text-slate-950"
            >
              {getPageName(segment)}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
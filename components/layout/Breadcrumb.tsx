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
  "school-admin": "إدارة المدرسة",
  "quality-center": "مركز الجودة",
  "portfolio-monitor": "مراقبة المحافظ",

  daily: "اليومي",
  waiting: "حصص الانتظار",
  preparations: "التحاضير",
  schedule: "الجدول",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getPageName(segment: string) {
  const decodedSegment = decodeURIComponent(segment);

  return PAGE_NAMES[decodedSegment] ?? decodedSegment;
}

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || pathname === "/dashboard") {
    return null;
  }

  return (
    <nav
      aria-label="مسار الصفحة"
      className="mb-5 overflow-x-auto pb-1"
    >
      <ol className="flex min-w-max items-center gap-1.5 text-xs font-semibold text-[var(--app-text-muted)]">
        <li>
          <Link
            href="/dashboard"
            className={cx(
              "inline-flex h-9 items-center gap-2 rounded-[var(--app-radius-md)] px-3",
              "transition-colors duration-200",
              "hover:bg-[var(--app-card-soft)] hover:text-[var(--app-primary)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-background)]",
            )}
          >
            <Home aria-hidden="true" className="h-4 w-4" />
            <span>الرئيسية</span>
          </Link>
        </li>

        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const pageName = getPageName(segment);

          return (
            <li
              key={href}
              className="inline-flex items-center gap-1.5"
              aria-current={isLast ? "page" : undefined}
            >
              <ChevronLeft
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-[var(--app-text-subtle)]"
              />

              {isLast ? (
                <span
                  className={cx(
                    "inline-flex h-9 items-center rounded-[var(--app-radius-md)] px-3",
                    "bg-[var(--app-primary-soft)] font-black text-[var(--app-primary)]",
                  )}
                  title={pageName}
                >
                  {pageName}
                </span>
              ) : (
                <Link
                  href={href}
                  className={cx(
                    "inline-flex h-9 items-center rounded-[var(--app-radius-md)] px-3",
                    "transition-colors duration-200",
                    "hover:bg-[var(--app-card-soft)] hover:text-[var(--app-primary)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-background)]",
                  )}
                  title={pageName}
                >
                  {pageName}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import ThemeToggle from "@/components/theme/ThemeToggle";
import { useSchool } from "@/contexts/SchoolContext";
import type { SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

import {
  HeaderBrand,
  HeaderNotifications,
  HeaderSearch,
  HeaderUserMenu,
} from "./header";

type HeaderUser = {
  full_name: string;
  email: string;
};

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "لوحة التحكم",
  "/schools": "المدارس",
  "/users": "المستخدمون",
  "/students": "الطلاب",
  "/teachers": "المعلمون",
  "/stages": "المراحل",
  "/classrooms": "الفصول",
  "/subjects": "المواد",
  "/teacher-subjects": "إسناد المعلمين",
  "/schedules": "الجداول الدراسية",
  "/attendance": "الحضور والغياب",
  "/grades/analyzer": "تحليل الدرجات",
  "/grades": "الدرجات",
  "/behavior": "السلوك والمواظبة",
  "/reports": "التقارير",
  "/analytics": "التحليلات",
  "/activities": "الأنشطة",
  "/health": "الصحة المدرسية",
  "/counselor": "الإرشاد الطلابي",
  "/quality/evidence-auditor": "مدقق الشواهد",
  "/teacher-portal": "بوابة المعلم",
  "/student-portal": "بوابة الطالب",
  "/parent-portal": "بوابة ولي الأمر",
  "/settings": "الإعدادات",
};

const ROLE_NAME_MAP: Record<SchoolRole, string> = {
  super_admin: "مدير النظام",
  school_admin: "مدير المدرسة",
  vice_principal: "وكيل المدرسة",
  administrative_staff: "إداري",
  student_counselor: "الموجه الطلابي",
  health_supervisor: "الموجه الصحي",
  activity_leader: "رائد النشاط",
  teacher: "معلم",
  student: "طالب",
  parent: "ولي أمر",
};

function getPageTitle(pathname: string) {
  const matchedPath = Object.keys(PAGE_TITLES)
    .filter(
      (path) =>
        pathname === path ||
        pathname.startsWith(`${path}/`),
    )
    .sort(
      (firstPath, secondPath) =>
        secondPath.length - firstPath.length,
    )[0];

  return matchedPath
    ? PAGE_TITLES[matchedPath]
    : "منصة المدرسة الذكية";
}

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    currentSchool,
    currentRole,
    academicYear,
    semester,
  } = useSchool();

  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsCount, setNotificationsCount] =
    useState(0);

  const [user, setUser] = useState<HeaderUser>({
    full_name: "مستخدم",
    email: "",
  });

  const pageTitle = useMemo(
    () => getPageTitle(pathname),
    [pathname],
  );

  const roleName = currentRole
    ? ROLE_NAME_MAP[currentRole]
    : "مستخدم";

  const loadAuthUser = useCallback(async () => {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser) {
      return;
    }

    setUser({
      full_name:
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email ||
        "مستخدم",
      email: authUser.email || "",
    });
  }, []);

  const loadNotificationsCount = useCallback(async () => {
    if (!currentSchool?.id) {
      setNotificationsCount(0);
      return;
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("school_id", currentSchool.id)
      .eq("is_read", false);

    if (error) {
      setNotificationsCount(0);
      return;
    }

    setNotificationsCount(count ?? 0);
  }, [currentSchool?.id]);

  useEffect(() => {
    void loadAuthUser();
  }, [loadAuthUser]);

  useEffect(() => {
    void loadNotificationsCount();
  }, [loadNotificationsCount]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function submitSearch(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return;
    }

    router.push(
      `/search?q=${encodeURIComponent(normalizedQuery)}`,
    );
  }

  async function logout() {
    const confirmed = window.confirm(
      "هل تريد تسجيل الخروج؟",
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      window.alert(
        "تعذر تسجيل الخروج، حاول مرة أخرى.",
      );
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <header
      className="
        sticky top-0 z-40
        border-b border-[var(--app-border)]
        bg-[var(--app-header)]/95
        text-[var(--app-text)]
        shadow-[var(--app-shadow-sm)]
        backdrop-blur-xl
      "
    >
      <div className="flex min-h-16 items-center gap-3 px-3 sm:px-4 lg:px-6">
        <HeaderBrand
          title={pageTitle}
          schoolName={currentSchool?.school_name}
          academicYear={academicYear}
          semester={semester}
        />

        <HeaderSearch
          value={query}
          onChange={setQuery}
          onSubmit={submitSearch}
        />

        <div className="mr-auto flex items-center gap-2">
          <ThemeToggle />

          <HeaderNotifications
            count={notificationsCount}
          />

          <HeaderUserMenu
            user={user}
            roleName={roleName}
            schoolName={currentSchool?.school_name}
            open={menuOpen}
            onToggle={() =>
              setMenuOpen((current) => !current)
            }
            onClose={() => setMenuOpen(false)}
            onLogout={logout}
          />
        </div>
      </div>
    </header>
  );
}

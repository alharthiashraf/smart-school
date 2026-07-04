"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Search,
  School,
  Settings,
  UserRound,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import type { SchoolRole } from "@/lib/permissions";

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
  "/grades": "الدرجات",
  "/grades/analyzer": "تحليل الدرجات",
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
  const matched = Object.keys(PAGE_TITLES)
    .filter((path) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];

  return matched ? PAGE_TITLES[matched] : "منصة المدرسة الذكية";
}

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const { currentSchool, currentRole, academicYear, semester } = useSchool();

  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [user, setUser] = useState<HeaderUser>({
    full_name: "مستخدم",
    email: "",
  });

  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);
  const roleName = currentRole ? ROLE_NAME_MAP[currentRole] : "مستخدم";

  const loadAuthUser = useCallback(async () => {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser) return;

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
      .select("id", { count: "exact", head: true })
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

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = query.trim();
    if (!text) return;

    router.push(`/search?q=${encodeURIComponent(text)}`);
  }

  async function logout() {
    const ok = window.confirm("هل تريد تسجيل الخروج؟");
    if (!ok) return;

    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-card)_88%,transparent)] px-3 py-3 shadow-sm backdrop-blur-xl transition-colors duration-300 sm:px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary)] text-white shadow-lg shadow-emerald-900/10">
              <School size={21} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-black text-[var(--app-text)]">
                {pageTitle}
              </h1>

              <p className="truncate text-xs font-bold text-[var(--app-text-muted)]">
                {currentSchool?.school_name || "منصة المدرسة الذكية"} ·{" "}
                {academicYear || "العام الدراسي"} ·{" "}
                {semester || "الفصل الدراسي"}
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={submitSearch}
          className="hidden min-w-[260px] max-w-xl flex-1 items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 transition focus-within:border-[var(--app-accent)] lg:flex"
        >
          <Search size={18} className="text-[var(--app-text-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بحث سريع داخل المنصة..."
            className="w-full bg-transparent text-sm font-bold text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-muted)]"
          />
        </form>

        <Link
          href="/alerts"
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-card-soft)]"
          aria-label="التنبيهات"
        >
          <Bell size={19} />
          {notificationsCount > 0 && (
            <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
              {notificationsCount > 99 ? "99+" : notificationsCount}
            </span>
          )}
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex h-11 items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-3 text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-card-soft)]"
          >
            <UserRound size={18} />
            <span className="hidden max-w-[140px] truncate text-sm font-black md:block">
              {user.full_name}
            </span>
            <ChevronDown size={16} />
          </button>

          {menuOpen && (
            <div className="absolute left-0 mt-2 w-72 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-2xl">
              <div className="border-b border-[var(--app-border)] p-4">
                <p className="truncate text-sm font-black text-[var(--app-text)]">
                  {user.full_name}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--app-text-muted)]">
                  {user.email || "بدون بريد"}
                </p>
                <p className="mt-2 inline-flex rounded-full bg-[var(--app-accent-soft)] px-3 py-1 text-xs font-black text-[var(--app-text)]">
                  {roleName}
                </p>
              </div>

              <div className="p-2">
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-[var(--app-text)] transition hover:bg-[var(--app-card-soft)]"
                >
                  <Settings size={17} />
                  الإعدادات
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                >
                  <LogOut size={17} />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
} from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FileText,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  Moon,
  Palette,
  Pin,
  PinOff,
  School,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Sun,
  UserCog,
  UsersRound,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import type { SchoolRole } from "@/lib/permissions";
import type { PermissionKey } from "@/lib/permissions/permissions";

type AppTheme = "smart-light" | "smart-dark" | "ministry";

type SidebarItem = {
  label: string;
  href: string;
  icon: ElementType;
  roles?: SchoolRole[];
  permission?: PermissionKey;
  keywords?: string[];
  badge?: string;
};

type SidebarSection = {
  id: string;
  label: string;
  icon: ElementType;
  roles?: SchoolRole[];
  permission?: PermissionKey;
  children: SidebarItem[];
};

const COLLAPSED_KEY = "smart-school-v1-sidebar-collapsed";
const OPEN_SECTIONS_KEY = "smart-school-v1-sidebar-open-sections";
const FAVORITES_KEY = "smart-school-v1-sidebar-favorites";
const THEME_KEY = "smart-school-v1-theme";

const ALL_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "student_counselor",
  "health_supervisor",
  "activity_leader",
  "teacher",
  "student",
  "parent",
];

const ADMIN_ROLES: SchoolRole[] = ["super_admin", "school_admin"];

const LEADERSHIP_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
];

const STAFF_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
];

const TEACHER_ROLES: SchoolRole[] = ["super_admin", "school_admin", "teacher"];

const COUNSELOR_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "student_counselor",
];

const HEALTH_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "health_supervisor",
];

const ACTIVITY_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "activity_leader",
];

const THEMES: Array<{
  key: AppTheme;
  label: string;
  icon: ElementType;
}> = [
  { key: "smart-light", label: "Smart Light", icon: Sun },
  { key: "smart-dark", label: "Smart Dark", icon: Moon },
  { key: "ministry", label: "Ministry", icon: Palette },
];

const SECTIONS: SidebarSection[] = [
  {
    id: "main",
    label: "الرئيسية",
    icon: LayoutDashboard,
    roles: ALL_ROLES,
    children: [
      {
        label: "لوحة التحكم",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ALL_ROLES,
        keywords: ["dashboard", "لوحة", "تحكم"],
      },
      {
        label: "البحث السريع",
        href: "/search",
        icon: Search,
        roles: [...STAFF_ROLES, "teacher"],
        keywords: ["بحث", "search"],
      },
      {
        label: "التنبيهات",
        href: "/alerts",
        icon: MessageSquareWarning,
        roles: [...STAFF_ROLES, "teacher"],
        keywords: ["تنبيه", "إشعار", "alerts"],
      },
    ],
  },
  {
    id: "school-management",
    label: "إدارة المدرسة",
    icon: Shield,
    roles: [...ADMIN_ROLES, "administrative_staff"],
    children: [
      {
        label: "المدارس",
        href: "/schools",
        icon: School,
        roles: ["super_admin"],
        permission: "schools.view",
        keywords: ["مدارس", "schools"],
      },
      {
        label: "إدارة المدرسة",
        href: "/school-admin",
        icon: Shield,
        roles: ADMIN_ROLES,
        keywords: ["مدير", "إدارة"],
      },
      {
        label: "الإدارة",
        href: "/administration",
        icon: UserCog,
        roles: STAFF_ROLES,
        keywords: ["إدارة", "إداري"],
      },
      {
        label: "المستخدمون",
        href: "/users",
        icon: UsersRound,
        roles: ADMIN_ROLES,
        permission: "users.view",
        keywords: ["مستخدمين", "users"],
      },
      {
        label: "الإعدادات",
        href: "/settings",
        icon: Settings,
        roles: ADMIN_ROLES,
        permission: "settings.manage",
        keywords: ["إعدادات", "settings"],
      },
    ],
  },
  {
    id: "academic",
    label: "البناء الأكاديمي",
    icon: BookOpen,
    roles: ADMIN_ROLES,
    children: [
      {
        label: "المراحل",
        href: "/stages",
        icon: Sparkles,
        roles: ADMIN_ROLES,
        permission: "stages.view",
        keywords: ["مراحل", "stages"],
      },
      {
        label: "الفصول",
        href: "/classrooms",
        icon: Building2,
        roles: ADMIN_ROLES,
        permission: "classrooms.view",
        keywords: ["فصول", "classrooms"],
      },
      {
        label: "المواد الدراسية",
        href: "/subjects",
        icon: BookOpen,
        roles: ADMIN_ROLES,
        permission: "subjects.view",
        keywords: ["مواد", "subjects"],
      },
      {
        label: "إسناد المعلمين",
        href: "/teacher-subjects",
        icon: ClipboardCheck,
        roles: ADMIN_ROLES,
        permission: "teacher_subjects.view",
        keywords: ["إسناد", "معلمين", "مواد"],
      },
      {
        label: "الجداول الدراسية",
        href: "/schedules",
        icon: CalendarDays,
        roles: LEADERSHIP_ROLES,
        permission: "schedules.view",
        keywords: ["جداول", "حصص", "schedules"],
      },
    ],
  },
  {
    id: "people",
    label: "الطلاب والمعلمون",
    icon: UsersRound,
    roles: [...STAFF_ROLES, "teacher"],
    children: [
      {
        label: "الطلاب",
        href: "/students",
        icon: UsersRound,
        roles: STAFF_ROLES,
        permission: "students.view",
        keywords: ["طلاب", "students"],
      },
      {
        label: "المعلمون",
        href: "/teachers",
        icon: GraduationCap,
        roles: ADMIN_ROLES,
        permission: "teachers.view",
        keywords: ["معلمين", "teachers"],
      },
      {
        label: "الحضور والغياب",
        href: "/attendance",
        icon: ClipboardCheck,
        roles: [...STAFF_ROLES, "teacher"],
        permission: "attendance.view",
        keywords: ["حضور", "غياب", "attendance"],
      },
      {
        label: "الدرجات",
        href: "/grades",
        icon: BarChart3,
        roles: TEACHER_ROLES,
        permission: "grades.view",
        keywords: ["درجات", "رصد", "grades"],
      },
      {
        label: "تحليل الدرجات",
        href: "/grades/analyzer",
        icon: BarChart3,
        roles: TEACHER_ROLES,
        permission: "grades.view",
        keywords: ["تحليل", "درجات"],
      },
    ],
  },
  {
    id: "portals",
    label: "البوابات",
    icon: LayoutDashboard,
    roles: ALL_ROLES,
    children: [
      {
        label: "بوابة المعلم",
        href: "/teacher-portal",
        icon: GraduationCap,
        roles: ["teacher", "super_admin", "school_admin"],
        keywords: ["بوابة", "معلم"],
      },
      {
        label: "بوابة الطالب",
        href: "/student-portal",
        icon: BookOpen,
        roles: ["student", "super_admin", "school_admin"],
        keywords: ["بوابة", "طالب"],
      },
      {
        label: "بوابة ولي الأمر",
        href: "/parent-portal",
        icon: UsersRound,
        roles: ["parent", "super_admin", "school_admin"],
        keywords: ["بوابة", "ولي"],
      },
    ],
  },
  {
    id: "services",
    label: "الخدمات المدرسية",
    icon: HeartPulse,
    roles: [
      ...STAFF_ROLES,
      "teacher",
      "student_counselor",
      "health_supervisor",
      "activity_leader",
    ],
    children: [
      {
        label: "السلوك والمواظبة",
        href: "/behavior",
        icon: MessageSquareWarning,
        roles: [...STAFF_ROLES, "teacher", "student_counselor"],
        permission: "behavior.view",
        keywords: ["سلوك", "مواظبة"],
      },
      {
        label: "الإرشاد الطلابي",
        href: "/counselor",
        icon: HeartPulse,
        roles: COUNSELOR_ROLES,
        keywords: ["إرشاد", "موجه"],
      },
      {
        label: "التدخلات الطلابية",
        href: "/student-interventions",
        icon: HeartPulse,
        roles: COUNSELOR_ROLES,
        keywords: ["تدخلات", "طلاب"],
      },
      {
        label: "الصحة المدرسية",
        href: "/health",
        icon: HeartPulse,
        roles: HEALTH_ROLES,
        keywords: ["صحة", "عيادة"],
      },
      {
        label: "الأنشطة",
        href: "/activities",
        icon: Activity,
        roles: ACTIVITY_ROLES,
        keywords: ["أنشطة", "رائد"],
      },
    ],
  },
  {
    id: "reports-quality",
    label: "التقارير والجودة",
    icon: FileText,
    roles: [...STAFF_ROLES, "teacher"],
    children: [
      {
        label: "التقارير",
        href: "/reports",
        icon: FileText,
        roles: [...STAFF_ROLES, "teacher"],
        permission: "reports.view",
        keywords: ["تقارير", "reports"],
      },
      {
        label: "التحليلات",
        href: "/analytics",
        icon: BarChart3,
        roles: LEADERSHIP_ROLES,
        keywords: ["تحليل", "analytics"],
      },
      {
        label: "مدقق الشواهد",
        href: "/quality/evidence-auditor",
        icon: FileCheck2,
        roles: ADMIN_ROLES,
        keywords: ["شواهد", "جودة"],
      },
    ],
  },
];

function hasRole(currentRole: SchoolRole | null, allowedRoles?: SchoolRole[]) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (!currentRole) return false;
  if (currentRole === "super_admin") return true;
  return allowedRoles.includes(currentRole);
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function getActiveHref(pathname: string, items: SidebarItem[]) {
  const matched = items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length);

  return matched[0]?.href ?? "";
}

function matchesSearch(item: SidebarItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const text = [item.label, item.href, ...(item.keywords || [])]
    .join(" ")
    .toLowerCase();

  return text.includes(q);
}

function isAppTheme(value: string | null): value is AppTheme {
  return (
    value === "smart-light" || value === "smart-dark" || value === "ministry"
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const {
    currentSchool,
    currentRole,
    schools,
    loading,
    switchSchool,
    hasPermission,
  } = useSchool();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sectionSearch, setSectionSearch] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [theme, setTheme] = useState<AppTheme>("smart-light");
  const [themeReady, setThemeReady] = useState(false);

  const expanded = !collapsed || mobileOpen;

  const canSeeItem = useCallback(
    (item: SidebarItem) => {
      if (!hasRole(currentRole, item.roles)) return false;
      if (item.permission && !hasPermission(item.permission)) return false;
      return matchesSearch(item, sectionSearch);
    },
    [currentRole, hasPermission, sectionSearch],
  );

  const allowedSections = useMemo(() => {
    if (!currentRole) return [];

    return SECTIONS.map((section) => ({
      ...section,
      children: section.children.filter(canSeeItem),
    })).filter(
      (section) =>
        hasRole(currentRole, section.roles) && section.children.length > 0,
    );
  }, [currentRole, canSeeItem]);

  const allAllowedItems = useMemo(
    () => allowedSections.flatMap((section) => section.children),
    [allowedSections],
  );

  const activeHref = useMemo(
    () => getActiveHref(pathname, allAllowedItems),
    [pathname, allAllowedItems],
  );

  const favoriteItems = useMemo(() => {
    return favorites
      .map((href) => allAllowedItems.find((item) => item.href === href))
      .filter(Boolean) as SidebarItem[];
  }, [favorites, allAllowedItems]);

  const activeTheme = useMemo(
    () => THEMES.find((item) => item.key === theme) ?? THEMES[0],
    [theme],
  );

  const ActiveThemeIcon = activeTheme.icon;

  useEffect(() => {
    const savedCollapsed = window.localStorage.getItem(COLLAPSED_KEY);
    const savedTheme = window.localStorage.getItem(THEME_KEY);

    setCollapsed(savedCollapsed === "true");
    setOpenSections(readJSON<Record<string, boolean>>(OPEN_SECTIONS_KEY, {}));
    setFavorites(readJSON<string[]>(FAVORITES_KEY, []));

    const nextTheme = isAppTheme(savedTheme) ? savedTheme : "smart-light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    setThemeReady(true);
  }, []);

  useEffect(() => {
    writeJSON(COLLAPSED_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    writeJSON(OPEN_SECTIONS_KEY, openSections);
  }, [openSections]);

  useEffect(() => {
    writeJSON(FAVORITES_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    if (!themeReady) return;

    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme, themeReady]);

  useEffect(() => {
    if (!activeHref) return;

    const activeSection = SECTIONS.find((section) =>
      section.children.some(
        (item) =>
          activeHref === item.href || activeHref.startsWith(`${item.href}/`),
      ),
    );

    if (activeSection) {
      setOpenSections((prev) => ({
        ...prev,
        [activeSection.id]: true,
      }));
    }
  }, [activeHref]);

  async function handleLogout() {
    const confirmed = window.confirm("هل تريد تسجيل الخروج؟");
    if (!confirmed) return;

    await supabase.auth.signOut();
    router.replace("/login");
  }

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const toggleFavorite = useCallback((href: string) => {
    setFavorites((prev) => {
      if (prev.includes(href)) {
        return prev.filter((item) => item !== href);
      }

      return [href, ...prev].slice(0, 8);
    });
  }, []);

  const handleThemeChange = useCallback((nextTheme: AppTheme) => {
    setTheme(nextTheme);
  }, []);

  const cycleTheme = useCallback(() => {
    const currentIndex = THEMES.findIndex((item) => item.key === theme);
    const nextTheme = THEMES[(currentIndex + 1) % THEMES.length];
    handleThemeChange(nextTheme.key);
  }, [theme, handleThemeChange]);

  const sidebarBackground =
    theme === "ministry"
      ? "bg-[linear-gradient(180deg,#064e3b_0%,#0f766e_58%,#063f33_100%)]"
      : "bg-[radial-gradient(circle_at_top_right,rgba(15,118,110,0.28),transparent_30%),var(--sidebar-bg)]";

  function renderItem(item: SidebarItem, compact = false) {
    const Icon = item.icon;
    const active = activeHref === item.href;
    const favorite = favorites.includes(item.href);

    return (
      <div key={item.href} className="group/item relative flex items-center gap-1">
        {active && expanded && (
          <span className="absolute -right-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-[var(--app-accent)]" />
        )}

        <Link
          href={item.href}
          onClick={() => setMobileOpen(false)}
          title={!expanded ? item.label : undefined}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl transition duration-200 ${
            expanded ? "px-3 py-2.5" : "justify-center px-2 py-3"
          } ${
            active
              ? "bg-[var(--app-primary)] text-white shadow-lg shadow-emerald-950/20"
              : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-bg-soft)] hover:text-[var(--sidebar-text)]"
          } ${compact ? "py-2" : ""}`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              active ? "bg-white/15" : "bg-white/[0.045]"
            }`}
          >
            <Icon size={18} className="shrink-0" />
          </span>

          {expanded && (
            <span className="truncate text-sm font-bold">{item.label}</span>
          )}

          {expanded && item.badge && (
            <span className="mr-auto rounded-full bg-[var(--app-accent-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--app-accent)]">
              {item.badge}
            </span>
          )}
        </Link>

        {expanded && (
          <button
            type="button"
            onClick={() => toggleFavorite(item.href)}
            className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl transition group-hover/item:flex ${
              favorite
                ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
                : "text-slate-500 hover:bg-white/10 hover:text-white"
            }`}
            title={favorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          >
            {favorite ? <PinOff size={15} /> : <Pin size={15} />}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed right-4 top-4 z-[70] flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--sidebar-bg)] text-white shadow-xl lg:hidden"
        aria-label="فتح القائمة"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
          aria-label="إغلاق القائمة"
        />
      )}

      <aside
        className={`
          fixed right-0 top-0 z-[60] h-screen
          border-l border-[var(--sidebar-border)] ${sidebarBackground}
          text-[var(--sidebar-text)] shadow-[0_24px_80px_rgba(2,6,23,0.38)] transition-all duration-300
          lg:sticky lg:top-0 lg:translate-x-0
          ${expanded ? "lg:w-[300px]" : "lg:w-[76px]"}
          ${
            mobileOpen
              ? "w-[300px] translate-x-0"
              : "w-[300px] translate-x-full lg:translate-x-0"
          }
        `}
      >
        <div className="relative flex h-full flex-col overflow-hidden">
          {theme === "ministry" && (
            <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
              <div className="absolute -left-20 top-20 h-64 w-64 rounded-full border border-white" />
              <div className="absolute -right-20 bottom-24 h-72 w-72 rounded-full border border-white" />
            </div>
          )}

          <div className="relative border-b border-[var(--sidebar-border)] bg-white/[0.025] p-3">
            <div className="flex items-center justify-between gap-3">
              <div
                className={`flex min-w-0 items-center gap-3 ${
                  !expanded ? "lg:justify-center" : ""
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f3d978] to-[var(--app-accent)] shadow-lg shadow-black/10">
                  <School className="text-slate-950" size={24} />
                </div>

                {expanded && (
                  <div className="min-w-0">
                    <h1 className="truncate text-sm font-black">
                      منصة المدرسة الذكية
                    </h1>
                    <p className="mt-1 truncate text-[11px] text-[var(--sidebar-muted)]">
                      الإصدار 1.0.0
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl bg-white/10 p-2 transition hover:bg-white/20 lg:hidden"
                aria-label="إغلاق القائمة"
              >
                <X size={18} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="mt-3 hidden w-full items-center justify-center gap-2 rounded-2xl border border-[var(--sidebar-border)] bg-white/10 px-3 py-2 text-xs font-bold text-[var(--sidebar-muted)] transition hover:border-[var(--app-accent)] hover:bg-white/15 hover:text-white lg:flex"
            >
              <ChevronRight
                size={16}
                className={`transition ${expanded ? "rotate-180" : ""}`}
              />
              {expanded && <span>طي القائمة</span>}
            </button>
          </div>

          <div className="app-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
            <nav className="space-y-3">
              {loading && (
                <div className="rounded-2xl bg-white/10 p-4 text-center text-sm text-[var(--sidebar-muted)]">
                  {expanded ? "جاري تحميل القائمة..." : "..."}
                </div>
              )}

              {!loading && expanded && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-muted)]"
                    />
                    <input
                      value={sectionSearch}
                      onChange={(event) => setSectionSearch(event.target.value)}
                      placeholder="بحث في القائمة..."
                      className="w-full rounded-2xl border border-[var(--sidebar-border)] bg-white/[0.08] py-2.5 pl-3 pr-9 text-sm font-bold text-white outline-none placeholder:text-[var(--sidebar-muted)] transition focus:border-[var(--app-accent)] focus:bg-white/[0.11]"
                    />
                  </div>

                  {favoriteItems.length > 0 && (
                    <div>
                      <p className="mb-2 flex items-center gap-2 px-2 text-[11px] font-black text-[var(--sidebar-muted)]">
                        <Star size={13} />
                        المفضلة
                      </p>
                      <div className="space-y-1.5">
                        {favoriteItems.map((item) => renderItem(item, true))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!loading &&
                allowedSections.map((section) => {
                  const SectionIcon = section.icon;
                  const opened = expanded
                    ? openSections[section.id] ?? section.id === "main"
                    : true;

                  return (
                    <div key={section.id}>
                      {expanded ? (
                        <button
                          type="button"
                          onClick={() => toggleSection(section.id)}
                          className="flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs font-black text-[var(--sidebar-muted)] transition hover:bg-white/[0.06] hover:text-white"
                        >
                          <span className="flex items-center gap-2">
                            <SectionIcon size={15} />
                            {section.label}
                          </span>
                          <ChevronDown
                            size={15}
                            className={`transition ${
                              opened ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      ) : (
                        <div className="mx-auto mb-2 h-px w-8 bg-gradient-to-l from-transparent via-white/20 to-transparent" />
                      )}

                      {opened && (
                        <div className="mt-1 space-y-1">
                          {section.children.map((item) => renderItem(item))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </nav>
          </div>

          <div className="relative border-t border-[var(--sidebar-border)] bg-white/[0.025] p-3">
            <div className="mb-3 space-y-2">
              <button
                type="button"
                onClick={cycleTheme}
                title={`تبديل المظهر: ${activeTheme.label}`}
                className={`flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--sidebar-border)] bg-white/[0.08] text-[var(--app-accent)] transition hover:border-[var(--app-accent)] hover:bg-[var(--app-accent)] hover:text-slate-950 ${
                  expanded ? "w-full px-3" : "w-full"
                }`}
              >
                <ActiveThemeIcon size={20} />
                {expanded && (
                  <span className="truncate text-xs font-black">
                    تبديل المظهر
                  </span>
                )}
              </button>

              {expanded && schools.length > 1 && (
                <select
                  value={currentSchool?.id ?? ""}
                  onChange={(event) => switchSchool(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--sidebar-border)] bg-white/[0.08] px-3 py-2 text-xs font-bold text-white outline-none transition focus:border-[var(--app-accent)]"
                >
                  {schools.map((school) => (
                    <option
                      key={school.id}
                      value={school.id}
                      className="bg-slate-900 text-white"
                    >
                      {school.school_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title={!expanded ? "تسجيل الخروج" : undefined}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-red-200 transition hover:bg-red-500/10 hover:text-red-100 ${
                !expanded ? "justify-center" : ""
              }`}
            >
              <LogOut size={20} className="shrink-0" />
              {expanded && (
                <span className="truncate text-sm font-semibold">
                  تسجيل الخروج
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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
  ClipboardCheck,
  FileCheck2,
  FileText,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  Menu,
  MessageSquareWarning,
  Moon,
  School,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Sun,
  UserCog,
  UsersRound,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import type { SchoolRole } from "@/lib/permissions";
import type { PermissionKey } from "@/lib/permissions/permissions";

import { Skeleton } from "@/components/ui/loading";
import {
  SidebarHeader,
  SidebarSearch,
  SidebarSection,
  SidebarItem,
  SidebarFooter,
} from "./sidebar";

type SidebarItemType = {
  label: string;
  href: string;
  icon: ElementType;
  roles?: SchoolRole[];
  permission?: PermissionKey;
  keywords?: string[];
  badge?: string;
};

type SidebarSectionType = {
  id: string;
  label: string;
  icon: ElementType;
  roles?: SchoolRole[];
  permission?: PermissionKey;
  children: SidebarItemType[];
};

const COLLAPSED_KEY = "smart-school-v1-sidebar-collapsed";
const OPEN_SECTIONS_KEY = "smart-school-v1-sidebar-open-sections";
const FAVORITES_KEY = "smart-school-v1-sidebar-favorites";

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

const SECTIONS: SidebarSectionType[] = [
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
        badge: "جديد",
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

function getActiveHref(pathname: string, items: SidebarItemType[]) {
  const matched = items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length);

  return matched[0]?.href ?? "";
}

function matchesSearch(item: SidebarItemType, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const text = [item.label, item.href, ...(item.keywords || [])]
    .join(" ")
    .toLowerCase();

  return text.includes(q);
}

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

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

  const expanded = !collapsed || mobileOpen;
  const roleName = currentRole ? ROLE_NAME_MAP[currentRole] : "مستخدم";

  const canSeeItem = useCallback(
    (item: SidebarItemType) => {
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
      .filter(Boolean) as SidebarItemType[];
  }, [favorites, allAllowedItems]);

  const isDarkTheme = theme === "smart-dark";
  const ActiveThemeIcon = isDarkTheme ? Sun : Moon;
  const hasSearchResults = allowedSections.length > 0;

  useEffect(() => {
    const savedCollapsed = window.localStorage.getItem(COLLAPSED_KEY);

    setCollapsed(savedCollapsed === "true");
    setOpenSections(readJSON<Record<string, boolean>>(OPEN_SECTIONS_KEY, {}));
    setFavorites(readJSON<string[]>(FAVORITES_KEY, []));
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

  const cycleTheme = useCallback(() => {
    setTheme(isDarkTheme ? "smart-light" : "smart-dark");
  }, [isDarkTheme, setTheme]);

  const sidebarBackground =
    "bg-[radial-gradient(circle_at_top_right,rgba(15,118,110,0.22),transparent_28%),var(--sidebar-bg)]";

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
          ${expanded ? "lg:w-[288px]" : "lg:w-[72px]"}
          ${
            mobileOpen
              ? "w-[288px] translate-x-0"
              : "w-[288px] translate-x-full lg:translate-x-0"
          }
        `}
      >
        <div className="relative flex h-full flex-col overflow-hidden">
          <SidebarHeader
            expanded={expanded}
            mobileOpen={mobileOpen}
            schoolName={currentSchool?.school_name}
            roleName={roleName}
            ActiveThemeIcon={ActiveThemeIcon}
            onToggleCollapse={() => setCollapsed((value) => !value)}
            onToggleTheme={cycleTheme}
            onCloseMobile={() => setMobileOpen(false)}
          />

          <div className="app-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
            <nav className="space-y-2.5">
              {loading && (
                <div className="space-y-2 rounded-2xl bg-white/5 p-3">
                  {Array.from({ length: expanded ? 8 : 5 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className={`bg-white/10 ${
                        expanded ? "h-10 w-full" : "mx-auto h-9 w-9"
                      }`}
                    />
                  ))}
                </div>
              )}

              {!loading && expanded && (
                <SidebarSearch
                  value={sectionSearch}
                  onChange={setSectionSearch}
                  hasResults={hasSearchResults}
                >
                  {favoriteItems.length > 0 && (
                    <div>
                      <p className="mb-1.5 flex items-center gap-2 px-2 text-[11px] font-black text-[var(--sidebar-muted)]">
                        <Star size={13} />
                        المفضلة
                      </p>

                      <div className="space-y-1">
                        {favoriteItems.map((item) => (
                          <SidebarItem
                            key={item.href}
                            item={item}
                            active={activeHref === item.href}
                            expanded={expanded}
                            favorite={favorites.includes(item.href)}
                            compact
                            onNavigate={() => setMobileOpen(false)}
                            onToggleFavorite={toggleFavorite}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </SidebarSearch>
              )}

              {!loading &&
                allowedSections.map((section) => {
                  const opened = expanded
                    ? openSections[section.id] ?? section.id === "main"
                    : true;

                  return (
                    <SidebarSection
                      key={section.id}
                      title={section.label}
                      icon={section.icon}
                      expanded={expanded}
                      opened={opened}
                      count={section.children.length}
                      onToggle={() => toggleSection(section.id)}
                    >
                      {section.children.map((item) => (
                        <SidebarItem
                          key={item.href}
                          item={item}
                          active={activeHref === item.href}
                          expanded={expanded}
                          favorite={favorites.includes(item.href)}
                          onNavigate={() => setMobileOpen(false)}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </SidebarSection>
                  );
                })}
            </nav>
          </div>

          <SidebarFooter
            expanded={expanded}
            schools={schools}
            currentSchoolId={currentSchool?.id}
            onSwitchSchool={switchSchool}
            onLogout={handleLogout}
          />
        </div>
      </aside>
    </>
  );
}
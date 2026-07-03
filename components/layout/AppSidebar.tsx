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
  Pin,
  PinOff,
  School,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  UserCog,
  UsersRound,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import type { SchoolRole } from "@/lib/permissions";

type SidebarItem = {
  title: string;
  href: string;
  icon: ElementType;
  roles: SchoolRole[];
  keywords?: string[];
};

type SidebarSection = {
  id: string;
  title: string;
  icon: ElementType;
  roles: SchoolRole[];
  items: SidebarItem[];
};

const COLLAPSED_KEY = "smart-school-v2-sidebar-collapsed";
const OPEN_SECTIONS_KEY = "smart-school-v2-sidebar-open-sections";
const FAVORITES_KEY = "smart-school-v2-sidebar-favorites";
const RECENT_KEY = "smart-school-v2-sidebar-recent";

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

const SECTIONS: SidebarSection[] = [
  {
    id: "main",
    title: "الرئيسية",
    icon: LayoutDashboard,
    roles: ALL_ROLES,
    items: [
      {
        title: "لوحة التحكم",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ALL_ROLES,
        keywords: ["dashboard", "لوحة", "تحكم"],
      },
      {
        title: "البحث السريع",
        href: "/search",
        icon: Search,
        roles: [...STAFF_ROLES, "teacher"],
        keywords: ["بحث", "search"],
      },
      {
        title: "التنبيهات",
        href: "/alerts",
        icon: MessageSquareWarning,
        roles: [...STAFF_ROLES, "teacher"],
        keywords: ["تنبيه", "إشعار", "alerts"],
      },
    ],
  },
  {
    id: "school-management",
    title: "إدارة المدرسة",
    icon: Shield,
    roles: [...ADMIN_ROLES, "administrative_staff"],
    items: [
      {
        title: "المدارس",
        href: "/schools",
        icon: School,
        roles: ["super_admin"],
        keywords: ["مدارس", "schools"],
      },
      {
        title: "إدارة المدرسة",
        href: "/school-admin",
        icon: Shield,
        roles: ADMIN_ROLES,
        keywords: ["مدير", "إدارة"],
      },
      {
        title: "الإدارة",
        href: "/administration",
        icon: UserCog,
        roles: STAFF_ROLES,
        keywords: ["إدارة", "إداري"],
      },
      {
        title: "المستخدمون",
        href: "/users",
        icon: UsersRound,
        roles: ADMIN_ROLES,
        keywords: ["مستخدمين", "users"],
      },
      {
        title: "الإعدادات",
        href: "/settings",
        icon: Settings,
        roles: ADMIN_ROLES,
        keywords: ["إعدادات", "settings"],
      },
    ],
  },
  {
    id: "academic",
    title: "البناء الأكاديمي",
    icon: BookOpen,
    roles: ADMIN_ROLES,
    items: [
      {
        title: "المراحل",
        href: "/stages",
        icon: Sparkles,
        roles: ADMIN_ROLES,
        keywords: ["مراحل", "stages"],
      },
      {
        title: "الفصول",
        href: "/classrooms",
        icon: Building2,
        roles: ADMIN_ROLES,
        keywords: ["فصول", "classrooms"],
      },
      {
        title: "المواد",
        href: "/subjects",
        icon: BookOpen,
        roles: ADMIN_ROLES,
        keywords: ["مواد", "subjects"],
      },
      {
        title: "إسناد المعلمين",
        href: "/teacher-subjects",
        icon: ClipboardCheck,
        roles: ADMIN_ROLES,
        keywords: ["إسناد", "معلمين", "مواد"],
      },
      {
        title: "الجداول",
        href: "/schedules",
        icon: CalendarDays,
        roles: LEADERSHIP_ROLES,
        keywords: ["جداول", "حصص", "schedules"],
      },
    ],
  },
  {
    id: "people",
    title: "الطلاب والمعلمون",
    icon: UsersRound,
    roles: [...STAFF_ROLES, "teacher"],
    items: [
      {
        title: "الطلاب",
        href: "/students",
        icon: UsersRound,
        roles: STAFF_ROLES,
        keywords: ["طلاب", "students"],
      },
      {
        title: "المعلمون",
        href: "/teachers",
        icon: GraduationCap,
        roles: ADMIN_ROLES,
        keywords: ["معلمين", "teachers"],
      },
      {
        title: "الحضور",
        href: "/attendance",
        icon: ClipboardCheck,
        roles: [...STAFF_ROLES, "teacher"],
        keywords: ["حضور", "غياب", "attendance"],
      },
      {
        title: "الدرجات",
        href: "/grades",
        icon: BarChart3,
        roles: TEACHER_ROLES,
        keywords: ["درجات", "رصد", "grades"],
      },
      {
        title: "تحليل الدرجات",
        href: "/grades/analyzer",
        icon: BarChart3,
        roles: TEACHER_ROLES,
        keywords: ["تحليل", "درجات"],
      },
    ],
  },
  {
    id: "portals",
    title: "البوابات",
    icon: LayoutDashboard,
    roles: ALL_ROLES,
    items: [
      {
        title: "بوابة المعلم",
        href: "/teacher-portal",
        icon: GraduationCap,
        roles: ["teacher", "super_admin", "school_admin"],
        keywords: ["بوابة", "معلم"],
      },
      {
        title: "بوابة الطالب",
        href: "/student-portal",
        icon: BookOpen,
        roles: ["student", "super_admin", "school_admin"],
        keywords: ["بوابة", "طالب"],
      },
      {
        title: "بوابة ولي الأمر",
        href: "/parent-portal",
        icon: UsersRound,
        roles: ["parent", "super_admin", "school_admin"],
        keywords: ["بوابة", "ولي"],
      },
    ],
  },
  {
    id: "services",
    title: "الخدمات المدرسية",
    icon: HeartPulse,
    roles: [
      ...STAFF_ROLES,
      "teacher",
      "student_counselor",
      "health_supervisor",
      "activity_leader",
    ],
    items: [
      {
        title: "السلوك والمواظبة",
        href: "/behavior",
        icon: MessageSquareWarning,
        roles: [...STAFF_ROLES, "teacher", "student_counselor"],
        keywords: ["سلوك", "مواظبة"],
      },
      {
        title: "الإرشاد الطلابي",
        href: "/counselor",
        icon: HeartPulse,
        roles: COUNSELOR_ROLES,
        keywords: ["إرشاد", "موجه"],
      },
      {
        title: "التدخلات الطلابية",
        href: "/student-interventions",
        icon: HeartPulse,
        roles: COUNSELOR_ROLES,
        keywords: ["تدخلات", "طلاب"],
      },
      {
        title: "الصحة المدرسية",
        href: "/health",
        icon: HeartPulse,
        roles: HEALTH_ROLES,
        keywords: ["صحة", "عيادة"],
      },
      {
        title: "الأنشطة",
        href: "/activities",
        icon: Activity,
        roles: ACTIVITY_ROLES,
        keywords: ["أنشطة", "رائد"],
      },
    ],
  },
  {
    id: "reports-quality",
    title: "التقارير والجودة",
    icon: FileText,
    roles: [...STAFF_ROLES, "teacher"],
    items: [
      {
        title: "التقارير",
        href: "/reports",
        icon: FileText,
        roles: [...STAFF_ROLES, "teacher"],
        keywords: ["تقارير", "reports"],
      },
      {
        title: "التحليلات",
        href: "/analytics",
        icon: BarChart3,
        roles: LEADERSHIP_ROLES,
        keywords: ["تحليل", "analytics"],
      },
      {
        title: "مدقق الشواهد",
        href: "/quality/evidence-auditor",
        icon: FileCheck2,
        roles: ADMIN_ROLES,
        keywords: ["شواهد", "جودة"],
      },
    ],
  },
];

function hasRole(currentRole: SchoolRole | null, allowedRoles: SchoolRole[]) {
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

  const text = [item.title, item.href, ...(item.keywords || [])]
    .join(" ")
    .toLowerCase();

  return text.includes(q);
}

function limitRecent(items: string[]) {
  return Array.from(new Set(items)).slice(0, 8);
}

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { currentSchool, currentRole, loading } = useSchool();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sectionSearch, setSectionSearch] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentPages, setRecentPages] = useState<string[]>([]);

  const expanded = !collapsed || mobileOpen;

  const allowedSections = useMemo(() => {
    if (!currentRole) return [];

    return SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          hasRole(currentRole, item.roles) && matchesSearch(item, sectionSearch),
      ),
    })).filter(
      (section) =>
        hasRole(currentRole, section.roles) && section.items.length > 0,
    );
  }, [currentRole, sectionSearch]);

  const allAllowedItems = useMemo(
    () => allowedSections.flatMap((section) => section.items),
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

  const recentItems = useMemo(() => {
    return recentPages
      .map((href) => allAllowedItems.find((item) => item.href === href))
      .filter(Boolean) as SidebarItem[];
  }, [recentPages, allAllowedItems]);

  const quickActions = useMemo(() => {
    const preferred = [
      "/dashboard",
      "/grades",
      "/attendance",
      "/teacher-portal",
      "/students",
      "/teachers",
      "/classrooms",
      "/reports",
      "/student-portal",
      "/parent-portal",
    ];

    return preferred
      .map((href) => allAllowedItems.find((item) => item.href === href))
      .filter(Boolean)
      .slice(0, 4) as SidebarItem[];
  }, [allAllowedItems]);

  const roleText = currentRole ? ROLE_NAME_MAP[currentRole] : "مستخدم";

  useEffect(() => {
    const savedCollapsed = window.localStorage.getItem(COLLAPSED_KEY);

    setCollapsed(savedCollapsed === "true");
    setOpenSections(readJSON<Record<string, boolean>>(OPEN_SECTIONS_KEY, {}));
    setFavorites(readJSON<string[]>(FAVORITES_KEY, []));
    setRecentPages(readJSON<string[]>(RECENT_KEY, []));
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
    writeJSON(RECENT_KEY, recentPages);
  }, [recentPages]);

  useEffect(() => {
    if (!activeHref) return;

    const activeSection = SECTIONS.find((section) =>
      section.items.some(
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

    setRecentPages((prev) => limitRecent([activeHref, ...prev]));
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

  function renderItem(item: SidebarItem, compact = false) {
    const Icon = item.icon;
    const active = activeHref === item.href;
    const favorite = favorites.includes(item.href);

    return (
      <div key={item.href} className="group/item relative flex items-center gap-1">
        {active && expanded && (
          <span className="absolute -right-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-[#d4af37]" />
        )}

        <Link
          href={item.href}
          onClick={() => setMobileOpen(false)}
          title={!expanded ? item.title : undefined}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl transition ${
            expanded ? "px-3 py-2.5" : "justify-center px-2 py-3"
          } ${
            active
              ? "bg-gradient-to-l from-[#f4d978] to-[#d4af37] text-slate-950 shadow-lg shadow-[#d4af37]/20"
              : "text-slate-300 hover:bg-white/[0.09] hover:text-white"
          } ${compact ? "py-2" : ""}`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              active ? "bg-slate-950/10" : "bg-white/[0.04]"
            }`}
          >
            <Icon size={18} className="shrink-0" />
          </span>

          {expanded && (
            <span className="truncate text-sm font-bold">{item.title}</span>
          )}
        </Link>

        {expanded && (
          <button
            type="button"
            onClick={() => toggleFavorite(item.href)}
            className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl transition group-hover/item:flex ${
              favorite
                ? "bg-[#d4af37]/15 text-[#d4af37]"
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

  function renderQuickAction(item: SidebarItem) {
    const Icon = item.icon;

    return (
      <Link
        key={`quick-${item.href}`}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-black text-white transition hover:-translate-y-0.5 hover:border-[#d4af37]/40 hover:bg-[#d4af37] hover:text-slate-950"
      >
        <Icon size={15} />
        <span className="truncate">{item.title}</span>
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed right-4 top-4 z-[70] flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl lg:hidden"
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
          border-l border-white/10 bg-[radial-gradient(circle_at_top_right,#1e3a5f_0%,#0f172a_34%,#07111f_100%)]
          text-white shadow-[0_24px_80px_rgba(2,6,23,0.45)] transition-all duration-300
          lg:sticky lg:top-0 lg:translate-x-0
          ${expanded ? "lg:w-[300px]" : "lg:w-[76px]"}
          ${
            mobileOpen
              ? "w-[300px] translate-x-0"
              : "w-[300px] translate-x-full lg:translate-x-0"
          }
        `}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 bg-white/[0.025] p-3">
            <div className="flex items-center justify-between gap-3">
              <div
                className={`flex min-w-0 items-center gap-3 ${
                  !expanded ? "lg:justify-center" : ""
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f2d675] to-[#d4af37] shadow-lg shadow-[#d4af37]/20">
                  <School className="text-slate-950" size={24} />
                </div>

                {expanded && (
                  <div className="min-w-0">
                    <h1 className="truncate text-sm font-black">
                      منصة المدرسة الذكية 2.0
                    </h1>
                    <p className="mt-1 truncate text-[11px] text-slate-400">
                      قائمة ذكية حسب الصلاحيات
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
              className="mt-3 hidden w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-[#d4af37]/40 hover:bg-white/15 lg:flex"
            >
              <ChevronRight
                size={16}
                className={`transition ${expanded ? "rotate-180" : ""}`}
              />
              {expanded && <span>طي القائمة</span>}
            </button>

            {expanded && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-inner shadow-white/5">
                <p className="truncate text-[11px] text-slate-400">
                  المدرسة الحالية
                </p>
                <p className="mt-1 truncate text-sm font-bold">
                  {currentSchool?.school_name || "لم يتم تحديد مدرسة"}
                </p>
                <p className="mt-1 truncate text-[11px] font-bold text-[#d4af37]">
                  {roleText}
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
            <nav className="space-y-3">
              {loading && (
                <div className="rounded-2xl bg-white/10 p-4 text-center text-sm text-slate-300">
                  {expanded ? "جاري تحميل القائمة..." : "..."}
                </div>
              )}

              {!loading && expanded && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      value={sectionSearch}
                      onChange={(event) => setSectionSearch(event.target.value)}
                      placeholder="بحث في القائمة..."
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.08] py-2.5 pl-3 pr-9 text-sm font-bold text-white outline-none placeholder:text-slate-500 transition focus:border-[#d4af37] focus:bg-white/[0.11]"
                    />
                  </div>

                  {quickActions.length > 0 && (
                    <div>
                      <p className="mb-2 px-2 text-[11px] font-black text-slate-500">
                        إجراءات سريعة
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {quickActions.map(renderQuickAction)}
                      </div>
                    </div>
                  )}

                  {favoriteItems.length > 0 && (
                    <div>
                      <p className="mb-2 flex items-center gap-2 px-2 text-[11px] font-black text-slate-500">
                        <Star size={13} />
                        المفضلة
                      </p>
                      <div className="space-y-1.5">
                        {favoriteItems.map((item) => renderItem(item, true))}
                      </div>
                    </div>
                  )}

                  {recentItems.length > 0 && (
                    <div>
                      <p className="mb-2 px-2 text-[11px] font-black text-slate-500">
                        آخر الصفحات
                      </p>
                      <div className="space-y-1.5">
                        {recentItems
                          .slice(0, 4)
                          .map((item) => renderItem(item, true))}
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
                          className="flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs font-black text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                        >
                          <span className="flex items-center gap-2">
                            <SectionIcon size={15} />
                            {section.title}
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
                          {section.items.map((item) => renderItem(item))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </nav>
          </div>

          <div className="border-t border-white/10 bg-white/[0.025] p-3">
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
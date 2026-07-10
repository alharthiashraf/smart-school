"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Award,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  UserRoundCheck,
  Users,
  UsersRound,
  X,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import EmptyState from "@/components/ui/empty-state/EmptyState";
import PageLoader from "@/components/ui/loading/PageLoader";
import UiStatusBadge from "@/components/ui/badges/StatusBadge";
import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/lib/supabase";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

type Teacher = {
  id: string;
  school_id?: string | null;
  full_name: string;
  employee_number?: string | null;
  photo_url?: string | null;
  subject?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  weekly_load?: number | null;
  status?: string | null;
  admin_notes?: string | null;
  created_at?: string | null;
};

type TeacherSchedule = {
  id: string;
  teacher_id: string;
  school_id?: string | null;
};

type WaitingPeriod = {
  id: string;
  teacher_id: string;
  school_id?: string | null;
  approval_status?: string | null;
};

type PortfolioItem = {
  id: string;
  teacher_id: string;
  school_id?: string | null;
  review_status?: string | null;
};

type TeacherSubject = {
  id: string;
  teacher_id: string;
  school_id?: string | null;
};

type TeacherClass = {
  id: string;
  teacher_id: string;
  school_id?: string | null;
};

type TeacherWithStats = Teacher & {
  scheduleCount: number;
  waitingCount: number;
  pendingWaiting: number;
  portfolioCount: number;
  pendingPortfolio: number;
  assignedSubjectsCount: number;
  assignedClassesCount: number;
};

type TeacherAnalytics = {
  topDepartments: Array<{ name: string; count: number; load: number }>;
  topSubjects: Array<{ name: string; count: number }>;
  withoutSubjects: number;
  withoutClasses: number;
  withoutSchedule: number;
  highLoad: number;
  portfolioMissing: number;
  averageWeeklyLoad: number;
};

type TeacherSmartInsight = {
  title: string;
  description: string;
  tone: "green" | "gold" | "red" | "blue" | "teal";
  icon: ReactNode;
};


type Toast = {
  type: "success" | "error";
  message: string;
};

type TeacherForm = {
  full_name: string;
  employee_number: string;
  photo_url: string;
  subject: string;
  department: string;
  phone: string;
  email: string;
  weekly_load: string;
  status: string;
  admin_notes: string;
};

const PAGE_SIZE = 10;

const DEFAULT_STATUS = "على رأس العمل";

const TEACHER_STATUSES = [
  "على رأس العمل",
  "مكلف",
  "منتدب",
  "إجازة",
  "غير نشط",
];

const emptyForm: TeacherForm = {
  full_name: "",
  employee_number: "",
  photo_url: "",
  subject: "",
  department: "",
  phone: "",
  email: "",
  weekly_load: "",
  status: DEFAULT_STATUS,
  admin_notes: "",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isPending(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();

  return (
    !normalized ||
    ["بانتظار الموافقة", "بانتظار المراجعة", "pending", "review"].includes(
      normalized,
    )
  );
}

function isActiveTeacher(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();

  return (
    !normalized ||
    normalized === "active" ||
    normalized === "على رأس العمل"
  );
}

function safeNumber(value: string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "ar"));
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function dashboardTokenTone(tone: TeacherSmartInsight["tone"]) {
  const tones: Record<TeacherSmartInsight["tone"], string> = {
    green: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
    gold: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    red: "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    teal: "bg-[var(--app-teal-soft)] text-[var(--app-teal)]",
  };

  return tones[tone];
}

function progressBarColor(tone: TeacherSmartInsight["tone"]) {
  const colors: Record<TeacherSmartInsight["tone"], string> = {
    green: "bg-[var(--app-green)]",
    gold: "bg-[var(--app-accent)]",
    red: "bg-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue)]",
    teal: "bg-[var(--app-teal)]",
  };

  return colors[tone];
}

function buildTeacherTimeline(teacher: TeacherWithStats | null) {
  if (!teacher) return [];

  return [
    {
      title: "تم فتح الملف المختصر",
      description: "استعراض بيانات المعلم ومؤشرات الإسناد والجدول.",
      time: "الآن",
    },
    {
      title: "حالة الجدول",
      description: `عدد الحصص المجدولة: ${teacher.scheduleCount}`,
      time: "آخر مزامنة",
    },
    {
      title: "حالة الإسناد",
      description: `مواد: ${teacher.assignedSubjectsCount} · فصول: ${teacher.assignedClassesCount}`,
      time: "تحليل مباشر",
    },
    {
      title: "ملف الشواهد",
      description: `الشواهد: ${teacher.portfolioCount} · قيد المراجعة: ${teacher.pendingPortfolio}`,
      time: "ملف الأداء",
    },
  ];
}


function getExportHeaders() {
  return [
    "اسم المعلم",
    "الرقم الوظيفي",
    "المادة",
    "القسم",
    "الجوال",
    "البريد",
    "النصاب الأسبوعي",
    "الحالة",
    "المواد المسندة",
    "الفصول المسندة",
    "عدد الحصص المجدولة",
    "حصص الانتظار",
    "انتظار معلق",
    "الشواهد",
    "شواهد قيد المراجعة",
  ];
}

function getExportRows(source: TeacherWithStats[]) {
  return source.map((teacher) => [
    teacher.full_name || "-",
    teacher.employee_number || "-",
    teacher.subject || "-",
    teacher.department || "-",
    teacher.phone || "-",
    teacher.email || "-",
    teacher.weekly_load ?? "-",
    teacher.status || "-",
    teacher.assignedSubjectsCount,
    teacher.assignedClassesCount,
    teacher.scheduleCount,
    teacher.waitingCount,
    teacher.pendingWaiting,
    teacher.portfolioCount,
    teacher.pendingPortfolio,
  ]);
}

export default function TeachersPage() {
  const {
    currentSchool,
    currentRole,
    hasPermission,
    loading: schoolLoading,
  } = useSchool();

  const canManage =
    hasPermission("teachers.manage") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin";

  const canView =
    hasPermission("teachers.view") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin" ||
    currentRole === "vice_principal" ||
    currentRole === "administrative_staff";

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedules, setSchedules] = useState<TeacherSchedule[]>([]);
  const [waitingPeriods, setWaitingPeriods] = useState<WaitingPeriod[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] =
    useState<TeacherWithStats | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [form, setForm] = useState<TeacherForm>(emptyForm);

  const today = todayISO();

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!currentSchool?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const schoolId = currentSchool.id;

      const [
        teachersResult,
        scheduleResult,
        waitingResult,
        portfolioResult,
        subjectsResult,
        classesResult,
      ] = await Promise.allSettled([
        supabase
          .from("teachers")
          .select(
            "id, school_id, full_name, employee_number, photo_url, subject, department, phone, email, weekly_load, status, admin_notes, created_at",
          )
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false }),

        supabase
          .from("teacher_schedule")
          .select("id, teacher_id, school_id")
          .eq("school_id", schoolId),

        supabase
          .from("teacher_waiting_periods")
          .select("id, teacher_id, school_id, approval_status")
          .eq("school_id", schoolId),

        supabase
          .from("teacher_portfolio")
          .select("id, teacher_id, school_id, review_status")
          .eq("school_id", schoolId),

        supabase
          .from("teacher_subjects")
          .select("id, teacher_id, school_id")
          .eq("school_id", schoolId),

        supabase
          .from("teacher_classes")
          .select("id, teacher_id, school_id")
          .eq("school_id", schoolId),
      ]);

      if (teachersResult.status === "fulfilled") {
        if (teachersResult.value.error) throw teachersResult.value.error;
        setTeachers((teachersResult.value.data as Teacher[]) || []);
      }

      if (scheduleResult.status === "fulfilled") {
        setSchedules(
          scheduleResult.value.error
            ? []
            : ((scheduleResult.value.data as TeacherSchedule[]) || []),
        );
      }

      if (waitingResult.status === "fulfilled") {
        setWaitingPeriods(
          waitingResult.value.error
            ? []
            : ((waitingResult.value.data as WaitingPeriod[]) || []),
        );
      }

      if (portfolioResult.status === "fulfilled") {
        setPortfolioItems(
          portfolioResult.value.error
            ? []
            : ((portfolioResult.value.data as PortfolioItem[]) || []),
        );
      }

      if (subjectsResult.status === "fulfilled") {
        setTeacherSubjects(
          subjectsResult.value.error
            ? []
            : ((subjectsResult.value.data as TeacherSubject[]) || []),
        );
      }

      if (classesResult.status === "fulfilled") {
        setTeacherClasses(
          classesResult.value.error
            ? []
            : ((classesResult.value.data as TeacherClass[]) || []),
        );
      }

      setSelectedIds([]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر تحميل بيانات المعلمين";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, showToast]);

  useEffect(() => {
    if (!schoolLoading) {
      void fetchAllData();
    }
  }, [schoolLoading, fetchAllData]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [search, departmentFilter, subjectFilter, statusFilter, quickFilter]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateForm<K extends keyof TeacherForm>(
    key: K,
    value: TeacherForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
  }

  function startEdit(teacher: Teacher) {
    setShowForm(true);
    setEditingId(teacher.id);
    setForm({
      full_name: teacher.full_name || "",
      employee_number: teacher.employee_number || "",
      photo_url: teacher.photo_url || "",
      subject: teacher.subject || "",
      department: teacher.department || "",
      phone: teacher.phone || "",
      email: teacher.email || "",
      weekly_load:
        teacher.weekly_load === null || teacher.weekly_load === undefined
          ? ""
          : String(teacher.weekly_load),
      status: teacher.status || DEFAULT_STATUS,
      admin_notes: teacher.admin_notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveTeacher() {
    if (!canManage) {
      showToast("error", "لا تملك صلاحية إدارة المعلمين.");
      return;
    }

    if (!currentSchool?.id) {
      showToast("error", "لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      return;
    }

    if (!form.full_name.trim()) {
      showToast("error", "يرجى إدخال اسم المعلم.");
      return;
    }

    setSaving(true);

    const payload = {
      school_id: currentSchool.id,
      full_name: form.full_name.trim(),
      employee_number: form.employee_number.trim() || null,
      photo_url: form.photo_url.trim() || null,
      subject: form.subject.trim() || null,
      department: form.department.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      weekly_load: form.weekly_load.trim()
        ? safeNumber(form.weekly_load)
        : null,
      status: form.status.trim() || DEFAULT_STATUS,
      admin_notes: form.admin_notes.trim() || null,
    };

    const { error } = editingId
      ? await supabase
          .from("teachers")
          .update(payload)
          .eq("id", editingId)
          .eq("school_id", currentSchool.id)
      : await supabase.from("teachers").insert(payload);

    setSaving(false);

    if (error) {
      showToast("error", error.message);
      return;
    }

    showToast(
      "success",
      editingId ? "تم تعديل بيانات المعلم." : "تمت إضافة المعلم.",
    );

    closeForm();
    void fetchAllData();
  }

  async function deleteTeacher(id: string) {
    if (!canManage || !currentSchool?.id) return;

    const confirmed = window.confirm("هل تريد حذف المعلم؟");
    if (!confirmed) return;

    const { error } = await supabase
      .from("teachers")
      .delete()
      .eq("id", id)
      .eq("school_id", currentSchool.id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    if (selectedTeacher?.id === id) setSelectedTeacher(null);

    showToast("success", "تم حذف المعلم.");
    void fetchAllData();
  }

  async function deleteSelectedTeachers() {
    if (!canManage || !currentSchool?.id || selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `هل تريد حذف ${selectedIds.length} معلم؟`,
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("teachers")
      .delete()
      .eq("school_id", currentSchool.id)
      .in("id", selectedIds);

    if (error) {
      showToast("error", error.message);
      return;
    }

    showToast("success", "تم حذف المعلمين المحددين.");
    setSelectedIds([]);
    setSelectedTeacher(null);
    void fetchAllData();
  }

  async function updateSelectedStatus(newStatus: string) {
    if (!canManage || !currentSchool?.id || selectedIds.length === 0) return;

    const { error } = await supabase
      .from("teachers")
      .update({ status: newStatus })
      .eq("school_id", currentSchool.id)
      .in("id", selectedIds);

    if (error) {
      showToast("error", error.message);
      return;
    }

    showToast("success", "تم تحديث حالة المعلمين المحددين.");
    setSelectedIds([]);
    void fetchAllData();
  }

  const departments = useMemo(
    () => uniqueValues(teachers.map((teacher) => teacher.department)),
    [teachers],
  );

  const subjects = useMemo(
    () => uniqueValues(teachers.map((teacher) => teacher.subject)),
    [teachers],
  );

  const statuses = useMemo(
    () => uniqueValues(teachers.map((teacher) => teacher.status)),
    [teachers],
  );

  const teachersWithStats = useMemo(() => {
    return teachers.map((teacher) => {
      const teacherSchedules = schedules.filter(
        (item) => item.teacher_id === teacher.id,
      );
      const teacherWaiting = waitingPeriods.filter(
        (item) => item.teacher_id === teacher.id,
      );
      const teacherPortfolio = portfolioItems.filter(
        (item) => item.teacher_id === teacher.id,
      );
      const assignedSubjects = teacherSubjects.filter(
        (item) => item.teacher_id === teacher.id,
      );
      const assignedClasses = teacherClasses.filter(
        (item) => item.teacher_id === teacher.id,
      );

      return {
        ...teacher,
        scheduleCount: teacherSchedules.length,
        waitingCount: teacherWaiting.length,
        pendingWaiting: teacherWaiting.filter((item) =>
          isPending(item.approval_status),
        ).length,
        portfolioCount: teacherPortfolio.length,
        pendingPortfolio: teacherPortfolio.filter((item) =>
          isPending(item.review_status),
        ).length,
        assignedSubjectsCount: assignedSubjects.length,
        assignedClassesCount: assignedClasses.length,
      };
    });
  }, [
    teachers,
    schedules,
    waitingPeriods,
    portfolioItems,
    teacherSubjects,
    teacherClasses,
  ]);

  const teacherAnalytics = useMemo<TeacherAnalytics>(() => {
    const departmentMap = new Map<string, { count: number; load: number }>();
    const subjectMap = new Map<string, number>();

    teachersWithStats.forEach((teacher) => {
      const department = teacher.department || "غير محدد";
      const subject = teacher.subject || "غير محدد";

      const departmentItem = departmentMap.get(department) || { count: 0, load: 0 };
      departmentItem.count += 1;
      departmentItem.load += Number(teacher.weekly_load || 0);
      departmentMap.set(department, departmentItem);

      subjectMap.set(subject, (subjectMap.get(subject) || 0) + 1);
    });

    const topDepartments = Array.from(departmentMap.entries())
      .map(([name, item]) => ({ name, count: item.count, load: item.load }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const topSubjects = Array.from(subjectMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const totalLoad = teachersWithStats.reduce(
      (sum, teacher) => sum + Number(teacher.weekly_load || 0),
      0,
    );

    return {
      topDepartments,
      topSubjects,
      withoutSubjects: teachersWithStats.filter((teacher) => teacher.assignedSubjectsCount === 0).length,
      withoutClasses: teachersWithStats.filter((teacher) => teacher.assignedClassesCount === 0).length,
      withoutSchedule: teachersWithStats.filter((teacher) => teacher.scheduleCount === 0).length,
      highLoad: teachersWithStats.filter((teacher) => Number(teacher.weekly_load || 0) >= 24).length,
      portfolioMissing: teachersWithStats.filter((teacher) => teacher.portfolioCount === 0).length,
      averageWeeklyLoad: teachersWithStats.length
        ? Math.round(totalLoad / teachersWithStats.length)
        : 0,
    };
  }, [teachersWithStats]);

  const teacherSmartInsights = useMemo<TeacherSmartInsight[]>(() => {
    const insights: TeacherSmartInsight[] = [];

    if (teacherAnalytics.withoutSubjects > 0) {
      insights.push({
        title: "معلمون بدون مواد مسندة",
        description: `يوجد ${teacherAnalytics.withoutSubjects} معلم لا تظهر لديه مواد مسندة.`,
        tone: "red",
        icon: <BookOpenCheck className="h-5 w-5" />,
      });
    }

    if (teacherAnalytics.withoutSchedule > 0) {
      insights.push({
        title: "جداول غير مكتملة",
        description: `${teacherAnalytics.withoutSchedule} معلم لا يظهر لديه جدول مجدول.`,
        tone: "gold",
        icon: <CalendarCheck className="h-5 w-5" />,
      });
    }

    if (teacherAnalytics.highLoad > 0) {
      insights.push({
        title: "نصاب مرتفع",
        description: `${teacherAnalytics.highLoad} معلم لديهم نصاب أسبوعي مرتفع ويحتاجون مراجعة توزيع.`,
        tone: "blue",
        icon: <BriefcaseBusiness className="h-5 w-5" />,
      });
    }

    if (teacherAnalytics.portfolioMissing > 0) {
      insights.push({
        title: "ملفات شواهد غير مكتملة",
        description: `${teacherAnalytics.portfolioMissing} معلم لا تظهر لديهم شواهد مرفوعة.`,
        tone: "teal",
        icon: <Award className="h-5 w-5" />,
      });
    }

    if (insights.length === 0) {
      insights.push({
        title: "حالة الكادر مستقرة",
        description: "لا توجد مؤشرات حرجة حالياً في الإسناد أو الجداول أو الشواهد.",
        tone: "green",
        icon: <UserRoundCheck className="h-5 w-5" />,
      });
    }

    return insights.slice(0, 4);
  }, [teacherAnalytics]);

  function runSmartSearch(command: string) {
    const normalized = command.trim();

    if (!normalized) return;

    setSearch("");
    setDepartmentFilter("all");
    setSubjectFilter("all");
    setStatusFilter("all");

    if (normalized.includes("إجازة")) {
      setQuickFilter("leave");
      return;
    }

    if (normalized.includes("مكلف")) {
      setQuickFilter("assigned");
      return;
    }

    if (normalized.includes("غير نشط")) {
      setQuickFilter("inactive");
      return;
    }

    if (normalized.includes("نشيط") || normalized.includes("على رأس العمل")) {
      setQuickFilter("active");
      return;
    }

    if (normalized.includes("بدون جدول")) {
      setQuickFilter("all");
      setSearch("بدون جدول");
      return;
    }

    setQuickFilter("all");
    setSearch(normalized);
  }

  const filteredTeachers = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return teachersWithStats.filter((teacher) => {
      const extraKeywords = [
        teacher.scheduleCount === 0 ? "بدون جدول" : "",
        teacher.assignedSubjectsCount === 0 ? "بدون مواد" : "",
        teacher.assignedClassesCount === 0 ? "بدون فصول" : "",
        Number(teacher.weekly_load || 0) >= 24 ? "تجاوز النصاب نصاب مرتفع" : "",
      ];

      const text = [
        teacher.full_name,
        teacher.employee_number,
        teacher.subject,
        teacher.department,
        teacher.phone,
        teacher.email,
        teacher.status,
        ...extraKeywords,
      ]
        .join(" ")
        .toLowerCase();

      const matchQuick =
        quickFilter === "all" ||
        (quickFilter === "active" && isActiveTeacher(teacher.status)) ||
        (quickFilter === "leave" && teacher.status === "إجازة") ||
        (quickFilter === "assigned" && teacher.status === "مكلف") ||
        (quickFilter === "inactive" && teacher.status === "غير نشط");

      return (
        text.includes(keyword) &&
        matchQuick &&
        (departmentFilter === "all" ||
          teacher.department === departmentFilter) &&
        (subjectFilter === "all" || teacher.subject === subjectFilter) &&
        (statusFilter === "all" || teacher.status === statusFilter)
      );
    });
  }, [
    teachersWithStats,
    search,
    departmentFilter,
    subjectFilter,
    statusFilter,
    quickFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / PAGE_SIZE));

  const pagedTeachers = filteredTeachers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const activeTeachers = teachers.filter((teacher) =>
    isActiveTeacher(teacher.status),
  ).length;

  const totalWeeklyLoad = teachers.reduce(
    (sum, teacher) => sum + Number(teacher.weekly_load || 0),
    0,
  );

  const pendingWaitingTotal = waitingPeriods.filter((item) =>
    isPending(item.approval_status),
  ).length;

  const pendingPortfolioTotal = portfolioItems.filter((item) =>
    isPending(item.review_status),
  ).length;

  const allPageSelected =
    pagedTeachers.length > 0 &&
    pagedTeachers.every((teacher) => selectedIds.includes(teacher.id));

  function toggleSelectTeacher(id: string) {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  }

  function toggleSelectPage() {
    const pageIds = pagedTeachers.map((teacher) => teacher.id);

    setSelectedIds((previous) =>
      allPageSelected
        ? previous.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...previous, ...pageIds])),
    );
  }

  async function exportTeachersExcel(
    source: TeacherWithStats[] = filteredTeachers,
  ) {
    await exportTableToExcel({
      title: "تقرير المعلمين",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle:
        "قائمة المعلمين مع المواد والفصول والجدول والانتظار والشواهد",
      headers: getExportHeaders(),
      rows: getExportRows(source),
      fileName: `teachers-${today}.xlsx`,
    });

    showToast("success", "تم تصدير المعلمين Excel.");
  }

  function exportTeachersPDF(source: TeacherWithStats[] = filteredTeachers) {
    exportTableToPDF({
      title: "تقرير المعلمين",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle:
        "قائمة المعلمين مع المواد والفصول والجدول والانتظار والشواهد",
      headers: getExportHeaders(),
      rows: getExportRows(source),
      fileName: `teachers-${today}.pdf`,
    });

    showToast("success", "تم تجهيز PDF للمعلمين.");
  }

  async function exportSelectedExcel() {
    const selected = filteredTeachers.filter((teacher) =>
      selectedIds.includes(teacher.id),
    );

    await exportTeachersExcel(selected);
  }

  function exportSelectedPDF() {
    const selected = filteredTeachers.filter((teacher) =>
      selectedIds.includes(teacher.id),
    );

    exportTeachersPDF(selected);
  }

  if (!canView) {
    return (
      <AuthGuard>
        <SummaryCard
          title="لا تملك صلاحية الوصول إلى إدارة المعلمين"
          description="هذه الصفحة مخصصة للإدارة المدرسية فقط."
          tone="gold"
          icon={<GraduationCap size={22} />}
        />
      </AuthGuard>
    );
  }

  if (schoolLoading) {
    return (
      <AuthGuard>
        <PageLoader text="جاري تحميل بيانات المدرسة..." />
      </AuthGuard>
    );
  }

  if (!currentSchool) {
    return (
      <AuthGuard>
        <SummaryCard
          title="لا توجد مدرسة مرتبطة"
          description="لا توجد مدرسة مرتبطة بالمستخدم الحالي."
          tone="red"
          icon={<GraduationCap size={22} />}
        />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-5" dir="rtl">
        {toast && <ToastBox toast={toast} />}
        <PageHeader
          variant="hero"
          title="إدارة المعلمين"
          description={`${currentSchool.school_name} — بيانات المعلمين، الإسناد، الجدول، حصص الانتظار، وملف الشواهد في صفحة واحدة.`}
          badge="منصة المدرسة الذكية"
          icon={<GraduationCap size={18} />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "إدارة المعلمين" },
          ]}
          meta={[
            { label: "المدرسة", value: currentSchool.school_name },
            { label: "تاريخ اليوم", value: today },
            { label: "المعلمون الظاهرون", value: filteredTeachers.length },
            { label: "المحددون", value: selectedIds.length },
          ]}
          stats={[
            { label: "إجمالي المعلمين", value: teachers.length, icon: <GraduationCap size={20} />, tone: "blue" },
            { label: "على رأس العمل", value: activeTeachers, icon: <UserRoundCheck size={20} />, tone: "green" },
            { label: "حصص مجدولة", value: schedules.length, icon: <BookOpenCheck size={20} />, tone: "teal" },
            { label: "مراجعات معلقة", value: pendingWaitingTotal + pendingPortfolioTotal, icon: <ClipboardCheck size={20} />, tone: pendingWaitingTotal + pendingPortfolioTotal > 0 ? "gold" : "green" },
          ]}
          actions={
            <>
              {canManage && (
                <SecondaryButton
                  icon={<Plus size={17} />}
                  onClick={openAddForm}
                  tone="warning"
                >
                  إضافة معلم
                </SecondaryButton>
              )}

              <SecondaryButton
                icon={<Download size={17} />}
                onClick={() => void exportTeachersExcel()}
              >
                Excel
              </SecondaryButton>

              <PrimaryButton
                icon={<FileText size={17} />}
                onClick={() => exportTeachersPDF()}
              >
                PDF
              </PrimaryButton>

              <SecondaryButton
                icon={<RefreshCcw size={17} className={loading ? "animate-spin" : ""} />}
                onClick={() => void fetchAllData()}
                disabled={loading}
                tone="dark"
              >
                تحديث
              </SecondaryButton>
            </>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <ExecutiveCard
            title="إجمالي المعلمين"
            value={teachers.length}
            subtitle={`${activeTeachers} على رأس العمل`}
            icon={<GraduationCap size={22} />}
            tone="blue"
            progress={teachers.length > 0 ? 100 : 0}
          />

          <ExecutiveCard
            title="مواد مسندة"
            value={teacherSubjects.length}
            subtitle={`${teacherClasses.length} فصول مسندة`}
            icon={<Users size={22} />}
            tone="green"
          />

          <ExecutiveCard
            title="الأقسام"
            value={departments.length}
            subtitle={`${subjects.length} مادة`}
            icon={<BriefcaseBusiness size={22} />}
            tone="primary"
          />

          <ExecutiveCard
            title="حصص مجدولة"
            value={schedules.length}
            subtitle={`النصاب الأسبوعي ${totalWeeklyLoad}`}
            icon={<BookOpenCheck size={22} />}
            tone="teal"
          />

          <ExecutiveCard
            title="حصص الانتظار"
            value={waitingPeriods.length}
            subtitle={`${pendingWaitingTotal} بانتظار الموافقة`}
            icon={<CalendarCheck size={22} />}
            tone={pendingWaitingTotal > 0 ? "gold" : "green"}
          />

          <ExecutiveCard
            title="ملف الشواهد"
            value={portfolioItems.length}
            subtitle={`${pendingPortfolioTotal} قيد المراجعة`}
            icon={<Award size={22} />}
            tone={pendingPortfolioTotal > 0 ? "gold" : "green"}
          />
        </section>

        <SummaryCard
          title="الملخص التنفيذي للمعلمين"
          description="قراءة سريعة لحالة الكادر التعليمي، الإسناد، الجدول، الانتظار، وملفات الشواهد."
          tone={pendingWaitingTotal > 0 || pendingPortfolioTotal > 0 ? "gold" : "green"}
          items={[
            { label: "إجمالي المعلمين", value: teachers.length },
            { label: "على رأس العمل", value: activeTeachers },
            { label: "مواد مسندة", value: teacherSubjects.length },
            { label: "حصص مجدولة", value: schedules.length },
            { label: "انتظار معلق", value: pendingWaitingTotal },
            { label: "شواهد قيد المراجعة", value: pendingPortfolioTotal },
          ]}
          footer="تعتمد المؤشرات على البيانات المسجلة في الجداول الحالية، وتزداد دقتها مع اكتمال الإسناد والجداول والشواهد."
        />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <TeacherAnalyticsPanel
            analytics={teacherAnalytics}
            totalTeachers={teachers.length}
            activeTeachers={activeTeachers}
            totalWeeklyLoad={totalWeeklyLoad}
          />

          <TeacherSmartInsightsPanel insights={teacherSmartInsights} />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <TeacherChartsPanel
            totalTeachers={teachers.length}
            activeTeachers={activeTeachers}
            waitingPeriods={waitingPeriods.length}
            pendingWaiting={pendingWaitingTotal}
            portfolioItems={portfolioItems.length}
            pendingPortfolio={pendingPortfolioTotal}
            averageWeeklyLoad={teacherAnalytics.averageWeeklyLoad}
            withoutSchedule={teacherAnalytics.withoutSchedule}
          />

          <TeacherPerformancePanel
            totalTeachers={teachers.length}
            withSubjects={teachers.length - teacherAnalytics.withoutSubjects}
            withClasses={teachers.length - teacherAnalytics.withoutClasses}
            withSchedule={teachers.length - teacherAnalytics.withoutSchedule}
            withPortfolio={teachers.length - teacherAnalytics.portfolioMissing}
          />

          <TeacherImportPanel />
        </section>

        <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm print:hidden">
          <div className="mb-4">
            <h2 className="text-xl font-black text-[var(--app-text)]">البحث الذكي</h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              جرّب: معلمو الرياضيات، معلمون بدون جدول، معلمون بإجازة، معلم تجاوز النصاب.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {["معلمو الرياضيات", "معلمون بدون جدول", "معلمون بإجازة", "معلم تجاوز النصاب", "على رأس العمل"].map((command) => (
              <button
                key={command}
                type="button"
                onClick={() => runSmartSearch(command)}
                className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-2 text-sm font-black text-[var(--app-text)] transition hover:-translate-y-0.5 hover:border-[var(--app-teal)] hover:text-[var(--app-teal)]"
              >
                {command}
              </button>
            ))}
          </div>
        </section>


        {showForm && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {editingId ? (
                  <Pencil className="text-[#C1B489]" />
                ) : (
                  <Plus className="text-[#C1B489]" />
                )}

                <h2 className="text-xl font-black text-[#15445A]">
                  {editingId ? "تعديل بيانات المعلم" : "إضافة معلم جديد"}
                </h2>
              </div>

              <SecondaryButton onClick={closeForm}>
                إغلاق
              </SecondaryButton>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input
                placeholder="اسم المعلم"
                value={form.full_name}
                onChange={(value) => updateForm("full_name", value)}
              />
              <Input
                placeholder="الرقم الوظيفي"
                value={form.employee_number}
                onChange={(value) => updateForm("employee_number", value)}
              />
              <Input
                placeholder="رابط صورة المعلم"
                value={form.photo_url}
                onChange={(value) => updateForm("photo_url", value)}
              />
              <Input
                placeholder="المادة الأساسية"
                value={form.subject}
                onChange={(value) => updateForm("subject", value)}
              />
              <Input
                placeholder="القسم"
                value={form.department}
                onChange={(value) => updateForm("department", value)}
              />
              <Input
                placeholder="الجوال"
                value={form.phone}
                onChange={(value) => updateForm("phone", value)}
              />
              <Input
                placeholder="البريد الإلكتروني"
                value={form.email}
                onChange={(value) => updateForm("email", value)}
              />
              <Input
                placeholder="النصاب الأسبوعي"
                value={form.weekly_load}
                onChange={(value) => updateForm("weekly_load", value)}
                type="number"
              />

              <select
                value={form.status}
                onChange={(event) => updateForm("status", event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#0DA9A6]"
              >
                {TEACHER_STATUSES.map((teacherStatus) => (
                  <option key={teacherStatus} value={teacherStatus}>
                    {teacherStatus}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={form.admin_notes}
              onChange={(event) => updateForm("admin_notes", event.target.value)}
              placeholder="ملاحظات إدارية"
              className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
            />

            <PrimaryButton
              className="mt-5"
              icon={saving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : editingId ? <Save size={16} /> : <Plus size={16} />}
              onClick={() => void saveTeacher()}
              disabled={saving}
            >
              {saving
                ? "جاري الحفظ..."
                : editingId
                  ? "حفظ التعديل"
                  : "إضافة المعلم"}
            </PrimaryButton>
          </section>
        )}

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-5 flex flex-col gap-4 print:hidden">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-[#15445A]">
                    قائمة المعلمين
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    عرض {pagedTeachers.length} من {filteredTeachers.length} معلم
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <QuickFilter
                    label="الكل"
                    value="all"
                    active={quickFilter}
                    onClick={setQuickFilter}
                  />
                  <QuickFilter
                    label="النشطون"
                    value="active"
                    active={quickFilter}
                    onClick={setQuickFilter}
                  />
                  <QuickFilter
                    label="الإجازات"
                    value="leave"
                    active={quickFilter}
                    onClick={setQuickFilter}
                  />
                  <QuickFilter
                    label="المكلفون"
                    value="assigned"
                    active={quickFilter}
                    onClick={setQuickFilter}
                  />
                  <QuickFilter
                    label="غير نشط"
                    value="inactive"
                    active={quickFilter}
                    onClick={setQuickFilter}
                  />
                </div>
              </div>

              <div className="grid w-full gap-3 lg:grid-cols-4">
                <select
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
                >
                  <option value="all">كل الأقسام</option>
                  {departments.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
                >
                  <option value="all">كل المواد</option>
                  {subjects.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
                >
                  <option value="all">كل الحالات</option>
                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="ابحث عن معلم..."
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-4 pr-10 outline-none focus:border-[#0DA9A6]"
                  />
                </div>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-black text-amber-800">
                    تم تحديد {selectedIds.length} معلم
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void exportSelectedExcel()}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700"
                    >
                      Excel المحدد
                    </button>

                    <button
                      type="button"
                      onClick={exportSelectedPDF}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700"
                    >
                      PDF المحدد
                    </button>

                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => void updateSelectedStatus(DEFAULT_STATUS)}
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white"
                        >
                          جعلهم على رأس العمل
                        </button>

                        <button
                          type="button"
                          onClick={() => void updateSelectedStatus("إجازة")}
                          className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white"
                        >
                          جعلهم إجازة
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteSelectedTeachers()}
                          className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white"
                        >
                          حذف المحدد
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-right text-sm text-slate-500">
                    <th className="rounded-r-2xl px-4 py-3 print:hidden">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectPage}
                      />
                    </th>
                    <th className="px-4 py-3">المعلم</th>
                    <th className="px-4 py-3">الرقم الوظيفي</th>
                    <th className="px-4 py-3">المادة</th>
                    <th className="px-4 py-3">القسم</th>
                    <th className="px-4 py-3">الجدول</th>
                    <th className="px-4 py-3">الانتظار</th>
                    <th className="px-4 py-3">الشواهد</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="rounded-l-2xl px-4 py-3 print:hidden">
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {!loading &&
                    pagedTeachers.map((teacher) => (
                      <tr
                        key={teacher.id}
                        className="border-b border-slate-50 text-sm transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 print:hidden">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(teacher.id)}
                            onChange={() => toggleSelectTeacher(teacher.id)}
                          />
                        </td>

                        <td className="px-4 py-3 font-bold text-[#15445A]">
                          <div className="flex items-center gap-3">
                            <TeacherAvatar teacher={teacher} />

                            <div>
                              <p>{teacher.full_name}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {teacher.phone || "-"} — {teacher.email || "-"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {teacher.employee_number || "-"}
                        </td>

                        <td className="px-4 py-3">{teacher.subject || "-"}</td>

                        <td className="px-4 py-3">
                          {teacher.department || "-"}
                        </td>

                        <td className="px-4 py-3">
                          <SmallBadge label={`${teacher.scheduleCount} حصة`} />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <SmallBadge label={`${teacher.waitingCount}`} />
                            {teacher.pendingWaiting > 0 && (
                              <SmallBadge
                                label={`معلق ${teacher.pendingWaiting}`}
                              />
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <SmallBadge label={`${teacher.portfolioCount}`} />
                            {teacher.pendingPortfolio > 0 && (
                              <SmallBadge
                                label={`مراجعة ${teacher.pendingPortfolio}`}
                              />
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge status={teacher.status} />
                        </td>

                        <td className="px-4 py-3 print:hidden">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedTeacher(teacher)}
                              className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                              title="عرض مختصر"
                            >
                              <Eye size={16} />
                            </button>

                            <Link
                              href={`/teachers/${teacher.id}`}
                              className="rounded-xl bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                              title="فتح ملف المعلم"
                            >
                              <FileText size={16} />
                            </Link>

                            <Link
                              href={`/teachers/${teacher.id}/portfolio`}
                              className="rounded-xl bg-[#C1B489]/20 p-2 text-[#15445A] hover:bg-[#C1B489]/30"
                              title="ملف الشواهد"
                            >
                              <Award size={16} />
                            </Link>

                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(teacher)}
                                  className="rounded-xl bg-[#3D7EB9]/10 p-2 text-[#3D7EB9] hover:bg-[#3D7EB9]/20"
                                  title="تعديل"
                                >
                                  <Pencil size={16} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void deleteTeacher(teacher.id)}
                                  className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                  title="حذف"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {loading && (
                <div className="py-6">
                  <PageLoader text="جاري تحميل المعلمين..." />
                </div>
              )}

              {!loading && filteredTeachers.length === 0 && (
                <EmptyState
                  icon={<Search size={30} />}
                  title="لا توجد نتائج"
                  description="لا يوجد معلمون مطابقون للبحث أو الفلاتر الحالية."
                />
              )}
            </div>

            {!loading && filteredTeachers.length > 0 && (
              <div className="mt-5 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  عرض {pagedTeachers.length} من {filteredTeachers.length}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page === 1}
                    className="rounded-xl border p-2 disabled:opacity-40"
                  >
                    <ChevronRight size={18} />
                  </button>

                  <span className="text-sm font-bold text-slate-700">
                    {page} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((value) => Math.min(totalPages, value + 1))
                    }
                    disabled={page === totalPages}
                    className="rounded-xl border p-2 disabled:opacity-40"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <TeacherSideCard
            selectedTeacher={selectedTeacher}
            setSelectedTeacher={setSelectedTeacher}
          />
        </section>
      </div>
    </AuthGuard>
  );
}

function TeacherSideCard({
  selectedTeacher,
  setSelectedTeacher,
}: {
  selectedTeacher: TeacherWithStats | null;
  setSelectedTeacher: (teacher: TeacherWithStats | null) => void;
}) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      {selectedTeacher ? (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#15445A]">
              الملف المختصر
            </h2>

            <button
              type="button"
              onClick={() => setSelectedTeacher(null)}
              className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
            >
              <X size={18} />
            </button>
          </div>

          <div className="rounded-[28px] bg-[#15445A] p-5 text-white">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#C1B489] text-[#15445A]">
                {selectedTeacher.photo_url ? (
                  <img
                    src={selectedTeacher.photo_url}
                    alt={selectedTeacher.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRoundCheck size={28} />
                )}
              </div>

              <div>
                <h3 className="text-2xl font-black text-[#C1B489]">
                  {selectedTeacher.full_name}
                </h3>

                <p className="text-sm text-slate-300">
                  {selectedTeacher.subject || "-"} —{" "}
                  {selectedTeacher.department || "-"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoMini
                title="الرقم الوظيفي"
                value={selectedTeacher.employee_number || "-"}
              />
              <InfoMini
                title="النصاب"
                value={String(selectedTeacher.weekly_load ?? "-")}
              />
              <InfoMini title="الحالة" value={selectedTeacher.status || "-"} />
              <InfoMini title="المادة" value={selectedTeacher.subject || "-"} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <DetailStat
              title="مواد مسندة"
              value={selectedTeacher.assignedSubjectsCount}
              icon={<BookOpenCheck size={18} />}
              color="blue"
            />
            <DetailStat
              title="فصول مسندة"
              value={selectedTeacher.assignedClassesCount}
              icon={<Users size={18} />}
              color="blue"
            />
            <DetailStat
              title="الجدول"
              value={selectedTeacher.scheduleCount}
              icon={<BookOpenCheck size={18} />}
              color="blue"
            />
            <DetailStat
              title="الانتظار"
              value={selectedTeacher.waitingCount}
              icon={<CalendarCheck size={18} />}
              color="amber"
            />
            <DetailStat
              title="انتظار معلق"
              value={selectedTeacher.pendingWaiting}
              icon={<ClipboardCheck size={18} />}
              color="red"
            />
            <DetailStat
              title="الشواهد"
              value={selectedTeacher.portfolioCount}
              icon={<Award size={18} />}
              color="green"
            />
          </div>


          <div className="mt-5 space-y-3">
            <TeacherDrawerSection
              title="Timeline"
              items={buildTeacherTimeline(selectedTeacher).map((item) => `${item.time} — ${item.title}: ${item.description}`)}
            />

            <TeacherDrawerSection
              title="Portfolio"
              items={[
                `الشواهد: ${selectedTeacher.portfolioCount}`,
                `قيد المراجعة: ${selectedTeacher.pendingPortfolio}`,
                `حالة الملف: ${selectedTeacher.portfolioCount > 0 ? "مكتمل جزئيًا" : "يحتاج رفع شواهد"}`,
              ]}
            />

            <TeacherDrawerSection
              title="Schedule & Assignment"
              items={[
                `الحصص المجدولة: ${selectedTeacher.scheduleCount}`,
                `المواد المسندة: ${selectedTeacher.assignedSubjectsCount}`,
                `الفصول المسندة: ${selectedTeacher.assignedClassesCount}`,
                `النصاب الأسبوعي: ${selectedTeacher.weekly_load ?? "-"}`,
              ]}
            />

            <TeacherDrawerSection
              title="AI Recommendations"
              items={[
                selectedTeacher.scheduleCount === 0 ? "يفضل مراجعة جدول المعلم وربطه بالحصة." : "الجدول يظهر مرتبطًا.",
                selectedTeacher.assignedSubjectsCount === 0 ? "المعلم يحتاج إسناد مادة." : "إسناد المواد ظاهر.",
                selectedTeacher.portfolioCount === 0 ? "يفضل تذكير المعلم برفع الشواهد." : "ملف الشواهد يحتوي على عناصر.",
              ]}
            />
          </div>

          <div className="mt-5 grid gap-2">
            <Link
              href={`/teachers/${selectedTeacher.id}`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#C1B489] px-5 py-3 text-sm font-black text-[#15445A]"
            >
              <FileText size={17} />
              فتح ملف المعلم
            </Link>

            <Link
              href={`/teachers/${selectedTeacher.id}/portfolio`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-black text-white"
            >
              <Award size={17} />
              ملف الشواهد
            </Link>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<GraduationCap size={42} />}
          title="اختر معلمًا"
          description="اضغط على أيقونة العين لعرض الملف المختصر."
          className="min-h-[350px]"
        />
      )}
    </div>
  );
}

function TeacherAvatar({ teacher }: { teacher: Teacher }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#15445A]/10 text-[#15445A]">
      {teacher.photo_url ? (
        <img
          src={teacher.photo_url}
          alt={teacher.full_name}
          className="h-full w-full object-cover"
        />
      ) : (
        <UserRoundCheck size={22} />
      )}
    </div>
  );
}

function QuickFilter({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: string;
  onClick: (value: string) => void;
}) {
  const isActive = active === value;

  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-2xl px-4 py-2 text-sm font-black ${
        isActive ? "bg-[#15445A] text-white" : "bg-slate-100 text-slate-600"
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const value = status || DEFAULT_STATUS;

  const tone =
    value === DEFAULT_STATUS || value === "active"
      ? "success"
      : value === "غير نشط"
        ? "danger"
        : "warning";

  return <UiStatusBadge tone={tone}>{value}</UiStatusBadge>;
}

function SmallBadge({ label }: { label: string }) {
  return <UiStatusBadge tone="default">{label}</UiStatusBadge>;
}

function DetailStat({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: "blue" | "red" | "amber" | "green";
}) {
  const colors = {
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    red: "bg-red-50 text-red-700",
    amber: "bg-[#C1B489]/20 text-[#15445A]",
    green: "bg-[#07A869]/10 text-[#07A869]",
  };

  return (
    <div className={`rounded-2xl p-4 ${colors[color]}`}>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p className="text-xs font-bold">{title}</p>
      </div>
      <h3 className="text-2xl font-black">{value}</h3>
    </div>
  );
}

function InfoMini({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs text-slate-300">{title}</p>
      <p className="mt-1 truncate font-black text-white">{value}</p>
    </div>
  );
}

function Input({
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#0DA9A6]"
    />
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl print:hidden ${
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      <div
        className={`h-2.5 w-2.5 rounded-full ${
          toast.type === "success" ? "bg-emerald-200" : "bg-red-200"
        }`}
      />
      <span>{toast.message}</span>
    </div>
  );
}


function TeacherAnalyticsPanel({
  analytics,
  totalTeachers,
  activeTeachers,
  totalWeeklyLoad,
}: {
  analytics: TeacherAnalytics;
  totalTeachers: number;
  activeTeachers: number;
  totalWeeklyLoad: number;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black text-[var(--app-text)]">Teacher Analytics</h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          تحليل سريع للتخصصات، الأقسام، النصاب، والإسناد.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TeacherAnalyticsMini label="إجمالي المعلمين" value={totalTeachers} icon={<GraduationCap size={18} />} tone="blue" />
        <TeacherAnalyticsMini label="على رأس العمل" value={activeTeachers} icon={<UserRoundCheck size={18} />} tone="green" />
        <TeacherAnalyticsMini label="متوسط النصاب" value={analytics.averageWeeklyLoad} icon={<BriefcaseBusiness size={18} />} tone="gold" />
        <TeacherAnalyticsMini label="النصاب الكلي" value={totalWeeklyLoad} icon={<BookOpenCheck size={18} />} tone="teal" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <TeacherMiniList title="أكثر الأقسام" items={analytics.topDepartments.map((item) => `${item.name} — ${item.count} معلم · نصاب ${item.load}`)} />
        <TeacherMiniList title="أكثر المواد" items={analytics.topSubjects.map((item) => `${item.name} — ${item.count} معلم`)} />
      </div>
    </section>
  );
}

function TeacherSmartInsightsPanel({ insights }: { insights: TeacherSmartInsight[] }) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black text-[var(--app-text)]">Smart Insights</h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          توصيات تشغيلية مبنية على الإسناد والجداول والشواهد.
        </p>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className="flex gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${dashboardTokenTone(insight.tone)}`}>
              {insight.icon}
            </div>

            <div>
              <p className="text-sm font-black text-[var(--app-text)]">{insight.title}</p>
              <p className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]">
                {insight.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeacherChartsPanel({
  totalTeachers,
  activeTeachers,
  waitingPeriods,
  pendingWaiting,
  portfolioItems,
  pendingPortfolio,
  averageWeeklyLoad,
  withoutSchedule,
}: {
  totalTeachers: number;
  activeTeachers: number;
  waitingPeriods: number;
  pendingWaiting: number;
  portfolioItems: number;
  pendingPortfolio: number;
  averageWeeklyLoad: number;
  withoutSchedule: number;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black text-[var(--app-text)]">Charts</h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          توزيع بصري سريع لحالة الكادر والجداول والشواهد.
        </p>
      </div>

      <div className="space-y-4">
        <TeacherProgressRow label="على رأس العمل" value={activeTeachers} total={Math.max(1, totalTeachers)} tone="green" />
        <TeacherProgressRow label="بدون جدول" value={withoutSchedule} total={Math.max(1, totalTeachers)} tone="red" />
        <TeacherProgressRow label="انتظار معلق" value={pendingWaiting} total={Math.max(1, waitingPeriods)} tone="gold" />
        <TeacherProgressRow label="شواهد قيد المراجعة" value={pendingPortfolio} total={Math.max(1, portfolioItems)} tone="blue" />

        <div className="rounded-2xl bg-[var(--app-card-soft)] p-3">
          <div className="mb-2 flex justify-between text-xs font-bold text-[var(--app-text-muted)]">
            <span>متوسط النصاب</span>
            <span>{averageWeeklyLoad}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--app-card)]">
            <div
              className="h-full rounded-full bg-[var(--app-teal)]"
              style={{ width: `${Math.min(100, Math.max(4, percentage(averageWeeklyLoad, 24)))}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function TeacherPerformancePanel({
  totalTeachers,
  withSubjects,
  withClasses,
  withSchedule,
  withPortfolio,
}: {
  totalTeachers: number;
  withSubjects: number;
  withClasses: number;
  withSchedule: number;
  withPortfolio: number;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black text-[var(--app-text)]">Teacher Performance</h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          اكتمال الإسناد والجدول والشواهد.
        </p>
      </div>

      <div className="space-y-4">
        <TeacherProgressRow label="اكتمال المواد" value={withSubjects} total={Math.max(1, totalTeachers)} tone="green" />
        <TeacherProgressRow label="اكتمال الفصول" value={withClasses} total={Math.max(1, totalTeachers)} tone="blue" />
        <TeacherProgressRow label="اكتمال الجداول" value={withSchedule} total={Math.max(1, totalTeachers)} tone="teal" />
        <TeacherProgressRow label="اكتمال الشواهد" value={withPortfolio} total={Math.max(1, totalTeachers)} tone="gold" />
      </div>
    </section>
  );
}

function TeacherImportPanel() {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm print:hidden">
      <div className="mb-4">
        <h2 className="text-xl font-black text-[var(--app-text)]">Import Teachers</h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          مساحة مخصصة لاستيراد المعلمين من Excel أو نور أو CSV لاحقًا.
        </p>
      </div>

      <div className="rounded-3xl border border-dashed border-[var(--app-border)] bg-[var(--app-card-soft)] p-5 text-center">
        <Download className="mx-auto h-8 w-8 text-[var(--app-teal)]" />
        <p className="mt-3 text-sm font-black text-[var(--app-text)]">جاهز للربط مع مستورد المعلمين</p>
        <p className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]">
          يمكن ربط هذه البطاقة لاحقًا بصفحة استيراد من نور أو ملف Excel.
        </p>
      </div>
    </section>
  );
}

function TeacherAnalyticsMini({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: TeacherSmartInsight["tone"];
}) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${dashboardTokenTone(tone)}`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function TeacherMiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl bg-[var(--app-card-soft)] p-4">
      <h3 className="mb-3 text-sm font-black text-[var(--app-text)]">{title}</h3>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--app-text-muted)]">لا توجد بيانات كافية.</p>
        ) : (
          items.map((item) => (
            <div key={item} className="rounded-2xl bg-[var(--app-card)] px-3 py-2 text-sm font-bold text-[var(--app-text)]">
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TeacherProgressRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: TeacherSmartInsight["tone"];
}) {
  const width = Math.max(4, Math.round((value / total) * 100));

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-[var(--app-text-muted)]">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--app-card-soft)]">
        <div
          className={`h-full rounded-full ${progressBarColor(tone)}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function TeacherDrawerSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="mb-2 text-sm font-black text-[#15445A]">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <p key={item} className="text-xs leading-6 text-slate-500">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

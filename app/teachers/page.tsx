"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExportButton from "@/components/ui/buttons/ExportButton";
import IconButton from "@/components/ui/buttons/IconButton";
import PageLoader from "@/components/ui/loading/PageLoader";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";
import UiEmptyState from "@/components/ui/empty-state/EmptyState";
import RoleGuard from "@/components/auth/RoleGuard";
import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

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
  X,
} from "lucide-react";

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

type Toast = {
  type: "success" | "error";
  message: string;
};

const PAGE_SIZE = 10;

const TEACHERS_PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function isPending(value?: string | null) {
  return (
    !value ||
    value === "بانتظار الموافقة" ||
    value === "بانتظار المراجعة" ||
    value === "pending"
  );
}

export default function TeachersPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

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

  const [fullName, setFullName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [subject, setSubject] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [weeklyLoad, setWeeklyLoad] = useState("");
  const [status, setStatus] = useState("على رأس العمل");
  const [adminNotes, setAdminNotes] = useState("");

  const today = getTodayDate();

  const showToast = useCallback(
    (type: Toast["type"], message: string) => {
      setToast({ type, message });
      window.setTimeout(() => setToast(null), 3500);
    },
    [],
  );

  const fetchAllData = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);

    try {
      const [
        teachersResult,
        scheduleResult,
        waitingResult,
        portfolioResult,
        subjectsResult,
        classesResult,
      ] = await Promise.all([
        supabase
          .from("teachers")
          .select(
            "id, school_id, full_name, employee_number, photo_url, subject, department, phone, email, weekly_load, status, admin_notes, created_at",
          )
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("teacher_schedule")
          .select("id, teacher_id, school_id")
          .eq("school_id", currentSchool.id),

        supabase
          .from("teacher_waiting_periods")
          .select("id, teacher_id, school_id, approval_status")
          .eq("school_id", currentSchool.id),

        supabase
          .from("teacher_portfolio")
          .select("id, teacher_id, school_id, review_status")
          .eq("school_id", currentSchool.id),

        supabase
          .from("teacher_subjects")
          .select("id, teacher_id, school_id")
          .eq("school_id", currentSchool.id),

        supabase
          .from("teacher_classes")
          .select("id, teacher_id, school_id")
          .eq("school_id", currentSchool.id),
      ]);

      if (teachersResult.error) throw teachersResult.error;
      if (scheduleResult.error) throw scheduleResult.error;
      if (waitingResult.error) throw waitingResult.error;
      if (portfolioResult.error) throw portfolioResult.error;

      setTeachers((teachersResult.data as Teacher[]) || []);
      setSchedules((scheduleResult.data as TeacherSchedule[]) || []);
      setWaitingPeriods((waitingResult.data as WaitingPeriod[]) || []);
      setPortfolioItems((portfolioResult.data as PortfolioItem[]) || []);
      setTeacherSubjects(
        subjectsResult.error
          ? []
          : ((subjectsResult.data as TeacherSubject[]) || []),
      );
      setTeacherClasses(
        classesResult.error ? [] : ((classesResult.data as TeacherClass[]) || []),
      );
      setSelectedIds([]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر تحميل بيانات المعلمين";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, showToast]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setTeachers([]);
      setSchedules([]);
      setWaitingPeriods([]);
      setPortfolioItems([]);
      setTeacherSubjects([]);
      setTeacherClasses([]);
      setSelectedIds([]);
      setLoading(false);
      return;
    }

    void fetchAllData();
  }, [currentSchool?.id, fetchAllData, schoolLoading]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [search, departmentFilter, subjectFilter, statusFilter, quickFilter]);

  function resetForm() {
    setEditingId(null);
    setFullName("");
    setEmployeeNumber("");
    setPhotoUrl("");
    setSubject("");
    setDepartment("");
    setPhone("");
    setEmail("");
    setWeeklyLoad("");
    setStatus("على رأس العمل");
    setAdminNotes("");
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
    setFullName(teacher.full_name || "");
    setEmployeeNumber(teacher.employee_number || "");
    setPhotoUrl(teacher.photo_url || "");
    setSubject(teacher.subject || "");
    setDepartment(teacher.department || "");
    setPhone(teacher.phone || "");
    setEmail(teacher.email || "");
    setWeeklyLoad(
      teacher.weekly_load === null || teacher.weekly_load === undefined
        ? ""
        : String(teacher.weekly_load),
    );
    setStatus(teacher.status || "على رأس العمل");
    setAdminNotes(teacher.admin_notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveTeacher() {
    if (!currentSchool?.id) {
      showToast("error", "لا توجد مدرسة مرتبطة بالمستخدم الحالي");
      return;
    }

    if (!fullName.trim()) {
      showToast("error", "يرجى إدخال اسم المعلم");
      return;
    }

    setSaving(true);

    const payload = {
      school_id: currentSchool.id,
      full_name: fullName.trim(),
      employee_number: employeeNumber.trim() || null,
      photo_url: photoUrl.trim() || null,
      subject: subject.trim() || null,
      department: department.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      weekly_load: weeklyLoad.trim() ? Number(weeklyLoad) : null,
      status: status.trim() || "على رأس العمل",
      admin_notes: adminNotes.trim() || null,
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
      editingId ? "تم تعديل بيانات المعلم" : "تم إضافة المعلم",
    );

    resetForm();
    setShowForm(false);
    void fetchAllData();
  }

  async function deleteTeacher(id: string) {
    if (!currentSchool?.id) return;

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

    showToast("success", "تم حذف المعلم");
    void fetchAllData();
  }

  async function deleteSelectedTeachers() {
    if (!currentSchool?.id || selectedIds.length === 0) return;

    const confirmed = window.confirm(`هل تريد حذف ${selectedIds.length} معلم؟`);
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

    showToast("success", "تم حذف المعلمين المحددين");
    setSelectedIds([]);
    setSelectedTeacher(null);
    void fetchAllData();
  }

  async function updateSelectedStatus(newStatus: string) {
    if (!currentSchool?.id || selectedIds.length === 0) return;

    const { error } = await supabase
      .from("teachers")
      .update({ status: newStatus })
      .eq("school_id", currentSchool.id)
      .in("id", selectedIds);

    if (error) {
      showToast("error", error.message);
      return;
    }

    showToast("success", "تم تحديث حالة المعلمين المحددين");
    setSelectedIds([]);
    void fetchAllData();
  }

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        teachers.map((teacher) => teacher.department).filter(Boolean) as string[],
      ),
    );
  }, [teachers]);

  const subjects = useMemo(() => {
    return Array.from(
      new Set(
        teachers.map((teacher) => teacher.subject).filter(Boolean) as string[],
      ),
    );
  }, [teachers]);

  const statuses = useMemo(() => {
    return Array.from(
      new Set(
        teachers.map((teacher) => teacher.status).filter(Boolean) as string[],
      ),
    );
  }, [teachers]);

  function buildTeacherStats(teacher: Teacher): TeacherWithStats {
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
  }

  const teachersWithStats = useMemo(() => {
    return teachers.map(buildTeacherStats);
  }, [
    teachers,
    schedules,
    waitingPeriods,
    portfolioItems,
    teacherSubjects,
    teacherClasses,
  ]);

  const filteredTeachers = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return teachersWithStats.filter((teacher) => {
      const text = `
        ${teacher.full_name || ""}
        ${teacher.employee_number || ""}
        ${teacher.subject || ""}
        ${teacher.department || ""}
        ${teacher.phone || ""}
        ${teacher.email || ""}
        ${teacher.status || ""}
      `.toLowerCase();

      const matchQuick =
        quickFilter === "all" ||
        (quickFilter === "active" &&
          (!teacher.status ||
            teacher.status === "على رأس العمل" ||
            teacher.status === "active")) ||
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

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const activeTeachers = teachers.filter(
    (teacher) =>
      !teacher.status ||
      teacher.status === "على رأس العمل" ||
      teacher.status === "active",
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

  function getExportHeaders(): string[] {
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

  function getExportRows(
    source: TeacherWithStats[] = filteredTeachers,
  ): (string | number | null | undefined)[][] {
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

  async function exportTeachersExcel(
    source: TeacherWithStats[] = filteredTeachers,
  ) {
    await exportTableToExcel({
      title: "تقرير المعلمين",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "قائمة المعلمين مع المواد والفصول والجدول والانتظار والشواهد",
      headers: getExportHeaders(),
      rows: getExportRows(source),
      fileName: `teachers-${today}.xlsx`,
    });

    showToast("success", "تم تصدير المعلمين Excel");
  }

  function exportTeachersPDF(source: TeacherWithStats[] = filteredTeachers) {
    exportTableToPDF({
      title: "تقرير المعلمين",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "قائمة المعلمين مع المواد والفصول والجدول والانتظار والشواهد",
      headers: getExportHeaders(),
      rows: getExportRows(source),
      fileName: `teachers-${today}.pdf`,
    });

    showToast("success", "تم تجهيز PDF للمعلمين");
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

  if (schoolLoading) {
    return (
      <RoleGuard allowedRoles={TEACHERS_PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل بيانات المدرسة..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool) {
    return (
      <RoleGuard allowedRoles={TEACHERS_PAGE_ROLES}>
        <AppShell>
          <ErrorState description="لا توجد مدرسة مرتبطة بالمستخدم الحالي." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={TEACHERS_PAGE_ROLES}>
      <AppShell>
        <div className="space-y-5" dir="rtl">
          {toast && (
            <div className="fixed left-5 top-5 z-50 w-[min(420px,calc(100%-2rem))] print:hidden">
              {toast.type === "success" ? (
                <SuccessBanner description={toast.message} />
              ) : (
                <ErrorState description={toast.message} />
              )}
            </div>
          )}

          <PageHeader
            variant="hero"
            title="إدارة المعلمين"
            description={`${currentSchool.school_name} — إدارة بيانات المعلمين والإسنادات والجداول والانتظار والشواهد.`}
            badge="الإدارة المدرسية"
            icon={<GraduationCap size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "المعلمون" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool.school_name },
              { label: "إجمالي المعلمين", value: teachers.length },
              { label: "على رأس العمل", value: activeTeachers },
              { label: "النصاب الأسبوعي", value: totalWeeklyLoad },
            ]}
            stats={[
              {
                label: "المعلمون",
                value: teachers.length,
                icon: <GraduationCap size={20} aria-hidden="true" />,
                tone: "primary",
              },
              {
                label: "النشطون",
                value: activeTeachers,
                icon: <UserRoundCheck size={20} aria-hidden="true" />,
                tone: "green",
              },
              {
                label: "انتظار معلق",
                value: pendingWaitingTotal,
                icon: <CalendarCheck size={20} aria-hidden="true" />,
                tone: pendingWaitingTotal > 0 ? "gold" : "green",
              },
              {
                label: "شواهد للمراجعة",
                value: pendingPortfolioTotal,
                icon: <Award size={20} aria-hidden="true" />,
                tone: pendingPortfolioTotal > 0 ? "gold" : "green",
              },
            ]}
            actions={
              <>
                <PrimaryButton
                  icon={<Plus size={17} aria-hidden="true" />}
                  onClick={openAddForm}
                >
                  إضافة معلم
                </PrimaryButton>

                <ExportButton
                  icon={<Download size={17} aria-hidden="true" />}
                  onClick={() => void exportTeachersExcel()}
                  disabled={!filteredTeachers.length}
                >
                  Excel
                </ExportButton>

                <ExportButton
                  icon={<FileText size={17} aria-hidden="true" />}
                  onClick={() => exportTeachersPDF()}
                  disabled={!filteredTeachers.length}
                >
                  PDF
                </ExportButton>

                <SecondaryButton
                  icon={<RefreshCcw size={17} aria-hidden="true" />}
                  onClick={() => void fetchAllData()}
                  loading={loading}
                >
                  تحديث
                </SecondaryButton>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <ExecutiveCard
              title="المعلمون"
              value={teachers.length}
              subtitle={`${activeTeachers} على رأس العمل`}
              icon={<GraduationCap size={22} aria-hidden="true" />}
              tone="primary"
              progress={teachers.length ? Math.round((activeTeachers / teachers.length) * 100) : 0}
            />
            <ExecutiveCard
              title="المواد المسندة"
              value={teacherSubjects.length}
              subtitle={`${teacherClasses.length} فصول`}
              icon={<Users size={22} aria-hidden="true" />}
              tone="green"
            />
            <ExecutiveCard
              title="الأقسام"
              value={departments.length}
              subtitle={`${subjects.length} مواد`}
              icon={<BriefcaseBusiness size={22} aria-hidden="true" />}
              tone="gold"
            />
            <ExecutiveCard
              title="الحصص المجدولة"
              value={schedules.length}
              subtitle={`نصاب ${totalWeeklyLoad}`}
              icon={<BookOpenCheck size={22} aria-hidden="true" />}
              tone="primary"
            />
            <ExecutiveCard
              title="حصص الانتظار"
              value={waitingPeriods.length}
              subtitle={`${pendingWaitingTotal} معلقة`}
              icon={<CalendarCheck size={22} aria-hidden="true" />}
              tone={pendingWaitingTotal > 0 ? "gold" : "green"}
            />
            <ExecutiveCard
              title="ملف الشواهد"
              value={portfolioItems.length}
              subtitle={`${pendingPortfolioTotal} للمراجعة`}
              icon={<Award size={22} aria-hidden="true" />}
              tone={pendingPortfolioTotal > 0 ? "gold" : "green"}
            />
          </section>

          <SummaryCard
            title="الملخص التنفيذي للمعلمين"
            description="قراءة سريعة لحالة الكادر التعليمي والإسنادات والجداول والانتظار والشواهد."
            tone={
              pendingWaitingTotal > 0 || pendingPortfolioTotal > 0
                ? "gold"
                : "green"
            }
            items={[
              { label: "إجمالي المعلمين", value: teachers.length },
              { label: "على رأس العمل", value: activeTeachers },
              { label: "المواد المسندة", value: teacherSubjects.length },
              { label: "الفصول المسندة", value: teacherClasses.length },
              { label: "حصص الانتظار", value: waitingPeriods.length },
              { label: "الشواهد", value: portfolioItems.length },
            ]}
            footer="تُحدّث المؤشرات من بيانات المدرسة الحالية دون تغيير منطق الإسناد أو الجدولة."
          />

          {showForm && (
            <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] print:hidden">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {editingId ? (
                    <Pencil className="text-[var(--app-accent)]" aria-hidden="true" />
                  ) : (
                    <Plus className="text-[var(--app-accent)]" aria-hidden="true" />
                  )}

                  <h2 className="text-xl font-black text-[var(--app-text)]">
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
                  value={fullName}
                  onChange={setFullName}
                />
                <Input
                  placeholder="الرقم الوظيفي"
                  value={employeeNumber}
                  onChange={setEmployeeNumber}
                />
                <Input
                  placeholder="رابط صورة المعلم"
                  value={photoUrl}
                  onChange={setPhotoUrl}
                />
                <Input
                  placeholder="المادة الأساسية"
                  value={subject}
                  onChange={setSubject}
                />
                <Input
                  placeholder="القسم"
                  value={department}
                  onChange={setDepartment}
                />
                <Input placeholder="الجوال" value={phone} onChange={setPhone} />
                <Input
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={setEmail}
                />
                <Input
                  placeholder="النصاب الأسبوعي"
                  value={weeklyLoad}
                  onChange={setWeeklyLoad}
                  type="number"
                />

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-2.5 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
                >
                  <option value="على رأس العمل">على رأس العمل</option>
                  <option value="مكلف">مكلف</option>
                  <option value="منتدب">منتدب</option>
                  <option value="إجازة">إجازة</option>
                  <option value="غير نشط">غير نشط</option>
                </select>
              </div>

              <textarea
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
                placeholder="ملاحظات إدارية"
                className="mt-3 min-h-24 w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-2.5 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
              />

              <PrimaryButton
                className="mt-5"
                icon={
                  editingId ? (
                    <Save size={16} aria-hidden="true" />
                  ) : (
                    <Plus size={16} aria-hidden="true" />
                  )
                }
                onClick={() => void saveTeacher()}
                loading={saving}
              >
                {editingId ? "حفظ التعديل" : "إضافة المعلم"}
              </PrimaryButton>
            </section>
          )}

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] xl:col-span-2">
              <div className="mb-5 flex flex-col gap-4 print:hidden">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-[var(--app-text)]">
                      قائمة المعلمين
                    </h2>

                    <p className="mt-1 text-sm text-[var(--app-text-muted)]">
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

                <PageToolbar
                  search={{
                    value: search,
                    onChange: setSearch,
                    placeholder: "ابحث عن معلم...",
                  }}
                  filters={
                    <>
                      <ToolbarSelect
                        value={departmentFilter}
                        onChange={setDepartmentFilter}
                      >
                        <option value="all">كل الأقسام</option>
                        {departments.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </ToolbarSelect>

                      <ToolbarSelect
                        value={subjectFilter}
                        onChange={setSubjectFilter}
                      >
                        <option value="all">كل المواد</option>
                        {subjects.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </ToolbarSelect>

                      <ToolbarSelect
                        value={statusFilter}
                        onChange={setStatusFilter}
                      >
                        <option value="all">كل الحالات</option>
                        {statuses.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </ToolbarSelect>
                    </>
                  }
                  onRefresh={() => void fetchAllData()}
                  onExportExcel={() => void exportTeachersExcel()}
                  onExportPDF={() => exportTeachersPDF()}
                />

                {selectedIds.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--app-radius-lg)] border border-[color-mix(in_srgb,var(--app-accent)_35%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-accent)_14%,transparent)] p-3">
                    <p className="text-sm font-black text-[var(--app-accent-foreground)]">
                      تم تحديد {selectedIds.length} معلم
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <ExportButton
                        size="sm"
                        onClick={() => void exportSelectedExcel()}
                      >
                        Excel المحدد
                      </ExportButton>

                      <ExportButton
                        size="sm"
                        onClick={exportSelectedPDF}
                      >
                        PDF المحدد
                      </ExportButton>

                      <SecondaryButton
                        size="sm"
                        onClick={() =>
                          void updateSelectedStatus("على رأس العمل")
                        }
                      >
                        على رأس العمل
                      </SecondaryButton>

                      <SecondaryButton
                        size="sm"
                        onClick={() => void updateSelectedStatus("إجازة")}
                      >
                        إجازة
                      </SecondaryButton>

                      <SecondaryButton
                        size="sm"
                        onClick={() => void deleteSelectedTeachers()}
                      >
                        حذف المحدد
                      </SecondaryButton>
                    </div>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1150px]">
                  <thead>
                    <tr className="border-b border-[var(--app-border)] bg-[var(--app-card-soft)] text-right text-sm text-[var(--app-text-muted)]">
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
                          className="border-b border-slate-50 text-sm transition hover:bg-[var(--app-card-soft)]"
                        >
                          <td className="px-4 py-3 print:hidden">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(teacher.id)}
                              onChange={() => toggleSelectTeacher(teacher.id)}
                            />
                          </td>

                          <td className="px-4 py-3 font-bold text-[var(--app-text)]">
                            <div className="flex items-center gap-3">
                              <TeacherAvatar teacher={teacher} />

                              <div>
                                <p>{teacher.full_name}</p>
                                <p className="mt-1 text-xs text-[var(--app-text-subtle)]">
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
                              <IconButton
                                label="عرض مختصر"
                                title="عرض مختصر"
                                onClick={() => setSelectedTeacher(teacher)}
                                icon={<Eye size={16} aria-hidden="true" />}
                              />

                              <Link
                                href={`/teachers/${teacher.id}`}
                                className="rounded-[var(--app-radius-md)] bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                                title="فتح ملف المعلم"
                              >
                                <FileText size={16} aria-hidden="true" />
                              </Link>

                              <Link
                                href={`/teachers/${teacher.id}/portfolio`}
                                className="rounded-[var(--app-radius-md)] bg-purple-50 p-2 text-purple-600 hover:bg-purple-100"
                                title="ملف الشواهد"
                              >
                                <Award size={16} aria-hidden="true" />
                              </Link>

                              <IconButton
                                label="تعديل المعلم"
                                title="تعديل"
                                onClick={() => startEdit(teacher)}
                                icon={<Pencil size={16} aria-hidden="true" />}
                              />

                              <IconButton
                                label="حذف المعلم"
                                title="حذف"
                                onClick={() => void deleteTeacher(teacher.id)}
                                icon={<Trash2 size={16} aria-hidden="true" />}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {loading && (
                  <PageLoader text="جاري تحميل المعلمين..." />
                )}

                {!loading && filteredTeachers.length === 0 && (
                  <div className="p-6">
                    <UiEmptyState
                      icon={<GraduationCap className="h-8 w-8" aria-hidden="true" />}
                      title="لا يوجد معلمون"
                      description="غيّر البحث أو الفلاتر، أو أضف معلمًا جديدًا."
                    />
                  </div>
                )}
              </div>

              {!loading && filteredTeachers.length > 0 && (
                <div className="mt-5 flex items-center justify-between">
                  <p className="text-sm text-[var(--app-text-muted)]">
                    عرض {pagedTeachers.length} من {filteredTeachers.length}
                  </p>

                  <div className="flex items-center gap-2">
                    <IconButton
                      label="الصفحة السابقة"
                      title="السابق"
                      onClick={() =>
                        setPage((value) => Math.max(1, value - 1))
                      }
                      disabled={page === 1}
                      icon={<ChevronRight size={18} aria-hidden="true" />}
                    />

                    <span className="text-sm font-bold text-[var(--app-text)]">
                      {page} / {totalPages}
                    </span>

                    <IconButton
                      label="الصفحة التالية"
                      title="التالي"
                      onClick={() =>
                        setPage((value) => Math.min(totalPages, value + 1))
                      }
                      disabled={page === totalPages}
                      icon={<ChevronLeft size={18} aria-hidden="true" />}
                    />
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
      </AppShell>
    </RoleGuard>
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
    <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      {selectedTeacher ? (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-black text-[var(--app-text)]">
              الملف المختصر
            </h2>

            <IconButton
              label="إغلاق الملف المختصر"
              title="إغلاق"
              onClick={() => setSelectedTeacher(null)}
              icon={<X size={18} aria-hidden="true" />}
            />
          </div>

          <div className="rounded-[var(--app-radius-xl)] bg-[var(--app-primary)] p-5 text-white">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[var(--app-radius-lg)] bg-[var(--app-accent)] text-[var(--app-text)]">
                {selectedTeacher.photo_url ? (
                  <Image
                    src={selectedTeacher.photo_url}
                    alt={selectedTeacher.full_name}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <UserRoundCheck size={28} aria-hidden="true" />
                )}
              </div>

              <div>
                <h3 className="text-2xl font-black text-[var(--app-accent)]">
                  {selectedTeacher.full_name}
                </h3>

                <p className="text-sm text-[var(--app-primary-foreground)]/70">
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
              icon={<BookOpenCheck size={18} aria-hidden="true" />}
              color="blue"
            />
            <DetailStat
              title="فصول مسندة"
              value={selectedTeacher.assignedClassesCount}
              icon={<Users size={18} aria-hidden="true" />}
              color="blue"
            />
            <DetailStat
              title="الجدول"
              value={selectedTeacher.scheduleCount}
              icon={<BookOpenCheck size={18} aria-hidden="true" />}
              color="blue"
            />
            <DetailStat
              title="الانتظار"
              value={selectedTeacher.waitingCount}
              icon={<CalendarCheck size={18} aria-hidden="true" />}
              color="amber"
            />
            <DetailStat
              title="انتظار معلق"
              value={selectedTeacher.pendingWaiting}
              icon={<ClipboardCheck size={18} aria-hidden="true" />}
              color="red"
            />
            <DetailStat
              title="الشواهد"
              value={selectedTeacher.portfolioCount}
              icon={<Award size={18} aria-hidden="true" />}
              color="green"
            />
          </div>

          <div className="mt-5 grid gap-2">
            <Link
              href={`/teachers/${selectedTeacher.id}`}
              className="flex items-center justify-center gap-2 rounded-[var(--app-radius-lg)] bg-[var(--app-accent)] px-5 py-3 text-sm font-black text-[var(--app-text)]"
            >
              <FileText size={17} aria-hidden="true" />
              فتح ملف المعلم
            </Link>

            <Link
              href={`/teachers/${selectedTeacher.id}/portfolio`}
              className="flex items-center justify-center gap-2 rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] px-5 py-3 text-sm font-black text-white"
            >
              <Award size={17} aria-hidden="true" />
              ملف الشواهد
            </Link>
          </div>
        </div>
      ) : (
        <UiEmptyState
          icon={<GraduationCap className="h-9 w-9" aria-hidden="true" />}
          title="اختر معلمًا"
          description="اضغط على زر العرض بجانب المعلم لمشاهدة الملف المختصر."
        />
      )}
    </div>
  );
}

function TeacherAvatar({ teacher }: { teacher: Teacher }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[var(--app-radius-lg)] bg-[var(--app-primary)]/10 text-[var(--app-text)]">
      {teacher.photo_url ? (
        <Image
          src={teacher.photo_url}
          alt={teacher.full_name}
          width={44}
          height={44}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <UserRoundCheck size={22} aria-hidden="true" />
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
      onClick={() => onClick(value)}
      className={`rounded-[var(--app-radius-lg)] px-4 py-2 text-sm font-black ${
        isActive ? "bg-[var(--app-primary)] text-[var(--app-primary-foreground)]" : "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]"
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const value = status || "على رأس العمل";

  const style =
    value === "على رأس العمل" || value === "active"
      ? "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]"
      : value === "غير نشط"
        ? "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]"
        : "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>
      {value}
    </span>
  );
}

function SmallBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[var(--app-card-soft)] px-3 py-1 text-xs font-black text-[var(--app-text-muted)]">
      {label}
    </span>
  );
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
    blue: "bg-blue-50 text-blue-700",
    red: "bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)]",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className={`rounded-[var(--app-radius-lg)] p-4 ${colors[color]}`}>
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
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card)]/10 p-3">
      <p className="text-xs text-[var(--app-primary-foreground)]/70">{title}</p>
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
      className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-2.5 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
    />
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-3 rounded-[var(--app-radius-lg)] px-5 py-3 text-sm font-bold text-white shadow-xl print:hidden ${
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

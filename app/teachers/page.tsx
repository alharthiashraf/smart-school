"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

import AppShell from "@/components/layout/AppShell";
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

  useEffect(() => {
    if (currentSchool?.id) void fetchAllData();
  }, [currentSchool?.id]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [search, departmentFilter, subjectFilter, statusFilter, quickFilter]);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function fetchAllData() {
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
  }

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

  function getExportRows(source: TeacherWithStats[] = filteredTeachers) {
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
          <LoadingBox text="جاري تحميل بيانات المدرسة..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool) {
    return (
      <RoleGuard allowedRoles={TEACHERS_PAGE_ROLES}>
        <AppShell>
          <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center font-bold text-red-700">
            لا توجد مدرسة مرتبطة بالمستخدم الحالي.
          </div>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={TEACHERS_PAGE_ROLES}>
      <AppShell>
        <div className="space-y-5" dir="rtl">
          {toast && <ToastBox toast={toast} />}

          <section className="rounded-[28px] bg-gradient-to-l from-[#0f1f3d] via-[#18315f] to-[#24477f] p-5 text-white shadow-sm print:hidden">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <p className="mb-2 text-sm font-bold text-[#d4af37]">
                  منصة المدرسة الذكية
                </p>

                <h1 className="text-3xl font-black md:text-4xl">
                  إدارة المعلمين
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                  {currentSchool.school_name} — بيانات المعلمين، الجدول
                  الأسبوعي للعرض داخل ملف المعلم، حصص الانتظار المسندة من
                  الوكيل، وملف الشواهد.
                </p>
              </div>

              <div className="flex shrink-0 flex-row flex-nowrap items-center gap-2">
                <button
                  onClick={openAddForm}
                  className="flex h-12 items-center gap-2 rounded-2xl bg-[#d4af37] px-4 text-sm font-black text-[#0f1f3d]"
                >
                  <Plus size={16} />
                  إضافة
                </button>

                <button
                  onClick={() => void exportTeachersExcel()}
                  className="flex h-12 items-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black text-white hover:bg-white/20"
                >
                  Excel
                  <Download size={16} />
                </button>

                <button
                  onClick={() => exportTeachersPDF()}
                  className="flex h-12 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#0f1f3d]"
                >
                  PDF
                  <FileText size={16} />
                </button>

                <button
                  onClick={() => void fetchAllData()}
                  disabled={loading}
                  className="flex h-12 items-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black text-white disabled:opacity-60"
                >
                  تحديث
                  <RefreshCcw
                    size={16}
                    className={loading ? "animate-spin" : ""}
                  />
                </button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-6">
            <MergedCard title="المعلمون" icon={<GraduationCap size={22} />}>
              <MiniRow label="الإجمالي" value={teachers.length} />
              <MiniRow
                label="على رأس العمل"
                value={activeTeachers}
                color="green"
              />
            </MergedCard>

            <MergedCard title="الإسناد" icon={<Users size={22} />}>
              <MiniRow label="مواد مسندة" value={teacherSubjects.length} />
              <MiniRow
                label="فصول مسندة"
                value={teacherClasses.length}
                color="blue"
              />
            </MergedCard>

            <MergedCard title="الأقسام" icon={<BriefcaseBusiness size={22} />}>
              <MiniRow label="عدد الأقسام" value={departments.length} />
              <MiniRow label="عدد المواد" value={subjects.length} />
            </MergedCard>

            <MergedCard title="الجدول" icon={<BookOpenCheck size={22} />}>
              <MiniRow label="حصص مجدولة" value={schedules.length} />
              <MiniRow
                label="نصاب أسبوعي"
                value={totalWeeklyLoad}
                color="blue"
              />
            </MergedCard>

            <MergedCard title="حصص الانتظار" icon={<CalendarCheck size={22} />}>
              <MiniRow label="الإجمالي" value={waitingPeriods.length} />
              <MiniRow
                label="بانتظار الموافقة"
                value={pendingWaitingTotal}
                color="amber"
              />
            </MergedCard>

            <MergedCard title="ملف الشواهد" icon={<Award size={22} />}>
              <MiniRow label="الشواهد" value={portfolioItems.length} />
              <MiniRow
                label="قيد المراجعة"
                value={pendingPortfolioTotal}
                color="amber"
              />
            </MergedCard>
          </section>

          {showForm && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {editingId ? (
                    <Pencil className="text-[#d4af37]" />
                  ) : (
                    <Plus className="text-[#d4af37]" />
                  )}

                  <h2 className="text-xl font-black text-[#0f1f3d]">
                    {editingId ? "تعديل بيانات المعلم" : "إضافة معلم جديد"}
                  </h2>
                </div>

                <button
                  onClick={closeForm}
                  className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold"
                >
                  إغلاق
                </button>
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
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
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
                className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
              />

              <button
                onClick={() => void saveTeacher()}
                disabled={saving}
                className="mt-5 flex items-center gap-2 rounded-2xl bg-[#0f1f3d] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {editingId ? <Save size={16} /> : <Plus size={16} />}
                {saving
                  ? "جاري الحفظ..."
                  : editingId
                    ? "حفظ التعديل"
                    : "إضافة المعلم"}
              </button>
            </section>
          )}

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-5 flex flex-col gap-4 print:hidden">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-[#0f1f3d]">
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
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
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
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
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
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
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
                      className="w-full rounded-2xl border border-slate-200 py-3 pr-10 pl-4 outline-none focus:border-[#d4af37]"
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
                        onClick={() => void exportSelectedExcel()}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700"
                      >
                        Excel المحدد
                      </button>

                      <button
                        onClick={exportSelectedPDF}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700"
                      >
                        PDF المحدد
                      </button>

                      <button
                        onClick={() =>
                          void updateSelectedStatus("على رأس العمل")
                        }
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white"
                      >
                        جعلهم على رأس العمل
                      </button>

                      <button
                        onClick={() => void updateSelectedStatus("إجازة")}
                        className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white"
                      >
                        جعلهم إجازة
                      </button>

                      <button
                        onClick={() => void deleteSelectedTeachers()}
                        className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white"
                      >
                        حذف المحدد
                      </button>
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

                          <td className="px-4 py-3 font-bold text-[#0f1f3d]">
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
                                className="rounded-xl bg-purple-50 p-2 text-purple-600 hover:bg-purple-100"
                                title="ملف الشواهد"
                              >
                                <Award size={16} />
                              </Link>

                              <button
                                onClick={() => startEdit(teacher)}
                                className="rounded-xl bg-sky-50 p-2 text-sky-600 hover:bg-sky-100"
                                title="تعديل"
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                onClick={() => void deleteTeacher(teacher.id)}
                                className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                title="حذف"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {loading && (
                  <div className="py-10 text-center text-slate-500">
                    جاري تحميل المعلمين...
                  </div>
                )}

                {!loading && filteredTeachers.length === 0 && (
                  <div className="py-10 text-center text-slate-500">
                    لا يوجد معلمون مطابقون للبحث
                  </div>
                )}
              </div>

              {!loading && filteredTeachers.length > 0 && (
                <div className="mt-5 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    عرض {pagedTeachers.length} من {filteredTeachers.length}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      {selectedTeacher ? (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#0f1f3d]">
              الملف المختصر
            </h2>

            <button
              onClick={() => setSelectedTeacher(null)}
              className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
            >
              <X size={18} />
            </button>
          </div>

          <div className="rounded-3xl bg-[#0f1f3d] p-5 text-white">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#d4af37] text-[#0f1f3d]">
                {selectedTeacher.photo_url ? (
                  <Image
                    src={selectedTeacher.photo_url}
                    alt={selectedTeacher.full_name}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRoundCheck size={28} />
                )}
              </div>

              <div>
                <h3 className="text-2xl font-black text-[#d4af37]">
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

          <div className="mt-5 grid gap-2">
            <Link
              href={`/teachers/${selectedTeacher.id}`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#d4af37] px-5 py-3 text-sm font-black text-[#0f1f3d]"
            >
              <FileText size={17} />
              فتح ملف المعلم
            </Link>

            <Link
              href={`/teachers/${selectedTeacher.id}/portfolio`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#0f1f3d] px-5 py-3 text-sm font-black text-white"
            >
              <Award size={17} />
              ملف الشواهد
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[350px] items-center justify-center rounded-3xl bg-slate-50 text-center">
          <div>
            <GraduationCap size={42} className="mx-auto text-[#d4af37]" />
            <h3 className="mt-4 text-xl font-black text-[#0f1f3d]">
              اختر معلماً
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              اضغط على أيقونة العين لعرض الملف المختصر
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherAvatar({ teacher }: { teacher: Teacher }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#0f1f3d]/10 text-[#0f1f3d]">
      {teacher.photo_url ? (
        <Image
          src={teacher.photo_url}
          alt={teacher.full_name}
          width={44}
          height={44}
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
      onClick={() => onClick(value)}
      className={`rounded-2xl px-4 py-2 text-sm font-black ${
        isActive ? "bg-[#0f1f3d] text-white" : "bg-slate-100 text-slate-600"
      }`}
    >
      {label}
    </button>
  );
}

function MergedCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-black text-[#0f1f3d]">{title}</h2>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f1f3d]/10 text-[#0f1f3d]">
          {icon}
        </div>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function MiniRow({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string | number;
  color?: "default" | "green" | "red" | "amber" | "blue";
}) {
  const colors = {
    default: "text-[#0f1f3d]",
    green: "text-emerald-700",
    red: "text-red-700",
    amber: "text-amber-700",
    blue: "text-blue-700",
  };

  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className={`text-lg font-black ${colors[color]}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const value = status || "على رأس العمل";

  const style =
    value === "على رأس العمل" || value === "active"
      ? "bg-emerald-50 text-emerald-700"
      : value === "غير نشط"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>
      {value}
    </span>
  );
}

function SmallBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
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
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
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
      className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
    />
  );
}

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 text-center text-slate-500 shadow-sm">
      <RefreshCcw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#0f1f3d]" />
      {text}
    </div>
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
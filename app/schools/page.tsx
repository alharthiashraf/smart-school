"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileText,
  MapPin,
  Plus,
  Power,
  Printer,
  RefreshCcw,
  Save,
  School,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

import { useSchool } from "@/contexts/SchoolContext";
import {
  SchoolsService,
  type SchoolFormInput,
  type SchoolRow,
} from "@/services/schools.service";
import { ExportEngine } from "@/core";
import { formatDate } from "@/lib/utils/dates";
import type { SchoolRole } from "@/lib/permissions";

type SchoolStatus = "نشطة" | "غير نشطة";

type SchoolView = Record<string, unknown> & {
  id: string;
  school_name: string;
  school_code: string;
  city: string;
  district: string;
  educational_stage: string;
  semester_system: string;
  status: SchoolStatus;
  created_at: string;
  raw: SchoolRow;
};

type FormState = {
  school_name: string;
  school_code: string;
  city: string;
  district: string;
  educational_stage: string;
  semester_system: string;
  logo_url: string;
  is_active: boolean;
};

const EMPTY_TEXT = "غير متوفر";

const PAGE_ROLES: SchoolRole[] = ["super_admin", "school_admin"];

const emptyForm: FormState = {
  school_name: "",
  school_code: "",
  city: "",
  district: "",
  educational_stage: "",
  semester_system: "2",
  logo_url: "",
  is_active: true,
};

const ROLE_LABELS: Partial<Record<SchoolRole, string>> = {
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

function normalizeSemesterSystem(value: string | number | null | undefined) {
  const normalized = String(value ?? "").trim();

  if (normalized === "3") return "ثلاثة فصول";
  if (normalized === "2") return "فصلان دراسيان";

  return normalized || EMPTY_TEXT;
}

function toSchoolView(school: SchoolRow): SchoolView {
  return {
    id: school.id,
    school_name: school.school_name ?? EMPTY_TEXT,
    school_code: school.school_code ?? EMPTY_TEXT,
    city: school.city ?? EMPTY_TEXT,
    district: school.district ?? EMPTY_TEXT,
    educational_stage: school.educational_stage ?? EMPTY_TEXT,
    semester_system: normalizeSemesterSystem(school.semester_system),
    status: school.is_active === false ? "غير نشطة" : "نشطة",
    created_at: formatDate(school.created_at),
    raw: school,
  };
}

function toInput(form: FormState): SchoolFormInput {
  return {
    school_name: form.school_name.trim(),
    school_code: form.school_code.trim() || null,
    city: form.city.trim() || null,
    district: form.district.trim() || null,
    educational_stage: form.educational_stage.trim() || null,
    semester_system: form.semester_system || "2",
    logo_url: form.logo_url.trim() || null,
    is_active: form.is_active,
  };
}

function roleLabel(role?: SchoolRole | null) {
  if (!role) return "غير محدد";
  return ROLE_LABELS[role] ?? role;
}

function isEmptyValue(value: string) {
  return !value || value === EMPTY_TEXT;
}

function matchesText(row: SchoolView, text: string) {
  if (!text) return true;

  const target = [
    row.school_name,
    row.school_code,
    row.city,
    row.district,
    row.educational_stage,
    row.semester_system,
    row.status,
  ]
    .join(" ")
    .toLowerCase();

  return target.includes(text.toLowerCase());
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values))
    .filter((value) => !isEmptyValue(value))
    .sort((a, b) => a.localeCompare(b, "ar"));
}

export default function SchoolsPage() {
  const schoolContext = useSchool() as any;

  const currentSchool = schoolContext?.currentSchool || schoolContext?.school || null;
  const currentRole = schoolContext?.currentRole || currentSchool?.role || null;
  const refreshSchools = schoolContext?.refreshSchools || schoolContext?.refresh || (() => Promise.resolve());
  const hasPermission =
    schoolContext?.hasPermission ||
    ((permission: string) => currentRole === "super_admin" || currentRole === "school_admin");

  const canManage = Boolean(hasPermission("schools.manage") || currentRole === "super_admin");

  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const loadSchools = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await SchoolsService.list();
      setSchools(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "حدث خطأ غير معروف";
      setErrorMessage(`تعذر تحميل المدارس: ${message}`);
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  const rows = useMemo(() => schools.map(toSchoolView), [schools]);

  const stageOptions = useMemo(
    () => uniqueValues(rows.map((row) => row.educational_stage)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const text = search.trim();

    return rows.filter((row) => {
      const matchesSearch = matchesText(row, text);
      const matchesStage = stageFilter === "all" || row.educational_stage === stageFilter;
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;

      return matchesSearch && matchesStage && matchesStatus;
    });
  }, [rows, search, stageFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.status === "نشطة").length;
    const inactive = rows.filter((row) => row.status === "غير نشطة").length;
    const cities = new Set(rows.map((row) => row.city).filter((city) => !isEmptyValue(city))).size;

    return {
      total: rows.length,
      filtered: filteredRows.length,
      active,
      inactive,
      cities,
    };
  }, [rows, filteredRows]);

  function openCreateForm() {
    setEditingSchool(null);
    setForm(emptyForm);
    setFormOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEditForm(row: SchoolView) {
    const school = row.raw;

    setEditingSchool(school);
    setForm({
      school_name: school.school_name ?? "",
      school_code: school.school_code ?? "",
      city: school.city ?? "",
      district: school.district ?? "",
      educational_stage: school.educational_stage ?? "",
      semester_system: String(school.semester_system ?? "2"),
      logo_url: school.logo_url ?? "",
      is_active: school.is_active !== false,
    });
    setFormOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeForm() {
    setFormOpen(false);
    setEditingSchool(null);
    setForm(emptyForm);
  }

  async function submitForm() {
    if (!canManage) {
      setErrorMessage("لا تملك صلاحية إدارة المدارس.");
      return;
    }

    if (!form.school_name.trim()) {
      setErrorMessage("اسم المدرسة مطلوب.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (editingSchool) {
        await SchoolsService.update(editingSchool.id, toInput(form));
        setSuccessMessage("تم تحديث بيانات المدرسة بنجاح.");
      } else {
        await SchoolsService.create(toInput(form));
        setSuccessMessage("تم إنشاء المدرسة بنجاح.");
      }

      closeForm();
      await loadSchools();
      await refreshSchools();
    } catch (error) {
      const message = error instanceof Error ? error.message : "حدث خطأ غير معروف";
      setErrorMessage(`تعذر حفظ المدرسة: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: SchoolView) {
    if (!canManage) return;

    const nextStatus = row.status !== "نشطة";
    const confirmed = window.confirm(
      nextStatus ? "هل تريد تفعيل هذه المدرسة؟" : "هل تريد تعطيل هذه المدرسة؟",
    );

    if (!confirmed) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await SchoolsService.setActive(row.id, nextStatus);
      setSuccessMessage(nextStatus ? "تم تفعيل المدرسة." : "تم تعطيل المدرسة.");
      await loadSchools();
      await refreshSchools();
    } catch (error) {
      const message = error instanceof Error ? error.message : "حدث خطأ غير معروف";
      setErrorMessage(`تعذر تغيير حالة المدرسة: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function removeSchool(row: SchoolView) {
    if (!canManage) return;

    const confirmed = window.confirm(
      `سيتم حذف المدرسة "${row.school_name}" نهائيًا. هل أنت متأكد؟`,
    );

    if (!confirmed) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await SchoolsService.remove(row.id);
      setSuccessMessage("تم حذف المدرسة بنجاح.");
      await loadSchools();
      await refreshSchools();
    } catch (error) {
      const message = error instanceof Error ? error.message : "حدث خطأ غير معروف";
      setErrorMessage(`تعذر حذف المدرسة: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  function exportExcel() {
    ExportEngine.excel("قائمة-المدارس", filteredRows, [
      { header: "اسم المدرسة", key: "school_name" },
      { header: "كود المدرسة", key: "school_code" },
      { header: "المدينة", key: "city" },
      { header: "الحي", key: "district" },
      { header: "المرحلة", key: "educational_stage" },
      { header: "النظام الدراسي", key: "semester_system" },
      { header: "الحالة", key: "status" },
      { header: "تاريخ الإضافة", key: "created_at" },
    ]);
  }

  function exportPDF() {
    ExportEngine.pdf("قائمة المدارس", filteredRows, [
      { header: "اسم المدرسة", key: "school_name" },
      { header: "كود المدرسة", key: "school_code" },
      { header: "المدينة", key: "city" },
      { header: "المرحلة", key: "educational_stage" },
      { header: "النظام الدراسي", key: "semester_system" },
      { header: "الحالة", key: "status" },
    ]);
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main dir="rtl" className="space-y-5">
          <PageHeader
            variant="hero"
            title="المدارس"
            description="إدارة المدارس وربطها بالمراحل والفصول والصلاحيات داخل منصة المدرسة الذكية."
            badge={currentRole === "super_admin" ? "سوبر أدمن" : "إدارة المدرسة"}
            icon={<School size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "المدارس" },
            ]}
            meta={[
              { label: "المدرسة الحالية", value: currentSchool?.school_name || "غير محدد" },
              { label: "الدور", value: roleLabel(currentRole) },
              { label: "نظام الفصول", value: normalizeSemesterSystem(currentSchool?.semester_system) },
              { label: "النتائج المعروضة", value: filteredRows.length },
            ]}
            stats={[
              { label: "إجمالي المدارس", value: stats.total, icon: <Building2 size={20} />, tone: "blue" },
              { label: "نشطة", value: stats.active, icon: <CheckCircle2 size={20} />, tone: "green" },
              { label: "غير نشطة", value: stats.inactive, icon: <XCircle size={20} />, tone: stats.inactive > 0 ? "red" : "green" },
              { label: "المدن", value: stats.cities, icon: <MapPin size={20} />, tone: "teal" },
            ]}
            actions={
              <>
                {canManage && (
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Plus size={17} />
                    إضافة مدرسة
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void loadSchools()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>

                <button
                  type="button"
                  onClick={exportPDF}
                  disabled={!filteredRows.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <Printer size={17} />
                  PDF
                </button>

                <button
                  type="button"
                  onClick={exportExcel}
                  disabled={!filteredRows.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <Download size={17} />
                  Excel
                </button>
              </>
            }
          />

          {currentSchool && (
            <section className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-[28px] border border-[#0DA9A6]/20 bg-[#0DA9A6]/5 p-5 lg:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#15445A] text-white">
                    <ShieldCheck className="h-6 w-6" />
                  </div>

                  <div>
                    <div className="text-xs font-black text-slate-400">تعمل الآن على</div>
                    <div className="mt-1 text-lg font-black text-[#15445A]">
                      {currentSchool.school_name}
                    </div>
                  </div>
                </div>
              </div>

              <InfoCard title="الدور" value={roleLabel(currentRole)} />
              <InfoCard title="نظام الفصول" value={normalizeSemesterSystem(currentSchool.semester_system)} />
            </section>
          )}

          {errorMessage && (
            <AlertBox type="error" title="حدث خطأ" description={errorMessage} />
          )}

          {successMessage && (
            <AlertBox type="success" title="تمت العملية" description={successMessage} />
          )}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <ExecutiveCard title="إجمالي المدارس" value={stats.total} icon={<Building2 size={22} />} tone="blue" subtitle="كل المدارس" progress={stats.total > 0 ? 100 : 0} />
            <ExecutiveCard title="نتائج البحث" value={stats.filtered} icon={<FileText size={22} />} tone="slate" subtitle="بعد الفلترة" progress={stats.total ? Math.round((stats.filtered / stats.total) * 100) : 0} />
            <ExecutiveCard title="مدارس نشطة" value={stats.active} icon={<CheckCircle2 size={22} />} tone="green" subtitle="مفعّلة" progress={stats.total ? Math.round((stats.active / stats.total) * 100) : 0} />
            <ExecutiveCard title="غير نشطة" value={stats.inactive} icon={<XCircle size={22} />} tone={stats.inactive > 0 ? "red" : "green"} subtitle="معطلة" progress={stats.total ? Math.round((stats.inactive / stats.total) * 100) : 0} />
            <ExecutiveCard title="المدن" value={stats.cities} icon={<MapPin size={22} />} tone="teal" subtitle="نطاق جغرافي" progress={stats.cities > 0 ? 100 : 0} />
          </section>

          <SummaryCard
            title="ملخص إدارة المدارس"
            description="قراءة سريعة لحالة المدارس المسجلة وإعداداتها الأساسية."
            tone={stats.inactive > 0 ? "gold" : "green"}
            items={[
              { label: "الإجمالي", value: stats.total },
              { label: "المعروض", value: stats.filtered },
              { label: "نشطة", value: stats.active },
              { label: "غير نشطة", value: stats.inactive },
              { label: "المدن", value: stats.cities },
              { label: "صلاحية الإدارة", value: canManage ? "متاحة" : "عرض فقط" },
            ]}
            footer="هذه الصفحة مخصصة لإدارة المدارس في البنية متعددة المدارس."
          />

          {formOpen && (
            <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-[#15445A]">
                    {editingSchool ? "تعديل مدرسة" : "إضافة مدرسة"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    أدخل البيانات الأساسية للمدرسة ونظام الفصول الدراسي.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  إغلاق
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="اسم المدرسة *" value={form.school_name} onChange={(value) => setForm((previous) => ({ ...previous, school_name: value }))} placeholder="مثال: مدرسة الملك عبدالعزيز الثانوية" />
                <TextField label="كود المدرسة" value={form.school_code} onChange={(value) => setForm((previous) => ({ ...previous, school_code: value }))} placeholder="اختياري" />
                <TextField label="المدينة" value={form.city} onChange={(value) => setForm((previous) => ({ ...previous, city: value }))} placeholder="مثال: الرياض" />
                <TextField label="الحي" value={form.district} onChange={(value) => setForm((previous) => ({ ...previous, district: value }))} placeholder="اختياري" />
                <TextField label="المرحلة التعليمية" value={form.educational_stage} onChange={(value) => setForm((previous) => ({ ...previous, educational_stage: value }))} placeholder="ابتدائي / متوسط / ثانوي" />

                <div>
                  <label className="mb-2 block text-xs font-black text-slate-500">نظام الفصول</label>
                  <select
                    value={form.semester_system}
                    onChange={(event) => setForm((previous) => ({ ...previous, semester_system: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#15445A] outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  >
                    <option value="2">فصلان دراسيان</option>
                    <option value="3">ثلاثة فصول</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <TextField label="رابط شعار المدرسة" value={form.logo_url} onChange={(value) => setForm((previous) => ({ ...previous, logo_url: value }))} placeholder="اختياري" />
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => setForm((previous) => ({ ...previous, is_active: event.target.checked }))}
                    className="h-4 w-4 accent-[#0DA9A6]"
                  />
                  المدرسة نشطة
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void submitForm()}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <X className="h-4 w-4" />
                  إلغاء
                </button>
              </div>
            </section>
          )}

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث باسم المدرسة أو الكود أو المدينة أو المرحلة...",
              }}
              filters={
                <>
                  <ToolbarSelect value={stageFilter} onChange={setStageFilter}>
                    <option value="all">كل المراحل</option>
                    {stageOptions.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={statusFilter} onChange={setStatusFilter}>
                    <option value="all">كل الحالات</option>
                    <option value="نشطة">نشطة</option>
                    <option value="غير نشطة">غير نشطة</option>
                  </ToolbarSelect>
                </>
              }
              onRefresh={() => void loadSchools()}
              onExportPDF={exportPDF}
              onExportExcel={exportExcel}
            />
          </section>

          {loading ? (
            <LoadingBox />
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title="لا توجد مدارس"
              description="لا توجد مدارس مطابقة للبحث أو التصفية الحالية."
              action={
                canManage ? (
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة مدرسة
                  </button>
                ) : undefined
              }
            />
          ) : (
            <section className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#15445A]">قائمة المدارس</h2>
                  <p className="text-sm text-slate-500">عدد النتائج: {filteredRows.length}</p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
                  التصدير حسب النتائج المعروضة
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-right text-sm">
                  <thead className="bg-[#15445A] text-white">
                    <tr>
                      <th className="px-4 py-3 font-bold">المدرسة</th>
                      <th className="px-4 py-3 font-bold">الموقع</th>
                      <th className="px-4 py-3 font-bold">المرحلة</th>
                      <th className="px-4 py-3 font-bold">النظام الدراسي</th>
                      <th className="px-4 py-3 font-bold">الحالة</th>
                      <th className="px-4 py-3 font-bold">تاريخ الإضافة</th>
                      <th className="px-4 py-3 font-bold">إجراء</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <div className="font-black text-[#15445A]">{row.school_name}</div>
                          <div className="mt-1 text-xs font-bold text-slate-400">الكود: {row.school_code}</div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-700">{row.city}</div>
                          <div className="mt-1 text-xs text-slate-400">{row.district}</div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">{row.educational_stage}</td>
                        <td className="px-4 py-3 text-slate-700">{row.semester_system}</td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${row.status === "نشطة" ? "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]" : "border-red-200 bg-red-50 text-red-700"}`}>
                            {row.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-700">{row.created_at}</td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={`/schools/${row.id}`}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#15445A] transition hover:bg-slate-50"
                            >
                              <Eye className="h-4 w-4" />
                              عرض
                            </a>

                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditForm(row)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-[#3D7EB9]/20 bg-[#3D7EB9]/10 px-3 py-2 text-xs font-bold text-[#3D7EB9] transition hover:bg-[#3D7EB9]/15"
                                >
                                  <Edit3 className="h-4 w-4" />
                                  تعديل
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void toggleActive(row)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-[#C1B489]/30 bg-[#C1B489]/20 px-3 py-2 text-xs font-bold text-[#15445A] transition hover:bg-[#C1B489]/30"
                                >
                                  <Power className="h-4 w-4" />
                                  {row.status === "نشطة" ? "تعطيل" : "تفعيل"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void removeSchool(row)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  حذف
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="text-xs font-black text-slate-400">{title}</div>
      <div className="mt-2 text-sm font-black text-slate-700">{value}</div>
    </div>
  );
}

function AlertBox({
  type,
  title,
  description,
}: {
  type: "success" | "error";
  title: string;
  description: string;
}) {
  const isSuccess = type === "success";

  return (
    <div className={`rounded-[28px] border p-4 text-sm leading-7 ${isSuccess ? "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]" : "border-red-100 bg-red-50 text-red-700"}`}>
      <p className="font-black">{title}</p>
      <p className="font-bold">{description}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black text-slate-500">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#15445A] outline-none transition focus:border-[#0DA9A6] focus:bg-white"
        placeholder={placeholder}
      />
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-slate-100 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          <School className="h-9 w-9" />
        </div>

        <h2 className="mt-4 text-xl font-black text-[#15445A]">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
        {action}
      </div>
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-slate-100 bg-white">
      <div className="flex flex-col items-center gap-3 text-slate-600">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#0DA9A6]/20 border-t-[#0DA9A6]" />
        <p className="text-sm font-bold">جاري تحميل المدارس...</p>
      </div>
    </div>
  );
}

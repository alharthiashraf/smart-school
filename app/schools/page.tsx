"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
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
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageContainer from "@/components/layout/PageContainer";
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
  const {
    currentSchool,
    currentRole,
    refreshSchools,
    hasPermission,
  } = useSchool();

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

      setFormOpen(false);
      setEditingSchool(null);
      setForm(emptyForm);
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
        <PageContainer size="wide" className="space-y-5">
          <Breadcrumb />
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
              { label: "المدن", value: stats.cities, icon: <MapPin size={20} />, tone: "primary" },
            ]}
            actions={
              <>
                {canManage && (
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--app-primary)] px-4 text-sm font-black text-[var(--app-primary-foreground)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Plus size={17} />
                    إضافة مدرسة
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void loadSchools()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-4 text-sm font-black text-[var(--app-primary)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>

                <button
                  type="button"
                  onClick={exportPDF}
                  disabled={!filteredRows.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-4 text-sm font-black text-[var(--app-primary)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <Printer size={17} />
                  PDF
                </button>

                <button
                  type="button"
                  onClick={exportExcel}
                  disabled={!filteredRows.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--app-primary)] px-4 text-sm font-black text-[var(--app-primary-foreground)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <Download size={17} />
                  Excel
                </button>
              </>
            }
          />

          {currentSchool && (
            <section className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-[28px] border border-[var(--app-primary)]/20 bg-[var(--app-primary)]/5 p-5 lg:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-primary)] text-[var(--app-primary-foreground)]">
                    <ShieldCheck className="h-6 w-6" />
                  </div>

                  <div>
                    <div className="text-xs font-black text-[var(--app-text-muted)]">تعمل الآن على</div>
                    <div className="mt-1 text-lg font-black text-[var(--app-primary)]">
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
            <ExecutiveCard title="المدن" value={stats.cities} icon={<MapPin size={22} />} tone="primary" subtitle="نطاق جغرافي" progress={stats.cities > 0 ? 100 : 0} />
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
            <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-[var(--app-primary)]">
                    {editingSchool ? "تعديل مدرسة" : "إضافة مدرسة"}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                    أدخل البيانات الأساسية للمدرسة ونظام الفصول الدراسي.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-4 text-sm font-bold text-[var(--app-text-muted)] hover:bg-[var(--app-card-soft)]"
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
                  <label className="mb-2 block text-xs font-black text-[var(--app-text-muted)]">نظام الفصول</label>
                  <select
                    value={form.semester_system}
                    onChange={(event) => setForm((previous) => ({ ...previous, semester_system: event.target.value }))}
                    className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-sm font-bold text-[var(--app-primary)] outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-card)]"
                  >
                    <option value="2">فصلان دراسيان</option>
                    <option value="3">ثلاثة فصول</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <TextField label="رابط شعار المدرسة" value={form.logo_url} onChange={(value) => setForm((previous) => ({ ...previous, logo_url: value }))} placeholder="اختياري" />
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-sm font-black text-[var(--app-text)]">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => setForm((previous) => ({ ...previous, is_active: event.target.checked }))}
                    className="h-4 w-4 accent-[var(--app-primary)]"
                  />
                  المدرسة نشطة
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void submitForm()}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--app-primary)] px-4 text-sm font-black text-[var(--app-primary-foreground)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-4 text-sm font-black text-[var(--app-primary)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <X className="h-4 w-4" />
                  إلغاء
                </button>
              </div>
            </section>
          )}

          <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-sm">
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
                    className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--app-primary)] px-4 text-sm font-black text-[var(--app-primary-foreground)]"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة مدرسة
                  </button>
                ) : undefined
              }
            />
          ) : (
            <section className="overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
              <div className="flex flex-col gap-2 border-b border-[var(--app-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-[var(--app-primary)]">قائمة المدارس</h2>
                  <p className="text-sm text-[var(--app-text-muted)]">عدد النتائج: {filteredRows.length}</p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-2 text-sm font-bold text-[var(--app-text-muted)]">
                  التصدير حسب النتائج المعروضة
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-right text-sm">
                  <thead className="bg-[var(--app-primary)] text-[var(--app-primary-foreground)]">
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

                  <tbody className="divide-y divide-[var(--app-border)]">
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-[var(--app-card-soft)]/80">
                        <td className="px-4 py-3">
                          <div className="font-black text-[var(--app-primary)]">{row.school_name}</div>
                          <div className="mt-1 text-xs font-bold text-[var(--app-text-muted)]">الكود: {row.school_code}</div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-[var(--app-text)]">{row.city}</div>
                          <div className="mt-1 text-xs text-[var(--app-text-muted)]">{row.district}</div>
                        </td>

                        <td className="px-4 py-3 text-[var(--app-text)]">{row.educational_stage}</td>
                        <td className="px-4 py-3 text-[var(--app-text)]">{row.semester_system}</td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${row.status === "نشطة" ? "border-[var(--app-green)]/20 bg-[var(--app-green-soft)] text-[var(--app-green)]" : "border-[var(--app-destructive)]/20 bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]"}`}>
                            {row.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-[var(--app-text)]">{row.created_at}</td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/schools/${row.id}`}
                              className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-2 text-xs font-bold text-[var(--app-primary)] transition hover:bg-[var(--app-card-soft)]"
                            >
                              <Eye className="h-4 w-4" />
                              عرض
                            </Link>

                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  aria-label={`تعديل ${row.school_name}`}
                                  onClick={() => openEditForm(row)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-blue)]/20 bg-[var(--app-blue-soft)] px-3 py-2 text-xs font-bold text-[var(--app-blue)] transition hover:bg-[var(--app-blue-soft)]"
                                >
                                  <Edit3 className="h-4 w-4" />
                                  تعديل
                                </button>

                                <button
                                  type="button"
                                  aria-label={`${row.status === "نشطة" ? "تعطيل" : "تفعيل"} ${row.school_name}`}
                                  disabled={saving}
                                  onClick={() => void toggleActive(row)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] px-3 py-2 text-xs font-bold text-[var(--app-primary)] transition hover:bg-[var(--app-accent-soft)]"
                                >
                                  <Power className="h-4 w-4" />
                                  {row.status === "نشطة" ? "تعطيل" : "تفعيل"}
                                </button>

                                <button
                                  type="button"
                                  aria-label={`حذف ${row.school_name}`}
                                  disabled={saving}
                                  onClick={() => void removeSchool(row)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-destructive)]/20 bg-[var(--app-destructive-soft)] px-3 py-2 text-xs font-bold text-[var(--app-destructive)] transition hover:bg-[var(--app-destructive-soft)]"
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
        </PageContainer>
      </AppShell>
    </RoleGuard>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="text-xs font-black text-[var(--app-text-muted)]">{title}</div>
      <div className="mt-2 text-sm font-black text-[var(--app-text)]">{value}</div>
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
    <div className={`rounded-[28px] border p-4 text-sm leading-7 ${isSuccess ? "border-[var(--app-green)]/20 bg-[var(--app-green-soft)] text-[var(--app-green)]" : "border-[var(--app-destructive)]/20 bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]"}`}>
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
      <label className="mb-2 block text-xs font-black text-[var(--app-text-muted)]">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-sm font-bold text-[var(--app-primary)] outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-card)]"
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
    <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-6 text-center shadow-sm">
      <div className="mx-auto max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--app-primary)]/10 text-[var(--app-primary)]">
          <School className="h-9 w-9" />
        </div>

        <h2 className="mt-4 text-xl font-black text-[var(--app-primary)]">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--app-text-muted)]">{description}</p>
        {action}
      </div>
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)]">
      <div className="flex flex-col items-center gap-3 text-[var(--app-text-muted)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--app-primary)]/20 border-t-[var(--app-primary)]" />
        <p className="text-sm font-bold">جاري تحميل المدارس...</p>
      </div>
    </div>
  );
}

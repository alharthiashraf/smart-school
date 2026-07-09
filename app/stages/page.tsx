"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileText,
  Layers3,
  Plus,
  Power,
  Printer,
  RefreshCcw,
  Save,
  Search,
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
import { ExportEngine } from "@/core";
import { supabase } from "@/lib/supabase";
import type { SchoolRole } from "@/lib/permissions";

type StageRow = {
  id: string;
  school_id: string;
  stage_key: string | null;
  stage_name: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
};

type StageView = StageRow & {
  displayName: string;
  displayKey: string;
  displayOrder: number;
  statusLabel: "نشطة" | "غير نشطة";
};

type StageForm = {
  stage_key: string;
  stage_name: string;
  sort_order: string;
  is_active: boolean;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const PAGE_SIZE = 10;

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
];

const emptyForm: StageForm = {
  stage_key: "",
  stage_name: "",
  sort_order: "1",
  is_active: true,
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function normalizeStage(stage: StageRow): StageView {
  return {
    ...stage,
    displayName: stage.stage_name || "مرحلة بدون اسم",
    displayKey: stage.stage_key || "غير محدد",
    displayOrder: Number(stage.sort_order || 1),
    statusLabel: stage.is_active === false ? "غير نشطة" : "نشطة",
  };
}

function toPayload(schoolId: string, form: StageForm) {
  return {
    school_id: schoolId,
    stage_key: form.stage_key.trim() || null,
    stage_name: form.stage_name.trim(),
    sort_order: Number(form.sort_order) || 1,
    is_active: form.is_active,
  };
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function StagesPage() {
  const schoolContext = useSchool() as any;

  const currentSchool = schoolContext?.currentSchool || schoolContext?.school || null;
  const currentRole = schoolContext?.currentRole || currentSchool?.role || null;
  const schoolLoading = Boolean(schoolContext?.loading);
  const hasPermission =
    schoolContext?.hasPermission ||
    ((permission: string) =>
      currentRole === "super_admin" || currentRole === "school_admin");

  const canManage =
    hasPermission("stages.manage") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin";

  const [stages, setStages] = useState<StageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<StageView | null>(null);
  const [selectedStage, setSelectedStage] = useState<StageView | null>(null);
  const [form, setForm] = useState<StageForm>(emptyForm);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadStages = useCallback(async () => {
    if (!currentSchool?.id) {
      setStages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("stages")
        .select("id, school_id, stage_key, stage_name, sort_order, is_active, created_at")
        .eq("school_id", currentSchool.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setStages((data as StageRow[]) || []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر تحميل المراحل الدراسية.";
      showToast("error", message);
      setStages([]);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, showToast]);

  useEffect(() => {
    if (!schoolLoading) void loadStages();
  }, [schoolLoading, loadStages]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const rows = useMemo(() => stages.map(normalizeStage), [stages]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((stage) => {
      const text = [
        stage.displayName,
        stage.displayKey,
        stage.statusLabel,
        stage.displayOrder,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || text.includes(keyword);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && stage.is_active !== false) ||
        (statusFilter === "inactive" && stage.is_active === false);

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.is_active !== false).length;
    const inactive = rows.filter((row) => row.is_active === false).length;

    return {
      total: rows.length,
      filtered: filteredRows.length,
      active,
      inactive,
    };
  }, [rows, filteredRows.length]);

  function openCreateForm() {
    setEditingStage(null);
    setForm({
      ...emptyForm,
      sort_order: String(rows.length + 1),
    });
    setFormOpen(true);
  }

  function openEditForm(stage: StageView) {
    setEditingStage(stage);
    setForm({
      stage_key: stage.stage_key || "",
      stage_name: stage.stage_name || "",
      sort_order: String(stage.sort_order || 1),
      is_active: stage.is_active !== false,
    });
    setFormOpen(true);
  }

  function closeForm() {
    setEditingStage(null);
    setForm(emptyForm);
    setFormOpen(false);
  }

  async function submitForm() {
    if (!canManage) {
      showToast("error", "لا تملك صلاحية إدارة المراحل الدراسية.");
      return;
    }

    if (!currentSchool?.id) {
      showToast("error", "لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      return;
    }

    if (!form.stage_name.trim()) {
      showToast("error", "اسم المرحلة مطلوب.");
      return;
    }

    setSaving(true);

    try {
      const payload = toPayload(currentSchool.id, form);

      const { error } = editingStage
        ? await supabase
            .from("stages")
            .update(payload)
            .eq("id", editingStage.id)
            .eq("school_id", currentSchool.id)
        : await supabase.from("stages").insert(payload);

      if (error) throw error;

      showToast(
        "success",
        editingStage ? "تم تحديث المرحلة بنجاح." : "تم إنشاء المرحلة بنجاح.",
      );

      closeForm();
      await loadStages();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر حفظ المرحلة.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(stage: StageView) {
    if (!canManage || !currentSchool?.id) return;

    const nextStatus = stage.is_active === false;
    const confirmed = window.confirm(
      nextStatus ? "هل تريد تفعيل هذه المرحلة؟" : "هل تريد تعطيل هذه المرحلة؟",
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("stages")
        .update({ is_active: nextStatus })
        .eq("id", stage.id)
        .eq("school_id", currentSchool.id);

      if (error) throw error;

      showToast("success", nextStatus ? "تم تفعيل المرحلة." : "تم تعطيل المرحلة.");
      await loadStages();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر تغيير حالة المرحلة.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function removeStage(stage: StageView) {
    if (!canManage || !currentSchool?.id) return;

    const confirmed = window.confirm(
      `سيتم حذف المرحلة "${stage.displayName}" نهائيًا. هل أنت متأكد؟`,
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("stages")
        .delete()
        .eq("id", stage.id)
        .eq("school_id", currentSchool.id);

      if (error) throw error;

      if (selectedStage?.id === stage.id) setSelectedStage(null);

      showToast("success", "تم حذف المرحلة بنجاح.");
      await loadStages();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر حذف المرحلة.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  function exportExcel() {
    ExportEngine.excel("قائمة-المراحل", filteredRows, [
      { header: "اسم المرحلة", key: "displayName" },
      { header: "مفتاح المرحلة", key: "displayKey" },
      { header: "ترتيب العرض", key: "displayOrder" },
      { header: "الحالة", key: "statusLabel" },
      { header: "تاريخ الإضافة", key: "created_at" },
    ]);
  }

  function exportPDF() {
    ExportEngine.pdf("المراحل الدراسية", filteredRows, [
      { header: "اسم المرحلة", key: "displayName" },
      { header: "مفتاح المرحلة", key: "displayKey" },
      { header: "الترتيب", key: "displayOrder" },
      { header: "الحالة", key: "statusLabel" },
    ]);
  }

  if (schoolLoading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <LoadingBox text="جاري تحميل بيانات المدرسة..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <div className="rounded-[28px] border border-red-100 bg-red-50 p-6 text-center font-bold text-red-700">
            لا توجد مدرسة مرتبطة بالمستخدم الحالي.
          </div>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <PageContainer size="wide" className="space-y-5">
          <Breadcrumb />

          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="المراحل الدراسية"
            description={`${currentSchool.school_name} — إدارة المراحل الدراسية وترتيبها وتفعيلها وربطها لاحقًا بالصفوف والفصول والمواد.`}
            badge="الإدارة الأكاديمية"
            icon={<Layers3 size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "المراحل الدراسية" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool.school_name || "غير محدد" },
              { label: "المعروض", value: filteredRows.length },
              { label: "الصفحة", value: `${page} / ${totalPages}` },
              { label: "الصلاحية", value: canManage ? "إدارة كاملة" : "عرض فقط" },
            ]}
            stats={[
              { label: "إجمالي المراحل", value: stats.total, icon: <Layers3 size={20} />, tone: "blue" },
              { label: "نتائج البحث", value: stats.filtered, icon: <FileText size={20} />, tone: "slate" },
              { label: "نشطة", value: stats.active, icon: <CheckCircle2 size={20} />, tone: "green" },
              { label: "غير نشطة", value: stats.inactive, icon: <XCircle size={20} />, tone: stats.inactive > 0 ? "red" : "green" },
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
                    إضافة
                  </button>
                )}

                <button
                  type="button"
                  onClick={exportExcel}
                  disabled={!filteredRows.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <Download size={17} />
                  Excel
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
                  onClick={() => void loadStages()}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <RefreshCcw size={17} className={loading ? "animate-spin" : ""} />
                  تحديث
                </button>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ExecutiveCard title="إجمالي المراحل" value={stats.total} icon={<Layers3 size={22} />} tone="blue" subtitle="كل المراحل" progress={stats.total > 0 ? 100 : 0} />
            <ExecutiveCard title="نتائج البحث" value={stats.filtered} icon={<FileText size={22} />} tone="slate" subtitle="بعد الفلترة" progress={stats.total ? percentage(stats.filtered, stats.total) : 0} />
            <ExecutiveCard title="مراحل نشطة" value={stats.active} icon={<CheckCircle2 size={22} />} tone="green" subtitle="مفعلة" progress={stats.total ? percentage(stats.active, stats.total) : 0} />
            <ExecutiveCard title="غير نشطة" value={stats.inactive} icon={<XCircle size={22} />} tone={stats.inactive > 0 ? "red" : "green"} subtitle="معطلة" progress={stats.total ? percentage(stats.inactive, stats.total) : 0} />
          </section>

          <SummaryCard
            title="ملخص المراحل الدراسية"
            description="قراءة سريعة لحالة المراحل وترتيبها داخل المدرسة الحالية."
            tone={stats.inactive > 0 ? "gold" : "green"}
            items={[
              { label: "الإجمالي", value: stats.total },
              { label: "المعروض", value: stats.filtered },
              { label: "نشطة", value: stats.active },
              { label: "غير نشطة", value: stats.inactive },
              { label: "الصفحة", value: `${page} / ${totalPages}` },
              { label: "الإدارة", value: canManage ? "متاحة" : "عرض فقط" },
            ]}
            footer="تستخدم المراحل كأساس للصفوف والفصول والمواد وإسناد المعلمين."
          />

          {formOpen && (
            <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm print:hidden">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {editingStage ? (
                    <Edit3 className="text-[#0DA9A6]" />
                  ) : (
                    <Plus className="text-[#0DA9A6]" />
                  )}

                  <h2 className="text-xl font-black text-[#15445A]">
                    {editingStage ? "تعديل مرحلة" : "إضافة مرحلة"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600"
                >
                  إغلاق
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Input
                  placeholder="اسم المرحلة"
                  value={form.stage_name}
                  onChange={(value) => setForm((current) => ({ ...current, stage_name: value }))}
                />

                <Input
                  placeholder="مفتاح المرحلة مثال: elementary"
                  value={form.stage_key}
                  onChange={(value) => setForm((current) => ({ ...current, stage_key: value }))}
                />

                <Input
                  placeholder="ترتيب العرض"
                  type="number"
                  value={form.sort_order}
                  onChange={(value) => setForm((current) => ({ ...current, sort_order: value }))}
                />

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        is_active: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-[#0DA9A6]"
                  />
                  المرحلة نشطة
                </label>
              </div>

              <button
                type="button"
                onClick={() => void submitForm()}
                disabled={saving}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                <Save size={16} />
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
            </section>
          )}

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm print:hidden">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث باسم المرحلة أو المفتاح...",
              }}
              filters={
                <ToolbarSelect
                  value={statusFilter}
                  onChange={(value) =>
                    setStatusFilter(value as "all" | "active" | "inactive")
                  }
                >
                  <option value="all">كل الحالات</option>
                  <option value="active">نشطة</option>
                  <option value="inactive">غير نشطة</option>
                </ToolbarSelect>
              }
              onRefresh={() => void loadStages()}
              onExportPDF={exportPDF}
              onExportExcel={exportExcel}
            />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm xl:col-span-2">
              <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#15445A]">قائمة المراحل</h2>
                  <p className="text-sm text-slate-500">
                    عرض {pagedRows.length} من {filteredRows.length} مرحلة
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
                  التصدير حسب النتائج المعروضة
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-right text-sm">
                  <thead className="bg-[#15445A] text-white">
                    <tr>
                      <th className="px-4 py-3 font-bold">المرحلة</th>
                      <th className="px-4 py-3 font-bold">المفتاح</th>
                      <th className="px-4 py-3 font-bold">الترتيب</th>
                      <th className="px-4 py-3 font-bold">الحالة</th>
                      <th className="px-4 py-3 font-bold">تاريخ الإضافة</th>
                      <th className="px-4 py-3 font-bold print:hidden">الإجراءات</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {!loading &&
                      pagedRows.map((stage) => (
                        <tr key={stage.id} className="transition hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-black text-[#15445A]">{stage.displayName}</div>
                            <div className="mt-1 text-xs font-bold text-slate-400">
                              رقم السجل: {stage.id.slice(0, 8)}
                            </div>
                          </td>

                          <td className="px-4 py-3">{stage.displayKey}</td>

                          <td className="px-4 py-3">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                              {stage.displayOrder}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <StageStatusBadge active={stage.is_active !== false} />
                          </td>

                          <td className="px-4 py-3">{formatDate(stage.created_at)}</td>

                          <td className="px-4 py-3 print:hidden">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedStage(stage)}
                                className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                                title="عرض مختصر"
                              >
                                <Eye size={16} />
                              </button>

                              {canManage && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditForm(stage)}
                                    className="rounded-xl bg-[#3D7EB9]/10 p-2 text-[#3D7EB9] hover:bg-[#3D7EB9]/15"
                                    title="تعديل"
                                  >
                                    <Edit3 size={16} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void toggleActive(stage)}
                                    className="rounded-xl bg-[#C1B489]/20 p-2 text-[#15445A] hover:bg-[#C1B489]/30"
                                    title={stage.is_active === false ? "تفعيل" : "تعطيل"}
                                  >
                                    <Power size={16} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void removeStage(stage)}
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

                {loading && <div className="py-10 text-center text-slate-500">جاري تحميل المراحل الدراسية...</div>}
                {!loading && filteredRows.length === 0 && (
                  <div className="py-10 text-center text-slate-500">لا توجد مراحل مطابقة للبحث</div>
                )}
              </div>

              {!loading && filteredRows.length > 0 && (
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 p-4">
                  <p className="text-sm text-slate-500">
                    عرض {pagedRows.length} من {filteredRows.length}
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
                      onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                      disabled={page === totalPages}
                      className="rounded-xl border p-2 disabled:opacity-40"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <StageSideCard selectedStage={selectedStage} setSelectedStage={setSelectedStage} />
          </section>
        </PageContainer>
      </AppShell>
    </RoleGuard>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl print:hidden ${
        toast.type === "success" ? "bg-[#07A869]" : "bg-red-600"
      }`}
    >
      <span>{toast.message}</span>
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
      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
    />
  );
}

function StageStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        active ? "bg-[#07A869]/10 text-[#07A869]" : "bg-red-50 text-red-700"
      }`}
    >
      {active ? "نشطة" : "غير نشطة"}
    </span>
  );
}

function StageSideCard({
  selectedStage,
  setSelectedStage,
}: {
  selectedStage: StageView | null;
  setSelectedStage: (stage: StageView | null) => void;
}) {
  if (!selectedStage) {
    return (
      <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex min-h-[330px] items-center justify-center rounded-[24px] bg-slate-50 text-center">
          <div>
            <Layers3 size={42} className="mx-auto text-[#0DA9A6]" />
            <h3 className="mt-4 text-xl font-black text-[#15445A]">اختر مرحلة</h3>
            <p className="mt-2 text-sm text-slate-500">
              اضغط على أيقونة العين لعرض تفاصيل المرحلة
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#15445A]">تفاصيل المرحلة</h2>

        <button
          type="button"
          onClick={() => setSelectedStage(null)}
          className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
        >
          <X size={18} />
        </button>
      </div>

      <div className="rounded-[24px] bg-[#15445A] p-5 text-white">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C1B489] text-[#15445A]">
            <Layers3 size={28} />
          </div>

          <div>
            <h3 className="text-2xl font-black text-[#C1B489]">
              {selectedStage.displayName}
            </h3>

            <p className="text-sm text-slate-300">{selectedStage.displayKey}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoMini title="الترتيب" value={String(selectedStage.displayOrder)} />
          <InfoMini title="الحالة" value={selectedStage.statusLabel} />
          <InfoMini title="تاريخ الإضافة" value={formatDate(selectedStage.created_at)} />
          <InfoMini title="المعرّف" value={selectedStage.id.slice(0, 8)} />
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-500">ملاحظة تشغيلية</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          هذه المرحلة تستخدم كأساس لاحق للصفوف والفصول والمواد وإسناد المعلمين.
          حافظ على ترتيب العرض لتظهر القوائم الأكاديمية بشكل صحيح.
        </p>
      </div>
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

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] bg-white p-6 text-center text-slate-500 shadow-sm">
      <RefreshCcw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#15445A]" />
      {text}
    </div>
  );
}

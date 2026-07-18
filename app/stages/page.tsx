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
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExportButton from "@/components/ui/buttons/ExportButton";
import IconButton from "@/components/ui/buttons/IconButton";
import PageLoader from "@/components/ui/loading/PageLoader";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";
import UiEmptyState from "@/components/ui/empty-state/EmptyState";

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
  const {
    currentSchool,
    currentRole,
    loading: schoolLoading,
    hasPermission,
  } = useSchool();

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

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

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
          <PageLoader text="جاري تحميل بيانات المدرسة..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <ErrorState description="لا توجد مدرسة مرتبطة بالمستخدم الحالي." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <PageContainer size="wide" className="space-y-5">
          <Breadcrumb />

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
            title="المراحل الدراسية"
            description={`${currentSchool.school_name} — إدارة المراحل الدراسية وترتيبها وتفعيلها وربطها لاحقًا بالصفوف والفصول والمواد.`}
            badge="الإدارة الأكاديمية"
            icon={<Layers3 size={18} aria-hidden="true" />}
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
              { label: "إجمالي المراحل", value: stats.total, icon: <Layers3 size={20} aria-hidden="true" />, tone: "primary" },
              { label: "نتائج البحث", value: stats.filtered, icon: <FileText size={20} aria-hidden="true" />, tone: "slate" },
              { label: "نشطة", value: stats.active, icon: <CheckCircle2 size={20} aria-hidden="true" />, tone: "green" },
              { label: "غير نشطة", value: stats.inactive, icon: <XCircle size={20} aria-hidden="true" />, tone: stats.inactive > 0 ? "red" : "green" },
            ]}
            actions={
              <>
                {canManage && (
                  <PrimaryButton
                    icon={<Plus size={17} aria-hidden="true" />}
                    onClick={openCreateForm}
                  >
                    إضافة
                  </PrimaryButton>
                )}

                <ExportButton
                  icon={<Download size={17} aria-hidden="true" />}
                  onClick={exportExcel}
                  disabled={!filteredRows.length}
                >
                  Excel
                </ExportButton>

                <ExportButton
                  icon={<Printer size={17} aria-hidden="true" />}
                  onClick={exportPDF}
                  disabled={!filteredRows.length}
                >
                  PDF
                </ExportButton>

                <SecondaryButton
                  icon={<RefreshCcw size={17} aria-hidden="true" />}
                  onClick={() => void loadStages()}
                  loading={loading}
                >
                  تحديث
                </SecondaryButton>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ExecutiveCard title="إجمالي المراحل" value={stats.total} icon={<Layers3 size={22} aria-hidden="true" />} tone="primary" subtitle="كل المراحل" progress={stats.total > 0 ? 100 : 0} />
            <ExecutiveCard title="نتائج البحث" value={stats.filtered} icon={<FileText size={22} aria-hidden="true" />} tone="slate" subtitle="بعد الفلترة" progress={stats.total ? percentage(stats.filtered, stats.total) : 0} />
            <ExecutiveCard title="مراحل نشطة" value={stats.active} icon={<CheckCircle2 size={22} aria-hidden="true" />} tone="green" subtitle="مفعلة" progress={stats.total ? percentage(stats.active, stats.total) : 0} />
            <ExecutiveCard title="غير نشطة" value={stats.inactive} icon={<XCircle size={22} aria-hidden="true" />} tone={stats.inactive > 0 ? "red" : "green"} subtitle="معطلة" progress={stats.total ? percentage(stats.inactive, stats.total) : 0} />
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
            <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] print:hidden">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {editingStage ? (
                    <Edit3 className="text-[var(--app-primary)]" aria-hidden="true" />
                  ) : (
                    <Plus className="text-[var(--app-primary)]" aria-hidden="true" />
                  )}

                  <h2 className="text-xl font-black text-[var(--app-text)]">
                    {editingStage ? "تعديل مرحلة" : "إضافة مرحلة"}
                  </h2>
                </div>

                <SecondaryButton onClick={closeForm}>
                  إغلاق
                </SecondaryButton>
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

                <label className="flex items-center gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-sm font-black text-[var(--app-text)]">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        is_active: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-[var(--app-primary)]"
                  />
                  المرحلة نشطة
                </label>
              </div>

              <PrimaryButton
                className="mt-5"
                icon={<Save size={16} aria-hidden="true" />}
                onClick={() => void submitForm()}
                loading={saving}
              >
                حفظ
              </PrimaryButton>
            </section>
          )}

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

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] shadow-[var(--app-shadow-sm)] xl:col-span-2">
              <div className="flex flex-col gap-2 border-b border-[var(--app-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-[var(--app-text)]">قائمة المراحل</h2>
                  <p className="text-sm text-[var(--app-text-muted)]">
                    عرض {pagedRows.length} من {filteredRows.length} مرحلة
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-2 text-sm font-bold text-[var(--app-text-muted)]">
                  التصدير حسب النتائج المعروضة
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-right text-sm">
                  <thead className="bg-[var(--app-primary)] text-[var(--app-primary-foreground)]">
                    <tr>
                      <th className="px-4 py-3 font-bold">المرحلة</th>
                      <th className="px-4 py-3 font-bold">المفتاح</th>
                      <th className="px-4 py-3 font-bold">الترتيب</th>
                      <th className="px-4 py-3 font-bold">الحالة</th>
                      <th className="px-4 py-3 font-bold">تاريخ الإضافة</th>
                      <th className="px-4 py-3 font-bold print:hidden">الإجراءات</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--app-border)]">
                    {!loading &&
                      pagedRows.map((stage) => (
                        <tr key={stage.id} className="transition hover:bg-[var(--app-card-soft)]">
                          <td className="px-4 py-3">
                            <div className="font-black text-[var(--app-text)]">{stage.displayName}</div>
                            <div className="mt-1 text-xs font-bold text-[var(--app-text-subtle)]">
                              رقم السجل: {stage.id.slice(0, 8)}
                            </div>
                          </td>

                          <td className="px-4 py-3">{stage.displayKey}</td>

                          <td className="px-4 py-3">
                            <span className="rounded-full bg-[var(--app-card-soft)] px-3 py-1 text-xs font-black text-[var(--app-text)]">
                              {stage.displayOrder}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <StageStatusBadge active={stage.is_active !== false} />
                          </td>

                          <td className="px-4 py-3">{formatDate(stage.created_at)}</td>

                          <td className="px-4 py-3 print:hidden">
                            <div className="flex flex-wrap items-center gap-2">
                              <IconButton
                                label="عرض تفاصيل المرحلة"
                                title="عرض مختصر"
                                onClick={() => setSelectedStage(stage)}
                                icon={<Eye size={16} aria-hidden="true" />}
                              />

                              {canManage && (
                                <>
                                  <IconButton
                                    label="تعديل المرحلة"
                                    title="تعديل"
                                    onClick={() => openEditForm(stage)}
                                    icon={<Edit3 size={16} aria-hidden="true" />}
                                  />

                                  <IconButton
                                    label={
                                      stage.is_active === false
                                        ? "تفعيل المرحلة"
                                        : "تعطيل المرحلة"
                                    }
                                    title={stage.is_active === false ? "تفعيل" : "تعطيل"}
                                    onClick={() => void toggleActive(stage)}
                                    icon={<Power size={16} aria-hidden="true" />}
                                  />

                                  <IconButton
                                    label="حذف المرحلة"
                                    title="حذف"
                                    onClick={() => void removeStage(stage)}
                                    icon={<Trash2 size={16} aria-hidden="true" />}
                                  />
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {loading && <div className="py-10 text-center text-[var(--app-text-muted)]">جاري تحميل المراحل الدراسية...</div>}
                {!loading && filteredRows.length === 0 && (
                  <div className="p-6">
                    <UiEmptyState
                      icon={<Layers3 className="h-8 w-8" aria-hidden="true" />}
                      title="لا توجد مراحل"
                      description="غيّر البحث أو الفلاتر، أو أضف مرحلة دراسية جديدة."
                    />
                  </div>
                )}
              </div>

              {!loading && filteredRows.length > 0 && (
                <div className="mt-5 flex items-center justify-between border-t border-[var(--app-border)] p-4">
                  <p className="text-sm text-[var(--app-text-muted)]">
                    عرض {pagedRows.length} من {filteredRows.length}
                  </p>

                  <div className="flex items-center gap-2">
                    <IconButton
                      label="الصفحة السابقة"
                      title="السابق"
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
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

            <StageSideCard selectedStage={selectedStage} setSelectedStage={setSelectedStage} />
          </section>
        </PageContainer>
      </AppShell>
    </RoleGuard>
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
      className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
    />
  );
}

function StageStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        active ? "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]" : "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]"
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
      <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
        <UiEmptyState
          icon={<Layers3 className="h-9 w-9" aria-hidden="true" />}
          title="اختر مرحلة"
          description="اضغط على زر العرض بجانب أي مرحلة لمشاهدة تفاصيلها."
        />
      </div>
    );
  }

  return (
    <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-black text-[var(--app-text)]">تفاصيل المرحلة</h2>

        <IconButton
          label="إغلاق تفاصيل المرحلة"
          title="إغلاق"
          onClick={() => setSelectedStage(null)}
          icon={<X size={18} aria-hidden="true" />}
        />
      </div>

      <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] p-5 text-[var(--app-primary-foreground)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-accent)] text-[var(--app-accent-foreground)]">
            <Layers3 size={28} aria-hidden="true" />
          </div>

          <div>
            <h3 className="text-2xl font-black text-[var(--app-accent)]">
              {selectedStage.displayName}
            </h3>

            <p className="text-sm text-[var(--app-primary-foreground)]/70">{selectedStage.displayKey}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoMini title="الترتيب" value={String(selectedStage.displayOrder)} />
          <InfoMini title="الحالة" value={selectedStage.statusLabel} />
          <InfoMini title="تاريخ الإضافة" value={formatDate(selectedStage.created_at)} />
          <InfoMini title="المعرّف" value={selectedStage.id.slice(0, 8)} />
        </div>
      </div>

      <div className="mt-5 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
        <p className="text-sm font-bold text-[var(--app-text-muted)]">ملاحظة تشغيلية</p>
        <p className="mt-2 text-sm leading-7 text-[var(--app-text-muted)]">
          هذه المرحلة تستخدم كأساس لاحق للصفوف والفصول والمواد وإسناد المعلمين.
          حافظ على ترتيب العرض لتظهر القوائم الأكاديمية بشكل صحيح.
        </p>
      </div>
    </div>
  );
}

function InfoMini({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card)]/10 p-3">
      <p className="text-xs text-[var(--app-primary-foreground)]/70">{title}</p>
      <p className="mt-1 truncate font-black text-[var(--app-primary-foreground)]">{value}</p>
    </div>
  );
}



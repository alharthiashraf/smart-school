"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CalendarDays,
  CheckCircle2,
  Edit,
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";

import RoleGuard from "@/components/auth/RoleGuard";
import AppShell from "@/components/layout/AppShell";
import DangerButton from "@/components/ui/buttons/DangerButton";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import { EmptyState } from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/feedback/ErrorState";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import { PageLoader } from "@/components/ui/loading";
import PageHeader from "@/components/ui/page/PageHeader";
import PageSection from "@/components/ui/page/PageSection";

import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToExcel } from "@/lib/exports/excel";
import { exportTableToPDF } from "@/lib/exports/pdf";
import type { SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type ActivityToast = {
  type: "success" | "error";
  message: string;
};

type Activity = {
  id: string;
  school_id: string;
  title?: string | null;
  activity_name?: string | null;
  activity_type?: string | null;
  description?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  supervisor_name?: string | null;
  target_group?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type FormState = {
  id?: string;
  title: string;
  activity_type: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  location: string;
  supervisor_name: string;
  target_group: string;
  notes: string;
};

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "activity_leader",
];

const EMPTY_FORM: FormState = {
  title: "",
  activity_type: "ثقافي",
  description: "",
  status: "نشط",
  start_date: "",
  end_date: "",
  location: "",
  supervisor_name: "",
  target_group: "",
  notes: "",
};

const ACTIVITY_TYPES = [
  "ثقافي",
  "رياضي",
  "علمي",
  "كشفي",
  "تطوعي",
  "فني",
  "اجتماعي",
  "مهاري",
  "وطني",
  "صحي",
] as const;

const STATUS_OPTIONS = [
  "نشط",
  "قيد التخطيط",
  "منفذ",
  "مؤجل",
  "ملغي",
] as const;

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getStatusClass(status?: string | null) {
  const value = String(status || "");

  if (["نشط", "منفذ", "معتمد"].includes(value)) {
    return "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
  }

  if (["قيد التخطيط", "مؤجل"].includes(value)) {
    return "bg-[color-mix(in_srgb,var(--app-warning)_14%,transparent)] text-[var(--app-warning-foreground)]";
  }

  if (["ملغي", "مرفوض"].includes(value)) {
    return "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]";
  }

  return "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]";
}

export default function ActivitiesManagePage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [items, setItems] = useState<Activity[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [typeFilter, setTypeFilter] = useState("الكل");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<ActivityToast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const showToast = useCallback(
    (type: ActivityToast["type"], message: string) => {
      setToast({ type, message });

      window.setTimeout(() => {
        setToast(null);
      }, 3000);
    },
    [],
  );

  const loadData = useCallback(async () => {
    if (!currentSchool?.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("school_id", currentSchool.id)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      setItems([]);
      return;
    }

    setItems((data ?? []) as Activity[]);
  }, [currentSchool?.id]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setLoading(false);
      setErrorMsg("لا توجد مدرسة مرتبطة بالحساب.");
      return;
    }

    void loadData();
  }, [currentSchool?.id, loadData, schoolLoading]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const searchableText = [
        item.title,
        item.activity_name,
        item.activity_type,
        item.status,
        item.location,
        item.supervisor_name,
        item.target_group,
        item.description,
        item.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesStatus =
        statusFilter === "الكل" || item.status === statusFilter;

      const matchesType =
        typeFilter === "الكل" || item.activity_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [items, search, statusFilter, typeFilter]);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.status === "نشط").length,
      done: items.filter((item) => item.status === "منفذ").length,
      planning: items.filter((item) => item.status === "قيد التخطيط").length,
    }),
    [items],
  );

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setShowForm(false);
  }, []);

  const editItem = useCallback((item: Activity) => {
    setForm({
      id: item.id,
      title: item.title || item.activity_name || "",
      activity_type: item.activity_type || "ثقافي",
      description: item.description || "",
      status: item.status || "نشط",
      start_date: item.start_date || "",
      end_date: item.end_date || "",
      location: item.location || "",
      supervisor_name: item.supervisor_name || "",
      target_group: item.target_group || "",
      notes: item.notes || "",
    });

    setShowForm(true);
  }, []);

  const saveItem = useCallback(async () => {
    if (!currentSchool?.id) {
      showToast("error", "تعذر تحديد المدرسة.");
      return;
    }

    if (!form.title.trim()) {
      showToast("error", "أدخل اسم النشاط.");
      return;
    }

    setSaving(true);

    const payload = {
      school_id: currentSchool.id,
      title: form.title.trim(),
      activity_name: form.title.trim(),
      activity_type: form.activity_type,
      description: form.description.trim() || null,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      location: form.location.trim() || null,
      supervisor_name: form.supervisor_name.trim() || null,
      target_group: form.target_group.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = form.id
      ? await supabase
          .from("activities")
          .update(payload)
          .eq("id", form.id)
          .eq("school_id", currentSchool.id)
      : await supabase.from("activities").insert(payload);

    setSaving(false);

    if (result.error) {
      showToast("error", result.error.message);
      return;
    }

    showToast(
      "success",
      form.id ? "تم تحديث النشاط." : "تمت إضافة النشاط.",
    );

    resetForm();
    void loadData();
  }, [currentSchool?.id, form, loadData, resetForm, showToast]);

  const deleteItem = useCallback(
    async (item: Activity) => {
      if (!currentSchool?.id) return;

      const title = item.title || item.activity_name || "نشاط";
      const confirmed = window.confirm(`حذف النشاط "${title}"؟`);

      if (!confirmed) return;

      const { error } = await supabase
        .from("activities")
        .delete()
        .eq("id", item.id)
        .eq("school_id", currentSchool.id);

      if (error) {
        showToast("error", error.message);
        return;
      }

      showToast("success", "تم حذف النشاط.");
      void loadData();
    },
    [currentSchool?.id, loadData, showToast],
  );

  const exportExcel = useCallback(async () => {
    await exportTableToExcel({
      title: "إدارة الأنشطة",
      schoolName:
        currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "قائمة الأنشطة المدرسية",
      headers: [
        "النشاط",
        "النوع",
        "الحالة",
        "تاريخ البداية",
        "تاريخ النهاية",
        "الموقع",
        "المشرف",
        "الفئة",
      ],
      rows: filteredItems.map((item) => [
        item.title || item.activity_name || "-",
        item.activity_type || "-",
        item.status || "-",
        item.start_date || "-",
        item.end_date || "-",
        item.location || "-",
        item.supervisor_name || "-",
        item.target_group || "-",
      ]),
      fileName: "activities.xlsx",
    });

    showToast("success", "تم تصدير Excel.");
  }, [currentSchool?.school_name, filteredItems, showToast]);

  const exportPDF = useCallback(() => {
    exportTableToPDF({
      title: "إدارة الأنشطة",
      schoolName:
        currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "قائمة الأنشطة المدرسية",
      headers: [
        "النشاط",
        "النوع",
        "الحالة",
        "البداية",
        "النهاية",
        "المشرف",
      ],
      rows: filteredItems.map((item) => [
        item.title || item.activity_name || "-",
        item.activity_type || "-",
        item.status || "-",
        item.start_date || "-",
        item.end_date || "-",
        item.supervisor_name || "-",
      ]),
      fileName: "activities.pdf",
    });

    showToast("success", "تم تجهيز PDF.");
  }, [currentSchool?.school_name, filteredItems, showToast]);

  const activeProgress = stats.total
    ? Math.round((stats.active / stats.total) * 100)
    : 0;

  const doneProgress = stats.total
    ? Math.round((stats.done / stats.total) * 100)
    : 0;

  const planningProgress = stats.total
    ? Math.round((stats.planning / stats.total) * 100)
    : 0;

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل الأنشطة..." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-6" dir="rtl">
          {toast?.type === "success" ? (
            <SuccessBanner description={toast.message} />
          ) : toast ? (
            <ErrorState description={toast.message} />
          ) : null}

          <PageHeader
            variant="hero"
            title="إدارة الأنشطة"
            description="إضافة الأنشطة ومتابعتها."
            badge="رائد النشاط"
            icon={<Sparkles size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الأنشطة", href: "/activities" },
              { label: "إدارة الأنشطة" },
            ]}
            stats={[
              {
                label: "الإجمالي",
                value: stats.total,
                icon: <Sparkles size={20} aria-hidden="true" />,
                tone: "primary",
              },
              {
                label: "النشطة",
                value: stats.active,
                icon: <CheckCircle2 size={20} aria-hidden="true" />,
                tone: "green",
              },
              {
                label: "المنفذة",
                value: stats.done,
                icon: <CalendarDays size={20} aria-hidden="true" />,
                tone: "gold",
              },
              {
                label: "قيد التخطيط",
                value: stats.planning,
                icon: <Loader2 size={20} aria-hidden="true" />,
                tone: "primary",
              },
            ]}
            actions={
              <>
                <PrimaryButton onClick={() => setShowForm(true)}>
                  <Plus size={16} aria-hidden="true" />
                  إضافة
                </PrimaryButton>

                <SecondaryButton onClick={() => void loadData()}>
                  <RefreshCcw size={16} aria-hidden="true" />
                  تحديث
                </SecondaryButton>
              </>
            }
          />

          {errorMsg ? <ErrorState description={errorMsg} /> : null}

          <section
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="مؤشرات الأنشطة"
          >
            <ExecutiveCard
              title="الإجمالي"
              value={stats.total}
              subtitle="كل الأنشطة"
              icon={<Sparkles size={22} aria-hidden="true" />}
              tone="primary"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="النشطة"
              value={stats.active}
              subtitle="حاليًا"
              icon={<CheckCircle2 size={22} aria-hidden="true" />}
              tone="green"
              progress={activeProgress}
            />

            <ExecutiveCard
              title="المنفذة"
              value={stats.done}
              subtitle="مكتملة"
              icon={<CalendarDays size={22} aria-hidden="true" />}
              tone="gold"
              progress={doneProgress}
            />

            <ExecutiveCard
              title="قيد التخطيط"
              value={stats.planning}
              subtitle="تحتاج إعداد"
              icon={<Loader2 size={22} aria-hidden="true" />}
              tone="primary"
              progress={planningProgress}
            />
          </section>

          {showForm ? (
            <PageSection
              title={form.id ? "تعديل نشاط" : "إضافة نشاط"}
              icon={<Edit size={22} aria-hidden="true" />}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Field
                  label="اسم النشاط"
                  value={form.title}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, title: value }))
                  }
                  required
                />

                <SelectField
                  label="النوع"
                  value={form.activity_type}
                  options={ACTIVITY_TYPES}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      activity_type: value,
                    }))
                  }
                />

                <SelectField
                  label="الحالة"
                  value={form.status}
                  options={STATUS_OPTIONS}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, status: value }))
                  }
                />

                <Field
                  label="تاريخ البداية"
                  type="date"
                  value={form.start_date}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      start_date: value,
                    }))
                  }
                />

                <Field
                  label="تاريخ النهاية"
                  type="date"
                  value={form.end_date}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      end_date: value,
                    }))
                  }
                />

                <Field
                  label="الموقع"
                  value={form.location}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      location: value,
                    }))
                  }
                />

                <Field
                  label="المشرف"
                  value={form.supervisor_name}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      supervisor_name: value,
                    }))
                  }
                />

                <Field
                  label="الفئة المستهدفة"
                  value={form.target_group}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      target_group: value,
                    }))
                  }
                />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <TextAreaField
                  label="الوصف"
                  value={form.description}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      description: value,
                    }))
                  }
                />

                <TextAreaField
                  label="ملاحظات"
                  value={form.notes}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      notes: value,
                    }))
                  }
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <PrimaryButton
                  onClick={() => void saveItem()}
                  loading={saving}
                >
                  <CheckCircle2 size={16} aria-hidden="true" />
                  حفظ
                </PrimaryButton>

                <SecondaryButton onClick={resetForm}>
                  <XCircle size={16} aria-hidden="true" />
                  إلغاء
                </SecondaryButton>
              </div>
            </PageSection>
          ) : null}

          <PageSection
            title="البحث والتصفية"
            icon={<Search size={22} aria-hidden="true" />}
          >
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_auto_auto]">
              <SearchField value={search} onChange={setSearch} />

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                aria-label="تصفية حسب نوع النشاط"
                className={fieldClassName}
              >
                <option value="الكل">كل الأنواع</option>
                {ACTIVITY_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="تصفية حسب الحالة"
                className={fieldClassName}
              >
                <option value="الكل">كل الحالات</option>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <SecondaryButton onClick={() => void exportExcel()}>
                Excel
              </SecondaryButton>

              <SecondaryButton onClick={exportPDF}>
                <FileText size={16} aria-hidden="true" />
                PDF
              </SecondaryButton>
            </div>
          </PageSection>

          <section
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-label="قائمة الأنشطة"
          >
            {filteredItems.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState
                  title="لا توجد نتائج"
                  description="غيّر البحث أو أضف نشاطًا."
                  icon={<Search size={28} aria-hidden="true" />}
                />
              </div>
            ) : (
              filteredItems.map((item) => (
                <ActivityCard
                  key={item.id}
                  item={item}
                  onEdit={editItem}
                  onDelete={deleteItem}
                />
              ))
            )}
          </section>
        </main>
      </AppShell>
    </RoleGuard>
  );
}

const fieldClassName =
  "h-11 w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]";

function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-subtle)]"
        size={18}
        aria-hidden="true"
      />

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="بحث..."
        aria-label="البحث في الأنشطة"
        className={`${fieldClassName} pr-10`}
      />
    </div>
  );
}

function ActivityCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Activity;
  onEdit: (item: Activity) => void;
  onDelete: (item: Activity) => Promise<void>;
}) {
  return (
    <article className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--app-shadow-md)]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
            item.status,
          )}`}
        >
          {item.status || "غير محدد"}
        </span>

        <span className="rounded-full bg-[var(--app-card-soft)] px-3 py-1 text-xs font-bold text-[var(--app-text-muted)]">
          {item.activity_type || "نشاط"}
        </span>
      </div>

      <h3 className="text-xl font-black text-[var(--app-text)]">
        {item.title || item.activity_name || "نشاط مدرسي"}
      </h3>

      <p className="mt-2 line-clamp-2 text-sm leading-7 text-[var(--app-text-muted)]">
        {item.description || "لا يوجد وصف."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <InfoBox label="البداية" value={formatDate(item.start_date)} />
        <InfoBox label="النهاية" value={formatDate(item.end_date)} />
        <InfoBox label="الموقع" value={item.location || "—"} />
        <InfoBox label="المشرف" value={item.supervisor_name || "—"} />
      </div>

      {item.notes ? (
        <p className="mt-3 rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-3 text-sm leading-7 text-[var(--app-text-muted)]">
          {item.notes}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <SecondaryButton size="sm" onClick={() => onEdit(item)}>
          <Edit size={15} aria-hidden="true" />
          تعديل
        </SecondaryButton>

        <DangerButton
          size="sm"
          onClick={() => void onDelete(item)}
          icon={<Trash2 size={15} aria-hidden="true" />}
        >
          حذف
        </DangerButton>
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  const id = `activity-field-${label}`;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
        {label}
      </span>

      <input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClassName}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const id = `activity-select-${label}`;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
        {label}
      </span>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClassName}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `activity-textarea-${label}`;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
        {label}
      </span>

      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className={`${fieldClassName} h-auto resize-none py-3`}
      />
    </label>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] px-4 py-3">
      <p className="text-xs font-bold text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-1 line-clamp-1 font-black text-[var(--app-text)]">
        {value}
      </p>
    </div>
  );
}


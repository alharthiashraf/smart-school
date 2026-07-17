"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Edit,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Trophy,
  XCircle,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import AppShell from "@/components/layout/AppShell";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import DangerButton from "@/components/ui/buttons/DangerButton";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { EmptyState } from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/feedback/ErrorState";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import { PageLoader } from "@/components/ui/loading";
import PageHeader from "@/components/ui/page/PageHeader";
import PageSection from "@/components/ui/page/PageSection";
import PageToolbar, {
  ToolbarSelect,
} from "@/components/ui/page/PageToolbar";

import { useSchool } from "@/contexts/SchoolContext";
import { ExportEngine } from "@/core";
import type { SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type Competition = {
  id: string;
  school_id: string;
  title?: string | null;
  competition_name?: string | null;
  description?: string | null;
  competition_type?: string | null;
  competition_date?: string | null;
  location?: string | null;
  status?: string | null;
  result?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type CompetitionExportRow = Record<string, unknown> & {
  title: string;
  type: string;
  status: string;
  date: string;
  location: string;
  result: string;
  notes: string;
};

type FormState = {
  id?: string;
  title: string;
  description: string;
  competition_type: string;
  competition_date: string;
  location: string;
  status: string;
  result: string;
  notes: string;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "activity_leader",
];

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  competition_type: "ثقافية",
  competition_date: "",
  location: "",
  status: "قيد التخطيط",
  result: "",
  notes: "",
};

const COMPETITION_TYPES = [
  "ثقافية",
  "رياضية",
  "علمية",
  "فنية",
  "مهارية",
  "وطنية",
  "تطوعية",
  "تقنية",
  "قرآنية",
  "أخرى",
] as const;

const STATUS_OPTIONS = [
  "قيد التخطيط",
  "مفتوحة للتسجيل",
  "قيد التنفيذ",
  "منفذة",
  "مؤجلة",
  "ملغية",
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

  if (["منفذة", "معتمدة"].includes(value)) {
    return "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
  }

  if (
    ["قيد التخطيط", "مفتوحة للتسجيل", "قيد التنفيذ", "مؤجلة"].includes(value)
  ) {
    return "bg-[color-mix(in_srgb,var(--app-warning)_14%,transparent)] text-[var(--app-warning-foreground)]";
  }

  if (["ملغية", "مرفوضة"].includes(value)) {
    return "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]";
  }

  return "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]";
}

function getCompetitionTitle(item: Competition) {
  return item.title || item.competition_name || "مسابقة";
}

function toExportRows(items: Competition[]): CompetitionExportRow[] {
  return items.map((item) => ({
    title: getCompetitionTitle(item),
    type: item.competition_type || "-",
    status: item.status || "-",
    date: item.competition_date || "-",
    location: item.location || "-",
    result: item.result || "-",
    notes: item.notes || "-",
  }));
}

export default function ActivityCompetitionsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [items, setItems] = useState<Competition[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [typeFilter, setTypeFilter] = useState("الكل");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  const loadData = useCallback(async () => {
    if (!currentSchool?.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase
      .from("activity_competitions")
      .select("*")
      .eq("school_id", currentSchool.id)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      setItems([]);
      return;
    }

    setItems((data ?? []) as Competition[]);
  }, [currentSchool?.id]);

  useEffect(() => {
    if (!schoolLoading) {
      void loadData();
    }
  }, [loadData, schoolLoading]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setShowForm(false);
  }, []);

  const editItem = useCallback((item: Competition) => {
    setForm({
      id: item.id,
      title: getCompetitionTitle(item),
      description: item.description || "",
      competition_type: item.competition_type || "ثقافية",
      competition_date: item.competition_date || "",
      location: item.location || "",
      status: item.status || "قيد التخطيط",
      result: item.result || "",
      notes: item.notes || "",
    });

    setShowForm(true);
  }, []);

  const saveItem = useCallback(async () => {
    if (!currentSchool?.id) return;

    if (!form.title.trim()) {
      showToast("error", "أدخل اسم المسابقة.");
      return;
    }

    setSaving(true);

    const payload = {
      school_id: currentSchool.id,
      title: form.title.trim(),
      competition_name: form.title.trim(),
      description: form.description.trim() || null,
      competition_type: form.competition_type,
      competition_date: form.competition_date || null,
      location: form.location.trim() || null,
      status: form.status,
      result: form.result.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = form.id
      ? await supabase
          .from("activity_competitions")
          .update(payload)
          .eq("id", form.id)
          .eq("school_id", currentSchool.id)
      : await supabase.from("activity_competitions").insert(payload);

    setSaving(false);

    if (result.error) {
      showToast("error", result.error.message);
      return;
    }

    showToast("success", form.id ? "تم تحديث المسابقة." : "تمت إضافة المسابقة.");
    resetForm();
    void loadData();
  }, [currentSchool?.id, form, loadData, resetForm, showToast]);

  const deleteItem = useCallback(
    async (item: Competition) => {
      if (!currentSchool?.id) return;

      const confirmed = window.confirm(
        `حذف المسابقة "${getCompetitionTitle(item)}"؟`,
      );

      if (!confirmed) return;

      const { error } = await supabase
        .from("activity_competitions")
        .delete()
        .eq("id", item.id)
        .eq("school_id", currentSchool.id);

      if (error) {
        showToast("error", error.message);
        return;
      }

      showToast("success", "تم حذف المسابقة.");
      void loadData();
    },
    [currentSchool?.id, loadData, showToast],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const searchableText = [
        item.title,
        item.competition_name,
        item.description,
        item.competition_type,
        item.status,
        item.location,
        item.result,
        item.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);
      const matchesStatus =
        statusFilter === "الكل" || item.status === statusFilter;
      const matchesType =
        typeFilter === "الكل" || item.competition_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [items, search, statusFilter, typeFilter]);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) =>
        ["مفتوحة للتسجيل", "قيد التنفيذ"].includes(String(item.status || "")),
      ).length,
      done: items.filter((item) => item.status === "منفذة").length,
      delayed: items.filter((item) => item.status === "مؤجلة").length,
    }),
    [items],
  );

  const exportExcel = useCallback(() => {
    ExportEngine.excel(
      "activity-competitions",
      toExportRows(filteredItems),
      [
        { header: "المسابقة", key: "title" },
        { header: "النوع", key: "type" },
        { header: "الحالة", key: "status" },
        { header: "التاريخ", key: "date" },
        { header: "الموقع", key: "location" },
        { header: "النتيجة", key: "result" },
        { header: "ملاحظات", key: "notes" },
      ],
    );

    showToast("success", "تم تصدير Excel.");
  }, [filteredItems, showToast]);

  const exportPDF = useCallback(() => {
    ExportEngine.pdf(
      "مسابقات النشاط",
      toExportRows(filteredItems),
      [
        { header: "المسابقة", key: "title" },
        { header: "النوع", key: "type" },
        { header: "الحالة", key: "status" },
        { header: "التاريخ", key: "date" },
        { header: "الموقع", key: "location" },
        { header: "النتيجة", key: "result" },
      ],
    );

    showToast("success", "تم تجهيز PDF.");
  }, [filteredItems, showToast]);

  const activeProgress = stats.total
    ? Math.round((stats.active / stats.total) * 100)
    : 0;

  const doneProgress = stats.total
    ? Math.round((stats.done / stats.total) * 100)
    : 0;

  const delayedProgress = stats.total
    ? Math.round((stats.delayed / stats.total) * 100)
    : 0;

  if (schoolLoading || loading) {
    return (
      <AuthGuard roles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل المسابقات..." />
        </AppShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard roles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-6" dir="rtl">
          {toast?.type === "success" ? (
            <SuccessBanner description={toast.message} />
          ) : toast ? (
            <ErrorState description={toast.message} />
          ) : null}

          <PageHeader
            variant="hero"
            title="المسابقات"
            description="إدارة المسابقات والنتائج."
            badge="الأنشطة"
            icon={<Trophy size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الأنشطة", href: "/activities" },
              { label: "المسابقات" },
            ]}
            meta={[
              {
                label: "المدرسة",
                value: currentSchool?.school_name || "غير متوفر",
              },
              { label: "الإجمالي", value: stats.total },
              { label: "المنفذة", value: stats.done },
              { label: "الجارية", value: stats.active },
            ]}
            stats={[
              {
                label: "الإجمالي",
                value: stats.total,
                icon: <Trophy size={20} aria-hidden="true" />,
                tone: "primary",
              },
              {
                label: "قيد التنفيذ",
                value: stats.active,
                icon: <CalendarDays size={20} aria-hidden="true" />,
                tone: "gold",
              },
              {
                label: "منفذة",
                value: stats.done,
                icon: <CheckCircle2 size={20} aria-hidden="true" />,
                tone: "green",
              },
              {
                label: "مؤجلة",
                value: stats.delayed,
                icon: <Award size={20} aria-hidden="true" />,
                tone: stats.delayed > 0 ? "red" : "green",
              },
            ]}
            actions={
              <>
                <PrimaryButton onClick={() => setShowForm(true)}>
                  <Plus size={17} aria-hidden="true" />
                  إضافة
                </PrimaryButton>

                <SecondaryButton onClick={() => void loadData()}>
                  <RefreshCcw size={17} aria-hidden="true" />
                  تحديث
                </SecondaryButton>
              </>
            }
          />

          {errorMsg ? <ErrorState description={errorMsg} /> : null}

          <section
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="مؤشرات المسابقات"
          >
            <ExecutiveCard
              title="الإجمالي"
              value={stats.total}
              subtitle="كل المسابقات"
              icon={<Trophy size={22} aria-hidden="true" />}
              tone="primary"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="قيد التنفيذ"
              value={stats.active}
              subtitle="مفتوحة أو جارية"
              icon={<CalendarDays size={22} aria-hidden="true" />}
              tone="gold"
              progress={activeProgress}
            />

            <ExecutiveCard
              title="منفذة"
              value={stats.done}
              subtitle="مكتملة"
              icon={<CheckCircle2 size={22} aria-hidden="true" />}
              tone="green"
              progress={doneProgress}
            />

            <ExecutiveCard
              title="مؤجلة"
              value={stats.delayed}
              subtitle="تحتاج متابعة"
              icon={<Award size={22} aria-hidden="true" />}
              tone={stats.delayed > 0 ? "red" : "green"}
              progress={delayedProgress}
            />
          </section>

          <SummaryCard
            title="الملخص"
            description="حالة المسابقات حسب الفلاتر."
            tone={stats.delayed > 0 ? "gold" : "green"}
            items={[
              { label: "الإجمالي", value: stats.total },
              { label: "قيد التنفيذ", value: stats.active },
              { label: "منفذة", value: stats.done },
              { label: "مؤجلة", value: stats.delayed },
              { label: "النتائج", value: filteredItems.length },
              { label: "النوع", value: typeFilter },
            ]}
            footer="توثيق النتائج يدعم تقارير النشاط."
          />

          {showForm ? (
            <PageSection
              title={form.id ? "تعديل مسابقة" : "إضافة مسابقة"}
              icon={<Edit size={22} aria-hidden="true" />}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Field
                  label="اسم المسابقة"
                  value={form.title}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, title: value }))
                  }
                  required
                />

                <SelectField
                  label="النوع"
                  value={form.competition_type}
                  options={COMPETITION_TYPES}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      competition_type: value,
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
                  label="التاريخ"
                  type="date"
                  value={form.competition_date}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      competition_date: value,
                    }))
                  }
                />

                <Field
                  label="الموقع"
                  value={form.location}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, location: value }))
                  }
                />

                <Field
                  label="النتيجة"
                  value={form.result}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, result: value }))
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
                    setForm((current) => ({ ...current, notes: value }))
                  }
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <PrimaryButton
                  onClick={() => void saveItem()}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCircle2 size={16} aria-hidden="true" />
                  )}
                  حفظ
                </PrimaryButton>

                <SecondaryButton onClick={resetForm}>
                  <XCircle size={16} aria-hidden="true" />
                  إلغاء
                </SecondaryButton>
              </div>
            </PageSection>
          ) : null}

          <PageToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "بحث...",
            }}
            filters={
              <>
                <ToolbarSelect value={typeFilter} onChange={setTypeFilter}>
                  <option value="الكل">كل الأنواع</option>
                  {COMPETITION_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </ToolbarSelect>

                <ToolbarSelect value={statusFilter} onChange={setStatusFilter}>
                  <option value="الكل">كل الحالات</option>
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </ToolbarSelect>
              </>
            }
            onRefresh={() => void loadData()}
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
          />

          <section
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-label="قائمة المسابقات"
          >
            {filteredItems.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState
                  title="لا توجد نتائج"
                  description="غيّر البحث أو أضف مسابقة."
                  icon={<Search className="h-7 w-7" aria-hidden="true" />}
                />
              </div>
            ) : (
              filteredItems.map((item) => (
                <CompetitionCard
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
    </AuthGuard>
  );
}

function CompetitionCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Competition;
  onEdit: (item: Competition) => void;
  onDelete: (item: Competition) => Promise<void>;
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
          {item.competition_type || "مسابقة"}
        </span>
      </div>

      <h3 className="text-xl font-black text-[var(--app-text)]">
        {getCompetitionTitle(item)}
      </h3>

      <p className="mt-2 line-clamp-2 text-sm leading-7 text-[var(--app-text-muted)]">
        {item.description || "لا يوجد وصف."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <InfoBox label="التاريخ" value={formatDate(item.competition_date)} />
        <InfoBox label="الموقع" value={item.location || "—"} />
        <InfoBox label="النتيجة" value={item.result || "—"} />
        <InfoBox label="الإنشاء" value={formatDate(item.created_at)} />
      </div>

      {item.notes ? (
        <p className="mt-3 rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-3 text-sm leading-7 text-[var(--app-text-muted)]">
          {item.notes}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <SecondaryButton onClick={() => onEdit(item)} size="sm">
          <Edit size={15} aria-hidden="true" />
          تعديل
        </SecondaryButton>

        <DangerButton onClick={() => void onDelete(item)} size="sm">
          <Trash2 size={15} aria-hidden="true" />
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
  const id = `field-${label}`;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-xs font-black text-[var(--app-text-muted)]">
        {label}
      </span>

      <input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
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
  const id = `select-${label}`;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-xs font-black text-[var(--app-text-muted)]">
        {label}
      </span>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
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
  const id = `textarea-${label}`;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-xs font-black text-[var(--app-text-muted)]">
        {label}
      </span>

      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-none rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
      />
    </label>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-3">
      <p className="text-xs font-bold text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-1 line-clamp-1 font-black text-[var(--app-text)]">
        {value}
      </p>
    </div>
  );
}

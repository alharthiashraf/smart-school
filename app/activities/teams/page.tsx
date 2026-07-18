"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckCircle2,
  Edit,
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Users,
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
import Section from "@/components/ui/page/PageSection";

import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToExcel } from "@/lib/exports/excel";
import { exportTableToPDF } from "@/lib/exports/pdf";
import type { SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type Toast = {
  type: "success" | "error";
  message: string;
};

type Team = {
  id: string;
  school_id: string;
  team_name?: string | null;
  title?: string | null;
  description?: string | null;
  supervisor_name?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type FormState = {
  id?: string;
  team_name: string;
  description: string;
  supervisor_name: string;
  status: string;
};

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "activity_leader",
];

const EMPTY_FORM: FormState = {
  team_name: "",
  description: "",
  supervisor_name: "",
  status: "نشط",
};

const STATUS_OPTIONS = [
  "نشط",
  "قيد التكوين",
  "متوقف",
  "منجز",
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

  if (["نشط", "منجز"].includes(value)) {
    return "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
  }

  if (value === "قيد التكوين") {
    return "bg-[color-mix(in_srgb,var(--app-warning)_14%,transparent)] text-[var(--app-warning-foreground)]";
  }

  if (value === "متوقف") {
    return "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]";
  }

  return "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]";
}

export default function ActivityTeamsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [items, setItems] = useState<Team[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const showToast = useCallback(
    (type: Toast["type"], message: string) => {
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
      .from("activity_teams")
      .select("*")
      .eq("school_id", currentSchool.id)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      setItems([]);
      return;
    }

    setItems((data ?? []) as Team[]);
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

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setShowForm(false);
  }, []);

  const editItem = useCallback((item: Team) => {
    setForm({
      id: item.id,
      team_name: item.team_name || item.title || "",
      description: item.description || "",
      supervisor_name: item.supervisor_name || "",
      status: item.status || "نشط",
    });

    setShowForm(true);
  }, []);

  const saveItem = useCallback(async () => {
    if (!currentSchool?.id) {
      showToast("error", "تعذر تحديد المدرسة.");
      return;
    }

    if (!form.team_name.trim()) {
      showToast("error", "أدخل اسم الفريق.");
      return;
    }

    setSaving(true);

    const payload = {
      school_id: currentSchool.id,
      team_name: form.team_name.trim(),
      title: form.team_name.trim(),
      description: form.description.trim() || null,
      supervisor_name: form.supervisor_name.trim() || null,
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    const result = form.id
      ? await supabase
          .from("activity_teams")
          .update(payload)
          .eq("id", form.id)
          .eq("school_id", currentSchool.id)
      : await supabase.from("activity_teams").insert(payload);

    setSaving(false);

    if (result.error) {
      showToast("error", result.error.message);
      return;
    }

    showToast(
      "success",
      form.id ? "تم تحديث الفريق." : "تمت إضافة الفريق.",
    );

    resetForm();
    void loadData();
  }, [currentSchool?.id, form, loadData, resetForm, showToast]);

  const deleteItem = useCallback(
    async (item: Team) => {
      if (!currentSchool?.id) return;

      const confirmed = window.confirm(
        `حذف الفريق "${item.team_name || item.title || "فريق"}"؟`,
      );

      if (!confirmed) return;

      const { error } = await supabase
        .from("activity_teams")
        .delete()
        .eq("id", item.id)
        .eq("school_id", currentSchool.id);

      if (error) {
        showToast("error", error.message);
        return;
      }

      showToast("success", "تم حذف الفريق.");
      void loadData();
    },
    [currentSchool?.id, loadData, showToast],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const searchableText = [
        item.team_name,
        item.title,
        item.description,
        item.supervisor_name,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesStatus =
        statusFilter === "الكل" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.status === "نشط").length,
      forming: items.filter((item) => item.status === "قيد التكوين").length,
      completed: items.filter((item) => item.status === "منجز").length,
    }),
    [items],
  );

  const exportExcel = useCallback(async () => {
    await exportTableToExcel({
      title: "فرق النشاط",
      schoolName:
        currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "قائمة فرق النشاط",
      headers: [
        "الفريق",
        "المشرف",
        "الحالة",
        "الوصف",
        "تاريخ الإنشاء",
      ],
      rows: filteredItems.map((item) => [
        item.team_name || item.title || "-",
        item.supervisor_name || "-",
        item.status || "-",
        item.description || "-",
        formatDate(item.created_at),
      ]),
      fileName: "activity-teams.xlsx",
    });

    showToast("success", "تم تصدير Excel.");
  }, [
    currentSchool?.school_name,
    filteredItems,
    showToast,
  ]);

  const exportPDF = useCallback(() => {
    exportTableToPDF({
      title: "فرق النشاط",
      schoolName:
        currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "قائمة فرق النشاط",
      headers: [
        "الفريق",
        "المشرف",
        "الحالة",
        "تاريخ الإنشاء",
      ],
      rows: filteredItems.map((item) => [
        item.team_name || item.title || "-",
        item.supervisor_name || "-",
        item.status || "-",
        formatDate(item.created_at),
      ]),
      fileName: "activity-teams.pdf",
    });

    showToast("success", "تم تجهيز PDF.");
  }, [
    currentSchool?.school_name,
    filteredItems,
    showToast,
  ]);

  const activeProgress = stats.total
    ? Math.round((stats.active / stats.total) * 100)
    : 0;

  const formingProgress = stats.total
    ? Math.round((stats.forming / stats.total) * 100)
    : 0;

  const completedProgress = stats.total
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل فرق النشاط..." />
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
            title="فرق النشاط"
            description="إدارة الفرق والمشرفين."
            badge="رائد النشاط"
            icon={<Users size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الأنشطة", href: "/activities" },
              { label: "فرق النشاط" },
            ]}
            meta={[
              {
                label: "المدرسة",
                value: currentSchool?.school_name || "غير متوفر",
              },
              { label: "الإجمالي", value: stats.total },
              { label: "النشطة", value: stats.active },
            ]}
            stats={[
              {
                label: "الفرق",
                value: stats.total,
                icon: <Users size={20} aria-hidden="true" />,
                tone: "primary",
              },
              {
                label: "النشطة",
                value: stats.active,
                icon: <CheckCircle2 size={20} aria-hidden="true" />,
                tone: "green",
              },
              {
                label: "قيد التكوين",
                value: stats.forming,
                icon: <Loader2 size={20} aria-hidden="true" />,
                tone: "gold",
              },
              {
                label: "المنجزة",
                value: stats.completed,
                icon: <Users size={20} aria-hidden="true" />,
                tone: "slate",
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
            aria-label="مؤشرات فرق النشاط"
          >
            <ExecutiveCard
              title="الفرق"
              value={stats.total}
              subtitle="الإجمالي"
              icon={<Users size={22} aria-hidden="true" />}
              tone="primary"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="النشطة"
              value={stats.active}
              subtitle="مفعلة"
              icon={<CheckCircle2 size={22} aria-hidden="true" />}
              tone="green"
              progress={activeProgress}
            />

            <ExecutiveCard
              title="قيد التكوين"
              value={stats.forming}
              subtitle="تحت الإعداد"
              icon={<Loader2 size={22} aria-hidden="true" />}
              tone="gold"
              progress={formingProgress}
            />

            <ExecutiveCard
              title="المنجزة"
              value={stats.completed}
              subtitle="مكتملة"
              icon={<Users size={22} aria-hidden="true" />}
              tone="slate"
              progress={completedProgress}
            />
          </section>

          {showForm ? (
            <Section
              title={form.id ? "تعديل فريق" : "إضافة فريق"}
              icon={<Edit size={22} aria-hidden="true" />}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Field
                  label="اسم الفريق"
                  value={form.team_name}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      team_name: value,
                    }))
                  }
                  required
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

                <SelectField
                  label="الحالة"
                  value={form.status}
                  options={STATUS_OPTIONS}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value,
                    }))
                  }
                />
              </div>

              <div className="mt-3">
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
            </Section>
          ) : null}

          <Section
            title="البحث والتصفية"
            icon={<Search size={22} aria-hidden="true" />}
          >
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_200px_auto_auto]">
              <SearchField value={search} onChange={setSearch} />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="تصفية حسب حالة الفريق"
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
          </Section>

          <section
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-label="قائمة فرق النشاط"
          >
            {filteredItems.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState
                  title="لا توجد نتائج"
                  description="غيّر البحث أو أضف فريقًا."
                  icon={<Search size={28} aria-hidden="true" />}
                />
              </div>
            ) : (
              filteredItems.map((item) => (
                <TeamCard
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
        aria-label="البحث في فرق النشاط"
        className={`${fieldClassName} pr-10`}
      />
    </div>
  );
}

function TeamCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Team;
  onEdit: (item: Team) => void;
  onDelete: (item: Team) => Promise<void>;
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
          فريق نشاط
        </span>
      </div>

      <h3 className="text-xl font-black text-[var(--app-text)]">
        {item.team_name || item.title || "فريق نشاط"}
      </h3>

      <p className="mt-2 line-clamp-2 text-sm leading-7 text-[var(--app-text-muted)]">
        {item.description || "لا يوجد وصف."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <InfoBox
          label="المشرف"
          value={item.supervisor_name || "—"}
        />

        <InfoBox
          label="تاريخ الإنشاء"
          value={formatDate(item.created_at)}
        />
      </div>

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
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const id = `team-field-${label}`;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
        {label}
      </span>

      <input
        id={id}
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
  const id = `team-select-${label}`;

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
  const id = `team-textarea-${label}`;

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

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] px-4 py-3">
      <p className="text-xs font-bold text-[var(--app-text-muted)]">
        {label}
      </p>

      <p className="mt-1 line-clamp-1 font-black text-[var(--app-text)]">
        {value}
      </p>
    </div>
  );
}


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
  Link as LinkIcon,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
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

type Toast = {
  type: "success" | "error";
  message: string;
};

type Activity = {
  id: string;
  title?: string | null;
  activity_name?: string | null;
};

type Competition = {
  id: string;
  title?: string | null;
  competition_name?: string | null;
};

type OptionItem = {
  id: string;
  label: string;
};

type ActivityReport = {
  id: string;
  school_id: string;
  activity_id?: string | null;
  competition_id?: string | null;
  title?: string | null;
  report_type?: string | null;
  report_date?: string | null;
  summary?: string | null;
  recommendations?: string | null;
  file_url?: string | null;
  created_by?: string | null;
  created_at?: string | null;
};

type FormState = {
  id?: string;
  activity_id: string;
  competition_id: string;
  title: string;
  report_type: string;
  report_date: string;
  summary: string;
  recommendations: string;
  file_url: string;
  created_by: string;
};

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "activity_leader",
];

const REPORT_TYPES = [
  "تقرير نشاط",
  "تقرير مسابقة",
  "تقرير إنجاز",
  "تقرير مشاركة",
  "تقرير ختامي",
  "تقرير شهري",
  "تقرير فصلي",
] as const;

const LINK_TYPES = ["نشاط", "مسابقة", "عام"] as const;

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm(): FormState {
  return {
    activity_id: "",
    competition_id: "",
    title: "",
    report_type: "تقرير نشاط",
    report_date: getTodayIso(),
    summary: "",
    recommendations: "",
    file_url: "",
    created_by: "",
  };
}

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

function optionLabel(
  id: string | null | undefined,
  options: OptionItem[],
) {
  if (!id) return "—";

  return options.find((item) => item.id === id)?.label || "—";
}

function getReportLinkType(item: ActivityReport) {
  if (item.competition_id) return "مسابقة";
  if (item.activity_id) return "نشاط";
  return "عام";
}

function getReportTypeClass(type?: string | null) {
  const value = String(type || "");

  if (value.includes("إنجاز")) {
    return "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
  }

  if (value.includes("مسابقة")) {
    return "bg-[color-mix(in_srgb,var(--app-warning)_14%,transparent)] text-[var(--app-warning-foreground)]";
  }

  if (value.includes("ختامي") || value.includes("فصلي")) {
    return "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]";
  }

  return "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]";
}

function isValidExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ActivityReportsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [items, setItems] = useState<ActivityReport[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  const [form, setForm] = useState<FormState>(() => createEmptyForm());
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [linkFilter, setLinkFilter] = useState("الكل");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const activityOptions = useMemo<OptionItem[]>(
    () =>
      activities.map((item) => ({
        id: item.id,
        label: item.title || item.activity_name || "نشاط",
      })),
    [activities],
  );

  const competitionOptions = useMemo<OptionItem[]>(
    () =>
      competitions.map((item) => ({
        id: item.id,
        label: item.title || item.competition_name || "مسابقة",
      })),
    [competitions],
  );

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
      setActivities([]);
      setCompetitions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const [reportsResult, activitiesResult, competitionsResult] =
      await Promise.all([
        supabase
          .from("activity_reports")
          .select("*")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("activities")
          .select("id, title, activity_name")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("activity_competitions")
          .select("id, title, competition_name")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false }),
      ]);

    setLoading(false);

    if (reportsResult.error) {
      setErrorMsg(reportsResult.error.message);
      setItems([]);
      return;
    }

    setItems((reportsResult.data ?? []) as ActivityReport[]);
    setActivities(
      activitiesResult.error
        ? []
        : ((activitiesResult.data ?? []) as Activity[]),
    );
    setCompetitions(
      competitionsResult.error
        ? []
        : ((competitionsResult.data ?? []) as Competition[]),
    );
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
    setForm(createEmptyForm());
    setShowForm(false);
  }, []);

  const editItem = useCallback((item: ActivityReport) => {
    setForm({
      id: item.id,
      activity_id: item.activity_id || "",
      competition_id: item.competition_id || "",
      title: item.title || "",
      report_type: item.report_type || "تقرير نشاط",
      report_date: item.report_date || getTodayIso(),
      summary: item.summary || "",
      recommendations: item.recommendations || "",
      file_url: item.file_url || "",
      created_by: item.created_by || "",
    });

    setShowForm(true);
  }, []);

  const saveItem = useCallback(async () => {
    if (!currentSchool?.id) {
      showToast("error", "تعذر تحديد المدرسة.");
      return;
    }

    if (!form.title.trim()) {
      showToast("error", "أدخل عنوان التقرير.");
      return;
    }

    if (!form.summary.trim()) {
      showToast("error", "أدخل ملخص التقرير.");
      return;
    }

    if (form.file_url.trim() && !isValidExternalUrl(form.file_url.trim())) {
      showToast("error", "رابط الملف غير صالح.");
      return;
    }

    setSaving(true);

    const payload = {
      school_id: currentSchool.id,
      activity_id: form.activity_id || null,
      competition_id: form.competition_id || null,
      title: form.title.trim(),
      report_type: form.report_type,
      report_date: form.report_date || getTodayIso(),
      summary: form.summary.trim(),
      recommendations: form.recommendations.trim() || null,
      file_url: form.file_url.trim() || null,
      created_by: form.created_by.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = form.id
      ? await supabase
          .from("activity_reports")
          .update(payload)
          .eq("id", form.id)
          .eq("school_id", currentSchool.id)
      : await supabase.from("activity_reports").insert(payload);

    setSaving(false);

    if (result.error) {
      showToast("error", result.error.message);
      return;
    }

    showToast(
      "success",
      form.id ? "تم تحديث التقرير." : "تمت إضافة التقرير.",
    );

    resetForm();
    void loadData();
  }, [currentSchool?.id, form, loadData, resetForm, showToast]);

  const deleteItem = useCallback(
    async (item: ActivityReport) => {
      if (!currentSchool?.id) return;

      const confirmed = window.confirm(
        `حذف التقرير "${item.title || "تقرير"}"؟`,
      );

      if (!confirmed) return;

      const { error } = await supabase
        .from("activity_reports")
        .delete()
        .eq("id", item.id)
        .eq("school_id", currentSchool.id);

      if (error) {
        showToast("error", error.message);
        return;
      }

      showToast("success", "تم حذف التقرير.");
      void loadData();
    },
    [currentSchool?.id, loadData, showToast],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const linkType = getReportLinkType(item);

      const searchableText = [
        item.title,
        item.report_type,
        item.report_date,
        item.summary,
        item.recommendations,
        item.created_by,
        optionLabel(item.activity_id, activityOptions),
        optionLabel(item.competition_id, competitionOptions),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesType =
        typeFilter === "الكل" || item.report_type === typeFilter;

      const matchesLink =
        linkFilter === "الكل" || linkFilter === linkType;

      return matchesSearch && matchesType && matchesLink;
    });
  }, [
    activityOptions,
    competitionOptions,
    items,
    linkFilter,
    search,
    typeFilter,
  ]);

  const stats = useMemo(
    () => ({
      total: items.length,
      activityReports: items.filter((item) => item.activity_id).length,
      competitionReports: items.filter((item) => item.competition_id).length,
      withFiles: items.filter((item) => Boolean(item.file_url)).length,
    }),
    [items],
  );

  const exportExcel = useCallback(async () => {
    await exportTableToExcel({
      title: "تقارير النشاط",
      schoolName:
        currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "قائمة تقارير النشاط الطلابي",
      headers: [
        "العنوان",
        "نوع التقرير",
        "التاريخ",
        "النشاط",
        "المسابقة",
        "المعد",
        "الملخص",
        "التوصيات",
        "رابط الملف",
      ],
      rows: filteredItems.map((item) => [
        item.title || "-",
        item.report_type || "-",
        item.report_date || "-",
        optionLabel(item.activity_id, activityOptions),
        optionLabel(item.competition_id, competitionOptions),
        item.created_by || "-",
        item.summary || "-",
        item.recommendations || "-",
        item.file_url || "-",
      ]),
      fileName: "activity-reports.xlsx",
    });

    showToast("success", "تم تصدير Excel.");
  }, [
    activityOptions,
    competitionOptions,
    currentSchool?.school_name,
    filteredItems,
    showToast,
  ]);

  const exportPDF = useCallback(() => {
    exportTableToPDF({
      title: "تقارير النشاط",
      schoolName:
        currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "قائمة تقارير النشاط الطلابي",
      headers: [
        "العنوان",
        "النوع",
        "التاريخ",
        "النشاط",
        "المسابقة",
        "المعد",
      ],
      rows: filteredItems.map((item) => [
        item.title || "-",
        item.report_type || "-",
        item.report_date || "-",
        optionLabel(item.activity_id, activityOptions),
        optionLabel(item.competition_id, competitionOptions),
        item.created_by || "-",
      ]),
      fileName: "activity-reports.pdf",
    });

    showToast("success", "تم تجهيز PDF.");
  }, [
    activityOptions,
    competitionOptions,
    currentSchool?.school_name,
    filteredItems,
    showToast,
  ]);

  const activityProgress = stats.total
    ? Math.round((stats.activityReports / stats.total) * 100)
    : 0;

  const competitionProgress = stats.total
    ? Math.round((stats.competitionReports / stats.total) * 100)
    : 0;

  const filesProgress = stats.total
    ? Math.round((stats.withFiles / stats.total) * 100)
    : 0;

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل التقارير..." />
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
            title="تقارير النشاط"
            description="إنشاء التقارير ومتابعتها."
            badge="رائد النشاط"
            icon={<FileText size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الأنشطة", href: "/activities" },
              { label: "التقارير" },
            ]}
            meta={[
              {
                label: "المدرسة",
                value: currentSchool?.school_name || "غير متوفر",
              },
              { label: "الإجمالي", value: stats.total },
              { label: "تقارير الأنشطة", value: stats.activityReports },
              { label: "تقارير المسابقات", value: stats.competitionReports },
            ]}
            stats={[
              {
                label: "التقارير",
                value: stats.total,
                icon: <FileText size={20} aria-hidden="true" />,
                tone: "primary",
              },
              {
                label: "الأنشطة",
                value: stats.activityReports,
                icon: <CheckCircle2 size={20} aria-hidden="true" />,
                tone: "green",
              },
              {
                label: "المسابقات",
                value: stats.competitionReports,
                icon: <FileText size={20} aria-hidden="true" />,
                tone: "gold",
              },
              {
                label: "الملفات",
                value: stats.withFiles,
                icon: <LinkIcon size={20} aria-hidden="true" />,
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
            aria-label="مؤشرات التقارير"
          >
            <ExecutiveCard
              title="التقارير"
              value={stats.total}
              subtitle="الإجمالي"
              icon={<FileText size={22} aria-hidden="true" />}
              tone="primary"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="تقارير الأنشطة"
              value={stats.activityReports}
              subtitle="مرتبطة بنشاط"
              icon={<CheckCircle2 size={22} aria-hidden="true" />}
              tone="green"
              progress={activityProgress}
            />

            <ExecutiveCard
              title="تقارير المسابقات"
              value={stats.competitionReports}
              subtitle="مرتبطة بمسابقة"
              icon={<FileText size={22} aria-hidden="true" />}
              tone="gold"
              progress={competitionProgress}
            />

            <ExecutiveCard
              title="ملفات مرفقة"
              value={stats.withFiles}
              subtitle="روابط ملفات"
              icon={<LinkIcon size={22} aria-hidden="true" />}
              tone="slate"
              progress={filesProgress}
            />
          </section>

          {showForm ? (
            <PageSection
              title={form.id ? "تعديل تقرير" : "إضافة تقرير"}
              icon={<Edit size={22} aria-hidden="true" />}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field
                  label="عنوان التقرير"
                  value={form.title}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      title: value,
                    }))
                  }
                  required
                />

                <SelectField
                  label="نوع التقرير"
                  value={form.report_type}
                  options={REPORT_TYPES}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      report_type: value,
                    }))
                  }
                />

                <Field
                  label="تاريخ التقرير"
                  type="date"
                  value={form.report_date}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      report_date: value,
                    }))
                  }
                />

                <Field
                  label="معد التقرير"
                  value={form.created_by}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      created_by: value,
                    }))
                  }
                />

                <IdSelectField
                  label="النشاط المرتبط"
                  value={form.activity_id}
                  options={activityOptions}
                  placeholder="بدون نشاط"
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      activity_id: value,
                    }))
                  }
                />

                <IdSelectField
                  label="المسابقة المرتبطة"
                  value={form.competition_id}
                  options={competitionOptions}
                  placeholder="بدون مسابقة"
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      competition_id: value,
                    }))
                  }
                />

                <Field
                  label="رابط الملف"
                  type="url"
                  value={form.file_url}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      file_url: value,
                    }))
                  }
                />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <TextAreaField
                  label="الملخص"
                  value={form.summary}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      summary: value,
                    }))
                  }
                  required
                />

                <TextAreaField
                  label="التوصيات"
                  value={form.recommendations}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      recommendations: value,
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
                onChange={(event) =>
                  setTypeFilter(event.target.value)
                }
                aria-label="تصفية حسب نوع التقرير"
                className={fieldClassName}
              >
                <option value="الكل">كل الأنواع</option>
                {REPORT_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={linkFilter}
                onChange={(event) =>
                  setLinkFilter(event.target.value)
                }
                aria-label="تصفية حسب نوع الارتباط"
                className={fieldClassName}
              >
                <option value="الكل">كل الارتباطات</option>
                {LINK_TYPES.map((item) => (
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
            aria-label="قائمة التقارير"
          >
            {filteredItems.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState
                  title="لا توجد نتائج"
                  description="غيّر البحث أو أضف تقريرًا."
                  icon={<Search size={28} aria-hidden="true" />}
                />
              </div>
            ) : (
              filteredItems.map((item) => (
                <ReportCard
                  key={item.id}
                  item={item}
                  activityOptions={activityOptions}
                  competitionOptions={competitionOptions}
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
        aria-label="البحث في التقارير"
        className={`${fieldClassName} pr-10`}
      />
    </div>
  );
}

function ReportCard({
  item,
  activityOptions,
  competitionOptions,
  onEdit,
  onDelete,
}: {
  item: ActivityReport;
  activityOptions: OptionItem[];
  competitionOptions: OptionItem[];
  onEdit: (item: ActivityReport) => void;
  onDelete: (item: ActivityReport) => Promise<void>;
}) {
  return (
    <article className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--app-shadow-md)]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${getReportTypeClass(
            item.report_type,
          )}`}
        >
          {item.report_type || "تقرير"}
        </span>

        <span className="rounded-full bg-[var(--app-card-soft)] px-3 py-1 text-xs font-bold text-[var(--app-text-muted)]">
          {formatDate(item.report_date)}
        </span>

        <span className="rounded-full bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] px-3 py-1 text-xs font-black text-[var(--app-primary)]">
          {getReportLinkType(item)}
        </span>
      </div>

      <h3 className="text-xl font-black text-[var(--app-text)]">
        {item.title || "تقرير نشاط"}
      </h3>

      <p className="mt-2 line-clamp-3 text-sm leading-7 text-[var(--app-text-muted)]">
        {item.summary || "لا يوجد ملخص."}
      </p>

      <div className="mt-4 grid gap-2 text-sm">
        <InfoBox
          label="النشاط"
          value={optionLabel(item.activity_id, activityOptions)}
        />

        <InfoBox
          label="المسابقة"
          value={optionLabel(
            item.competition_id,
            competitionOptions,
          )}
        />

        <InfoBox
          label="معد التقرير"
          value={item.created_by || "—"}
        />
      </div>

      {item.recommendations ? (
        <div className="mt-3 rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-3">
          <p className="mb-1 text-xs font-bold text-[var(--app-text-subtle)]">
            التوصيات
          </p>

          <p className="line-clamp-3 text-sm leading-7 text-[var(--app-text-muted)]">
            {item.recommendations}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {item.file_url && isValidExternalUrl(item.file_url) ? (
          <a
            href={item.file_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 text-xs font-black text-[var(--app-primary)] transition hover:bg-[var(--app-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
          >
            <LinkIcon size={15} aria-hidden="true" />
            الملف
          </a>
        ) : null}

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
  const id = `report-field-${label}`;

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
  const id = `report-select-${label}`;

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

function IdSelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: OptionItem[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const id = `report-id-select-${label}`;

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
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
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
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const id = `report-textarea-${label}`;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
        {label}
      </span>

      <textarea
        id={id}
        value={value}
        required={required}
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


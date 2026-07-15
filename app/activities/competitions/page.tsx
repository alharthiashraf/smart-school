"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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

import AppShell from "@/components/layout/AppShell";
import AuthGuard from "@/components/auth/AuthGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";
import type { SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { ExportEngine } from "@/core";

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

const PAGE_ROLES: SchoolRole[] = ["super_admin", "school_admin", "activity_leader"];

const emptyForm: FormState = {
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
];

const STATUS_OPTIONS = [
  "قيد التخطيط",
  "مفتوحة للتسجيل",
  "قيد التنفيذ",
  "منفذة",
  "مؤجلة",
  "ملغية",
];

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusStyle(status?: string | null) {
  const value = String(status || "");

  if (["منفذة", "معتمدة"].includes(value)) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (["قيد التخطيط", "مفتوحة للتسجيل", "قيد التنفيذ", "مؤجلة"].includes(value)) {
    return "bg-amber-50 text-amber-700";
  }

  if (["ملغية", "مرفوضة"].includes(value)) {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
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
  const [form, setForm] = useState<FormState>(emptyForm);
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
    window.setTimeout(() => setToast(null), 3000);
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

    setItems((data || []) as Competition[]);
  }, [currentSchool?.id]);

  useEffect(() => {
    if (!schoolLoading) void loadData();
  }, [schoolLoading, loadData]);

  function resetForm() {
    setForm(emptyForm);
    setShowForm(false);
  }

  function editItem(item: Competition) {
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
  }

  async function saveItem() {
    if (!currentSchool?.id) return;

    if (!form.title.trim()) {
      showToast("error", "اكتب اسم المسابقة أولًا");
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

    showToast("success", form.id ? "تم تحديث المسابقة" : "تم إضافة المسابقة");
    resetForm();
    void loadData();
  }

  async function deleteItem(item: Competition) {
    if (!currentSchool?.id) return;

    const ok = window.confirm(`هل تريد حذف المسابقة: ${getCompetitionTitle(item)}؟`);
    if (!ok) return;

    const { error } = await supabase
      .from("activity_competitions")
      .delete()
      .eq("id", item.id)
      .eq("school_id", currentSchool.id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    showToast("success", "تم حذف المسابقة");
    void loadData();
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const text = `
        ${item.title || ""}
        ${item.competition_name || ""}
        ${item.description || ""}
        ${item.competition_type || ""}
        ${item.status || ""}
        ${item.location || ""}
        ${item.result || ""}
        ${item.notes || ""}
      `.toLowerCase();

      const matchesSearch = !q || text.includes(q);
      const matchesStatus = statusFilter === "الكل" || item.status === statusFilter;
      const matchesType = typeFilter === "الكل" || item.competition_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [items, search, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      active: items.filter((item) =>
        ["مفتوحة للتسجيل", "قيد التنفيذ"].includes(String(item.status || "")),
      ).length,
      done: items.filter((item) => item.status === "منفذة").length,
      delayed: items.filter((item) => item.status === "مؤجلة").length,
    };
  }, [items]);

  function exportExcel() {
    ExportEngine.excel("activity-competitions", toExportRows(filteredItems), [
      { header: "المسابقة", key: "title" },
      { header: "النوع", key: "type" },
      { header: "الحالة", key: "status" },
      { header: "التاريخ", key: "date" },
      { header: "الموقع", key: "location" },
      { header: "النتيجة", key: "result" },
      { header: "ملاحظات", key: "notes" },
    ]);

    showToast("success", "تم تصدير Excel");
  }

  function exportPDF() {
    ExportEngine.pdf("مسابقات النشاط", toExportRows(filteredItems), [
      { header: "المسابقة", key: "title" },
      { header: "النوع", key: "type" },
      { header: "الحالة", key: "status" },
      { header: "التاريخ", key: "date" },
      { header: "الموقع", key: "location" },
      { header: "النتيجة", key: "result" },
    ]);

    showToast("success", "تم تجهيز PDF");
  }

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
            description="إدارة المسابقات المدرسية والداخلية والخارجية، وتوثيق النتائج والإنجازات ضمن بوابة رائد النشاط."
            badge="الأنشطة المدرسية"
            icon={<Trophy size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الأنشطة", href: "/activities" },
              { label: "المسابقات" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "غير متوفر" },
              { label: "إجمالي المسابقات", value: stats.total },
              { label: "المنفذة", value: stats.done },
              { label: "قيد التنفيذ", value: stats.active },
            ]}
            stats={[
              { label: "الإجمالي", value: stats.total, icon: <Trophy size={20} />, tone: "blue" },
              { label: "قيد التنفيذ", value: stats.active, icon: <CalendarDays size={20} />, tone: "gold" },
              { label: "منفذة", value: stats.done, icon: <CheckCircle2 size={20} />, tone: "green" },
              { label: "مؤجلة", value: stats.delayed, icon: <Award size={20} />, tone: stats.delayed > 0 ? "red" : "green" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Plus size={17} />
                  إضافة مسابقة
                </button>

                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>
              </>
            }
          />

          {errorMsg && <ErrorState description={errorMsg} />}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ExecutiveCard title="إجمالي المسابقات" value={stats.total} subtitle="كل المسابقات المسجلة" icon={<Trophy size={22} />} tone="blue" progress={stats.total > 0 ? 100 : 0} />
            <ExecutiveCard title="قيد التنفيذ" value={stats.active} subtitle="مفتوحة أو جارية" icon={<CalendarDays size={22} />} tone="gold" progress={stats.total ? Math.round((stats.active / stats.total) * 100) : 0} />
            <ExecutiveCard title="منفذة" value={stats.done} subtitle="مسابقات مكتملة" icon={<CheckCircle2 size={22} />} tone="green" progress={stats.total ? Math.round((stats.done / stats.total) * 100) : 0} />
            <ExecutiveCard title="مؤجلة" value={stats.delayed} subtitle="تحتاج متابعة" icon={<Award size={22} />} tone={stats.delayed > 0 ? "red" : "green"} progress={stats.total ? Math.round((stats.delayed / stats.total) * 100) : 0} />
          </section>

          <SummaryCard
            title="ملخص المسابقات"
            description="قراءة سريعة لحالة المسابقات المدرسية حسب البيانات والفلاتر الحالية."
            tone={stats.delayed > 0 ? "gold" : "green"}
            items={[
              { label: "الإجمالي", value: stats.total },
              { label: "قيد التنفيذ", value: stats.active },
              { label: "منفذة", value: stats.done },
              { label: "مؤجلة", value: stats.delayed },
              { label: "نتائج ظاهرة", value: filteredItems.length },
              { label: "نوع الفلتر", value: typeFilter },
            ]}
            footer="توثيق نتائج المسابقات يساعد في إبراز إنجازات المدرسة وربطها بملف النشاط والجودة."
          />

          {showForm && (
            <Panel title={form.id ? "تعديل مسابقة" : "إضافة مسابقة"} icon={<Edit size={22} />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <InputBox label="اسم المسابقة" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
                <SelectBox label="نوع المسابقة" value={form.competition_type} options={COMPETITION_TYPES} onChange={(value) => setForm({ ...form, competition_type: value })} />
                <SelectBox label="الحالة" value={form.status} options={STATUS_OPTIONS} onChange={(value) => setForm({ ...form, status: value })} />
                <InputBox label="تاريخ المسابقة" type="date" value={form.competition_date} onChange={(value) => setForm({ ...form, competition_date: value })} />
                <InputBox label="الموقع" value={form.location} onChange={(value) => setForm({ ...form, location: value })} />
                <InputBox label="النتيجة" value={form.result} onChange={(value) => setForm({ ...form, result: value })} />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <TextareaBox label="وصف المسابقة" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
                <TextareaBox label="ملاحظات" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveItem()}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />}
                  حفظ
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <XCircle size={16} />
                  إلغاء
                </button>
              </div>
            </Panel>
          )}

          <PageToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "بحث في المسابقات...",
            }}
            filters={
              <>
                <ToolbarSelect value={typeFilter} onChange={setTypeFilter}>
                  <option value="الكل">كل الأنواع</option>
                  {COMPETITION_TYPES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </ToolbarSelect>

                <ToolbarSelect value={statusFilter} onChange={setStatusFilter}>
                  <option value="الكل">كل الحالات</option>
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </ToolbarSelect>
              </>
            }
            onRefresh={() => void loadData()}
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState
                  title="لا توجد مسابقات مطابقة"
                  description="جرّب تغيير البحث أو الفلاتر، أو أضف مسابقة جديدة."
                  icon={<Search className="h-7 w-7" />}
                />
              </div>
            ) : (
              filteredItems.map((item) => (
                <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusStyle(item.status)}`}>
                      {item.status || "غير محدد"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {item.competition_type || "مسابقة"}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-[#15445A]">
                    {getCompetitionTitle(item)}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500">
                    {item.description || "لا يوجد وصف."}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <InfoBox label="التاريخ" value={formatDate(item.competition_date)} />
                    <InfoBox label="الموقع" value={item.location || "—"} />
                    <InfoBox label="النتيجة" value={item.result || "—"} />
                    <InfoBox label="تاريخ الإنشاء" value={formatDate(item.created_at)} />
                  </div>

                  {item.notes && (
                    <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-7 text-slate-600">
                      {item.notes}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => editItem(item)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-[#15445A] transition hover:bg-slate-50"
                    >
                      <Edit size={15} />
                      تعديل
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteItem(item)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 transition hover:bg-red-100"
                    >
                      <Trash2 size={15} />
                      حذف
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </main>
      </AppShell>
    </AuthGuard>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          {icon}
        </div>
        <h2 className="text-xl font-black text-[#15445A]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InputBox({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-[#15445A] outline-none transition focus:border-[#0DA9A6] focus:bg-white"
      />
    </label>
  );
}

function SelectBox({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-[#15445A] outline-none transition focus:border-[#0DA9A6] focus:bg-white"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function TextareaBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-600">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#15445A] outline-none transition focus:border-[#0DA9A6] focus:bg-white"
      />
    </label>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-1 font-black text-[#15445A]">{value}</p>
    </div>
  );
}

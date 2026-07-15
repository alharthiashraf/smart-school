"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";
import UiPrimaryButton from "@/components/ui/buttons/PrimaryButton";
import UiSecondaryButton from "@/components/ui/buttons/SecondaryButton";
import RoleGuard from "@/components/auth/RoleGuard";
import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

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

type ActivityToast = { type: "success" | "error"; message: string };


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

const emptyForm: FormState = {
  title: "",
  activity_type: "ط«ظ‚ط§ظپظٹ",
  description: "",
  status: "ظ†ط´ط·",
  start_date: "",
  end_date: "",
  location: "",
  supervisor_name: "",
  target_group: "",
  notes: "",
};

const ACTIVITY_TYPES = [
  "ط«ظ‚ط§ظپظٹ",
  "ط±ظٹط§ط¶ظٹ",
  "ط¹ظ„ظ…ظٹ",
  "ظƒط´ظپظٹ",
  "طھط·ظˆط¹ظٹ",
  "ظپظ†ظٹ",
  "ط§ط¬طھظ…ط§ط¹ظٹ",
  "ظ…ظ‡ط§ط±ظٹ",
  "ظˆط·ظ†ظٹ",
  "طµط­ظٹ",
];

const STATUS_OPTIONS = ["ظ†ط´ط·", "ظ‚ظٹط¯ ط§ظ„طھط®ط·ظٹط·", "ظ…ظ†ظپط°", "ظ…ط¤ط¬ظ„", "ظ…ظ„ط؛ظٹ"];

function formatDate(value?: string | null) {
  if (!value) return "â€”";

  return new Date(value).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusStyle(status?: string | null) {
  const value = String(status || "");

  if (["ظ†ط´ط·", "ظ…ظ†ظپط°", "ظ…ط¹طھظ…ط¯"].includes(value)) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (["ظ‚ظٹط¯ ط§ظ„طھط®ط·ظٹط·", "ظ…ط¤ط¬ظ„"].includes(value)) {
    return "bg-amber-50 text-amber-700";
  }

  if (["ظ…ظ„ط؛ظٹ", "ظ…ط±ظپظˆط¶"].includes(value)) {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
}

export default function ActivitiesManagePage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [items, setItems] = useState<Activity[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ط§ظ„ظƒظ„");
  const [typeFilter, setTypeFilter] = useState("ط§ظ„ظƒظ„");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<ActivityToast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const text = `
        ${item.title || ""}
        ${item.activity_name || ""}
        ${item.activity_type || ""}
        ${item.status || ""}
        ${item.location || ""}
        ${item.supervisor_name || ""}
        ${item.target_group || ""}
        ${item.description || ""}
        ${item.notes || ""}
      `.toLowerCase();

      const matchesSearch = !q || text.includes(q);
      const matchesStatus =
        statusFilter === "ط§ظ„ظƒظ„" || item.status === statusFilter;
      const matchesType =
        typeFilter === "ط§ظ„ظƒظ„" || item.activity_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [items, search, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      active: items.filter((item) => item.status === "ظ†ط´ط·").length,
      done: items.filter((item) => item.status === "ظ…ظ†ظپط°").length,
      planning: items.filter((item) => item.status === "ظ‚ظٹط¯ ط§ظ„طھط®ط·ظٹط·").length,
    };
  }, [items]);

  const loadData = useCallback(async () => {
    if (!currentSchool?.id) return;

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
      return;
    }

    setItems((data || []) as Activity[]);
  }, [currentSchool?.id]);

  useEffect(() => {
    if (!schoolLoading && !currentSchool?.id) {
      setLoading(false);
      return;
    }

    if (currentSchool?.id) {
      void loadData();
    }
  }, [currentSchool?.id, loadData, schoolLoading]);

  function showToast(type: ActivityToast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setForm(emptyForm);
    setShowForm(false);
  }

  function editItem(item: Activity) {
    setForm({
      id: item.id,
      title: item.title || item.activity_name || "",
      activity_type: item.activity_type || "ط«ظ‚ط§ظپظٹ",
      description: item.description || "",
      status: item.status || "ظ†ط´ط·",
      start_date: item.start_date || "",
      end_date: item.end_date || "",
      location: item.location || "",
      supervisor_name: item.supervisor_name || "",
      target_group: item.target_group || "",
      notes: item.notes || "",
    });

    setShowForm(true);
  }

  async function saveItem() {
    if (!currentSchool?.id) {
      showToast("error", "ظ„ظ… ظٹطھظ… طھط­ط¯ظٹط¯ ط§ظ„ظ…ط¯ط±ط³ط© ط§ظ„ط­ط§ظ„ظٹط©");
      return;
    }

    if (!form.title.trim()) {
      showToast("error", "ط§ظƒطھط¨ ط§ط³ظ… ط§ظ„ظ†ط´ط§ط· ط£ظˆظ„ط§ظ‹");
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

    showToast("success", form.id ? "طھظ… طھط­ط¯ظٹط« ط§ظ„ظ†ط´ط§ط·" : "طھظ… ط¥ط¶ط§ظپط© ط§ظ„ظ†ط´ط§ط·");
    resetForm();
    void loadData();
  }

  async function deleteItem(item: Activity) {
    if (!currentSchool?.id) return;

    const title = item.title || item.activity_name || "ظ†ط´ط§ط·";
    const ok = window.confirm(`ظ‡ظ„ طھط±ظٹط¯ ط­ط°ظپ ط§ظ„ظ†ط´ط§ط·: ${title}طں`);

    if (!ok) return;

    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", item.id)
      .eq("school_id", currentSchool.id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    showToast("success", "طھظ… ط­ط°ظپ ط§ظ„ظ†ط´ط§ط·");
    void loadData();
  }

  async function exportExcel() {
    await exportTableToExcel({
      title: "ط¥ط¯ط§ط±ط© ط§ظ„ط£ظ†ط´ط·ط©",
      schoolName: currentSchool?.school_name || "ظ…ظ†طµط© ط§ظ„ظ…ط¯ط±ط³ط© ط§ظ„ط°ظƒظٹط©",
      subtitle: "ظ‚ط§ط¦ظ…ط© ط§ظ„ط£ظ†ط´ط·ط© ط§ظ„ظ…ط¯ط±ط³ظٹط©",
      headers: [
        "ط§ظ„ظ†ط´ط§ط·",
        "ط§ظ„ظ†ظˆط¹",
        "ط§ظ„ط­ط§ظ„ط©",
        "طھط§ط±ظٹط® ط§ظ„ط¨ط¯ط§ظٹط©",
        "طھط§ط±ظٹط® ط§ظ„ظ†ظ‡ط§ظٹط©",
        "ط§ظ„ظ…ظˆظ‚ط¹",
        "ط§ظ„ظ…ط´ط±ظپ",
        "ط§ظ„ظپط¦ط©",
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

    showToast("success", "طھظ… طھطµط¯ظٹط± Excel");
  }

  function exportPDF() {
    exportTableToPDF({
      title: "ط¥ط¯ط§ط±ط© ط§ظ„ط£ظ†ط´ط·ط©",
      schoolName: currentSchool?.school_name || "ظ…ظ†طµط© ط§ظ„ظ…ط¯ط±ط³ط© ط§ظ„ط°ظƒظٹط©",
      subtitle: "ظ‚ط§ط¦ظ…ط© ط§ظ„ط£ظ†ط´ط·ط© ط§ظ„ظ…ط¯ط±ط³ظٹط©",
      headers: ["ط§ظ„ظ†ط´ط§ط·", "ط§ظ„ظ†ظˆط¹", "ط§ظ„ط­ط§ظ„ط©", "ط§ظ„ط¨ط¯ط§ظٹط©", "ط§ظ„ظ†ظ‡ط§ظٹط©", "ط§ظ„ظ…ط´ط±ظپ"],
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

    showToast("success", "طھظ… طھط¬ظ‡ظٹط² PDF");
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط¥ط¯ط§ط±ط© ط§ظ„ط£ظ†ط´ط·ط©..." />
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
            title="ط¥ط¯ط§ط±ط© ط§ظ„ط£ظ†ط´ط·ط©"
            description="ط¥ط¶ط§ظپط© ظˆطھط¹ط¯ظٹظ„ ظˆظ…طھط§ط¨ط¹ط© ط§ظ„ط£ظ†ط´ط·ط© ط§ظ„ظ…ط¯ط±ط³ظٹط© ظˆط§ظ„ط®ط·ط· ظˆط§ظ„ط¨ط±ط§ظ…ط¬ ط¶ظ…ظ† ط¨ظˆط§ط¨ط© ط±ط§ط¦ط¯ ط§ظ„ظ†ط´ط§ط·."
            badge="بوابة رائد النشاط"
            icon={<Sparkles size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الأنشطة", href: "/activities" },
              { label: "إدارة الأنشطة" },
            ]}
            stats={[
              { label: "الإجمالي", value: stats.total, icon: <Sparkles size={20} />, tone: "blue" },
              { label: "النشطة", value: stats.active, icon: <CheckCircle2 size={20} />, tone: "green" },
              { label: "المنفذة", value: stats.done, icon: <CalendarDays size={20} />, tone: "gold" },
              { label: "قيد التخطيط", value: stats.planning, icon: <Loader2 size={20} />, tone: "primary" },
            ]}
            actions={
              <>
                <PrimaryButton onClick={() => setShowForm(true)}>
                  <Plus size={16} />
                  ط¥ط¶ط§ظپط© ظ†ط´ط§ط·
                </PrimaryButton>

                <SecondaryButton onClick={() => void loadData()}>
                  <RefreshCcw size={16} />
                  طھط­ط¯ظٹط«
                </SecondaryButton>
              </>
            }
          />

          {errorMsg && <ErrorState description={errorMsg} />}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ExecutiveCard title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط£ظ†ط´ط·ط©" value={stats.total} subtitle="كل الأنشطة" icon={<Sparkles size={22} />} tone="blue" progress={stats.total > 0 ? 100 : 0} />
            <ExecutiveCard title="ط£ظ†ط´ط·ط© ظ†ط´ط·ط©" value={stats.active} subtitle="نشطة حاليًا" icon={<CheckCircle2 size={22} />} tone="green" progress={stats.total ? Math.round((stats.active / stats.total) * 100) : 0} />
            <ExecutiveCard title="ظ…ظ†ظپط°ط©" value={stats.done} subtitle="أنشطة منفذة" icon={<CalendarDays size={22} />} tone="gold" progress={stats.total ? Math.round((stats.done / stats.total) * 100) : 0} />
            <ExecutiveCard title="ظ‚ظٹط¯ ط§ظ„طھط®ط·ظٹط·" value={stats.planning} subtitle="قيد التخطيط" icon={<Loader2 size={22} />} tone="primary" progress={stats.total ? Math.round((stats.planning / stats.total) * 100) : 0} />
          </section>

          {showForm && (
            <ActivityPanel title={form.id ? "طھط¹ط¯ظٹظ„ ظ†ط´ط§ط·" : "ط¥ط¶ط§ظپط© ظ†ط´ط§ط·"} icon={<Edit size={22} />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <ActivityInput label="ط§ط³ظ… ط§ظ„ظ†ط´ط§ط·" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
                <ActivitySelect label="ظ†ظˆط¹ ط§ظ„ظ†ط´ط§ط·" value={form.activity_type} options={ACTIVITY_TYPES} onChange={(value) => setForm({ ...form, activity_type: value })} />
                <ActivitySelect label="ط§ظ„ط­ط§ظ„ط©" value={form.status} options={STATUS_OPTIONS} onChange={(value) => setForm({ ...form, status: value })} />
                <ActivityInput label="طھط§ط±ظٹط® ط§ظ„ط¨ط¯ط§ظٹط©" type="date" value={form.start_date} onChange={(value) => setForm({ ...form, start_date: value })} />
                <ActivityInput label="طھط§ط±ظٹط® ط§ظ„ظ†ظ‡ط§ظٹط©" type="date" value={form.end_date} onChange={(value) => setForm({ ...form, end_date: value })} />
                <ActivityInput label="ط§ظ„ظ…ظˆظ‚ط¹" value={form.location} onChange={(value) => setForm({ ...form, location: value })} />
                <ActivityInput label="ط§ظ„ظ…ط´ط±ظپ" value={form.supervisor_name} onChange={(value) => setForm({ ...form, supervisor_name: value })} />
                <ActivityInput label="ط§ظ„ظپط¦ط© ط§ظ„ظ…ط³طھظ‡ط¯ظپط©" value={form.target_group} onChange={(value) => setForm({ ...form, target_group: value })} />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <ActivityTextarea label="ظˆطµظپ ط§ظ„ظ†ط´ط§ط·" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
                <ActivityTextarea label="ظ…ظ„ط§ط­ط¸ط§طھ" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <PrimaryButton onClick={() => void saveItem()} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />}
                  ط­ظپط¸
                </PrimaryButton>

                <SecondaryButton onClick={resetForm}>
                  <XCircle size={16} />
                  ط¥ظ„ط؛ط§ط،
                </SecondaryButton>
              </div>
            </ActivityPanel>
          )}

          <ActivityPanel title="ط§ظ„ط¨ط­ط« ظˆط§ظ„ظپظ„طھط±ط©" icon={<Search size={22} />}>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_auto_auto]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ط¨ط­ط« ظپظٹ ط§ظ„ط£ظ†ط´ط·ط©..."
                  className="w-full rounded-2xl border border-slate-200 py-3 pr-10 pl-4 text-sm font-bold outline-none transition focus:border-[#d4af37]"
                />
              </div>

              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#d4af37]">
                <option value="ط§ظ„ظƒظ„">ظƒظ„ ط§ظ„ط£ظ†ظˆط§ط¹</option>
                {ACTIVITY_TYPES.map((item) => <option key={item}>{item}</option>)}
              </select>

              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#d4af37]">
                <option value="ط§ظ„ظƒظ„">ظƒظ„ ط§ظ„ط­ط§ظ„ط§طھ</option>
                {STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}
              </select>

              <SecondaryButton onClick={() => void exportExcel()}>Excel</SecondaryButton>

              <SecondaryButton onClick={exportPDF}>
                <FileText size={16} />
                PDF
              </SecondaryButton>
            </div>
          </ActivityPanel>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState title="لا توجد بيانات" description="ظ„ط§ طھظˆط¬ط¯ ط£ظ†ط´ط·ط© ظ…ط·ط§ط¨ظ‚ط©." />
              </div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusStyle(item.status)}`}>
                      {item.status || "ط؛ظٹط± ظ…ط­ط¯ط¯"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {item.activity_type || "ظ†ط´ط§ط·"}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-[#0f1f3d]">
                    {item.title || item.activity_name || "ظ†ط´ط§ط· ظ…ط¯ط±ط³ظٹ"}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500">
                    {item.description || "ظ„ط§ ظٹظˆط¬ط¯ ظˆطµظپ."}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <ActivityInfo label="ط§ظ„ط¨ط¯ط§ظٹط©" value={formatDate(item.start_date)} />
                    <ActivityInfo label="ط§ظ„ظ†ظ‡ط§ظٹط©" value={formatDate(item.end_date)} />
                    <ActivityInfo label="ط§ظ„ظ…ظˆظ‚ط¹" value={item.location || "â€”"} />
                    <ActivityInfo label="ط§ظ„ظ…ط´ط±ظپ" value={item.supervisor_name || "â€”"} />
                  </div>

                  {item.notes && (
                    <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-7 text-slate-600">
                      {item.notes}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <SecondaryButton onClick={() => editItem(item)}>
                      <Edit size={15} />
                      طھط¹ط¯ظٹظ„
                    </SecondaryButton>

                    <DangerButton onClick={() => void deleteItem(item)}>
                      <Trash2 size={15} />
                      ط­ط°ظپ
                    </DangerButton>
                  </div>
                </div>
              ))
            )}
          </section>
        </main>
      </AppShell>
    </RoleGuard>
  );
}


function ActivityPanel({
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
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          {icon}
        </div>
        <h2 className="text-xl font-black text-[#15445A]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ActivityInput({
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
      <span className="mb-2 block text-sm font-black text-[#15445A]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-[#0DA9A6] focus:ring-4 focus:ring-[#0DA9A6]/10"
      />
    </label>
  );
}

function ActivityTextarea({
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
      <span className="mb-2 block text-sm font-black text-[#15445A]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#0DA9A6] focus:ring-4 focus:ring-[#0DA9A6]/10"
      />
    </label>
  );
}

function ActivitySelect({
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
      <span className="mb-2 block text-sm font-black text-[#15445A]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-[#0DA9A6] focus:ring-4 focus:ring-[#0DA9A6]/10"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ActivityInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-1 font-black text-[#15445A]">{value}</p>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <UiPrimaryButton type="button" onClick={onClick} disabled={disabled}>
      {children}
    </UiPrimaryButton>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <UiSecondaryButton type="button" onClick={onClick} disabled={disabled}>
      {children}
    </UiSecondaryButton>
  );
}

function DangerButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100"
    >
      {children}
    </button>
  );
}

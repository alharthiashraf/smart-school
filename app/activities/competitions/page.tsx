"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Edit,
  FileText,
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
import type { SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { ExportEngine } from "@/core";

import {
  ActivityEmpty,
  ActivityError,
  ActivityHero,
  ActivityInfo,
  ActivityInput,
  ActivityLoading,
  ActivityPanel,
  ActivitySelect,
  ActivitySummaryCard,
  ActivityTextarea,
  ActivityToastBox,
  DangerButton,
  DarkButton,
  LightButton,
  PrimaryButton,
  type ActivityToast,
} from "@/components/activities/ActivityPageParts";

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

const PAGE_ROLES: SchoolRole[] = ["super_admin", "school_admin", "activity_leader"];

const emptyForm: FormState = {
  title: "",
  description: "",
  competition_type: "ط«ظ‚ط§ظپظٹط©",
  competition_date: "",
  location: "",
  status: "ظ‚ظٹط¯ ط§ظ„طھط®ط·ظٹط·",
  result: "",
  notes: "",
};

const COMPETITION_TYPES = [
  "ط«ظ‚ط§ظپظٹط©",
  "ط±ظٹط§ط¶ظٹط©",
  "ط¹ظ„ظ…ظٹط©",
  "ظپظ†ظٹط©",
  "ظ…ظ‡ط§ط±ظٹط©",
  "ظˆط·ظ†ظٹط©",
  "طھط·ظˆط¹ظٹط©",
  "طھظ‚ظ†ظٹط©",
  "ظ‚ط±ط¢ظ†ظٹط©",
  "ط£ط®ط±ظ‰",
];

const STATUS_OPTIONS = [
  "ظ‚ظٹط¯ ط§ظ„طھط®ط·ظٹط·",
  "ظ…ظپطھظˆط­ط© ظ„ظ„طھط³ط¬ظٹظ„",
  "ظ‚ظٹط¯ ط§ظ„طھظ†ظپظٹط°",
  "ظ…ظ†ظپط°ط©",
  "ظ…ط¤ط¬ظ„ط©",
  "ظ…ظ„ط؛ظٹط©",
];

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

  if (["ظ…ظ†ظپط°ط©", "ظ…ط¹طھظ…ط¯ط©"].includes(value)) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (["ظ‚ظٹط¯ ط§ظ„طھط®ط·ظٹط·", "ظ…ظپطھظˆط­ط© ظ„ظ„طھط³ط¬ظٹظ„", "ظ‚ظٹط¯ ط§ظ„طھظ†ظپظٹط°", "ظ…ط¤ط¬ظ„ط©"].includes(value)) {
    return "bg-amber-50 text-amber-700";
  }

  if (["ظ…ظ„ط؛ظٹط©", "ظ…ط±ظپظˆط¶ط©"].includes(value)) {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
}

function getCompetitionTitle(item: Competition) {
  return item.title || item.competition_name || "ظ…ط³ط§ط¨ظ‚ط©";
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
  const [statusFilter, setStatusFilter] = useState("ط§ظ„ظƒظ„");
  const [typeFilter, setTypeFilter] = useState("ط§ظ„ظƒظ„");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<ActivityToast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const showToast = useCallback((type: ActivityToast["type"], message: string) => {
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
      competition_type: item.competition_type || "ط«ظ‚ط§ظپظٹط©",
      competition_date: item.competition_date || "",
      location: item.location || "",
      status: item.status || "ظ‚ظٹط¯ ط§ظ„طھط®ط·ظٹط·",
      result: item.result || "",
      notes: item.notes || "",
    });

    setShowForm(true);
  }

  async function saveItem() {
    if (!currentSchool?.id) return;

    if (!form.title.trim()) {
      showToast("error", "ط§ظƒطھط¨ ط§ط³ظ… ط§ظ„ظ…ط³ط§ط¨ظ‚ط© ط£ظˆظ„ط§ظ‹");
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

    showToast("success", form.id ? "طھظ… طھط­ط¯ظٹط« ط§ظ„ظ…ط³ط§ط¨ظ‚ط©" : "طھظ… ط¥ط¶ط§ظپط© ط§ظ„ظ…ط³ط§ط¨ظ‚ط©");
    resetForm();
    void loadData();
  }

  async function deleteItem(item: Competition) {
    if (!currentSchool?.id) return;

    const ok = window.confirm(`ظ‡ظ„ طھط±ظٹط¯ ط­ط°ظپ ط§ظ„ظ…ط³ط§ط¨ظ‚ط©: ${getCompetitionTitle(item)}طں`);
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

    showToast("success", "طھظ… ط­ط°ظپ ط§ظ„ظ…ط³ط§ط¨ظ‚ط©");
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
      const matchesStatus = statusFilter === "ط§ظ„ظƒظ„" || item.status === statusFilter;
      const matchesType = typeFilter === "ط§ظ„ظƒظ„" || item.competition_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [items, search, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      active: items.filter((item) =>
        ["ظ…ظپطھظˆط­ط© ظ„ظ„طھط³ط¬ظٹظ„", "ظ‚ظٹط¯ ط§ظ„طھظ†ظپظٹط°"].includes(String(item.status || "")),
      ).length,
      done: items.filter((item) => item.status === "ظ…ظ†ظپط°ط©").length,
      delayed: items.filter((item) => item.status === "ظ…ط¤ط¬ظ„ط©").length,
    };
  }, [items]);

  function exportExcel() {
    ExportEngine.excel("activity-competitions", toExportRows(filteredItems), [
      { header: "ط§ظ„ظ…ط³ط§ط¨ظ‚ط©", key: "title" },
      { header: "ط§ظ„ظ†ظˆط¹", key: "type" },
      { header: "ط§ظ„ط­ط§ظ„ط©", key: "status" },
      { header: "ط§ظ„طھط§ط±ظٹط®", key: "date" },
      { header: "ط§ظ„ظ…ظˆظ‚ط¹", key: "location" },
      { header: "ط§ظ„ظ†طھظٹط¬ط©", key: "result" },
      { header: "ظ…ظ„ط§ط­ط¸ط§طھ", key: "notes" },
    ]);

    showToast("success", "طھظ… طھطµط¯ظٹط± Excel");
  }

  function exportPDF() {
    ExportEngine.pdf("ظ…ط³ط§ط¨ظ‚ط§طھ ط§ظ„ظ†ط´ط§ط·", toExportRows(filteredItems), [
      { header: "ط§ظ„ظ…ط³ط§ط¨ظ‚ط©", key: "title" },
      { header: "ط§ظ„ظ†ظˆط¹", key: "type" },
      { header: "ط§ظ„ط­ط§ظ„ط©", key: "status" },
      { header: "ط§ظ„طھط§ط±ظٹط®", key: "date" },
      { header: "ط§ظ„ظ…ظˆظ‚ط¹", key: "location" },
      { header: "ط§ظ„ظ†طھظٹط¬ط©", key: "result" },
    ]);

    showToast("success", "طھظ… طھط¬ظ‡ظٹط² PDF");
  }

  if (schoolLoading || loading) {
    return (
      <AuthGuard roles={PAGE_ROLES}>
        <AppShell>
          <ActivityLoading text="ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھ..." />
        </AppShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard roles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-6" dir="rtl">
          {toast && <ActivityToastBox toast={toast} />}

          <ActivityHero
            title="ط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھ"
            subtitle="ط¥ط¯ط§ط±ط© ط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھ ط§ظ„ظ…ط¯ط±ط³ظٹط© ظˆط§ظ„ط¯ط§ط®ظ„ظٹط© ظˆط§ظ„ط®ط§ط±ط¬ظٹط© ظˆطھظˆط«ظٹظ‚ ط§ظ„ظ†طھط§ط¦ط¬ ظˆط§ظ„ط¥ظ†ط¬ط§ط²ط§طھ ط¶ظ…ظ† ط¨ظˆط§ط¨ط© ط±ط§ط¦ط¯ ط§ظ„ظ†ط´ط§ط·."
            icon={<Trophy size={32} />}
            actions={
              <>
                <PrimaryButton onClick={() => setShowForm(true)}>
                  <Plus size={16} />
                  ط¥ط¶ط§ظپط© ظ…ط³ط§ط¨ظ‚ط©
                </PrimaryButton>

                <DarkButton onClick={() => void loadData()}>
                  <RefreshCcw size={16} />
                  طھط­ط¯ظٹط«
                </DarkButton>
              </>
            }
          />

          {errorMsg && <ActivityError text={errorMsg} />}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ActivitySummaryCard title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھ" value={stats.total} icon={<Trophy size={22} />} color="blue" />
            <ActivitySummaryCard title="ظ‚ظٹط¯ ط§ظ„طھظ†ظپظٹط°" value={stats.active} icon={<CalendarDays size={22} />} color="amber" />
            <ActivitySummaryCard title="ظ…ظ†ظپط°ط©" value={stats.done} icon={<CheckCircle2 size={22} />} color="green" />
            <ActivitySummaryCard title="ظ…ط¤ط¬ظ„ط©" value={stats.delayed} icon={<Award size={22} />} color="red" />
          </section>

          {showForm && (
            <ActivityPanel title={form.id ? "طھط¹ط¯ظٹظ„ ظ…ط³ط§ط¨ظ‚ط©" : "ط¥ط¶ط§ظپط© ظ…ط³ط§ط¨ظ‚ط©"} icon={<Edit size={22} />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <ActivityInput label="ط§ط³ظ… ط§ظ„ظ…ط³ط§ط¨ظ‚ط©" value={form.title} onChange={(value: string) => setForm({ ...form, title: value })} />
                <ActivitySelect label="ظ†ظˆط¹ ط§ظ„ظ…ط³ط§ط¨ظ‚ط©" value={form.competition_type} options={COMPETITION_TYPES} onChange={(value: string) => setForm({ ...form, competition_type: value })} />
                <ActivitySelect label="ط§ظ„ط­ط§ظ„ط©" value={form.status} options={STATUS_OPTIONS} onChange={(value: string) => setForm({ ...form, status: value })} />
                <ActivityInput label="طھط§ط±ظٹط® ط§ظ„ظ…ط³ط§ط¨ظ‚ط©" type="date" value={form.competition_date} onChange={(value: string) => setForm({ ...form, competition_date: value })} />
                <ActivityInput label="ط§ظ„ظ…ظˆظ‚ط¹" value={form.location} onChange={(value: string) => setForm({ ...form, location: value })} />
                <ActivityInput label="ط§ظ„ظ†طھظٹط¬ط©" value={form.result} onChange={(value: string) => setForm({ ...form, result: value })} />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <ActivityTextarea label="ظˆطµظپ ط§ظ„ظ…ط³ط§ط¨ظ‚ط©" value={form.description} onChange={(value: string) => setForm({ ...form, description: value })} />
                <ActivityTextarea label="ظ…ظ„ط§ط­ط¸ط§طھ" value={form.notes} onChange={(value: string) => setForm({ ...form, notes: value })} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <PrimaryButton onClick={() => void saveItem()} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />}
                  ط­ظپط¸
                </PrimaryButton>

                <LightButton onClick={resetForm}>
                  <XCircle size={16} />
                  ط¥ظ„ط؛ط§ط،
                </LightButton>
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
                  placeholder="ط¨ط­ط« ظپظٹ ط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھ..."
                  className="w-full rounded-2xl border border-slate-200 py-3 pr-10 pl-4 text-sm font-bold outline-none transition focus:border-[#d4af37]"
                />
              </div>

              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#d4af37]">
                <option value="ط§ظ„ظƒظ„">ظƒظ„ ط§ظ„ط£ظ†ظˆط§ط¹</option>
                {COMPETITION_TYPES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#d4af37]">
                <option value="ط§ظ„ظƒظ„">ظƒظ„ ط§ظ„ط­ط§ظ„ط§طھ</option>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <LightButton onClick={exportExcel}>Excel</LightButton>

              <LightButton onClick={exportPDF}>
                <FileText size={16} />
                PDF
              </LightButton>
            </div>
          </ActivityPanel>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <ActivityEmpty text="ظ„ط§ طھظˆط¬ط¯ ظ…ط³ط§ط¨ظ‚ط§طھ ظ…ط·ط§ط¨ظ‚ط©." />
              </div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusStyle(item.status)}`}>
                      {item.status || "ط؛ظٹط± ظ…ط­ط¯ط¯"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {item.competition_type || "ظ…ط³ط§ط¨ظ‚ط©"}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-[#0f1f3d]">
                    {getCompetitionTitle(item)}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500">
                    {item.description || "ظ„ط§ ظٹظˆط¬ط¯ ظˆطµظپ."}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <ActivityInfo label="ط§ظ„طھط§ط±ظٹط®" value={formatDate(item.competition_date)} />
                    <ActivityInfo label="ط§ظ„ظ…ظˆظ‚ط¹" value={item.location || "â€”"} />
                    <ActivityInfo label="ط§ظ„ظ†طھظٹط¬ط©" value={item.result || "â€”"} />
                    <ActivityInfo label="طھط§ط±ظٹط® ط§ظ„ط¥ظ†ط´ط§ط،" value={formatDate(item.created_at)} />
                  </div>

                  {item.notes && (
                    <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-7 text-slate-600">
                      {item.notes}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <LightButton onClick={() => editItem(item)}>
                      <Edit size={15} />
                      طھط¹ط¯ظٹظ„
                    </LightButton>

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
    </AuthGuard>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

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
} from "../../../components/activities/ActivityPageParts";

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

const PAGE_ROLES: SchoolRole[] = ["super_admin", "school_admin", "activity_leader"];

const emptyForm: FormState = {
  activity_id: "",
  competition_id: "",
  title: "",
  report_type: "طھظ‚ط±ظٹط± ظ†ط´ط§ط·",
  report_date: new Date().toISOString().slice(0, 10),
  summary: "",
  recommendations: "",
  file_url: "",
  created_by: "",
};

const REPORT_TYPES = [
  "طھظ‚ط±ظٹط± ظ†ط´ط§ط·",
  "طھظ‚ط±ظٹط± ظ…ط³ط§ط¨ظ‚ط©",
  "طھظ‚ط±ظٹط± ط¥ظ†ط¬ط§ط²",
  "طھظ‚ط±ظٹط± ظ…ط´ط§ط±ظƒط©",
  "طھظ‚ط±ظٹط± ط®طھط§ظ…ظٹ",
  "طھظ‚ط±ظٹط± ط´ظ‡ط±ظٹ",
  "طھظ‚ط±ظٹط± ظپطµظ„ظٹ",
];

function formatDate(value?: string | null) {
  if (!value) return "â€”";

  return new Date(value).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function optionLabel(id: string | null | undefined, options: OptionItem[]) {
  if (!id) return "â€”";
  return options.find((item) => item.id === id)?.label || "â€”";
}

function getReportLinkType(item: ActivityReport) {
  if (item.competition_id) return "ظ…ط³ط§ط¨ظ‚ط©";
  if (item.activity_id) return "ظ†ط´ط§ط·";
  return "ط¹ط§ظ…";
}

function reportTypeStyle(type?: string | null) {
  const value = String(type || "");

  if (value.includes("ط¥ظ†ط¬ط§ط²")) return "bg-emerald-50 text-emerald-700";
  if (value.includes("ظ…ط³ط§ط¨ظ‚ط©")) return "bg-amber-50 text-amber-700";
  if (value.includes("ط®طھط§ظ…ظٹ") || value.includes("ظپطµظ„ظٹ")) {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default function ActivityReportsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [items, setItems] = useState<ActivityReport[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ط§ظ„ظƒظ„");
  const [linkFilter, setLinkFilter] = useState("ط§ظ„ظƒظ„");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<ActivityToast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (currentSchool?.id) void loadData();
  }, [currentSchool?.id]);

  const activityOptions = useMemo<OptionItem[]>(() => {
    return activities.map((item) => ({
      id: item.id,
      label: item.title || item.activity_name || "ظ†ط´ط§ط·",
    }));
  }, [activities]);

  const competitionOptions = useMemo<OptionItem[]>(() => {
    return competitions.map((item) => ({
      id: item.id,
      label: item.title || item.competition_name || "ظ…ط³ط§ط¨ظ‚ط©",
    }));
  }, [competitions]);

  function showToast(type: ActivityToast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function loadData() {
    if (!currentSchool?.id) return;

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
      return;
    }

    setItems((reportsResult.data || []) as ActivityReport[]);
    setActivities((activitiesResult.data || []) as Activity[]);
    setCompetitions((competitionsResult.data || []) as Competition[]);
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      report_date: new Date().toISOString().slice(0, 10),
    });
    setShowForm(false);
  }

  function editItem(item: ActivityReport) {
    setForm({
      id: item.id,
      activity_id: item.activity_id || "",
      competition_id: item.competition_id || "",
      title: item.title || "",
      report_type: item.report_type || "طھظ‚ط±ظٹط± ظ†ط´ط§ط·",
      report_date: item.report_date || new Date().toISOString().slice(0, 10),
      summary: item.summary || "",
      recommendations: item.recommendations || "",
      file_url: item.file_url || "",
      created_by: item.created_by || "",
    });

    setShowForm(true);
  }

  async function saveItem() {
    if (!currentSchool?.id) return;

    if (!form.title.trim()) {
      showToast("error", "ط§ظƒطھط¨ ط¹ظ†ظˆط§ظ† ط§ظ„طھظ‚ط±ظٹط± ط£ظˆظ„ط§ظ‹");
      return;
    }

    if (!form.summary.trim()) {
      showToast("error", "ط§ظƒطھط¨ ظ…ظ„ط®طµ ط§ظ„طھظ‚ط±ظٹط± ط£ظˆظ„ط§ظ‹");
      return;
    }

    setSaving(true);

    const payload = {
      school_id: currentSchool.id,
      activity_id: form.activity_id || null,
      competition_id: form.competition_id || null,
      title: form.title.trim(),
      report_type: form.report_type,
      report_date: form.report_date || new Date().toISOString().slice(0, 10),
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

    showToast("success", form.id ? "طھظ… طھط­ط¯ظٹط« ط§ظ„طھظ‚ط±ظٹط±" : "طھظ… ط¥ط¶ط§ظپط© ط§ظ„طھظ‚ط±ظٹط±");
    resetForm();
    void loadData();
  }

  async function deleteItem(item: ActivityReport) {
    if (!currentSchool?.id) return;

    const ok = window.confirm(
      `ظ‡ظ„ طھط±ظٹط¯ ط­ط°ظپ ط§ظ„طھظ‚ط±ظٹط±: ${item.title || "طھظ‚ط±ظٹط±"}طں`
    );

    if (!ok) return;

    const { error } = await supabase
      .from("activity_reports")
      .delete()
      .eq("id", item.id)
      .eq("school_id", currentSchool.id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    showToast("success", "طھظ… ط­ط°ظپ ط§ظ„طھظ‚ط±ظٹط±");
    void loadData();
  }

  async function exportExcel() {
    await exportTableToExcel({
      title: "طھظ‚ط§ط±ظٹط± ط§ظ„ظ†ط´ط§ط·",
      schoolName: currentSchool?.school_name || "ظ…ظ†طµط© ط§ظ„ظ…ط¯ط±ط³ط© ط§ظ„ط°ظƒظٹط©",
      subtitle: "ظ‚ط§ط¦ظ…ط© طھظ‚ط§ط±ظٹط± ط§ظ„ظ†ط´ط§ط· ط§ظ„ط·ظ„ط§ط¨ظٹ",
      headers: [
        "ط§ظ„ط¹ظ†ظˆط§ظ†",
        "ظ†ظˆط¹ ط§ظ„طھظ‚ط±ظٹط±",
        "طھط§ط±ظٹط® ط§ظ„طھظ‚ط±ظٹط±",
        "ط§ظ„ظ†ط´ط§ط·",
        "ط§ظ„ظ…ط³ط§ط¨ظ‚ط©",
        "ط§ظ„ظ…ط¹ط¯",
        "ظ…ظ„ط®طµ",
        "طھظˆطµظٹط§طھ",
        "ط±ط§ط¨ط· ط§ظ„ظ…ظ„ظپ",
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

    showToast("success", "طھظ… طھطµط¯ظٹط± Excel");
  }

  function exportPDF() {
    exportTableToPDF({
      title: "طھظ‚ط§ط±ظٹط± ط§ظ„ظ†ط´ط§ط·",
      schoolName: currentSchool?.school_name || "ظ…ظ†طµط© ط§ظ„ظ…ط¯ط±ط³ط© ط§ظ„ط°ظƒظٹط©",
      subtitle: "ظ‚ط§ط¦ظ…ط© طھظ‚ط§ط±ظٹط± ط§ظ„ظ†ط´ط§ط· ط§ظ„ط·ظ„ط§ط¨ظٹ",
      headers: ["ط§ظ„ط¹ظ†ظˆط§ظ†", "ط§ظ„ظ†ظˆط¹", "ط§ظ„طھط§ط±ظٹط®", "ط§ظ„ظ†ط´ط§ط·", "ط§ظ„ظ…ط³ط§ط¨ظ‚ط©", "ط§ظ„ظ…ط¹ط¯"],
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

    showToast("success", "طھظ… طھط¬ظ‡ظٹط² PDF");
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const linkType = getReportLinkType(item);

      const text = `
        ${item.title || ""}
        ${item.report_type || ""}
        ${item.report_date || ""}
        ${item.summary || ""}
        ${item.recommendations || ""}
        ${item.created_by || ""}
        ${optionLabel(item.activity_id, activityOptions)}
        ${optionLabel(item.competition_id, competitionOptions)}
      `.toLowerCase();

      const matchesSearch = !q || text.includes(q);
      const matchesType = typeFilter === "ط§ظ„ظƒظ„" || item.report_type === typeFilter;
      const matchesLink = linkFilter === "ط§ظ„ظƒظ„" || linkFilter === linkType;

      return matchesSearch && matchesType && matchesLink;
    });
  }, [items, search, typeFilter, linkFilter, activityOptions, competitionOptions]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      activityReports: items.filter((item) => item.activity_id).length,
      competitionReports: items.filter((item) => item.competition_id).length,
      withFiles: items.filter((item) => Boolean(item.file_url)).length,
    };
  }, [items]);

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <ActivityLoading text="ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ طھظ‚ط§ط±ظٹط± ط§ظ„ظ†ط´ط§ط·..." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-6" dir="rtl">
          {toast && <ActivityToastBox toast={toast} />}

          <ActivityHero
            title="طھظ‚ط§ط±ظٹط± ط§ظ„ظ†ط´ط§ط·"
            subtitle="ط¥ظ†ط´ط§ط، ظˆظ…طھط§ط¨ط¹ط© طھظ‚ط§ط±ظٹط± ط§ظ„ط£ظ†ط´ط·ط© ظˆط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھ ظˆطھظˆط«ظٹظ‚ ط§ظ„ط¥ظ†ط¬ط§ط²ط§طھ ظˆط§ظ„طھظˆطµظٹط§طھ ط¶ظ…ظ† ط¨ظˆط§ط¨ط© ط±ط§ط¦ط¯ ط§ظ„ظ†ط´ط§ط·."
            icon={<FileText size={32} />}
            actions={
              <>
                <PrimaryButton onClick={() => setShowForm(true)}>
                  <Plus size={16} />
                  ط¥ط¶ط§ظپط© طھظ‚ط±ظٹط±
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
            <ActivitySummaryCard
              title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„طھظ‚ط§ط±ظٹط±"
              value={stats.total}
              icon={<FileText size={22} />}
              color="blue"
            />

            <ActivitySummaryCard
              title="طھظ‚ط§ط±ظٹط± ط£ظ†ط´ط·ط©"
              value={stats.activityReports}
              icon={<CheckCircle2 size={22} />}
              color="green"
            />

            <ActivitySummaryCard
              title="طھظ‚ط§ط±ظٹط± ظ…ط³ط§ط¨ظ‚ط§طھ"
              value={stats.competitionReports}
              icon={<FileText size={22} />}
              color="amber"
            />

            <ActivitySummaryCard
              title="ظ…ظ„ظپط§طھ ظ…ط±ظپظ‚ط©"
              value={stats.withFiles}
              icon={<LinkIcon size={22} />}
              color="slate"
            />
          </section>

          {showForm && (
            <ActivityPanel
              title={form.id ? "طھط¹ط¯ظٹظ„ طھظ‚ط±ظٹط±" : "ط¥ط¶ط§ظپط© طھظ‚ط±ظٹط±"}
              icon={<Edit size={22} />}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ActivityInput
                  label="ط¹ظ†ظˆط§ظ† ط§ظ„طھظ‚ط±ظٹط±"
                  value={form.title}
                  onChange={(value) => setForm({ ...form, title: value })}
                />

                <ActivitySelect
                  label="ظ†ظˆط¹ ط§ظ„طھظ‚ط±ظٹط±"
                  value={form.report_type}
                  options={REPORT_TYPES}
                  onChange={(value) =>
                    setForm({ ...form, report_type: value })
                  }
                />

                <ActivityInput
                  label="طھط§ط±ظٹط® ط§ظ„طھظ‚ط±ظٹط±"
                  type="date"
                  value={form.report_date}
                  onChange={(value) =>
                    setForm({ ...form, report_date: value })
                  }
                />

                <ActivityInput
                  label="ظ…ط¹ط¯ ط§ظ„طھظ‚ط±ظٹط±"
                  value={form.created_by}
                  onChange={(value) =>
                    setForm({ ...form, created_by: value })
                  }
                />

                <ActivitySelectId
                  label="ط§ظ„ظ†ط´ط§ط· ط§ظ„ظ…ط±طھط¨ط·"
                  value={form.activity_id}
                  options={activityOptions}
                  placeholder="ط¨ط¯ظˆظ† ظ†ط´ط§ط·"
                  onChange={(value) =>
                    setForm({ ...form, activity_id: value })
                  }
                />

                <ActivitySelectId
                  label="ط§ظ„ظ…ط³ط§ط¨ظ‚ط© ط§ظ„ظ…ط±طھط¨ط·ط©"
                  value={form.competition_id}
                  options={competitionOptions}
                  placeholder="ط¨ط¯ظˆظ† ظ…ط³ط§ط¨ظ‚ط©"
                  onChange={(value) =>
                    setForm({ ...form, competition_id: value })
                  }
                />

                <ActivityInput
                  label="ط±ط§ط¨ط· ظ…ظ„ظپ ط§ظ„طھظ‚ط±ظٹط±"
                  value={form.file_url}
                  onChange={(value) => setForm({ ...form, file_url: value })}
                />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <ActivityTextarea
                  label="ظ…ظ„ط®طµ ط§ظ„طھظ‚ط±ظٹط±"
                  value={form.summary}
                  onChange={(value) => setForm({ ...form, summary: value })}
                />

                <ActivityTextarea
                  label="ط§ظ„طھظˆطµظٹط§طھ"
                  value={form.recommendations}
                  onChange={(value) =>
                    setForm({ ...form, recommendations: value })
                  }
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <PrimaryButton onClick={() => void saveItem()} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
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
                <Search
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ط¨ط­ط« ظپظٹ ط§ظ„طھظ‚ط§ط±ظٹط±..."
                  className="w-full rounded-2xl border border-slate-200 py-3 pr-10 pl-4 text-sm font-bold outline-none transition focus:border-[#d4af37]"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#d4af37]"
              >
                <option value="ط§ظ„ظƒظ„">ظƒظ„ ط§ظ„ط£ظ†ظˆط§ط¹</option>
                {REPORT_TYPES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <select
                value={linkFilter}
                onChange={(event) => setLinkFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#d4af37]"
              >
                <option value="ط§ظ„ظƒظ„">ظƒظ„ ط§ظ„ط§ط±طھط¨ط§ط·ط§طھ</option>
                <option value="ظ†ط´ط§ط·">ظ†ط´ط§ط·</option>
                <option value="ظ…ط³ط§ط¨ظ‚ط©">ظ…ط³ط§ط¨ظ‚ط©</option>
                <option value="ط¹ط§ظ…">ط¹ط§ظ…</option>
              </select>

              <LightButton onClick={() => void exportExcel()}>Excel</LightButton>

              <LightButton onClick={exportPDF}>
                <FileText size={16} />
                PDF
              </LightButton>
            </div>
          </ActivityPanel>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <ActivityEmpty text="ظ„ط§ طھظˆط¬ط¯ طھظ‚ط§ط±ظٹط± ظ…ط·ط§ط¨ظ‚ط©." />
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${reportTypeStyle(
                        item.report_type
                      )}`}
                    >
                      {item.report_type || "طھظ‚ط±ظٹط±"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {formatDate(item.report_date)}
                    </span>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      {getReportLinkType(item)}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-[#0f1f3d]">
                    {item.title || "طھظ‚ط±ظٹط± ظ†ط´ط§ط·"}
                  </h3>

                  <p className="mt-2 line-clamp-3 text-sm leading-7 text-slate-500">
                    {item.summary || "ظ„ط§ ظٹظˆط¬ط¯ ظ…ظ„ط®طµ."}
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
                    <ActivityInfo
                      label="ط§ظ„ظ†ط´ط§ط·"
                      value={optionLabel(item.activity_id, activityOptions)}
                    />

                    <ActivityInfo
                      label="ط§ظ„ظ…ط³ط§ط¨ظ‚ط©"
                      value={optionLabel(
                        item.competition_id,
                        competitionOptions
                      )}
                    />

                    <ActivityInfo
                      label="ظ…ط¹ط¯ ط§ظ„طھظ‚ط±ظٹط±"
                      value={item.created_by || "â€”"}
                    />
                  </div>

                  {item.recommendations && (
                    <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                      <p className="mb-1 text-xs font-bold text-slate-400">
                        ط§ظ„طھظˆطµظٹط§طھ
                      </p>

                      <p className="line-clamp-3 text-sm leading-7 text-slate-600">
                        {item.recommendations}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.file_url && (
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:bg-blue-100"
                      >
                        <LinkIcon size={15} />
                        ط§ظ„ظ…ظ„ظپ
                      </a>
                    )}

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
    </RoleGuard>
  );
}

function ActivitySelectId({
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
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-600">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#d4af37]"
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

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
  Award,
  CheckCircle2,
  Edit,
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Trophy,
  UserCheck,
  Users,
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

type Participant = {
  id: string;
  school_id: string;
  activity_id?: string | null;
  team_id?: string | null;
  competition_id?: string | null;
  student_id?: string | null;
  student_name?: string | null;
  class_name?: string | null;
  section?: string | null;
  role?: string | null;
  participation_status?: string | null;
  achievement?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type Activity = {
  id: string;
  title?: string | null;
  activity_name?: string | null;
};

type Team = {
  id: string;
  team_name?: string | null;
  title?: string | null;
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

type FormState = {
  id?: string;
  activity_id: string;
  team_id: string;
  competition_id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  section: string;
  role: string;
  participation_status: string;
  achievement: string;
  notes: string;
};

const PAGE_ROLES: SchoolRole[] = ["super_admin", "school_admin", "activity_leader"];

const emptyForm: FormState = {
  activity_id: "",
  team_id: "",
  competition_id: "",
  student_id: "",
  student_name: "",
  class_name: "",
  section: "",
  role: "ظ…ط´ط§ط±ظƒ",
  participation_status: "ظ…ط´ط§ط±ظƒ",
  achievement: "",
  notes: "",
};

const STATUS_OPTIONS = [
  "ظ…ط´ط§ط±ظƒ",
  "ظ…ط±ط´ط­",
  "ط­ط§ط¶ط±",
  "ط؛ط§ط¦ط¨",
  "ظپط§ط¦ط²",
  "ظ…ظ†ط³ط­ط¨",
  "ظ…ظƒط±ظ…",
];

const ROLE_OPTIONS = [
  "ظ…ط´ط§ط±ظƒ",
  "ظ‚ط§ط¦ط¯ ظپط±ظٹظ‚",
  "ظ…ظ†ط¸ظ…",
  "ظ…ظ…ط«ظ„ ط§ظ„ظ…ط¯ط±ط³ط©",
  "ظپط§ط¦ط²",
  "ظ…ط±ط´ط­",
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

  if (["ظپط§ط¦ط²", "ظ…ظƒط±ظ…", "ط­ط§ط¶ط±"].includes(value)) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (["ظ…ط´ط§ط±ظƒ", "ظ…ط±ط´ط­"].includes(value)) {
    return "bg-blue-50 text-blue-700";
  }

  if (["ط؛ط§ط¦ط¨", "ظ…ظ†ط³ط­ط¨"].includes(value)) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

function optionLabel(id: string | null | undefined, options: OptionItem[]) {
  if (!id) return "â€”";
  return options.find((item) => item.id === id)?.label || "â€”";
}

function getParticipationKind(item: Participant) {
  if (item.competition_id) return "ظ…ط³ط§ط¨ظ‚ط©";
  if (item.team_id) return "ظپط±ظٹظ‚";
  if (item.activity_id) return "ظ†ط´ط§ط·";
  return "ط¹ط§ظ…";
}

export default function ActivityParticipationsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [items, setItems] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ط§ظ„ظƒظ„");
  const [kindFilter, setKindFilter] = useState("ط§ظ„ظƒظ„");

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

  const teamOptions = useMemo<OptionItem[]>(() => {
    return teams.map((item) => ({
      id: item.id,
      label: item.team_name || item.title || "ظپط±ظٹظ‚",
    }));
  }, [teams]);

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

    const [
      participantsResult,
      activitiesResult,
      teamsResult,
      competitionsResult,
    ] = await Promise.all([
      supabase
        .from("activity_participants")
        .select("*")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("activities")
        .select("id, title, activity_name")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("activity_teams")
        .select("id, team_name, title")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("activity_competitions")
        .select("id, title, competition_name")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),
    ]);

    setLoading(false);

    if (participantsResult.error) {
      setErrorMsg(participantsResult.error.message);
      return;
    }

    setItems((participantsResult.data || []) as Participant[]);
    setActivities((activitiesResult.data || []) as Activity[]);
    setTeams((teamsResult.data || []) as Team[]);
    setCompetitions((competitionsResult.data || []) as Competition[]);
  }

  function resetForm() {
    setForm(emptyForm);
    setShowForm(false);
  }

  function editItem(item: Participant) {
    setForm({
      id: item.id,
      activity_id: item.activity_id || "",
      team_id: item.team_id || "",
      competition_id: item.competition_id || "",
      student_id: item.student_id || "",
      student_name: item.student_name || "",
      class_name: item.class_name || "",
      section: item.section || "",
      role: item.role || "ظ…ط´ط§ط±ظƒ",
      participation_status: item.participation_status || "ظ…ط´ط§ط±ظƒ",
      achievement: item.achievement || "",
      notes: item.notes || "",
    });

    setShowForm(true);
  }

  async function saveItem() {
    if (!currentSchool?.id) return;

    if (!form.student_name.trim()) {
      showToast("error", "ط§ظƒطھط¨ ط§ط³ظ… ط§ظ„ط·ط§ظ„ط¨ ط£ظˆظ„ط§ظ‹");
      return;
    }

    if (!form.activity_id && !form.team_id && !form.competition_id) {
      showToast("error", "ط§ط±ط¨ط· ط§ظ„ظ…ط´ط§ط±ظƒط© ط¨ظ†ط´ط§ط· ط£ظˆ ظپط±ظٹظ‚ ط£ظˆ ظ…ط³ط§ط¨ظ‚ط©");
      return;
    }

    setSaving(true);

    const payload = {
      school_id: currentSchool.id,
      activity_id: form.activity_id || null,
      team_id: form.team_id || null,
      competition_id: form.competition_id || null,
      student_id: form.student_id || null,
      student_name: form.student_name.trim(),
      class_name: form.class_name.trim() || null,
      section: form.section.trim() || null,
      role: form.role,
      participation_status: form.participation_status,
      achievement: form.achievement.trim() || null,
      notes: form.notes.trim() || null,
    };

    const result = form.id
      ? await supabase
          .from("activity_participants")
          .update(payload)
          .eq("id", form.id)
          .eq("school_id", currentSchool.id)
      : await supabase.from("activity_participants").insert(payload);

    setSaving(false);

    if (result.error) {
      showToast("error", result.error.message);
      return;
    }

    showToast("success", form.id ? "طھظ… طھط­ط¯ظٹط« ط§ظ„ظ…ط´ط§ط±ظƒط©" : "طھظ… ط¥ط¶ط§ظپط© ط§ظ„ظ…ط´ط§ط±ظƒط©");
    resetForm();
    void loadData();
  }

  async function deleteItem(item: Participant) {
    if (!currentSchool?.id) return;

    const ok = window.confirm(
      `ظ‡ظ„ طھط±ظٹط¯ ط­ط°ظپ ظ…ط´ط§ط±ظƒط© ط§ظ„ط·ط§ظ„ط¨: ${item.student_name || "ط·ط§ظ„ط¨"}طں`
    );

    if (!ok) return;

    const { error } = await supabase
      .from("activity_participants")
      .delete()
      .eq("id", item.id)
      .eq("school_id", currentSchool.id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    showToast("success", "طھظ… ط­ط°ظپ ط§ظ„ظ…ط´ط§ط±ظƒط©");
    void loadData();
  }

  async function exportExcel() {
    await exportTableToExcel({
      title: "ظ…ط´ط§ط±ظƒط§طھ ط§ظ„ظ†ط´ط§ط·",
      schoolName: currentSchool?.school_name || "ظ…ظ†طµط© ط§ظ„ظ…ط¯ط±ط³ط© ط§ظ„ط°ظƒظٹط©",
      subtitle: "ظ‚ط§ط¦ظ…ط© ط§ظ„ط·ظ„ط§ط¨ ط§ظ„ظ…ط´ط§ط±ظƒظٹظ†",
      headers: [
        "ط§ظ„ط·ط§ظ„ط¨",
        "ط§ظ„ظپطµظ„",
        "ط§ظ„ط´ط¹ط¨ط©",
        "ط§ظ„ط¯ظˆط±",
        "ط§ظ„ط­ط§ظ„ط©",
        "ط§ظ„ظ†ط´ط§ط·",
        "ط§ظ„ظپط±ظٹظ‚",
        "ط§ظ„ظ…ط³ط§ط¨ظ‚ط©",
        "ط§ظ„ط¥ظ†ط¬ط§ط²",
      ],
      rows: filteredItems.map((item) => [
        item.student_name || "-",
        item.class_name || "-",
        item.section || "-",
        item.role || "-",
        item.participation_status || "-",
        optionLabel(item.activity_id, activityOptions),
        optionLabel(item.team_id, teamOptions),
        optionLabel(item.competition_id, competitionOptions),
        item.achievement || "-",
      ]),
      fileName: "activity-participations.xlsx",
    });

    showToast("success", "طھظ… طھطµط¯ظٹط± Excel");
  }

  function exportPDF() {
    exportTableToPDF({
      title: "ظ…ط´ط§ط±ظƒط§طھ ط§ظ„ظ†ط´ط§ط·",
      schoolName: currentSchool?.school_name || "ظ…ظ†طµط© ط§ظ„ظ…ط¯ط±ط³ط© ط§ظ„ط°ظƒظٹط©",
      subtitle: "ظ‚ط§ط¦ظ…ط© ط§ظ„ط·ظ„ط§ط¨ ط§ظ„ظ…ط´ط§ط±ظƒظٹظ†",
      headers: ["ط§ظ„ط·ط§ظ„ط¨", "ط§ظ„ظپطµظ„", "ط§ظ„ط¯ظˆط±", "ط§ظ„ط­ط§ظ„ط©", "ط§ظ„ط¥ظ†ط¬ط§ط²"],
      rows: filteredItems.map((item) => [
        item.student_name || "-",
        `${item.class_name || "-"} ${item.section || ""}`,
        item.role || "-",
        item.participation_status || "-",
        item.achievement || "-",
      ]),
      fileName: "activity-participations.pdf",
    });

    showToast("success", "طھظ… طھط¬ظ‡ظٹط² PDF");
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const kind = getParticipationKind(item);

      const text = `
        ${item.student_name || ""}
        ${item.class_name || ""}
        ${item.section || ""}
        ${item.role || ""}
        ${item.participation_status || ""}
        ${item.achievement || ""}
        ${item.notes || ""}
        ${optionLabel(item.activity_id, activityOptions)}
        ${optionLabel(item.team_id, teamOptions)}
        ${optionLabel(item.competition_id, competitionOptions)}
      `.toLowerCase();

      const matchesSearch = !q || text.includes(q);
      const matchesStatus =
        statusFilter === "ط§ظ„ظƒظ„" || item.participation_status === statusFilter;
      const matchesKind = kindFilter === "ط§ظ„ظƒظ„" || kindFilter === kind;

      return matchesSearch && matchesStatus && matchesKind;
    });
  }, [
    items,
    search,
    statusFilter,
    kindFilter,
    activityOptions,
    teamOptions,
    competitionOptions,
  ]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      winners: items.filter((item) =>
        ["ظپط§ط¦ط²", "ظ…ظƒط±ظ…"].includes(String(item.participation_status || ""))
      ).length,
      competitions: items.filter((item) => item.competition_id).length,
      teams: items.filter((item) => item.team_id).length,
    };
  }, [items]);

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <ActivityLoading text="ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط§ظ„ظ…ط´ط§ط±ظƒط§طھ..." />
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
            title="ط§ظ„ظ…ط´ط§ط±ظƒط§طھ"
            subtitle="ط¥ط¯ط§ط±ط© ط§ظ„ط·ظ„ط§ط¨ ط§ظ„ظ…ط´ط§ط±ظƒظٹظ† ظپظٹ ط§ظ„ط£ظ†ط´ط·ط© ظˆط§ظ„ظپط±ظ‚ ظˆط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھ ظˆطھظˆط«ظٹظ‚ ط§ظ„ط¥ظ†ط¬ط§ط²ط§طھ ط¶ظ…ظ† ط¨ظˆط§ط¨ط© ط±ط§ط¦ط¯ ط§ظ„ظ†ط´ط§ط·."
            icon={<UserCheck size={32} />}
            actions={
              <>
                <PrimaryButton onClick={() => setShowForm(true)}>
                  <Plus size={16} />
                  ط¥ط¶ط§ظپط© ظ…ط´ط§ط±ظƒط©
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
              title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط´ط§ط±ظƒط§طھ"
              value={stats.total}
              icon={<Users size={22} />}
              color="blue"
            />

            <ActivitySummaryCard
              title="ظپط§ط¦ط²ظˆظ† ظˆظ…ظƒط±ظ…ظˆظ†"
              value={stats.winners}
              icon={<Trophy size={22} />}
              color="green"
            />

            <ActivitySummaryCard
              title="ظ…ط´ط§ط±ظƒط§طھ ظ…ط³ط§ط¨ظ‚ط§طھ"
              value={stats.competitions}
              icon={<Award size={22} />}
              color="amber"
            />

            <ActivitySummaryCard
              title="ظ…ط´ط§ط±ظƒط§طھ ظپط±ظ‚"
              value={stats.teams}
              icon={<UserCheck size={22} />}
              color="slate"
            />
          </section>

          {showForm && (
            <ActivityPanel
              title={form.id ? "طھط¹ط¯ظٹظ„ ظ…ط´ط§ط±ظƒط©" : "ط¥ط¶ط§ظپط© ظ…ط´ط§ط±ظƒط©"}
              icon={<Edit size={22} />}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ActivityInput
                  label="ط§ط³ظ… ط§ظ„ط·ط§ظ„ط¨"
                  value={form.student_name}
                  onChange={(value) =>
                    setForm({ ...form, student_name: value })
                  }
                />

                <ActivityInput
                  label="ط±ظ‚ظ… ط§ظ„ط·ط§ظ„ط¨ / ID ط§ط®طھظٹط§ط±ظٹ"
                  value={form.student_id}
                  onChange={(value) => setForm({ ...form, student_id: value })}
                />

                <ActivityInput
                  label="ط§ظ„ظپطµظ„"
                  value={form.class_name}
                  onChange={(value) => setForm({ ...form, class_name: value })}
                />

                <ActivityInput
                  label="ط§ظ„ط´ط¹ط¨ط©"
                  value={form.section}
                  onChange={(value) => setForm({ ...form, section: value })}
                />

                <ActivitySelect
                  label="ط§ظ„ط¯ظˆط±"
                  value={form.role}
                  options={ROLE_OPTIONS}
                  onChange={(value) => setForm({ ...form, role: value })}
                />

                <ActivitySelect
                  label="ط§ظ„ط­ط§ظ„ط©"
                  value={form.participation_status}
                  options={STATUS_OPTIONS}
                  onChange={(value) =>
                    setForm({ ...form, participation_status: value })
                  }
                />

                <ActivitySelectId
                  label="ط§ظ„ظ†ط´ط§ط·"
                  value={form.activity_id}
                  options={activityOptions}
                  placeholder="ط¨ط¯ظˆظ† ظ†ط´ط§ط·"
                  onChange={(value) =>
                    setForm({ ...form, activity_id: value })
                  }
                />

                <ActivitySelectId
                  label="ط§ظ„ظپط±ظٹظ‚"
                  value={form.team_id}
                  options={teamOptions}
                  placeholder="ط¨ط¯ظˆظ† ظپط±ظٹظ‚"
                  onChange={(value) => setForm({ ...form, team_id: value })}
                />

                <ActivitySelectId
                  label="ط§ظ„ظ…ط³ط§ط¨ظ‚ط©"
                  value={form.competition_id}
                  options={competitionOptions}
                  placeholder="ط¨ط¯ظˆظ† ظ…ط³ط§ط¨ظ‚ط©"
                  onChange={(value) =>
                    setForm({ ...form, competition_id: value })
                  }
                />

                <ActivityInput
                  label="ط§ظ„ط¥ظ†ط¬ط§ط²"
                  value={form.achievement}
                  onChange={(value) =>
                    setForm({ ...form, achievement: value })
                  }
                />
              </div>

              <div className="mt-3">
                <ActivityTextarea
                  label="ظ…ظ„ط§ط­ط¸ط§طھ"
                  value={form.notes}
                  onChange={(value) => setForm({ ...form, notes: value })}
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
                  placeholder="ط¨ط­ط« ظپظٹ ط§ظ„ظ…ط´ط§ط±ظƒط§طھ..."
                  className="w-full rounded-2xl border border-slate-200 py-3 pr-10 pl-4 text-sm font-bold outline-none transition focus:border-[#d4af37]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#d4af37]"
              >
                <option value="ط§ظ„ظƒظ„">ظƒظ„ ط§ظ„ط­ط§ظ„ط§طھ</option>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <select
                value={kindFilter}
                onChange={(event) => setKindFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#d4af37]"
              >
                <option value="ط§ظ„ظƒظ„">ظƒظ„ ط§ظ„ط§ط±طھط¨ط§ط·ط§طھ</option>
                <option value="ظ†ط´ط§ط·">ظ†ط´ط§ط·</option>
                <option value="ظپط±ظٹظ‚">ظپط±ظٹظ‚</option>
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
                <ActivityEmpty text="ظ„ط§ طھظˆط¬ط¯ ظ…ط´ط§ط±ظƒط§طھ ظ…ط·ط§ط¨ظ‚ط©." />
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${statusStyle(
                        item.participation_status
                      )}`}
                    >
                      {item.participation_status || "ظ…ط´ط§ط±ظƒ"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {item.role || "ظ…ط´ط§ط±ظƒ"}
                    </span>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      {getParticipationKind(item)}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-[#0f1f3d]">
                    {item.student_name || "ط·ط§ظ„ط¨"}
                  </h3>

                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {item.class_name || "ظپطµظ„ ط؛ظٹط± ظ…ط­ط¯ط¯"}
                    {item.section ? ` - ${item.section}` : ""}
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
                    <ActivityInfo
                      label="ط§ظ„ظ†ط´ط§ط·"
                      value={optionLabel(item.activity_id, activityOptions)}
                    />

                    <ActivityInfo
                      label="ط§ظ„ظپط±ظٹظ‚"
                      value={optionLabel(item.team_id, teamOptions)}
                    />

                    <ActivityInfo
                      label="ط§ظ„ظ…ط³ط§ط¨ظ‚ط©"
                      value={optionLabel(
                        item.competition_id,
                        competitionOptions
                      )}
                    />

                    <ActivityInfo
                      label="ط§ظ„ط¥ظ†ط¬ط§ط²"
                      value={item.achievement || "â€”"}
                    />
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

"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/page/PageHeader";
import Section from "@/components/ui/page/PageSection";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";
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
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

import {
  ActivityInfo,
  ActivityInput,
  ActivitySelect,
  ActivityTextarea,
  DangerButton,
  DarkButton,
  LightButton,
  PrimaryButton,
  type ActivityToast,
} from "@/components/activities/ActivityPageParts";

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

const PAGE_ROLES: SchoolRole[] = ["super_admin", "school_admin", "activity_leader"];

const emptyForm: FormState = {
  team_name: "",
  description: "",
  supervisor_name: "",
  status: "ظ†ط´ط·",
};

const STATUS_OPTIONS = ["ظ†ط´ط·", "ظ‚ظٹط¯ ط§ظ„طھظƒظˆظٹظ†", "ظ…طھظˆظ‚ظپ", "ظ…ظ†ط¬ط²"];

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

  if (["ظ†ط´ط·", "ظ…ظ†ط¬ط²"].includes(value)) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (["ظ‚ظٹط¯ ط§ظ„طھظƒظˆظٹظ†"].includes(value)) {
    return "bg-amber-50 text-amber-700";
  }

  if (["ظ…طھظˆظ‚ظپ"].includes(value)) {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
}

export default function ActivityTeamsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [items, setItems] = useState<Team[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ط§ظ„ظƒظ„");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<ActivityToast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (currentSchool?.id) void loadData();
  }, [currentSchool?.id]);

  function showToast(type: ActivityToast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function loadData() {
    if (!currentSchool?.id) return;

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
      return;
    }

    setItems((data || []) as Team[]);
  }

  function resetForm() {
    setForm(emptyForm);
    setShowForm(false);
  }

  function editItem(item: Team) {
    setForm({
      id: item.id,
      team_name: item.team_name || item.title || "",
      description: item.description || "",
      supervisor_name: item.supervisor_name || "",
      status: item.status || "ظ†ط´ط·",
    });

    setShowForm(true);
  }

  async function saveItem() {
    if (!currentSchool?.id) return;

    if (!form.team_name.trim()) {
      showToast("error", "ط§ظƒطھط¨ ط§ط³ظ… ط§ظ„ظپط±ظٹظ‚ ط£ظˆظ„ط§ظ‹");
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

    showToast("success", form.id ? "طھظ… طھط­ط¯ظٹط« ط§ظ„ظپط±ظٹظ‚" : "طھظ… ط¥ط¶ط§ظپط© ط§ظ„ظپط±ظٹظ‚");
    resetForm();
    void loadData();
  }

  async function deleteItem(item: Team) {
    if (!currentSchool?.id) return;

    const ok = window.confirm(
      `ظ‡ظ„ طھط±ظٹط¯ ط­ط°ظپ ط§ظ„ظپط±ظٹظ‚: ${item.team_name || item.title || "ظپط±ظٹظ‚"}طں`
    );

    if (!ok) return;

    const { error } = await supabase
      .from("activity_teams")
      .delete()
      .eq("id", item.id)
      .eq("school_id", currentSchool.id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    showToast("success", "طھظ… ط­ط°ظپ ط§ظ„ظپط±ظٹظ‚");
    void loadData();
  }

  async function exportExcel() {
    await exportTableToExcel({
      title: "ظپط±ظ‚ ط§ظ„ظ†ط´ط§ط·",
      schoolName: currentSchool?.school_name || "ظ…ظ†طµط© ط§ظ„ظ…ط¯ط±ط³ط© ط§ظ„ط°ظƒظٹط©",
      subtitle: "ظ‚ط§ط¦ظ…ط© ظپط±ظ‚ ط§ظ„ظ†ط´ط§ط·",
      headers: ["ط§ظ„ظپط±ظٹظ‚", "ط§ظ„ظ…ط´ط±ظپ", "ط§ظ„ط­ط§ظ„ط©", "ط§ظ„ظˆطµظپ", "طھط§ط±ظٹط® ط§ظ„ط¥ظ†ط´ط§ط،"],
      rows: filteredItems.map((item) => [
        item.team_name || item.title || "-",
        item.supervisor_name || "-",
        item.status || "-",
        item.description || "-",
        formatDate(item.created_at),
      ]),
      fileName: "activity-teams.xlsx",
    });

    showToast("success", "طھظ… طھطµط¯ظٹط± Excel");
  }

  function exportPDF() {
    exportTableToPDF({
      title: "ظپط±ظ‚ ط§ظ„ظ†ط´ط§ط·",
      schoolName: currentSchool?.school_name || "ظ…ظ†طµط© ط§ظ„ظ…ط¯ط±ط³ط© ط§ظ„ط°ظƒظٹط©",
      subtitle: "ظ‚ط§ط¦ظ…ط© ظپط±ظ‚ ط§ظ„ظ†ط´ط§ط·",
      headers: ["ط§ظ„ظپط±ظٹظ‚", "ط§ظ„ظ…ط´ط±ظپ", "ط§ظ„ط­ط§ظ„ط©", "طھط§ط±ظٹط® ط§ظ„ط¥ظ†ط´ط§ط،"],
      rows: filteredItems.map((item) => [
        item.team_name || item.title || "-",
        item.supervisor_name || "-",
        item.status || "-",
        formatDate(item.created_at),
      ]),
      fileName: "activity-teams.pdf",
    });

    showToast("success", "طھظ… طھط¬ظ‡ظٹط² PDF");
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const text = `
        ${item.team_name || ""}
        ${item.title || ""}
        ${item.description || ""}
        ${item.supervisor_name || ""}
        ${item.status || ""}
      `.toLowerCase();

      const matchesSearch = !q || text.includes(q);
      const matchesStatus =
        statusFilter === "ط§ظ„ظƒظ„" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      active: items.filter((item) => item.status === "ظ†ط´ط·").length,
      forming: items.filter((item) => item.status === "ظ‚ظٹط¯ ط§ظ„طھظƒظˆظٹظ†").length,
      completed: items.filter((item) => item.status === "ظ…ظ†ط¬ط²").length,
    };
  }, [items]);

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ظپط±ظ‚ ط§ظ„ظ†ط´ط§ط·..." />
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
            title="ظپط±ظ‚ ط§ظ„ظ†ط´ط§ط·"
            description="ط¥ط¯ط§ط±ط© ظپط±ظ‚ ط§ظ„ظ†ط´ط§ط· ط§ظ„ظ…ط¯ط±ط³ظٹ ظˆط±ط¨ط·ظ‡ط§ ط¨ط§ظ„ظ…ط´ط±ظپظٹظ† ظˆط§ظ„ظ…ط´ط§ط±ظƒظٹظ† ط¶ظ…ظ† ط¨ظˆط§ط¨ط© ط±ط§ط¦ط¯ ط§ظ„ظ†ط´ط§ط·."
            badge="ط¨ظˆط§ط¨ط© ط±ط§ط¦ط¯ ط§ظ„ظ†ط´ط§ط·"
            icon={<Users size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الأنشطة", href: "/activities" },
              { label: "فرق النشاط" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "غير متوفر" },
              { label: "إجمالي الفرق", value: stats.total },
              { label: "الفرق النشطة", value: stats.active },
            ]}
            stats={[
              { label: "ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظپط±ظ‚", value: stats.total, icon: <Users size={20} />, tone: "blue" },
              { label: "ظپط±ظ‚ ظ†ط´ط·ط©", value: stats.active, icon: <CheckCircle2 size={20} />, tone: "green" },
              { label: "ظ‚ظٹط¯ ط§ظ„طھظƒظˆظٹظ†", value: stats.forming, icon: <Loader2 size={20} />, tone: "gold" },
              { label: "ظ…ظ†ط¬ط²ط©", value: stats.completed, icon: <Users size={20} />, tone: "slate" },
            ]}
            actions={
              <>
                <PrimaryButton onClick={() => setShowForm(true)}>
                  <Plus size={16} />
                  ط¥ط¶ط§ظپط© ظپط±ظٹظ‚
                </PrimaryButton>

                <DarkButton onClick={() => void loadData()}>
                  <RefreshCcw size={16} />
                  طھط­ط¯ظٹط«
                </DarkButton>
              </>
            }
          />

          {errorMsg && <ErrorState description={errorMsg} />}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ExecutiveCard
              title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظپط±ظ‚"
              value={stats.total}
              subtitle="إجمالي فرق النشاط"
              icon={<Users size={22} />}
              tone="blue"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="ظپط±ظ‚ ظ†ط´ط·ط©"
              value={stats.active}
              subtitle="فرق مفعلة"
              icon={<CheckCircle2 size={22} />}
              tone="green"
              progress={stats.total ? Math.round((stats.active / stats.total) * 100) : 0}
            />

            <ExecutiveCard
              title="ظ‚ظٹط¯ ط§ظ„طھظƒظˆظٹظ†"
              value={stats.forming}
              subtitle="فرق تحت التكوين"
              icon={<Loader2 size={22} />}
              tone="gold"
              progress={stats.total ? Math.round((stats.forming / stats.total) * 100) : 0}
            />

            <ExecutiveCard
              title="ظ…ظ†ط¬ط²ط©"
              value={stats.completed}
              subtitle="فرق منجزة"
              icon={<Users size={22} />}
              tone="slate"
              progress={stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}
            />
          </section>

          {showForm && (
            <Section
              title={form.id ? "طھط¹ط¯ظٹظ„ ظپط±ظٹظ‚" : "ط¥ط¶ط§ظپط© ظپط±ظٹظ‚"}
              icon={<Edit size={22} />}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <ActivityInput
                  label="ط§ط³ظ… ط§ظ„ظپط±ظٹظ‚"
                  value={form.team_name}
                  onChange={(value) =>
                    setForm({ ...form, team_name: value })
                  }
                />

                <ActivityInput
                  label="ط§ظ„ظ…ط´ط±ظپ"
                  value={form.supervisor_name}
                  onChange={(value) =>
                    setForm({ ...form, supervisor_name: value })
                  }
                />

                <ActivitySelect
                  label="ط§ظ„ط­ط§ظ„ط©"
                  value={form.status}
                  options={STATUS_OPTIONS}
                  onChange={(value) => setForm({ ...form, status: value })}
                />
              </div>

              <div className="mt-3">
                <ActivityTextarea
                  label="ظˆطµظپ ط§ظ„ظپط±ظٹظ‚"
                  value={form.description}
                  onChange={(value) =>
                    setForm({ ...form, description: value })
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
            </Section>
          )}

          <Section title="ط§ظ„ط¨ط­ط« ظˆط§ظ„ظپظ„طھط±ط©" icon={<Search size={22} />}>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_200px_auto_auto]">
              <div className="relative">
                <Search
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ط¨ط­ط« ظپظٹ ط§ظ„ظپط±ظ‚..."
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

              <LightButton onClick={() => void exportExcel()}>Excel</LightButton>

              <LightButton onClick={exportPDF}>
                <FileText size={16} />
                PDF
              </LightButton>
            </div>
          </Section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState title="لا توجد بيانات" description="ظ„ط§ طھظˆط¬ط¯ ظپط±ظ‚ ظ…ط·ط§ط¨ظ‚ط©." />
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
                        item.status
                      )}`}
                    >
                      {item.status || "ط؛ظٹط± ظ…ط­ط¯ط¯"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      ظپط±ظٹظ‚ ظ†ط´ط§ط·
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-[#0f1f3d]">
                    {item.team_name || item.title || "ظپط±ظٹظ‚ ظ†ط´ط§ط·"}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500">
                    {item.description || "ظ„ط§ ظٹظˆط¬ط¯ ظˆطµظپ."}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <ActivityInfo
                      label="ط§ظ„ظ…ط´ط±ظپ"
                      value={item.supervisor_name || "â€”"}
                    />

                    <ActivityInfo
                      label="طھط§ط±ظٹط® ط§ظ„ط¥ظ†ط´ط§ط،"
                      value={formatDate(item.created_at)}
                    />
                  </div>

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

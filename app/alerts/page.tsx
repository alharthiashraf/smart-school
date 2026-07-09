"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/ui/page/PageHeader";
import StatCard from "@/components/ui/cards/StatCard";
import RoleGuard from "@/components/auth/RoleGuard";
import { STAFF_ROLES } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  HeartPulse,
  Loader2,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
  UserRoundSearch,
  XCircle,
} from "lucide-react";

type AlertItem = {
  id: string;
  school_id: string;
  student_id: string | null;
  alert_type: string;
  title: string;
  message: string | null;
  severity: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type Student = {
  id: string;
  full_name: string;
  classroom: string | null;
  section: string | null;
  grade_level: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const TYPE_OPTIONS = [
  { value: "all", label: "ظƒظ„ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ" },
  { value: "attendance", label: "ط§ظ„ط­ط¶ظˆط±" },
  { value: "repeated_absence", label: "ط؛ظٹط§ط¨ ظ…طھظƒط±ط±" },
  { value: "health", label: "طھط­ظˆظٹظ„ طµط­ظٹ" },
  { value: "academic", label: "طھط­طµظٹظ„ ط¯ط±ط§ط³ظٹ" },
  { value: "intervention", label: "طھط¯ط®ظ„ ط¥ط±ط´ط§ط¯ظٹ" },
];

const SEVERITY_LABELS: Record<string, string> = {
  high: "ط¹ط§ظ„ظٹ",
  medium: "ظ…طھظˆط³ط·",
  low: "ظ…ظ†ط®ظپط¶",
};

export default function AlertsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (currentSchool?.id) fetchData();
  }, [currentSchool?.id]);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2500);
  }

  async function fetchData() {
    if (!currentSchool?.id) return;

    setLoading(true);
    setErrorMsg("");

    const [alertsResult, studentsResult] = await Promise.all([
      supabase
        .from("alerts")
        .select("*")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("students")
        .select("id, full_name, classroom, section, grade_level")
        .eq("school_id", currentSchool.id),
    ]);

    setLoading(false);

    if (alertsResult.error) return setErrorMsg(alertsResult.error.message);
    if (studentsResult.error) return setErrorMsg(studentsResult.error.message);

    setAlerts((alertsResult.data as AlertItem[]) || []);
    setStudents((studentsResult.data as Student[]) || []);
  }

  async function markAsRead(id: string) {
    if (!currentSchool?.id) return;

    setWorkingId(id);

    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("id", id)
      .eq("school_id", currentSchool.id);

    setWorkingId(null);

    if (error) {
      showToast("error", error.message);
      return;
    }

    setAlerts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );

    showToast("success", "طھظ… طھط­ط¯ظٹط¯ ط§ظ„طھظ†ط¨ظٹظ‡ ظƒظ…ظ‚ط±ظˆط،");
  }

  async function markAllAsRead() {
    if (!currentSchool?.id) return;

    const unreadIds = alerts.filter((item) => !item.is_read).map((item) => item.id);

    if (unreadIds.length === 0) {
      showToast("success", "ظ„ط§ طھظˆط¬ط¯ طھظ†ط¨ظٹظ‡ط§طھ ط؛ظٹط± ظ…ظ‚ط±ظˆط،ط©");
      return;
    }

    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("school_id", currentSchool.id)
      .in("id", unreadIds);

    if (error) {
      showToast("error", error.message);
      return;
    }

    setAlerts((prev) => prev.map((item) => ({ ...item, is_read: true })));
    showToast("success", "طھظ…طھ ظ‚ط±ط§ط،ط© ط¬ظ…ظٹط¹ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ");
  }

  async function deleteAlert(id: string) {
    if (!currentSchool?.id) return;

    const confirmed = window.confirm("ظ‡ظ„ طھط±ظٹط¯ ط­ط°ظپ ظ‡ط°ط§ ط§ظ„طھظ†ط¨ظٹظ‡طں");
    if (!confirmed) return;

    setWorkingId(id);

    const { error } = await supabase
      .from("alerts")
      .delete()
      .eq("id", id)
      .eq("school_id", currentSchool.id);

    setWorkingId(null);

    if (error) {
      showToast("error", error.message);
      return;
    }

    setAlerts((prev) => prev.filter((item) => item.id !== id));
    showToast("success", "طھظ… ط­ط°ظپ ط§ظ„طھظ†ط¨ظٹظ‡");
  }

  const studentMap = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const filteredAlerts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return alerts.filter((alert) => {
      const student = alert.student_id ? studentMap.get(alert.student_id) : null;

      const text = `
        ${alert.title || ""}
        ${alert.message || ""}
        ${alert.alert_type || ""}
        ${alert.severity || ""}
        ${student?.full_name || ""}
        ${student?.classroom || ""}
        ${student?.section || ""}
        ${student?.grade_level || ""}
      `.toLowerCase();

      const matchesSearch = text.includes(keyword);
      const matchesType = typeFilter === "all" || alert.alert_type === typeFilter;
      const matchesRead =
        readFilter === "all" ||
        (readFilter === "read" && alert.is_read) ||
        (readFilter === "unread" && !alert.is_read);
      const matchesSeverity =
        severityFilter === "all" || alert.severity === severityFilter;

      return matchesSearch && matchesType && matchesRead && matchesSeverity;
    });
  }, [alerts, search, typeFilter, readFilter, severityFilter, studentMap]);

  const today = new Date().toISOString().slice(0, 10);

  const total = alerts.length;
  const unread = alerts.filter((item) => !item.is_read).length;
  const high = alerts.filter((item) => item.severity === "high").length;
  const todayCount = alerts.filter((item) =>
    item.created_at ? item.created_at.slice(0, 10) === today : false
  ).length;

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <LoadingBox />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AppShell>
        <PageContainer className="space-y-5" size="wide">
          <Breadcrumb />
          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="ظ…ط±ظƒط² ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ"
            description="ط´ط§ط´ط© ظ…ظˆط­ط¯ط© ظ„ظ…طھط§ط¨ط¹ط© ط§ظ„ط؛ظٹط§ط¨ ط§ظ„ظ…طھظƒط±ط±طŒ ط§ظ„طھط­ظˆظٹظ„ط§طھ ط§ظ„طµط­ظٹط©طŒ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ ط§ظ„ط£ظƒط§ط¯ظٹظ…ظٹط©طŒ ظˆط§ظ„طھظ†ط¨ظٹظ‡ط§طھ ط¹ط§ظ„ظٹط© ط§ظ„ط®ط·ظˆط±ط©."
            badge="ظ…ظ†طµط© ط§ظ„ظ…ط¯ط§ط±ط³ ط§ظ„ط°ظƒظٹط©"
            icon={<Bell size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "التنبيهات" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "غير محدد" },
              { label: "إجمالي التنبيهات", value: String(total) },
              { label: "غير مقروءة", value: String(unread) },
              { label: "عالية الخطورة", value: String(high) },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void fetchData()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  طھط­ط¯ظٹط«
                </button>

                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  disabled={unread === 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                >
                  <CheckCircle2 size={17} />
                  ظ‚ط±ط§ط،ط© ط§ظ„ظƒظ„
                </button>
              </>
            }
          />

          {errorMsg && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
              {errorMsg}
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ" value={total} icon={<Bell size={22} />} tone="blue" />
            <StatCard title="ط؛ظٹط± ظ…ظ‚ط±ظˆط،ط©" value={unread} icon={<AlertTriangle size={22} />} tone="gold" />
            <StatCard title="ط¹ط§ظ„ظٹط© ط§ظ„ط®ط·ظˆط±ط©" value={high} icon={<ShieldAlert size={22} />} tone="red" />
            <StatCard title="طھظ†ط¨ظٹظ‡ط§طھ ط§ظ„ظٹظˆظ…" value={todayCount} icon={<CheckCircle2 size={22} />} tone="green" />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ط¨ط­ط« ظپظٹ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ..."
                  className="w-full rounded-2xl border border-slate-200 py-3 pr-10 pl-4 text-sm outline-none focus:border-[#d4af37]"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
              >
                {TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
              >
                <option value="all">ظƒظ„ ظ…ط³طھظˆظٹط§طھ ط§ظ„ط®ط·ظˆط±ط©</option>
                <option value="high">ط¹ط§ظ„ظٹ</option>
                <option value="medium">ظ…طھظˆط³ط·</option>
                <option value="low">ظ…ظ†ط®ظپط¶</option>
              </select>

              <select
                value={readFilter}
                onChange={(event) => setReadFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
              >
                <option value="all">ظƒظ„ ط§ظ„ط­ط§ظ„ط§طھ</option>
                <option value="unread">ط؛ظٹط± ظ…ظ‚ط±ظˆط،</option>
                <option value="read">ظ…ظ‚ط±ظˆط،</option>
              </select>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-2xl font-black text-[#0f1f3d]">
              ط³ط¬ظ„ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ
            </h2>

            {filteredAlerts.length === 0 ? (
              <EmptyBox text="ظ„ط§ طھظˆط¬ط¯ طھظ†ط¨ظٹظ‡ط§طھ ظ…ط·ط§ط¨ظ‚ط©." />
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => {
                  const student = alert.student_id
                    ? studentMap.get(alert.student_id)
                    : null;

                  return (
                    <div
                      key={alert.id}
                      className={`rounded-3xl border p-5 ${
                        alert.is_read
                          ? "border-slate-100 bg-white"
                          : "border-[#d4af37]/40 bg-[#d4af37]/5"
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex gap-3">
                          <AlertIcon
                            type={alert.alert_type}
                            severity={alert.severity}
                          />

                          <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black text-[#0f1f3d]">
                                {alert.title}
                              </h3>

                              <TypeBadge type={alert.alert_type} />
                              <SeverityBadge severity={alert.severity} />

                              {!alert.is_read && (
                                <span className="rounded-full bg-[#d4af37] px-3 py-1 text-xs font-black text-[#0f1f3d]">
                                  ط¬ط¯ظٹط¯
                                </span>
                              )}
                            </div>

                            <p className="text-sm leading-7 text-slate-600">
                              {alert.message || "-"}
                            </p>

                            <p className="mt-2 text-xs text-slate-400">
                              ط§ظ„ط·ط§ظ„ط¨: {student?.full_name || "ط؛ظٹط± ظ…ط±طھط¨ط· ط¨ط·ط§ظ„ط¨"} â€”{" "}
                              {student?.classroom || "-"}
                              {student?.section ? ` - ${student.section}` : ""}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {formatDate(alert.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {alert.student_id && (
                            <Link
                              href={`/counselor/student/${alert.student_id}`}
                              className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                            >
                              <UserRoundSearch size={16} />
                              ظپطھط­ ط§ظ„ط·ط§ظ„ط¨
                            </Link>
                          )}

                          {!alert.is_read && (
                            <button
                              onClick={() => markAsRead(alert.id)}
                              disabled={workingId === alert.id}
                              className="inline-flex items-center gap-2 rounded-2xl bg-[#0f1f3d] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                            >
                              <CheckCircle2 size={16} />
                              {workingId === alert.id ? "ط¬ط§ط±ظٹ..." : "ظ…ظ‚ط±ظˆط،"}
                            </button>
                          )}

                          <button
                            onClick={() => deleteAlert(alert.id)}
                            disabled={workingId === alert.id}
                            className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                            ط­ط°ظپ
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </PageContainer>
      </AppShell>
    </RoleGuard>
  );
}

function AlertIcon({
  type,
  severity,
}: {
  type: string;
  severity: string | null;
}) {
  if (type === "health") {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        <HeartPulse size={22} />
      </div>
    );
  }

  if (severity === "high") {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700">
        <ShieldAlert size={22} />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
      <AlertTriangle size={22} />
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const label =
    TYPE_OPTIONS.find((item) => item.value === type)?.label || "طھظ†ط¨ظٹظ‡ ط¹ط§ظ…";

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
      {label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string | null }) {
  const key = severity || "medium";

  const style =
    key === "high"
      ? "bg-red-50 text-red-700"
      : key === "low"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-amber-50 text-amber-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>
      {SEVERITY_LABELS[key] || "ظ…طھظˆط³ط·"}
    </span>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-slate-50 p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-lg ${
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      {toast.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      {toast.message}
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-3xl border bg-white px-6 py-4 text-slate-600 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-[#0f1f3d]" />
        ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ظ…ط±ظƒط² ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ...
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

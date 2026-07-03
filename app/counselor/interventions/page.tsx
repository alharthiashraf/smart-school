"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import { STAFF_ROLES } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  PhoneCall,
  RefreshCcw,
  Search,
  UserRoundCheck,
  XCircle,
} from "lucide-react";

type Student = {
  id: string;
  full_name: string;
  classroom: string | null;
  section: string | null;
  grade_level: string | null;
};

type Intervention = {
  id: string;
  school_id: string;
  student_id: string;
  intervention_type: string | null;
  title: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const STATUS_OPTIONS = ["ظ…ظپطھظˆط­", "ظ‚ظٹط¯ ط§ظ„ظ…طھط§ط¨ط¹ط©", "ظ…ط؛ظ„ظ‚"];
const TYPE_OPTIONS = [
  { value: "parent_call", label: "ط§ط³طھط¯ط¹ط§ط، ظˆظ„ظٹ ط£ظ…ط±" },
  { value: "counseling_session", label: "ط¬ظ„ط³ط© ط¥ط±ط´ط§ط¯ظٹط©" },
  { value: "academic_followup", label: "ظ…طھط§ط¨ط¹ط© ط£ظƒط§ط¯ظٹظ…ظٹط©" },
  { value: "behavior_followup", label: "ظ…طھط§ط¨ط¹ط© ط³ظ„ظˆظƒظٹط©" },
  { value: "health_referral", label: "طھط­ظˆظٹظ„ ظ„ظ„ط¹ظٹط§ط¯ط©" },
];

export default function CounselorInterventionsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [students, setStudents] = useState<Student[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState("parent_call");
  const [title, setTitle] = useState("ط§ط³طھط¯ط¹ط§ط، ظˆظ„ظٹ ط£ظ…ط±");
  const [notes, setNotes] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

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

    const [studentsResult, interventionsResult] = await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, classroom, section, grade_level")
        .eq("school_id", currentSchool.id)
        .order("full_name", { ascending: true }),

      supabase
        .from("student_interventions")
        .select("*")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),
    ]);

    setLoading(false);

    if (studentsResult.error) {
      setErrorMsg(studentsResult.error.message);
      return;
    }

    if (interventionsResult.error) {
      setErrorMsg(interventionsResult.error.message);
      return;
    }

    const loadedStudents = (studentsResult.data as Student[]) || [];
    setStudents(loadedStudents);
    setInterventions((interventionsResult.data as Intervention[]) || []);

    if (!studentId && loadedStudents.length > 0) {
      setStudentId(loadedStudents[0].id);
    }
  }

  function handleTypeChange(value: string) {
    setType(value);
    const selected = TYPE_OPTIONS.find((item) => item.value === value);
    setTitle(selected?.label || "");
  }

  async function createIntervention() {
    if (!currentSchool?.id) return;

    if (!studentId) {
      showToast("error", "ط§ط®طھط± ط§ظ„ط·ط§ظ„ط¨ ط£ظˆظ„ط§ظ‹");
      return;
    }

    if (!title.trim()) {
      showToast("error", "ط§ظƒطھط¨ ط¹ظ†ظˆط§ظ† ط§ظ„طھط¯ط®ظ„");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("student_interventions")
      .insert({
        school_id: currentSchool.id,
        student_id: studentId,
        intervention_type: type,
        title: title.trim(),
        notes: notes.trim() || null,
        status: "ظ…ظپطھظˆط­",
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      showToast("error", error.message);
      return;
    }

    setInterventions((prev) => [data as Intervention, ...prev]);
    setNotes("");
    showToast("success", "طھظ… ط­ظپط¸ ط§ظ„طھط¯ط®ظ„ ط§ظ„ط¥ط±ط´ط§ط¯ظٹ");
  }

  async function updateStatus(id: string, status: string) {
    if (!currentSchool?.id) return;

    const { error } = await supabase
      .from("student_interventions")
      .update({ status })
      .eq("id", id)
      .eq("school_id", currentSchool.id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    setInterventions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );

    showToast("success", "طھظ… طھط­ط¯ظٹط« ط­ط§ظ„ط© ط§ظ„طھط¯ط®ظ„");
  }

  const studentMap = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const filteredInterventions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return interventions.filter((item) => {
      const student = studentMap.get(item.student_id);

      const text = `
        ${item.title || ""}
        ${item.notes || ""}
        ${item.status || ""}
        ${item.intervention_type || ""}
        ${student?.full_name || ""}
        ${student?.classroom || ""}
        ${student?.section || ""}
      `.toLowerCase();

      const matchesSearch = text.includes(keyword);
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const matchesType =
        typeFilter === "all" || item.intervention_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [interventions, search, statusFilter, typeFilter, studentMap]);

  const total = interventions.length;
  const open = interventions.filter((item) => item.status === "ظ…ظپطھظˆط­").length;
  const follow = interventions.filter(
    (item) => item.status === "ظ‚ظٹط¯ ط§ظ„ظ…طھط§ط¨ط¹ط©"
  ).length;
  const closed = interventions.filter((item) => item.status === "ظ…ط؛ظ„ظ‚").length;

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <div className="flex min-h-[55vh] items-center justify-center">
            <div className="flex items-center gap-3 rounded-3xl border bg-white px-6 py-4 text-slate-600 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-[#0f1f3d]" />
              ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط§ظ„طھط¯ط®ظ„ط§طھ ط§ظ„ط¥ط±ط´ط§ط¯ظٹط©...
            </div>
          </div>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AppShell>
        <div className="space-y-5">
          {toast && <ToastBox toast={toast} />}

          <section className="rounded-[30px] bg-[#0f1f3d] p-6 text-white shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="mb-2 text-sm font-bold text-[#d4af37]">
                  ظ…ظ†طµط© ط§ظ„ظ…ط¯ط§ط±ط³ ط§ظ„ط°ظƒظٹط©
                </p>
                <h1 className="text-4xl font-black">ط§ظ„طھط¯ط®ظ„ط§طھ ط§ظ„ط¥ط±ط´ط§ط¯ظٹط©</h1>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  طھط³ط¬ظٹظ„ ظˆظ…طھط§ط¨ط¹ط© ط¬ظ„ط³ط§طھ ط§ظ„ط¥ط±ط´ط§ط¯طŒ ط§ط³طھط¯ط¹ط§ط، ط£ظˆظ„ظٹط§ط، ط§ظ„ط£ظ…ظˆط±طŒ ظˆط§ظ„ظ…طھط§ط¨ط¹ط§طھ ط§ظ„ط£ظƒط§ط¯ظٹظ…ظٹط© ظˆط§ظ„ط³ظ„ظˆظƒظٹط©.
                </p>
              </div>

              <button
                onClick={fetchData}
                className="flex items-center gap-2 rounded-2xl bg-[#d4af37] px-5 py-3 text-sm font-bold text-[#0f1f3d]"
              >
                <RefreshCcw size={17} />
                طھط­ط¯ظٹط«
              </button>
            </div>
          </section>

          {errorMsg && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
              {errorMsg}
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„طھط¯ط®ظ„ط§طھ" value={total} icon={<ClipboardList size={22} />} color="blue" />
            <StatCard title="ظ…ظپطھظˆط­ط©" value={open} icon={<PhoneCall size={22} />} color="amber" />
            <StatCard title="ظ‚ظٹط¯ ط§ظ„ظ…طھط§ط¨ط¹ط©" value={follow} icon={<UserRoundCheck size={22} />} color="red" />
            <StatCard title="ظ…ط؛ظ„ظ‚ط©" value={closed} icon={<CheckCircle2 size={22} />} color="emerald" />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-2xl font-black text-[#0f1f3d]">
              ط¥ط¶ط§ظپط© طھط¯ط®ظ„ ط¬ط¯ظٹط¯
            </h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name}
                  </option>
                ))}
              </select>

              <select
                value={type}
                onChange={(event) => handleTypeChange(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
              >
                {TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="ط¹ظ†ظˆط§ظ† ط§ظ„طھط¯ط®ظ„"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
              />

              <button
                onClick={createIntervention}
                disabled={saving}
                className="rounded-2xl bg-[#0f1f3d] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? "ط¬ط§ط±ظٹ ط§ظ„ط­ظپط¸..." : "ط­ظپط¸ ط§ظ„طھط¯ط®ظ„"}
              </button>
            </div>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="ظ…ظ„ط§ط­ط¸ط§طھ ط§ظ„طھط¯ط®ظ„..."
              className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ط¨ط­ط« ظپظٹ ط§ظ„طھط¯ط®ظ„ط§طھ..."
                  className="w-full rounded-2xl border border-slate-200 py-3 pr-10 pl-4 text-sm outline-none focus:border-[#d4af37]"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
              >
                <option value="all">ظƒظ„ ط£ظ†ظˆط§ط¹ ط§ظ„طھط¯ط®ظ„</option>
                {TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
              >
                <option value="all">ظƒظ„ ط§ظ„ط­ط§ظ„ط§طھ</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {filteredInterventions.length === 0 ? (
              <EmptyBox text="ظ„ط§ طھظˆط¬ط¯ طھط¯ط®ظ„ط§طھ ظ…ط·ط§ط¨ظ‚ط©." />
            ) : (
              <div className="space-y-3">
                {filteredInterventions.map((item) => {
                  const student = studentMap.get(item.student_id);

                  return (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="text-lg font-black text-[#0f1f3d]">
                            {item.title || "طھط¯ط®ظ„ ط¥ط±ط´ط§ط¯ظٹ"}
                          </h3>

                          <p className="mt-1 text-sm text-slate-600">
                            ط§ظ„ط·ط§ظ„ط¨: {student?.full_name || "ط؛ظٹط± ظ…ط¹ط±ظˆظپ"} â€”{" "}
                            {student?.classroom || "-"}
                            {student?.section ? ` - ${student.section}` : ""}
                          </p>

                          {item.notes && (
                            <p className="mt-2 text-sm leading-7 text-slate-500">
                              {item.notes}
                            </p>
                          )}

                          <p className="mt-2 text-xs text-slate-400">
                            {formatDate(item.created_at)}
                          </p>
                        </div>

                        <select
                          value={item.status || "ظ…ظپطھظˆط­"}
                          onChange={(event) =>
                            updateStatus(item.id, event.target.value)
                          }
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#d4af37]"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </AppShell>
    </RoleGuard>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "amber" | "red" | "emerald";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-4xl font-black text-[#0f1f3d]">{value}</h2>
    </div>
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

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

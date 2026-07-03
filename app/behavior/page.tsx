"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import RoleGuard from "@/components/auth/RoleGuard";
import { STAFF_ROLES } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

type Student = {
  id: string;
  school_id: string | null;
  full_name: string;
  grade_level: string | null;
  classroom: string | null;
  section: string | null;
  student_number: string | null;
};

type Violation = {
  id: string;
  school_id: string | null;
  student_id: string;
  violation_title: string;
  violation_degree: number;
  points_deducted: number;
  violation_date: string;
  action_taken: string | null;
  notes: string | null;
  status: string | null;
  reported_by_name: string | null;
  reported_by_role: string | null;
  created_at: string;
  students?: {
    full_name: string;
    grade_level: string | null;
    classroom: string | null;
    section: string | null;
    student_number: string | null;
  } | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const VIOLATION_OPTIONS = [
  { title: "ط§ظ„طھط£ط®ط± ط§ظ„طµط¨ط§ط­ظٹ", degree: 1, points: 1 },
  { title: "ط¹ط¯ظ… ط§ظ„طھظ‚ظٹط¯ ط¨ط§ظ„ط²ظٹ ط§ظ„ظ…ط¯ط±ط³ظٹ", degree: 1, points: 1 },
  { title: "ط§ظ„طھط£ط®ط± ط¹ظ† ط¯ط®ظˆظ„ ط§ظ„ط­طµط©", degree: 1, points: 1 },
  { title: "طھظ†ط§ظˆظ„ ط§ظ„ط£ط·ط¹ظ…ط© ط£ظˆ ط§ظ„ظ…ط´ط±ظˆط¨ط§طھ ط£ط«ظ†ط§ط، ط§ظ„ط¯ط±ط³ ط¨ط¯ظˆظ† ط§ط³طھط¦ط°ط§ظ†", degree: 1, points: 1 },
  { title: "ط§ظ„ظ†ظˆظ… ط¯ط§ط®ظ„ ط§ظ„ظپطµظ„", degree: 1, points: 1 },

  { title: "ط¹ط¯ظ… ط­ط¶ظˆط± ط§ظ„ط­طµط© ط£ظˆ ط§ظ„ظ‡ط±ظˆط¨ ظ…ظ†ظ‡ط§", degree: 2, points: 2 },
  { title: "ط§ظ„ط¯ط®ظˆظ„ ط£ظˆ ط§ظ„ط®ط±ظˆط¬ ظ…ظ† ط§ظ„ظپطµظ„ ط¯ظˆظ† ط§ط³طھط¦ط°ط§ظ†", degree: 2, points: 2 },
  { title: "ط¯ط®ظˆظ„ ظپطµظ„ ط¢ط®ط± ط¯ظˆظ† ط§ط³طھط¦ط°ط§ظ†", degree: 2, points: 2 },
  { title: "ط¥ط«ط§ط±ط© ط§ظ„ظپظˆط¶ظ‰ ط¯ط§ط®ظ„ ط§ظ„ظپطµظ„ ط£ظˆ ط§ظ„ظ…ط¯ط±ط³ط©", degree: 2, points: 2 },
  { title: "ط§ظ„ط´ط¬ط§ط± ط£ظˆ ط§ظ„ط§ط´طھط±ط§ظƒ ظپظٹ ظ…ط¶ط§ط±ط¨ط©", degree: 2, points: 2 },
  { title: "ط§ظ„طھظ„ظپط¸ ط¨ظƒظ„ظ…ط§طھ ط؛ظٹط± ظ„ط§ط¦ظ‚ط©", degree: 2, points: 2 },
  { title: "ط¥ظ„ط­ط§ظ‚ ط§ظ„ط¶ط±ط± ط¨ظ…ظ…طھظ„ظƒط§طھ ط§ظ„ط·ظ„ط¨ط©", degree: 2, points: 2 },
  { title: "ط§ظ„ط¹ط¨ط« ط¨طھط¬ظ‡ظٹط²ط§طھ ط§ظ„ظ…ط¯ط±ط³ط© ط£ظˆ ظ…ط¨ط§ظ†ظٹظ‡ط§", degree: 2, points: 2 },

  { title: "ط¥ظ„ط­ط§ظ‚ ط§ظ„ط¶ط±ط± ط§ظ„ظ…طھط¹ظ…ط¯ ط¨طھط¬ظ‡ظٹط²ط§طھ ط§ظ„ظ…ط¯ط±ط³ط©", degree: 3, points: 3 },
  { title: "ط³ط±ظ‚ط© ط´ظٹط، ظ…ظ† ظ…ظ…طھظ„ظƒط§طھ ط§ظ„ط·ظ„ط¨ط© ط£ظˆ ط§ظ„ظ…ط¯ط±ط³ط©", degree: 3, points: 3 },
  { title: "ط§ظ„طھط¹ط±ط¶ ظ„ط£ط­ط¯ ط§ظ„ط·ظ„ط¨ط© ط¨ط§ظ„ط¶ط±ط¨", degree: 3, points: 3 },
  { title: "ط§ظ„طھطµظˆظٹط± ط£ظˆ ط§ظ„طھط³ط¬ظٹظ„ ط§ظ„طµظˆطھظٹ ظ„ظ„ط·ظ„ط¨ط©", degree: 3, points: 3 },
  { title: "ط§ظ„ظ‡ط±ظˆط¨ ظ…ظ† ط§ظ„ظ…ط¯ط±ط³ط©", degree: 3, points: 3 },
  { title: "ط§ظ„طھظˆظ‚ظٹط¹ ط¹ظ† ظˆظ„ظٹ ط§ظ„ط£ظ…ط± ط¯ظˆظ† ط¹ظ„ظ…ظ‡", degree: 3, points: 3 },
  { title: "ط¥ط­ط¶ط§ط± ط£ظˆ ط§ط³طھط®ط¯ط§ظ… ظ…ظˆط§ط¯ ط£ظˆ ط£ظ„ط¹ط§ط¨ ط®ط·ط±ط©", degree: 3, points: 3 },

  { title: "ط§ظ„ط¥ط³ط§ط،ط© ط£ظˆ ط§ظ„ط§ط³طھظ‡ط²ط§ط، ط¨ط´ظٹط، ظ…ظ† ط´ط¹ط§ط¦ط± ط§ظ„ط¥ط³ظ„ط§ظ…", degree: 4, points: 10 },
  { title: "ط§ظ„ط¥ط³ط§ط،ط© ظ„ظ„ط¯ظˆظ„ط© ط£ظˆ ط±ظ…ظˆط²ظ‡ط§", degree: 4, points: 10 },
  { title: "ط§ظ„طھط­ط±ط´ ط§ظ„ط¬ط³ط¯ظٹ", degree: 4, points: 10 },
  { title: "ط¥ط´ط¹ط§ظ„ ط§ظ„ظ†ط§ط± ط¯ط§ط®ظ„ ط§ظ„ظ…ط¯ط±ط³ط©", degree: 4, points: 10 },
  { title: "ط­ظٹط§ط²ط© ط§ظ„ط³ط¬ط§ط¦ط± ط¨ط£ظ†ظˆط§ط¹ظ‡ط§", degree: 4, points: 10 },
  { title: "ط§ظ„طھط¯ط®ظٹظ† ط¯ط§ط®ظ„ ط§ظ„ظ…ط¯ط±ط³ط©", degree: 4, points: 10 },
  { title: "ط­ظٹط§ط²ط© ط¢ظ„ط© ط­ط§ط¯ط©", degree: 4, points: 10 },
  { title: "ط§ظ„ط¬ط±ط§ط¦ظ… ط§ظ„ظ…ط¹ظ„ظˆظ…ط§طھظٹط©", degree: 4, points: 10 },
  { title: "ط§ظ„طھظ†ظ…ط± ط¨ط¬ظ…ظٹط¹ ط£ظ†ظˆط§ط¹ظ‡", degree: 4, points: 10 },
];

export default function BehaviorPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [students, setStudents] = useState<Student[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [degreeFilter, setDegreeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [selectedViolation, setSelectedViolation] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [notes, setNotes] = useState("");

  const [toast, setToast] = useState<Toast | null>(null);

  const selectedOption = useMemo(() => {
    return VIOLATION_OPTIONS.find((item) => item.title === selectedViolation);
  }, [selectedViolation]);

  useEffect(() => {
    if (!schoolLoading) {
      fetchData();
    }
  }, [schoolLoading, currentSchool?.id]);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function fetchData() {
    setLoading(true);

    try {
      let studentsQuery = supabase
        .from("students")
        .select("id, school_id, full_name, grade_level, classroom, section, student_number")
        .order("full_name", { ascending: true });

      if (currentSchool?.id) {
        studentsQuery = studentsQuery.eq("school_id", currentSchool.id);
      }

      const { data: studentsData, error: studentsError } = await studentsQuery;

      if (studentsError) throw studentsError;

      let violationsQuery = supabase
        .from("student_violations")
        .select(
          `
          *,
          students (
            full_name,
            grade_level,
            classroom,
            section,
            student_number
          )
        `
        )
        .order("created_at", { ascending: false });

      if (currentSchool?.id) {
        violationsQuery = violationsQuery.eq("school_id", currentSchool.id);
      }

      const { data: violationsData, error: violationsError } =
        await violationsQuery;

      if (violationsError) throw violationsError;

      setStudents((studentsData as Student[]) || []);
      setViolations((violationsData as Violation[]) || []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "طھط¹ط°ط± طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط³ظ„ظˆظƒ";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  const filteredViolations = useMemo(() => {
    let list = violations;

    if (degreeFilter !== "all") {
      list = list.filter(
        (item) => item.violation_degree === Number(degreeFilter)
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((item) => (item.status || "ظ…ظپطھظˆط­ط©") === statusFilter);
    }

    const q = search.trim();

    if (q) {
      list = list.filter((item) => {
        return (
          item.violation_title.includes(q) ||
          item.students?.full_name?.includes(q) ||
          item.students?.student_number?.includes(q) ||
          item.action_taken?.includes(q) ||
          item.notes?.includes(q) ||
          item.reported_by_name?.includes(q) ||
          item.reported_by_role?.includes(q)
        );
      });
    }

    return list;
  }, [violations, search, degreeFilter, statusFilter]);

  const totalViolations = violations.length;

  const openViolations = violations.filter(
    (item) => (item.status || "ظ…ظپطھظˆط­ط©") === "ظ…ظپطھظˆط­ط©"
  ).length;

  const followViolations = violations.filter(
    (item) => item.status === "طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©"
  ).length;

  const closedViolations = violations.filter(
    (item) => item.status === "ظ…ط؛ظ„ظ‚ط©"
  ).length;

  const totalDeducted = violations.reduce(
    (sum, item) => sum + Number(item.points_deducted || 0),
    0
  );

  const highViolations = violations.filter(
    (item) => Number(item.violation_degree || 0) >= 3
  ).length;

  async function addViolation() {
    if (!studentId || !selectedOption) {
      showToast("error", "ط§ط®طھط± ط§ظ„ط·ط§ظ„ط¨ ظˆظ†ظˆط¹ ط§ظ„ظ…ط®ط§ظ„ظپط©");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("student_violations").insert({
        school_id: currentSchool?.id || null,
        student_id: studentId,
        violation_title: selectedOption.title,
        violation_degree: selectedOption.degree,
        points_deducted: selectedOption.points,
        violation_date: new Date().toISOString().slice(0, 10),
        action_taken: actionTaken || null,
        notes: notes || null,
        status: "ظ…ظپطھظˆط­ط©",
        reported_by_name: "ظ…ط³طھط®ط¯ظ… ط§ظ„ظ†ط¸ط§ظ…",
        reported_by_role: "ط¥ط¯ط§ط±ط© ط§ظ„ظ…ط¯ط±ط³ط©",
      });

      if (error) throw error;

      setStudentId("");
      setSelectedViolation("");
      setActionTaken("");
      setNotes("");
      setShowForm(false);

      showToast("success", "طھظ… طھط³ط¬ظٹظ„ ط§ظ„ظ…ط®ط§ظ„ظپط© ط¨ظ†ط¬ط§ط­");
      await fetchData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "طھط¹ط°ط± ط­ظپط¸ ط§ظ„ظ…ط®ط§ظ„ظپط©";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function updateViolationStatus(id: string, status: string) {
    try {
      const { error } = await supabase
        .from("student_violations")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      showToast("success", "طھظ… طھط­ط¯ظٹط« ط­ط§ظ„ط© ط§ظ„ظ…ط®ط§ظ„ظپط©");
      await fetchData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "طھط¹ط°ط± طھط­ط¯ظٹط« ط§ظ„ط­ط§ظ„ط©";
      showToast("error", message);
    }
  }

  async function deleteViolation(id: string) {
    const ok = confirm("ظ‡ظ„ طھط±ظٹط¯ ط­ط°ظپ ظ‡ط°ظ‡ ط§ظ„ظ…ط®ط§ظ„ظپط©طں");
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("student_violations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      showToast("success", "طھظ… ط­ط°ظپ ط§ظ„ظ…ط®ط§ظ„ظپط©");
      await fetchData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "طھط¹ط°ط± ط­ط°ظپ ط§ظ„ظ…ط®ط§ظ„ظپط©";
      showToast("error", message);
    }
  }
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
        <div dir="rtl" className="space-y-6">
          {toast && <ToastBox toast={toast} />}

          <PageHeader
          variant="hero"
          title="السلوك والانضباط"
          description="إدارة المخالفات السلوكية، متابعة الإجراءات، وربطها بملف الطالب والتقارير."
          badge="السلوك والمواظبة"
          />

          <section className="hidden">
            <div className="absolute left-0 top-0 h-48 w-48 rounded-full bg-[#C1B489]/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="mb-2 font-bold text-[#C1B489]">
                  ظ…ظ†طµط© ط§ظ„ظ…ط¯ط±ط³ط© ط§ظ„ط°ظƒظٹط©
                </p>

                <h1 className="text-4xl font-black">ط§ظ„ط³ظ„ظˆظƒ ظˆط§ظ„ط§ظ†ط¶ط¨ط§ط·</h1>

                <p className="mt-2 text-slate-300">
                  طھط³ط¬ظٹظ„ ط§ظ„ظ…ط®ط§ظ„ظپط§طھ ط§ظ„ط³ظ„ظˆظƒظٹط© ظˆط±ط¨ط·ظ‡ط§ ط¨ظ…ظ„ظپ ط§ظ„ط·ط§ظ„ط¨ ظˆظ…طھط§ط¨ط¹ط© ط­ط§ظ„طھظ‡ط§.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={fetchData}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 font-bold text-white hover:bg-white/15"
                >
                  <RefreshCcw size={18} />
                  طھط­ط¯ظٹط«
                </button>

                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#C1B489] px-5 py-3 font-bold text-[#15445A]"
                >
                  <Plus size={18} />
                  ط¥ط¶ط§ظپط© ظ…ط®ط§ظ„ظپط©
                </button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
            <ExecutiveCard
              title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط®ط§ظ„ظپط§طھ"
              value={totalViolations}
              icon={<ShieldAlert size={22} />}
              tone="blue"
            />

            <ExecutiveCard
              title="ظ…ظپطھظˆط­ط©"
              value={openViolations}
              icon={<Clock size={22} />}
              tone="gold"
            />

            <ExecutiveCard
              title="طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©"
              value={followViolations}
              icon={<Eye size={22} />}
              tone="green"
            />

            <ExecutiveCard
              title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط­ط³ظ…"
              value={totalDeducted}
              icon={<AlertTriangle size={22} />}
              tone="red"
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ط§ط¨ط­ط« ط¨ط§ط³ظ… ط§ظ„ط·ط§ظ„ط¨ ط£ظˆ ط±ظ‚ظ… ط§ظ„ط·ط§ظ„ط¨ ط£ظˆ ط§ظ„ظ…ط®ط§ظ„ظپط©..."
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              <select
                value={degreeFilter}
                onChange={(e) => setDegreeFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="all">ظƒظ„ ط§ظ„ط¯ط±ط¬ط§طھ</option>
                <option value="1">ط§ظ„ط¯ط±ط¬ط© ط§ظ„ط£ظˆظ„ظ‰</option>
                <option value="2">ط§ظ„ط¯ط±ط¬ط© ط§ظ„ط«ط§ظ†ظٹط©</option>
                <option value="3">ط§ظ„ط¯ط±ط¬ط© ط§ظ„ط«ط§ظ„ط«ط©</option>
                <option value="4">ط§ظ„ط¯ط±ط¬ط© ط§ظ„ط±ط§ط¨ط¹ط©</option>
                <option value="5">ط§ظ„ط¯ط±ط¬ط© ط§ظ„ط®ط§ظ…ط³ط©</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="all">ظƒظ„ ط§ظ„ط­ط§ظ„ط§طھ</option>
                <option value="ظ…ظپطھظˆط­ط©">ظ…ظپطھظˆط­ط©</option>
                <option value="طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©">طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©</option>
                <option value="ظ…ط؛ظ„ظ‚ط©">ظ…ط؛ظ„ظ‚ط©</option>
              </select>
            </div>

            {filteredViolations.length === 0 ? (
              <div className="rounded-3xl bg-slate-50 p-10 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 text-sm font-bold text-slate-500">
                  ظ„ط§ طھظˆط¬ط¯ ظ…ط®ط§ظ„ظپط§طھ ظ…ط·ط§ط¨ظ‚ط©.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-right text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-600">
                      <th className="p-3">ط§ظ„ط·ط§ظ„ط¨</th>
                      <th className="p-3">ط§ظ„طµظپ / ط§ظ„ظپطµظ„</th>
                      <th className="p-3">ط§ظ„ظ…ط®ط§ظ„ظپط©</th>
                      <th className="p-3">ط§ظ„ط¯ط±ط¬ط©</th>
                      <th className="p-3">ط§ظ„ط­ط³ظ…</th>
                      <th className="p-3">ط§ظ„طھط§ط±ظٹط®</th>
                      <th className="p-3">ط§ظ„ط¥ط¬ط±ط§ط،</th>
                      <th className="p-3">ط§ظ„ط­ط§ظ„ط©</th>
                      <th className="p-3">طھط؛ظٹظٹط± ط§ظ„ط­ط§ظ„ط©</th>
                      <th className="p-3">ط­ط°ظپ</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredViolations.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b last:border-0 hover:bg-slate-50"
                      >
                        <td className="p-3">
                          <div className="font-black text-[#15445A]">
                            {item.students?.full_name || "ط؛ظٹط± ظ…ط­ط¯ط¯"}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {item.students?.student_number || "-"}
                          </div>
                        </td>

                        <td className="p-3 text-slate-600">
                          {item.students?.grade_level || "-"}
                          {item.students?.classroom
                            ? ` / ${item.students.classroom}`
                            : ""}
                          {item.students?.section
                            ? ` / ${item.students.section}`
                            : ""}
                        </td>

                        <td className="p-3 font-bold text-slate-700">
                          {item.violation_title}
                        </td>

                        <td className="p-3">
                          <DegreeBadge degree={item.violation_degree} />
                        </td>

                        <td className="p-3 font-black text-red-600">
                          {item.points_deducted}
                        </td>

                        <td className="p-3 text-slate-600">
                          {item.violation_date || "-"}
                        </td>

                        <td className="p-3 text-slate-600">
                          {item.action_taken || "ظ„ظ… ظٹط­ط¯ط¯"}
                        </td>

                        <td className="p-3">
                          <StatusBadge status={item.status || "ظ…ظپطھظˆط­ط©"} />
                        </td>

                        <td className="p-3">
                          <select
                            value={item.status || "ظ…ظپطھظˆط­ط©"}
                            onChange={(e) =>
                              updateViolationStatus(item.id, e.target.value)
                            }
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                          >
                            <option value="ظ…ظپطھظˆط­ط©">ظ…ظپطھظˆط­ط©</option>
                            <option value="طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©">طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©</option>
                            <option value="ظ…ط؛ظ„ظ‚ط©">ظ…ط؛ظ„ظ‚ط©</option>
                          </select>
                        </td>

                        <td className="p-3">
                          <button
                            onClick={() => deleteViolation(item.id)}
                            className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <p>
                ظٹطھظ… طھط³ط¬ظٹظ„ ط§ظ„ظ…ط®ط§ظ„ظپط© ظ‡ظ†ط§طŒ ط«ظ… طھط¸ظ‡ط± ط¯ط§ط®ظ„ ظ…ظ„ظپ ط§ظ„ط·ط§ظ„ط¨ ظپظٹ طµظپط­ط© طھظپط§طµظٹظ„
                ط§ظ„ط·ط§ظ„ط¨ ط¨ط¹ط¯ ط±ط¨ط· ط¬ط¯ظˆظ„ student_violations.
              </p>
            </div>
          </section>

          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-[#15445A]">
                      طھط³ط¬ظٹظ„ ظ…ط®ط§ظ„ظپط© ط¬ط¯ظٹط¯ط©
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      ط§ط®طھط± ط§ظ„ط·ط§ظ„ط¨ ظˆظ†ظˆط¹ ط§ظ„ظ…ط®ط§ظ„ظپط© ظˆط§ظ„ط¥ط¬ط±ط§ط، ط§ظ„ظ…طھط®ط°.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      ط§ظ„ط·ط§ظ„ط¨
                    </label>

                    <select
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="">ط§ط®طھط± ط§ظ„ط·ط§ظ„ط¨</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.full_name}
                          {student.grade_level
                            ? ` - ${student.grade_level}`
                            : ""}
                          {student.classroom ? ` / ${student.classroom}` : ""}
                          {student.section ? ` / ${student.section}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      ظ†ظˆط¹ ط§ظ„ظ…ط®ط§ظ„ظپط©
                    </label>

                    <select
                      value={selectedViolation}
                      onChange={(e) => setSelectedViolation(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="">ط§ط®طھط± ط§ظ„ظ…ط®ط§ظ„ظپط©</option>
                      {VIOLATION_OPTIONS.map((item) => (
                        <option key={item.title} value={item.title}>
                          {item.title} - ط§ظ„ط¯ط±ط¬ط© {item.degree}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      ط§ظ„ط¥ط¬ط±ط§ط، ط§ظ„ظ…طھط®ط°
                    </label>

                    <input
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      placeholder="ظ…ط«ط§ظ„: طھظ†ط¨ظٹظ‡ ط´ظپظ‡ظٹ / ط¥ط´ط¹ط§ط± ظˆظ„ظٹ ط§ظ„ط£ظ…ط± / ط¥ط­ط§ظ„ط© ظ„ظ„ظ…ط±ط´ط¯"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      ظ…ظ„ط§ط­ط¸ط§طھ
                    </label>

                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="ظ…ظ„ط§ط­ط¸ط§طھ ط¥ط¶ط§ظپظٹط©"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                {selectedOption && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                    ط¯ط±ط¬ط© ط§ظ„ظ…ط®ط§ظ„ظپط©: {selectedOption.degree} â€” ظ…ظ‚ط¯ط§ط± ط§ظ„ط­ط³ظ…:{" "}
                    {selectedOption.points} ط¯ط±ط¬ط©
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={addViolation}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#07A869] px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    ط­ظپط¸ ط§ظ„ظ…ط®ط§ظ„ظپط©
                  </button>

                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                  >
                    ط¥ظ„ط؛ط§ط،
                  </button>
                </div>
              </div>
            </div>
          )}
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
  value: string | number;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "amber" | "red";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-500">{title}</p>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${colors[color]}`}
        >
          {icon}
        </div>
      </div>

      <h2 className="text-3xl font-black text-[#15445A]">{value}</h2>
    </div>
  );
}

function DegreeBadge({ degree }: { degree: number }) {
  const style =
    degree >= 4
      ? "bg-red-50 text-red-700"
      : degree >= 3
        ? "bg-amber-50 text-amber-700"
        : "bg-blue-50 text-blue-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      ط§ظ„ط¯ط±ط¬ط© {degree}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "ظ…ط؛ظ„ظ‚ط©"
      ? "bg-emerald-50 text-emerald-700"
      : status === "طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©"
        ? "bg-amber-50 text-amber-700"
        : "bg-blue-50 text-blue-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      {status}
    </span>
  );
}

function LoadingBox() {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-sm">
      <RefreshCcw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#15445A]" />
      ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ طµظپط­ط© ط§ظ„ط³ظ„ظˆظƒ ظˆط§ظ„ط§ظ†ط¶ط¨ط§ط·...
    </div>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-[60] flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl ${
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      <div
        className={`h-2.5 w-2.5 rounded-full ${
          toast.type === "success" ? "bg-emerald-200" : "bg-red-200"
        }`}
      />

      <span>{toast.message}</span>
    </div>
  );
}

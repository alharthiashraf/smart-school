"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageActions from "@/components/layout/PageActions";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
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
  Plus,
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

const STATUS_OPTIONS = ["مفتوح", "قيد المتابعة", "مغلق"];

const TYPE_OPTIONS = [
  { value: "parent_call", label: "استدعاء ولي أمر" },
  { value: "counseling_session", label: "جلسة إرشادية" },
  { value: "academic_followup", label: "متابعة أكاديمية" },
  { value: "behavior_followup", label: "متابعة سلوكية" },
  { value: "health_referral", label: "تحويل للعيادة" },
];

export default function CounselorInterventionsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [students, setStudents] = useState<Student[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState("parent_call");
  const [title, setTitle] = useState("استدعاء ولي أمر");
  const [notes, setNotes] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (currentSchool?.id) void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      showToast("error", "اختر الطالب أولًا.");
      return;
    }

    if (!title.trim()) {
      showToast("error", "اكتب عنوان التدخل.");
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
        status: "مفتوح",
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
    showToast("success", "تم حفظ التدخل الإرشادي بنجاح.");
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
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    );

    showToast("success", "تم تحديث حالة التدخل.");
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

      const matchesSearch = !keyword || text.includes(keyword);
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const matchesType =
        typeFilter === "all" || item.intervention_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [interventions, search, statusFilter, typeFilter, studentMap]);

  const total = interventions.length;
  const open = interventions.filter((item) => item.status === "مفتوح").length;
  const follow = interventions.filter(
    (item) => item.status === "قيد المتابعة",
  ).length;
  const closed = interventions.filter((item) => item.status === "مغلق").length;

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <PageContainer size="wide">
            <LoadingBox />
          </PageContainer>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AppShell>
        <PageContainer size="wide" className="space-y-6">
          <Breadcrumb />

          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="التدخلات الإرشادية"
            description="تسجيل ومتابعة جلسات الإرشاد، استدعاء أولياء الأمور، والمتابعات الأكاديمية والسلوكية والصحية."
            badge="الإرشاد الطلابي"
            icon={<ClipboardList size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الإرشاد الطلابي", href: "/counselor" },
              { label: "التدخلات الإرشادية" },
            ]}
          />

          <PageActions>
            <button
              type="button"
              onClick={() => void fetchData()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#15445A] shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCcw size={16} />
              تحديث
            </button>

            <button
              type="button"
              onClick={() => void createIntervention()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#0f3344] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {saving ? "جاري الحفظ..." : "حفظ التدخل"}
            </button>
          </PageActions>

          {errorMsg && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
              {errorMsg}
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ExecutiveCard
              title="إجمالي التدخلات"
              value={total}
              subtitle="كل التدخلات المسجلة"
              icon={<ClipboardList size={22} />}
              tone="blue"
              progress={total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="مفتوحة"
              value={open}
              subtitle="تحتاج متابعة"
              icon={<PhoneCall size={22} />}
              tone="gold"
              progress={total ? Math.round((open / total) * 100) : 0}
            />

            <ExecutiveCard
              title="قيد المتابعة"
              value={follow}
              subtitle="متابعة جارية"
              icon={<UserRoundCheck size={22} />}
              tone="red"
              progress={total ? Math.round((follow / total) * 100) : 0}
            />

            <ExecutiveCard
              title="مغلقة"
              value={closed}
              subtitle="تمت معالجتها"
              icon={<CheckCircle2 size={22} />}
              tone="green"
              progress={total ? Math.round((closed / total) * 100) : 0}
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-2xl font-black text-[#0f1f3d]">
              إضافة تدخل جديد
            </h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
              >
                {students.length === 0 ? (
                  <option value="">لا يوجد طلاب</option>
                ) : (
                  students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))
                )}
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
                placeholder="عنوان التدخل"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
              />

              <button
                type="button"
                onClick={() => void createIntervention()}
                disabled={saving}
                className="rounded-2xl bg-[#0f1f3d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#15445A] disabled:opacity-50"
              >
                {saving ? "جاري الحفظ..." : "حفظ التدخل"}
              </button>
            </div>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="ملاحظات التدخل..."
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
                  placeholder="بحث في التدخلات..."
                  className="w-full rounded-2xl border border-slate-200 py-3 pr-10 pl-4 text-sm outline-none focus:border-[#d4af37]"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
              >
                <option value="all">كل أنواع التدخل</option>
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
                <option value="all">كل الحالات</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {filteredInterventions.length === 0 ? (
              <EmptyBox text="لا توجد تدخلات مطابقة." />
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
                            {item.title || "تدخل إرشادي"}
                          </h3>

                          <p className="mt-1 text-sm text-slate-600">
                            الطالب: {student?.full_name || "غير معروف"} —{" "}
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
                          value={item.status || "مفتوح"}
                          onChange={(event) =>
                            void updateStatus(item.id, event.target.value)
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
        </PageContainer>
      </AppShell>
    </RoleGuard>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
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
      {toast.type === "success" ? (
        <CheckCircle2 size={18} />
      ) : (
        <XCircle size={18} />
      )}
      {toast.message}
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-3xl border bg-white px-6 py-4 text-slate-600 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-[#0f1f3d]" />
        جاري تحميل التدخلات الإرشادية...
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

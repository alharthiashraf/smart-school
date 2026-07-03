"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit,
  FileText,
  Flag,
  Loader2,
  PlusCircle,
  RefreshCcw,
  Save,
  Target,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

type Student = {
  id: string;
  school_id: string;
  full_name: string;
  classroom: string | null;
  section: string | null;
  grade_level: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
};

type StudentIntervention = {
  id: string;
  school_id: string;
  student_id: string;
  intervention_type: string | null;
  title: string | null;
  notes: string | null;
  status: string | null;
  priority?: string | null;
  target_date?: string | null;
  follow_up_date?: string | null;
  success_indicator?: string | null;
  closure_notes?: string | null;
  created_by?: string | null;
  created_at: string | null;
};

type Toast = { type: "success" | "error"; message: string };

type InterventionForm = {
  student_id: string;
  intervention_type: string;
  title: string;
  notes: string;
  status: string;
  priority: string;
  target_date: string;
  follow_up_date: string;
  success_indicator: string;
  closure_notes: string;
};

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "student_counselor",
  "health_supervisor",
  "teacher",
];

const ALL_VALUE = "الكل";

const INTERVENTION_TYPES = [
  "أكاديمي",
  "سلوكي",
  "غياب وانتظام",
  "صحي",
  "نفسي",
  "اجتماعي",
  "أسري",
  "صعوبات تعلم",
  "موهبة وتميز",
  "خطة علاجية خاصة",
];

const PRIORITY_LEVELS = ["منخفض", "متوسط", "مرتفع", "حرج"];

const INTERVENTION_STATUS = [
  "جديد",
  "قيد الدراسة",
  "قيد التنفيذ",
  "بانتظار ولي الأمر",
  "بانتظار المعلم",
  "تم التحسن",
  "تم تحقيق الأهداف",
  "مغلق",
];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function getPriorityStyle(priority?: string | null) {
  const value = String(priority || "");
  if (value === "حرج") return "bg-red-100 text-red-800";
  if (value === "مرتفع") return "bg-orange-50 text-orange-700";
  if (value === "متوسط") return "bg-[#C1B489]/20 text-[#15445A]";
  return "bg-[#07A869]/10 text-[#07A869]";
}

function getStatusStyle(status?: string | null) {
  const value = String(status || "");
  if (value === "مغلق" || value === "تم تحقيق الأهداف" || value === "تم التحسن") {
    return "bg-[#07A869]/10 text-[#07A869]";
  }
  if (value.includes("بانتظار")) return "bg-[#C1B489]/20 text-[#15445A]";
  if (value === "قيد التنفيذ" || value === "قيد الدراسة") return "bg-[#3D7EB9]/10 text-[#3D7EB9]";
  return "bg-slate-100 text-slate-700";
}

function isClosed(status?: string | null) {
  return ["مغلق", "تم تحقيق الأهداف", "تم التحسن"].includes(String(status || ""));
}

function isHighPriority(priority?: string | null) {
  return ["مرتفع", "حرج"].includes(String(priority || ""));
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function makeInitialForm(studentId = ""): InterventionForm {
  return {
    student_id: studentId,
    intervention_type: "أكاديمي",
    title: "",
    notes: "",
    status: "جديد",
    priority: "متوسط",
    target_date: "",
    follow_up_date: "",
    success_indicator: "",
    closure_notes: "",
  };
}

export default function StudentInterventionsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [students, setStudents] = useState<Student[]>([]);
  const [interventions, setInterventions] = useState<StudentIntervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(ALL_VALUE);
  const [statusFilter, setStatusFilter] = useState(ALL_VALUE);
  const [priorityFilter, setPriorityFilter] = useState(ALL_VALUE);

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<StudentIntervention | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState<InterventionForm>(makeInitialForm());

  useEffect(() => {
    if (currentSchool?.id) void fetchData();
  }, [currentSchool?.id]);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function fetchData() {
    if (!currentSchool?.id) return;
    setLoading(true);
    setErrorMsg("");

    const [studentsResult, interventionsResult] = await Promise.all([
      supabase
        .from("students")
        .select("id, school_id, full_name, classroom, section, grade_level, guardian_name, guardian_phone")
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
    const loadedInterventions = (interventionsResult.data as StudentIntervention[]) || [];

    setStudents(loadedStudents);
    setInterventions(loadedInterventions);

    if (!form.student_id && loadedStudents.length > 0) {
      setForm((prev) => ({ ...prev, student_id: loadedStudents[0].id }));
    }
  }

  const studentMap = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const filteredInterventions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return interventions.filter((item) => {
      const student = studentMap.get(item.student_id);
      const text = `
        ${student?.full_name || ""}
        ${student?.classroom || ""}
        ${student?.section || ""}
        ${student?.grade_level || ""}
        ${item.intervention_type || ""}
        ${item.title || ""}
        ${item.notes || ""}
        ${item.status || ""}
        ${item.priority || ""}
        ${item.success_indicator || ""}
        ${item.closure_notes || ""}
      `.toLowerCase();

      return (
        (!keyword || text.includes(keyword)) &&
        (typeFilter === ALL_VALUE || item.intervention_type === typeFilter) &&
        (statusFilter === ALL_VALUE || item.status === statusFilter) &&
        (priorityFilter === ALL_VALUE || item.priority === priorityFilter)
      );
    });
  }, [interventions, search, typeFilter, statusFilter, priorityFilter, studentMap]);

  const stats = useMemo(() => {
    return {
      total: interventions.length,
      filtered: filteredInterventions.length,
      newItems: interventions.filter((item) => item.status === "جديد").length,
      inProgress: interventions.filter((item) =>
        ["قيد الدراسة", "قيد التنفيذ"].includes(String(item.status || "")),
      ).length,
      closed: interventions.filter((item) => isClosed(item.status)).length,
      highRisk: interventions.filter((item) => isHighPriority(item.priority)).length,
    };
  }, [interventions, filteredInterventions.length]);

  function resetForm() {
    setEditingItem(null);
    setForm(makeInitialForm(students[0]?.id || ""));
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(item: StudentIntervention) {
    setEditingItem(item);
    setForm({
      student_id: item.student_id,
      intervention_type: item.intervention_type || "أكاديمي",
      title: item.title || "",
      notes: item.notes || "",
      status: item.status || "جديد",
      priority: item.priority || "متوسط",
      target_date: item.target_date || "",
      follow_up_date: item.follow_up_date || "",
      success_indicator: item.success_indicator || "",
      closure_notes: item.closure_notes || "",
    });
    setShowForm(true);
  }

  async function addTimelineEvent(item: StudentIntervention) {
    if (!currentSchool?.id) return;
    const student = studentMap.get(item.student_id);

    await supabase.from("student_timeline").insert({
      school_id: currentSchool.id,
      student_id: item.student_id,
      student_name: student?.full_name || null,
      event_type: "تدخل إرشادي",
      event_title: item.title || item.intervention_type || "خطة تدخل",
      event_description: [
        item.intervention_type ? `نوع التدخل: ${item.intervention_type}` : "",
        item.priority ? `الخطورة: ${item.priority}` : "",
        item.status ? `الحالة: ${item.status}` : "",
        item.success_indicator ? `مؤشر النجاح: ${item.success_indicator}` : "",
        item.notes || "",
      ].filter(Boolean).join(" | "),
      source_role: "الإرشاد الطلابي",
      source_user_name: "منصة المدرسة الذكية",
      event_time: new Date().toISOString(),
    });
  }

  async function saveIntervention() {
    if (!currentSchool?.id) return;
    if (!form.student_id) {
      showToast("error", "اختر الطالب أولًا");
      return;
    }
    if (!form.title.trim()) {
      showToast("error", "اكتب عنوان خطة التدخل");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      school_id: currentSchool.id,
      student_id: form.student_id,
      intervention_type: form.intervention_type || "أكاديمي",
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      status: form.status || "جديد",
      priority: form.priority || "متوسط",
      target_date: form.target_date || null,
      follow_up_date: form.follow_up_date || null,
      success_indicator: form.success_indicator.trim() || null,
      closure_notes: form.closure_notes.trim() || null,
      created_by: user?.id || null,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("student_interventions")
        .update(payload)
        .eq("id", editingItem.id)
        .eq("school_id", currentSchool.id);

      setSaving(false);

      if (error) {
        showToast("error", error.message);
        return;
      }

      await addTimelineEvent({ ...editingItem, ...payload, created_at: editingItem.created_at });
      showToast("success", "تم تحديث خطة التدخل");
    } else {
      const { data, error } = await supabase
        .from("student_interventions")
        .insert(payload)
        .select()
        .single();

      setSaving(false);

      if (error) {
        showToast("error", error.message);
        return;
      }

      await addTimelineEvent(data as StudentIntervention);
      showToast("success", "تم إنشاء خطة التدخل");
    }

    resetForm();
    setShowForm(false);
    void fetchData();
  }

  async function deleteIntervention(item: StudentIntervention) {
    if (!currentSchool?.id) return;

    const confirmed = window.confirm("هل تريد حذف خطة التدخل؟");
    if (!confirmed) return;

    const { error } = await supabase
      .from("student_interventions")
      .delete()
      .eq("id", item.id)
      .eq("school_id", currentSchool.id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    showToast("success", "تم حذف خطة التدخل");
    void fetchData();
  }

  function getExportRows() {
    return filteredInterventions.map((item, index) => {
      const student = studentMap.get(item.student_id);
      return {
        "#": index + 1,
        "الطالب": student?.full_name || "—",
        "الفصل": student?.classroom || "—",
        "الشعبة": student?.section || "—",
        "نوع التدخل": item.intervention_type || "—",
        "العنوان": item.title || "—",
        "الحالة": item.status || "—",
        "الخطورة": item.priority || "—",
        "تاريخ الهدف": item.target_date || "—",
        "تاريخ المتابعة": item.follow_up_date || "—",
        "مؤشر النجاح": item.success_indicator || "—",
        "الملاحظات": item.notes || "—",
        "ملاحظات الإغلاق": item.closure_notes || "—",
      };
    });
  }

  async function exportExcel() {
    await exportTableToExcel({
      fileName: `student-interventions-${getTodayDate()}.xlsx`,
      sheetName: "Student Interventions",
      rows: getExportRows(),
    } as any);
    showToast("success", "تم تصدير Excel");
  }

  function exportPDF() {
    exportTableToPDF({
      title: "خطط التدخل الطلابية",
      fileName: `student-interventions-${getTodayDate()}.pdf`,
      rows: getExportRows(),
    } as any);
    showToast("success", "تم تجهيز PDF");
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <LoadingBox />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-5" dir="rtl">
          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="خطط التدخل الطلابية"
            description="إنشاء ومتابعة خطط التدخل الأكاديمية والسلوكية والصحية والاجتماعية، مع مؤشرات نجاح ومواعيد متابعة وربط تلقائي بالسجل الزمني للطالب."
            badge="الإرشاد والمتابعة الطلابية"
            icon={<Target size={18} />}
            breadcrumbs={[{ label: "لوحة التحكم", href: "/dashboard" }, { label: "خطط التدخل الطلابية" }]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "غير محدد" },
              { label: "التاريخ", value: getTodayDate() },
              { label: "عدد الطلاب", value: students.length },
              { label: "المعروض", value: filteredInterventions.length },
            ]}
            stats={[
              { label: "إجمالي الخطط", value: stats.total, icon: <ClipboardCheck size={20} />, tone: "blue" },
              { label: "قيد التنفيذ", value: stats.inProgress, icon: <Target size={20} />, tone: "teal" },
              { label: "مغلقة", value: stats.closed, icon: <CheckCircle2 size={20} />, tone: "green" },
              { label: "عالية الخطورة", value: stats.highRisk, icon: <AlertTriangle size={20} />, tone: stats.highRisk > 0 ? "red" : "green" },
            ]}
            actions={
              <>
                <button type="button" onClick={openCreateForm} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <PlusCircle size={17} />
                  إضافة خطة
                </button>
                <button type="button" onClick={() => void fetchData()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <RefreshCcw size={17} />
                  تحديث
                </button>
                <button type="button" onClick={() => void exportExcel()} disabled={!filteredInterventions.length} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60">
                  <Download size={17} />
                  Excel
                </button>
                <button type="button" onClick={exportPDF} disabled={!filteredInterventions.length} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60">
                  <FileText size={17} />
                  PDF
                </button>
              </>
            }
          />

          {errorMsg && <div className="rounded-[28px] border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">{errorMsg}</div>}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ExecutiveCard title="إجمالي الخطط" value={stats.total} icon={<ClipboardCheck size={22} />} tone="blue" subtitle="كل خطط التدخل" progress={stats.total > 0 ? 100 : 0} />
            <ExecutiveCard title="جديدة" value={stats.newItems} icon={<PlusCircle size={22} />} tone="gold" subtitle="تحتاج بدء متابعة" progress={stats.total ? percentage(stats.newItems, stats.total) : 0} />
            <ExecutiveCard title="قيد التنفيذ" value={stats.inProgress} icon={<Target size={22} />} tone="teal" subtitle="خطط نشطة" progress={stats.total ? percentage(stats.inProgress, stats.total) : 0} />
            <ExecutiveCard title="مغلقة" value={stats.closed} icon={<CheckCircle2 size={22} />} tone="green" subtitle="أهداف مكتملة" progress={stats.total ? percentage(stats.closed, stats.total) : 0} />
            <ExecutiveCard title="عالية الخطورة" value={stats.highRisk} icon={<AlertTriangle size={22} />} tone={stats.highRisk > 0 ? "red" : "green"} subtitle="مرتفع أو حرج" progress={stats.total ? percentage(stats.highRisk, stats.total) : 0} />
          </section>

          <SummaryCard
            title="ملخص خطط التدخل"
            description="قراءة تنفيذية لحالة خطط التدخل الطلابية حسب الفلاتر الحالية."
            tone={stats.highRisk > 0 ? "gold" : "green"}
            items={[
              { label: "الإجمالي", value: stats.total },
              { label: "المعروض", value: stats.filtered },
              { label: "جديدة", value: stats.newItems },
              { label: "قيد التنفيذ", value: stats.inProgress },
              { label: "مغلقة", value: stats.closed },
              { label: "عالية الخطورة", value: stats.highRisk },
            ]}
            footer="كل عملية إنشاء أو تعديل تضيف حدثًا إلى السجل الزمني للطالب."
          />

          {showForm && (
            <InterventionFormCard
              editingItem={editingItem}
              form={form}
              setForm={setForm}
              students={students}
              saving={saving}
              onSave={saveIntervention}
              onCancel={() => {
                resetForm();
                setShowForm(false);
              }}
            />
          )}

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <PageToolbar
              search={{ value: search, onChange: setSearch, placeholder: "بحث باسم الطالب أو نوع التدخل أو العنوان..." }}
              filters={
                <>
                  <ToolbarSelect value={typeFilter} onChange={setTypeFilter}>
                    <option value={ALL_VALUE}>كل الأنواع</option>
                    {INTERVENTION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </ToolbarSelect>
                  <ToolbarSelect value={statusFilter} onChange={setStatusFilter}>
                    <option value={ALL_VALUE}>كل الحالات</option>
                    {INTERVENTION_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </ToolbarSelect>
                  <ToolbarSelect value={priorityFilter} onChange={setPriorityFilter}>
                    <option value={ALL_VALUE}>كل الخطورة</option>
                    {PRIORITY_LEVELS.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                  </ToolbarSelect>
                </>
              }
              onRefresh={() => void fetchData()}
              onExportPDF={exportPDF}
              onExportExcel={() => void exportExcel()}
            />
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            {filteredInterventions.length === 0 ? (
              <EmptyBox text="لا توجد خطط تدخل حاليًا." />
            ) : (
              <div className="space-y-3">
                {filteredInterventions.map((item) => (
                  <InterventionCard
                    key={item.id}
                    item={item}
                    student={studentMap.get(item.student_id)}
                    onEdit={openEditForm}
                    onDelete={deleteIntervention}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function InterventionFormCard({
  editingItem,
  form,
  setForm,
  students,
  saving,
  onSave,
  onCancel,
}: {
  editingItem: StudentIntervention | null;
  form: InterventionForm;
  setForm: (value: InterventionForm) => void;
  students: Student[];
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#15445A]">{editingItem ? "تعديل خطة التدخل" : "إضافة خطة تدخل جديدة"}</h2>
        <button type="button" onClick={onCancel} className="rounded-2xl bg-slate-50 p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FormField label="الطالب">
          <select value={form.student_id} onChange={(event) => setForm({ ...form, student_id: event.target.value })} className="field">
            {students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
          </select>
        </FormField>

        <FormField label="نوع التدخل">
          <select value={form.intervention_type} onChange={(event) => setForm({ ...form, intervention_type: event.target.value })} className="field">
            {INTERVENTION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </FormField>

        <FormField label="مستوى الخطورة">
          <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="field">
            {PRIORITY_LEVELS.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </FormField>

        <FormField label="حالة الخطة">
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="field">
            {INTERVENTION_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </FormField>

        <FormField label="تاريخ الهدف">
          <input type="date" value={form.target_date} onChange={(event) => setForm({ ...form, target_date: event.target.value })} className="field" />
        </FormField>

        <FormField label="تاريخ المتابعة">
          <input type="date" value={form.follow_up_date} onChange={(event) => setForm({ ...form, follow_up_date: event.target.value })} className="field" />
        </FormField>

        <div className="lg:col-span-3">
          <FormField label="عنوان خطة التدخل">
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="مثال: خطة متابعة الغياب المتكرر" className="field" />
          </FormField>
        </div>

        <div className="lg:col-span-3">
          <FormField label="مؤشر النجاح">
            <input value={form.success_indicator} onChange={(event) => setForm({ ...form, success_indicator: event.target.value })} placeholder="مثال: انخفاض الغياب إلى أقل من يومين خلال شهر" className="field" />
          </FormField>
        </div>

        <div className="lg:col-span-3">
          <FormField label="ملاحظات وخطوات التدخل">
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={4} placeholder="اكتب إجراءات الخطة، الأطراف المشاركة، آلية المتابعة..." className="field" />
          </FormField>
        </div>

        <div className="lg:col-span-3">
          <FormField label="ملاحظات الإغلاق / النتيجة النهائية">
            <textarea value={form.closure_notes} onChange={(event) => setForm({ ...form, closure_notes: event.target.value })} rows={3} placeholder="تكتب عند إغلاق الخطة أو تحقيق الأهداف..." className="field" />
          </FormField>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" disabled={saving} onClick={onSave} className="inline-flex items-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-black text-white disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={17} />}
          {saving ? "جاري الحفظ..." : "حفظ الخطة"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600">إلغاء</button>
      </div>
    </section>
  );
}

function InterventionCard({
  item,
  student,
  onEdit,
  onDelete,
}: {
  item: StudentIntervention;
  student?: Student;
  onEdit: (item: StudentIntervention) => void;
  onDelete: (item: StudentIntervention) => void;
}) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-[#15445A]">
              <Flag size={15} />
              {item.intervention_type || "تدخل"}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${getPriorityStyle(item.priority)}`}>{item.priority || "متوسط"}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${getStatusStyle(item.status)}`}>{item.status || "جديد"}</span>
            <span className="text-xs font-bold text-slate-400">{formatDate(item.created_at)}</span>
          </div>

          <h3 className="text-xl font-black text-[#15445A]">{item.title || "خطة تدخل"}</h3>
          <p className="mt-1 text-sm font-bold text-slate-700">الطالب: {student?.full_name || "طالب غير معروف"}</p>
          <p className="mt-1 text-sm text-slate-500">
            الفصل: {student?.classroom || "—"}
            {student?.section ? ` - ${student.section}` : ""}
            {student?.grade_level ? ` | ${student.grade_level}` : ""}
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <MiniInfo label="تاريخ الهدف" value={formatDate(item.target_date)} />
            <MiniInfo label="تاريخ المتابعة" value={formatDate(item.follow_up_date)} />
            <MiniInfo label="مؤشر النجاح" value={item.success_indicator || "—"} />
            <MiniInfo label="ولي الأمر" value={student?.guardian_name || "—"} />
          </div>

          {item.notes && <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm leading-7 text-slate-600">{item.notes}</p>}
          {item.closure_notes && <p className="mt-3 rounded-2xl bg-[#07A869]/10 px-4 py-3 text-sm leading-7 text-[#07A869]">نتيجة الإغلاق: {item.closure_notes}</p>}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={() => onEdit(item)} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-[#15445A] hover:bg-slate-100">
            <Edit size={15} />
            تعديل
          </button>
          <button type="button" onClick={() => void onDelete(item)} className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100">
            <Trash2 size={15} />
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function MiniInfo({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 text-sm">
      <p className="mb-1 text-xs font-bold text-slate-400">{label}</p>
      <p className="font-bold text-slate-700">{value || "—"}</p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed bg-slate-50 p-8 text-center text-sm text-slate-500">{text}</div>;
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div className={`fixed left-5 top-5 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-xl ${toast.type === "success" ? "bg-[#07A869]" : "bg-red-600"}`}>
      {toast.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      {toast.message}
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-[28px] border bg-white px-6 py-4 text-slate-600 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-[#15445A]" />
        جاري تحميل خطط التدخل الطلابية...
      </div>
    </div>
  );
}

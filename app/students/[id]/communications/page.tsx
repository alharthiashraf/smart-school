"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";

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
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";

type Student = {
  id: string;
  school_id?: string | null;
  full_name: string;
  grade_level?: string | null;
  classroom?: string | null;
  class_name?: string | null;
  section?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
};

type ParentCommunication = {
  id: string;
  school_id?: string | null;
  student_id: string;
  communication_date?: string | null;
  guardian_name?: string | null;
  communication_method?: string | null;
  topic?: string | null;
  result?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type CommunicationForm = {
  communication_date: string;
  guardian_name: string;
  communication_method: string;
  topic: string;
  result: string;
  notes: string;
};

const COMMUNICATION_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "student_counselor",
  "teacher",
];

const COMMUNICATION_METHODS = [
  "اتصال هاتفي",
  "واتساب",
  "رسالة نصية",
  "اجتماع",
  "زيارة",
  "أخرى",
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value.slice(0, 10);
  }
}

function methodTone(method?: string | null) {
  if (method === "اتصال هاتفي") return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
  if (method === "واتساب") return "border-[#0DA9A6]/20 bg-[#0DA9A6]/10 text-[#0DA9A6]";
  if (method === "اجتماع") return "border-[#3D7EB9]/20 bg-[#3D7EB9]/10 text-[#3D7EB9]";
  if (method === "زيارة") return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function methodIcon(method?: string | null) {
  if (method === "اتصال هاتفي") return <Phone size={14} />;
  return <MessageCircle size={14} />;
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function buildInitialForm(student?: Student | null): CommunicationForm {
  return {
    communication_date: todayDate(),
    guardian_name: student?.guardian_name || "",
    communication_method: "اتصال هاتفي",
    topic: "",
    result: "",
    notes: "",
  };
}

export default function StudentCommunicationsPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = String(params.id || "");
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [student, setStudent] = useState<Student | null>(null);
  const [communications, setCommunications] = useState<ParentCommunication[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("الكل");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ParentCommunication | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [form, setForm] = useState<CommunicationForm>(buildInitialForm());

  useEffect(() => {
    if (studentId) void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, currentSchool?.id]);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function fetchData() {
    if (!studentId) return;

    setLoading(true);

    try {
      const schoolId = currentSchool?.id || null;

      let studentQuery = supabase.from("students").select("*").eq("id", studentId);
      if (schoolId) studentQuery = studentQuery.eq("school_id", schoolId);

      const studentResult = await studentQuery.maybeSingle();

      if (studentResult.error) throw studentResult.error;
      if (!studentResult.data) throw new Error("لم يتم العثور على الطالب");

      const currentStudent = studentResult.data as Student;
      const realSchoolId = currentStudent.school_id || schoolId || null;

      const communicationsResult = await supabase
        .from("parent_communications")
        .select("*")
        .eq("student_id", studentId)
        .order("communication_date", { ascending: false });

      if (communicationsResult.error) throw communicationsResult.error;

      const rows = ((communicationsResult.data || []) as ParentCommunication[]).filter(
        (row) => !realSchoolId || !row.school_id || row.school_id === realSchoolId,
      );

      setStudent(currentStudent);
      setCommunications(rows);
      setForm((previous) => ({
        ...previous,
        guardian_name: previous.guardian_name || currentStudent.guardian_name || "",
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل سجل التواصل";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  const filteredCommunications = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return communications.filter((item) => {
      const matchesMethod = methodFilter === "الكل" || item.communication_method === methodFilter;

      const text = [
        item.guardian_name,
        item.communication_method,
        item.topic,
        item.result,
        item.notes,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || text.includes(keyword);

      return matchesMethod && matchesSearch;
    });
  }, [communications, search, methodFilter]);

  const stats = useMemo(() => {
    const total = communications.length;
    const phone = communications.filter((item) => item.communication_method === "اتصال هاتفي").length;
    const whatsapp = communications.filter((item) => item.communication_method === "واتساب").length;
    const meetings = communications.filter((item) => item.communication_method === "اجتماع").length;
    const visits = communications.filter((item) => item.communication_method === "زيارة").length;
    const other = communications.filter(
      (item) => !["اتصال هاتفي", "واتساب", "اجتماع", "زيارة"].includes(String(item.communication_method || "")),
    ).length;

    return { total, phone, whatsapp, meetings, visits, other };
  }, [communications]);

  function resetForm() {
    setEditingItem(null);
    setForm(buildInitialForm(student));
  }

  function openCreateDrawer() {
    resetForm();
    setDrawerOpen(true);
  }

  function openEditDrawer(item: ParentCommunication) {
    setEditingItem(item);
    setForm({
      communication_date: item.communication_date?.slice(0, 10) || todayDate(),
      guardian_name: item.guardian_name || student?.guardian_name || "",
      communication_method: item.communication_method || "اتصال هاتفي",
      topic: item.topic || "",
      result: item.result || "",
      notes: item.notes || "",
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    resetForm();
    setDrawerOpen(false);
  }

  async function saveCommunication() {
    if (!student) return;

    if (!form.topic.trim()) {
      showToast("error", "اكتب موضوع التواصل");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        school_id: student.school_id || currentSchool?.id || null,
        student_id: student.id,
        communication_date: form.communication_date || todayDate(),
        guardian_name: form.guardian_name.trim() || student.guardian_name || null,
        communication_method: form.communication_method,
        topic: form.topic.trim(),
        result: form.result.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("parent_communications")
          .update(payload)
          .eq("id", editingItem.id)
          .eq("student_id", student.id);

        if (error) throw error;

        showToast("success", "تم تحديث سجل التواصل");
      } else {
        const { error } = await supabase.from("parent_communications").insert(payload);

        if (error) throw error;

        showToast("success", "تمت إضافة سجل التواصل");
      }

      closeDrawer();
      void fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ سجل التواصل";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCommunication(item: ParentCommunication) {
    const confirmed = window.confirm("هل تريد حذف سجل التواصل؟");
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("parent_communications")
        .delete()
        .eq("id", item.id)
        .eq("student_id", studentId);

      if (error) throw error;

      showToast("success", "تم حذف سجل التواصل");
      void fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حذف سجل التواصل";
      showToast("error", message);
    }
  }

  const exportRows = useMemo(() => {
    return filteredCommunications.map((item, index) => ({
      "#": index + 1,
      "اسم الطالب": student?.full_name || "—",
      "ولي الأمر": item.guardian_name || "—",
      "طريقة التواصل": item.communication_method || "—",
      "موضوع التواصل": item.topic || "—",
      "النتيجة": item.result || "—",
      "ملاحظات": item.notes || "—",
      "التاريخ": formatDate(item.communication_date || item.created_at),
    }));
  }, [filteredCommunications, student]);

  async function exportExcel() {
    await exportTableToExcel({
      fileName: `parent-communications-${student?.full_name || "student"}.xlsx`,
      sheetName: "Communications",
      rows: exportRows,
    } as any);

    showToast("success", "تم تصدير سجل التواصل Excel");
  }

  function exportPDF() {
    exportTableToPDF({
      title: "سجل التواصل مع ولي الأمر",
      fileName: `parent-communications-${student?.full_name || "student"}.pdf`,
      rows: exportRows,
    } as any);

    showToast("success", "تم تجهيز PDF");
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={COMMUNICATION_ROLES}>
        <AppShell>
          <LoadingBox text="جاري تحميل سجل التواصل مع ولي الأمر..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!student) {
    return (
      <RoleGuard allowedRoles={COMMUNICATION_ROLES}>
        <AppShell>
          <div className="rounded-[28px] border border-red-100 bg-red-50 p-8 text-center font-bold text-red-700">
            لم يتم العثور على الطالب.
          </div>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={COMMUNICATION_ROLES}>
      <AppShell>
        <main className="space-y-5" dir="rtl">
          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="سجل التواصل مع ولي الأمر"
            description="توثيق جميع محاولات التواصل مع ولي الأمر، ونتائج التواصل، والملاحظات المرتبطة بالطالب."
            badge="ملف الطالب"
            icon={<MessageCircle size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الطلاب", href: "/students" },
              { label: student.full_name, href: `/students/${student.id}` },
              { label: "التواصل" },
            ]}
            meta={[
              { label: "الطالب", value: student.full_name },
              { label: "الصف", value: student.grade_level || "—" },
              { label: "الفصل", value: student.classroom || student.class_name || "—" },
              { label: "ولي الأمر", value: student.guardian_name || "—" },
            ]}
            stats={[
              { label: "إجمالي التواصل", value: stats.total, icon: <MessageCircle size={20} />, tone: "blue" },
              { label: "اتصال هاتفي", value: stats.phone, icon: <Phone size={20} />, tone: "green" },
              { label: "واتساب", value: stats.whatsapp, icon: <MessageCircle size={20} />, tone: "teal" },
              { label: "اجتماعات", value: stats.meetings, icon: <Users size={20} />, tone: "gold" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => router.push(`/students/${student.id}`)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ArrowRight size={17} />
                  رجوع
                </button>

                <button
                  type="button"
                  onClick={openCreateDrawer}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Plus size={17} />
                  إضافة تواصل
                </button>

                <button
                  type="button"
                  onClick={() => void fetchData()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>

                <button
                  type="button"
                  onClick={() => void exportExcel()}
                  disabled={!exportRows.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <Download size={17} />
                  Excel
                </button>

                <button
                  type="button"
                  onClick={exportPDF}
                  disabled={!exportRows.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <FileText size={17} />
                  PDF
                </button>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <ExecutiveCard
              title="إجمالي التواصل"
              value={stats.total}
              icon={<MessageCircle size={22} />}
              tone="blue"
              subtitle="كل السجلات"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="اتصال هاتفي"
              value={stats.phone}
              icon={<Phone size={22} />}
              tone="green"
              subtitle="تواصل مباشر"
              progress={percentage(stats.phone, stats.total)}
            />

            <ExecutiveCard
              title="واتساب"
              value={stats.whatsapp}
              icon={<MessageCircle size={22} />}
              tone="teal"
              subtitle="رسائل فورية"
              progress={percentage(stats.whatsapp, stats.total)}
            />

            <ExecutiveCard
              title="اجتماعات"
              value={stats.meetings}
              icon={<Users size={22} />}
              tone="gold"
              subtitle="لقاءات رسمية"
              progress={percentage(stats.meetings, stats.total)}
            />

            <ExecutiveCard
              title="زيارات"
              value={stats.visits}
              icon={<CalendarDays size={22} />}
              tone="primary"
              subtitle="زيارات موثقة"
              progress={percentage(stats.visits, stats.total)}
            />
          </section>

          <SummaryCard
            title="ملخص التواصل"
            description="قراءة تنفيذية لسجل التواصل مع ولي الأمر حسب الفلاتر الحالية."
            tone={stats.total > 0 ? "green" : "gold"}
            items={[
              { label: "إجمالي السجلات", value: stats.total },
              { label: "اتصال هاتفي", value: stats.phone },
              { label: "واتساب", value: stats.whatsapp },
              { label: "اجتماعات", value: stats.meetings },
              { label: "زيارات", value: stats.visits },
              { label: "أخرى", value: stats.other },
            ]}
            footer="ينصح بتوثيق كل تواصل مع ولي الأمر لضمان وضوح المتابعة الإدارية والإرشادية."
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm print:hidden">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "بحث في الموضوع، النتيجة، الملاحظات، أو اسم ولي الأمر...",
              }}
              filters={
                <ToolbarSelect value={methodFilter} onChange={setMethodFilter}>
                  <option value="الكل">كل طرق التواصل</option>
                  {COMMUNICATION_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </ToolbarSelect>
              }
              onRefresh={() => void fetchData()}
              onExportPDF={exportPDF}
              onExportExcel={() => void exportExcel()}
            />
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Users className="text-[#15445A]" size={22} />
              <h2 className="text-xl font-black text-[#15445A]">سجلات التواصل</h2>
            </div>

            {filteredCommunications.length === 0 ? (
              <EmptyBox text="لا توجد سجلات تواصل مطابقة." />
            ) : (
              <div className="grid gap-4">
                {filteredCommunications.map((item) => (
                  <CommunicationCard
                    key={item.id}
                    item={item}
                    onEdit={openEditDrawer}
                    onDelete={deleteCommunication}
                  />
                ))}
              </div>
            )}
          </section>

          {drawerOpen && (
            <CommunicationDrawer
              editingItem={editingItem}
              form={form}
              setForm={setForm}
              saving={saving}
              student={student}
              onClose={closeDrawer}
              onSave={saveCommunication}
            />
          )}
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function CommunicationCard({
  item,
  onEdit,
  onDelete,
}: {
  item: ParentCommunication;
  onEdit: (item: ParentCommunication) => void;
  onDelete: (item: ParentCommunication) => void;
}) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${methodTone(item.communication_method)}`}>
              {methodIcon(item.communication_method)}
              {item.communication_method || "تواصل"}
            </span>

            <span className="text-sm font-bold text-slate-500">
              {formatDate(item.communication_date || item.created_at)}
            </span>
          </div>

          <h3 className="text-lg font-black text-[#15445A]">{item.topic || "—"}</h3>

          <p className="mt-2 leading-7 text-slate-600">النتيجة: {item.result || "—"}</p>

          {item.notes && (
            <p className="mt-2 rounded-2xl bg-white p-3 leading-7 text-slate-600">
              {item.notes}
            </p>
          )}

          <p className="mt-3 text-sm text-slate-500">
            ولي الأمر: {item.guardian_name || "—"}
          </p>
        </div>

        <div className="flex shrink-0 gap-2 print:hidden">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-[#15445A] hover:bg-slate-100"
          >
            تعديل
          </button>

          <button
            type="button"
            onClick={() => void onDelete(item)}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
          >
            <Trash2 size={15} />
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}

function CommunicationDrawer({
  editingItem,
  form,
  setForm,
  saving,
  student,
  onClose,
  onSave,
}: {
  editingItem: ParentCommunication | null;
  form: CommunicationForm;
  setForm: (form: CommunicationForm) => void;
  saving: boolean;
  student: Student;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/40 p-4 backdrop-blur-sm">
      <aside className="h-full w-full max-w-xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#15445A]">
              {editingItem ? "تعديل سجل التواصل" : "إضافة تواصل جديد"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{student.full_name}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-100 p-3 text-slate-600 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <FormField label="تاريخ التواصل">
            <input
              type="date"
              value={form.communication_date}
              onChange={(event) => setForm({ ...form, communication_date: event.target.value })}
              className="field"
            />
          </FormField>

          <FormField label="اسم ولي الأمر">
            <input
              value={form.guardian_name}
              onChange={(event) => setForm({ ...form, guardian_name: event.target.value })}
              placeholder="اسم ولي الأمر"
              className="field"
            />
          </FormField>

          <FormField label="طريقة التواصل">
            <select
              value={form.communication_method}
              onChange={(event) => setForm({ ...form, communication_method: event.target.value })}
              className="field"
            >
              {COMMUNICATION_METHODS.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </FormField>

          <FormField label="موضوع التواصل">
            <input
              value={form.topic}
              onChange={(event) => setForm({ ...form, topic: event.target.value })}
              placeholder="مثال: متابعة الغياب"
              className="field"
            />
          </FormField>

          <FormField label="النتيجة">
            <input
              value={form.result}
              onChange={(event) => setForm({ ...form, result: event.target.value })}
              placeholder="مثال: تم التواصل بنجاح"
              className="field"
            />
          </FormField>

          <FormField label="ملاحظات">
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              rows={5}
              placeholder="اكتب تفاصيل التواصل..."
              className="field"
            />
          </FormField>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#15445A] px-5 text-sm font-black text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={17} />}
            {saving ? "جاري الحفظ..." : "حفظ التواصل"}
          </button>
        </div>
      </aside>
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

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] bg-white p-6 text-center text-slate-500 shadow-sm">
      <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#15445A]" />
      {text}
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-xl print:hidden ${
        toast.type === "success" ? "bg-[#07A869]" : "bg-red-600"
      }`}
    >
      {toast.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      {toast.message}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExportButton from "@/components/ui/buttons/ExportButton";
import IconButton from "@/components/ui/buttons/IconButton";
import PageLoader from "@/components/ui/loading/PageLoader";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";
import UiEmptyState from "@/components/ui/empty-state/EmptyState";

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

const EXPORT_HEADERS = [
  "#",
  "اسم الطالب",
  "ولي الأمر",
  "طريقة التواصل",
  "موضوع التواصل",
  "النتيجة",
  "ملاحظات",
  "التاريخ",
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
  if (method === "اتصال هاتفي") {
    return "border-[color-mix(in_srgb,var(--app-success)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]";
  }

  if (method === "واتساب") {
    return "border-[color-mix(in_srgb,var(--app-primary)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)] text-[var(--app-primary)]";
  }

  if (method === "اجتماع") {
    return "border-[color-mix(in_srgb,var(--app-primary)_24%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_8%,transparent)] text-[var(--app-primary)]";
  }

  if (method === "زيارة") {
    return "border-[color-mix(in_srgb,var(--app-accent)_30%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";
  }

  return "border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text)]";
}

function methodIcon(method?: string | null) {
  if (method === "اتصال هاتفي") return <Phone size={14} aria-hidden="true" />;
  return <MessageCircle size={14} aria-hidden="true" />;
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

  const showToast = useCallback(
    (type: Toast["type"], message: string) => {
      setToast({ type, message });
      window.setTimeout(() => setToast(null), 3000);
    },
    [],
  );

  const fetchData = useCallback(async () => {
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
        .eq("school_id", realSchoolId || "")
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
  }, [currentSchool?.id, showToast, studentId]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id || !studentId) {
      setLoading(false);
      setStudent(null);
      setCommunications([]);
      return;
    }

    void fetchData();
  }, [currentSchool?.id, fetchData, schoolLoading, studentId]);

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

  const exportRows = useMemo<(string | number | null | undefined)[][]>(() => {
    return filteredCommunications.map((item, index) => [
      index + 1,
      student?.full_name || "—",
      item.guardian_name || "—",
      item.communication_method || "—",
      item.topic || "—",
      item.result || "—",
      item.notes || "—",
      formatDate(item.communication_date || item.created_at),
    ]);
  }, [filteredCommunications, student]);

  async function exportExcel() {
    await exportTableToExcel({
      title: "سجل التواصل مع ولي الأمر",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: student?.full_name
        ? `سجل تواصل الطالب: ${student.full_name}`
        : "سجل التواصل مع ولي الأمر",
      headers: EXPORT_HEADERS,
      rows: exportRows,
      fileName: `parent-communications-${student?.full_name || "student"}.xlsx`,
      sheetName: "Communications",
    });

    showToast("success", "تم تصدير سجل التواصل Excel");
  }

  function exportPDF() {
    exportTableToPDF({
      title: "سجل التواصل مع ولي الأمر",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: student?.full_name
        ? `سجل تواصل الطالب: ${student.full_name}`
        : "سجل التواصل مع ولي الأمر",
      headers: EXPORT_HEADERS,
      rows: exportRows,
      fileName: `parent-communications-${student?.full_name || "student"}.pdf`,
    });

    showToast("success", "تم تجهيز PDF");
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={COMMUNICATION_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل سجل التواصل مع ولي الأمر..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool) {
    return (
      <RoleGuard allowedRoles={COMMUNICATION_ROLES}>
        <AppShell>
          <ErrorState description="لا توجد مدرسة مرتبطة بالمستخدم الحالي." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!student) {
    return (
      <RoleGuard allowedRoles={COMMUNICATION_ROLES}>
        <AppShell>
          <UiEmptyState
            icon={<Users className="h-9 w-9" aria-hidden="true" />}
            title="لم يتم العثور على الطالب"
            description="تعذر العثور على الطالب ضمن المدرسة الحالية."
          />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={COMMUNICATION_ROLES}>
      <AppShell>
        <main className="space-y-5" dir="rtl">
          {toast && (
            <div className="fixed left-5 top-5 z-50 w-[min(420px,calc(100%-2rem))] print:hidden">
              {toast.type === "success" ? (
                <SuccessBanner description={toast.message} />
              ) : (
                <ErrorState description={toast.message} />
              )}
            </div>
          )}

          <PageHeader
            variant="hero"
            title="سجل التواصل مع ولي الأمر"
            description="توثيق جميع محاولات التواصل مع ولي الأمر، ونتائج التواصل، والملاحظات المرتبطة بالطالب."
            badge="ملف الطالب"
            icon={<MessageCircle size={18} aria-hidden="true" />}
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
              { label: "إجمالي التواصل", value: stats.total, icon: <MessageCircle size={20} aria-hidden="true" />, tone: "primary" },
              { label: "اتصال هاتفي", value: stats.phone, icon: <Phone size={20} aria-hidden="true" />, tone: "green" },
              { label: "واتساب", value: stats.whatsapp, icon: <MessageCircle size={20} aria-hidden="true" />, tone: "primary" },
              { label: "اجتماعات", value: stats.meetings, icon: <Users size={20} aria-hidden="true" />, tone: "gold" },
            ]}
            actions={
              <>
                <SecondaryButton
                  icon={<ArrowRight size={17} aria-hidden="true" />}
                  onClick={() => router.push(`/students/${student.id}`)}
                >
                  رجوع
                </SecondaryButton>

                <PrimaryButton
                  icon={<Plus size={17} aria-hidden="true" />}
                  onClick={openCreateDrawer}
                >
                  إضافة تواصل
                </PrimaryButton>

                <SecondaryButton
                  icon={<RefreshCcw size={17} aria-hidden="true" />}
                  onClick={() => void fetchData()}
                >
                  تحديث
                </SecondaryButton>

                <ExportButton
                  icon={<Download size={17} aria-hidden="true" />}
                  onClick={() => void exportExcel()}
                  disabled={!exportRows.length}
                >
                  Excel
                </ExportButton>

                <ExportButton
                  icon={<FileText size={17} aria-hidden="true" />}
                  onClick={exportPDF}
                  disabled={!exportRows.length}
                >
                  PDF
                </ExportButton>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <ExecutiveCard
              title="إجمالي التواصل"
              value={stats.total}
              icon={<MessageCircle size={22} aria-hidden="true" />}
              tone="primary"
              subtitle="كل السجلات"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="اتصال هاتفي"
              value={stats.phone}
              icon={<Phone size={22} aria-hidden="true" />}
              tone="green"
              subtitle="تواصل مباشر"
              progress={percentage(stats.phone, stats.total)}
            />

            <ExecutiveCard
              title="واتساب"
              value={stats.whatsapp}
              icon={<MessageCircle size={22} aria-hidden="true" />}
              tone="primary"
              subtitle="رسائل فورية"
              progress={percentage(stats.whatsapp, stats.total)}
            />

            <ExecutiveCard
              title="اجتماعات"
              value={stats.meetings}
              icon={<Users size={22} aria-hidden="true" />}
              tone="gold"
              subtitle="لقاءات رسمية"
              progress={percentage(stats.meetings, stats.total)}
            />

            <ExecutiveCard
              title="زيارات"
              value={stats.visits}
              icon={<CalendarDays size={22} aria-hidden="true" />}
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

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
            <div className="mb-5 flex items-center gap-2">
              <Users className="text-[var(--app-text)]" size={22} />
              <h2 className="text-xl font-black text-[var(--app-text)]">سجلات التواصل</h2>
            </div>

            {filteredCommunications.length === 0 ? (
              <UiEmptyState
                icon={<MessageCircle className="h-8 w-8" aria-hidden="true" />}
                title="لا توجد سجلات تواصل"
                description="غيّر البحث أو الفلتر، أو أضف سجل تواصل جديدًا."
              />
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
    <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 transition hover:-translate-y-0.5 hover:bg-[var(--app-card)] hover:shadow-[var(--app-shadow-md)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${methodTone(item.communication_method)}`}>
              {methodIcon(item.communication_method)}
              {item.communication_method || "تواصل"}
            </span>

            <span className="text-sm font-bold text-[var(--app-text-muted)]">
              {formatDate(item.communication_date || item.created_at)}
            </span>
          </div>

          <h3 className="text-lg font-black text-[var(--app-text)]">{item.topic || "—"}</h3>

          <p className="mt-2 leading-7 text-[var(--app-text-muted)]">النتيجة: {item.result || "—"}</p>

          {item.notes && (
            <p className="mt-2 rounded-[var(--app-radius-lg)] bg-[var(--app-card)] p-3 leading-7 text-[var(--app-text-muted)]">
              {item.notes}
            </p>
          )}

          <p className="mt-3 text-sm text-[var(--app-text-muted)]">
            ولي الأمر: {item.guardian_name || "—"}
          </p>
        </div>

        <div className="flex shrink-0 gap-2 print:hidden">
          <SecondaryButton onClick={() => onEdit(item)}>
            تعديل
          </SecondaryButton>

          <SecondaryButton
            icon={<Trash2 size={15} aria-hidden="true" />}
            onClick={() => void onDelete(item)}
          >
            حذف
          </SecondaryButton>
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
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-[color-mix(in_srgb,var(--app-text)_44%,transparent)] p-4 backdrop-blur-sm">
      <aside className="h-full w-full max-w-xl overflow-y-auto rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-6 shadow-[var(--app-shadow-xl)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[var(--app-text)]">
              {editingItem ? "تعديل سجل التواصل" : "إضافة تواصل جديد"}
            </h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">{student.full_name}</p>
          </div>

          <IconButton
            label="إغلاق نموذج التواصل"
            title="إغلاق"
            onClick={onClose}
            icon={<X size={18} aria-hidden="true" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <FormField label="تاريخ التواصل">
            <input
              type="date"
              value={form.communication_date}
              onChange={(event) => setForm({ ...form, communication_date: event.target.value })}
              className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
            />
          </FormField>

          <FormField label="اسم ولي الأمر">
            <input
              value={form.guardian_name}
              onChange={(event) => setForm({ ...form, guardian_name: event.target.value })}
              placeholder="اسم ولي الأمر"
              className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
            />
          </FormField>

          <FormField label="طريقة التواصل">
            <select
              value={form.communication_method}
              onChange={(event) => setForm({ ...form, communication_method: event.target.value })}
              className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
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
              className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
            />
          </FormField>

          <FormField label="النتيجة">
            <input
              value={form.result}
              onChange={(event) => setForm({ ...form, result: event.target.value })}
              placeholder="مثال: تم التواصل بنجاح"
              className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
            />
          </FormField>

          <FormField label="ملاحظات">
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              rows={5}
              placeholder="اكتب تفاصيل التواصل..."
              className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
            />
          </FormField>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <SecondaryButton onClick={onClose}>
            إلغاء
          </SecondaryButton>

          <PrimaryButton
            icon={<Save size={17} aria-hidden="true" />}
            onClick={onSave}
            loading={saving}
          >
            حفظ التواصل
          </PrimaryButton>
        </div>
      </aside>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[var(--app-text-muted)]">{label}</span>
      {children}
    </label>
  );
}


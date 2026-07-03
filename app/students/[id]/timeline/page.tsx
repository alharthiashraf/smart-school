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
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  HeartPulse,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

type Student = {
  id: string;
  school_id?: string | null;
  full_name: string;
  national_id?: string | null;
  student_number?: string | null;
  grade_level?: string | null;
  classroom?: string | null;
  class_name?: string | null;
  section?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  status?: string | null;
};

type TimelineEvent = {
  id: string;
  school_id?: string | null;
  student_id: string;
  student_name?: string | null;
  event_type?: string | null;
  event_title?: string | null;
  event_description?: string | null;
  source_role?: string | null;
  source_user_id?: string | null;
  source_user_name?: string | null;
  related_referral_id?: string | null;
  related_attendance_id?: string | null;
  event_time?: string | null;
  created_at?: string | null;
  source_table?: string;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type EventForm = {
  event_type: string;
  event_title: string;
  event_description: string;
  source_role: string;
  source_user_name: string;
  event_time: string;
};

const TIMELINE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "student_counselor",
  "health_supervisor",
  "teacher",
];

const EVENT_TYPES = [
  "غياب",
  "تأخر",
  "حضور",
  "مخالفة",
  "تدخل إرشادي",
  "إحالة صحية",
  "زيارة صحية",
  "حالة صحية",
  "تواصل ولي أمر",
  "ملاحظة",
  "تكريم",
  "أخرى",
];

function todayDateTimeLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value.replace("T", " ").slice(0, 16);
  }
}

function normalizeAttendanceStatus(status?: string | null) {
  if (!status) return "حضور";
  if (status === "present") return "حضور";
  if (status === "absent") return "غياب";
  if (status === "late") return "تأخر";
  if (status === "excused") return "غياب بعذر";
  return status;
}

function eventTone(type?: string | null) {
  const value = String(type || "");

  if (value.includes("غياب") || value.includes("مخالفة")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (value.includes("تأخر") || value.includes("تدخل")) {
    return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";
  }

  if (value.includes("صحية") || value.includes("زيارة") || value.includes("حالة")) {
    return "border-[#3D7EB9]/20 bg-[#3D7EB9]/10 text-[#3D7EB9]";
  }

  if (value.includes("حضور") || value.includes("تكريم")) {
    return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
  }

  if (value.includes("تواصل")) {
    return "border-[#0DA9A6]/20 bg-[#0DA9A6]/10 text-[#0DA9A6]";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function eventIcon(type?: string | null) {
  const value = String(type || "");

  if (value.includes("غياب") || value.includes("مخالفة")) return <ShieldAlert size={16} />;
  if (value.includes("صحية") || value.includes("زيارة") || value.includes("حالة")) return <HeartPulse size={16} />;
  if (value.includes("تواصل")) return <MessageCircle size={16} />;
  if (value.includes("حضور") || value.includes("تكريم")) return <CheckCircle2 size={16} />;
  return <CalendarClock size={16} />;
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function eventDateForSort(item: TimelineEvent) {
  return new Date(item.event_time || item.created_at || 0).getTime();
}

function buildInitialForm(): EventForm {
  return {
    event_type: "ملاحظة",
    event_title: "",
    event_description: "",
    source_role: "إداري",
    source_user_name: "",
    event_time: todayDateTimeLocal(),
  };
}

export default function StudentTimelinePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = String(params.id || "");
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [student, setStudent] = useState<Student | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [form, setForm] = useState<EventForm>(buildInitialForm());

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

      const [
        timelineResult,
        attendanceResult,
        behaviorResult,
        interventionsResult,
        parentCommunicationsResult,
        healthVisitsResult,
        healthReferralsResult,
        healthCasesResult,
      ] = await Promise.all([
        supabase.from("student_timeline").select("*").eq("student_id", studentId).order("event_time", { ascending: false }),
        supabase.from("attendance").select("*").eq("student_id", studentId).order("attendance_date", { ascending: false }),
        supabase.from("student_behavior").select("*").eq("student_id", studentId).order("behavior_date", { ascending: false }),
        supabase.from("student_interventions").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
        supabase.from("parent_communications").select("*").eq("student_id", studentId).order("communication_date", { ascending: false }),
        supabase.from("health_visits").select("*").eq("student_id", studentId).order("visit_date", { ascending: false }),
        supabase.from("health_referrals").select("*").eq("student_id", studentId).order("referral_date", { ascending: false }),
        supabase.from("health_cases").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
      ]);

      const manualEvents = ((timelineResult.data || []) as TimelineEvent[])
        .filter((row) => !realSchoolId || !row.school_id || row.school_id === realSchoolId)
        .map((row) => ({ ...row, source_table: "student_timeline" }));

      const attendanceEvents: TimelineEvent[] = ((attendanceResult.data || []) as any[])
        .filter((row) => !realSchoolId || !row.school_id || row.school_id === realSchoolId)
        .map((row) => {
          const status = normalizeAttendanceStatus(row.status);

          return {
            id: `attendance-${row.id}`,
            school_id: row.school_id,
            student_id: row.student_id,
            student_name: currentStudent.full_name,
            event_type: status,
            event_title: `سجل حضور: ${status}`,
            event_description: `تم تسجيل حالة الطالب في الحضور: ${status}`,
            source_role: "الحضور",
            related_attendance_id: row.id,
            event_time: row.recorded_at || row.attendance_date || row.created_at,
            created_at: row.created_at,
            source_table: "attendance",
          };
        });

      const behaviorEvents: TimelineEvent[] = ((behaviorResult.data || []) as any[])
        .filter((row) => !realSchoolId || !row.school_id || row.school_id === realSchoolId)
        .map((row) => ({
          id: `behavior-${row.id}`,
          school_id: row.school_id,
          student_id: row.student_id,
          student_name: currentStudent.full_name,
          event_type: "مخالفة",
          event_title: row.violation_type || "سجل سلوكي",
          event_description: [
            row.notes,
            row.action_taken ? `الإجراء: ${row.action_taken}` : "",
            row.violation_level ? `المستوى: ${row.violation_level}` : "",
            row.status ? `الحالة: ${row.status}` : "",
          ].filter(Boolean).join(" | "),
          source_role: "السلوك",
          event_time: row.behavior_date || row.created_at,
          created_at: row.created_at,
          source_table: "student_behavior",
        }));

      const interventionEvents: TimelineEvent[] = ((interventionsResult.data || []) as any[])
        .filter((row) => !realSchoolId || !row.school_id || row.school_id === realSchoolId)
        .map((row) => ({
          id: `intervention-${row.id}`,
          school_id: row.school_id,
          student_id: row.student_id,
          student_name: currentStudent.full_name,
          event_type: "تدخل إرشادي",
          event_title: row.title || row.intervention_type || "تدخل إرشادي",
          event_description: [
            row.notes,
            row.intervention_type ? `النوع: ${row.intervention_type}` : "",
            row.status ? `الحالة: ${row.status}` : "",
          ].filter(Boolean).join(" | "),
          source_role: "الإرشاد",
          event_time: row.created_at,
          created_at: row.created_at,
          source_table: "student_interventions",
        }));

      const parentEvents: TimelineEvent[] = ((parentCommunicationsResult.data || []) as any[])
        .filter((row) => !realSchoolId || !row.school_id || row.school_id === realSchoolId)
        .map((row) => ({
          id: `parent-${row.id}`,
          school_id: row.school_id,
          student_id: row.student_id,
          student_name: currentStudent.full_name,
          event_type: "تواصل ولي أمر",
          event_title: row.topic || "تواصل مع ولي الأمر",
          event_description: [
            row.guardian_name ? `ولي الأمر: ${row.guardian_name}` : "",
            row.communication_method ? `الطريقة: ${row.communication_method}` : "",
            row.result ? `النتيجة: ${row.result}` : "",
            row.notes,
          ].filter(Boolean).join(" | "),
          source_role: "تواصل ولي الأمر",
          event_time: row.communication_date || row.created_at,
          created_at: row.created_at,
          source_table: "parent_communications",
        }));

      const healthVisitEvents: TimelineEvent[] = ((healthVisitsResult.data || []) as any[])
        .filter((row) => !realSchoolId || !row.school_id || row.school_id === realSchoolId)
        .map((row) => ({
          id: `health-visit-${row.id}`,
          school_id: row.school_id,
          student_id: row.student_id,
          student_name: currentStudent.full_name,
          event_type: "زيارة صحية",
          event_title: row.symptoms || "زيارة للعيادة الصحية",
          event_description: [
            row.diagnosis ? `التشخيص: ${row.diagnosis}` : "",
            row.temperature ? `الحرارة: ${row.temperature}` : "",
            row.blood_pressure ? `الضغط: ${row.blood_pressure}` : "",
            row.treatment ? `العلاج: ${row.treatment}` : "",
            row.notes,
            row.visit_status ? `الحالة: ${row.visit_status}` : "",
          ].filter(Boolean).join(" | "),
          source_role: "الموجه الصحي",
          event_time: row.created_at || row.visit_date,
          created_at: row.created_at,
          source_table: "health_visits",
        }));

      const healthReferralEvents: TimelineEvent[] = ((healthReferralsResult.data || []) as any[])
        .filter((row) => !realSchoolId || !row.school_id || row.school_id === realSchoolId)
        .map((row) => ({
          id: `health-referral-${row.id}`,
          school_id: row.school_id,
          student_id: row.student_id,
          student_name: currentStudent.full_name,
          event_type: "إحالة صحية",
          event_title: row.reason || "تحويل صحي",
          event_description: [
            row.referral_type ? `نوع التحويل: ${row.referral_type}` : "",
            row.referral_destination ? `الجهة: ${row.referral_destination}` : "",
            row.notes,
            row.status ? `الحالة: ${row.status}` : "",
          ].filter(Boolean).join(" | "),
          source_role: "الموجه الصحي",
          related_referral_id: row.id,
          event_time: row.created_at || row.referral_date,
          created_at: row.created_at,
          source_table: "health_referrals",
        }));

      const healthCaseEvents: TimelineEvent[] = ((healthCasesResult.data || []) as any[])
        .filter((row) => !realSchoolId || !row.school_id || row.school_id === realSchoolId)
        .map((row) => ({
          id: `health-case-${row.id}`,
          school_id: row.school_id,
          student_id: row.student_id,
          student_name: currentStudent.full_name,
          event_type: "حالة صحية",
          event_title: row.case_type || "حالة صحية مزمنة",
          event_description: [
            row.severity ? `الخطورة: ${row.severity}` : "",
            row.diagnosis ? `التشخيص: ${row.diagnosis}` : "",
            row.medications ? `الأدوية: ${row.medications}` : "",
            row.action_plan ? `الخطة: ${row.action_plan}` : "",
            row.case_status ? `الحالة: ${row.case_status}` : "",
          ].filter(Boolean).join(" | "),
          source_role: "الموجه الصحي",
          event_time: row.created_at,
          created_at: row.created_at,
          source_table: "health_cases",
        }));

      const allEvents = [
        ...manualEvents,
        ...attendanceEvents,
        ...behaviorEvents,
        ...interventionEvents,
        ...parentEvents,
        ...healthVisitEvents,
        ...healthReferralEvents,
        ...healthCaseEvents,
      ].sort((a, b) => eventDateForSort(b) - eventDateForSort(a));

      setStudent(currentStudent);
      setEvents(allEvents);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل السجل الزمني";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return events.filter((item) => {
      const matchesType = typeFilter === "الكل" || item.event_type === typeFilter;

      const text = [
        item.event_type,
        item.event_title,
        item.event_description,
        item.source_role,
        item.source_user_name,
        item.source_table,
      ].join(" ").toLowerCase();

      return matchesType && (!keyword || text.includes(keyword));
    });
  }, [events, search, typeFilter]);

  const stats = useMemo(() => {
    const total = events.length;
    const absence = events.filter((item) => String(item.event_type || "").includes("غياب")).length;
    const late = events.filter((item) => String(item.event_type || "").includes("تأخر")).length;
    const interventions = events.filter((item) => String(item.event_type || "").includes("تدخل")).length;
    const health = events.filter((item) =>
      ["زيارة صحية", "إحالة صحية", "حالة صحية"].includes(String(item.event_type || "")),
    ).length;
    const automatic = events.filter((item) => item.source_table && item.source_table !== "student_timeline").length;

    return { total, absence, late, interventions, health, automatic };
  }, [events]);

  function resetForm() {
    setEditingEvent(null);
    setForm(buildInitialForm());
  }

  function openCreateDrawer() {
    resetForm();
    setDrawerOpen(true);
  }

  function openEditDrawer(item: TimelineEvent) {
    if (item.source_table && item.source_table !== "student_timeline") {
      showToast("error", "هذا الحدث آلي من جدول آخر، يمكن تعديله من صفحته الأصلية.");
      return;
    }

    setEditingEvent(item);
    setForm({
      event_type: item.event_type || "ملاحظة",
      event_title: item.event_title || "",
      event_description: item.event_description || "",
      source_role: item.source_role || "إداري",
      source_user_name: item.source_user_name || "",
      event_time: item.event_time
        ? item.event_time.replace("T", " ").slice(0, 16).replace(" ", "T")
        : todayDateTimeLocal(),
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    resetForm();
    setDrawerOpen(false);
  }

  async function saveEvent() {
    if (!student) return;

    if (!form.event_title.trim()) {
      showToast("error", "اكتب عنوان الحدث");
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        school_id: student.school_id || currentSchool?.id || null,
        student_id: student.id,
        student_name: student.full_name,
        event_type: form.event_type,
        event_title: form.event_title.trim(),
        event_description: form.event_description.trim() || null,
        source_role: form.source_role.trim() || null,
        source_user_id: user?.id || null,
        source_user_name: form.source_user_name.trim() || null,
        event_time: form.event_time ? new Date(form.event_time).toISOString() : new Date().toISOString(),
      };

      if (editingEvent) {
        const { error } = await supabase
          .from("student_timeline")
          .update(payload)
          .eq("id", editingEvent.id)
          .eq("student_id", student.id);

        if (error) throw error;

        showToast("success", "تم تحديث الحدث");
      } else {
        const { error } = await supabase.from("student_timeline").insert(payload);
        if (error) throw error;

        showToast("success", "تمت إضافة الحدث");
      }

      closeDrawer();
      void fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الحدث";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(item: TimelineEvent) {
    if (item.source_table && item.source_table !== "student_timeline") {
      showToast("error", "هذا الحدث آلي من جدول آخر، يمكن حذفه من صفحته الأصلية.");
      return;
    }

    const confirmed = window.confirm("هل تريد حذف هذا الحدث من السجل الزمني؟");
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("student_timeline")
        .delete()
        .eq("id", item.id)
        .eq("student_id", studentId);

      if (error) throw error;

      showToast("success", "تم حذف الحدث");
      void fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حذف الحدث";
      showToast("error", message);
    }
  }

  const exportRows = useMemo(() => {
    return filteredEvents.map((item, index) => ({
      "#": index + 1,
      "اسم الطالب": student?.full_name || "—",
      "التاريخ": formatDateTime(item.event_time || item.created_at),
      "النوع": item.event_type || "—",
      "العنوان": item.event_title || "—",
      "الوصف": item.event_description || "—",
      "المصدر": item.source_user_name || item.source_role || "—",
      "الجدول": item.source_table || "student_timeline",
    }));
  }, [filteredEvents, student]);

  async function exportExcel() {
    await exportTableToExcel({
      fileName: `student-timeline-${student?.full_name || "student"}.xlsx`,
      sheetName: "Timeline",
      rows: exportRows,
    } as any);

    showToast("success", "تم تصدير السجل Excel");
  }

  function exportPDF() {
    exportTableToPDF({
      title: "السجل الزمني للطالب",
      fileName: `student-timeline-${student?.full_name || "student"}.pdf`,
      rows: exportRows,
    } as any);

    showToast("success", "تم تجهيز PDF");
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={TIMELINE_ROLES}>
        <AppShell>
          <LoadingBox text="جاري تحميل السجل الزمني للطالب..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!student) {
    return (
      <RoleGuard allowedRoles={TIMELINE_ROLES}>
        <AppShell>
          <div className="rounded-[28px] border border-red-100 bg-red-50 p-8 text-center font-bold text-red-700">
            لم يتم العثور على الطالب.
          </div>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={TIMELINE_ROLES}>
      <AppShell>
        <main className="space-y-5" dir="rtl">
          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="السجل الزمني للطالب"
            description="تجميع ذكي للأحداث المرتبطة بالطالب من الحضور والسلوك والتدخلات والتواصل والصحة، مع إمكانية إضافة أحداث يدوية."
            badge="ملف الطالب"
            icon={<CalendarClock size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الطلاب", href: "/students" },
              { label: student.full_name, href: `/students/${student.id}` },
              { label: "السجل الزمني" },
            ]}
            meta={[
              { label: "الطالب", value: student.full_name },
              { label: "الصف", value: student.grade_level || "—" },
              { label: "الفصل", value: student.classroom || student.class_name || "—" },
              { label: "المعروض", value: filteredEvents.length },
            ]}
            stats={[
              { label: "إجمالي الأحداث", value: stats.total, icon: <CalendarClock size={20} />, tone: "blue" },
              { label: "الغياب", value: stats.absence, icon: <ShieldAlert size={20} />, tone: stats.absence > 0 ? "red" : "green" },
              { label: "التدخلات", value: stats.interventions, icon: <UserCheck size={20} />, tone: "gold" },
              { label: "الصحة", value: stats.health, icon: <HeartPulse size={20} />, tone: "teal" },
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
                  إضافة حدث
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

          <section className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <ExecutiveCard title="إجمالي الأحداث" value={stats.total} icon={<CalendarClock size={22} />} tone="blue" subtitle="كل الأحداث" progress={stats.total > 0 ? 100 : 0} />
            <ExecutiveCard title="الغياب" value={stats.absence} icon={<ShieldAlert size={22} />} tone={stats.absence > 0 ? "red" : "green"} subtitle="أحداث الغياب" progress={percentage(stats.absence, stats.total)} />
            <ExecutiveCard title="التأخر" value={stats.late} icon={<AlertTriangle size={22} />} tone={stats.late > 0 ? "gold" : "green"} subtitle="أحداث التأخر" progress={percentage(stats.late, stats.total)} />
            <ExecutiveCard title="التدخلات" value={stats.interventions} icon={<UserCheck size={22} />} tone="gold" subtitle="إرشاد ومتابعة" progress={percentage(stats.interventions, stats.total)} />
            <ExecutiveCard title="الصحية" value={stats.health} icon={<HeartPulse size={22} />} tone="teal" subtitle="سجلات صحية" progress={percentage(stats.health, stats.total)} />
            <ExecutiveCard title="تلقائي" value={stats.automatic} icon={<CheckCircle2 size={22} />} tone="primary" subtitle="من جداول النظام" progress={percentage(stats.automatic, stats.total)} />
          </section>

          <SummaryCard
            title="ملخص السجل الزمني"
            description="قراءة تنفيذية لأهم أحداث الطالب المسجلة يدويًا أو المجمعة تلقائيًا من بقية وحدات النظام."
            tone={stats.absence + stats.late > 0 ? "gold" : "green"}
            items={[
              { label: "إجمالي الأحداث", value: stats.total },
              { label: "الغياب", value: stats.absence },
              { label: "التأخر", value: stats.late },
              { label: "التدخلات", value: stats.interventions },
              { label: "الصحة", value: stats.health },
              { label: "تلقائي", value: stats.automatic },
            ]}
            footer="الأحداث الآلية يتم تعديلها من صفحتها الأصلية، أما الأحداث اليدوية فيمكن تعديلها أو حذفها من هنا."
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm print:hidden">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "بحث في نوع الحدث، العنوان، الوصف، أو المصدر...",
              }}
              filters={
                <ToolbarSelect value={typeFilter} onChange={setTypeFilter}>
                  <option value="الكل">كل الأحداث</option>
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
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
              <CalendarClock className="text-[#15445A]" size={22} />
              <h2 className="text-xl font-black text-[#15445A]">الأحداث الزمنية</h2>
            </div>

            {filteredEvents.length === 0 ? (
              <EmptyBox text="لا توجد أحداث مطابقة." />
            ) : (
              <div className="relative space-y-4 before:absolute before:right-5 before:top-0 before:h-full before:w-px before:bg-slate-200">
                {filteredEvents.map((item) => (
                  <TimelineCard
                    key={item.id}
                    item={item}
                    onEdit={openEditDrawer}
                    onDelete={deleteEvent}
                  />
                ))}
              </div>
            )}
          </section>

          {drawerOpen && (
            <EventDrawer
              editingEvent={editingEvent}
              form={form}
              setForm={setForm}
              saving={saving}
              student={student}
              onClose={closeDrawer}
              onSave={saveEvent}
            />
          )}
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function TimelineCard({
  item,
  onEdit,
  onDelete,
}: {
  item: TimelineEvent;
  onEdit: (item: TimelineEvent) => void;
  onDelete: (item: TimelineEvent) => void;
}) {
  const isAutomatic = Boolean(item.source_table && item.source_table !== "student_timeline");

  return (
    <div className="relative pr-12">
      <div className={`absolute right-0 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-2xl border ${eventTone(item.event_type)}`}>
        {eventIcon(item.event_type)}
      </div>

      <div className="rounded-[28px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${eventTone(item.event_type)}`}>
                {item.event_type || "حدث"}
              </span>

              <span className="text-sm font-bold text-slate-500">
                {formatDateTime(item.event_time || item.created_at)}
              </span>

              {isAutomatic && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                  تلقائي
                </span>
              )}
            </div>

            <h3 className="text-lg font-black text-[#15445A]">{item.event_title || "—"}</h3>

            <p className="mt-2 leading-7 text-slate-600">
              {item.event_description || "لا يوجد وصف"}
            </p>

            <p className="mt-3 text-sm text-slate-500">
              المصدر: {item.source_user_name || item.source_role || "—"}
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
    </div>
  );
}

function EventDrawer({
  editingEvent,
  form,
  setForm,
  saving,
  student,
  onClose,
  onSave,
}: {
  editingEvent: TimelineEvent | null;
  form: EventForm;
  setForm: (form: EventForm) => void;
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
              {editingEvent ? "تعديل حدث" : "إضافة حدث جديد"}
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
          <FormField label="نوع الحدث">
            <select
              value={form.event_type}
              onChange={(event) => setForm({ ...form, event_type: event.target.value })}
              className="field"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </FormField>

          <FormField label="عنوان الحدث">
            <input
              value={form.event_title}
              onChange={(event) => setForm({ ...form, event_title: event.target.value })}
              placeholder="مثال: غياب بدون عذر"
              className="field"
            />
          </FormField>

          <FormField label="وقت الحدث">
            <input
              type="datetime-local"
              value={form.event_time}
              onChange={(event) => setForm({ ...form, event_time: event.target.value })}
              className="field"
            />
          </FormField>

          <FormField label="الدور / المصدر">
            <input
              value={form.source_role}
              onChange={(event) => setForm({ ...form, source_role: event.target.value })}
              placeholder="مرشد / وكيل / معلم"
              className="field"
            />
          </FormField>

          <FormField label="اسم المدخل">
            <input
              value={form.source_user_name}
              onChange={(event) => setForm({ ...form, source_user_name: event.target.value })}
              placeholder="اسم المستخدم"
              className="field"
            />
          </FormField>

          <FormField label="الوصف">
            <textarea
              value={form.event_description}
              onChange={(event) => setForm({ ...form, event_description: event.target.value })}
              rows={5}
              placeholder="اكتب تفاصيل الحدث..."
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
            {saving ? "جاري الحفظ..." : "حفظ الحدث"}
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

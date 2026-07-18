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
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  HeartPulse,
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

type SourceRow = Record<string, unknown>;

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

const EXPORT_HEADERS = [
  "#",
  "اسم الطالب",
  "التاريخ",
  "النوع",
  "العنوان",
  "الوصف",
  "المصدر",
  "الجدول",
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

function textValue(
  row: SourceRow,
  keys: string[],
  fallback = "",
): string {
  for (const key of keys) {
    const value = row[key];

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function nullableText(row: SourceRow, keys: string[]) {
  return textValue(row, keys, "") || null;
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
    return "border-[color-mix(in_srgb,var(--app-danger)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)]";
  }

  if (value.includes("تأخر") || value.includes("تدخل")) {
    return "border-[color-mix(in_srgb,var(--app-accent)_30%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";
  }

  if (
    value.includes("صحية") ||
    value.includes("زيارة") ||
    value.includes("حالة")
  ) {
    return "border-[color-mix(in_srgb,var(--app-primary)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)] text-[var(--app-primary)]";
  }

  if (value.includes("حضور") || value.includes("تكريم")) {
    return "border-[color-mix(in_srgb,var(--app-success)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]";
  }

  if (value.includes("تواصل")) {
    return "border-[color-mix(in_srgb,var(--app-primary)_24%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_8%,transparent)] text-[var(--app-primary)]";
  }

  return "border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text)]";
}

function eventIcon(type?: string | null) {
  const value = String(type || "");

  if (value.includes("غياب") || value.includes("مخالفة")) return <ShieldAlert size={16} aria-hidden="true" />;
  if (value.includes("صحية") || value.includes("زيارة") || value.includes("حالة")) return <HeartPulse size={16} aria-hidden="true" />;
  if (value.includes("تواصل")) return <MessageCircle size={16} aria-hidden="true" />;
  if (value.includes("حضور") || value.includes("تكريم")) return <CheckCircle2 size={16} aria-hidden="true" />;
  return <CalendarClock size={16} aria-hidden="true" />;
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
        supabase
          .from("student_timeline")
          .select("*")
          .eq("school_id", realSchoolId || "")
          .eq("student_id", studentId)
          .order("event_time", { ascending: false }),
        supabase
          .from("attendance")
          .select("*")
          .eq("school_id", realSchoolId || "")
          .eq("student_id", studentId)
          .order("attendance_date", { ascending: false }),
        supabase
          .from("student_behavior")
          .select("*")
          .eq("school_id", realSchoolId || "")
          .eq("student_id", studentId)
          .order("behavior_date", { ascending: false }),
        supabase
          .from("student_interventions")
          .select("*")
          .eq("school_id", realSchoolId || "")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
        supabase
          .from("parent_communications")
          .select("*")
          .eq("school_id", realSchoolId || "")
          .eq("student_id", studentId)
          .order("communication_date", { ascending: false }),
        supabase
          .from("health_visits")
          .select("*")
          .eq("school_id", realSchoolId || "")
          .eq("student_id", studentId)
          .order("visit_date", { ascending: false }),
        supabase
          .from("health_referrals")
          .select("*")
          .eq("school_id", realSchoolId || "")
          .eq("student_id", studentId)
          .order("referral_date", { ascending: false }),
        supabase
          .from("health_cases")
          .select("*")
          .eq("school_id", realSchoolId || "")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
      ]);

      const manualEvents = ((timelineResult.data || []) as TimelineEvent[])
        .filter((row) => !realSchoolId || !nullableText(row, ["school_id"]) || nullableText(row, ["school_id"]) === realSchoolId)
        .map((row) => ({ ...row, source_table: "student_timeline" }));

      const attendanceEvents: TimelineEvent[] = ((attendanceResult.data || []) as SourceRow[])
        .filter((row) => !realSchoolId || !nullableText(row, ["school_id"]) || nullableText(row, ["school_id"]) === realSchoolId)
        .map((row) => {
          const status = normalizeAttendanceStatus(nullableText(row, ["status"]));

          return {
            id: `attendance-${textValue(row, ["id"])}`,
            school_id: nullableText(row, ["school_id"]),
            student_id: textValue(row, ["student_id"]),
            student_name: currentStudent.full_name,
            event_type: status,
            event_title: `سجل حضور: ${status}`,
            event_description: `تم تسجيل حالة الطالب في الحضور: ${status}`,
            source_role: "الحضور",
            related_attendance_id: textValue(row, ["id"]),
            event_time: nullableText(row, ["recorded_at"]) || nullableText(row, ["attendance_date"]) || nullableText(row, ["created_at"]),
            created_at: nullableText(row, ["created_at"]),
            source_table: "attendance",
          };
        });

      const behaviorEvents: TimelineEvent[] = ((behaviorResult.data || []) as SourceRow[])
        .filter((row) => !realSchoolId || !nullableText(row, ["school_id"]) || nullableText(row, ["school_id"]) === realSchoolId)
        .map((row) => ({
          id: `behavior-${textValue(row, ["id"])}`,
          school_id: nullableText(row, ["school_id"]),
          student_id: textValue(row, ["student_id"]),
          student_name: currentStudent.full_name,
          event_type: "مخالفة",
          event_title: nullableText(row, ["violation_type"]) || "سجل سلوكي",
          event_description: [
            nullableText(row, ["notes"]),
            nullableText(row, ["action_taken"]) ? `الإجراء: ${nullableText(row, ["action_taken"])}` : "",
            nullableText(row, ["violation_level"]) ? `المستوى: ${nullableText(row, ["violation_level"])}` : "",
            nullableText(row, ["status"]) ? `الحالة: ${nullableText(row, ["status"])}` : "",
          ].filter(Boolean).join(" | "),
          source_role: "السلوك",
          event_time: nullableText(row, ["behavior_date"]) || nullableText(row, ["created_at"]),
          created_at: nullableText(row, ["created_at"]),
          source_table: "student_behavior",
        }));

      const interventionEvents: TimelineEvent[] = ((interventionsResult.data || []) as SourceRow[])
        .filter((row) => !realSchoolId || !nullableText(row, ["school_id"]) || nullableText(row, ["school_id"]) === realSchoolId)
        .map((row) => ({
          id: `intervention-${textValue(row, ["id"])}`,
          school_id: nullableText(row, ["school_id"]),
          student_id: textValue(row, ["student_id"]),
          student_name: currentStudent.full_name,
          event_type: "تدخل إرشادي",
          event_title: nullableText(row, ["title"]) || nullableText(row, ["intervention_type"]) || "تدخل إرشادي",
          event_description: [
            nullableText(row, ["notes"]),
            nullableText(row, ["intervention_type"]) ? `النوع: ${nullableText(row, ["intervention_type"])}` : "",
            nullableText(row, ["status"]) ? `الحالة: ${nullableText(row, ["status"])}` : "",
          ].filter(Boolean).join(" | "),
          source_role: "الإرشاد",
          event_time: nullableText(row, ["created_at"]),
          created_at: nullableText(row, ["created_at"]),
          source_table: "student_interventions",
        }));

      const parentEvents: TimelineEvent[] = ((parentCommunicationsResult.data || []) as SourceRow[])
        .filter((row) => !realSchoolId || !nullableText(row, ["school_id"]) || nullableText(row, ["school_id"]) === realSchoolId)
        .map((row) => ({
          id: `parent-${textValue(row, ["id"])}`,
          school_id: nullableText(row, ["school_id"]),
          student_id: textValue(row, ["student_id"]),
          student_name: currentStudent.full_name,
          event_type: "تواصل ولي أمر",
          event_title: nullableText(row, ["topic"]) || "تواصل مع ولي الأمر",
          event_description: [
            nullableText(row, ["guardian_name"]) ? `ولي الأمر: ${nullableText(row, ["guardian_name"])}` : "",
            nullableText(row, ["communication_method"]) ? `الطريقة: ${nullableText(row, ["communication_method"])}` : "",
            nullableText(row, ["result"]) ? `النتيجة: ${nullableText(row, ["result"])}` : "",
            nullableText(row, ["notes"]),
          ].filter(Boolean).join(" | "),
          source_role: "تواصل ولي الأمر",
          event_time: nullableText(row, ["communication_date"]) || nullableText(row, ["created_at"]),
          created_at: nullableText(row, ["created_at"]),
          source_table: "parent_communications",
        }));

      const healthVisitEvents: TimelineEvent[] = ((healthVisitsResult.data || []) as SourceRow[])
        .filter((row) => !realSchoolId || !nullableText(row, ["school_id"]) || nullableText(row, ["school_id"]) === realSchoolId)
        .map((row) => ({
          id: `health-visit-${textValue(row, ["id"])}`,
          school_id: nullableText(row, ["school_id"]),
          student_id: textValue(row, ["student_id"]),
          student_name: currentStudent.full_name,
          event_type: "زيارة صحية",
          event_title: nullableText(row, ["symptoms"]) || "زيارة للعيادة الصحية",
          event_description: [
            nullableText(row, ["diagnosis"]) ? `التشخيص: ${nullableText(row, ["diagnosis"])}` : "",
            nullableText(row, ["temperature"]) ? `الحرارة: ${nullableText(row, ["temperature"])}` : "",
            nullableText(row, ["blood_pressure"]) ? `الضغط: ${nullableText(row, ["blood_pressure"])}` : "",
            nullableText(row, ["treatment"]) ? `العلاج: ${nullableText(row, ["treatment"])}` : "",
            nullableText(row, ["notes"]),
            nullableText(row, ["visit_status"]) ? `الحالة: ${nullableText(row, ["visit_status"])}` : "",
          ].filter(Boolean).join(" | "),
          source_role: "الموجه الصحي",
          event_time: nullableText(row, ["created_at"]) || nullableText(row, ["visit_date"]),
          created_at: nullableText(row, ["created_at"]),
          source_table: "health_visits",
        }));

      const healthReferralEvents: TimelineEvent[] = ((healthReferralsResult.data || []) as SourceRow[])
        .filter((row) => !realSchoolId || !nullableText(row, ["school_id"]) || nullableText(row, ["school_id"]) === realSchoolId)
        .map((row) => ({
          id: `health-referral-${textValue(row, ["id"])}`,
          school_id: nullableText(row, ["school_id"]),
          student_id: textValue(row, ["student_id"]),
          student_name: currentStudent.full_name,
          event_type: "إحالة صحية",
          event_title: nullableText(row, ["reason"]) || "تحويل صحي",
          event_description: [
            nullableText(row, ["referral_type"]) ? `نوع التحويل: ${nullableText(row, ["referral_type"])}` : "",
            nullableText(row, ["referral_destination"]) ? `الجهة: ${nullableText(row, ["referral_destination"])}` : "",
            nullableText(row, ["notes"]),
            nullableText(row, ["status"]) ? `الحالة: ${nullableText(row, ["status"])}` : "",
          ].filter(Boolean).join(" | "),
          source_role: "الموجه الصحي",
          related_referral_id: textValue(row, ["id"]),
          event_time: nullableText(row, ["created_at"]) || nullableText(row, ["referral_date"]),
          created_at: nullableText(row, ["created_at"]),
          source_table: "health_referrals",
        }));

      const healthCaseEvents: TimelineEvent[] = ((healthCasesResult.data || []) as SourceRow[])
        .filter((row) => !realSchoolId || !nullableText(row, ["school_id"]) || nullableText(row, ["school_id"]) === realSchoolId)
        .map((row) => ({
          id: `health-case-${textValue(row, ["id"])}`,
          school_id: nullableText(row, ["school_id"]),
          student_id: textValue(row, ["student_id"]),
          student_name: currentStudent.full_name,
          event_type: "حالة صحية",
          event_title: nullableText(row, ["case_type"]) || "حالة صحية مزمنة",
          event_description: [
            nullableText(row, ["severity"]) ? `الخطورة: ${nullableText(row, ["severity"])}` : "",
            nullableText(row, ["diagnosis"]) ? `التشخيص: ${nullableText(row, ["diagnosis"])}` : "",
            nullableText(row, ["medications"]) ? `الأدوية: ${nullableText(row, ["medications"])}` : "",
            nullableText(row, ["action_plan"]) ? `الخطة: ${nullableText(row, ["action_plan"])}` : "",
            nullableText(row, ["case_status"]) ? `الحالة: ${nullableText(row, ["case_status"])}` : "",
          ].filter(Boolean).join(" | "),
          source_role: "الموجه الصحي",
          event_time: nullableText(row, ["created_at"]),
          created_at: nullableText(row, ["created_at"]),
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
  }, [currentSchool?.id, showToast, studentId]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id || !studentId) {
      setLoading(false);
      setStudent(null);
      setEvents([]);
      return;
    }

    void fetchData();
  }, [currentSchool?.id, fetchData, schoolLoading, studentId]);

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

  const exportRows = useMemo<(string | number | null | undefined)[][]>(() => {
    return filteredEvents.map((item, index) => [
      index + 1,
      student?.full_name || "—",
      formatDateTime(item.event_time || item.created_at),
      item.event_type || "—",
      item.event_title || "—",
      item.event_description || "—",
      item.source_user_name || item.source_role || "—",
      item.source_table || "student_timeline",
    ]);
  }, [filteredEvents, student]);

  async function exportExcel() {
    await exportTableToExcel({
      title: "السجل الزمني للطالب",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: student?.full_name
        ? `السجل الزمني للطالب: ${student.full_name}`
        : "السجل الزمني للطالب",
      headers: EXPORT_HEADERS,
      rows: exportRows,
      fileName: `student-timeline-${student?.full_name || "student"}.xlsx`,
      sheetName: "Timeline",
    });

    showToast("success", "تم تصدير السجل Excel");
  }

  function exportPDF() {
    exportTableToPDF({
      title: "السجل الزمني للطالب",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: student?.full_name
        ? `السجل الزمني للطالب: ${student.full_name}`
        : "السجل الزمني للطالب",
      headers: EXPORT_HEADERS,
      rows: exportRows,
      fileName: `student-timeline-${student?.full_name || "student"}.pdf`,
    });

    showToast("success", "تم تجهيز PDF");
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={TIMELINE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل السجل الزمني للطالب..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool) {
    return (
      <RoleGuard allowedRoles={TIMELINE_ROLES}>
        <AppShell>
          <ErrorState description="لا توجد مدرسة مرتبطة بالمستخدم الحالي." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!student) {
    return (
      <RoleGuard allowedRoles={TIMELINE_ROLES}>
        <AppShell>
          <UiEmptyState
            icon={<UserCheck className="h-9 w-9" aria-hidden="true" />}
            title="لم يتم العثور على الطالب"
            description="تعذر العثور على الطالب ضمن المدرسة الحالية."
          />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={TIMELINE_ROLES}>
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
            title="السجل الزمني للطالب"
            description="تجميع ذكي للأحداث المرتبطة بالطالب من الحضور والسلوك والتدخلات والتواصل والصحة، مع إمكانية إضافة أحداث يدوية."
            badge="ملف الطالب"
            icon={<CalendarClock size={18} aria-hidden="true" />}
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
              { label: "إجمالي الأحداث", value: stats.total, icon: <CalendarClock size={20} aria-hidden="true" />, tone: "primary" },
              { label: "الغياب", value: stats.absence, icon: <ShieldAlert size={20} aria-hidden="true" />, tone: stats.absence > 0 ? "red" : "green" },
              { label: "التدخلات", value: stats.interventions, icon: <UserCheck size={20} aria-hidden="true" />, tone: "gold" },
              { label: "الصحة", value: stats.health, icon: <HeartPulse size={20} aria-hidden="true" />, tone: "primary" },
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
                  إضافة حدث
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

          <section className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <ExecutiveCard title="إجمالي الأحداث" value={stats.total} icon={<CalendarClock size={22} aria-hidden="true" />} tone="primary" subtitle="كل الأحداث" progress={stats.total > 0 ? 100 : 0} />
            <ExecutiveCard title="الغياب" value={stats.absence} icon={<ShieldAlert size={22} aria-hidden="true" />} tone={stats.absence > 0 ? "red" : "green"} subtitle="أحداث الغياب" progress={percentage(stats.absence, stats.total)} />
            <ExecutiveCard title="التأخر" value={stats.late} icon={<AlertTriangle size={22} aria-hidden="true" />} tone={stats.late > 0 ? "gold" : "green"} subtitle="أحداث التأخر" progress={percentage(stats.late, stats.total)} />
            <ExecutiveCard title="التدخلات" value={stats.interventions} icon={<UserCheck size={22} aria-hidden="true" />} tone="gold" subtitle="إرشاد ومتابعة" progress={percentage(stats.interventions, stats.total)} />
            <ExecutiveCard title="الصحية" value={stats.health} icon={<HeartPulse size={22} aria-hidden="true" />} tone="primary" subtitle="سجلات صحية" progress={percentage(stats.health, stats.total)} />
            <ExecutiveCard title="تلقائي" value={stats.automatic} icon={<CheckCircle2 size={22} aria-hidden="true" />} tone="primary" subtitle="من جداول النظام" progress={percentage(stats.automatic, stats.total)} />
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

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
            <div className="mb-5 flex items-center gap-2">
              <CalendarClock className="text-[var(--app-text)]" size={22} />
              <h2 className="text-xl font-black text-[var(--app-text)]">الأحداث الزمنية</h2>
            </div>

            {filteredEvents.length === 0 ? (
              <UiEmptyState
                icon={<CalendarClock className="h-8 w-8" aria-hidden="true" />}
                title="لا توجد أحداث"
                description="غيّر البحث أو الفلتر، أو أضف حدثًا جديدًا."
              />
            ) : (
              <div className="relative space-y-4 before:absolute before:right-5 before:top-0 before:h-full before:w-px before:bg-[var(--app-border)]">
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
      <div className={`absolute right-0 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-lg)] border ${eventTone(item.event_type)}`}>
        {eventIcon(item.event_type)}
      </div>

      <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 transition hover:bg-[var(--app-card)] hover:shadow-[var(--app-shadow-md)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${eventTone(item.event_type)}`}>
                {item.event_type || "حدث"}
              </span>

              <span className="text-sm font-bold text-[var(--app-text-muted)]">
                {formatDateTime(item.event_time || item.created_at)}
              </span>

              {isAutomatic && (
                <span className="rounded-full bg-[var(--app-card)] px-3 py-1 text-xs font-bold text-[var(--app-text-muted)]">
                  تلقائي
                </span>
              )}
            </div>

            <h3 className="text-lg font-black text-[var(--app-text)]">{item.event_title || "—"}</h3>

            <p className="mt-2 leading-7 text-[var(--app-text-muted)]">
              {item.event_description || "لا يوجد وصف"}
            </p>

            <p className="mt-3 text-sm text-[var(--app-text-muted)]">
              المصدر: {item.source_user_name || item.source_role || "—"}
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
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-[color-mix(in_srgb,var(--app-text)_44%,transparent)] p-4 backdrop-blur-sm">
      <aside className="h-full w-full max-w-xl overflow-y-auto rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-6 shadow-[var(--app-shadow-xl)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[var(--app-text)]">
              {editingEvent ? "تعديل حدث" : "إضافة حدث جديد"}
            </h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">{student.full_name}</p>
          </div>

          <IconButton
            label="إغلاق نموذج الحدث"
            title="إغلاق"
            onClick={onClose}
            icon={<X size={18} aria-hidden="true" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <FormField label="نوع الحدث">
            <select
              value={form.event_type}
              onChange={(event) => setForm({ ...form, event_type: event.target.value })}
              className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
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
              className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
            />
          </FormField>

          <FormField label="وقت الحدث">
            <input
              type="datetime-local"
              value={form.event_time}
              onChange={(event) => setForm({ ...form, event_time: event.target.value })}
              className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
            />
          </FormField>

          <FormField label="الدور / المصدر">
            <input
              value={form.source_role}
              onChange={(event) => setForm({ ...form, source_role: event.target.value })}
              placeholder="مرشد / وكيل / معلم"
              className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
            />
          </FormField>

          <FormField label="اسم المدخل">
            <input
              value={form.source_user_name}
              onChange={(event) => setForm({ ...form, source_user_name: event.target.value })}
              placeholder="اسم المستخدم"
              className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
            />
          </FormField>

          <FormField label="الوصف">
            <textarea
              value={form.event_description}
              onChange={(event) => setForm({ ...form, event_description: event.target.value })}
              rows={5}
              placeholder="اكتب تفاصيل الحدث..."
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
            حفظ الحدث
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


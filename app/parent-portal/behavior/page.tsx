"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import ExportButton from "@/components/ui/buttons/ExportButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ErrorState from "@/components/ui/feedback/ErrorState";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading";

import { supabase } from "@/lib/supabase";
import type { SchoolRole } from "@/lib/permissions";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  HeartHandshake,
  MessageSquareWarning,
  RefreshCcw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";

type Student = {
  id: string;
  full_name: string | null;
  national_id?: string | null;
  grade_name?: string | null;
  classroom_name?: string | null;
  guardian_email?: string | null;
  status?: string | null;
};

type BehaviorType =
  | "positive"
  | "violation"
  | "referral"
  | "note"
  | "intervention";

type SeverityKey = "all" | "low" | "medium" | "high" | "critical";
type TypeFilter = "all" | BehaviorType;

type BehaviorRow = {
  id: string;
  student_id: string;
  source: string;
  type: BehaviorType;
  title: string;
  description: string | null;
  action_taken: string | null;
  status: string | null;
  severity: Exclude<SeverityKey, "all">;
  points: number | null;
  behavior_date: string | null;
  created_at: string | null;
  created_by_name?: string | null;
};

const PARENT_ROLES: SchoolRole[] = ["super_admin", "school_admin", "parent"];

type RawBehaviorRow = Record<string, unknown>;
type ExportCell = string | number | null | undefined;

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function asRequiredString(value: unknown, fallback: string) {
  return asNullableString(value) ?? fallback;
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function normalizeSeverity(value?: string | null): Exclude<SeverityKey, "all"> {
  const s = String(value || "").trim().toLowerCase();

  if (!s) return "low";

  if (
    [
      "critical",
      "خطير",
      "حرج",
      "عالية جدًا",
      "عالي جدًا",
      "عالي جدا",
      "عالية جدا",
    ].includes(s)
  ) {
    return "critical";
  }

  if (["high", "عالي", "عالية", "شديد", "مرتفعة", "مرتفع"].includes(s)) {
    return "high";
  }

  if (["medium", "متوسط", "متوسطة"].includes(s)) {
    return "medium";
  }

  return "low";
}

function severityLabel(value?: string | null) {
  const key = normalizeSeverity(value);

  if (key === "critical") return "حرجة";
  if (key === "high") return "عالية";
  if (key === "medium") return "متوسطة";
  return "منخفضة";
}

function severityClass(value?: string | null) {
  const key = normalizeSeverity(value);

  if (key === "critical") return "border-[color-mix(in_srgb,var(--app-danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]";
  if (key === "high") return "border-[color-mix(in_srgb,var(--app-danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]";
  if (key === "medium") return "border-[color-mix(in_srgb,var(--app-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-text)]";

  return "border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]";
}

function typeLabel(type: BehaviorType) {
  if (type === "positive") return "تعزيز إيجابي";
  if (type === "violation") return "مخالفة";
  if (type === "referral") return "إحالة";
  if (type === "intervention") return "تدخل إرشادي";
  return "ملاحظة";
}

function typeClass(type: BehaviorType) {
  if (type === "positive") return "border-[color-mix(in_srgb,var(--app-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
  if (type === "violation") return "border-[color-mix(in_srgb,var(--app-danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]";
  if (type === "referral") return "border-[color-mix(in_srgb,var(--app-primary)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]";
  if (type === "intervention") return "border-[color-mix(in_srgb,var(--app-primary)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]";

  return "border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]";
}

function typeIcon(type: BehaviorType) {
  if (type === "positive") return <BadgeCheck className="h-4 w-4"  aria-hidden="true" />;
  if (type === "violation") return <ShieldAlert className="h-4 w-4"  aria-hidden="true" />;
  if (type === "referral") return <MessageSquareWarning className="h-4 w-4"  aria-hidden="true" />;
  if (type === "intervention") return <HeartHandshake className="h-4 w-4"  aria-hidden="true" />;

  return <BookOpenCheck className="h-4 w-4"  aria-hidden="true" />;
}

function statusLabel(status?: string | null) {
  const s = String(status || "").trim();

  if (!s) return "غير محدد";

  const lower = s.toLowerCase();

  if (
    ["open", "new", "pending", "مفتوحة", "جديدة", "قيد المتابعة"].includes(lower)
  ) {
    return "قيد المتابعة";
  }

  if (
    ["closed", "done", "resolved", "مغلقة", "منتهية", "تم الإغلاق"].includes(lower)
  ) {
    return "مغلقة";
  }

  if (["returned", "return_to_class", "إرجاع الطالب للفصل"].includes(lower)) {
    return "إرجاع للفصل";
  }

  return s;
}

function statusClass(status?: string | null) {
  const label = statusLabel(status);

  if (label === "مغلقة") return "border-[color-mix(in_srgb,var(--app-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
  if (label === "إرجاع للفصل") return "border-[color-mix(in_srgb,var(--app-primary)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]";
  if (label === "قيد المتابعة") return "border-[color-mix(in_srgb,var(--app-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-text)]";

  return "border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]";
}

function getMonthValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    startText: start.toISOString().slice(0, 10),
    endText: end.toISOString().slice(0, 10),
  };
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function pickText(row: RawBehaviorRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function pickNumber(row: RawBehaviorRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== null && value !== undefined && value !== "") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }

  return null;
}

function detectBehaviorType(row: RawBehaviorRow, fallback: BehaviorType): BehaviorType {
  const raw = String(
    row.type ??
      row.behavior_type ??
      row.category ??
      row.referral_type ??
      row.case_type ??
      "",
  )
    .trim()
    .toLowerCase();

  if (
    [
      "positive",
      "reward",
      "excellent",
      "تعزيز",
      "إيجابي",
      "ايجابي",
      "سلوك إيجابي",
      "سلوك ايجابي",
    ].includes(raw)
  ) {
    return "positive";
  }

  if (
    [
      "violation",
      "negative",
      "مخالفة",
      "سلبي",
      "سلوك سلبي",
      "مشكلة سلوكية",
    ].includes(raw)
  ) {
    return "violation";
  }

  if (["referral", "إحالة", "احالة", "تحويل"].includes(raw)) return "referral";

  if (
    [
      "intervention",
      "guidance",
      "إرشاد",
      "ارشاد",
      "تدخل",
      "تدخل إرشادي",
      "تدخل ارشادي",
    ].includes(raw)
  ) {
    return "intervention";
  }

  if (raw.includes("مخالفة")) return "violation";
  if (raw.includes("إحالة") || raw.includes("احالة")) return "referral";
  if (raw.includes("تعزيز") || raw.includes("إيجابي") || raw.includes("ايجابي")) {
    return "positive";
  }
  if (raw.includes("إرشاد") || raw.includes("ارشاد") || raw.includes("تدخل")) {
    return "intervention";
  }

  return fallback;
}

function mapStudentBehavior(row: RawBehaviorRow): BehaviorRow {
  const type = detectBehaviorType(row, "violation");
  const date = pickText(
    row,
    ["behavior_date", "incident_date", "violation_date", "date", "created_at"],
    "",
  );

  return {
    id: asRequiredString(row.id, "record"),
    student_id: asRequiredString(row.student_id, ""),
    source: "student_behavior",
    type,
    title: pickText(
      row,
      ["title", "behavior_title", "violation_title", "category", "type"],
      type === "positive" ? "تعزيز إيجابي" : "سجل سلوكي",
    ),
    description: pickText(
      row,
      ["description", "details", "notes", "behavior_notes", "violation_description"],
      "",
    ),
    action_taken: pickText(
      row,
      ["action_taken", "action", "procedure", "recommendation", "school_action"],
      "",
    ),
    status: pickText(row, ["status", "case_status"], "قيد المتابعة"),
    severity: normalizeSeverity(pickText(row, ["severity", "level", "priority"], "low")),
    points: pickNumber(row, ["points", "score", "behavior_points", "commitment_points"]),
    behavior_date: date || null,
    created_at: asNullableString(row.created_at),
    created_by_name: pickText(row, ["created_by_name", "teacher_name", "staff_name"], ""),
  };
}

function mapReferral(row: RawBehaviorRow): BehaviorRow {
  const date = pickText(row, ["referral_date", "incident_date", "date", "created_at"], "");

  return {
    id: asRequiredString(row.id, "record"),
    student_id: asRequiredString(row.student_id, ""),
    source: "student_referrals",
    type: "referral",
    title: pickText(
      row,
      ["title", "referral_reason", "reason", "category", "referral_type"],
      "إحالة طلابية",
    ),
    description: pickText(row, ["description", "details", "notes", "reason"], ""),
    action_taken: pickText(
      row,
      ["action_taken", "action", "procedure", "recommendation", "decision"],
      "",
    ),
    status: pickText(row, ["status", "referral_status"], "قيد المتابعة"),
    severity: normalizeSeverity(pickText(row, ["severity", "level", "priority"], "medium")),
    points: pickNumber(row, ["points", "score"]),
    behavior_date: date || null,
    created_at: asNullableString(row.created_at),
    created_by_name: pickText(row, ["created_by_name", "teacher_name", "staff_name"], ""),
  };
}

function mapIntervention(row: RawBehaviorRow): BehaviorRow {
  const date = pickText(row, ["intervention_date", "date", "created_at"], "");

  return {
    id: asRequiredString(row.id, "record"),
    student_id: asRequiredString(row.student_id, ""),
    source: "guidance_interventions",
    type: "intervention",
    title: pickText(row, ["title", "intervention_type", "type", "program_name"], "تدخل إرشادي"),
    description: pickText(row, ["description", "details", "notes"], ""),
    action_taken: pickText(
      row,
      ["action_taken", "action", "recommendation", "result", "outcome"],
      "",
    ),
    status: pickText(row, ["status"], "قيد المتابعة"),
    severity: normalizeSeverity(pickText(row, ["severity", "level", "priority"], "low")),
    points: null,
    behavior_date: date || null,
    created_at: asNullableString(row.created_at),
    created_by_name: pickText(row, ["created_by_name", "counselor_name", "staff_name"], ""),
  };
}

export default function ParentBehaviorPage() {
  const { currentSchool } = useSchool();
  const schoolId = currentSchool?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [parentEmail, setParentEmail] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<BehaviorRow[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState("all");
  const [selectedType, setSelectedType] = useState<TypeFilter>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityKey>("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [month, setMonth] = useState(getMonthValue());
  const [search, setSearch] = useState("");

  const loadParentStudents = useCallback(async (email: string) => {
    let query = supabase
      .from("students")
      .select("id, full_name, national_id, grade_name, classroom_name, guardian_email, status")
      .eq("guardian_email", email)
      .order("full_name", { ascending: true });

    if (schoolId) query = query.eq("school_id", schoolId);

    const { data, error: studentsError } = await query;

    if (studentsError) throw new Error(studentsError.message);

    return (data || []) as Student[];
  }, [schoolId]);

  const loadStudentBehavior = useCallback(async (studentIds: string[]) => {
    try {
      const { startText, endText } = getMonthRange(month);

      let query = supabase
        .from("student_behavior")
        .select("*")
        .in("student_id", studentIds);

      if (schoolId) query = query.eq("school_id", schoolId);

      const { data, error: behaviorError } = await query;
      if (behaviorError) throw behaviorError;

      return ((data || []) as RawBehaviorRow[])
        .map(mapStudentBehavior)
        .filter((row) => {
          if (!row.behavior_date) return true;
          const d = row.behavior_date.slice(0, 10);
          return d >= startText && d <= endText;
        });
    } catch {
      return [];
    }
  }, [month, schoolId]);

  const loadStudentReferrals = useCallback(async (studentIds: string[]) => {
    try {
      const { startText, endText } = getMonthRange(month);

      let query = supabase
        .from("student_referrals")
        .select("*")
        .in("student_id", studentIds);

      if (schoolId) query = query.eq("school_id", schoolId);

      const { data, error: referralsError } = await query;
      if (referralsError) throw referralsError;

      return ((data || []) as RawBehaviorRow[])
        .map(mapReferral)
        .filter((row) => {
          if (!row.behavior_date) return true;
          const d = row.behavior_date.slice(0, 10);
          return d >= startText && d <= endText;
        });
    } catch {
      return [];
    }
  }, [month, schoolId]);

  const loadGuidanceInterventions = useCallback(async (studentIds: string[]) => {
    try {
      const { startText, endText } = getMonthRange(month);

      let query = supabase
        .from("guidance_interventions")
        .select("*")
        .in("student_id", studentIds);

      if (schoolId) query = query.eq("school_id", schoolId);

      const { data, error: interventionsError } = await query;
      if (interventionsError) throw interventionsError;

      return ((data || []) as RawBehaviorRow[])
        .map(mapIntervention)
        .filter((row) => {
          if (!row.behavior_date) return true;
          const d = row.behavior_date.slice(0, 10);
          return d >= startText && d <= endText;
        });
    } catch {
      return [];
    }
  }, [month, schoolId]);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw new Error(userError.message);

      const email = user?.email || "";

      if (!email) {
        setParentEmail("");
        setStudents([]);
        setRecords([]);
        setError("تعذر التعرف على بريد ولي الأمر الحالي.");
        return;
      }

      setParentEmail(email);

      const children = await loadParentStudents(email);
      setStudents(children);

      if (!children.length) {
        setRecords([]);
        return;
      }

      const studentIds = children.map((student) => student.id);

      const [behaviorRows, referralRows, interventionRows] = await Promise.all([
        loadStudentBehavior(studentIds),
        loadStudentReferrals(studentIds),
        loadGuidanceInterventions(studentIds),
      ]);

      const merged = [...behaviorRows, ...referralRows, ...interventionRows].sort((a, b) => {
        const dateA = a.behavior_date || a.created_at || "";
        const dateB = b.behavior_date || b.created_at || "";
        return dateB.localeCompare(dateA);
      });

      setRecords(merged);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل سجل السلوك.",
      );
      setStudents([]);
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    loadGuidanceInterventions,
    loadParentStudents,
    loadStudentBehavior,
    loadStudentReferrals,
  ]);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const studentsMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((student) => map.set(student.id, student));
    return map;
  }, [students]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();

    records.forEach((record) => {
      const label = statusLabel(record.status);
      if (label && label !== "غير محدد") set.add(label);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [records]);

  const filteredRecords = useMemo(() => {
    const text = search.trim().toLowerCase();

    return records.filter((record) => {
      const student = studentsMap.get(record.student_id);

      const matchesStudent =
        selectedStudentId === "all" || record.student_id === selectedStudentId;
      const matchesType = selectedType === "all" || record.type === selectedType;
      const matchesSeverity =
        selectedSeverity === "all" || record.severity === selectedSeverity;
      const matchesStatus =
        selectedStatus === "all" || statusLabel(record.status) === selectedStatus;

      const matchesSearch =
        !text ||
        String(student?.full_name || "").toLowerCase().includes(text) ||
        String(student?.national_id || "").toLowerCase().includes(text) ||
        String(record.title || "").toLowerCase().includes(text) ||
        String(record.description || "").toLowerCase().includes(text) ||
        String(record.action_taken || "").toLowerCase().includes(text);

      return matchesStudent && matchesType && matchesSeverity && matchesStatus && matchesSearch;
    });
  }, [
    records,
    studentsMap,
    selectedStudentId,
    selectedType,
    selectedSeverity,
    selectedStatus,
    search,
  ]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const positive = filteredRecords.filter((r) => r.type === "positive").length;
    const violations = filteredRecords.filter((r) => r.type === "violation").length;
    const referrals = filteredRecords.filter((r) => r.type === "referral").length;
    const interventions = filteredRecords.filter((r) => r.type === "intervention").length;
    const open = filteredRecords.filter((r) => statusLabel(r.status) === "قيد المتابعة").length;
    const high = filteredRecords.filter(
      (r) => r.severity === "high" || r.severity === "critical",
    ).length;

    const totalPoints = filteredRecords.reduce((sum, row) => sum + (row.points || 0), 0);

    return {
      total,
      positive,
      violations,
      referrals,
      interventions,
      open,
      high,
      totalPoints,
    };
  }, [filteredRecords]);

  const studentSummary = useMemo(() => {
    return students.map((student) => {
      const rows = records.filter((record) => record.student_id === student.id);
      const positive = rows.filter((record) => record.type === "positive").length;
      const negative = rows.filter(
        (record) => record.type === "violation" || record.type === "referral",
      ).length;
      const open = rows.filter((record) => statusLabel(record.status) === "قيد المتابعة").length;

      return {
        student,
        total: rows.length,
        positive,
        negative,
        open,
      };
    });
  }, [students, records]);

  const exportRows = useMemo(() => {
    return filteredRecords.map((record, index) => {
      const student = studentsMap.get(record.student_id);

      return {
        "#": index + 1,
        "اسم الطالب": student?.full_name || "—",
        "رقم الهوية": student?.national_id || "—",
        "الصف": student?.grade_name || "—",
        "الفصل": student?.classroom_name || "—",
        "النوع": typeLabel(record.type),
        "العنوان": record.title || "—",
        "التفاصيل": record.description || "—",
        "الإجراء المتخذ": record.action_taken || "—",
        "الحالة": statusLabel(record.status),
        "الأهمية": severityLabel(record.severity),
        "النقاط": record.points ?? "—",
        "التاريخ": formatDate(record.behavior_date || record.created_at),
        "المصدر": record.source,
      };
    });
  }, [filteredRecords, studentsMap]);

  function handleExportPDF() {
    exportTableToPDF({
      title: "تقرير سلوك أبناء ولي الأمر",
      headers: Object.keys(exportRows[0] ?? {}),
      rows: exportRows.map((row) => Object.values(row) as ExportCell[]),
      fileName: "parent-behavior-report.pdf",
    });
  }

  function handleExportExcel() {
    exportTableToExcel({
      title: "تقرير سلوك أبناء ولي الأمر",
      headers: Object.keys(exportRows[0] ?? {}),
      rows: exportRows.map((row) => Object.values(row) as ExportCell[]),
      fileName: "parent-behavior-report.xlsx",
    });
  }

  return (
    <RoleGuard allowedRoles={PARENT_ROLES}>
      <AppShell>
        <main dir="rtl" className="space-y-5">

          <PageHeader
            variant="hero"
            title="متابعة سلوك الأبناء"
            description="تعرض هذه الصفحة الملاحظات السلوكية والإحالات والتدخلات الإرشادية الخاصة بالأبناء المرتبطين ببريد ولي الأمر."
            badge="بوابة ولي الأمر"
            icon={<ShieldCheck size={18}  aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة ولي الأمر", href: "/parent-portal" },
              { label: "السلوك" },
            ]}
            meta={[
              { label: "البريد المستخدم للربط", value: parentEmail || "غير محدد" },
              { label: "الشهر", value: month },
              { label: "عدد الأبناء", value: students.length },
              { label: "النتائج المعروضة", value: filteredRecords.length },
            ]}
            stats={[
              { label: "السجلات", value: stats.total, icon: <Scale size={20}  aria-hidden="true" />, tone: "primary" },
              { label: "تعزيز إيجابي", value: stats.positive, icon: <BadgeCheck size={20}  aria-hidden="true" />, tone: "green" },
              { label: "قيد المتابعة", value: stats.open, icon: <AlertTriangle size={20}  aria-hidden="true" />, tone: stats.open > 0 ? "gold" : "green" },
              { label: "عالية الأهمية", value: stats.high, icon: <ShieldAlert size={20}  aria-hidden="true" />, tone: stats.high > 0 ? "red" : "green" },
            ]}
            actions={
              <>
                <SecondaryButton
                  onClick={() => void loadData(true)}
                  disabled={refreshing}
                  aria-busy={refreshing}
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                  تحديث
                </SecondaryButton>

                <ExportButton
                  onClick={handleExportPDF}
                  disabled={!exportRows.length}
                  icon={<FileText className="h-4 w-4" aria-hidden="true" />}
                >
                  PDF
                </ExportButton>

                <ExportButton
                  onClick={handleExportExcel}
                  disabled={!exportRows.length}
                  icon={<FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
                >
                  Excel
                </ExportButton>
              </>
            }
          />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <ExecutiveCard
              title="إجمالي السجلات"
              value={stats.total}
              subtitle="حسب الفلاتر الحالية"
              icon={<Scale size={22}  aria-hidden="true" />}
              tone="primary"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="تعزيز إيجابي"
              value={stats.positive}
              subtitle="سجلات إيجابية"
              icon={<BadgeCheck size={22}  aria-hidden="true" />}
              tone="green"
              progress={stats.total ? percentage(stats.positive, stats.total) : 0}
            />

            <ExecutiveCard
              title="مخالفات"
              value={stats.violations}
              subtitle="سجلات سلوكية"
              icon={<ShieldAlert size={22}  aria-hidden="true" />}
              tone={stats.violations > 0 ? "red" : "green"}
              progress={stats.total ? percentage(stats.violations, stats.total) : 0}
            />

            <ExecutiveCard
              title="إحالات"
              value={stats.referrals}
              subtitle="إحالات طلابية"
              icon={<MessageSquareWarning size={22}  aria-hidden="true" />}
              tone={stats.referrals > 0 ? "gold" : "green"}
              progress={stats.total ? percentage(stats.referrals, stats.total) : 0}
            />

            <ExecutiveCard
              title="قيد المتابعة"
              value={stats.open}
              subtitle="حالات غير مغلقة"
              icon={<AlertTriangle size={22}  aria-hidden="true" />}
              tone={stats.open > 0 ? "gold" : "green"}
              progress={stats.total ? percentage(stats.open, stats.total) : 0}
            />

            <ExecutiveCard
              title="نقاط السلوك"
              value={stats.totalPoints}
              subtitle="مجموع النقاط"
              icon={<Sparkles size={22}  aria-hidden="true" />}
              tone="primary"
              progress={stats.totalPoints > 0 ? 100 : 0}
            />
          </section>

          <SummaryCard
            title="ملخص سلوك الأبناء"
            description="قراءة سريعة للسجلات السلوكية والإحالات والتدخلات حسب الشهر والفلاتر الحالية."
            tone={stats.high > 0 || stats.open > 0 ? "gold" : "green"}
            items={[
              { label: "الأبناء المرتبطون", value: students.length },
              { label: "السجلات", value: stats.total },
              { label: "تعزيز إيجابي", value: stats.positive },
              { label: "مخالفات", value: stats.violations },
              { label: "قيد المتابعة", value: stats.open },
              { label: "نقاط السلوك", value: stats.totalPoints },
            ]}
            footer="يتم عرض السجلات حسب بريد ولي الأمر المخزن في عمود guardian_email داخل جدول الطلاب."
          />

          {!!studentSummary.length && (
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {studentSummary.map(({ student, total, positive, negative, open }) => (
                <div
                  key={student.id}
                  className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-[var(--app-shadow-sm)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] text-[var(--app-text-inverse)]">
                      <UserRound className="h-6 w-6"  aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-black text-[var(--app-text)]">
                        {student.full_name || "طالب بدون اسم"}
                      </h3>

                      <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                        {student.grade_name || "—"} / {student.classroom_name || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <MiniStat title="السجلات" value={total} />
                    <MiniStat title="إيجابي" value={positive} />
                    <MiniStat title="سلبي" value={negative} />
                    <MiniStat title="متابعة" value={open} />
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-[var(--app-shadow-sm)]">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث باسم الطالب، العنوان، التفاصيل، أو الإجراء...",
              }}
              filters={
                <>
                  <ToolbarSelect value={selectedStudentId} onChange={setSelectedStudentId}>
                    <option value="all">جميع الأبناء</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name || "طالب بدون اسم"}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect
                    value={selectedType}
                    onChange={(value) => setSelectedType(value as TypeFilter)}
                  >
                    <option value="all">كل الأنواع</option>
                    <option value="positive">تعزيز إيجابي</option>
                    <option value="violation">مخالفة</option>
                    <option value="referral">إحالة</option>
                    <option value="intervention">تدخل إرشادي</option>
                    <option value="note">ملاحظة</option>
                  </ToolbarSelect>

                  <ToolbarSelect
                    value={selectedSeverity}
                    onChange={(value) => setSelectedSeverity(value as SeverityKey)}
                  >
                    <option value="all">كل المستويات</option>
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية</option>
                    <option value="critical">حرجة</option>
                  </ToolbarSelect>

                  <ToolbarSelect value={selectedStatus} onChange={setSelectedStatus}>
                    <option value="all">كل الحالات</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <input
                    type="month"
                    value={month}
                    onChange={(event) => setMonth(event.target.value)}
                    className="h-11 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-card)]"
                  />
                </>
              }
              onRefresh={() => void loadData(true)}
              onExportPDF={handleExportPDF}
              onExportExcel={handleExportExcel}
            />
          </section>

          {error ? (
            <ErrorState title="تعذر تحميل البيانات" description={error} />
          ) : null}

          {loading ? (
            <PageLoader text="جاري تحميل سجل السلوك..." />
          ) : !students.length ? (
            <EmptyState
              icon={<UsersRound className="h-9 w-9"  aria-hidden="true" />}
              title="لا يوجد أبناء مرتبطون بهذا الحساب"
              description="تحقق من ربط بريد ولي الأمر بالطلاب."
            />
          ) : !filteredRecords.length ? (
            <EmptyState
              icon={<CheckCircle2 className="h-9 w-9"  aria-hidden="true" />}
              title="لا توجد سجلات سلوكية مطابقة"
              description="غيّر الشهر أو الفلاتر الحالية."
            />
          ) : (
            <section className="overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] shadow-[var(--app-shadow-sm)]">
              <div className="flex flex-col gap-2 border-b border-[var(--app-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-[var(--app-text)]">
                    سجل السلوك والمتابعة
                  </h2>
                  <p className="text-sm text-[var(--app-text-muted)]">
                    عدد النتائج: {filteredRecords.length}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-2 text-sm font-bold text-[var(--app-text-muted)]">
                  التصدير حسب النتائج المعروضة
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-right text-sm">
                  <thead className="bg-[var(--app-primary)] text-[var(--app-text-inverse)]">
                    <tr>
                      <th className="px-4 py-3 font-bold">الطالب</th>
                      <th className="px-4 py-3 font-bold">النوع</th>
                      <th className="px-4 py-3 font-bold">العنوان</th>
                      <th className="px-4 py-3 font-bold">التفاصيل</th>
                      <th className="px-4 py-3 font-bold">الإجراء</th>
                      <th className="px-4 py-3 font-bold">الحالة</th>
                      <th className="px-4 py-3 font-bold">الأهمية</th>
                      <th className="px-4 py-3 font-bold">النقاط</th>
                      <th className="px-4 py-3 font-bold">التاريخ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--app-border)]">
                    {filteredRecords.map((record) => {
                      const student = studentsMap.get(record.student_id);

                      return (
                        <tr
                          key={`${record.source}-${record.id}`}
                          className="hover:bg-[var(--app-card-soft)]/80"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] text-[var(--app-text-inverse)]">
                                <UserRound className="h-5 w-5"  aria-hidden="true" />
                              </div>

                              <div>
                                <p className="font-bold text-[var(--app-text)]">
                                  {student?.full_name || "طالب غير محدد"}
                                </p>
                                <p className="text-xs text-[var(--app-text-muted)]">
                                  {student?.grade_name || "—"} /{" "}
                                  {student?.classroom_name || "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${typeClass(record.type)}`}
                            >
                              {typeIcon(record.type)}
                              {typeLabel(record.type)}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-bold text-[var(--app-text)]">
                              {record.title || "—"}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--app-text-subtle)]">
                              المصدر: {record.source}
                            </p>
                          </td>

                          <td className="max-w-[260px] px-4 py-3 text-[var(--app-text-muted)]">
                            <p className="line-clamp-2">
                              {record.description || "لا توجد تفاصيل"}
                            </p>
                          </td>

                          <td className="max-w-[260px] px-4 py-3 text-[var(--app-text-muted)]">
                            <p className="line-clamp-2">
                              {record.action_taken || "لا يوجد إجراء مسجل"}
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(record.status)}`}
                            >
                              {statusLabel(record.status)}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${severityClass(record.severity)}`}
                            >
                              {severityLabel(record.severity)}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span className="font-black text-[var(--app-text)]">
                              {record.points ?? "—"}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-[var(--app-text)]">
                            {formatDate(record.behavior_date || record.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function MiniStat({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-2">
      <p className="text-[11px] text-[var(--app-text-muted)]">{title}</p>
      <p className="mt-1 text-lg font-black text-[var(--app-text)]">{value}</p>
    </div>
  );
}



"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryInsightCard from "@/components/ui/cards/SummaryCard";
import RoleGuard from "@/components/auth/RoleGuard";
import { STAFF_ROLES } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  AlertCircle,
  Activity,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  HeartPulse,
  Loader2,
  Pill,
  PlusCircle,
  Printer,
  RefreshCcw,
  Save,
  Search,
  ShieldAlert,
  Stethoscope,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";

type HealthReferral = {
  id: string;
  school_id: string;
  student_id: string;
  referral_date: string | null;
  referral_type?: string | null;
  referral_destination?: string | null;
  reason: string | null;
  notes: string | null;
  status: string | null;
  parent_notified?: boolean | null;
  follow_up_date?: string | null;
  closed_at?: string | null;
  created_by?: string | null;
  created_at: string | null;
};

type HealthVisit = {
  id: string;
  school_id: string;
  student_id: string;
  visit_date: string;
  symptoms: string | null;
  diagnosis: string | null;
  temperature: number | null;
  blood_pressure: string | null;
  treatment: string | null;
  notes: string | null;
  visit_status: string | null;
  created_by: string | null;
  created_at: string | null;
};

type HealthCase = {
  id: string;
  school_id: string;
  student_id: string;
  case_type: string | null;
  severity: string | null;
  diagnosis: string | null;
  medications: string | null;
  emergency_contact: string | null;
  action_plan: string | null;
  case_status: string | null;
  created_by?: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type StudentReferral = {
  id: string;
  school_id: string;
  student_id: string | null;
  student_name: string | null;
  class_name: string | null;
  section: string | null;
  source_teacher_name?: string | null;
  source_subject?: string | null;
  source_period_number?: number | null;
  reason?: string | null;
  teacher_notes?: string | null;
  close_notes?: string | null;
  status?: string | null;
  referred_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  closed_at?: string | null;
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

type HealthTab = "dashboard" | "referrals" | "visits" | "cases";

type UnifiedHealthReferral = {
  id: string;
  source: "health_referrals" | "student_referrals";
  school_id: string;
  student_id: string | null;
  student_name: string;
  class_name: string | null;
  section: string | null;
  grade_level: string | null;
  reason: string | null;
  notes: string | null;
  status: string;
  created_at: string | null;
  referral_date: string | null;
  referral_type?: string | null;
  referral_destination?: string | null;
  parent_notified?: boolean | null;
  follow_up_date?: string | null;
  source_teacher_name?: string | null;
  source_subject?: string | null;
  source_period_number?: number | null;
};

const HEALTH_TABS: { key: HealthTab; title: string; icon: ReactNode }[] = [
  {
    key: "dashboard",
    title: "ط§ظ„ظ…ط¤ط´ط±ط§طھ",
    icon: <HeartPulse size={16} />,
  },
  {
    key: "referrals",
    title: "ط§ظ„طھط­ظˆظٹظ„ط§طھ ط§ظ„طµط­ظٹط©",
    icon: <ClipboardList size={16} />,
  },
  {
    key: "visits",
    title: "ط§ظ„ط²ظٹط§ط±ط§طھ ط§ظ„طµط­ظٹط©",
    icon: <Stethoscope size={16} />,
  },
  {
    key: "cases",
    title: "ط§ظ„ط­ط§ظ„ط§طھ ط§ظ„ظ…ط²ظ…ظ†ط©",
    icon: <ShieldAlert size={16} />,
  },
];

const HEALTH_STATUS_OPTIONS = [
  "ط¬ط¯ظٹط¯",
  "طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©",
  "طھظ… ط§ظ„ظƒط´ظپ",
  "ظٹط­طھط§ط¬ ظ…طھط§ط¨ط¹ط©",
  "ط¹ط§ط¯ ظ„ظ„ظپطµظ„",
  "طھط­ظˆظٹظ„ ظ„ظˆظ„ظٹ ط§ظ„ط£ظ…ط±",
  "طھط­ظˆظٹظ„ ظ„ظ…ط±ظƒط² طµط­ظٹ",
  "ظ…ط؛ظ„ظ‚",
];

const VISIT_STATUS_OPTIONS = [
  "ظ…ظƒطھظ…ظ„ط©",
  "طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©",
  "طھط­ظˆظٹظ„ ظ„ظ…ط±ظƒط² طµط­ظٹ",
  "طھط­ظˆظٹظ„ ظ„ظˆظ„ظٹ ط§ظ„ط£ظ…ط±",
];

const CASE_STATUS_OPTIONS = ["ظ†ط´ط·ط©", "طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©", "ظ…ط³طھظ‚ط±ط©", "ظ…ط؛ظ„ظ‚ط©"];

const CASE_TYPES = [
  "ط±ط¨ظˆ",
  "ط³ظƒط±ظٹ",
  "ط­ط³ط§ط³ظٹط©",
  "طµط±ط¹",
  "ط£ظ…ط±ط§ط¶ ظ‚ظ„ط¨",
  "ط¥طµط§ط¨ط©",
  "ط£ط®ط±ظ‰",
];

const SEVERITY_OPTIONS = ["ظ…ظ†ط®ظپط¶ط©", "ظ…طھظˆط³ط·ط©", "ط¹ط§ظ„ظٹط©", "ط­ط±ط¬ط©"];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "â€”";

  return new Date(value).toLocaleString("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getElapsedLabel(value?: string | null) {
  if (!value) return "â€”";

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `ظ…ظ†ط° ${days} ظٹظˆظ…`;
  if (hours > 0) return `ظ…ظ†ط° ${hours} ط³ط§ط¹ط©`;
  if (minutes > 0) return `ظ…ظ†ط° ${minutes} ط¯ظ‚ظٹظ‚ط©`;

  return "ط§ظ„ط¢ظ†";
}

function normalizeHealthStatus(status?: string | null) {
  if (!status) return "ط¬ط¯ظٹط¯";
  if (status === "ظ…ط­ظˆظ„ط© ظ„ظ„ظ…ظˆط¬ظ‡ ط§ظ„طµط­ظٹ") return "ط¬ط¯ظٹط¯";
  if (status === "sent_to_health") return "ط¬ط¯ظٹط¯";
  if (status === "طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط© ط§ظ„طµط­ظٹط©") return "طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©";
  if (status === "ظ…ط؛ظ„ظ‚ط© طµط­ظٹط§ظ‹") return "ظ…ط؛ظ„ظ‚";
  return status;
}

function isHealthReferralStatus(status?: string | null) {
  return [
    "ظ…ط­ظˆظ„ط© ظ„ظ„ظ…ظˆط¬ظ‡ ط§ظ„طµط­ظٹ",
    "sent_to_health",
    "طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط© ط§ظ„طµط­ظٹط©",
    "ظ…ط؛ظ„ظ‚ط© طµط­ظٹط§ظ‹",
  ].includes(String(status || ""));
}

function getStatusStyle(status: string) {
  if (["ط¹ط§ط¯ ظ„ظ„ظپطµظ„", "ظ…ط؛ظ„ظ‚", "ظ…ط؛ظ„ظ‚ط© طµط­ظٹط§ظ‹", "ظ…ظƒطھظ…ظ„ط©", "ظ…ط³طھظ‚ط±ط©"].includes(status)) {
    return "bg-[#07A869]/10 text-[#07A869]";
  }

  if (["طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©", "ظٹط­طھط§ط¬ ظ…طھط§ط¨ط¹ط©", "طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط© ط§ظ„طµط­ظٹط©", "ط­ط±ط¬ط©"].includes(status)) {
    return "bg-red-50 text-red-700";
  }

  if (["طھط­ظˆظٹظ„ ظ„ظˆظ„ظٹ ط§ظ„ط£ظ…ط±", "طھط­ظˆظٹظ„ ظ„ظ…ط±ظƒط² طµط­ظٹ", "طھظ… ط§ظ„ظƒط´ظپ"].includes(status)) {
    return "bg-[#3D7EB9]/10 text-[#3D7EB9]";
  }

  return "bg-[#C1B489]/20 text-[#15445A]";
}
export default function HealthPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [activeTab, setActiveTab] = useState<HealthTab>("dashboard");

  const [healthReferrals, setHealthReferrals] = useState<HealthReferral[]>([]);
  const [healthVisits, setHealthVisits] = useState<HealthVisit[]>([]);
  const [healthCases, setHealthCases] = useState<HealthCase[]>([]);
  const [studentReferrals, setStudentReferrals] = useState<StudentReferral[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const [newStudentId, setNewStudentId] = useState("");
  const [newReason, setNewReason] = useState("طھط­ظˆظٹظ„ ط¥ظ„ظ‰ ط§ظ„ط¹ظٹط§ط¯ط© ط§ظ„طµط­ظٹط©");
  const [newNotes, setNewNotes] = useState("");
  const [newReferralType, setNewReferralType] = useState("طھط­ظˆظٹظ„ ط¯ط§ط®ظ„ظٹ");
  const [newReferralDestination, setNewReferralDestination] = useState("");

  const [newVisitStudentId, setNewVisitStudentId] = useState("");
  const [newVisitSymptoms, setNewVisitSymptoms] = useState("");
  const [newVisitDiagnosis, setNewVisitDiagnosis] = useState("");
  const [newVisitTemperature, setNewVisitTemperature] = useState("");
  const [newVisitBloodPressure, setNewVisitBloodPressure] = useState("");
  const [newVisitTreatment, setNewVisitTreatment] = useState("");
  const [newVisitNotes, setNewVisitNotes] = useState("");
  const [newVisitStatus, setNewVisitStatus] = useState("ظ…ظƒطھظ…ظ„ط©");

  const [newCaseStudentId, setNewCaseStudentId] = useState("");
  const [newCaseType, setNewCaseType] = useState("ط±ط¨ظˆ");
  const [newCaseSeverity, setNewCaseSeverity] = useState("ظ…طھظˆط³ط·ط©");
  const [newCaseDiagnosis, setNewCaseDiagnosis] = useState("");
  const [newCaseMedications, setNewCaseMedications] = useState("");
  const [newCaseEmergencyContact, setNewCaseEmergencyContact] = useState("");
  const [newCaseActionPlan, setNewCaseActionPlan] = useState("");
  const [newCaseStatus, setNewCaseStatus] = useState("ظ†ط´ط·ط©");

  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

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

    const [
      healthResult,
      visitsResult,
      casesResult,
      studentReferralsResult,
      studentsResult,
    ] = await Promise.all([
      supabase
        .from("health_referrals")
        .select("*")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("health_visits")
        .select("*")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("health_cases")
        .select("*")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("student_referrals")
        .select("*")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("students")
        .select("id, full_name, classroom, section, grade_level")
        .eq("school_id", currentSchool.id)
        .order("full_name", { ascending: true }),
    ]);

    setLoading(false);

    if (healthResult.error) return setErrorMsg(healthResult.error.message);
    if (visitsResult.error) return setErrorMsg(visitsResult.error.message);
    if (casesResult.error) return setErrorMsg(casesResult.error.message);
    if (studentReferralsResult.error) {
      return setErrorMsg(studentReferralsResult.error.message);
    }
    if (studentsResult.error) return setErrorMsg(studentsResult.error.message);

    const loadedHealth = (healthResult.data as HealthReferral[]) || [];
    const loadedVisits = (visitsResult.data as HealthVisit[]) || [];
    const loadedCases = (casesResult.data as HealthCase[]) || [];
    const loadedStudentReferrals =
      ((studentReferralsResult.data as StudentReferral[]) || []).filter((item) =>
        isHealthReferralStatus(item.status)
      );
    const loadedStudents = (studentsResult.data as Student[]) || [];

    setHealthReferrals(loadedHealth);
    setHealthVisits(loadedVisits);
    setHealthCases(loadedCases);
    setStudentReferrals(loadedStudentReferrals);
    setStudents(loadedStudents);

    if (loadedStudents.length > 0) {
      if (!newStudentId) setNewStudentId(loadedStudents[0].id);
      if (!newVisitStudentId) setNewVisitStudentId(loadedStudents[0].id);
      if (!newCaseStudentId) setNewCaseStudentId(loadedStudents[0].id);
    }

    const drafts: Record<string, string> = {};

    loadedHealth.forEach((item) => {
      drafts[`health_referrals-${item.id}`] = item.notes || "";
    });

    loadedStudentReferrals.forEach((item) => {
      drafts[`student_referrals-${item.id}`] =
        item.close_notes || item.teacher_notes || "";
    });

    loadedVisits.forEach((item) => {
      drafts[`health_visits-${item.id}`] = item.notes || "";
    });

    loadedCases.forEach((item) => {
      drafts[`health_cases-${item.id}`] = item.action_plan || "";
    });

    setNoteDrafts(drafts);
  }

  const studentMap = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const unifiedReferrals = useMemo<UnifiedHealthReferral[]>(() => {
    const fromHealth: UnifiedHealthReferral[] = healthReferrals.map((item) => {
      const student = studentMap.get(item.student_id);

      return {
        id: item.id,
        source: "health_referrals",
        school_id: item.school_id,
        student_id: item.student_id,
        student_name: student?.full_name || "ط·ط§ظ„ط¨ ط؛ظٹط± ظ…ط¹ط±ظˆظپ",
        class_name: student?.classroom || null,
        section: student?.section || null,
        grade_level: student?.grade_level || null,
        reason: item.reason,
        notes: item.notes,
        status: normalizeHealthStatus(item.status),
        created_at: item.created_at ?? null,
        referral_date: item.referral_date ?? null,
        referral_type: item.referral_type ?? null,
        referral_destination: item.referral_destination ?? null,
        parent_notified: item.parent_notified ?? false,
        follow_up_date: item.follow_up_date ?? null,
      };
    });

    const fromStudentReferral: UnifiedHealthReferral[] = studentReferrals.map(
      (item) => {
        const student = item.student_id ? studentMap.get(item.student_id) : null;

        return {
          id: item.id,
          source: "student_referrals",
          school_id: item.school_id,
          student_id: item.student_id ?? null,
          student_name:
            item.student_name || student?.full_name || "ط·ط§ظ„ط¨ ط؛ظٹط± ظ…ط¹ط±ظˆظپ",
          class_name: item.class_name || student?.classroom || null,
          section: item.section || student?.section || null,
          grade_level: student?.grade_level || null,
          reason: item.reason || "طھط­ظˆظٹظ„ ظ„ظ„ظ…ظˆط¬ظ‡ ط§ظ„طµط­ظٹ",
          notes: item.close_notes || item.teacher_notes || null,
          status: normalizeHealthStatus(item.status),
          created_at: item.created_at ?? null,
          referral_date: item.referred_at ?? item.created_at ?? null,
          source_teacher_name: item.source_teacher_name ?? null,
          source_subject: item.source_subject ?? null,
          source_period_number: item.source_period_number ?? null,
        };
      }
    );

    return [...fromHealth, ...fromStudentReferral].sort((a, b) => {
      const aDate = new Date(a.created_at || a.referral_date || 0).getTime();
      const bDate = new Date(b.created_at || b.referral_date || 0).getTime();
      return bDate - aDate;
    });
  }, [healthReferrals, studentReferrals, studentMap]);

  const filteredReferrals = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return unifiedReferrals.filter((item) => {
      const text = `
        ${item.student_name || ""}
        ${item.class_name || ""}
        ${item.section || ""}
        ${item.grade_level || ""}
        ${item.reason || ""}
        ${item.notes || ""}
        ${item.status || ""}
        ${item.referral_type || ""}
        ${item.referral_destination || ""}
        ${item.source_teacher_name || ""}
        ${item.source_subject || ""}
      `.toLowerCase();

      const sourceMatch = sourceFilter === "all" || item.source === sourceFilter;
      const statusMatch = statusFilter === "all" || item.status === statusFilter;

      return text.includes(keyword) && sourceMatch && statusMatch;
    });
  }, [unifiedReferrals, search, sourceFilter, statusFilter]);

  const filteredVisits = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return healthVisits.filter((item) => {
      const student = studentMap.get(item.student_id);
      const text = `
        ${student?.full_name || ""}
        ${student?.classroom || ""}
        ${student?.section || ""}
        ${item.symptoms || ""}
        ${item.diagnosis || ""}
        ${item.treatment || ""}
        ${item.notes || ""}
        ${item.visit_status || ""}
      `.toLowerCase();

      return text.includes(keyword);
    });
  }, [healthVisits, search, studentMap]);

  const filteredHealthCases = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return healthCases.filter((item) => {
      const student = studentMap.get(item.student_id);
      const text = `
        ${student?.full_name || ""}
        ${student?.classroom || ""}
        ${student?.section || ""}
        ${item.case_type || ""}
        ${item.severity || ""}
        ${item.diagnosis || ""}
        ${item.medications || ""}
        ${item.emergency_contact || ""}
        ${item.action_plan || ""}
        ${item.case_status || ""}
      `.toLowerCase();

      return text.includes(keyword);
    });
  }, [healthCases, search, studentMap]);

  const today = getTodayDate();

  const todayVisitsCount = healthVisits.filter(
    (item) => item.visit_date === today
  ).length;

  const activeCasesCount = healthCases.filter(
    (item) => item.case_status !== "ظ…ط؛ظ„ظ‚ط©"
  ).length;

  const openReferralsCount = unifiedReferrals.filter(
    (item) => item.status !== "ظ…ط؛ظ„ظ‚"
  ).length;

  const closedReferralsCount = unifiedReferrals.filter(
    (item) => item.status === "ظ…ط؛ظ„ظ‚"
  ).length;

  const followUpCount =
    unifiedReferrals.filter((item) =>
      ["طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©", "ظٹط­طھط§ط¬ ظ…طھط§ط¨ط¹ط©"].includes(item.status)
    ).length +
    healthCases.filter((item) => item.case_status === "طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©").length;

  const totalHealthRecords =
    healthVisits.length + healthCases.length + unifiedReferrals.length;
      async function addNotification(title: string, message: string, type = "health") {
    if (!currentSchool?.id) return;

    await supabase.from("notifications").insert({
      school_id: currentSchool.id,
      title,
      message,
      type,
      is_read: false,
    });
  }

  async function addTimeline(
    studentId: string | null,
    studentName: string | null,
    eventType: string,
    title: string,
    description: string
  ) {
    if (!currentSchool?.id || !studentId) return;

    await supabase.from("student_timeline").insert({
      school_id: currentSchool.id,
      student_id: studentId,
      student_name: studentName,
      event_type: eventType,
      title,
      description,
      created_by: "health_supervisor",
    });
  }

  async function createReferral() {
    if (!currentSchool?.id) return;

    if (!newStudentId) {
      showToast("error", "ط§ط®طھط± ط§ظ„ط·ط§ظ„ط¨ ط£ظˆظ„ط§ظ‹");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    const student = studentMap.get(newStudentId);

    const { data, error } = await supabase
      .from("health_referrals")
      .insert({
        school_id: currentSchool.id,
        student_id: newStudentId,
        referral_date: getTodayDate(),
        referral_type: newReferralType || null,
        referral_destination: newReferralDestination.trim() || null,
        reason: newReason.trim() || "طھط­ظˆظٹظ„ ط¥ظ„ظ‰ ط§ظ„ط¹ظٹط§ط¯ط© ط§ظ„طµط­ظٹط©",
        notes: newNotes.trim() || null,
        status: "ط¬ط¯ظٹط¯",
        parent_notified: false,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      showToast("error", error.message);
      return;
    }

    const created = data as HealthReferral;

    await addNotification(
      "طھط­ظˆظٹظ„ طµط­ظٹ ط¬ط¯ظٹط¯",
      `طھظ… طھط­ظˆظٹظ„ ط§ظ„ط·ط§ظ„ط¨ ${student?.full_name || "ط؛ظٹط± ظ…ط­ط¯ط¯"} ط¥ظ„ظ‰ ط§ظ„ط¹ظٹط§ط¯ط© ط§ظ„طµط­ظٹط©.`,
      "health_referral"
    );

    await supabase.from("alerts").insert({
      school_id: currentSchool.id,
      student_id: newStudentId,
      alert_type: "health",
      title: "طھط­ظˆظٹظ„ ط¥ظ„ظ‰ ط§ظ„ط¹ظٹط§ط¯ط© ط§ظ„طµط­ظٹط©",
      message: `طھظ… طھط­ظˆظٹظ„ ط§ظ„ط·ط§ظ„ط¨ ${student?.full_name || ""} ط¥ظ„ظ‰ ط§ظ„ط¹ظٹط§ط¯ط© ط§ظ„طµط­ظٹط©`,
      severity: "medium",
      is_read: false,
    });

    await addTimeline(
      newStudentId,
      student?.full_name || null,
      "health_referral",
      "طھط­ظˆظٹظ„ ط¥ظ„ظ‰ ط§ظ„ط¹ظٹط§ط¯ط© ط§ظ„طµط­ظٹط©",
      newReason.trim() || "طھط­ظˆظٹظ„ ط¥ظ„ظ‰ ط§ظ„ط¹ظٹط§ط¯ط© ط§ظ„طµط­ظٹط©"
    );

    setHealthReferrals((prev) => [created, ...prev]);
    setNewNotes("");
    setNewReferralDestination("");
    showToast("success", "طھظ… ط¥ط¶ط§ظپط© ط§ظ„طھط­ظˆظٹظ„ ط§ظ„طµط­ظٹ ط¨ظ†ط¬ط§ط­");
  }

  async function createHealthVisit() {
    if (!currentSchool?.id) return;

    if (!newVisitStudentId) {
      showToast("error", "ط§ط®طھط± ط§ظ„ط·ط§ظ„ط¨ ط£ظˆظ„ط§ظ‹");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    const student = studentMap.get(newVisitStudentId);

    const temperatureValue = newVisitTemperature.trim()
      ? Number(newVisitTemperature)
      : null;

    const { data, error } = await supabase
      .from("health_visits")
      .insert({
        school_id: currentSchool.id,
        student_id: newVisitStudentId,
        visit_date: getTodayDate(),
        symptoms: newVisitSymptoms.trim() || null,
        diagnosis: newVisitDiagnosis.trim() || null,
        temperature: Number.isFinite(temperatureValue) ? temperatureValue : null,
        blood_pressure: newVisitBloodPressure.trim() || null,
        treatment: newVisitTreatment.trim() || null,
        notes: newVisitNotes.trim() || null,
        visit_status: newVisitStatus || "ظ…ظƒطھظ…ظ„ط©",
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      showToast("error", error.message);
      return;
    }

    const created = data as HealthVisit;

    await addNotification(
      "ط²ظٹط§ط±ط© طµط­ظٹط© ط¬ط¯ظٹط¯ط©",
      `طھظ… طھط³ط¬ظٹظ„ ط²ظٹط§ط±ط© طµط­ظٹط© ظ„ظ„ط·ط§ظ„ط¨ ${student?.full_name || "ط؛ظٹط± ظ…ط­ط¯ط¯"}.`,
      "health_visit"
    );

    await addTimeline(
      newVisitStudentId,
      student?.full_name || null,
      "health_visit",
      "ط²ظٹط§ط±ط© طµط­ظٹط©",
      newVisitSymptoms.trim() || "طھظ… طھط³ط¬ظٹظ„ ط²ظٹط§ط±ط© طµط­ظٹط© ظپظٹ ط§ظ„ط¹ظٹط§ط¯ط©"
    );

    setHealthVisits((prev) => [created, ...prev]);

    setNewVisitSymptoms("");
    setNewVisitDiagnosis("");
    setNewVisitTemperature("");
    setNewVisitBloodPressure("");
    setNewVisitTreatment("");
    setNewVisitNotes("");
    setNewVisitStatus("ظ…ظƒطھظ…ظ„ط©");

    showToast("success", "طھظ… طھط³ط¬ظٹظ„ ط§ظ„ط²ظٹط§ط±ط© ط§ظ„طµط­ظٹط© ط¨ظ†ط¬ط§ط­");
  }

  async function createHealthCase() {
    if (!currentSchool?.id) return;

    if (!newCaseStudentId) {
      showToast("error", "ط§ط®طھط± ط§ظ„ط·ط§ظ„ط¨ ط£ظˆظ„ط§ظ‹");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    const student = studentMap.get(newCaseStudentId);

    const { data, error } = await supabase
      .from("health_cases")
      .insert({
        school_id: currentSchool.id,
        student_id: newCaseStudentId,
        case_type: newCaseType || "ط£ط®ط±ظ‰",
        severity: newCaseSeverity || "ظ…طھظˆط³ط·ط©",
        diagnosis: newCaseDiagnosis.trim() || null,
        medications: newCaseMedications.trim() || null,
        emergency_contact: newCaseEmergencyContact.trim() || null,
        action_plan: newCaseActionPlan.trim() || null,
        case_status: newCaseStatus || "ظ†ط´ط·ط©",
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      showToast("error", error.message);
      return;
    }

    const created = data as HealthCase;

    await addNotification(
      "ط­ط§ظ„ط© طµط­ظٹط© ط¬ط¯ظٹط¯ط©",
      `طھظ… طھط³ط¬ظٹظ„ ط­ط§ظ„ط© طµط­ظٹط© ظ„ظ„ط·ط§ظ„ط¨ ${student?.full_name || "ط؛ظٹط± ظ…ط­ط¯ط¯"}.`,
      "health_case"
    );

    await addTimeline(
      newCaseStudentId,
      student?.full_name || null,
      "health_case",
      "طھط³ط¬ظٹظ„ ط­ط§ظ„ط© طµط­ظٹط©",
      `${newCaseType} - ${newCaseSeverity}`
    );

    setHealthCases((prev) => [created, ...prev]);

    setNewCaseDiagnosis("");
    setNewCaseMedications("");
    setNewCaseEmergencyContact("");
    setNewCaseActionPlan("");
    setNewCaseType("ط±ط¨ظˆ");
    setNewCaseSeverity("ظ…طھظˆط³ط·ط©");
    setNewCaseStatus("ظ†ط´ط·ط©");

    showToast("success", "طھظ… طھط³ط¬ظٹظ„ ط§ظ„ط­ط§ظ„ط© ط§ظ„طµط­ظٹط© ط¨ظ†ط¬ط§ط­");
  }

  async function updateReferralStatus(item: UnifiedHealthReferral, status: string) {
    if (!currentSchool?.id) return;

    const key = `${item.source}-${item.id}`;
    setUpdatingId(key);
    setErrorMsg("");

    const updatePayload =
      item.source === "health_referrals"
        ? {
            status,
            closed_at: status === "ظ…ط؛ظ„ظ‚" ? new Date().toISOString() : null,
          }
        : {
            status:
              status === "ظ…ط؛ظ„ظ‚"
                ? "ظ…ط؛ظ„ظ‚ط© طµط­ظٹط§ظ‹"
                : status === "طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©"
                ? "طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط© ط§ظ„طµط­ظٹط©"
                : status,
            close_notes: `طھط­ط¯ظٹط« طµط­ظٹ: ${status}`,
            updated_at: new Date().toISOString(),
            closed_at: status === "ظ…ط؛ظ„ظ‚" ? new Date().toISOString() : null,
          };

    const { error } = await supabase
      .from(item.source)
      .update(updatePayload)
      .eq("id", item.id)
      .eq("school_id", currentSchool.id);

    if (error) {
      setUpdatingId(null);
      showToast("error", error.message);
      return;
    }

    await addNotification(
      "طھط­ط¯ظٹط« ط­ط§ظ„ط© طµط­ظٹط©",
      `طھظ… طھط­ط¯ظٹط« ط­ط§ظ„ط© ط§ظ„ط·ط§ظ„ط¨ ${item.student_name || "ط؛ظٹط± ظ…ط­ط¯ط¯"} ط¥ظ„ظ‰: ${status}`,
      "health_status"
    );

    await addTimeline(
      item.student_id,
      item.student_name,
      "health",
      "طھط­ط¯ظٹط« ط­ط§ظ„ط© طµط­ظٹط©",
      `طھظ… طھط­ط¯ظٹط« ط§ظ„ط­ط§ظ„ط© ط§ظ„طµط­ظٹط© ط¥ظ„ظ‰: ${status}`
    );

    if (status === "طھط­ظˆظٹظ„ ظ„ظˆظ„ظٹ ط§ظ„ط£ظ…ط±" && item.student_id) {
      await supabase.from("student_interventions").insert({
        school_id: currentSchool.id,
        student_id: item.student_id,
        intervention_type: "parent_call",
        title: "ط§ط³طھط¯ط¹ط§ط، ظˆظ„ظٹ ط£ظ…ط± ط¨ط³ط¨ط¨ ط­ط§ظ„ط© طµط­ظٹط©",
        notes: `طھظ… ط¥ظ†ط´ط§ط، طھط¯ط®ظ„ طھظ„ظ‚ط§ط¦ظٹ ظ…ظ† ط§ظ„ط¹ظٹط§ط¯ط© ط§ظ„طµط­ظٹط© ظ„ظ„ط·ط§ظ„ط¨ ${item.student_name || ""}`,
        status: "ظ…ظپطھظˆط­",
      });
    }

    setUpdatingId(null);
    showToast("success", "طھظ… طھط­ط¯ظٹط« ط­ط§ظ„ط© ط§ظ„طھط­ظˆظٹظ„ ط§ظ„طµط­ظٹ");
    void fetchData();
  }

  async function updateReferralNotes(item: UnifiedHealthReferral) {
    if (!currentSchool?.id) return;

    const key = `${item.source}-${item.id}`;
    const notes = noteDrafts[key] || "";

    setUpdatingId(key);
    setErrorMsg("");

    const updatePayload =
      item.source === "health_referrals"
        ? { notes }
        : {
            close_notes: notes,
            updated_at: new Date().toISOString(),
          };

    const { error } = await supabase
      .from(item.source)
      .update(updatePayload)
      .eq("id", item.id)
      .eq("school_id", currentSchool.id);

    setUpdatingId(null);

    if (error) {
      showToast("error", error.message);
      return;
    }

    await addTimeline(
      item.student_id,
      item.student_name,
      "health",
      "ط­ظپط¸ ظ…ظ„ط§ط­ط¸ط§طھ طµط­ظٹط©",
      notes || "طھظ… طھط­ط¯ظٹط« ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ ط§ظ„طµط­ظٹط©"
    );

    showToast("success", "طھظ… ط­ظپط¸ ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ ط§ظ„طµط­ظٹط©");
    void fetchData();
  }

  async function updateVisitStatus(item: HealthVisit, status: string) {
    if (!currentSchool?.id) return;

    setUpdatingId(`health_visits-${item.id}`);

    const { error } = await supabase
      .from("health_visits")
      .update({
        visit_status: status,
      })
      .eq("id", item.id)
      .eq("school_id", currentSchool.id);

    setUpdatingId(null);

    if (error) {
      showToast("error", error.message);
      return;
    }

    const student = studentMap.get(item.student_id);

    await addTimeline(
      item.student_id,
      student?.full_name || null,
      "health_visit",
      "طھط­ط¯ظٹط« ط²ظٹط§ط±ط© طµط­ظٹط©",
      `طھظ… طھط­ط¯ظٹط« ط­ط§ظ„ط© ط§ظ„ط²ظٹط§ط±ط© ط¥ظ„ظ‰: ${status}`
    );

    showToast("success", "طھظ… طھط­ط¯ظٹط« ط­ط§ظ„ط© ط§ظ„ط²ظٹط§ط±ط©");
    void fetchData();
  }
    async function updateCaseStatus(item: HealthCase, status: string) {
    if (!currentSchool?.id) return;

    setUpdatingId(`health_cases-${item.id}`);

    const { error } = await supabase
      .from("health_cases")
      .update({
        case_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("school_id", currentSchool.id);

    setUpdatingId(null);

    if (error) {
      showToast("error", error.message);
      return;
    }

    const student = studentMap.get(item.student_id);

    await addTimeline(
      item.student_id,
      student?.full_name || null,
      "health_case",
      "طھط­ط¯ظٹط« ط­ط§ظ„ط© طµط­ظٹط© ظ…ط²ظ…ظ†ط©",
      `طھظ… طھط­ط¯ظٹط« ط§ظ„ط­ط§ظ„ط© ط¥ظ„ظ‰: ${status}`
    );

    showToast("success", "طھظ… طھط­ط¯ظٹط« ط§ظ„ط­ط§ظ„ط© ط§ظ„طµط­ظٹط©");
    void fetchData();
  }

  async function updateCaseActionPlan(item: HealthCase) {
    if (!currentSchool?.id) return;

    const key = `health_cases-${item.id}`;
    const actionPlan = noteDrafts[key] || "";

    setUpdatingId(key);

    const { error } = await supabase
      .from("health_cases")
      .update({
        action_plan: actionPlan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("school_id", currentSchool.id);

    setUpdatingId(null);

    if (error) {
      showToast("error", error.message);
      return;
    }

    const student = studentMap.get(item.student_id);

    await addTimeline(
      item.student_id,
      student?.full_name || null,
      "health_case",
      "طھط­ط¯ظٹط« ط®ط·ط© ط§ظ„طھط¹ط§ظ…ظ„ ط§ظ„طµط­ظٹ",
      actionPlan || "طھظ… طھط­ط¯ظٹط« ط®ط·ط© ط§ظ„طھط¹ط§ظ…ظ„ ط§ظ„طµط­ظٹ"
    );

    showToast("success", "طھظ… ط­ظپط¸ ط®ط·ط© ط§ظ„طھط¹ط§ظ…ظ„");
    void fetchData();
  }

  async function updateVisitNotes(item: HealthVisit) {
    if (!currentSchool?.id) return;

    const key = `health_visits-${item.id}`;
    const notes = noteDrafts[key] || "";

    setUpdatingId(key);

    const { error } = await supabase
      .from("health_visits")
      .update({
        notes,
      })
      .eq("id", item.id)
      .eq("school_id", currentSchool.id);

    setUpdatingId(null);

    if (error) {
      showToast("error", error.message);
      return;
    }

    const student = studentMap.get(item.student_id);

    await addTimeline(
      item.student_id,
      student?.full_name || null,
      "health_visit",
      "طھط­ط¯ظٹط« ظ…ظ„ط§ط­ط¸ط§طھ ط²ظٹط§ط±ط© طµط­ظٹط©",
      notes || "طھظ… طھط­ط¯ظٹط« ظ…ظ„ط§ط­ط¸ط§طھ ط§ظ„ط²ظٹط§ط±ط© ط§ظ„طµط­ظٹط©"
    );

    showToast("success", "طھظ… ط­ظپط¸ ظ…ظ„ط§ط­ط¸ط§طھ ط§ظ„ط²ظٹط§ط±ط©");
    void fetchData();
  }

  async function deleteRecord(
    tableName: "health_referrals" | "student_referrals" | "health_visits" | "health_cases",
    id: string
  ) {
    if (!currentSchool?.id) return;

    const confirmed = window.confirm("ظ‡ظ„ طھط±ظٹط¯ ط­ط°ظپ ظ‡ط°ط§ ط§ظ„ط³ط¬ظ„طں");
    if (!confirmed) return;

    setUpdatingId(`delete-${id}`);

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("id", id)
      .eq("school_id", currentSchool.id);

    setUpdatingId(null);

    if (error) {
      showToast("error", error.message);
      return;
    }

    showToast("success", "طھظ… ط­ط°ظپ ط§ظ„ط³ط¬ظ„ ط¨ظ†ط¬ط§ط­");
    void fetchData();
  }

  function exportHealthPDF() {
    exportTableToPDF({
      title: "طھظ‚ط±ظٹط± ط¨ظˆط§ط¨ط© ط§ظ„ظ…ظˆط¬ظ‡ ط§ظ„طµط­ظٹ",
      schoolName: currentSchool?.school_name || "ظ…ظ†طµط© ط§ظ„ظ…ط¯ط±ط³ط© ط§ظ„ط°ظƒظٹط©",
      subtitle: `طھظ‚ط±ظٹط± طµط­ظٹ ط´ط§ظ…ظ„ ${getTodayDate()}`,
      headers: ["ط§ظ„ظ…ط¤ط´ط±", "ط§ظ„ظ‚ظٹظ…ط©"],
      rows: [
        ["ط²ظٹط§ط±ط§طھ ط§ظ„ظٹظˆظ…", todayVisitsCount],
        ["ط§ظ„ط­ط§ظ„ط§طھ ط§ظ„طµط­ظٹط© ط§ظ„ظ†ط´ط·ط©", activeCasesCount],
        ["ط§ظ„طھط­ظˆظٹظ„ط§طھ ط§ظ„ظ…ظپطھظˆط­ط©", openReferralsCount],
        ["ط§ظ„طھط­ظˆظٹظ„ط§طھ ط§ظ„ظ…ط؛ظ„ظ‚ط©", closedReferralsCount],
        ["ط·ظ„ط§ط¨ طھط­طھ ط§ظ„ظ…طھط§ط¨ط¹ط©", followUpCount],
        ["ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط³ط¬ظ„ط§طھ ط§ظ„طµط­ظٹط©", totalHealthRecords],
      ],
      fileName: `health-report-${getTodayDate()}.pdf`,
    });

    showToast("success", "طھظ… طھط¬ظ‡ظٹط² طھظ‚ط±ظٹط± PDF");
  }

  async function exportHealthExcel() {
    const rows = [
      ...unifiedReferrals.map((item) => [
        "طھط­ظˆظٹظ„ طµط­ظٹ",
        item.student_name || "-",
        item.class_name || "-",
        item.section || "-",
        item.status || "-",
        item.reason || "-",
        item.notes || "-",
        item.source === "health_referrals"
          ? "طھط­ظˆظٹظ„ طµط­ظٹ ظ…ط¨ط§ط´ط±"
          : "ط¥ط­ط§ظ„ط© ظ…ظ† ط§ظ„ظˆظƒظٹظ„/ط§ظ„ظ…ط±ط´ط¯",
        item.created_at ? item.created_at.slice(0, 10) : "-",
      ]),

      ...healthVisits.map((item) => {
        const student = studentMap.get(item.student_id);

        return [
          "ط²ظٹط§ط±ط© طµط­ظٹط©",
          student?.full_name || "-",
          student?.classroom || "-",
          student?.section || "-",
          item.visit_status || "-",
          item.symptoms || "-",
          item.notes || "-",
          "ط¹ظٹط§ط¯ط© ظ…ط¯ط±ط³ظٹط©",
          item.visit_date || "-",
        ];
      }),

      ...healthCases.map((item) => {
        const student = studentMap.get(item.student_id);

        return [
          "ط­ط§ظ„ط© طµط­ظٹط© ظ…ط²ظ…ظ†ط©",
          student?.full_name || "-",
          student?.classroom || "-",
          student?.section || "-",
          item.case_status || "-",
          item.case_type || "-",
          item.action_plan || "-",
          item.severity || "-",
          item.created_at ? item.created_at.slice(0, 10) : "-",
        ];
      }),
    ];

    await exportTableToExcel({
      title: "طھظ‚ط±ظٹط± ط¨ظˆط§ط¨ط© ط§ظ„ظ…ظˆط¬ظ‡ ط§ظ„طµط­ظٹ",
      schoolName: currentSchool?.school_name || "ظ…ظ†طµط© ط§ظ„ظ…ط¯ط±ط³ط© ط§ظ„ط°ظƒظٹط©",
      subtitle: "ط§ظ„ط³ط¬ظ„ط§طھ ط§ظ„طµط­ظٹط© ط§ظ„ط´ط§ظ…ظ„ط©",
      headers: [
        "ط§ظ„ظ†ظˆط¹",
        "ط§ظ„ط·ط§ظ„ط¨",
        "ط§ظ„ظپطµظ„",
        "ط§ظ„ط´ط¹ط¨ط©",
        "ط§ظ„ط­ط§ظ„ط©",
        "ط§ظ„ط³ط¨ط¨/ط§ظ„ظ†ظˆط¹",
        "ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ/ط§ظ„ط®ط·ط©",
        "ط§ظ„ظ…طµط¯ط±/ط§ظ„ط®ط·ظˆط±ط©",
        "ط§ظ„طھط§ط±ظٹط®",
      ],
      rows,
      fileName: `health-records-${getTodayDate()}.xlsx`,
    });

    showToast("success", "طھظ… طھطµط¯ظٹط± Excel");
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
        <div className="space-y-5" dir="rtl">
          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="بوابة الموجه الصحي"
            description={`${currentSchool?.school_name || "منصة المدرسة الذكية"} — إدارة التحويلات الصحية، الزيارات اليومية، الحالات المزمنة، التنبيهات، السجل الزمني، والتقارير الصحية PDF و Excel.`}
            badge="الصحة المدرسية"
            icon={<HeartPulse size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الصحة المدرسية" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "غير محدد" },
              { label: "تاريخ اليوم", value: getTodayDate() },
              { label: "الزيارات اليوم", value: todayVisitsCount },
              { label: "تحت المتابعة", value: followUpCount },
            ]}
            stats={[
              { label: "زيارات اليوم", value: todayVisitsCount, icon: <Stethoscope size={20} />, tone: "blue" },
              { label: "الحالات النشطة", value: activeCasesCount, icon: <ShieldAlert size={20} />, tone: activeCasesCount > 0 ? "red" : "green" },
              { label: "تحويلات مفتوحة", value: openReferralsCount, icon: <AlertCircle size={20} />, tone: openReferralsCount > 0 ? "gold" : "green" },
              { label: "إجمالي السجلات", value: totalHealthRecords, icon: <HeartPulse size={20} />, tone: "teal" },
            ]}
            actions={
              <>
                <button
                  onClick={() => void exportHealthExcel()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Excel
                  <Download size={17} />
                </button>

                <button
                  onClick={exportHealthPDF}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  PDF
                  <Printer size={17} />
                </button>

                <button
                  onClick={() => void fetchData()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  تحديث
                  <RefreshCcw size={17} />
                </button>
              </>
            }
          />

          {errorMsg && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
              {errorMsg}
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <ExecutiveCard title="زيارات اليوم" value={todayVisitsCount} subtitle="زيارات العيادة اليوم" icon={<Stethoscope size={22} />} tone="blue" progress={todayVisitsCount > 0 ? 100 : 0} />
            <ExecutiveCard title="الحالات النشطة" value={activeCasesCount} subtitle="حالات صحية تحتاج متابعة" icon={<ShieldAlert size={22} />} tone={activeCasesCount > 0 ? "red" : "green"} progress={activeCasesCount > 0 ? 100 : 0} />
            <ExecutiveCard title="تحويلات مفتوحة" value={openReferralsCount} subtitle="تحويلات لم تغلق بعد" icon={<AlertCircle size={22} />} tone={openReferralsCount > 0 ? "gold" : "green"} progress={openReferralsCount > 0 ? 100 : 0} />
            <ExecutiveCard title="تحويلات مغلقة" value={closedReferralsCount} subtitle="تمت معالجتها" icon={<CheckCircle2 size={22} />} tone="green" />
            <ExecutiveCard title="تحت المتابعة" value={followUpCount} subtitle="طلاب وحالات تحتاج متابعة" icon={<Activity size={22} />} tone={followUpCount > 0 ? "gold" : "green"} progress={followUpCount > 0 ? 100 : 0} />
            <ExecutiveCard title="إجمالي السجلات" value={totalHealthRecords} subtitle="تحويلات وزيارات وحالات" icon={<HeartPulse size={22} />} tone="teal" />
          </section>

          <SummaryInsightCard
            title="الملخص التنفيذي للصحة المدرسية"
            description="قراءة سريعة لحالة العيادة المدرسية والتحويلات والزيارات والحالات المزمنة."
            tone={followUpCount > 0 || openReferralsCount > 0 ? "gold" : "green"}
            items={[
              { label: "زيارات اليوم", value: todayVisitsCount },
              { label: "الحالات النشطة", value: activeCasesCount },
              { label: "تحويلات مفتوحة", value: openReferralsCount },
              { label: "تحويلات مغلقة", value: closedReferralsCount },
              { label: "تحت المتابعة", value: followUpCount },
              { label: "إجمالي السجلات", value: totalHealthRecords },
            ]}
            footer="ترتبط هذه الصفحة بالحضور والتحويلات الصحية والتنبيهات والسجل الزمني للطالب."
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-2 shadow-sm">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {HEALTH_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                    activeTab === tab.key
                      ? "bg-[#15445A] text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.icon}
                  {tab.title}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="relative">
              <Search
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ط¨ط­ط« ط¨ط§ط³ظ… ط§ظ„ط·ط§ظ„ط¨ ط£ظˆ ط§ظ„ظپطµظ„ ط£ظˆ ط§ظ„طھط´ط®ظٹطµ ط£ظˆ ط§ظ„ظ…ظ„ط§ط­ط¸ط©..."
                className="w-full rounded-2xl border border-slate-200 py-3 pr-10 pl-4 text-sm outline-none focus:border-[#0DA9A6]"
              />
            </div>
          </section>
                    {activeTab === "dashboard" && (
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <DashboardInfoCard
                title="ظ…ظ„ط®طµ ط§ظ„طھط­ظˆظٹظ„ط§طھ"
                value={unifiedReferrals.length}
                description="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„طھط­ظˆظٹظ„ط§طھ ط§ظ„طµط­ظٹط© ط§ظ„ظ…ط¨ط§ط´ط±ط© ظˆط§ظ„ظ…ط­ظˆظ„ط© ظ…ظ† ط§ظ„ظˆظƒظٹظ„/ط§ظ„ظ…ط±ط´ط¯."
                icon={<ClipboardList size={22} />}
              />
              <DashboardInfoCard
                title="ظ…ظ„ط®طµ ط§ظ„ط²ظٹط§ط±ط§طھ"
                value={healthVisits.length}
                description="ط¥ط¬ظ…ط§ظ„ظٹ ط²ظٹط§ط±ط§طھ ط§ظ„ط¹ظٹط§ط¯ط© ط§ظ„طµط­ظٹط© ط§ظ„ظ…ط³ط¬ظ„ط©."
                icon={<Stethoscope size={22} />}
              />
              <DashboardInfoCard
                title="ظ…ظ„ط®طµ ط§ظ„ط­ط§ظ„ط§طھ ط§ظ„ظ…ط²ظ…ظ†ط©"
                value={healthCases.length}
                description="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط­ط§ظ„ط§طھ ط§ظ„طµط­ظٹط© ط§ظ„ظ…ط²ظ…ظ†ط© ط£ظˆ ط§ظ„ظ…ظ‡ظ…ط©."
                icon={<ShieldAlert size={22} />}
              />
            </section>
          )}

          {activeTab === "referrals" && (
            <>
              <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                <h2 className="mb-5 text-2xl font-black text-[#15445A]">
                  ط¥ط¶ط§ظپط© طھط­ظˆظٹظ„ طµط­ظٹ ظٹط¯ظˆظٹ
                </h2>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <select
                    value={newStudentId}
                    onChange={(event) => setNewStudentId(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  >
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name}
                      </option>
                    ))}
                  </select>

                  <input
                    value={newReason}
                    onChange={(event) => setNewReason(event.target.value)}
                    placeholder="ط³ط¨ط¨ ط§ظ„طھط­ظˆظٹظ„"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newNotes}
                    onChange={(event) => setNewNotes(event.target.value)}
                    placeholder="ظ…ظ„ط§ط­ط¸ط§طھ ط£ظˆظ„ظٹط©"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newReferralType}
                    onChange={(event) => setNewReferralType(event.target.value)}
                    placeholder="ظ†ظˆط¹ ط§ظ„طھط­ظˆظٹظ„"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newReferralDestination}
                    onChange={(event) =>
                      setNewReferralDestination(event.target.value)
                    }
                    placeholder="ط¬ظ‡ط© ط§ظ„طھط­ظˆظٹظ„"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <button
                    onClick={() => void createReferral()}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    <PlusCircle size={17} />
                    {saving ? "ط¬ط§ط±ظٹ..." : "ط¥ط¶ط§ظپط© ط§ظ„طھط­ظˆظٹظ„"}
                  </button>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  >
                    <option value="all">ظƒظ„ ط§ظ„ط­ط§ظ„ط§طھ</option>
                    {HEALTH_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sourceFilter}
                    onChange={(event) => setSourceFilter(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  >
                    <option value="all">ظƒظ„ ط§ظ„ظ…طµط§ط¯ط±</option>
                    <option value="health_referrals">طھط­ظˆظٹظ„ طµط­ظٹ ظ…ط¨ط§ط´ط±</option>
                    <option value="student_referrals">ط¥ط­ط§ظ„ط© ظ…ظ† ط§ظ„ظˆظƒظٹظ„/ط§ظ„ظ…ط±ط´ط¯</option>
                  </select>
                </div>

                {filteredReferrals.length === 0 ? (
                  <EmptyBox text="ظ„ط§ طھظˆط¬ط¯ طھط­ظˆظٹظ„ط§طھ طµط­ظٹط© ط­ط§ظ„ظٹط§ظ‹." />
                ) : (
                  <div className="space-y-3">
                    {filteredReferrals.map((item) => {
                      const key = `${item.source}-${item.id}`;

                      return (
                        <div
                          key={key}
                          className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                            <span>
                              {item.source === "health_referrals"
                                ? "طھط­ظˆظٹظ„ طµط­ظٹ ظ…ط¨ط§ط´ط±"
                                : "ط¥ط­ط§ظ„ط© ظ…ظ† ط§ظ„ظˆظƒظٹظ„/ط§ظ„ظ…ط±ط´ط¯"}
                            </span>
                            <span>â€¢</span>
                            <span>
                              {getElapsedLabel(item.created_at || item.referral_date)}
                            </span>
                            <span>â€¢</span>
                            <span>
                              {formatDate(item.created_at || item.referral_date)}
                            </span>
                          </div>

                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-black text-[#15445A]">
                                  {item.student_name}
                                </h3>
                                <StatusBadge status={item.status || "ط¬ط¯ظٹط¯"} />
                              </div>

                              <p className="text-sm text-slate-600">
                                ط§ظ„ظپطµظ„: {item.class_name || "-"}
                                {item.section ? ` - ${item.section}` : ""}
                              </p>

                              <p className="mt-2 text-sm leading-7 text-slate-600">
                                ط§ظ„ط³ط¨ط¨: {item.reason || "طھط­ظˆظٹظ„ ط¥ظ„ظ‰ ط§ظ„ط¹ظٹط§ط¯ط© ط§ظ„طµط­ظٹط©"}
                              </p>

                              {item.referral_destination && (
                                <p className="mt-1 text-xs font-bold text-slate-500">
                                  ط¬ظ‡ط© ط§ظ„طھط­ظˆظٹظ„: {item.referral_destination}
                                </p>
                              )}

                              {item.source_teacher_name && (
                                <p className="mt-1 text-xs text-slate-400">
                                  ظ…ظ†: {item.source_teacher_name} | ط§ظ„ظ…ط§ط¯ط©:{" "}
                                  {item.source_subject || "â€”"} | ط§ظ„ط­طµط©:{" "}
                                  {item.source_period_number || "â€”"}
                                </p>
                              )}

                              <textarea
                                value={noteDrafts[key] || ""}
                                onChange={(event) =>
                                  setNoteDrafts((prev) => ({
                                    ...prev,
                                    [key]: event.target.value,
                                  }))
                                }
                                placeholder="ط§ظƒطھط¨ ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ ط§ظ„طµط­ظٹط© ط£ظˆ ط§ظ„ط¥ط¬ط±ط§ط، ط§ظ„ظ…طھط®ط°..."
                                className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
                              />

                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() => void updateReferralNotes(item)}
                                  disabled={updatingId === key}
                                  className="inline-flex items-center gap-1 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  <Save size={14} />
                                  ط­ظپط¸ ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ
                                </button>

                                <button
                                  onClick={() =>
                                    void deleteRecord(item.source, item.id)
                                  }
                                  disabled={updatingId === `delete-${item.id}`}
                                  className="inline-flex items-center gap-1 rounded-2xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                                >
                                  <Trash2 size={14} />
                                  ط­ط°ظپ
                                </button>
                              </div>
                            </div>

                            <div className="w-full xl:w-72">
                              <select
                                value={item.status || "ط¬ط¯ظٹط¯"}
                                onChange={(event) =>
                                  void updateReferralStatus(item, event.target.value)
                                }
                                disabled={updatingId === key}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#0DA9A6]"
                              >
                                {HEALTH_STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === "visits" && (
            <>
              <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                <h2 className="mb-5 text-2xl font-black text-[#15445A]">
                  طھط³ط¬ظٹظ„ ط²ظٹط§ط±ط© طµط­ظٹط©
                </h2>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <select
                    value={newVisitStudentId}
                    onChange={(event) => setNewVisitStudentId(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  >
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name}
                      </option>
                    ))}
                  </select>

                  <input
                    value={newVisitSymptoms}
                    onChange={(event) => setNewVisitSymptoms(event.target.value)}
                    placeholder="ط§ظ„ط£ط¹ط±ط§ط¶"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newVisitDiagnosis}
                    onChange={(event) => setNewVisitDiagnosis(event.target.value)}
                    placeholder="ط§ظ„طھط´ط®ظٹطµ"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newVisitTemperature}
                    onChange={(event) =>
                      setNewVisitTemperature(event.target.value)
                    }
                    placeholder="ط§ظ„ط­ط±ط§ط±ط©"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newVisitBloodPressure}
                    onChange={(event) =>
                      setNewVisitBloodPressure(event.target.value)
                    }
                    placeholder="ط¶ط؛ط· ط§ظ„ط¯ظ…"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newVisitTreatment}
                    onChange={(event) => setNewVisitTreatment(event.target.value)}
                    placeholder="ط§ظ„ط¹ظ„ط§ط¬ / ط§ظ„ط¥ط¬ط±ط§ط،"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newVisitNotes}
                    onChange={(event) => setNewVisitNotes(event.target.value)}
                    placeholder="ظ…ظ„ط§ط­ط¸ط§طھ"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <select
                    value={newVisitStatus}
                    onChange={(event) => setNewVisitStatus(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  >
                    {VISIT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => void createHealthVisit()}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    <PlusCircle size={17} />
                    طھط³ط¬ظٹظ„ ط§ظ„ط²ظٹط§ط±ط©
                  </button>
                </div>
              </section>
                            <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                {filteredVisits.length === 0 ? (
                  <EmptyBox text="ظ„ط§ طھظˆط¬ط¯ ط²ظٹط§ط±ط§طھ طµط­ظٹط© ط­ط§ظ„ظٹط§ظ‹." />
                ) : (
                  <div className="space-y-3">
                    {filteredVisits.map((item) => {
                      const student = studentMap.get(item.student_id);
                      const key = `health_visits-${item.id}`;

                      return (
                        <div
                          key={item.id}
                          className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                            <span>ط²ظٹط§ط±ط© طµط­ظٹط©</span>
                            <span>â€¢</span>
                            <span>{formatDate(item.created_at || item.visit_date)}</span>
                            <span>â€¢</span>
                            <span>{getElapsedLabel(item.created_at || item.visit_date)}</span>
                          </div>

                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-black text-[#15445A]">
                                  {student?.full_name || "ط·ط§ظ„ط¨ ط؛ظٹط± ظ…ط¹ط±ظˆظپ"}
                                </h3>
                                <StatusBadge status={item.visit_status || "ظ…ظƒطھظ…ظ„ط©"} />
                              </div>

                              <p className="text-sm text-slate-600">
                                ط§ظ„ظپطµظ„: {student?.classroom || "-"}
                                {student?.section ? ` - ${student.section}` : ""}
                              </p>

                              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                                <MiniInfo label="ط§ظ„ط£ط¹ط±ط§ط¶" value={item.symptoms} />
                                <MiniInfo label="ط§ظ„طھط´ط®ظٹطµ" value={item.diagnosis} />
                                <MiniInfo
                                  label="ط§ظ„ط­ط±ط§ط±ط©"
                                  value={item.temperature ? `${item.temperature}` : null}
                                />
                                <MiniInfo label="ط¶ط؛ط· ط§ظ„ط¯ظ…" value={item.blood_pressure} />
                                <MiniInfo label="ط§ظ„ط¹ظ„ط§ط¬" value={item.treatment} />
                                <MiniInfo label="طھط§ط±ظٹط® ط§ظ„ط²ظٹط§ط±ط©" value={item.visit_date} />
                              </div>

                              <textarea
                                value={noteDrafts[key] || ""}
                                onChange={(event) =>
                                  setNoteDrafts((prev) => ({
                                    ...prev,
                                    [key]: event.target.value,
                                  }))
                                }
                                placeholder="ظ…ظ„ط§ط­ط¸ط§طھ ط§ظ„ط²ظٹط§ط±ط©..."
                                className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
                              />

                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() => void updateVisitNotes(item)}
                                  disabled={updatingId === key}
                                  className="inline-flex items-center gap-1 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  <Save size={14} />
                                  ط­ظپط¸ ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ
                                </button>

                                <button
                                  onClick={() =>
                                    void deleteRecord("health_visits", item.id)
                                  }
                                  disabled={updatingId === `delete-${item.id}`}
                                  className="inline-flex items-center gap-1 rounded-2xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                                >
                                  <Trash2 size={14} />
                                  ط­ط°ظپ
                                </button>
                              </div>
                            </div>

                            <div className="w-full xl:w-72">
                              <select
                                value={item.visit_status || "ظ…ظƒطھظ…ظ„ط©"}
                                onChange={(event) =>
                                  void updateVisitStatus(item, event.target.value)
                                }
                                disabled={updatingId === key}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#0DA9A6]"
                              >
                                {VISIT_STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === "cases" && (
            <>
              <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                <h2 className="mb-5 text-2xl font-black text-[#15445A]">
                  طھط³ط¬ظٹظ„ ط­ط§ظ„ط© طµط­ظٹط© ظ…ط²ظ…ظ†ط©
                </h2>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <select
                    value={newCaseStudentId}
                    onChange={(event) => setNewCaseStudentId(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  >
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={newCaseType}
                    onChange={(event) => setNewCaseType(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  >
                    {CASE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>

                  <select
                    value={newCaseSeverity}
                    onChange={(event) => setNewCaseSeverity(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  >
                    {SEVERITY_OPTIONS.map((severity) => (
                      <option key={severity} value={severity}>
                        {severity}
                      </option>
                    ))}
                  </select>

                  <input
                    value={newCaseDiagnosis}
                    onChange={(event) => setNewCaseDiagnosis(event.target.value)}
                    placeholder="ط§ظ„طھط´ط®ظٹطµ"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newCaseMedications}
                    onChange={(event) => setNewCaseMedications(event.target.value)}
                    placeholder="ط§ظ„ط£ط¯ظˆظٹط©"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newCaseEmergencyContact}
                    onChange={(event) =>
                      setNewCaseEmergencyContact(event.target.value)
                    }
                    placeholder="ط±ظ‚ظ… ط§ظ„ط·ظˆط§ط±ط¦"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newCaseActionPlan}
                    onChange={(event) => setNewCaseActionPlan(event.target.value)}
                    placeholder="ط®ط·ط© ط§ظ„طھط¹ط§ظ…ظ„"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <select
                    value={newCaseStatus}
                    onChange={(event) => setNewCaseStatus(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  >
                    {CASE_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => void createHealthCase()}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    <PlusCircle size={17} />
                    طھط³ط¬ظٹظ„ ط§ظ„ط­ط§ظ„ط©
                  </button>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                {filteredHealthCases.length === 0 ? (
                  <EmptyBox text="ظ„ط§ طھظˆط¬ط¯ ط­ط§ظ„ط§طھ طµط­ظٹط© ظ…ط²ظ…ظ†ط© ط­ط§ظ„ظٹط§ظ‹." />
                ) : (
                  <div className="space-y-3">
                    {filteredHealthCases.map((item) => {
                      const student = studentMap.get(item.student_id);
                      const key = `health_cases-${item.id}`;

                      return (
                        <div
                          key={item.id}
                          className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                            <span>ط­ط§ظ„ط© طµط­ظٹط© ظ…ط²ظ…ظ†ط©</span>
                            <span>â€¢</span>
                            <span>{formatDate(item.created_at)}</span>
                            <span>â€¢</span>
                            <span>{getElapsedLabel(item.created_at)}</span>
                          </div>

                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-black text-[#15445A]">
                                  {student?.full_name || "ط·ط§ظ„ط¨ ط؛ظٹط± ظ…ط¹ط±ظˆظپ"}
                                </h3>
                                <StatusBadge status={item.case_status || "ظ†ط´ط·ط©"} />
                                <StatusBadge status={item.severity || "ظ…طھظˆط³ط·ط©"} />
                              </div>

                              <p className="text-sm text-slate-600">
                                ط§ظ„ظپطµظ„: {student?.classroom || "-"}
                                {student?.section ? ` - ${student.section}` : ""}
                              </p>

                              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                                <MiniInfo label="ظ†ظˆط¹ ط§ظ„ط­ط§ظ„ط©" value={item.case_type} />
                                <MiniInfo label="ط§ظ„طھط´ط®ظٹطµ" value={item.diagnosis} />
                                <MiniInfo label="ط§ظ„ط£ط¯ظˆظٹط©" value={item.medications} />
                                <MiniInfo
                                  label="ط±ظ‚ظ… ط§ظ„ط·ظˆط§ط±ط¦"
                                  value={item.emergency_contact}
                                />
                              </div>

                              <textarea
                                value={noteDrafts[key] || ""}
                                onChange={(event) =>
                                  setNoteDrafts((prev) => ({
                                    ...prev,
                                    [key]: event.target.value,
                                  }))
                                }
                                placeholder="ط®ط·ط© ط§ظ„طھط¹ط§ظ…ظ„ ط§ظ„طµط­ظٹ..."
                                className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
                              />

                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() => void updateCaseActionPlan(item)}
                                  disabled={updatingId === key}
                                  className="inline-flex items-center gap-1 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  <Save size={14} />
                                  ط­ظپط¸ ط§ظ„ط®ط·ط©
                                </button>

                                <button
                                  onClick={() =>
                                    void deleteRecord("health_cases", item.id)
                                  }
                                  disabled={updatingId === `delete-${item.id}`}
                                  className="inline-flex items-center gap-1 rounded-2xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                                >
                                  <Trash2 size={14} />
                                  ط­ط°ظپ
                                </button>
                              </div>
                            </div>

                            <div className="w-full xl:w-72">
                              <select
                                value={item.case_status || "ظ†ط´ط·ط©"}
                                onChange={(event) =>
                                  void updateCaseStatus(item, event.target.value)
                                }
                                disabled={updatingId === key}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#0DA9A6]"
                              >
                                {CASE_STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </AppShell>
    </RoleGuard>
  );
}

function QuickStatusButton({
  status,
  onClick,
}: {
  status: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100"
    >
      {status}
    </button>
  );
}

function DashboardInfoCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3D7EB9]/10 text-[#3D7EB9]">
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <h2 className="mt-2 text-4xl font-black text-[#15445A]">{value}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
    </div>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 text-sm">
      <p className="mb-1 text-xs font-bold text-slate-400">{label}</p>
      <p className="font-bold text-slate-700">{value || "â€”"}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${getStatusStyle(
        status
      )}`}
    >
      {status}
    </span>
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
  icon: ReactNode;
  color: "blue" | "amber" | "red" | "emerald";
}) {
  const colors = {
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    amber: "bg-[#C1B489]/20 text-[#15445A]",
    red: "bg-red-50 text-red-700",
    emerald: "bg-[#07A869]/10 text-[#07A869]",
  };

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${colors[color]}`}
      >
        {icon}
      </div>
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-4xl font-black text-[#15445A]">{value}</h2>
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
        <Loader2 className="h-5 w-5 animate-spin text-[#15445A]" />
        ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط§ظ„ط¹ظٹط§ط¯ط© ط§ظ„طµط­ظٹط©...
      </div>
    </div>
  );
}

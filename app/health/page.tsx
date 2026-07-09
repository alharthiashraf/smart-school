"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageContainer from "@/components/layout/PageContainer";
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
    title: "المؤشرات",
    icon: <HeartPulse size={16} />,
  },
  {
    key: "referrals",
    title: "التحويلات الصحية",
    icon: <ClipboardList size={16} />,
  },
  {
    key: "visits",
    title: "الزيارات الصحية",
    icon: <Stethoscope size={16} />,
  },
  {
    key: "cases",
    title: "الحالات المزمنة",
    icon: <ShieldAlert size={16} />,
  },
];

const HEALTH_STATUS_OPTIONS = [
  "جديد",
  "تحت المتابعة",
  "تم الكشف",
  "يحتاج متابعة",
  "عاد للفصل",
  "تحويل لولي الأمر",
  "تحويل لمركز صحي",
  "مغلق",
];

const VISIT_STATUS_OPTIONS = [
  "مكتملة",
  "تحت المتابعة",
  "تحويل لمركز صحي",
  "تحويل لولي الأمر",
];

const CASE_STATUS_OPTIONS = ["نشطة", "تحت المتابعة", "مستقرة", "مغلقة"];

const CASE_TYPES = [
  "ربو",
  "سكري",
  "حساسية",
  "صرع",
  "أمراض قلب",
  "إصابة",
  "أخرى",
];

const SEVERITY_OPTIONS = ["منخفضة", "متوسطة", "عالية", "حرجة"];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getElapsedLabel(value?: string | null) {
  if (!value) return "—";

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `منذ ${days} يوم`;
  if (hours > 0) return `منذ ${hours} ساعة`;
  if (minutes > 0) return `منذ ${minutes} دقيقة`;

  return "الآن";
}

function normalizeHealthStatus(status?: string | null) {
  if (!status) return "جديد";
  if (status === "محولة للموجه الصحي") return "جديد";
  if (status === "sent_to_health") return "جديد";
  if (status === "تحت المتابعة الصحية") return "تحت المتابعة";
  if (status === "مغلقة صحياً") return "مغلق";
  return status;
}

function isHealthReferralStatus(status?: string | null) {
  return [
    "محولة للموجه الصحي",
    "sent_to_health",
    "تحت المتابعة الصحية",
    "مغلقة صحياً",
  ].includes(String(status || ""));
}

function getStatusStyle(status: string) {
  if (["عاد للفصل", "مغلق", "مغلقة صحياً", "مكتملة", "مستقرة"].includes(status)) {
    return "bg-[#07A869]/10 text-[#07A869]";
  }

  if (["تحت المتابعة", "يحتاج متابعة", "تحت المتابعة الصحية", "حرجة"].includes(status)) {
    return "bg-red-50 text-red-700";
  }

  if (["تحويل لولي الأمر", "تحويل لمركز صحي", "تم الكشف"].includes(status)) {
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
  const [newReason, setNewReason] = useState("تحويل إلى العيادة الصحية");
  const [newNotes, setNewNotes] = useState("");
  const [newReferralType, setNewReferralType] = useState("تحويل داخلي");
  const [newReferralDestination, setNewReferralDestination] = useState("");

  const [newVisitStudentId, setNewVisitStudentId] = useState("");
  const [newVisitSymptoms, setNewVisitSymptoms] = useState("");
  const [newVisitDiagnosis, setNewVisitDiagnosis] = useState("");
  const [newVisitTemperature, setNewVisitTemperature] = useState("");
  const [newVisitBloodPressure, setNewVisitBloodPressure] = useState("");
  const [newVisitTreatment, setNewVisitTreatment] = useState("");
  const [newVisitNotes, setNewVisitNotes] = useState("");
  const [newVisitStatus, setNewVisitStatus] = useState("مكتملة");

  const [newCaseStudentId, setNewCaseStudentId] = useState("");
  const [newCaseType, setNewCaseType] = useState("ربو");
  const [newCaseSeverity, setNewCaseSeverity] = useState("متوسطة");
  const [newCaseDiagnosis, setNewCaseDiagnosis] = useState("");
  const [newCaseMedications, setNewCaseMedications] = useState("");
  const [newCaseEmergencyContact, setNewCaseEmergencyContact] = useState("");
  const [newCaseActionPlan, setNewCaseActionPlan] = useState("");
  const [newCaseStatus, setNewCaseStatus] = useState("نشطة");

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
        student_name: student?.full_name || "طالب غير معروف",
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
            item.student_name || student?.full_name || "طالب غير معروف",
          class_name: item.class_name || student?.classroom || null,
          section: item.section || student?.section || null,
          grade_level: student?.grade_level || null,
          reason: item.reason || "تحويل للموجه الصحي",
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
    (item) => item.case_status !== "مغلقة"
  ).length;

  const openReferralsCount = unifiedReferrals.filter(
    (item) => item.status !== "مغلق"
  ).length;

  const closedReferralsCount = unifiedReferrals.filter(
    (item) => item.status === "مغلق"
  ).length;

  const followUpCount =
    unifiedReferrals.filter((item) =>
      ["تحت المتابعة", "يحتاج متابعة"].includes(item.status)
    ).length +
    healthCases.filter((item) => item.case_status === "تحت المتابعة").length;

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
      showToast("error", "اختر الطالب أولاً");
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
        reason: newReason.trim() || "تحويل إلى العيادة الصحية",
        notes: newNotes.trim() || null,
        status: "جديد",
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
      "تحويل صحي جديد",
      `تم تحويل الطالب ${student?.full_name || "غير محدد"} إلى العيادة الصحية.`,
      "health_referral"
    );

    await supabase.from("alerts").insert({
      school_id: currentSchool.id,
      student_id: newStudentId,
      alert_type: "health",
      title: "تحويل إلى العيادة الصحية",
      message: `تم تحويل الطالب ${student?.full_name || ""} إلى العيادة الصحية`,
      severity: "medium",
      is_read: false,
    });

    await addTimeline(
      newStudentId,
      student?.full_name || null,
      "health_referral",
      "تحويل إلى العيادة الصحية",
      newReason.trim() || "تحويل إلى العيادة الصحية"
    );

    setHealthReferrals((prev) => [created, ...prev]);
    setNewNotes("");
    setNewReferralDestination("");
    showToast("success", "تم إضافة التحويل الصحي بنجاح");
  }

  async function createHealthVisit() {
    if (!currentSchool?.id) return;

    if (!newVisitStudentId) {
      showToast("error", "اختر الطالب أولاً");
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
        visit_status: newVisitStatus || "مكتملة",
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
      "زيارة صحية جديدة",
      `تم تسجيل زيارة صحية للطالب ${student?.full_name || "غير محدد"}.`,
      "health_visit"
    );

    await addTimeline(
      newVisitStudentId,
      student?.full_name || null,
      "health_visit",
      "زيارة صحية",
      newVisitSymptoms.trim() || "تم تسجيل زيارة صحية في العيادة"
    );

    setHealthVisits((prev) => [created, ...prev]);

    setNewVisitSymptoms("");
    setNewVisitDiagnosis("");
    setNewVisitTemperature("");
    setNewVisitBloodPressure("");
    setNewVisitTreatment("");
    setNewVisitNotes("");
    setNewVisitStatus("مكتملة");

    showToast("success", "تم تسجيل الزيارة الصحية بنجاح");
  }

  async function createHealthCase() {
    if (!currentSchool?.id) return;

    if (!newCaseStudentId) {
      showToast("error", "اختر الطالب أولاً");
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
        case_type: newCaseType || "أخرى",
        severity: newCaseSeverity || "متوسطة",
        diagnosis: newCaseDiagnosis.trim() || null,
        medications: newCaseMedications.trim() || null,
        emergency_contact: newCaseEmergencyContact.trim() || null,
        action_plan: newCaseActionPlan.trim() || null,
        case_status: newCaseStatus || "نشطة",
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
      "حالة صحية جديدة",
      `تم تسجيل حالة صحية للطالب ${student?.full_name || "غير محدد"}.`,
      "health_case"
    );

    await addTimeline(
      newCaseStudentId,
      student?.full_name || null,
      "health_case",
      "تسجيل حالة صحية",
      `${newCaseType} - ${newCaseSeverity}`
    );

    setHealthCases((prev) => [created, ...prev]);

    setNewCaseDiagnosis("");
    setNewCaseMedications("");
    setNewCaseEmergencyContact("");
    setNewCaseActionPlan("");
    setNewCaseType("ربو");
    setNewCaseSeverity("متوسطة");
    setNewCaseStatus("نشطة");

    showToast("success", "تم تسجيل الحالة الصحية بنجاح");
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
            closed_at: status === "مغلق" ? new Date().toISOString() : null,
          }
        : {
            status:
              status === "مغلق"
                ? "مغلقة صحياً"
                : status === "تحت المتابعة"
                ? "تحت المتابعة الصحية"
                : status,
            close_notes: `تحديث صحي: ${status}`,
            updated_at: new Date().toISOString(),
            closed_at: status === "مغلق" ? new Date().toISOString() : null,
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
      "تحديث حالة صحية",
      `تم تحديث حالة الطالب ${item.student_name || "غير محدد"} إلى: ${status}`,
      "health_status"
    );

    await addTimeline(
      item.student_id,
      item.student_name,
      "health",
      "تحديث حالة صحية",
      `تم تحديث الحالة الصحية إلى: ${status}`
    );

    if (status === "تحويل لولي الأمر" && item.student_id) {
      await supabase.from("student_interventions").insert({
        school_id: currentSchool.id,
        student_id: item.student_id,
        intervention_type: "parent_call",
        title: "استدعاء ولي أمر بسبب حالة صحية",
        notes: `تم إنشاء تدخل تلقائي من العيادة الصحية للطالب ${item.student_name || ""}`,
        status: "مفتوح",
      });
    }

    setUpdatingId(null);
    showToast("success", "تم تحديث حالة التحويل الصحي");
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
      "حفظ ملاحظات صحية",
      notes || "تم تحديث الملاحظات الصحية"
    );

    showToast("success", "تم حفظ الملاحظات الصحية");
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
      "تحديث زيارة صحية",
      `تم تحديث حالة الزيارة إلى: ${status}`
    );

    showToast("success", "تم تحديث حالة الزيارة");
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
      "تحديث حالة صحية مزمنة",
      `تم تحديث الحالة إلى: ${status}`
    );

    showToast("success", "تم تحديث الحالة الصحية");
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
      "تحديث خطة التعامل الصحي",
      actionPlan || "تم تحديث خطة التعامل الصحي"
    );

    showToast("success", "تم حفظ خطة التعامل");
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
      "تحديث ملاحظات زيارة صحية",
      notes || "تم تحديث ملاحظات الزيارة الصحية"
    );

    showToast("success", "تم حفظ ملاحظات الزيارة");
    void fetchData();
  }

  async function deleteRecord(
    tableName: "health_referrals" | "student_referrals" | "health_visits" | "health_cases",
    id: string
  ) {
    if (!currentSchool?.id) return;

    const confirmed = window.confirm("هل تريد حذف هذا السجل؟");
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

    showToast("success", "تم حذف السجل بنجاح");
    void fetchData();
  }

  function exportHealthPDF() {
    exportTableToPDF({
      title: "تقرير بوابة الموجه الصحي",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: `تقرير صحي شامل ${getTodayDate()}`,
      headers: ["المؤشر", "القيمة"],
      rows: [
        ["زيارات اليوم", todayVisitsCount],
        ["الحالات الصحية النشطة", activeCasesCount],
        ["التحويلات المفتوحة", openReferralsCount],
        ["التحويلات المغلقة", closedReferralsCount],
        ["طلاب تحت المتابعة", followUpCount],
        ["إجمالي السجلات الصحية", totalHealthRecords],
      ],
      fileName: `health-report-${getTodayDate()}.pdf`,
    });

    showToast("success", "تم تجهيز تقرير PDF");
  }

  async function exportHealthExcel() {
    const rows = [
      ...unifiedReferrals.map((item) => [
        "تحويل صحي",
        item.student_name || "-",
        item.class_name || "-",
        item.section || "-",
        item.status || "-",
        item.reason || "-",
        item.notes || "-",
        item.source === "health_referrals"
          ? "تحويل صحي مباشر"
          : "إحالة من الوكيل/المرشد",
        item.created_at ? item.created_at.slice(0, 10) : "-",
      ]),

      ...healthVisits.map((item) => {
        const student = studentMap.get(item.student_id);

        return [
          "زيارة صحية",
          student?.full_name || "-",
          student?.classroom || "-",
          student?.section || "-",
          item.visit_status || "-",
          item.symptoms || "-",
          item.notes || "-",
          "عيادة مدرسية",
          item.visit_date || "-",
        ];
      }),

      ...healthCases.map((item) => {
        const student = studentMap.get(item.student_id);

        return [
          "حالة صحية مزمنة",
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
      title: "تقرير بوابة الموجه الصحي",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "السجلات الصحية الشاملة",
      headers: [
        "النوع",
        "الطالب",
        "الفصل",
        "الشعبة",
        "الحالة",
        "السبب/النوع",
        "الملاحظات/الخطة",
        "المصدر/الخطورة",
        "التاريخ",
      ],
      rows,
      fileName: `health-records-${getTodayDate()}.xlsx`,
    });

    showToast("success", "تم تصدير Excel");
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
        <PageContainer size="wide" className="space-y-5">
          <Breadcrumb />

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
                placeholder="بحث باسم الطالب أو الفصل أو التشخيص أو الملاحظة..."
                className="w-full rounded-2xl border border-slate-200 py-3 pr-10 pl-4 text-sm outline-none focus:border-[#0DA9A6]"
              />
            </div>
          </section>
                    {activeTab === "dashboard" && (
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <DashboardInfoCard
                title="ملخص التحويلات"
                value={unifiedReferrals.length}
                description="إجمالي التحويلات الصحية المباشرة والمحولة من الوكيل/المرشد."
                icon={<ClipboardList size={22} />}
              />
              <DashboardInfoCard
                title="ملخص الزيارات"
                value={healthVisits.length}
                description="إجمالي زيارات العيادة الصحية المسجلة."
                icon={<Stethoscope size={22} />}
              />
              <DashboardInfoCard
                title="ملخص الحالات المزمنة"
                value={healthCases.length}
                description="إجمالي الحالات الصحية المزمنة أو المهمة."
                icon={<ShieldAlert size={22} />}
              />
            </section>
          )}

          {activeTab === "referrals" && (
            <>
              <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                <h2 className="mb-5 text-2xl font-black text-[#15445A]">
                  إضافة تحويل صحي يدوي
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
                    placeholder="سبب التحويل"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newNotes}
                    onChange={(event) => setNewNotes(event.target.value)}
                    placeholder="ملاحظات أولية"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newReferralType}
                    onChange={(event) => setNewReferralType(event.target.value)}
                    placeholder="نوع التحويل"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newReferralDestination}
                    onChange={(event) =>
                      setNewReferralDestination(event.target.value)
                    }
                    placeholder="جهة التحويل"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <button
                    onClick={() => void createReferral()}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    <PlusCircle size={17} />
                    {saving ? "جاري..." : "إضافة التحويل"}
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
                    <option value="all">كل الحالات</option>
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
                    <option value="all">كل المصادر</option>
                    <option value="health_referrals">تحويل صحي مباشر</option>
                    <option value="student_referrals">إحالة من الوكيل/المرشد</option>
                  </select>
                </div>

                {filteredReferrals.length === 0 ? (
                  <EmptyBox text="لا توجد تحويلات صحية حالياً." />
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
                                ? "تحويل صحي مباشر"
                                : "إحالة من الوكيل/المرشد"}
                            </span>
                            <span>•</span>
                            <span>
                              {getElapsedLabel(item.created_at || item.referral_date)}
                            </span>
                            <span>•</span>
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
                                <StatusBadge status={item.status || "جديد"} />
                              </div>

                              <p className="text-sm text-slate-600">
                                الفصل: {item.class_name || "-"}
                                {item.section ? ` - ${item.section}` : ""}
                              </p>

                              <p className="mt-2 text-sm leading-7 text-slate-600">
                                السبب: {item.reason || "تحويل إلى العيادة الصحية"}
                              </p>

                              {item.referral_destination && (
                                <p className="mt-1 text-xs font-bold text-slate-500">
                                  جهة التحويل: {item.referral_destination}
                                </p>
                              )}

                              {item.source_teacher_name && (
                                <p className="mt-1 text-xs text-slate-400">
                                  من: {item.source_teacher_name} | المادة:{" "}
                                  {item.source_subject || "—"} | الحصة:{" "}
                                  {item.source_period_number || "—"}
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
                                placeholder="اكتب الملاحظات الصحية أو الإجراء المتخذ..."
                                className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
                              />

                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() => void updateReferralNotes(item)}
                                  disabled={updatingId === key}
                                  className="inline-flex items-center gap-1 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  <Save size={14} />
                                  حفظ الملاحظات
                                </button>

                                <button
                                  onClick={() =>
                                    void deleteRecord(item.source, item.id)
                                  }
                                  disabled={updatingId === `delete-${item.id}`}
                                  className="inline-flex items-center gap-1 rounded-2xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                                >
                                  <Trash2 size={14} />
                                  حذف
                                </button>
                              </div>
                            </div>

                            <div className="w-full xl:w-72">
                              <select
                                value={item.status || "جديد"}
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
                  تسجيل زيارة صحية
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
                    placeholder="الأعراض"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newVisitDiagnosis}
                    onChange={(event) => setNewVisitDiagnosis(event.target.value)}
                    placeholder="التشخيص"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newVisitTemperature}
                    onChange={(event) =>
                      setNewVisitTemperature(event.target.value)
                    }
                    placeholder="الحرارة"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newVisitBloodPressure}
                    onChange={(event) =>
                      setNewVisitBloodPressure(event.target.value)
                    }
                    placeholder="ضغط الدم"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newVisitTreatment}
                    onChange={(event) => setNewVisitTreatment(event.target.value)}
                    placeholder="العلاج / الإجراء"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newVisitNotes}
                    onChange={(event) => setNewVisitNotes(event.target.value)}
                    placeholder="ملاحظات"
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
                    تسجيل الزيارة
                  </button>
                </div>
              </section>
                            <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                {filteredVisits.length === 0 ? (
                  <EmptyBox text="لا توجد زيارات صحية حالياً." />
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
                            <span>زيارة صحية</span>
                            <span>•</span>
                            <span>{formatDate(item.created_at || item.visit_date)}</span>
                            <span>•</span>
                            <span>{getElapsedLabel(item.created_at || item.visit_date)}</span>
                          </div>

                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-black text-[#15445A]">
                                  {student?.full_name || "طالب غير معروف"}
                                </h3>
                                <StatusBadge status={item.visit_status || "مكتملة"} />
                              </div>

                              <p className="text-sm text-slate-600">
                                الفصل: {student?.classroom || "-"}
                                {student?.section ? ` - ${student.section}` : ""}
                              </p>

                              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                                <MiniInfo label="الأعراض" value={item.symptoms} />
                                <MiniInfo label="التشخيص" value={item.diagnosis} />
                                <MiniInfo
                                  label="الحرارة"
                                  value={item.temperature ? `${item.temperature}` : null}
                                />
                                <MiniInfo label="ضغط الدم" value={item.blood_pressure} />
                                <MiniInfo label="العلاج" value={item.treatment} />
                                <MiniInfo label="تاريخ الزيارة" value={item.visit_date} />
                              </div>

                              <textarea
                                value={noteDrafts[key] || ""}
                                onChange={(event) =>
                                  setNoteDrafts((prev) => ({
                                    ...prev,
                                    [key]: event.target.value,
                                  }))
                                }
                                placeholder="ملاحظات الزيارة..."
                                className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
                              />

                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() => void updateVisitNotes(item)}
                                  disabled={updatingId === key}
                                  className="inline-flex items-center gap-1 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  <Save size={14} />
                                  حفظ الملاحظات
                                </button>

                                <button
                                  onClick={() =>
                                    void deleteRecord("health_visits", item.id)
                                  }
                                  disabled={updatingId === `delete-${item.id}`}
                                  className="inline-flex items-center gap-1 rounded-2xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                                >
                                  <Trash2 size={14} />
                                  حذف
                                </button>
                              </div>
                            </div>

                            <div className="w-full xl:w-72">
                              <select
                                value={item.visit_status || "مكتملة"}
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
                  تسجيل حالة صحية مزمنة
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
                    placeholder="التشخيص"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newCaseMedications}
                    onChange={(event) => setNewCaseMedications(event.target.value)}
                    placeholder="الأدوية"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newCaseEmergencyContact}
                    onChange={(event) =>
                      setNewCaseEmergencyContact(event.target.value)
                    }
                    placeholder="رقم الطوارئ"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />

                  <input
                    value={newCaseActionPlan}
                    onChange={(event) => setNewCaseActionPlan(event.target.value)}
                    placeholder="خطة التعامل"
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
                    تسجيل الحالة
                  </button>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                {filteredHealthCases.length === 0 ? (
                  <EmptyBox text="لا توجد حالات صحية مزمنة حالياً." />
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
                            <span>حالة صحية مزمنة</span>
                            <span>•</span>
                            <span>{formatDate(item.created_at)}</span>
                            <span>•</span>
                            <span>{getElapsedLabel(item.created_at)}</span>
                          </div>

                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-black text-[#15445A]">
                                  {student?.full_name || "طالب غير معروف"}
                                </h3>
                                <StatusBadge status={item.case_status || "نشطة"} />
                                <StatusBadge status={item.severity || "متوسطة"} />
                              </div>

                              <p className="text-sm text-slate-600">
                                الفصل: {student?.classroom || "-"}
                                {student?.section ? ` - ${student.section}` : ""}
                              </p>

                              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                                <MiniInfo label="نوع الحالة" value={item.case_type} />
                                <MiniInfo label="التشخيص" value={item.diagnosis} />
                                <MiniInfo label="الأدوية" value={item.medications} />
                                <MiniInfo
                                  label="رقم الطوارئ"
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
                                placeholder="خطة التعامل الصحي..."
                                className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
                              />

                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() => void updateCaseActionPlan(item)}
                                  disabled={updatingId === key}
                                  className="inline-flex items-center gap-1 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  <Save size={14} />
                                  حفظ الخطة
                                </button>

                                <button
                                  onClick={() =>
                                    void deleteRecord("health_cases", item.id)
                                  }
                                  disabled={updatingId === `delete-${item.id}`}
                                  className="inline-flex items-center gap-1 rounded-2xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                                >
                                  <Trash2 size={14} />
                                  حذف
                                </button>
                              </div>
                            </div>

                            <div className="w-full xl:w-72">
                              <select
                                value={item.case_status || "نشطة"}
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
        </PageContainer>
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
      <p className="font-bold text-slate-700">{value || "—"}</p>
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
        جاري تحميل العيادة الصحية...
      </div>
    </div>
  );
}
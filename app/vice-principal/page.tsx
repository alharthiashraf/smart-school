"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExportButton from "@/components/ui/buttons/ExportButton";
import PageLoader from "@/components/ui/loading/PageLoader";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";
import UiEmptyState from "@/components/ui/empty-state/EmptyState";
import RoleGuard from "@/components/auth/RoleGuard";
import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Target,
  ClipboardCheck,
  Download,
  FileText,
  HeartPulse,
  RefreshCcw,
  Search,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

type Student = {
  id: string;
  school_id: string | null;
  full_name: string | null;
  classroom?: string | null;
  class_name?: string | null;
  section?: string | null;
  grade_level?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  status?: string | null;
  is_active?: boolean | null;
};

type Attendance = {
  id: string;
  school_id: string | null;
  student_id: string | null;
  attendance_date: string | null;
  status: string | null;
  created_at?: string | null;
  recorded_at?: string | null;
};

type StudentBehavior = {
  id: string;
  school_id: string | null;
  student_id: string | null;
  behavior_date: string | null;
  violation_type: string | null;
  violation_level: string | null;
  action_taken: string | null;
  status: string | null;
  notes: string | null;
  created_at?: string | null;
};

type StudentReferral = {
  id: string;
  school_id: string | null;
  student_id: string | null;
  student_name?: string | null;
  class_name?: string | null;
  section?: string | null;
  reason: string | null;
  teacher_notes?: string | null;
  status: string | null;
  return_status?: string | null;
  referred_at?: string | null;
  returned_at?: string | null;
  created_at?: string | null;
};

type StudentIntervention = {
  id: string;
  school_id: string | null;
  student_id: string | null;
  intervention_type: string | null;
  title: string | null;
  notes: string | null;
  status: string | null;
  priority?: string | null;
  target_date?: string | null;
  follow_up_date?: string | null;
  created_at?: string | null;
};

type HealthCase = {
  id: string;
  school_id: string | null;
  student_id: string | null;
  case_type: string | null;
  severity: string | null;
  diagnosis: string | null;
  case_status: string | null;
  action_plan?: string | null;
  created_at?: string | null;
};

type ParentCommunication = {
  id: string;
  school_id: string | null;
  student_id: string | null;
  communication_date: string | null;
  guardian_name: string | null;
  communication_method: string | null;
  topic: string | null;
  result: string | null;
  notes: string | null;
  created_at?: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type RiskStudent = {
  student: Student;
  absenceCount: number;
  lateCount: number;
  behaviorCount: number;
  openReferralCount: number;
  highInterventionCount: number;
  activeHealthCount: number;
  riskScore: number;
  riskLevel: "منخفض" | "متوسط" | "مرتفع" | "حرج";
  reasons: string[];
};

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function normalizeAttendance(status?: string | null) {
  if (!status) return "";
  if (status === "present") return "حاضر";
  if (status === "absent") return "غائب";
  if (status === "late") return "متأخر";
  if (status === "excused") return "بعذر";
  return status;
}

function isAbsent(status?: string | null) {
  const value = normalizeAttendance(status);
  return value === "غائب" || value === "absent";
}

function isLate(status?: string | null) {
  const value = normalizeAttendance(status);
  return value === "متأخر" || value === "late";
}

function isOpenStatus(status?: string | null) {
  const value = String(status || "");
  return ![
    "مغلق",
    "مغلقة",
    "تم الإغلاق",
    "تم التحسن",
    "تم تحقيق الأهداف",
    "عاد للفصل",
    "مغلقة صحياً",
  ].includes(value);
}

function getRiskLevel(score: number): RiskStudent["riskLevel"] {
  if (score >= 12) return "حرج";
  if (score >= 8) return "مرتفع";
  if (score >= 4) return "متوسط";
  return "منخفض";
}

function getRiskStyle(level: RiskStudent["riskLevel"]) {
  if (level === "حرج") {
    return "bg-[color-mix(in_srgb,var(--app-danger)_16%,transparent)] text-[var(--app-danger)]";
  }

  if (level === "مرتفع") {
    return "bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)]";
  }

  if (level === "متوسط") {
    return "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";
  }

  return "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
}

function getStatusStyle(status?: string | null) {
  const value = String(status || "");

  if (!isOpenStatus(value)) {
    return "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
  }

  if (value.includes("بانتظار")) {
    return "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";
  }

  if (value.includes("حرج") || value.includes("مرتفع")) {
    return "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]";
  }

  return "bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)] text-[var(--app-primary)]";
}
export default function VicePrincipalPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [behaviors, setBehaviors] = useState<StudentBehavior[]>([]);
  const [referrals, setReferrals] = useState<StudentReferral[]>([]);
  const [interventions, setInterventions] = useState<StudentIntervention[]>([]);
  const [healthCases, setHealthCases] = useState<HealthCase[]>([]);
  const [parentCommunications, setParentCommunications] = useState<
    ParentCommunication[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("الكل");
  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const today = getTodayDate();
  const last30Days = getDateDaysAgo(30);

  const showToast = useCallback(
    (type: Toast["type"], message: string) => {
      setToast({ type, message });
      window.setTimeout(() => setToast(null), 3000);
    },
    [],
  );

  const fetchData = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);
    setErrorMsg("");

    const [
      studentsResult,
      attendanceResult,
      behaviorsResult,
      referralsResult,
      interventionsResult,
      healthCasesResult,
      parentCommunicationsResult,
    ] = await Promise.all([
      supabase
        .from("students")
        .select(
          "id, school_id, full_name, classroom, class_name, section, grade_level, guardian_name, guardian_phone, status, is_active"
        )
        .eq("school_id", currentSchool.id)
        .order("full_name", { ascending: true }),

      supabase
        .from("attendance")
        .select("*")
        .eq("school_id", currentSchool.id)
        .gte("attendance_date", last30Days)
        .order("attendance_date", { ascending: false }),

      supabase
        .from("student_behavior")
        .select("*")
        .eq("school_id", currentSchool.id)
        .gte("behavior_date", last30Days)
        .order("behavior_date", { ascending: false }),

      supabase
        .from("student_referrals")
        .select("*")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("student_interventions")
        .select("*")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("health_cases")
        .select("*")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("parent_communications")
        .select("*")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),
    ]);

    setLoading(false);

    if (studentsResult.error) {
      setErrorMsg(studentsResult.error.message);
      return;
    }

    if (attendanceResult.error) {
      setErrorMsg(attendanceResult.error.message);
      return;
    }

    if (behaviorsResult.error) {
      setErrorMsg(behaviorsResult.error.message);
      return;
    }

    if (referralsResult.error) {
      setErrorMsg(referralsResult.error.message);
      return;
    }

    if (interventionsResult.error) {
      setErrorMsg(interventionsResult.error.message);
      return;
    }

    if (healthCasesResult.error) {
      setErrorMsg(healthCasesResult.error.message);
      return;
    }

    if (parentCommunicationsResult.error) {
      setErrorMsg(parentCommunicationsResult.error.message);
      return;
    }

    setStudents((studentsResult.data as Student[]) || []);
    setAttendance((attendanceResult.data as Attendance[]) || []);
    setBehaviors((behaviorsResult.data as StudentBehavior[]) || []);
    setReferrals((referralsResult.data as StudentReferral[]) || []);
    setInterventions(
      (interventionsResult.data as StudentIntervention[]) || []
    );
    setHealthCases((healthCasesResult.data as HealthCase[]) || []);
    setParentCommunications(
      (parentCommunicationsResult.data as ParentCommunication[]) || []
    );
  }, [currentSchool?.id, last30Days]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setLoading(false);
      setErrorMsg("لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      return;
    }

    void fetchData();
  }, [currentSchool?.id, fetchData, schoolLoading]);

  const studentMap = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const todayAttendance = useMemo(() => {
    return attendance.filter((item) => item.attendance_date === today);
  }, [attendance, today]);

  const presentToday = todayAttendance.filter((item) => {
    const value = normalizeAttendance(item.status);
    return value === "حاضر" || value === "present";
  }).length;

  const absentToday = todayAttendance.filter((item) =>
    isAbsent(item.status)
  ).length;

  const lateToday = todayAttendance.filter((item) =>
    isLate(item.status)
  ).length;

  const openReferrals = referrals.filter((item) =>
    isOpenStatus(item.status)
  );

  const criticalInterventions = interventions.filter(
    (item) => item.priority === "حرج"
  );

  const activeHealthCases = healthCases.filter((item) =>
    isOpenStatus(item.case_status)
  );

  const recentReferrals = referrals.slice(0, 6);
  const recentBehaviors = behaviors.slice(0, 6);
  const recentInterventions = interventions.slice(0, 6);
  const recentHealthCases = healthCases.slice(0, 6);
  const recentParentCommunications = parentCommunications.slice(0, 6);

  const riskStudents = useMemo<RiskStudent[]>(() => {
    return students
      .map((student) => {
        const studentAttendance = attendance.filter(
          (item) => item.student_id === student.id
        );

        const absenceCount = studentAttendance.filter((item) =>
          isAbsent(item.status)
        ).length;

        const lateCount = studentAttendance.filter((item) =>
          isLate(item.status)
        ).length;

        const behaviorCount = behaviors.filter(
          (item) => item.student_id === student.id
        ).length;

        const openReferralCount = referrals.filter(
          (item) =>
            item.student_id === student.id && isOpenStatus(item.status)
        ).length;

        const highInterventionCount = interventions.filter(
          (item) =>
            item.student_id === student.id &&
            ["مرتفع", "حرج"].includes(String(item.priority || ""))
        ).length;

        const activeHealthCount = healthCases.filter(
          (item) =>
            item.student_id === student.id && isOpenStatus(item.case_status)
        ).length;

        const riskScore =
          absenceCount * 2 +
          lateCount +
          behaviorCount * 2 +
          openReferralCount * 2 +
          highInterventionCount * 3 +
          activeHealthCount * 2;

        const reasons: string[] = [];

        if (absenceCount >= 3) reasons.push(`غياب ${absenceCount} مرات`);
        if (lateCount >= 3) reasons.push(`تأخر ${lateCount} مرات`);
        if (behaviorCount >= 2) reasons.push(`مخالفات ${behaviorCount}`);
        if (openReferralCount > 0) reasons.push(`إحالات مفتوحة ${openReferralCount}`);
        if (highInterventionCount > 0) reasons.push(`تدخل عالي/حرج ${highInterventionCount}`);
        if (activeHealthCount > 0) reasons.push(`حالة صحية نشطة`);

        return {
          student,
          absenceCount,
          lateCount,
          behaviorCount,
          openReferralCount,
          highInterventionCount,
          activeHealthCount,
          riskScore,
          riskLevel: getRiskLevel(riskScore),
          reasons,
        };
      })
      .filter((item) => item.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [students, attendance, behaviors, referrals, interventions, healthCases]);

  const filteredRiskStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return riskStudents.filter((item) => {
      const student = item.student;

      const text = `
        ${student.full_name || ""}
        ${student.classroom || ""}
        ${student.class_name || ""}
        ${student.section || ""}
        ${student.grade_level || ""}
        ${student.guardian_name || ""}
        ${student.guardian_phone || ""}
        ${item.riskLevel}
        ${item.reasons.join(" ")}
      `.toLowerCase();

      const matchesSearch = !keyword || text.includes(keyword);
      const matchesRisk =
        riskFilter === "الكل" || item.riskLevel === riskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [riskStudents, search, riskFilter]);

  const summaryStats = useMemo(() => {
    return {
      totalStudents: students.length,
      presentToday,
      absentToday,
      lateToday,
      openReferrals: openReferrals.length,
      criticalInterventions: criticalInterventions.length,
      activeHealthCases: activeHealthCases.length,
      urgentStudents: riskStudents.filter((item) =>
        ["مرتفع", "حرج"].includes(item.riskLevel)
      ).length,
    };
  }, [
    students.length,
    presentToday,
    absentToday,
    lateToday,
    openReferrals.length,
    criticalInterventions.length,
    activeHealthCases.length,
    riskStudents,
  ]);

  function getExportHeaders(): string[] {
    return [
      "الطالب",
      "الفصل",
      "الشعبة",
      "المرحلة",
      "مستوى الخطر",
      "درجة الخطر",
      "الغياب",
      "التأخر",
      "المخالفات",
      "الإحالات المفتوحة",
      "التدخلات العالية",
      "الحالات الصحية",
      "الأسباب",
      "ولي الأمر",
      "جوال ولي الأمر",
    ];
  }

  function getExportRows(): (string | number)[][] {
    return filteredRiskStudents.map((item) => [
      item.student.full_name || "-",
      item.student.classroom || item.student.class_name || "-",
      item.student.section || "-",
      item.student.grade_level || "-",
      item.riskLevel,
      item.riskScore,
      item.absenceCount,
      item.lateCount,
      item.behaviorCount,
      item.openReferralCount,
      item.highInterventionCount,
      item.activeHealthCount,
      item.reasons.join("، ") || "-",
      item.student.guardian_name || "-",
      item.student.guardian_phone || "-",
    ]);
  }

  async function exportExcel() {
    await exportTableToExcel({
      title: "لوحة الوكيل التنفيذية",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: `متابعة الطلاب عالية الخطورة ${getTodayDate()}`,
      headers: getExportHeaders(),
      rows: getExportRows(),
      fileName: `vice-principal-risk-${getTodayDate()}.xlsx`,
    });

    showToast("success", "تم تصدير Excel");
  }

  function exportPDF() {
    exportTableToPDF({
      title: "لوحة الوكيل التنفيذية",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: `تقرير متابعة الطلاب ${getTodayDate()}`,
      headers: getExportHeaders(),
      rows: getExportRows(),
      fileName: `vice-principal-risk-${getTodayDate()}.pdf`,
    });

    showToast("success", "تم تجهيز PDF");
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل لوحة الوكيل التنفيذية..." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <div className="space-y-5" dir="rtl">
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
            title="لوحة الوكيل التنفيذية"
            description="متابعة الحضور والغياب والإحالات والتدخلات والمخالفات والحالات الصحية مع مؤشر خطر موحد."
            badge="الإدارة التنفيذية"
            icon={<ShieldAlert size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "لوحة الوكيل" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "—" },
              { label: "الطلاب", value: summaryStats.totalStudents },
              { label: "الحضور اليوم", value: summaryStats.presentToday },
              { label: "بحاجة متابعة", value: summaryStats.urgentStudents },
            ]}
            stats={[
              {
                label: "الغياب اليوم",
                value: summaryStats.absentToday,
                icon: <AlertTriangle size={20} aria-hidden="true" />,
                tone: summaryStats.absentToday > 0 ? "gold" : "green",
              },
              {
                label: "الإحالات المفتوحة",
                value: summaryStats.openReferrals,
                icon: <ClipboardCheck size={20} aria-hidden="true" />,
                tone: summaryStats.openReferrals > 0 ? "gold" : "green",
              },
              {
                label: "تدخلات حرجة",
                value: summaryStats.criticalInterventions,
                icon: <ShieldAlert size={20} aria-hidden="true" />,
                tone: summaryStats.criticalInterventions > 0 ? "red" : "green",
              },
              {
                label: "حالات صحية نشطة",
                value: summaryStats.activeHealthCases,
                icon: <HeartPulse size={20} aria-hidden="true" />,
                tone: summaryStats.activeHealthCases > 0 ? "gold" : "green",
              },
            ]}
            actions={
              <>
                <SecondaryButton
                  icon={<RefreshCcw size={17} aria-hidden="true" />}
                  onClick={() => void fetchData()}
                  loading={loading}
                >
                  تحديث
                </SecondaryButton>

                <ExportButton
                  icon={<Download size={17} aria-hidden="true" />}
                  onClick={() => void exportExcel()}
                  disabled={!filteredRiskStudents.length}
                >
                  Excel
                </ExportButton>

                <ExportButton
                  icon={<FileText size={17} aria-hidden="true" />}
                  onClick={exportPDF}
                  disabled={!filteredRiskStudents.length}
                >
                  PDF
                </ExportButton>
              </>
            }
          />

          {errorMsg && (
            <ErrorState description={errorMsg} />
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ExecutiveCard
              title="إجمالي الطلاب"
              value={summaryStats.totalStudents}
              icon={<Users size={22} aria-hidden="true" />}
              tone="primary"
            />
            <ExecutiveCard
              title="الحضور اليوم"
              value={summaryStats.presentToday}
              icon={<UserCheck size={22} aria-hidden="true" />}
              tone="green"
              progress={
                summaryStats.totalStudents
                  ? Math.round(
                      (summaryStats.presentToday /
                        summaryStats.totalStudents) *
                        100,
                    )
                  : 0
              }
            />
            <ExecutiveCard
              title="الغياب اليوم"
              value={summaryStats.absentToday}
              icon={<AlertTriangle size={22} aria-hidden="true" />}
              tone={summaryStats.absentToday > 0 ? "red" : "green"}
            />
            <ExecutiveCard
              title="التأخر اليوم"
              value={summaryStats.lateToday}
              icon={<TrendingUp size={22} aria-hidden="true" />}
              tone={summaryStats.lateToday > 0 ? "gold" : "green"}
            />
            <ExecutiveCard
              title="الإحالات المفتوحة"
              value={summaryStats.openReferrals}
              icon={<ClipboardCheck size={22} aria-hidden="true" />}
              tone={summaryStats.openReferrals > 0 ? "gold" : "green"}
            />
            <ExecutiveCard
              title="تدخلات حرجة"
              value={summaryStats.criticalInterventions}
              icon={<ShieldAlert size={22} aria-hidden="true" />}
              tone={summaryStats.criticalInterventions > 0 ? "red" : "green"}
            />
            <ExecutiveCard
              title="حالات صحية نشطة"
              value={summaryStats.activeHealthCases}
              icon={<HeartPulse size={22} aria-hidden="true" />}
              tone={summaryStats.activeHealthCases > 0 ? "gold" : "green"}
            />
            <ExecutiveCard
              title="طلاب بحاجة متابعة"
              value={summaryStats.urgentStudents}
              icon={<Activity size={22} aria-hidden="true" />}
              tone={summaryStats.urgentStudents > 0 ? "red" : "green"}
            />
          </section>

          <SummaryCard
            title="الملخص التنفيذي للوكيل"
            description="قراءة سريعة لحالة الحضور والإحالات والتدخلات والحالات الصحية والطلاب ذوي الخطورة المرتفعة."
            tone={summaryStats.urgentStudents > 0 ? "gold" : "green"}
            items={[
              { label: "إجمالي الطلاب", value: summaryStats.totalStudents },
              { label: "الحضور اليوم", value: summaryStats.presentToday },
              { label: "الغياب اليوم", value: summaryStats.absentToday },
              { label: "الإحالات المفتوحة", value: summaryStats.openReferrals },
              {
                label: "تدخلات حرجة",
                value: summaryStats.criticalInterventions,
              },
              {
                label: "طلاب بحاجة متابعة",
                value: summaryStats.urgentStudents,
              },
            ]}
            footer="يعتمد مؤشر الخطر على بيانات آخر 30 يومًا من الحضور والسلوك والإحالات والتدخلات والحالات الصحية."
          />

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <DashboardPanel
              title="أحدث الإحالات"
              icon={<ClipboardCheck size={20} aria-hidden="true" />}
            >
              {recentReferrals.length === 0 ? (
                <UiEmptyState title="لا توجد إحالات" description="لا توجد إحالات حديثة." />
              ) : (
                <div className="space-y-2">
                  {recentReferrals.map((item) => {
                    const student = item.student_id
                      ? studentMap.get(item.student_id)
                      : null;

                    return (
                      <MiniRecord
                        key={item.id}
                        title={
                          student?.full_name ||
                          item.student_name ||
                          "طالب غير معروف"
                        }
                        subtitle={item.reason || item.teacher_notes || "إحالة"}
                        badge={item.status || "مفتوحة"}
                        date={item.referred_at || item.created_at}
                      />
                    );
                  })}
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel
              title="أحدث التدخلات"
              icon={<Target size={20} aria-hidden="true" />}
            >
              {recentInterventions.length === 0 ? (
                <UiEmptyState title="لا توجد تدخلات" description="لا توجد تدخلات حديثة." />
              ) : (
                <div className="space-y-2">
                  {recentInterventions.map((item) => {
                    const student = item.student_id
                      ? studentMap.get(item.student_id)
                      : null;

                    return (
                      <MiniRecord
                        key={item.id}
                        title={student?.full_name || "طالب غير معروف"}
                        subtitle={item.title || item.intervention_type || "تدخل"}
                        badge={item.priority || item.status || "متوسط"}
                        date={item.created_at}
                      />
                    );
                  })}
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel
              title="أحدث المخالفات"
              icon={<AlertTriangle size={20} aria-hidden="true" />}
            >
              {recentBehaviors.length === 0 ? (
                <UiEmptyState title="لا توجد مخالفات" description="لا توجد مخالفات حديثة." />
              ) : (
                <div className="space-y-2">
                  {recentBehaviors.map((item) => {
                    const student = item.student_id
                      ? studentMap.get(item.student_id)
                      : null;

                    return (
                      <MiniRecord
                        key={item.id}
                        title={student?.full_name || "طالب غير معروف"}
                        subtitle={item.violation_type || item.notes || "مخالفة"}
                        badge={item.violation_level || item.status || "سلوكي"}
                        date={item.behavior_date || item.created_at}
                      />
                    );
                  })}
                </div>
              )}
            </DashboardPanel>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DashboardPanel
              title="أحدث الحالات الصحية"
              icon={<HeartPulse size={20} aria-hidden="true" />}
            >
              {recentHealthCases.length === 0 ? (
                <UiEmptyState title="لا توجد حالات صحية" description="لا توجد حالات صحية حديثة." />
              ) : (
                <div className="space-y-2">
                  {recentHealthCases.map((item) => {
                    const student = item.student_id
                      ? studentMap.get(item.student_id)
                      : null;

                    return (
                      <MiniRecord
                        key={item.id}
                        title={student?.full_name || "طالب غير معروف"}
                        subtitle={item.case_type || item.diagnosis || "حالة صحية"}
                        badge={item.severity || item.case_status || "نشطة"}
                        date={item.created_at}
                      />
                    );
                  })}
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel
              title="أحدث تواصل مع أولياء الأمور"
              icon={<FileText size={20} aria-hidden="true" />}
            >
              {recentParentCommunications.length === 0 ? (
                <UiEmptyState title="لا توجد سجلات تواصل" description="لا توجد سجلات تواصل حديثة." />
              ) : (
                <div className="space-y-2">
                  {recentParentCommunications.map((item) => {
                    const student = item.student_id
                      ? studentMap.get(item.student_id)
                      : null;

                    return (
                      <MiniRecord
                        key={item.id}
                        title={student?.full_name || "طالب غير معروف"}
                        subtitle={item.topic || item.notes || "تواصل ولي أمر"}
                        badge={item.result || item.communication_method || "تواصل"}
                        date={item.communication_date || item.created_at}
                      />
                    );
                  })}
                </div>
              )}
            </DashboardPanel>
          </section>

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
            <div className="mb-5">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3
                    className="text-[var(--app-primary)]"
                    size={22}
                    aria-hidden="true"
                  />
                  <h2 className="text-2xl font-black text-[var(--app-text)]">
                    مركز متابعة الطلاب حسب مؤشر الخطر
                  </h2>
                </div>
                <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                  يتم احتساب المؤشر من الغياب والتأخر والمخالفات والإحالات
                  والتدخلات عالية الخطورة والحالات الصحية النشطة خلال آخر 30 يومًا.
                </p>
              </div>

              <PageToolbar
                search={{
                  value: search,
                  onChange: setSearch,
                  placeholder: "ابحث عن طالب...",
                }}
                filters={
                  <ToolbarSelect value={riskFilter} onChange={setRiskFilter}>
                    <option value="الكل">كل مستويات الخطر</option>
                    <option value="حرج">حرج</option>
                    <option value="مرتفع">مرتفع</option>
                    <option value="متوسط">متوسط</option>
                    <option value="منخفض">منخفض</option>
                  </ToolbarSelect>
                }
                onRefresh={() => void fetchData()}
                onExportExcel={() => void exportExcel()}
                onExportPDF={exportPDF}
              />
            </div>

            {filteredRiskStudents.length === 0 ? (
              <UiEmptyState
                icon={<ShieldAlert className="h-8 w-8" aria-hidden="true" />}
                title="لا توجد حالات خطورة"
                description="لا توجد حالات مطابقة للبحث أو مستوى الخطر المحدد."
              />
            ) : (
              <div className="space-y-3">
                {filteredRiskStudents.map((item) => (
                  <div
                    key={item.student.id}
                    className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${getRiskStyle(
                              item.riskLevel
                            )}`}
                          >
                            {item.riskLevel}
                          </span>

                          <span className="rounded-full bg-[var(--app-card)] px-3 py-1 text-xs font-black text-[var(--app-text-muted)]">
                            درجة الخطر: {item.riskScore}
                          </span>
                        </div>

                        <h3 className="text-xl font-black text-[var(--app-text)]">
                          {item.student.full_name || "طالب غير معروف"}
                        </h3>

                        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                          الفصل:{" "}
                          {item.student.classroom ||
                            item.student.class_name ||
                            "-"}
                          {item.student.section
                            ? ` - ${item.student.section}`
                            : ""}
                          {item.student.grade_level
                            ? ` | ${item.student.grade_level}`
                            : ""}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-6">
                          <MiniInfo label="غياب" value={item.absenceCount} />
                          <MiniInfo label="تأخر" value={item.lateCount} />
                          <MiniInfo label="مخالفات" value={item.behaviorCount} />
                          <MiniInfo
                            label="إحالات"
                            value={item.openReferralCount}
                          />
                          <MiniInfo
                            label="تدخلات"
                            value={item.highInterventionCount}
                          />
                          <MiniInfo
                            label="صحي"
                            value={item.activeHealthCount}
                          />
                        </div>

                        {item.reasons.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.reasons.map((reason) => (
                              <span
                                key={reason}
                                className="rounded-full bg-[var(--app-card)] px-3 py-1 text-xs font-bold text-[var(--app-text-muted)]"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="mt-3 text-sm text-[var(--app-text-muted)]">
                          ولي الأمر: {item.student.guardian_name || "—"} | الجوال:{" "}
                          {item.student.guardian_phone || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </AppShell>
    </RoleGuard>
  );
}

function DashboardPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] text-[var(--app-text)]">
          {icon}
        </div>
        <h2 className="text-lg font-black text-[var(--app-text)]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function MiniRecord({
  title,
  subtitle,
  badge,
  date,
}: {
  title: string;
  subtitle: string;
  badge: string;
  date?: string | null;
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] px-4 py-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="font-black text-[var(--app-text)]">{title}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${getStatusStyle(badge)}`}>
          {badge}
        </span>
      </div>
      <p className="line-clamp-2 text-sm leading-6 text-[var(--app-text-muted)]">
        {subtitle}
      </p>
      <p className="mt-1 text-xs font-bold text-[var(--app-text-subtle)]">{formatDate(date)}</p>
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
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card)] px-4 py-3 text-sm">
      <p className="mb-1 text-xs font-bold text-[var(--app-text-subtle)]">{label}</p>
      <p className="font-black text-[var(--app-text)]">{value ?? "—"}</p>
    </div>
  );
}



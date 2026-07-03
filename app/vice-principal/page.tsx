"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
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
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  HeartPulse,
  Loader2,
  RefreshCcw,
  Search,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
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
  if (level === "حرج") return "bg-red-100 text-red-800";
  if (level === "مرتفع") return "bg-orange-50 text-orange-700";
  if (level === "متوسط") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function getStatusStyle(status?: string | null) {
  const value = String(status || "");

  if (!isOpenStatus(value)) return "bg-emerald-50 text-emerald-700";
  if (value.includes("بانتظار")) return "bg-amber-50 text-amber-700";
  if (value.includes("حرج") || value.includes("مرتفع")) {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
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
  }

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

  const highRiskInterventions = interventions.filter((item) =>
    ["مرتفع", "حرج"].includes(String(item.priority || ""))
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

  function getExportHeaders() {
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
          <LoadingBox />
        </AppShell>
      </RoleGuard>
    );
  }
    return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <div className="space-y-5" dir="rtl">
          {toast && <ToastBox toast={toast} />}

          <section className="rounded-[30px] bg-[#0f1f3d] p-6 text-white shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-sm font-bold text-[#d4af37]">
                  منصة المدرسة الذكية
                </p>
                <h1 className="text-4xl font-black">لوحة الوكيل التنفيذية</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                  متابعة فورية للحضور والغياب، الإحالات، التدخلات، المخالفات،
                  والحالات الصحية مع مؤشر خطر موحد للطلاب المحتاجين للمتابعة.
                </p>
              </div>

              <div className="flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => void fetchData()}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#d4af37] px-5 text-sm font-black text-[#0f1f3d]"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>

                <button
                  onClick={() => void exportExcel()}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 text-sm font-black text-white"
                >
                  <Download size={17} />
                  Excel
                </button>

                <button
                  onClick={exportPDF}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-[#0f1f3d]"
                >
                  <FileText size={17} />
                  PDF
                </button>
              </div>
            </div>
          </section>

          {errorMsg && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
              {errorMsg}
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="إجمالي الطلاب"
              value={summaryStats.totalStudents}
              icon={<Users size={22} />}
              color="blue"
            />
            <StatCard
              title="الحضور اليوم"
              value={summaryStats.presentToday}
              icon={<UserCheck size={22} />}
              color="emerald"
            />
            <StatCard
              title="الغياب اليوم"
              value={summaryStats.absentToday}
              icon={<AlertTriangle size={22} />}
              color="red"
            />
            <StatCard
              title="التأخر اليوم"
              value={summaryStats.lateToday}
              icon={<TrendingUp size={22} />}
              color="amber"
            />
            <StatCard
              title="الإحالات المفتوحة"
              value={summaryStats.openReferrals}
              icon={<ClipboardCheck size={22} />}
              color="blue"
            />
            <StatCard
              title="تدخلات حرجة"
              value={summaryStats.criticalInterventions}
              icon={<ShieldAlert size={22} />}
              color="red"
            />
            <StatCard
              title="حالات صحية نشطة"
              value={summaryStats.activeHealthCases}
              icon={<HeartPulse size={22} />}
              color="amber"
            />
            <StatCard
              title="طلاب بحاجة متابعة"
              value={summaryStats.urgentStudents}
              icon={<Activity size={22} />}
              color="red"
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <DashboardPanel
              title="أحدث الإحالات"
              icon={<ClipboardCheck size={20} />}
            >
              {recentReferrals.length === 0 ? (
                <EmptySmall text="لا توجد إحالات." />
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
              icon={<Target size={20} />}
            >
              {recentInterventions.length === 0 ? (
                <EmptySmall text="لا توجد تدخلات." />
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
              icon={<AlertTriangle size={20} />}
            >
              {recentBehaviors.length === 0 ? (
                <EmptySmall text="لا توجد مخالفات." />
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
              icon={<HeartPulse size={20} />}
            >
              {recentHealthCases.length === 0 ? (
                <EmptySmall text="لا توجد حالات صحية." />
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
              icon={<FileText size={20} />}
            >
              {recentParentCommunications.length === 0 ? (
                <EmptySmall text="لا توجد سجلات تواصل." />
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

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-[#0f1f3d]" size={22} />
                  <h2 className="text-2xl font-black text-[#0f1f3d]">
                    مركز متابعة الطلاب حسب مؤشر الخطر
                  </h2>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  يتم احتساب المؤشر من الغياب، التأخر، المخالفات، الإحالات،
                  التدخلات عالية الخطورة، والحالات الصحية النشطة خلال آخر 30 يومًا.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#d4af37]"
                >
                  <option value="الكل">كل مستويات الخطر</option>
                  <option value="حرج">حرج</option>
                  <option value="مرتفع">مرتفع</option>
                  <option value="متوسط">متوسط</option>
                  <option value="منخفض">منخفض</option>
                </select>

                <div className="relative">
                  <Search
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="بحث عن طالب..."
                    className="w-full rounded-2xl border border-slate-200 py-3 pr-10 pl-4 text-sm outline-none focus:border-[#d4af37] lg:w-72"
                  />
                </div>
              </div>
            </div>

            {filteredRiskStudents.length === 0 ? (
              <EmptyBox text="لا توجد حالات خطورة حسب الفلاتر الحالية." />
            ) : (
              <div className="space-y-3">
                {filteredRiskStudents.map((item) => (
                  <div
                    key={item.student.id}
                    className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
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

                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                            درجة الخطر: {item.riskScore}
                          </span>
                        </div>

                        <h3 className="text-xl font-black text-[#0f1f3d]">
                          {item.student.full_name || "طالب غير معروف"}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
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
                                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="mt-3 text-sm text-slate-500">
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
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${colors[color]}`}
      >
        {icon}
      </div>
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-4xl font-black text-[#0f1f3d]">{value}</h2>
    </div>
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-[#0f1f3d]">
          {icon}
        </div>
        <h2 className="text-lg font-black text-[#0f1f3d]">{title}</h2>
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
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="font-black text-[#0f1f3d]">{title}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${getStatusStyle(badge)}`}>
          {badge}
        </span>
      </div>
      <p className="line-clamp-2 text-sm leading-6 text-slate-600">
        {subtitle}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-400">{formatDate(date)}</p>
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
      <p className="font-black text-slate-700">{value ?? "—"}</p>
    </div>
  );
}

function EmptySmall({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
      {text}
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
      className={`fixed left-5 top-5 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-xl ${
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
        جاري تحميل لوحة الوكيل التنفيذية...
      </div>
    </div>
  );
}

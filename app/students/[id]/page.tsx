"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

import { STAFF_ROLES } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  HeartPulse,
  Loader2,
  MessageCircle,
  Phone,
  Printer,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";

type StudentRow = {
  id: string;
  school_id: string | null;
  student_number?: string | null;
  national_id?: string | null;
  full_name: string;
  gender?: string | null;
  birth_date?: string | null;
  stage_id?: string | null;
  grade_id?: string | null;
  classroom_id?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type StudentProfile = StudentRow & {
  stage_name?: string | null;
  grade_name?: string | null;
  classroom_name?: string | null;
};

type AttendanceRow = {
  id?: string;
  school_id?: string | null;
  student_id: string;
  attendance_date?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type BehaviorRow = {
  id: string;
  school_id?: string | null;
  student_id: string;
  behavior_date?: string | null;
  violation_type?: string | null;
  violation_level?: string | null;
  action_taken?: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type HealthVisitRow = {
  id: string;
  school_id?: string | null;
  student_id: string;
  visit_date?: string | null;
  symptoms?: string | null;
  diagnosis?: string | null;
  temperature?: string | number | null;
  blood_pressure?: string | null;
  treatment?: string | null;
  visit_status?: string | null;
  created_at?: string | null;
};

type CommunicationRow = {
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

type ReferralRow = {
  id: string;
  school_id?: string | null;
  student_id: string;
  reason?: string | null;
  status?: string | null;
  teacher_notes?: string | null;
  created_at?: string | null;
};

type InterventionRow = {
  id: string;
  school_id?: string | null;
  student_id: string;
  title?: string | null;
  intervention_type?: string | null;
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
};

type GradeRow = {
  id: string;
  school_id?: string | null;
  student_id: string;
  score?: number | null;
  total_score?: number | null;
  max_score?: number | null;
  percentage?: number | null;
  subject_name?: string | null;
  created_at?: string | null;
};

type TimelineEvent = {
  id: string;
  title: string;
  subtitle: string;
  date?: string | null;
  icon: ElementType;
  tone: "blue" | "green" | "gold" | "red" | "teal" | "slate";
};

type LookupRow = {
  id: string;
  stage_name?: string | null;
  grade_name?: string | null;
  classroom_name?: string | null;
};

type RiskLevel = "low" | "medium" | "high";

type Toast = {
  type: "success" | "error";
  message: string;
};

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  tone: "blue" | "green" | "gold" | "red" | "teal" | "slate";
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value || "—";
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value || "—";
  }
}

function normalizeStatus(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function isAbsentStatus(value?: string | null) {
  return ["غائب", "absent", "غياب"].includes(normalizeStatus(value));
}

function isLateStatus(value?: string | null) {
  return ["متأخر", "late", "تأخر", "تاخر"].includes(normalizeStatus(value));
}

function isPresentStatus(value?: string | null) {
  return ["حاضر", "present", "حضور"].includes(normalizeStatus(value));
}

function getRiskLabel(level: RiskLevel) {
  if (level === "high") return "مرتفع";
  if (level === "medium") return "متوسط";
  return "منخفض";
}

function getRiskTone(level: RiskLevel) {
  if (level === "high") return "red";
  if (level === "medium") return "gold";
  return "green";
}

function getRiskIcon(level: RiskLevel) {
  if (level === "high") return <ShieldAlert size={22} />;
  if (level === "medium") return <AlertCircle size={22} />;
  return <CheckCircle2 size={22} />;
}

function getInitials(name?: string | null) {
  const parts = String(name || "").trim().split(" ").filter(Boolean);
  if (!parts.length) return "ط";
  return parts.slice(0, 2).map((part) => part[0]).join("");
}

function cleanJoin(values: Array<string | null | undefined>) {
  return values.filter((value) => value && String(value).trim() !== "" && String(value).trim() !== "—").join(" • ") || "لم يتم تحديد الصف والفصل";
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").trim();
}

function getStudentStatusLabel(status?: string | null) {
  if (status === "inactive" || status === "غير نشط") return "غير نشط";
  return "نشط";
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function pickNumber(row: any, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    const numberValue = Number(value);
    if (value !== null && value !== undefined && value !== "" && Number.isFinite(numberValue)) {
      return numberValue;
    }
  }
  return null;
}

function gradePercentage(row: GradeRow) {
  const direct = pickNumber(row, ["percentage"]);
  if (direct !== null) return direct;

  const total = pickNumber(row, ["total_score", "score"]);
  const max = pickNumber(row, ["max_score"]) || 100;

  if (total !== null && max > 0) return Math.round((total / max) * 100);
  return null;
}

async function loadLookupName(
  tableName: "stages" | "grades" | "classrooms",
  id: string | null | undefined,
  nameColumn: "stage_name" | "grade_name" | "classroom_name",
) {
  if (!id) return null;

  const { data, error } = await supabase
    .from(tableName)
    .select(`id, ${nameColumn}`)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return ((data as LookupRow)[nameColumn] as string | null) ?? null;
}

async function tryQuery<T>(promise: PromiseLike<{ data: T[] | null; error: any }>) {
  try {
    const result = await promise;
    if (result.error) return [];
    return (result.data || []) as T[];
  } catch {
    return [];
  }
}

export default function StudentSmartProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { currentSchool, loading: schoolLoading } = useSchool();

  const studentId = String(params?.id || "");

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [behaviorRows, setBehaviorRows] = useState<BehaviorRow[]>([]);
  const [healthRows, setHealthRows] = useState<HealthVisitRow[]>([]);
  const [communicationRows, setCommunicationRows] = useState<CommunicationRow[]>([]);
  const [referralRows, setReferralRows] = useState<ReferralRow[]>([]);
  const [interventionRows, setInterventionRows] = useState<InterventionRow[]>([]);
  const [gradeRows, setGradeRows] = useState<GradeRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchStudentProfile = useCallback(async () => {
    if (!currentSchool?.id || !studentId) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, school_id, student_number, national_id, full_name, gender, birth_date, stage_id, grade_id, classroom_id, guardian_name, guardian_phone, guardian_email, status, created_at")
        .eq("school_id", currentSchool.id)
        .eq("id", studentId)
        .maybeSingle();

      if (studentError) throw studentError;

      if (!studentData) {
        setStudent(null);
        setErrorMsg("لم يتم العثور على الطالب.");
        return;
      }

      const baseStudent = studentData as StudentRow;

      const [stageName, gradeName, classroomName] = await Promise.all([
        loadLookupName("stages", baseStudent.stage_id, "stage_name"),
        loadLookupName("grades", baseStudent.grade_id, "grade_name"),
        loadLookupName("classrooms", baseStudent.classroom_id, "classroom_name"),
      ]);

      const [
        attendance,
        behavior,
        health,
        communications,
        referrals,
        interventions,
        gradesA,
        gradesB,
      ] = await Promise.all([
        tryQuery<AttendanceRow>(
          supabase
            .from("student_attendance")
            .select("id, school_id, student_id, attendance_date, status, created_at")
            .eq("school_id", currentSchool.id)
            .eq("student_id", studentId)
            .order("attendance_date", { ascending: false }),
        ),
        tryQuery<BehaviorRow>(
          supabase
            .from("student_behavior")
            .select("*")
            .eq("school_id", currentSchool.id)
            .eq("student_id", studentId)
            .order("behavior_date", { ascending: false }),
        ),
        tryQuery<HealthVisitRow>(
          supabase
            .from("health_visits")
            .select("*")
            .eq("school_id", currentSchool.id)
            .eq("student_id", studentId)
            .order("visit_date", { ascending: false }),
        ),
        tryQuery<CommunicationRow>(
          supabase
            .from("parent_communications")
            .select("*")
            .eq("student_id", studentId)
            .order("communication_date", { ascending: false }),
        ),
        tryQuery<ReferralRow>(
          supabase
            .from("student_referrals")
            .select("*")
            .eq("school_id", currentSchool.id)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false }),
        ),
        tryQuery<InterventionRow>(
          supabase
            .from("student_interventions")
            .select("*")
            .eq("school_id", currentSchool.id)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false }),
        ),
        tryQuery<GradeRow>(
          supabase
            .from("student_grades")
            .select("*")
            .eq("school_id", currentSchool.id)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false }),
        ),
        tryQuery<GradeRow>(
          supabase
            .from("student_period_scores")
            .select("*")
            .eq("school_id", currentSchool.id)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false }),
        ),
      ]);

      setStudent({
        ...baseStudent,
        stage_name: stageName,
        grade_name: gradeName,
        classroom_name: classroomName,
      });

      setAttendanceRows(attendance);
      setBehaviorRows(behavior);
      setHealthRows(health);
      setCommunicationRows(
        communications.filter((row) => !baseStudent.school_id || !row.school_id || row.school_id === baseStudent.school_id),
      );
      setReferralRows(referrals);
      setInterventionRows(interventions);
      setGradeRows([...gradesA, ...gradesB]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل ملف الطالب.";
      setErrorMsg(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, studentId, showToast]);

  useEffect(() => {
    if (!schoolLoading && currentSchool?.id && studentId) void fetchStudentProfile();
  }, [schoolLoading, currentSchool?.id, studentId, fetchStudentProfile]);

  const attendanceStats = useMemo(() => {
    const total = attendanceRows.length;
    const present = attendanceRows.filter((row) => isPresentStatus(row.status)).length;
    const absent = attendanceRows.filter((row) => isAbsentStatus(row.status)).length;
    const late = attendanceRows.filter((row) => isLateStatus(row.status)).length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, late, attendanceRate };
  }, [attendanceRows]);

  const scoreStats = useMemo(() => {
    const percentages = gradeRows
      .map((row) => gradePercentage(row))
      .filter((value): value is number => value !== null && Number.isFinite(value));

    const count = percentages.length;
    const average = count ? Math.round(percentages.reduce((sum, item) => sum + item, 0) / count) : 0;
    const highest = count ? Math.max(...percentages) : 0;
    const lowest = count ? Math.min(...percentages) : 0;
    const risk = percentages.filter((value) => value < 60).length;

    return { average, highest, lowest, count, risk };
  }, [gradeRows]);

  const riskLevel = useMemo<RiskLevel>(() => {
    let score = 0;

    if (attendanceStats.absent >= 10) score += 3;
    else if (attendanceStats.absent >= 5) score += 2;
    else if (attendanceStats.absent >= 3) score += 1;

    if (attendanceStats.late >= 8) score += 2;
    else if (attendanceStats.late >= 4) score += 1;

    if (behaviorRows.length >= 5) score += 3;
    else if (behaviorRows.length >= 3) score += 2;
    else if (behaviorRows.length >= 1) score += 1;

    if (scoreStats.count > 0 && scoreStats.average < 60) score += 3;
    else if (scoreStats.count > 0 && scoreStats.average < 70) score += 1;

    if (score >= 5) return "high";
    if (score >= 3) return "medium";
    return "low";
  }, [attendanceStats.absent, attendanceStats.late, behaviorRows.length, scoreStats.average, scoreStats.count]);

  const academicLevel = useMemo(() => {
    if (scoreStats.count === 0) return "لا توجد درجات";
    if (scoreStats.average >= 90) return "متفوق";
    if (scoreStats.average >= 80) return "جيد جدًا";
    if (scoreStats.average >= 70) return "جيد";
    if (scoreStats.average >= 60) return "مقبول";
    return "يحتاج متابعة";
  }, [scoreStats.average, scoreStats.count]);

  const alerts = useMemo(() => {
    const items: string[] = [];

    if (attendanceStats.absent >= 5) items.push(`الطالب لديه ${attendanceStats.absent} أيام غياب.`);
    if (attendanceStats.late >= 4) items.push(`الطالب لديه ${attendanceStats.late} حالات تأخر.`);
    if (behaviorRows.length >= 3) items.push(`يوجد ${behaviorRows.length} مخالفات سلوكية.`);
    if (scoreStats.count > 0 && scoreStats.average < 60) items.push("متوسط الدرجات أقل من 60% ويحتاج متابعة أكاديمية.");

    return items;
  }, [attendanceStats.absent, attendanceStats.late, behaviorRows.length, scoreStats.average, scoreStats.count]);

  const latestAttendance = attendanceRows[0];
  const latestBehavior = behaviorRows[0];
  const latestHealthVisit = healthRows[0];
  const latestCommunication = communicationRows[0];

  const quickActions: QuickAction[] = useMemo(() => {
    if (!student) return [];

    return [
      { title: "السجل الزمني", description: "عرض كل أحداث الطالب المجمعة.", href: `/students/${student.id}/timeline`, icon: Activity, tone: "blue" },
      { title: "التواصل", description: "سجل التواصل مع ولي الأمر.", href: `/students/${student.id}/communications`, icon: MessageCircle, tone: "teal" },
      { title: "الدرجات", description: "درجات الطالب وتفاصيل الأداء.", href: `/student-portal/grades?student_id=${student.id}`, icon: BarChart3, tone: "blue" },
      { title: "الحضور", description: "الحضور والغياب والتأخر.", href: `/student-portal/attendance?student_id=${student.id}`, icon: CalendarDays, tone: "green" },
      { title: "الإحالات", description: "الإحالات الطلابية المرتبطة.", href: `/student-referrals?student_id=${student.id}`, icon: ClipboardList, tone: "gold" },
      { title: "التدخلات", description: "خطط التدخل والمتابعة.", href: `/student-interventions?student_id=${student.id}`, icon: Sparkles, tone: "gold" },
      { title: "الصحة", description: "السجل الصحي والزيارات.", href: `/health?student_id=${student.id}`, icon: HeartPulse, tone: "red" },
      { title: "ملف الإنجاز", description: "إنجازات الطالب وشهاداته.", href: `/student-portfolio?student_id=${student.id}`, icon: Award, tone: "slate" },
    ];
  }, [student]);

  const timelinePreview: TimelineEvent[] = useMemo(() => {
    const rows: TimelineEvent[] = [];

    attendanceRows.slice(0, 3).forEach((item) => {
      rows.push({
        id: `attendance-${item.id}`,
        title: `سجل حضور: ${item.status || "غير محدد"}`,
        subtitle: formatDate(item.attendance_date),
        date: item.attendance_date,
        icon: CalendarDays,
        tone: isAbsentStatus(item.status) ? "red" : isLateStatus(item.status) ? "gold" : "green",
      });
    });

    behaviorRows.slice(0, 3).forEach((item) => {
      rows.push({
        id: `behavior-${item.id}`,
        title: item.violation_type || "سجل سلوكي",
        subtitle: item.notes || item.action_taken || "—",
        date: item.behavior_date || item.created_at,
        icon: ShieldAlert,
        tone: "gold",
      });
    });

    healthRows.slice(0, 2).forEach((item) => {
      rows.push({
        id: `health-${item.id}`,
        title: item.symptoms || item.diagnosis || "زيارة صحية",
        subtitle: item.treatment || "الصحة المدرسية",
        date: item.visit_date || item.created_at,
        icon: HeartPulse,
        tone: "red",
      });
    });

    communicationRows.slice(0, 2).forEach((item) => {
      rows.push({
        id: `communication-${item.id}`,
        title: item.topic || "تواصل مع ولي الأمر",
        subtitle: item.result || item.communication_method || "—",
        date: item.communication_date || item.created_at,
        icon: MessageCircle,
        tone: "teal",
      });
    });

    return rows.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 8);
  }, [attendanceRows, behaviorRows, healthRows, communicationRows]);

  const exportRows = useMemo(() => {
    if (!student) return [];

    return [
      { المؤشر: "اسم الطالب", القيمة: student.full_name },
      { المؤشر: "رقم الطالب", القيمة: student.student_number || "—" },
      { المؤشر: "رقم الهوية", القيمة: student.national_id || "—" },
      { المؤشر: "المرحلة", القيمة: student.stage_name || "—" },
      { المؤشر: "الصف", القيمة: student.grade_name || "—" },
      { المؤشر: "الفصل", القيمة: student.classroom_name || "—" },
      { المؤشر: "ولي الأمر", القيمة: student.guardian_name || "—" },
      { المؤشر: "جوال ولي الأمر", القيمة: student.guardian_phone || "—" },
      { المؤشر: "بريد ولي الأمر", القيمة: student.guardian_email || "—" },
      { المؤشر: "نسبة الحضور", القيمة: attendanceStats.total > 0 ? `${attendanceStats.attendanceRate}%` : "لا توجد سجلات" },
      { المؤشر: "عدد الغياب", القيمة: attendanceStats.absent },
      { المؤشر: "عدد التأخير", القيمة: attendanceStats.late },
      { المؤشر: "عدد المخالفات", القيمة: behaviorRows.length },
      { المؤشر: "عدد الزيارات الصحية", القيمة: healthRows.length },
      { المؤشر: "عدد الإحالات", القيمة: referralRows.length },
      { المؤشر: "عدد التدخلات", القيمة: interventionRows.length },
      { المؤشر: "متوسط الدرجات", القيمة: scoreStats.count > 0 ? `${scoreStats.average}%` : "لا توجد درجات" },
      { المؤشر: "المستوى الأكاديمي", القيمة: academicLevel },
      { المؤشر: "مؤشر الخطر", القيمة: getRiskLabel(riskLevel) },
    ];
  }, [student, attendanceStats, behaviorRows.length, healthRows.length, referralRows.length, interventionRows.length, scoreStats, academicLevel, riskLevel]);

  function exportStudentPDF() {
    if (!student) return;

    exportTableToPDF({
      title: "ملف الطالب الذكي",
      fileName: `${safeFileName(`student-${student.full_name}`)}.pdf`,
      rows: exportRows,
    } as any);

    showToast("success", "تم تجهيز ملف PDF");
  }

  async function exportStudentExcel() {
    if (!student) return;

    await exportTableToExcel({
      fileName: `${safeFileName(`student-${student.full_name}`)}.xlsx`,
      sheetName: "Student Profile",
      rows: exportRows,
    } as any);

    showToast("success", "تم تصدير ملف Excel");
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <LoadingBox text="جاري تحميل ملف الطالب..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!student || errorMsg) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <div className="rounded-[28px] border border-red-100 bg-red-50 p-6 text-center font-bold text-red-700">
            {errorMsg || "تعذر العثور على الطالب"}
          </div>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AppShell>
        <main dir="rtl" className="space-y-5">
          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title={student.full_name}
            description="ملف الطالب الذكي 360° يجمع الحضور والسلوك والصحة والتواصل والدرجات والمؤشرات التنفيذية في صفحة واحدة."
            badge="ملف الطالب"
            icon={<User size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الطلاب", href: "/students" },
              { label: student.full_name },
            ]}
            meta={[
              { label: "رقم الطالب", value: student.student_number || "—" },
              { label: "الهوية", value: student.national_id || "—" },
              { label: "الصف والفصل", value: cleanJoin([student.stage_name, student.grade_name, student.classroom_name]) },
              { label: "الحالة", value: getStudentStatusLabel(student.status) },
            ]}
            stats={[
              { label: "نسبة الحضور", value: attendanceStats.total > 0 ? `${attendanceStats.attendanceRate}%` : "—", icon: <CalendarDays size={20} />, tone: attendanceStats.attendanceRate >= 85 ? "green" : "gold" },
              { label: "متوسط الدرجات", value: scoreStats.count > 0 ? `${scoreStats.average}%` : "—", icon: <BarChart3 size={20} />, tone: scoreStats.count > 0 && scoreStats.average >= 80 ? "green" : "gold" },
              { label: "السلوك", value: behaviorRows.length, icon: <ShieldAlert size={20} />, tone: behaviorRows.length > 0 ? "red" : "green" },
              { label: "مؤشر الخطر", value: getRiskLabel(riskLevel), icon: getRiskIcon(riskLevel), tone: getRiskTone(riskLevel) as any },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ArrowRight size={17} />
                  رجوع
                </button>

                <button
                  type="button"
                  onClick={exportStudentPDF}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <FileText size={17} />
                  PDF
                </button>

                <button
                  type="button"
                  onClick={() => void exportStudentExcel()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <FileSpreadsheet size={17} />
                  Excel
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Printer size={17} />
                  طباعة
                </button>

                <button
                  type="button"
                  onClick={() => void fetchStudentProfile()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>
              </>
            }
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-[#15445A] text-3xl font-black text-[#C1B489]">
                {getInitials(student.full_name)}
              </div>

              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <MiniBadge tone={student.status === "inactive" ? "red" : "green"}>{getStudentStatusLabel(student.status)}</MiniBadge>
                  <MiniBadge tone={riskLevel === "high" ? "red" : riskLevel === "medium" ? "gold" : "green"}>خطر {getRiskLabel(riskLevel)}</MiniBadge>
                  <MiniBadge tone="blue">{academicLevel}</MiniBadge>
                </div>

                <h2 className="text-2xl font-black text-[#15445A]">{student.full_name}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  {cleanJoin([student.stage_name, student.grade_name, student.classroom_name])}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                  <span className="rounded-full bg-slate-50 px-3 py-1">ولي الأمر: {student.guardian_name || "—"}</span>
                  <span className="rounded-full bg-slate-50 px-3 py-1">الجوال: {student.guardian_phone || "—"}</span>
                  <span className="rounded-full bg-slate-50 px-3 py-1">المدرسة: {currentSchool?.school_name || "—"}</span>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-400">مؤشر الخطر</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className={`rounded-2xl p-3 ${riskLevel === "high" ? "bg-red-50 text-red-700" : riskLevel === "medium" ? "bg-[#C1B489]/20 text-[#15445A]" : "bg-[#07A869]/10 text-[#07A869]"}`}>
                    {getRiskIcon(riskLevel)}
                  </div>
                  <div>
                    <p className="text-2xl font-black text-[#15445A]">{getRiskLabel(riskLevel)}</p>
                    <p className="text-xs font-bold text-slate-500">حسب الغياب والسلوك والدرجات</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {alerts.length > 0 && (
            <section className="rounded-[28px] border border-[#C1B489]/40 bg-[#C1B489]/20 p-5">
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle className="text-[#15445A]" size={20} />
                <h3 className="font-black text-[#15445A]">تنبيهات ذكية</h3>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {alerts.map((alert, index) => (
                  <div key={index} className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700">
                    ⚠️ {alert}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <ExecutiveCard title="نسبة الحضور" value={attendanceStats.total > 0 ? `${attendanceStats.attendanceRate}%` : "—"} icon={<CalendarDays size={22} />} tone={attendanceStats.attendanceRate >= 85 ? "green" : "gold"} subtitle={`${attendanceStats.present} حضور من ${attendanceStats.total}`} progress={attendanceStats.attendanceRate} />
            <ExecutiveCard title="الغياب" value={attendanceStats.absent} icon={<TrendingDown size={22} />} tone={attendanceStats.absent > 0 ? "red" : "green"} subtitle={`${attendanceStats.late} تأخر`} progress={percentage(attendanceStats.absent, attendanceStats.total)} />
            <ExecutiveCard title="متوسط الدرجات" value={scoreStats.count > 0 ? `${scoreStats.average}%` : "—"} icon={<TrendingUp size={22} />} tone={scoreStats.count > 0 && scoreStats.average >= 80 ? "green" : "gold"} subtitle={academicLevel} progress={scoreStats.average} />
            <ExecutiveCard title="السلوك" value={behaviorRows.length} icon={<ShieldAlert size={22} />} tone={behaviorRows.length > 0 ? "red" : "green"} subtitle="سجلات سلوكية" progress={behaviorRows.length ? Math.min(100, behaviorRows.length * 20) : 0} />
            <ExecutiveCard title="الصحة" value={healthRows.length} icon={<HeartPulse size={22} />} tone={healthRows.length > 0 ? "gold" : "green"} subtitle="زيارات صحية" progress={healthRows.length ? Math.min(100, healthRows.length * 20) : 0} />
            <ExecutiveCard title="التواصل" value={communicationRows.length} icon={<MessageCircle size={22} />} tone="teal" subtitle="سجلات ولي الأمر" progress={communicationRows.length ? 100 : 0} />
          </section>

          <SummaryCard
            title="ملخص ملف الطالب"
            description="قراءة تنفيذية لحالة الطالب في الحضور والسلوك والصحة والتواصل والدرجات."
            tone={riskLevel === "high" ? "red" : riskLevel === "medium" ? "gold" : "green"}
            items={[
              { label: "الحضور", value: attendanceStats.total > 0 ? `${attendanceStats.attendanceRate}%` : "—" },
              { label: "الغياب", value: attendanceStats.absent },
              { label: "التأخر", value: attendanceStats.late },
              { label: "متوسط الدرجات", value: scoreStats.count > 0 ? `${scoreStats.average}%` : "—" },
              { label: "السلوك", value: behaviorRows.length },
              { label: "مؤشر الخطر", value: getRiskLabel(riskLevel) },
            ]}
            footer="يعتمد مؤشر الخطر على الغياب والتأخر والسلوك ومتوسط الدرجات عند توفرها."
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm print:hidden">
            <PageToolbar
              search={{
                value: "",
                onChange: () => undefined,
                placeholder: "استخدم الإجراءات السريعة لفتح أقسام الطالب التفصيلية...",
              }}
              onRefresh={() => void fetchStudentProfile()}
              onExportPDF={exportStudentPDF}
              onExportExcel={() => void exportStudentExcel()}
              actions={
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A]"
                >
                  <Printer size={17} />
                  طباعة
                </button>
              }
            />
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="text-[#15445A]" size={22} />
              <h2 className="text-xl font-black text-[#15445A]">الإجراءات السريعة</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => (
                <QuickActionCard key={action.href} action={action} />
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Panel title="ولي الأمر" icon={<Users size={24} />}>
              <div className="space-y-3">
                <InfoRow label="اسم ولي الأمر" value={student.guardian_name || "—"} />
                <InfoRow label="الجوال" value={student.guardian_phone || "—"} />
                <InfoRow label="البريد" value={student.guardian_email || "—"} />
                <InfoRow label="آخر تواصل" value={formatDate(latestCommunication?.communication_date || latestCommunication?.created_at)} />
              </div>
            </Panel>

            <Panel title="بيانات الطالب" icon={<User size={24} />}>
              <div className="space-y-3">
                <InfoRow label="الاسم" value={student.full_name} />
                <InfoRow label="رقم الطالب" value={student.student_number || "—"} />
                <InfoRow label="الهوية" value={student.national_id || "—"} />
                <InfoRow label="الجنس" value={student.gender || "—"} />
                <InfoRow label="تاريخ الميلاد" value={formatDate(student.birth_date)} />
                <InfoRow label="الحالة" value={getStudentStatusLabel(student.status)} />
              </div>
            </Panel>

            <Panel title="الصف والفصل" icon={<Users size={24} />}>
              <div className="space-y-3">
                <InfoRow label="المرحلة" value={student.stage_name || "—"} />
                <InfoRow label="الصف" value={student.grade_name || "—"} />
                <InfoRow label="الفصل" value={student.classroom_name || "—"} />
                <InfoRow label="تاريخ الإضافة" value={formatDate(student.created_at)} />
              </div>
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Panel title="الحضور والانضباط" icon={<CalendarDays size={24} />}>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="إجمالي السجلات" value={attendanceStats.total} />
                <InfoRow label="الحضور" value={attendanceStats.present} />
                <InfoRow label="الغياب" value={attendanceStats.absent} />
                <InfoRow label="التأخير" value={attendanceStats.late} />
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between text-sm font-bold">
                  <span className="text-slate-500">نسبة الحضور</span>
                  <span className="text-[#15445A]">{attendanceStats.total > 0 ? `${attendanceStats.attendanceRate}%` : "لا توجد سجلات"}</span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      attendanceStats.attendanceRate >= 90 ? "bg-[#07A869]" : attendanceStats.attendanceRate >= 75 ? "bg-[#C1B489]" : "bg-red-600"
                    }`}
                    style={{ width: `${attendanceStats.attendanceRate}%` }}
                  />
                </div>
              </div>
            </Panel>

            <Panel title="الدرجات" icon={<BarChart3 size={24} />}>
              {scoreStats.count === 0 ? (
                <EmptyBox text="لا توجد درجات مرتبطة بالطالب حاليًا." />
              ) : (
                <div className="space-y-3">
                  <InfoRow label="عدد السجلات" value={scoreStats.count} />
                  <InfoRow label="المتوسط" value={`${scoreStats.average}%`} />
                  <InfoRow label="أعلى نتيجة" value={`${scoreStats.highest}%`} />
                  <InfoRow label="أقل نتيجة" value={`${scoreStats.lowest}%`} />
                </div>
              )}
            </Panel>

            <Panel title="مؤشر الخطر الذكي" icon={<Sparkles size={24} />}>
              <div className={`rounded-2xl border p-4 ${riskLevel === "high" ? "border-red-200 bg-red-50 text-red-700" : riskLevel === "medium" ? "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]" : "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]"}`}>
                <div className="flex items-center gap-3">
                  {getRiskIcon(riskLevel)}
                  <div>
                    <p className="text-sm font-bold opacity-80">مستوى الخطر</p>
                    <h3 className="text-2xl font-black">{getRiskLabel(riskLevel)}</h3>
                    <p className="mt-2 text-sm font-bold">المستوى الأكاديمي: {academicLevel}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
                {attendanceStats.absent >= 3 && <p>• يوجد غياب متكرر يحتاج متابعة.</p>}
                {attendanceStats.late >= 4 && <p>• يوجد تأخر متكرر يحتاج متابعة.</p>}
                {behaviorRows.length > 0 && <p>• توجد ملاحظات أو مخالفات سلوكية مسجلة.</p>}
                {scoreStats.count > 0 && scoreStats.average < 70 && <p>• المستوى الأكاديمي يحتاج دعمًا إضافيًا.</p>}
                {riskLevel === "low" && <p>• وضع الطالب مستقر حسب البيانات الحالية.</p>}
              </div>
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel title="السلوك" icon={<ShieldAlert size={24} />} action={<MiniBadge tone={behaviorRows.length > 0 ? "gold" : "green"}>{behaviorRows.length} سجل</MiniBadge>}>
              {behaviorRows.length === 0 ? (
                <EmptyBox text="لا توجد مخالفات أو سجلات سلوكية." />
              ) : (
                <div className="space-y-3">
                  {behaviorRows.slice(0, 6).map((item) => (
                    <SmallListCard key={item.id} title={item.violation_type || "سجل سلوكي"} subtitle={item.notes || item.action_taken || "—"} meta={item.violation_level || item.status || formatDate(item.behavior_date)} tone="gold" />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="الصحة المدرسية" icon={<HeartPulse size={24} />} action={<MiniBadge tone={healthRows.length > 0 ? "red" : "green"}>{healthRows.length} زيارة</MiniBadge>}>
              {healthRows.length === 0 ? (
                <EmptyBox text="لا توجد زيارات صحية مسجلة." />
              ) : (
                <div className="space-y-3">
                  {healthRows.slice(0, 6).map((item) => (
                    <SmallListCard
                      key={item.id}
                      title={item.symptoms || item.diagnosis || "زيارة صحية"}
                      subtitle={item.treatment || `الحرارة: ${item.temperature || "—"} — الضغط: ${item.blood_pressure || "—"}`}
                      meta={item.visit_status || formatDate(item.visit_date)}
                      tone="red"
                    />
                  ))}
                </div>
              )}
            </Panel>
          </section>

          <Panel title="آخر الأحداث" icon={<Activity size={24} />} action={<Link href={`/students/${student.id}/timeline`} className="rounded-2xl bg-[#15445A] px-4 py-2 text-sm font-black text-white">فتح السجل الزمني</Link>}>
            {timelinePreview.length === 0 ? (
              <EmptyBox text="لا توجد أحداث حديثة للطالب." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {timelinePreview.map((event) => (
                  <SmallListCard key={event.id} title={event.title} subtitle={event.subtitle} meta={formatDate(event.date)} tone={event.tone === "gold" ? "gold" : event.tone === "red" ? "red" : event.tone === "green" ? "green" : "blue"} />
                ))}
              </div>
            )}
          </Panel>
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon;

  return (
    <Link href={action.href} className="group rounded-[24px] border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass(action.tone)}`}>
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-black text-[#15445A]">{action.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500">{action.description}</p>
      <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-[#15445A] transition group-hover:bg-[#15445A] group-hover:text-white">فتح</div>
    </Link>
  );
}

function toneClass(tone: QuickAction["tone"]) {
  const classes: Record<QuickAction["tone"], string> = {
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    green: "bg-[#07A869]/10 text-[#07A869]",
    gold: "bg-[#C1B489]/20 text-[#15445A]",
    red: "bg-red-50 text-red-700",
    teal: "bg-[#0DA9A6]/10 text-[#0DA9A6]",
    slate: "bg-slate-100 text-slate-700",
  };

  return classes[tone];
}

function Panel({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
            {icon}
          </div>
          <h2 className="text-2xl font-black text-[#15445A]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] bg-white p-8 text-center text-slate-500 shadow-sm">
      <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-[#15445A]" />
      <p className="font-bold">{text}</p>
    </div>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl print:hidden ${
        toast.type === "success" ? "bg-[#07A869]" : "bg-red-600"
      }`}
    >
      {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span>{toast.message}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className="text-left font-black text-[#15445A]">{value || "—"}</span>
    </div>
  );
}

function MiniBadge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "blue" | "green" | "gold" | "red";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-[#3D7EB9]/20 bg-[#3D7EB9]/10 text-[#3D7EB9]",
    green: "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]",
    gold: "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]",
    red: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${tones[tone]}`}>
      {children}
    </span>
  );
}

function SmallListCard({
  title,
  subtitle,
  meta,
  tone = "slate",
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  tone?: "slate" | "blue" | "green" | "gold" | "red";
}) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    green: "bg-[#07A869]/10 text-[#07A869]",
    gold: "bg-[#C1B489]/20 text-[#15445A]",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-[#15445A]">{title || "—"}</h3>
          {subtitle && <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>}
        </div>

        {meta && (
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${colors[tone]}`}>
            {meta}
          </span>
        )}
      </div>
    </div>
  );
}

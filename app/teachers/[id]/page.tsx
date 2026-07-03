"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpenCheck,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Loader2,
  Paperclip,
  Printer,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserRoundCheck,
  Users,
  XCircle,
} from "lucide-react";

type Teacher = {
  id: string;
  school_id?: string | null;
  full_name: string;
  employee_number?: string | null;
  photo_url?: string | null;
  subject?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  weekly_load?: number | null;
  status?: string | null;
  admin_notes?: string | null;
  created_at?: string | null;
};

type TeacherSchedule = {
  id: string;
  teacher_id: string;
  school_id?: string | null;
  day_name?: string | null;
  period_number?: number | null;
  class_name?: string | null;
  section?: string | null;
  subject?: string | null;
  room?: string | null;
};

type WaitingPeriod = {
  id: string;
  teacher_id: string;
  school_id?: string | null;
  class_name?: string | null;
  section?: string | null;
  subject?: string | null;
  period_number?: number | null;
  day_name?: string | null;
  waiting_date?: string | null;
  approval_status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type PortfolioItem = {
  id: string;
  teacher_id: string;
  school_id?: string | null;
  title?: string | null;
  category?: string | null;
  description?: string | null;
  file_url?: string | null;
  achievement_date?: string | null;
  status?: string | null;
  review_status?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
};

type TeacherSubject = {
  id: string;
  teacher_id: string;
  school_id?: string | null;
  subject_id?: string | null;
  subject_name?: string | null;
  subject?: string | null;
};

type TeacherClass = {
  id: string;
  teacher_id: string;
  school_id?: string | null;
  class_name?: string | null;
  section?: string | null;
  subject?: string | null;
  grade_level?: string | null;
  created_at?: string | null;
};

type TeacherCertificate = {
  id: string;
  teacher_id: string;
  school_id?: string | null;
  title?: string | null;
  provider?: string | null;
  certificate_date?: string | null;
  file_url?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type TeacherPerformance = {
  id: string;
  teacher_id: string;
  school_id?: string | null;
  evaluation_date?: string | null;
  evaluator_name?: string | null;
  score?: number | null;
  rating?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type TeacherFile = {
  id: string;
  school_id?: string | null;
  teacher_id: string;
  file_title?: string | null;
  file_category?: string | null;
  file_name: string;
  file_url?: string | null;
  storage_path?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  uploaded_by?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type TabKey =
  | "overview"
  | "schedule"
  | "waiting"
  | "portfolio"
  | "subjects"
  | "certificates"
  | "performance"
  | "files";

type SimpleTableRow = (string | number)[];

const TEACHER_DETAILS_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "teacher",
];

const TEACHER_BUCKET = "teacher-portfolio";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").trim();
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("ar-SA");
  } catch {
    return value;
  }
}

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isPending(value?: string | null) {
  const status = String(value || "").trim().toLowerCase();

  return (
    !status ||
    status === "pending" ||
    status.includes("انتظار") ||
    status.includes("مراجعة") ||
    status.includes("مسودة")
  );
}

function isApproved(value?: string | null) {
  const status = String(value || "").trim().toLowerCase();

  return (
    status === "approved" ||
    status === "active" ||
    status.includes("معتمد") ||
    status.includes("مكتمل") ||
    status.includes("منفذ")
  );
}

function safeRows<T>(data: T[] | null | undefined, mapper: (item: T) => SimpleTableRow) {
  return (data || []).map(mapper);
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function statusPill(value?: string | null) {
  if (isApproved(value)) return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
  if (isPending(value)) return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";
  if (String(value || "").includes("مرفوض")) return "border-red-200 bg-red-50 text-red-700";
  return "border-[#3D7EB9]/20 bg-[#3D7EB9]/10 text-[#3D7EB9]";
}

function teacherInitials(name?: string | null) {
  const parts = String(name || "").trim().split(" ").filter(Boolean);
  if (!parts.length) return "م";
  return parts.slice(0, 2).map((part) => part[0]).join("");
}

export default function TeacherDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = String(params.id || "");
  const { currentSchool, loading: schoolLoading } = useSchool();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [schedule, setSchedule] = useState<TeacherSchedule[]>([]);
  const [waiting, setWaiting] = useState<WaitingPeriod[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [certificates, setCertificates] = useState<TeacherCertificate[]>([]);
  const [performance, setPerformance] = useState<TeacherPerformance[]>([]);
  const [teacherFiles, setTeacherFiles] = useState<TeacherFile[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const today = getTodayDate();

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchTeacherFile = useCallback(async () => {
    if (!teacherId) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const schoolId = currentSchool?.id || null;

      let teacherQuery = supabase.from("teachers").select("*").eq("id", teacherId);
      if (schoolId) teacherQuery = teacherQuery.eq("school_id", schoolId);

      const teacherResult = await teacherQuery.maybeSingle();

      if (teacherResult.error) throw teacherResult.error;
      if (!teacherResult.data) throw new Error("لم يتم العثور على المعلم");

      const currentTeacher = teacherResult.data as Teacher;
      const realSchoolId = currentTeacher.school_id || schoolId || null;

      const [
        scheduleResult,
        waitingResult,
        portfolioResult,
        subjectsResult,
        classesResult,
        certificatesResult,
        performanceResult,
        filesResult,
      ] = await Promise.all([
        supabase.from("teacher_schedule").select("*").eq("teacher_id", teacherId).order("period_number", { ascending: true }),
        supabase.from("teacher_waiting_periods").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false }),
        supabase.from("teacher_portfolio").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false }),
        supabase.from("teacher_subjects").select("*").eq("teacher_id", teacherId),
        supabase.from("teacher_classes").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false }),
        supabase.from("teacher_certificates").select("*").eq("teacher_id", teacherId).order("certificate_date", { ascending: false }),
        supabase.from("teacher_performance").select("*").eq("teacher_id", teacherId).order("evaluation_date", { ascending: false }),
        supabase.from("teacher_files").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false }),
      ]);

      const onlySameSchool = <T extends { school_id?: string | null }>(rows: T[] | null) => {
        if (!realSchoolId) return rows || [];
        return (rows || []).filter((row) => !row.school_id || row.school_id === realSchoolId);
      };

      setTeacher(currentTeacher);
      setSchedule(scheduleResult.error ? [] : onlySameSchool((scheduleResult.data || []) as TeacherSchedule[]));
      setWaiting(waitingResult.error ? [] : onlySameSchool((waitingResult.data || []) as WaitingPeriod[]));
      setPortfolio(portfolioResult.error ? [] : onlySameSchool((portfolioResult.data || []) as PortfolioItem[]));
      setTeacherSubjects(subjectsResult.error ? [] : onlySameSchool((subjectsResult.data || []) as TeacherSubject[]));
      setTeacherClasses(classesResult.error ? [] : onlySameSchool((classesResult.data || []) as TeacherClass[]));
      setCertificates(certificatesResult.error ? [] : onlySameSchool((certificatesResult.data || []) as TeacherCertificate[]));
      setPerformance(performanceResult.error ? [] : onlySameSchool((performanceResult.data || []) as TeacherPerformance[]));
      setTeacherFiles(filesResult.error ? [] : onlySameSchool((filesResult.data || []) as TeacherFile[]));

      const hasPartialError =
        scheduleResult.error ||
        waitingResult.error ||
        portfolioResult.error ||
        subjectsResult.error ||
        classesResult.error ||
        certificatesResult.error ||
        performanceResult.error ||
        filesResult.error;

      if (hasPartialError) {
        showToast("error", "تم تحميل ملف المعلم، لكن بعض الأقسام لم تُحمّل بالكامل.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل ملف المعلم";
      setErrorMsg(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, teacherId, showToast]);

  useEffect(() => {
    if (teacherId) void fetchTeacherFile();
  }, [teacherId, currentSchool?.id, fetchTeacherFile]);

  const pendingWaiting = useMemo(
    () => waiting.filter((item) => isPending(item.approval_status)).length,
    [waiting],
  );

  const pendingPortfolio = useMemo(
    () => portfolio.filter((item) => isPending(item.review_status)).length,
    [portfolio],
  );

  const approvedPortfolio = useMemo(
    () => portfolio.filter((item) => isApproved(item.review_status)).length,
    [portfolio],
  );

  const latestPerformance = performance[0];

  const averagePerformance = useMemo(() => {
    const scored = performance.filter((item) => typeof item.score === "number");

    if (scored.length === 0) return 0;

    return Math.round(scored.reduce((sum, item) => sum + Number(item.score || 0), 0) / scored.length);
  }, [performance]);

  const readinessScore = useMemo(() => {
    const scheduleScore = schedule.length > 0 ? 20 : 0;
    const subjectsScore = teacherSubjects.length > 0 ? 15 : 0;
    const classesScore = teacherClasses.length > 0 ? 15 : 0;
    const portfolioScore = portfolio.length > 0 ? 20 : 0;
    const certificateScore = certificates.length > 0 ? 15 : 0;
    const filesScore = teacherFiles.length > 0 ? 15 : 0;

    return scheduleScore + subjectsScore + classesScore + portfolioScore + certificateScore + filesScore;
  }, [schedule, teacherSubjects, teacherClasses, portfolio, certificates, teacherFiles]);

  const readinessLabel =
    readinessScore >= 80 ? "جاهز ومكتمل" : readinessScore >= 50 ? "قيد الاكتمال" : "يحتاج استكمال";

  const completionAlerts = useMemo(() => {
    const items: string[] = [];

    if (schedule.length === 0) items.push("لم يتم إدخال جدول المعلم.");
    if (teacherSubjects.length === 0) items.push("لا توجد مواد مسندة للمعلم.");
    if (teacherClasses.length === 0) items.push("لا توجد فصول مسندة للمعلم.");
    if (portfolio.length === 0) items.push("ملف الإنجاز لا يحتوي على شواهد.");
    if (certificates.length === 0) items.push("لا توجد دورات أو شهادات.");
    if (teacherFiles.length === 0) items.push("لا توجد مرفقات محفوظة.");

    return items;
  }, [schedule.length, teacherSubjects.length, teacherClasses.length, portfolio.length, certificates.length, teacherFiles.length]);

  const exportRows = useMemo(() => {
    if (!teacher) return [];

    return [
      ["اسم المعلم", teacher.full_name || "-"],
      ["الرقم الوظيفي", teacher.employee_number || "-"],
      ["المادة", teacher.subject || "-"],
      ["القسم", teacher.department || "-"],
      ["الجوال", teacher.phone || "-"],
      ["البريد", teacher.email || "-"],
      ["النصاب الأسبوعي", teacher.weekly_load ?? "-"],
      ["الحالة", teacher.status || "-"],
      ["عدد حصص الجدول", schedule.length],
      ["حصص الانتظار", waiting.length],
      ["انتظار معلق", pendingWaiting],
      ["الشواهد", portfolio.length],
      ["شواهد قيد المراجعة", pendingPortfolio],
      ["الشواهد المعتمدة", approvedPortfolio],
      ["المواد المسندة", teacherSubjects.length],
      ["الفصول المسندة", teacherClasses.length],
      ["الدورات والشهادات", certificates.length],
      ["المرفقات", teacherFiles.length],
      ["متوسط الأداء", performance.length > 0 ? `${averagePerformance}%` : "-"],
      ["جاهزية الملف", `${readinessScore}%`],
      ["حالة الملف", readinessLabel],
    ] as (string | number)[][];
  }, [
    teacher,
    schedule.length,
    waiting.length,
    pendingWaiting,
    portfolio.length,
    pendingPortfolio,
    approvedPortfolio,
    teacherSubjects.length,
    teacherClasses.length,
    certificates.length,
    teacherFiles.length,
    performance.length,
    averagePerformance,
    readinessScore,
    readinessLabel,
  ]);

  async function exportTeacherExcel() {
    if (!teacher) return;

    await exportTableToExcel({
      title: "ملف المعلم النهائي",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: `${teacher.full_name} — ${teacher.subject || "-"}`,
      headers: ["المؤشر", "القيمة"],
      rows: exportRows,
      fileName: `${safeFileName(`teacher-final-file-${teacher.full_name}-${today}`)}.xlsx`,
    } as any);

    showToast("success", "تم تصدير ملف المعلم Excel");
  }

  function exportTeacherPDF() {
    if (!teacher) return;

    exportTableToPDF({
      title: "ملف المعلم النهائي",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: `${teacher.full_name} — ${teacher.subject || "-"}`,
      headers: ["المؤشر", "القيمة"],
      rows: exportRows,
      fileName: `${safeFileName(`teacher-final-file-${teacher.full_name}-${today}`)}.pdf`,
    } as any);

    showToast("success", "تم تجهيز PDF لملف المعلم");
  }

  async function uploadTeacherFile(file: File) {
    if (!teacher) return;

    try {
      setUploadingFile(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const schoolId = teacher.school_id || currentSchool?.id || null;
      const extension = file.name.split(".").pop() || "file";
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      const safeUploadName = `${Date.now()}-${safeFileName(cleanName)}.${extension}`;
      const storagePath = `${schoolId || "unknown-school"}/${teacher.id}/${safeUploadName}`;

      const { error: uploadError } = await supabase.storage
        .from(TEACHER_BUCKET)
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(TEACHER_BUCKET).getPublicUrl(storagePath);

      const { error: insertError } = await supabase.from("teacher_files").insert({
        school_id: schoolId,
        teacher_id: teacher.id,
        file_title: file.name,
        file_category: "عام",
        file_name: file.name,
        file_url: publicUrlData.publicUrl,
        storage_path: storagePath,
        file_type: file.type || extension,
        file_size: file.size,
        uploaded_by: user?.id || null,
        notes: null,
      });

      if (insertError) throw insertError;

      showToast("success", "تم رفع المرفق بنجاح");
      void fetchTeacherFile();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر رفع الملف";
      showToast("error", message);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteTeacherFile(file: TeacherFile) {
    if (!teacher) return;

    const confirmed = window.confirm("هل تريد حذف هذا المرفق؟");
    if (!confirmed) return;

    try {
      if (file.storage_path) {
        await supabase.storage.from(TEACHER_BUCKET).remove([file.storage_path]);
      }

      const { error } = await supabase
        .from("teacher_files")
        .delete()
        .eq("id", file.id)
        .eq("teacher_id", teacher.id);

      if (error) throw error;

      showToast("success", "تم حذف المرفق");
      void fetchTeacherFile();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حذف المرفق";
      showToast("error", message);
    }
  }

  const tabs: { key: TabKey; label: string; icon: ReactNode; count?: number }[] = [
    { key: "overview", label: "النظرة العامة", icon: <ShieldCheck size={16} /> },
    { key: "schedule", label: "الجدول", icon: <BookOpenCheck size={16} />, count: schedule.length },
    { key: "waiting", label: "الانتظار", icon: <CalendarCheck size={16} />, count: waiting.length },
    { key: "portfolio", label: "الشواهد", icon: <Award size={16} />, count: portfolio.length },
    { key: "subjects", label: "الإسناد", icon: <Users size={16} />, count: teacherSubjects.length + teacherClasses.length },
    { key: "certificates", label: "الدورات", icon: <FileText size={16} />, count: certificates.length },
    { key: "performance", label: "الأداء", icon: <ClipboardCheck size={16} />, count: performance.length },
    { key: "files", label: "المرفقات", icon: <Paperclip size={16} />, count: teacherFiles.length },
  ];

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={TEACHER_DETAILS_ROLES}>
        <AppShell>
          <LoadingBox text="جاري تحميل ملف المعلم النهائي..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!teacher || errorMsg) {
    return (
      <RoleGuard allowedRoles={TEACHER_DETAILS_ROLES}>
        <AppShell>
          <div className="rounded-[28px] border border-red-100 bg-red-50 p-8 text-center font-bold text-red-700">
            {errorMsg || "لم يتم العثور على المعلم."}
          </div>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={TEACHER_DETAILS_ROLES}>
      <AppShell>
        <main className="space-y-5" dir="rtl">
          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title={teacher.full_name}
            description="ملف المعلم 360° يجمع الجدول والنصاب والانتظار والشواهد والإسناد والدورات والأداء والمرفقات في صفحة واحدة."
            badge="ملف المعلم"
            icon={<GraduationCap size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "المعلمون", href: "/teachers" },
              { label: teacher.full_name },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "—" },
              { label: "الرقم الوظيفي", value: teacher.employee_number || "—" },
              { label: "المادة", value: teacher.subject || "—" },
              { label: "القسم", value: teacher.department || "—" },
            ]}
            stats={[
              { label: "جاهزية الملف", value: `${readinessScore}%`, icon: <ShieldCheck size={20} />, tone: readinessScore >= 80 ? "green" : readinessScore >= 50 ? "gold" : "red" },
              { label: "الجدول", value: schedule.length, icon: <BookOpenCheck size={20} />, tone: "blue" },
              { label: "الشواهد", value: portfolio.length, icon: <Award size={20} />, tone: portfolio.length > 0 ? "green" : "gold" },
              { label: "الأداء", value: performance.length > 0 ? `${averagePerformance}%` : "—", icon: <ClipboardCheck size={20} />, tone: averagePerformance >= 80 ? "green" : "gold" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => router.push("/teachers")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ArrowRight size={17} />
                  رجوع
                </button>

                <button
                  type="button"
                  onClick={() => void exportTeacherExcel()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <FileSpreadsheet size={17} />
                  Excel
                </button>

                <button
                  type="button"
                  onClick={exportTeacherPDF}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <FileText size={17} />
                  PDF
                </button>

                <button
                  type="button"
                  onClick={() => void fetchTeacherFile()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Printer size={17} />
                  طباعة
                </button>
              </>
            }
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
              <TeacherAvatar teacher={teacher} />

              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <MiniBadge tone={readinessScore >= 80 ? "green" : readinessScore >= 50 ? "gold" : "red"}>{readinessLabel}</MiniBadge>
                  <MiniBadge tone="blue">النصاب: {teacher.weekly_load ?? "—"}</MiniBadge>
                  <MiniBadge tone="slate">{teacher.status || "على رأس العمل"}</MiniBadge>
                </div>

                <h2 className="text-2xl font-black text-[#15445A]">{teacher.full_name}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  {teacher.subject || "بدون مادة"} — {teacher.department || "بدون قسم"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                  <span className="rounded-full bg-slate-50 px-3 py-1">الجوال: {teacher.phone || "—"}</span>
                  <span className="rounded-full bg-slate-50 px-3 py-1">البريد: {teacher.email || "—"}</span>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-xs font-black text-slate-400">مؤشر الجاهزية</p>
                <p className="mt-1 text-3xl font-black text-[#15445A]">{readinessScore}%</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{readinessLabel}</p>
              </div>
            </div>
          </section>

          {completionAlerts.length > 0 && (
            <section className="rounded-[28px] border border-[#C1B489]/40 bg-[#C1B489]/15 p-5 print:hidden">
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle className="text-[#15445A]" size={20} />
                <h3 className="font-black text-[#15445A]">تنبيهات استكمال الملف</h3>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {completionAlerts.map((alert) => (
                  <div key={alert} className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700">
                    ⚠️ {alert}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <ExecutiveCard title="الجدول والنصاب" value={schedule.length} icon={<BookOpenCheck size={22} />} tone="blue" subtitle={`النصاب ${teacher.weekly_load ?? "—"}`} progress={teacher.weekly_load ? percentage(schedule.length, Number(teacher.weekly_load)) : schedule.length ? 100 : 0} />
            <ExecutiveCard title="الانتظار" value={waiting.length} icon={<CalendarCheck size={22} />} tone={pendingWaiting > 0 ? "gold" : "green"} subtitle={`${pendingWaiting} معلق`} progress={waiting.length ? percentage(waiting.length - pendingWaiting, waiting.length) : 0} />
            <ExecutiveCard title="ملف الإنجاز" value={portfolio.length} icon={<Award size={22} />} tone="green" subtitle={`${approvedPortfolio} معتمد`} progress={portfolio.length ? percentage(approvedPortfolio, portfolio.length) : 0} />
            <ExecutiveCard title="الأداء والتطوير" value={performance.length > 0 ? `${averagePerformance}%` : "—"} icon={<ClipboardCheck size={22} />} tone={averagePerformance >= 80 ? "green" : "gold"} subtitle={`${certificates.length} دورة`} progress={averagePerformance} />
          </section>

          <SummaryCard
            title="ملخص ملف المعلم"
            description="قراءة تنفيذية لحالة ملف المعلم من حيث الجدول والإسناد والشواهد والدورات والأداء والمرفقات."
            tone={readinessScore >= 80 ? "green" : readinessScore >= 50 ? "gold" : "red"}
            items={[
              { label: "جاهزية الملف", value: `${readinessScore}%` },
              { label: "حصص مجدولة", value: schedule.length },
              { label: "المواد المسندة", value: teacherSubjects.length },
              { label: "الفصول المسندة", value: teacherClasses.length },
              { label: "الشواهد", value: portfolio.length },
              { label: "المرفقات", value: teacherFiles.length },
            ]}
            footer={latestPerformance?.rating || "يعتمد المؤشر على اكتمال بيانات المعلم الأساسية والتشغيلية."}
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-3 shadow-sm print:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                    activeTab === tab.key ? "bg-[#15445A] text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.icon}
                  {tab.label}

                  {typeof tab.count === "number" && (
                    <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === tab.key ? "bg-white/20 text-white" : "bg-white text-slate-500"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {activeTab === "overview" && (
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <TeacherInfoCard teacher={teacher} />

              <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck className="text-[#15445A]" size={22} />
                  <h2 className="text-xl font-black text-[#15445A]">ملخص المعلم التنفيذي</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                  <MiniBox title="الجدول" value={schedule.length} />
                  <MiniBox title="الانتظار" value={waiting.length} />
                  <MiniBox title="الشواهد" value={portfolio.length} />
                  <MiniBox title="الأداء" value={performance.length > 0 ? `${averagePerformance}%` : "-"} />
                  <MiniBox title="المرفقات" value={teacherFiles.length} />
                </div>

                <div className="mt-5 rounded-[24px] bg-slate-50 p-5">
                  <h3 className="font-black text-[#15445A]">قراءة سريعة</h3>
                  <p className="mt-2 leading-7 text-slate-600">
                    هذا الملف يجمع بيانات المعلم، جدوله، تكليفات الانتظار، الشواهد، الإسناد، الدورات، تقييم الأداء، والمرفقات في صفحة واحدة.
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeTab === "schedule" && (
            <SimpleDataTable
              title="الجدول الأسبوعي"
              emptyText="لا توجد حصص مجدولة لهذا المعلم"
              headers={["اليوم", "الحصة", "الفصل", "الشعبة", "المادة", "القاعة"]}
              rows={safeRows(schedule, (item) => [
                String(item.day_name || "-"),
                item.period_number ?? "-",
                String(item.class_name || "-"),
                String(item.section || "-"),
                String(item.subject || teacher.subject || "-"),
                String(item.room || "-"),
              ])}
            />
          )}

          {activeTab === "waiting" && (
            <SimpleDataTable
              title="حصص الانتظار"
              emptyText="لا توجد حصص انتظار لهذا المعلم"
              headers={["التاريخ", "اليوم", "الحصة", "الفصل", "الشعبة", "الحالة", "ملاحظات"]}
              rows={safeRows(waiting, (item) => [
                String(item.waiting_date || item.created_at?.slice(0, 10) || "-"),
                String(item.day_name || "-"),
                item.period_number ?? "-",
                String(item.class_name || "-"),
                String(item.section || "-"),
                String(item.approval_status || "-"),
                String(item.notes || "-"),
              ])}
            />
          )}

          {activeTab === "portfolio" && (
            <SimpleDataTable
              title="ملف الشواهد"
              emptyText="لا توجد شواهد لهذا المعلم"
              headers={["التاريخ", "العنوان", "التصنيف", "الملف", "الحالة", "المراجعة"]}
              rows={safeRows(portfolio, (item) => [
                String(item.achievement_date || item.created_at?.slice(0, 10) || "-"),
                String(item.title || "-"),
                String(item.category || "-"),
                String(item.file_name || (item.file_url ? "متوفر" : "-")),
                String(item.status || "-"),
                String(item.review_status || "بانتظار المراجعة"),
              ])}
            />
          )}

          {activeTab === "subjects" && (
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <SimpleDataTable
                title="المواد المسندة"
                emptyText="لا توجد مواد مسندة"
                headers={["المادة"]}
                rows={safeRows(teacherSubjects, (item) => [
                  String(item.subject_name || item.subject || teacher.subject || "-"),
                ])}
              />

              <SimpleDataTable
                title="الفصول المسندة"
                emptyText="لا توجد فصول مسندة"
                headers={["المرحلة", "الفصل", "الشعبة", "المادة"]}
                rows={safeRows(teacherClasses, (item) => [
                  String(item.grade_level || "-"),
                  String(item.class_name || "-"),
                  String(item.section || "-"),
                  String(item.subject || teacher.subject || "-"),
                ])}
              />
            </section>
          )}

          {activeTab === "certificates" && (
            <SimpleDataTable
              title="الدورات والشهادات"
              emptyText="لا توجد دورات أو شهادات لهذا المعلم"
              headers={["التاريخ", "العنوان", "الجهة", "الملف", "ملاحظات"]}
              rows={safeRows(certificates, (item) => [
                String(item.certificate_date || item.created_at?.slice(0, 10) || "-"),
                String(item.title || "-"),
                String(item.provider || "-"),
                String(item.file_url ? "متوفر" : "-"),
                String(item.notes || "-"),
              ])}
            />
          )}

          {activeTab === "performance" && (
            <SimpleDataTable
              title="الأداء الوظيفي"
              emptyText="لا توجد تقييمات أداء لهذا المعلم"
              headers={["التاريخ", "المقيم", "الدرجة", "التقدير", "ملاحظات"]}
              rows={safeRows(performance, (item) => [
                String(item.evaluation_date || item.created_at?.slice(0, 10) || "-"),
                String(item.evaluator_name || "-"),
                item.score ?? "-",
                String(item.rating || "-"),
                String(item.notes || "-"),
              ])}
            />
          )}

          {activeTab === "files" && (
            <TeacherFilesPanel
              files={teacherFiles}
              uploadingFile={uploadingFile}
              fileInputRef={fileInputRef}
              onUpload={uploadTeacherFile}
              onDelete={deleteTeacherFile}
            />
          )}
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function TeacherAvatar({ teacher }: { teacher: Teacher }) {
  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[28px] bg-[#15445A] text-3xl font-black text-[#C1B489]">
      {teacher.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={teacher.photo_url} alt={teacher.full_name} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        teacherInitials(teacher.full_name)
      )}
    </div>
  );
}

function TeacherInfoCard({ teacher }: { teacher: Teacher }) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <GraduationCap className="text-[#15445A]" size={22} />
        <h2 className="text-xl font-black text-[#15445A]">بيانات المعلم</h2>
      </div>

      <div className="space-y-3">
        <InfoRow label="الاسم" value={teacher.full_name} />
        <InfoRow label="الرقم الوظيفي" value={teacher.employee_number || "-"} />
        <InfoRow label="المادة" value={teacher.subject || "-"} />
        <InfoRow label="القسم" value={teacher.department || "-"} />
        <InfoRow label="النصاب" value={String(teacher.weekly_load ?? "-")} />
        <InfoRow label="الحالة" value={teacher.status || "على رأس العمل"} />
        <InfoRow label="الجوال" value={teacher.phone || "-"} />
        <InfoRow label="البريد" value={teacher.email || "-"} />
        <InfoRow label="ملاحظات" value={teacher.admin_notes || "-"} />
      </div>
    </div>
  );
}

function TeacherFilesPanel({
  files,
  uploadingFile,
  fileInputRef,
  onUpload,
  onDelete,
}: {
  files: TeacherFile[];
  uploadingFile: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (file: File) => void;
  onDelete: (file: TeacherFile) => void;
}) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Paperclip className="text-[#C1B489]" size={22} />

          <div>
            <h2 className="text-xl font-black text-[#15445A]">مرفقات المعلم</h2>
            <p className="mt-1 text-sm text-slate-500">شهادات، خطابات، ملفات إنجاز، أو أي مستندات خاصة بالمعلم.</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
          }}
        />

        <button
          type="button"
          disabled={uploadingFile}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {uploadingFile ? "جاري الرفع..." : "رفع مرفق"}
        </button>
      </div>

      {files.length === 0 ? (
        <div className="rounded-[24px] bg-slate-50 p-8 text-center text-slate-500">لا توجد مرفقات لهذا المعلم</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {files.map((file) => (
            <div key={file.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#C1B489]">{file.file_category || "عام"}</p>
                  <h3 className="mt-2 font-black text-[#15445A]">{file.file_title || file.file_name}</h3>
                </div>

                <FileText className="shrink-0 text-slate-400" size={20} />
              </div>

              <div className="space-y-2 text-sm text-slate-500">
                <p>اسم الملف: {file.file_name || "-"}</p>
                <p>النوع: {file.file_type || "-"}</p>
                <p>الحجم: {formatFileSize(file.file_size)}</p>
                <p>تاريخ الرفع: {formatDate(file.created_at)}</p>
              </div>

              {file.notes && <p className="mt-3 rounded-2xl bg-white p-3 text-sm leading-7 text-slate-600">{file.notes}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                {file.file_url && (
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#15445A] px-4 py-2 text-sm font-bold text-white"
                  >
                    <ExternalLink size={15} />
                    فتح الملف
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => onDelete(file)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                >
                  <Trash2 size={15} />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SimpleDataTable({
  title,
  emptyText,
  headers,
  rows,
}: {
  title: string;
  emptyText: string;
  headers: string[];
  rows: SimpleTableRow[];
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-xl font-black text-[#15445A]">{title}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-right">
          <thead className="bg-slate-50 text-sm text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="p-4">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={index} className="border-t border-slate-100">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="p-4 text-sm text-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="p-8 text-center text-slate-500">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="break-words text-left font-bold text-[#15445A]">{value}</span>
    </div>
  );
}

function MiniBox({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-2 font-black text-[#15445A]">{value}</h3>
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

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${tones[tone]}`}>{children}</span>;
}

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] bg-white p-6 text-center text-slate-500 shadow-sm">
      <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#15445A]" />
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

"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
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
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  ImageIcon,
  Loader2,
  Paperclip,
  Printer,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  UserRoundCheck,
  X,
  XCircle,
} from "lucide-react";

type Teacher = {
  id: string;
  school_id?: string | null;
  full_name: string;
  employee_number?: string | null;
  photo_url?: string | null;
  subject?: string | null;
  specialization?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  weekly_load?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type EvaluationElement = {
  id: number;
  element_number?: number | null;
  element_name: string;
  description?: string | null;
  is_active?: boolean | null;
};

type EvidenceType = {
  id: number;
  element_id: number;
  evidence_name: string;
  description?: string | null;
  is_required?: boolean | null;
  allowed_file_types?: string[] | null;
};

type PortfolioItem = {
  id: string;
  school_id?: string | null;
  teacher_id: string;
  evidence_type_id?: number | null;
  title?: string | null;
  category?: string | null;
  description?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  achievement_date?: string | null;
  status?: string | null;
  review_status?: string | null;
  review_notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type UploadForm = {
  evidence_type_id: string;
  title: string;
  category: string;
  description: string;
  achievement_date: string;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type StatusFilter = "all" | "approved" | "pending" | "rejected";
type FileFilter = "all" | "pdf" | "image" | "office" | "other";

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "teacher",
];

const STORAGE_BUCKET = "teacher-portfolio";

const emptyUploadForm: UploadForm = {
  evidence_type_id: "",
  title: "",
  category: "",
  description: "",
  achievement_date: new Date().toISOString().slice(0, 10),
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").trim();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function formatFileSize(size?: number | null) {
  if (!size) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusLabel(value?: string | null) {
  const status = String(value || "").trim().toLowerCase();

  if (
    status === "approved" ||
    status === "accepted" ||
    status === "active" ||
    status.includes("معتمد") ||
    status.includes("مقبول") ||
    status.includes("مكتمل")
  ) {
    return "معتمد";
  }

  if (
    status === "rejected" ||
    status === "refused" ||
    status.includes("مرفوض")
  ) {
    return "مرفوض";
  }

  return "بانتظار المراجعة";
}

function isApproved(value?: string | null) {
  return getStatusLabel(value) === "معتمد";
}

function isRejected(value?: string | null) {
  return getStatusLabel(value) === "مرفوض";
}

function isPending(value?: string | null) {
  return getStatusLabel(value) === "بانتظار المراجعة";
}

function statusTone(value?: string | null) {
  const status = getStatusLabel(value);

  if (status === "معتمد") return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
  if (status === "مرفوض") return "border-red-200 bg-red-50 text-red-700";
  return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";
}

function fileKind(fileType?: string | null, fileName?: string | null): FileFilter {
  const text = `${fileType || ""} ${fileName || ""}`.toLowerCase();

  if (text.includes("pdf")) return "pdf";
  if (text.includes("image") || /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(text)) return "image";
  if (text.includes("word") || text.includes("excel") || text.includes("powerpoint") || /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(text)) return "office";
  return "other";
}

function fileIcon(fileType?: string | null, fileName?: string | null) {
  const kind = fileKind(fileType, fileName);

  if (kind === "image") return <FileImage size={20} />;
  if (kind === "pdf") return <FileText size={20} />;
  if (kind === "office") return <FileSpreadsheet size={20} />;
  return <FileArchive size={20} />;
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function teacherInitials(name?: string | null) {
  const parts = String(name || "").trim().split(" ").filter(Boolean);
  if (!parts.length) return "م";
  return parts.slice(0, 2).map((part) => part[0]).join("");
}

function getEvidenceTitle(item: PortfolioItem, evidenceTypes: EvidenceType[]) {
  const evidence = evidenceTypes.find((type) => type.id === item.evidence_type_id);
  return item.title || evidence?.evidence_name || item.category || item.file_name || "شاهد";
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export default function TeacherPortfolioPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = String(params?.id || "");
  const { currentSchool, currentRole, hasPermission, loading: schoolLoading } = useSchool();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canReview =
    currentRole === "super_admin" ||
    currentRole === "school_admin" ||
    currentRole === "vice_principal" ||
    currentRole === "administrative_staff";

  const canUpload =
    canReview ||
    currentRole === "teacher" ||
    hasPermission("teachers.manage") ||
    hasPermission("reports.export");

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [elements, setElements] = useState<EvaluationElement[]>([]);
  const [evidenceTypes, setEvidenceTypes] = useState<EvidenceType[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);

  const [uploadForm, setUploadForm] = useState<UploadForm>(emptyUploadForm);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [previewItem, setPreviewItem] = useState<PortfolioItem | null>(null);

  const [search, setSearch] = useState("");
  const [selectedElement, setSelectedElement] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [fileFilter, setFileFilter] = useState<FileFilter>("all");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const today = todayDate();

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchPortfolio = useCallback(async () => {
    if (!teacherId) return;

    setLoading(true);
    setErrorMsg("");

    try {
      let teacherQuery = supabase.from("teachers").select("*").eq("id", teacherId);
      if (currentSchool?.id) teacherQuery = teacherQuery.eq("school_id", currentSchool.id);

      const teacherResult = await teacherQuery.maybeSingle();

      if (teacherResult.error) throw teacherResult.error;
      if (!teacherResult.data) throw new Error("لم يتم العثور على المعلم");

      const currentTeacher = teacherResult.data as Teacher;

      const [elementsResult, evidenceResult, portfolioResult] = await Promise.all([
        supabase
          .from("teacher_evaluation_elements")
          .select("*")
          .order("element_number", { ascending: true }),
        supabase
          .from("teacher_evidence_types")
          .select("*")
          .order("element_id", { ascending: true })
          .order("id", { ascending: true }),
        supabase
          .from("teacher_portfolio")
          .select("*")
          .eq("teacher_id", teacherId)
          .order("created_at", { ascending: false }),
      ]);

      if (elementsResult.error) throw elementsResult.error;
      if (evidenceResult.error) throw evidenceResult.error;
      if (portfolioResult.error) throw portfolioResult.error;

      const schoolId = currentTeacher.school_id || currentSchool?.id || null;

      setTeacher(currentTeacher);
      setElements(((elementsResult.data || []) as EvaluationElement[]).filter((item) => item.is_active !== false));
      setEvidenceTypes((evidenceResult.data || []) as EvidenceType[]);
      setPortfolio(
        ((portfolioResult.data || []) as PortfolioItem[]).filter((item) => !schoolId || !item.school_id || item.school_id === schoolId),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل ملف الإنجاز";
      setErrorMsg(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, teacherId, showToast]);

  useEffect(() => {
    if (!schoolLoading) void fetchPortfolio();
  }, [schoolLoading, fetchPortfolio]);

  const evidenceUploadMap = useMemo(() => {
    const map = new Map<number, PortfolioItem[]>();

    portfolio.forEach((item) => {
      if (!item.evidence_type_id) return;
      const current = map.get(item.evidence_type_id) || [];
      map.set(item.evidence_type_id, [...current, item]);
    });

    return map;
  }, [portfolio]);

  const requiredEvidence = useMemo(
    () => evidenceTypes.filter((item) => item.is_required !== false),
    [evidenceTypes],
  );

  const uploadedRequiredCount = useMemo(() => {
    return requiredEvidence.filter((evidence) => {
      const uploadsById = evidenceUploadMap.get(evidence.id) || [];
      const uploadsByName = portfolio.filter((item) => item.category === evidence.evidence_name);
      return uploadsById.length > 0 || uploadsByName.length > 0;
    }).length;
  }, [requiredEvidence, evidenceUploadMap, portfolio]);

  const totalRequired = requiredEvidence.length;
  const completionPercent = totalRequired > 0 ? percentage(uploadedRequiredCount, totalRequired) : portfolio.length > 0 ? 100 : 0;

  const approvedCount = portfolio.filter((item) => isApproved(item.review_status || item.status)).length;
  const pendingCount = portfolio.filter((item) => isPending(item.review_status || item.status)).length;
  const rejectedCount = portfolio.filter((item) => isRejected(item.review_status || item.status)).length;
  const imagesCount = portfolio.filter((item) => fileKind(item.file_type, item.file_name) === "image").length;
  const totalSize = portfolio.reduce((sum, item) => sum + Number(item.file_size || 0), 0);

  const elementProgress = useMemo(() => {
    return elements.map((element) => {
      const elementEvidence = requiredEvidence.filter((evidence) => evidence.element_id === element.id);
      const uploaded = elementEvidence.filter((evidence) => {
        const uploadsById = evidenceUploadMap.get(evidence.id) || [];
        const uploadsByName = portfolio.filter((item) => item.category === evidence.evidence_name);
        return uploadsById.length > 0 || uploadsByName.length > 0;
      }).length;

      return {
        element,
        total: elementEvidence.length,
        uploaded,
        percent: elementEvidence.length ? percentage(uploaded, elementEvidence.length) : 0,
        complete: elementEvidence.length > 0 && uploaded === elementEvidence.length,
      };
    });
  }, [elements, requiredEvidence, evidenceUploadMap, portfolio]);

  const missingRequired = useMemo(() => {
    return requiredEvidence.filter((evidence) => {
      const uploadsById = evidenceUploadMap.get(evidence.id) || [];
      const uploadsByName = portfolio.filter((item) => item.category === evidence.evidence_name);
      return uploadsById.length === 0 && uploadsByName.length === 0;
    });
  }, [requiredEvidence, evidenceUploadMap, portfolio]);

  const filteredEvidenceTypes = useMemo(() => {
    const keyword = normalizeText(search);

    return evidenceTypes.filter((evidence) => {
      const element = elements.find((item) => item.id === evidence.element_id);
      const matchesElement = selectedElement === "all" || String(evidence.element_id) === selectedElement;
      const text = normalizeText(`${evidence.evidence_name} ${evidence.description || ""} ${element?.element_name || ""}`);

      return matchesElement && (!keyword || text.includes(keyword));
    });
  }, [evidenceTypes, elements, search, selectedElement]);

  const filteredPortfolio = useMemo(() => {
    const keyword = normalizeText(search);

    return portfolio.filter((item) => {
      const status = getStatusLabel(item.review_status || item.status);
      const kind = fileKind(item.file_type, item.file_name);
      const evidence = evidenceTypes.find((type) => type.id === item.evidence_type_id);
      const element = evidence ? elements.find((el) => el.id === evidence.element_id) : null;

      const matchesElement = selectedElement === "all" || (evidence && String(evidence.element_id) === selectedElement);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "approved" && status === "معتمد") ||
        (statusFilter === "pending" && status === "بانتظار المراجعة") ||
        (statusFilter === "rejected" && status === "مرفوض");

      const matchesFile = fileFilter === "all" || kind === fileFilter;

      const text = normalizeText(`
        ${item.title || ""}
        ${item.category || ""}
        ${item.description || ""}
        ${item.file_name || ""}
        ${item.file_type || ""}
        ${item.review_status || ""}
        ${item.status || ""}
        ${evidence?.evidence_name || ""}
        ${element?.element_name || ""}
      `);

      return matchesElement && matchesStatus && matchesFile && (!keyword || text.includes(keyword));
    });
  }, [portfolio, search, selectedElement, statusFilter, fileFilter, evidenceTypes, elements]);

  const timelineItems = useMemo(() => {
    return [...portfolio]
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
      .slice(0, 8);
  }, [portfolio]);

  const aiRecommendation = useMemo(() => {
    if (completionPercent >= 90 && pendingCount === 0 && rejectedCount === 0) {
      return "ملف الإنجاز مكتمل تقريبًا وجاهز للطباعة والمراجعة النهائية.";
    }

    if (rejectedCount > 0) {
      return "يوجد شواهد مرفوضة؛ راجع ملاحظات الاعتماد وارفع نسخة مصححة.";
    }

    if (missingRequired.length > 0) {
      return `الأولوية الآن رفع ${missingRequired.length} شاهد إلزامي ناقص، وخصوصًا: ${missingRequired[0]?.evidence_name || "الشاهد الأول"}.`;
    }

    if (pendingCount > 0) {
      return "الملف يحتوي على شواهد بانتظار المراجعة؛ تابع الاعتماد قبل الطباعة النهائية.";
    }

    return "استمر في تحديث ملف الإنجاز دوريًا وإضافة الشواهد الحديثة.";
  }, [completionPercent, pendingCount, rejectedCount, missingRequired]);

  const exportRows = useMemo(() => {
    return [
      ["اسم المعلم", teacher?.full_name || "—"],
      ["المادة", teacher?.subject || teacher?.specialization || "—"],
      ["القسم", teacher?.department || "—"],
      ["إجمالي الشواهد", portfolio.length],
      ["الشواهد الإلزامية", totalRequired],
      ["المكتملة من الإلزامية", uploadedRequiredCount],
      ["نسبة الاكتمال", `${completionPercent}%`],
      ["المعتمدة", approvedCount],
      ["بانتظار المراجعة", pendingCount],
      ["المرفوضة", rejectedCount],
      ["الصور", imagesCount],
      ["الحجم الإجمالي", formatFileSize(totalSize)],
      ["آخر تحديث", formatDateTime(portfolio[0]?.created_at)],
    ];
  }, [
    teacher,
    portfolio,
    totalRequired,
    uploadedRequiredCount,
    completionPercent,
    approvedCount,
    pendingCount,
    rejectedCount,
    imagesCount,
    totalSize,
  ]);

  function handleFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files);
    if (nextFiles.length === 0) return;
    setSelectedFiles((current) => [...current, ...nextFiles]);
  }

  function onFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) handleFiles(event.target.files);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    handleFiles(event.dataTransfer.files);
  }

  function clearSelectedFile(index: number) {
    setSelectedFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function uploadFiles() {
    if (!teacher || !currentSchool?.id) {
      showToast("error", "لا توجد مدرسة أو معلم محدد.");
      return;
    }

    if (!canUpload) {
      showToast("error", "لا تملك صلاحية رفع الشواهد.");
      return;
    }

    if (selectedFiles.length === 0) {
      showToast("error", "اختر ملفًا واحدًا على الأقل.");
      return;
    }

    const selectedEvidence = evidenceTypes.find((item) => String(item.id) === uploadForm.evidence_type_id);
    const title = uploadForm.title.trim() || selectedEvidence?.evidence_name || "شاهد ملف الإنجاز";

    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      for (const file of selectedFiles) {
        const extension = file.name.split(".").pop() || "file";
        const safeUploadName = `${Date.now()}-${safeFileName(file.name)}`;
        const storagePath = `${currentSchool.id}/${teacher.id}/${safeUploadName}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file, {
            upsert: false,
            contentType: file.type || undefined,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

        const { error: insertError } = await supabase.from("teacher_portfolio").insert({
          school_id: currentSchool.id,
          teacher_id: teacher.id,
          evidence_type_id: selectedEvidence?.id || null,
          title,
          category: uploadForm.category.trim() || selectedEvidence?.evidence_name || "عام",
          description: uploadForm.description.trim() || null,
          file_url: publicUrlData.publicUrl,
          file_name: file.name,
          file_path: storagePath,
          file_type: file.type || extension,
          file_size: file.size,
          achievement_date: uploadForm.achievement_date || today,
          status: "نشط",
          review_status: "بانتظار المراجعة",
          created_by: user?.id || null,
        });
        if (insertError) throw insertError;
      }

      showToast("success", `تم رفع ${selectedFiles.length} ملف بنجاح.`);
      setSelectedFiles([]);
      setUploadForm(emptyUploadForm);
      void fetchPortfolio();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر رفع الملفات.";
      showToast("error", message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function updateReviewStatus(item: PortfolioItem, reviewStatus: "معتمد" | "مرفوض" | "بانتظار المراجعة") {
    if (!canReview) {
      showToast("error", "لا تملك صلاحية مراجعة الشواهد.");
      return;
    }

    setReviewingId(item.id);

    try {
      const { error } = await supabase
        .from("teacher_portfolio")
        .update({
          review_status: reviewStatus,
          status: reviewStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .eq("teacher_id", teacherId);

      if (error) throw error;

      showToast("success", `تم تحديث حالة الشاهد إلى: ${reviewStatus}`);
      void fetchPortfolio();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحديث حالة الشاهد.";
      showToast("error", message);
    } finally {
      setReviewingId(null);
    }
  }

  async function deletePortfolioItem(item: PortfolioItem) {
    const confirmed = window.confirm("هل تريد حذف هذا الشاهد؟");
    if (!confirmed) return;

    setReviewingId(item.id);

    try {
      if (item.file_path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([item.file_path]);
      }

      const { error } = await supabase
        .from("teacher_portfolio")
        .delete()
        .eq("id", item.id)
        .eq("teacher_id", teacherId);

      if (error) throw error;

      showToast("success", "تم حذف الشاهد.");
      void fetchPortfolio();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حذف الشاهد.";
      showToast("error", message);
    } finally {
      setReviewingId(null);
    }
  }

  async function exportExcel() {
    await exportTableToExcel({
      title: "ملف إنجاز المعلم",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: teacher?.full_name || "ملف إنجاز",
      headers: ["المؤشر", "القيمة"],
      rows: exportRows,
      fileName: `${safeFileName(`teacher-portfolio-${teacher?.full_name || teacherId}-${today}`)}.xlsx`,
    } as any);

    showToast("success", "تم تصدير Excel");
  }

  function exportPDF() {
    exportTableToPDF({
      title: "ملف إنجاز المعلم",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: teacher?.full_name || "ملف إنجاز",
      headers: ["المؤشر", "القيمة"],
      rows: exportRows,
      fileName: `${safeFileName(`teacher-portfolio-${teacher?.full_name || teacherId}-${today}`)}.pdf`,
    } as any);

    showToast("success", "تم تجهيز PDF");
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <LoadingBox text="جاري تحميل ملف إنجاز المعلم..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!teacher || errorMsg) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <div className="rounded-[28px] border border-red-100 bg-red-50 p-8 text-center font-bold text-red-700">
            {errorMsg || "لم يتم العثور على المعلم."}
          </div>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-5" dir="rtl">
          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title={`ملف إنجاز ${teacher.full_name}`}
            description="مركز احترافي لإدارة شواهد المعلم، رفع الملفات، قياس اكتمال العناصر، مراجعة الاعتماد، وتحليل جاهزية ملف الإنجاز."
            badge="ملف إنجاز المعلم"
            icon={<Award size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "المعلمون", href: "/teachers" },
              { label: teacher.full_name, href: `/teachers/${teacher.id}` },
              { label: "ملف الإنجاز" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "—" },
              { label: "المعلم", value: teacher.full_name },
              { label: "المادة", value: teacher.subject || teacher.specialization || "—" },
              { label: "آخر تحديث", value: formatDateTime(portfolio[0]?.created_at) },
            ]}
            stats={[
              { label: "نسبة الاكتمال", value: `${completionPercent}%`, icon: <ShieldCheck size={20} />, tone: completionPercent >= 80 ? "green" : "gold" },
              { label: "إجمالي الشواهد", value: portfolio.length, icon: <Paperclip size={20} />, tone: "blue" },
              { label: "معتمدة", value: approvedCount, icon: <CheckCircle2 size={20} />, tone: "green" },
              { label: "تحتاج مراجعة", value: pendingCount + rejectedCount, icon: <AlertCircle size={20} />, tone: pendingCount + rejectedCount > 0 ? "gold" : "green" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => router.push(`/teachers/${teacher.id}`)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ArrowRight size={17} />
                  ملف المعلم
                </button>

                <button
                  type="button"
                  onClick={() => void exportExcel()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Download size={17} />
                  Excel
                </button>

                <button
                  type="button"
                  onClick={exportPDF}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <FileText size={17} />
                  PDF
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
                  onClick={() => void fetchPortfolio()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-8">
            <ExecutiveCard title="الاكتمال" value={`${completionPercent}%`} icon={<ShieldCheck size={22} />} tone={completionPercent >= 80 ? "green" : "gold"} subtitle={`${uploadedRequiredCount}/${totalRequired} شاهد إلزامي`} progress={completionPercent} />
            <ExecutiveCard title="الشواهد" value={portfolio.length} icon={<Paperclip size={22} />} tone="blue" subtitle="كل الملفات" progress={portfolio.length ? 100 : 0} />
            <ExecutiveCard title="معتمد" value={approvedCount} icon={<CheckCircle2 size={22} />} tone="green" subtitle="مكتمل الاعتماد" progress={percentage(approvedCount, portfolio.length)} />
            <ExecutiveCard title="مراجعة" value={pendingCount} icon={<Clock size={22} />} tone={pendingCount > 0 ? "gold" : "green"} subtitle="بانتظار" progress={percentage(pendingCount, portfolio.length)} />
            <ExecutiveCard title="مرفوض" value={rejectedCount} icon={<XCircle size={22} />} tone={rejectedCount > 0 ? "red" : "green"} subtitle="يحتاج تصحيح" progress={percentage(rejectedCount, portfolio.length)} />
            <ExecutiveCard title="صور" value={imagesCount} icon={<ImageIcon size={22} />} tone="teal" subtitle="ملفات مرئية" progress={percentage(imagesCount, portfolio.length)} />
            <ExecutiveCard title="الحجم" value={formatFileSize(totalSize)} icon={<FileArchive size={22} />} tone="slate" subtitle="إجمالي الملفات" />
            <ExecutiveCard title="النواقص" value={missingRequired.length} icon={<AlertCircle size={22} />} tone={missingRequired.length > 0 ? "red" : "green"} subtitle="شواهد إلزامية" progress={percentage(totalRequired - missingRequired.length, totalRequired)} />
          </section>

          <SummaryCard
            title="التحليل الذكي لملف الإنجاز"
            description={aiRecommendation}
            tone={completionPercent >= 85 && rejectedCount === 0 ? "green" : rejectedCount > 0 ? "red" : "gold"}
            items={[
              { label: "نسبة الاكتمال", value: `${completionPercent}%` },
              { label: "الشواهد المرفوعة", value: portfolio.length },
              { label: "المعتمدة", value: approvedCount },
              { label: "قيد المراجعة", value: pendingCount },
              { label: "المرفوضة", value: rejectedCount },
              { label: "النواقص", value: missingRequired.length },
            ]}
            footer="التوصية مبنية على الشواهد الإلزامية وحالة الاعتماد ونسبة الاكتمال."
          />

          {canUpload && (
            <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm print:hidden">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#15445A]">رفع شاهد جديد</h2>
                  <p className="mt-1 text-sm text-slate-500">اسحب الملفات أو اخترها، ويمكن رفع أكثر من ملف دفعة واحدة.</p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={onDrop}
                  className={`flex min-h-[220px] flex-col items-center justify-center rounded-[28px] border-2 border-dashed p-6 text-center transition ${
                    dragActive ? "border-[#0DA9A6] bg-[#0DA9A6]/10" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFileInputChange} />

                  <UploadCloud className="mb-3 text-[#0DA9A6]" size={42} />
                  <h3 className="text-lg font-black text-[#15445A]">اسحب الملفات هنا</h3>
                  <p className="mt-2 text-sm text-slate-500">أو اضغط لاختيار الملفات من جهازك</p>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-black text-white"
                  >
                    اختيار ملفات
                  </button>
                </div>

                <div className="space-y-3">
                  <select
                    value={uploadForm.evidence_type_id}
                    onChange={(event) => {
                      const evidence = evidenceTypes.find((item) => String(item.id) === event.target.value);
                      setUploadForm((current) => ({
                        ...current,
                        evidence_type_id: event.target.value,
                        title: current.title || evidence?.evidence_name || "",
                        category: evidence?.evidence_name || current.category,
                      }));
                    }}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-[#0DA9A6]"
                  >
                    <option value="">اختر نوع الشاهد</option>
                    {evidenceTypes.map((evidence) => (
                      <option key={evidence.id} value={evidence.id}>
                        {evidence.evidence_name}
                      </option>
                    ))}
                  </select>

                  <input
                    value={uploadForm.title}
                    onChange={(event) => setUploadForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="عنوان الشاهد"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-[#0DA9A6]"
                  />

                  <input
                    value={uploadForm.category}
                    onChange={(event) => setUploadForm((current) => ({ ...current, category: event.target.value }))}
                    placeholder="التصنيف"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-[#0DA9A6]"
                  />

                  <input
                    type="date"
                    value={uploadForm.achievement_date}
                    onChange={(event) => setUploadForm((current) => ({ ...current, achievement_date: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-[#0DA9A6]"
                  />

                  <textarea
                    value={uploadForm.description}
                    onChange={(event) => setUploadForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="وصف مختصر للشاهد"
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:border-[#0DA9A6]"
                  />

                  {selectedFiles.length > 0 && (
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-black text-slate-500">الملفات المختارة</p>
                      <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600">
                            <span className="truncate">{file.name} — {formatFileSize(file.size)}</span>
                            <button type="button" onClick={() => clearSelectedFile(index)} className="text-red-600">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void uploadFiles()}
                    disabled={uploading}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#15445A] text-sm font-black text-white disabled:opacity-60"
                  >
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                    {uploading ? "جاري الرفع..." : `رفع ${selectedFiles.length || ""} ملف`}
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[.9fr_1.1fr]">
            <Panel title="تقدم العناصر" icon={<BarChart3 size={24} />}>
              {elementProgress.length === 0 ? (
                <EmptyBox text="لا توجد عناصر تقييم مضافة." />
              ) : (
                <div className="space-y-3">
                  {elementProgress.map((item) => (
                    <div key={item.element.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-black text-[#15445A]">
                            {item.element.element_number ? `${item.element.element_number}. ` : ""}
                            {item.element.element_name}
                          </h3>
                          <p className="mt-1 text-xs font-bold text-slate-500">{item.uploaded} من {item.total} شاهد إلزامي</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${item.complete ? "bg-[#07A869]/10 text-[#07A869]" : "bg-[#C1B489]/20 text-[#15445A]"}`}>
                          {item.percent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full ${item.complete ? "bg-[#07A869]" : "bg-[#C1B489]"}`} style={{ width: `${item.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="سجل النشاط الزمني" icon={<Clock size={24} />}>
              {timelineItems.length === 0 ? (
                <EmptyBox text="لا توجد أحداث في ملف الإنجاز." />
              ) : (
                <div className="relative space-y-3 before:absolute before:right-5 before:top-0 before:h-full before:w-px before:bg-slate-200">
                  {timelineItems.map((item) => (
                    <div key={item.id} className="relative pr-12">
                      <div className={`absolute right-0 top-3 flex h-10 w-10 items-center justify-center rounded-2xl border ${statusTone(item.review_status || item.status)}`}>
                        {fileIcon(item.file_type, item.file_name)}
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h3 className="font-black text-[#15445A]">{getEvidenceTitle(item, evidenceTypes)}</h3>
                          <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusTone(item.review_status || item.status)}`}>
                            {getStatusLabel(item.review_status || item.status)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{formatDateTime(item.created_at)} — {item.file_name || "بدون ملف"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </section>

          {missingRequired.length > 0 && (
            <section className="rounded-[28px] border border-red-100 bg-red-50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <AlertCircle className="text-red-700" size={22} />
                <h2 className="text-xl font-black text-red-800">الشواهد الإلزامية الناقصة</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {missingRequired.slice(0, 12).map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white p-4">
                    <p className="font-black text-[#15445A]">{item.evidence_name}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.description || "شاهد إلزامي يحتاج رفع."}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm print:hidden">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث في الشواهد أو الملفات أو التصنيفات...",
              }}
              filters={
                <>
                  <ToolbarSelect value={selectedElement} onChange={setSelectedElement}>
                    <option value="all">كل العناصر</option>
                    {elements.map((element) => (
                      <option key={element.id} value={String(element.id)}>
                        {element.element_name}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)}>
                    <option value="all">كل الحالات</option>
                    <option value="approved">معتمد</option>
                    <option value="pending">بانتظار</option>
                    <option value="rejected">مرفوض</option>
                  </ToolbarSelect>

                  <ToolbarSelect value={fileFilter} onChange={(value) => setFileFilter(value as FileFilter)}>
                    <option value="all">كل الملفات</option>
                    <option value="pdf">PDF</option>
                    <option value="image">صور</option>
                    <option value="office">Word / Excel / PPT</option>
                    <option value="other">أخرى</option>
                  </ToolbarSelect>
                </>
              }
              onRefresh={() => void fetchPortfolio()}
            />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[.85fr_1.15fr]">
            <Panel title="دليل الشواهد" icon={<Filter size={24} />}>
              {filteredEvidenceTypes.length === 0 ? (
                <EmptyBox text="لا توجد أنواع شواهد مطابقة." />
              ) : (
                <div className="space-y-3">
                  {filteredEvidenceTypes.map((evidence) => {
                    const uploads = evidenceUploadMap.get(evidence.id) || [];
                    const complete = uploads.length > 0;

                    return (
                      <div key={evidence.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-black text-[#15445A]">{evidence.evidence_name}</h3>
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {evidence.is_required === false ? "اختياري" : "إلزامي"}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${complete ? "bg-[#07A869]/10 text-[#07A869]" : "bg-[#C1B489]/20 text-[#15445A]"}`}>
                            {complete ? "مرفوع" : "ناقص"}
                          </span>
                        </div>
                        {evidence.description && <p className="line-clamp-2 text-sm leading-7 text-slate-500">{evidence.description}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel title="الشواهد المرفوعة" icon={<Paperclip size={24} />}>
              {filteredPortfolio.length === 0 ? (
                <EmptyBox text="لا توجد شواهد مطابقة للفلاتر الحالية." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredPortfolio.map((item) => (
                    <article key={item.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md">
                      {fileKind(item.file_type, item.file_name) === "image" && item.file_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.file_url} alt={item.file_name || "شاهد"} className="mb-3 h-40 w-full rounded-2xl object-cover" />
                      ) : (
                        <div className="mb-3 flex h-40 items-center justify-center rounded-2xl bg-white text-[#0DA9A6]">
                          {fileIcon(item.file_type, item.file_name)}
                        </div>
                      )}

                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black text-[#15445A]">{getEvidenceTitle(item, evidenceTypes)}</h3>
                          <p className="mt-1 text-xs font-bold text-slate-500">{item.file_name || "بدون ملف"} — {formatFileSize(item.file_size)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${statusTone(item.review_status || item.status)}`}>
                          {getStatusLabel(item.review_status || item.status)}
                        </span>
                      </div>

                      {item.description && <p className="mb-3 line-clamp-2 text-sm leading-7 text-slate-500">{item.description}</p>}

                      <div className="mb-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
                        <span className="rounded-xl bg-white px-3 py-2">التاريخ: {formatDate(item.achievement_date || item.created_at)}</span>
                        <span className="rounded-xl bg-white px-3 py-2">النوع: {fileKind(item.file_type, item.file_name)}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#15445A] px-3 text-xs font-black text-white"
                        >
                          <Eye size={15} />
                          معاينة
                        </button>

                        {item.file_url && (
                          <a
                            href={item.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-[#15445A]"
                          >
                            <ExternalLink size={15} />
                            فتح
                          </a>
                        )}

                        {canReview && (
                          <>
                            <button
                              type="button"
                              disabled={reviewingId === item.id}
                              onClick={() => void updateReviewStatus(item, "معتمد")}
                              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#07A869]/10 px-3 text-xs font-black text-[#07A869] disabled:opacity-60"
                            >
                              <CheckCircle2 size={15} />
                              اعتماد
                            </button>

                            <button
                              type="button"
                              disabled={reviewingId === item.id}
                              onClick={() => void updateReviewStatus(item, "مرفوض")}
                              className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-50 px-3 text-xs font-black text-red-700 disabled:opacity-60"
                            >
                              <XCircle size={15} />
                              رفض
                            </button>
                          </>
                        )}

                        {canUpload && (
                          <button
                            type="button"
                            disabled={reviewingId === item.id}
                            onClick={() => void deletePortfolioItem(item)}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-50 px-3 text-xs font-black text-red-700 disabled:opacity-60"
                          >
                            <Trash2 size={15} />
                            حذف
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </section>

          {previewItem && (
            <PreviewDialog item={previewItem} evidenceTypes={evidenceTypes} onClose={() => setPreviewItem(null)} />
          )}
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          {icon}
        </div>
        <h2 className="text-xl font-black text-[#15445A]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="rounded-[28px] bg-white p-6 text-center text-slate-500 shadow-sm">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#15445A]" />
        {text}
      </div>
    </div>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div className={`fixed left-5 top-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl print:hidden ${toast.type === "success" ? "bg-[#07A869]" : "bg-red-600"}`}>
      {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      {toast.message}
    </div>
  );
}

function PreviewDialog({
  item,
  evidenceTypes,
  onClose,
}: {
  item: PortfolioItem;
  evidenceTypes: EvidenceType[];
  onClose: () => void;
}) {
  const kind = fileKind(item.file_type, item.file_name);
  const title = getEvidenceTitle(item, evidenceTypes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm print:hidden">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-xl font-black text-[#15445A]">{title}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{item.file_name || "بدون ملف"}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-auto p-5">
          {item.file_url ? (
            kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.file_url} alt={title} className="mx-auto max-h-[65vh] rounded-2xl object-contain" />
            ) : kind === "pdf" ? (
              <iframe src={item.file_url} className="h-[65vh] w-full rounded-2xl border border-slate-100" title={title} />
            ) : (
              <div className="rounded-2xl bg-slate-50 p-10 text-center">
                <FileText className="mx-auto mb-4 text-[#0DA9A6]" size={54} />
                <p className="font-black text-[#15445A]">لا يمكن معاينة هذا النوع داخل الصفحة.</p>
                <a href={item.file_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-black text-white">
                  فتح الملف
                </a>
              </div>
            )
          ) : (
            <EmptyBox text="لا يوجد رابط ملف متاح للمعاينة." />
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileText,
  Layers3,
  School,
  Sparkles,
  Target,
  Plus,
  Power,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/lib/supabase";
import { ExportEngine } from "@/core";

type StageRow = {
  id: string;
  school_id: string;
  stage_name: string | null;
  stage_key?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

type SubjectRow = {
  id: string;
  school_id: string;
  stage_id?: string | null;
  subject_name: string | null;
  subject_code?: string | null;
  subject_type?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  stages?: StageRow | StageRow[] | null;
};

type SubjectView = SubjectRow & {
  displayName: string;
  displayCode: string;
  displayType: string;
  displayStage: string;
  statusLabel: "نشطة" | "غير نشطة";
};

type SubjectForm = {
  stage_id: string;
  subject_name: string;
  subject_code: string;
  subject_type: string;
  is_active: boolean;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type SubjectInsightTone = "green" | "gold" | "red" | "blue" | "teal";

type SubjectInsight = {
  title: string;
  description: string;
  tone: SubjectInsightTone;
  icon: ReactNode;
};

type SubjectHealth = {
  activeRate: number;
  stageCoverage: number;
  codeCoverage: number;
  typeCoverage: number;
  inactiveRate: number;
};

type DistributionItem = {
  name: string;
  count: number;
};


const PAGE_SIZE = 10;

const SUBJECT_TYPES = [
  "أساسية",
  "اختيارية",
  "مهارية",
  "نشاط",
  "تقويم",
];

const emptyForm: SubjectForm = {
  stage_id: "",
  subject_name: "",
  subject_code: "",
  subject_type: "أساسية",
  is_active: true,
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function getStageName(subject: SubjectRow) {
  const stage = Array.isArray(subject.stages)
    ? subject.stages[0]
    : subject.stages;

  return stage?.stage_name || "غير محدد";
}

function normalizeSubject(subject: SubjectRow): SubjectView {
  return {
    ...subject,
    displayName: subject.subject_name || "مادة بدون اسم",
    displayCode: subject.subject_code || "غير محدد",
    displayType: subject.subject_type || "أساسية",
    displayStage: getStageName(subject),
    statusLabel: subject.is_active === false ? "غير نشطة" : "نشطة",
  };
}

function toPayload(schoolId: string, form: SubjectForm) {
  return {
    school_id: schoolId,
    stage_id: form.stage_id || null,
    subject_name: form.subject_name.trim(),
    subject_code: form.subject_code.trim() || null,
    subject_type: form.subject_type.trim() || "أساسية",
    is_active: form.is_active,
  };
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "ar"));
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function insightTone(tone: SubjectInsightTone) {
  const tones: Record<SubjectInsightTone, string> = {
    green: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
    gold: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    red: "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    teal: "bg-[var(--app-teal-soft)] text-[var(--app-teal)]",
  };

  return tones[tone];
}

function progressTone(tone: SubjectInsightTone) {
  const tones: Record<SubjectInsightTone, string> = {
    green: "bg-[var(--app-green)]",
    gold: "bg-[var(--app-accent)]",
    red: "bg-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue)]",
    teal: "bg-[var(--app-teal)]",
  };

  return tones[tone];
}

function buildSubjectRecommendations(subject: SubjectView) {
  const recommendations: string[] = [];

  if (!subject.stage_id) {
    recommendations.push("اربط المادة بمرحلة دراسية لتظهر بدقة في الإسنادات والجداول.");
  }

  if (subject.displayCode === "غير محدد") {
    recommendations.push("أضف رمزًا للمادة لتحسين الاستيراد والتكامل والتقارير.");
  }

  if (subject.is_active === false) {
    recommendations.push("المادة غير نشطة ولن تكون متاحة لبعض المحركات الأكاديمية.");
  }

  if (subject.displayType === "غير محدد") {
    recommendations.push("حدد نوع المادة لرفع جودة البيانات.");
  }

  return recommendations.length
    ? recommendations
    : ["المادة مكتملة ولا توجد ملاحظات تشغيلية حرجة."];
}


export default function SubjectsPage() {
  const {
    currentSchool,
    currentRole,
    hasPermission,
    loading: schoolLoading,
  } = useSchool();

  const canManage =
    hasPermission("subjects.manage") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin";

  const canView =
    hasPermission("subjects.view") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin" ||
    currentRole === "vice_principal" ||
    currentRole === "administrative_staff" ||
    currentRole === "teacher";

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectView | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectView | null>(null);
  const [form, setForm] = useState<SubjectForm>(emptyForm);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadData = useCallback(async () => {
    if (!currentSchool?.id) {
      setSubjects([]);
      setStages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const schoolId = currentSchool.id;

      const [subjectsResult, stagesResult] = await Promise.allSettled([
        supabase
          .from("subjects")
          .select(
            `
            id,
            school_id,
            stage_id,
            subject_name,
            subject_code,
            subject_type,
            is_active,
            created_at,
            stages (
              id,
              school_id,
              stage_name,
              stage_key,
              sort_order,
              is_active
            )
          `,
          )
          .eq("school_id", schoolId)
          .order("subject_name", { ascending: true }),

        supabase
          .from("stages")
          .select("id, school_id, stage_name, stage_key, sort_order, is_active")
          .eq("school_id", schoolId)
          .order("sort_order", { ascending: true }),
      ]);

      if (subjectsResult.status === "fulfilled") {
        if (subjectsResult.value.error) throw subjectsResult.value.error;
        setSubjects((subjectsResult.value.data as SubjectRow[]) || []);
      }

      if (stagesResult.status === "fulfilled") {
        if (stagesResult.value.error) {
          setStages([]);
        } else {
          setStages((stagesResult.value.data as StageRow[]) || []);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر تحميل المواد الدراسية.";
      showToast("error", message);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, showToast]);

  useEffect(() => {
    if (!schoolLoading) {
      void loadData();
    }
  }, [schoolLoading, loadData]);

  useEffect(() => {
    setPage(1);
  }, [search, stageFilter, typeFilter, statusFilter]);

  const activeStages = useMemo(
    () => stages.filter((stage) => stage.is_active !== false),
    [stages],
  );

  const rows = useMemo(() => subjects.map(normalizeSubject), [subjects]);

  const subjectTypes = useMemo(
    () => uniqueValues(rows.map((row) => row.subject_type || row.displayType)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((subject) => {
      const text = [
        subject.displayName,
        subject.displayCode,
        subject.displayType,
        subject.displayStage,
        subject.statusLabel,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || text.includes(keyword);

      const matchesStage =
        stageFilter === "all" || subject.stage_id === stageFilter;

      const matchesType =
        typeFilter === "all" || subject.displayType === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && subject.is_active !== false) ||
        (statusFilter === "inactive" && subject.is_active === false);

      return matchesSearch && matchesStage && matchesType && matchesStatus;
    });
  }, [rows, search, stageFilter, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.is_active !== false).length;
    const inactive = rows.filter((row) => row.is_active === false).length;
    const stagesCount = new Set(rows.map((row) => row.stage_id).filter(Boolean))
      .size;
    const typesCount = new Set(rows.map((row) => row.displayType).filter(Boolean))
      .size;

    return {
      total: rows.length,
      filtered: filteredRows.length,
      active,
      inactive,
      stages: stagesCount,
      types: typesCount,
    };
  }, [rows, filteredRows.length]);

  const distributions = useMemo(() => {
    const count = (values: string[]): DistributionItem[] => {
      const map = new Map<string, number>();

      values.forEach((value) => {
        const key = value || "غير محدد";
        map.set(key, (map.get(key) || 0) + 1);
      });

      return Array.from(map.entries())
        .map(([name, countValue]) => ({ name, count: countValue }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      stages: count(rows.map((row) => row.displayStage)),
      types: count(rows.map((row) => row.displayType)),
      statuses: count(rows.map((row) => row.statusLabel)),
    };
  }, [rows]);

  const health = useMemo<SubjectHealth>(() => {
    const withStage = rows.filter((row) => Boolean(row.stage_id)).length;
    const withCode = rows.filter(
      (row) => row.displayCode !== "غير محدد" && row.displayCode !== "-",
    ).length;
    const knownTypes = rows.filter(
      (row) => Boolean(row.displayType) && row.displayType !== "غير محدد",
    ).length;

    return {
      activeRate: percentage(stats.active, stats.total),
      stageCoverage: percentage(withStage, stats.total),
      codeCoverage: percentage(withCode, stats.total),
      typeCoverage: percentage(knownTypes, stats.total),
      inactiveRate: percentage(stats.inactive, stats.total),
    };
  }, [rows, stats.active, stats.inactive, stats.total]);

  const subjectsWithoutStage = useMemo(
    () => rows.filter((row) => !row.stage_id),
    [rows],
  );

  const subjectsWithoutCode = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.displayCode === "غير محدد" || row.displayCode === "-",
      ),
    [rows],
  );

  const smartInsights = useMemo<SubjectInsight[]>(() => {
    const items: SubjectInsight[] = [];

    if (subjectsWithoutStage.length > 0) {
      items.push({
        title: "مواد بدون مرحلة",
        description: `يوجد ${subjectsWithoutStage.length} مادة غير مرتبطة بمرحلة دراسية.`,
        tone: "red",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    }

    if (subjectsWithoutCode.length > 0) {
      items.push({
        title: "رموز مواد ناقصة",
        description: `${subjectsWithoutCode.length} مادة لا تحتوي على رمز واضح.`,
        tone: "gold",
        icon: <Target className="h-5 w-5" />,
      });
    }

    if (stats.inactive > 0) {
      items.push({
        title: "مواد غير نشطة",
        description: `يوجد ${stats.inactive} مادة معطلة وتحتاج إلى مراجعة.`,
        tone: "blue",
        icon: <XCircle className="h-5 w-5" />,
      });
    }

    if (distributions.stages.length > 0) {
      const topStage = distributions.stages[0];
      items.push({
        title: "أعلى مرحلة من حيث المواد",
        description: `${topStage.name} تضم ${topStage.count} مادة.`,
        tone: "teal",
        icon: <School className="h-5 w-5" />,
      });
    }

    if (items.length === 0) {
      items.push({
        title: "هيكلة المواد مستقرة",
        description: "لا توجد مؤشرات حرجة في المرحلة أو الرمز أو الحالة.",
        tone: "green",
        icon: <Sparkles className="h-5 w-5" />,
      });
    }

    return items.slice(0, 4);
  }, [
    distributions.stages,
    stats.inactive,
    subjectsWithoutCode.length,
    subjectsWithoutStage.length,
  ]);

  function runSmartSearch(command: string) {
    const value = command.trim().toLowerCase();

    setSearch("");
    setStageFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");

    if (value.includes("بدون مرحلة")) {
      setSearch("غير محدد");
      return;
    }

    if (value.includes("غير نشطة")) {
      setStatusFilter("inactive");
      return;
    }

    const matchingType = subjectTypes.find((type) =>
      value.includes(type.toLowerCase()),
    );

    if (matchingType) {
      setTypeFilter(matchingType);
      return;
    }

    setSearch(command.replace("مواد", "").trim());
  }

  function openCreateForm() {
    setEditingSubject(null);
    setForm({
      ...emptyForm,
      stage_id: activeStages[0]?.id || "",
    });
    setFormOpen(true);
  }

  function openEditForm(subject: SubjectView) {
    setEditingSubject(subject);
    setForm({
      stage_id: subject.stage_id || "",
      subject_name: subject.subject_name || "",
      subject_code: subject.subject_code || "",
      subject_type: subject.subject_type || "أساسية",
      is_active: subject.is_active !== false,
    });
    setFormOpen(true);
  }

  function closeForm() {
    setEditingSubject(null);
    setForm(emptyForm);
    setFormOpen(false);
  }

  async function submitForm() {
    if (!canManage) {
      showToast("error", "لا تملك صلاحية إدارة المواد.");
      return;
    }

    if (!currentSchool?.id) {
      showToast("error", "لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      return;
    }

    if (!form.subject_name.trim()) {
      showToast("error", "اسم المادة مطلوب.");
      return;
    }

    setSaving(true);

    try {
      const payload = toPayload(currentSchool.id, form);

      const { error } = editingSubject
        ? await supabase
            .from("subjects")
            .update(payload)
            .eq("id", editingSubject.id)
            .eq("school_id", currentSchool.id)
        : await supabase.from("subjects").insert(payload);

      if (error) throw error;

      showToast(
        "success",
        editingSubject ? "تم تحديث المادة بنجاح." : "تم إنشاء المادة بنجاح.",
      );

      closeForm();
      await loadData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر حفظ المادة.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(subject: SubjectView) {
    if (!canManage || !currentSchool?.id) return;

    const nextStatus = subject.is_active === false;
    const confirmed = window.confirm(
      nextStatus ? "هل تريد تفعيل هذه المادة؟" : "هل تريد تعطيل هذه المادة؟",
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("subjects")
        .update({ is_active: nextStatus })
        .eq("id", subject.id)
        .eq("school_id", currentSchool.id);

      if (error) throw error;

      showToast(
        "success",
        nextStatus ? "تم تفعيل المادة." : "تم تعطيل المادة.",
      );

      await loadData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر تغيير حالة المادة.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function removeSubject(subject: SubjectView) {
    if (!canManage || !currentSchool?.id) return;

    const confirmed = window.confirm(
      `سيتم حذف المادة "${subject.displayName}" نهائيًا. هل أنت متأكد؟`,
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", subject.id)
        .eq("school_id", currentSchool.id);

      if (error) throw error;

      if (selectedSubject?.id === subject.id) {
        setSelectedSubject(null);
      }

      showToast("success", "تم حذف المادة بنجاح.");
      await loadData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر حذف المادة.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  function exportExcel() {
    ExportEngine.excel("قائمة-المواد", filteredRows, [
      { header: "اسم المادة", key: "displayName" },
      { header: "رمز المادة", key: "displayCode" },
      { header: "نوع المادة", key: "displayType" },
      { header: "المرحلة", key: "displayStage" },
      { header: "الحالة", key: "statusLabel" },
      { header: "تاريخ الإضافة", key: "created_at" },
    ]);
  }

  function exportPDF() {
    ExportEngine.pdf("المواد الدراسية", filteredRows, [
      { header: "اسم المادة", key: "displayName" },
      { header: "رمز المادة", key: "displayCode" },
      { header: "النوع", key: "displayType" },
      { header: "المرحلة", key: "displayStage" },
      { header: "الحالة", key: "statusLabel" },
    ]);
  }

  if (!canView) {
    return (
      <AuthGuard>
        <PageContainer size="wide" className="space-y-5">
          <Breadcrumb />

          <SummaryCard
            title="لا تملك صلاحية الوصول إلى المواد الدراسية"
            description="هذه الصفحة مخصصة للإدارة المدرسية حسب الصلاحيات."
            tone="gold"
            icon={<BookOpen size={22} />}
          />
        </PageContainer>
      </AuthGuard>
    );
  }

  if (schoolLoading) {
    return (
      <AuthGuard>
        <PageContainer size="wide" className="space-y-5">
          <Breadcrumb />
          <LoadingBox text="جاري تحميل بيانات المدرسة..." />
        </PageContainer>
      </AuthGuard>
    );
  }

  if (!currentSchool) {
    return (
      <AuthGuard>
        <PageContainer size="wide" className="space-y-5">
          <Breadcrumb />

          <SummaryCard
            title="لا توجد مدرسة مرتبطة"
            description="لا توجد مدرسة مرتبطة بالمستخدم الحالي."
            tone="red"
            icon={<BookOpen size={22} />}
          />
        </PageContainer>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <PageContainer size="wide" className="space-y-5">
        <Breadcrumb />

        {toast && <ToastBox toast={toast} />}
        <PageHeader
          variant="hero"
          title="المواد الدراسية"
          description={`${currentSchool.school_name} — إدارة المواد وربطها بالمراحل، لتكون أساسًا لإسناد المعلمين والجداول والدرجات والتقارير.`}
          badge="الإدارة الأكاديمية"
          icon={<BookOpen size={18} />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "المواد الدراسية" },
          ]}
          meta={[
            { label: "المدرسة", value: currentSchool.school_name },
            { label: "المواد الظاهرة", value: filteredRows.length },
            { label: "المراحل المرتبطة", value: stats.stages },
            { label: "أنواع المواد", value: stats.types },
          ]}
          stats={[
            { label: "إجمالي المواد", value: stats.total, icon: <BookOpen size={20} />, tone: "blue" },
            { label: "مواد نشطة", value: stats.active, icon: <CheckCircle2 size={20} />, tone: "green" },
            { label: "غير نشطة", value: stats.inactive, icon: <XCircle size={20} />, tone: stats.inactive > 0 ? "red" : "green" },
            { label: "نتائج البحث", value: stats.filtered, icon: <FileText size={20} />, tone: "teal" },
          ]}
          actions={
            <>
              {canManage && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#C1B489] px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Plus size={17} />
                  إضافة مادة
                </button>
              )}

              <button
                type="button"
                onClick={exportExcel}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Download size={17} />
                Excel
              </button>

              <button
                type="button"
                onClick={exportPDF}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Printer size={17} />
                PDF
              </button>

              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
              >
                <RefreshCcw size={17} className={loading ? "animate-spin" : ""} />
                تحديث
              </button>
            </>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <ExecutiveCard
            title="إجمالي المواد"
            value={stats.total}
            subtitle="كل المواد المسجلة"
            icon={<BookOpen size={22} />}
            tone="blue"
            progress={stats.total > 0 ? 100 : 0}
          />
          <ExecutiveCard
            title="نتائج البحث"
            value={stats.filtered}
            subtitle={`من ${stats.total} مادة`}
            icon={<FileText size={22} />}
            tone="primary"
            progress={stats.total ? Math.round((stats.filtered / stats.total) * 100) : 0}
          />
          <ExecutiveCard
            title="مواد نشطة"
            value={stats.active}
            subtitle="جاهزة للإسناد والاستخدام"
            icon={<CheckCircle2 size={22} />}
            tone="green"
            progress={stats.total ? Math.round((stats.active / stats.total) * 100) : 0}
          />
          <ExecutiveCard
            title="مواد غير نشطة"
            value={stats.inactive}
            subtitle={stats.inactive > 0 ? "تحتاج مراجعة" : "لا توجد مواد معطلة"}
            icon={<XCircle size={22} />}
            tone={stats.inactive > 0 ? "red" : "green"}
            progress={stats.total ? Math.round((stats.inactive / stats.total) * 100) : 0}
          />
          <ExecutiveCard
            title="أنواع المواد"
            value={stats.types}
            subtitle={`${stats.stages} مراحل مرتبطة`}
            icon={<Layers3 size={22} />}
            tone="gold"
          />
        </section>

        <SummaryCard
          title="الملخص التنفيذي للمواد"
          description="قراءة سريعة لحالة المواد الدراسية وربطها بالمراحل والأنواع والحالة التشغيلية."
          tone={stats.inactive > 0 ? "gold" : "green"}
          items={[
            { label: "إجمالي المواد", value: stats.total },
            { label: "المواد النشطة", value: stats.active },
            { label: "غير النشطة", value: stats.inactive },
            { label: "نتائج البحث", value: stats.filtered },
            { label: "المراحل المرتبطة", value: stats.stages },
            { label: "أنواع المواد", value: stats.types },
          ]}
          footer="تستخدم المواد في إسناد المعلمين والجداول والدرجات؛ لذلك يفضل ضبط المرحلة والنوع قبل اعتمادها."
        />


        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <SubjectExecutiveAnalytics
            stats={stats}
            health={health}
            distributions={distributions}
          />

          <SubjectSmartInsights insights={smartInsights} />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <SubjectHealthPanel health={health} />

          <SubjectDistributionPanel
            title="توزيع المواد حسب المراحل"
            items={distributions.stages}
          />

          <SubjectDistributionPanel
            title="توزيع المواد حسب الأنواع"
            items={distributions.types}
          />
        </section>

        <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm print:hidden">
          <div className="mb-4">
            <h2 className="text-xl font-black text-[var(--app-text)]">
              البحث الذكي في المواد
            </h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              جرّب: مواد الرياضيات، مواد أساسية، مواد غير نشطة، مواد بدون مرحلة.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {["مواد الرياضيات", "مواد أساسية", "مواد غير نشطة", "مواد بدون مرحلة"].map((command) => (
              <button
                key={command}
                type="button"
                onClick={() => runSmartSearch(command)}
                className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-2 text-sm font-black text-[var(--app-text)] transition hover:-translate-y-0.5 hover:border-[var(--app-teal)] hover:text-[var(--app-teal)]"
              >
                {command}
              </button>
            ))}
          </div>
        </section>

        {formOpen && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {editingSubject ? (
                  <Edit3 className="text-[#C1B489]" />
                ) : (
                  <Plus className="text-[#C1B489]" />
                )}

                <h2 className="text-xl font-black text-[#15445A]">
                  {editingSubject ? "تعديل مادة" : "إضافة مادة"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold"
              >
                إغلاق
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                value={form.stage_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stage_id: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#0DA9A6]"
              >
                <option value="">بدون مرحلة</option>
                {activeStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.stage_name || "مرحلة بدون اسم"}
                  </option>
                ))}
              </select>

              <Input
                placeholder="اسم المادة"
                value={form.subject_name}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    subject_name: value,
                  }))
                }
              />

              <Input
                placeholder="رمز المادة"
                value={form.subject_code}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    subject_code: value,
                  }))
                }
              />

              <select
                value={form.subject_type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subject_type: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#0DA9A6]"
              >
                {SUBJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
                {!SUBJECT_TYPES.includes(form.subject_type) && (
                  <option value={form.subject_type}>{form.subject_type}</option>
                )}
              </select>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
                المادة نشطة
              </label>
            </div>

            <button
              type="button"
              onClick={() => void submitForm()}
              disabled={saving}
              className="mt-5 flex items-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </section>
        )}

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-5 flex flex-col gap-4 print:hidden">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-[#15445A]">
                    قائمة المواد
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    عرض {pagedRows.length} من {filteredRows.length} مادة
                  </p>
                </div>
              </div>

              <div className="grid w-full gap-3 lg:grid-cols-4">
                <div className="relative lg:col-span-2">
                  <Search
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="ابحث باسم المادة أو الرمز أو المرحلة..."
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-4 pr-10 outline-none focus:border-[#0DA9A6]"
                  />
                </div>

                <select
                  value={stageFilter}
                  onChange={(event) => setStageFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
                >
                  <option value="all">كل المراحل</option>
                  {activeStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.stage_name || "مرحلة بدون اسم"}
                    </option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
                >
                  <option value="all">كل الأنواع</option>
                  {subjectTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as "all" | "active" | "inactive",
                    )
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0DA9A6] lg:col-span-2"
                >
                  <option value="all">كل الحالات</option>
                  <option value="active">نشطة</option>
                  <option value="inactive">غير نشطة</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-right text-sm text-slate-500">
                    <th className="rounded-r-2xl px-4 py-3">المادة</th>
                    <th className="px-4 py-3">الرمز</th>
                    <th className="px-4 py-3">المرحلة</th>
                    <th className="px-4 py-3">النوع</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3">تاريخ الإضافة</th>
                    <th className="rounded-l-2xl px-4 py-3 print:hidden">
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {!loading &&
                    pagedRows.map((subject) => (
                      <tr
                        key={subject.id}
                        className="border-b border-slate-50 text-sm transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <div className="font-black text-[#15445A]">
                            {subject.displayName}
                          </div>
                          <div className="mt-1 text-xs font-bold text-slate-400">
                            رقم السجل: {subject.id.slice(0, 8)}
                          </div>
                        </td>

                        <td className="px-4 py-3">{subject.displayCode}</td>
                        <td className="px-4 py-3">{subject.displayStage}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                            {subject.displayType}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <SubjectStatusBadge active={subject.is_active !== false} />
                        </td>

                        <td className="px-4 py-3">
                          {formatDate(subject.created_at)}
                        </td>

                        <td className="px-4 py-3 print:hidden">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedSubject(subject)}
                              className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                              title="عرض مختصر"
                            >
                              <Eye size={16} />
                            </button>

                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditForm(subject)}
                                  className="rounded-xl bg-[#3D7EB9]/10 p-2 text-[#3D7EB9] hover:bg-[#3D7EB9]/20"
                                  title="تعديل"
                                >
                                  <Edit3 size={16} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void toggleActive(subject)}
                                  className="rounded-xl bg-[#C1B489]/20 p-2 text-[#15445A] hover:bg-[#C1B489]/30"
                                  title={
                                    subject.is_active === false
                                      ? "تفعيل"
                                      : "تعطيل"
                                  }
                                >
                                  <Power size={16} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void removeSubject(subject)}
                                  className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                  title="حذف"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {loading && (
                <div className="py-10 text-center text-slate-500">
                  جاري تحميل المواد الدراسية...
                </div>
              )}

              {!loading && filteredRows.length === 0 && (
                <div className="py-10 text-center text-slate-500">
                  لا توجد مواد مطابقة للبحث
                </div>
              )}
            </div>

            {!loading && filteredRows.length > 0 && (
              <div className="mt-5 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  عرض {pagedRows.length} من {filteredRows.length}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page === 1}
                    className="rounded-xl border p-2 disabled:opacity-40"
                  >
                    <ChevronRight size={18} />
                  </button>

                  <span className="text-sm font-bold text-slate-700">
                    {page} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((value) => Math.min(totalPages, value + 1))
                    }
                    disabled={page === totalPages}
                    className="rounded-xl border p-2 disabled:opacity-40"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <SubjectSideCard
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
          />
        </section>
      </PageContainer>
    </AuthGuard>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl print:hidden ${
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      <span>{toast.message}</span>
    </div>
  );
}

function Input({
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#0DA9A6]"
    />
  );
}

function SubjectStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        active ? "bg-[#07A869]/10 text-[#07A869]" : "bg-red-50 text-red-700"
      }`}
    >
      {active ? "نشطة" : "غير نشطة"}
    </span>
  );
}

function SubjectSideCard({
  selectedSubject,
  setSelectedSubject,
}: {
  selectedSubject: SubjectView | null;
  setSelectedSubject: (subject: SubjectView | null) => void;
}) {
  if (!selectedSubject) {
    return (
      <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="flex min-h-[350px] items-center justify-center rounded-3xl bg-slate-50 text-center">
          <div>
            <BookOpen size={42} className="mx-auto text-[#C1B489]" />
            <h3 className="mt-4 text-xl font-black text-[#15445A]">
              اختر مادة
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              اضغط على أيقونة العين لعرض تفاصيل المادة
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#15445A]">
          تفاصيل المادة
        </h2>

        <button
          type="button"
          onClick={() => setSelectedSubject(null)}
          className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
        >
          <X size={18} />
        </button>
      </div>

      <div className="rounded-[28px] bg-[#15445A] p-5 text-white">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C1B489] text-[#15445A]">
            <BookOpen size={28} />
          </div>

          <div>
            <h3 className="text-2xl font-black text-[#C1B489]">
              {selectedSubject.displayName}
            </h3>

            <p className="text-sm text-slate-300">
              {selectedSubject.displayStage}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoMini title="رمز المادة" value={selectedSubject.displayCode} />
          <InfoMini title="النوع" value={selectedSubject.displayType} />
          <InfoMini title="المرحلة" value={selectedSubject.displayStage} />
          <InfoMini title="الحالة" value={selectedSubject.statusLabel} />
          <InfoMini title="تاريخ الإضافة" value={formatDate(selectedSubject.created_at)} />
          <InfoMini title="المعرّف" value={selectedSubject.id.slice(0, 8)} />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <SubjectDrawerSection
          title="Overview"
          items={[
            `اسم المادة: ${selectedSubject.displayName}`,
            `الرمز: ${selectedSubject.displayCode}`,
            `النوع: ${selectedSubject.displayType}`,
            `الحالة: ${selectedSubject.statusLabel}`,
          ]}
        />

        <SubjectDrawerSection
          title="Academic Linking"
          items={[
            `المرحلة: ${selectedSubject.displayStage}`,
            "تستخدم في إسناد المعلمين والجداول والدرجات.",
            "صحة بيانات المادة تؤثر مباشرة في المحركات الأكاديمية.",
          ]}
        />

        <SubjectDrawerSection
          title="AI Recommendations"
          items={buildSubjectRecommendations(selectedSubject)}
        />

        <SubjectDrawerSection
          title="Timeline"
          items={[
            `تاريخ الإضافة: ${formatDate(selectedSubject.created_at)}`,
            "تمت مراجعة الرمز والمرحلة والحالة تلقائيًا.",
            "تم تحليل جاهزية المادة للاستخدام الأكاديمي.",
          ]}
        />
      </div>
    </div>
  );
}

function InfoMini({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs text-slate-300">{title}</p>
      <p className="mt-1 truncate font-black text-white">{value}</p>
    </div>
  );
}

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-6 text-center text-slate-500 shadow-sm">
      <RefreshCcw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#15445A]" />
      {text}
    </div>
  );
}


function SubjectExecutiveAnalytics({
  stats,
  health,
  distributions,
}: {
  stats: {
    total: number;
    filtered: number;
    active: number;
    inactive: number;
    stages: number;
    types: number;
  };
  health: SubjectHealth;
  distributions: {
    stages: DistributionItem[];
    types: DistributionItem[];
    statuses: DistributionItem[];
  };
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black text-[var(--app-text)]">
          Executive Analytics
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          قراءة تنفيذية لجاهزية المواد وربطها بالمراحل والأنواع.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SubjectMetric label="معدل النشاط" value={`${health.activeRate}%`} icon={<Activity size={18} />} tone="green" />
        <SubjectMetric label="تغطية المراحل" value={`${health.stageCoverage}%`} icon={<School size={18} />} tone="blue" />
        <SubjectMetric label="اكتمال الرموز" value={`${health.codeCoverage}%`} icon={<Target size={18} />} tone="teal" />
        <SubjectMetric label="اكتمال الأنواع" value={`${health.typeCoverage}%`} icon={<Layers3 size={18} />} tone="gold" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <SubjectInfoLine
          label="أكثر مرحلة"
          value={distributions.stages[0]?.name || "-"}
        />
        <SubjectInfoLine
          label="أكثر نوع"
          value={distributions.types[0]?.name || "-"}
        />
      </div>
    </section>
  );
}

function SubjectSmartInsights({ insights }: { insights: SubjectInsight[] }) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
          <BrainCircuit size={20} />
          AI Smart Insights
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          توصيات تشغيلية مبنية على بيانات المواد الحالية.
        </p>
      </div>

      <div className="space-y-3">
        {insights.map((item) => (
          <div
            key={item.title}
            className="flex gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${insightTone(item.tone)}`}>
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-black text-[var(--app-text)]">{item.title}</p>
              <p className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SubjectHealthPanel({ health }: { health: SubjectHealth }) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--app-text)]">Subject Health</h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مؤشرات جودة واكتمال بيانات المواد.
      </p>

      <div className="mt-5 space-y-4">
        <SubjectProgress label="المواد النشطة" value={health.activeRate} total={100} tone="green" suffix="%" />
        <SubjectProgress label="ربط المراحل" value={health.stageCoverage} total={100} tone="blue" suffix="%" />
        <SubjectProgress label="اكتمال الرموز" value={health.codeCoverage} total={100} tone="teal" suffix="%" />
        <SubjectProgress label="المواد غير النشطة" value={health.inactiveRate} total={100} tone="red" suffix="%" />
      </div>
    </section>
  );
}

function SubjectDistributionPanel({
  title,
  items,
}: {
  title: string;
  items: DistributionItem[];
}) {
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--app-text)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        توزيع المواد حسب البيانات المسجلة.
      </p>

      <div className="mt-5 space-y-4">
        {items.slice(0, 6).map((item) => (
          <SubjectProgress
            key={item.name}
            label={item.name}
            value={item.count}
            total={max}
            tone="blue"
          />
        ))}

        {items.length === 0 && (
          <p className="text-sm text-[var(--app-text-muted)]">لا توجد بيانات.</p>
        )}
      </div>
    </section>
  );
}

function SubjectMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: SubjectInsightTone;
}) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${insightTone(tone)}`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function SubjectInfoLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[var(--app-card-soft)] px-3 py-2">
      <span className="text-xs font-bold text-[var(--app-text-muted)]">{label}</span>
      <span className="text-sm font-black text-[var(--app-text)]">{value}</span>
    </div>
  );
}

function SubjectProgress({
  label,
  value,
  total,
  tone,
  suffix = "",
}: {
  label: string;
  value: number;
  total: number;
  tone: SubjectInsightTone;
  suffix?: string;
}) {
  const width = Math.min(100, Math.max(4, percentage(value, total)));

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-[var(--app-text-muted)]">
        <span>{label}</span>
        <span>{value}{suffix}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--app-card-soft)]">
        <div className={`h-full rounded-full ${progressTone(tone)}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function SubjectDrawerSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="mb-2 text-sm font-black text-[#15445A]">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <p key={item} className="text-xs leading-6 text-slate-500">{item}</p>
        ))}
      </div>
    </div>
  );
}

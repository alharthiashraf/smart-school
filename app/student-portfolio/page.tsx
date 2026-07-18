"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageContainer from "@/components/layout/PageContainer";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExportButton from "@/components/ui/buttons/ExportButton";
import PageLoader from "@/components/ui/loading/PageLoader";
import ErrorState from "@/components/ui/feedback/ErrorState";
import UiEmptyState from "@/components/ui/empty-state/EmptyState";

import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  AlertTriangle,
  Award,
  BookOpenCheck,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  GraduationCap,
  Medal,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UserRound,
} from "lucide-react";

type Student = {
  id: string;
  school_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  student_email?: string | null;
  national_id?: string | null;
  grade_name?: string | null;
  classroom_name?: string | null;
  status?: string | null;
  user_id?: string | null;
  auth_user_id?: string | null;
};

type PortfolioItem = {
  id: string;
  student_id: string;
  source: string;
  title: string;
  category: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  status: string | null;
  points: number | null;
  item_date: string | null;
  created_at: string | null;
};

type StudentQueryResult = {
  data: Student[] | null;
  error: { message?: string } | null;
};

type StudentQuery = {
  limit: (count: number) => PromiseLike<StudentQueryResult>;
};

type CategoryKey =
  | "all"
  | "achievement"
  | "certificate"
  | "activity"
  | "competition"
  | "project"
  | "file"
  | "other";

const STUDENT_ROLES: SchoolRole[] = ["super_admin", "school_admin", "student"];

const EXPORT_HEADERS = [
  "#",
  "اسم الطالب",
  "رقم الهوية",
  "الصف",
  "الفصل",
  "العنوان",
  "التصنيف",
  "الوصف",
  "الحالة",
  "النقاط",
  "التاريخ",
  "اسم الملف",
  "المصدر",
];

const CATEGORY_OPTIONS: { value: CategoryKey; label: string }[] = [
  { value: "all", label: "كل التصنيفات" },
  { value: "achievement", label: "إنجاز" },
  { value: "certificate", label: "شهادة" },
  { value: "activity", label: "نشاط" },
  { value: "competition", label: "مسابقة" },
  { value: "project", label: "مشروع" },
  { value: "file", label: "ملف" },
  { value: "other", label: "أخرى" },
];

function formatDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function todayFileStamp() {
  return new Date().toISOString().slice(0, 10);
}

function pickText(row: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function pickNumber(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== null && value !== undefined && value !== "") {
      const numberValue = Number(value);
      if (Number.isFinite(numberValue)) return numberValue;
    }
  }

  return null;
}

function normalizeCategory(value?: string | null): CategoryKey {
  const text = String(value || "").trim().toLowerCase();

  if (!text) return "other";
  if (["achievement", "achievements", "إنجاز", "انجاز", "إنجازات", "انجازات"].includes(text)) return "achievement";
  if (["certificate", "certificates", "شهادة", "شهادات"].includes(text)) return "certificate";
  if (["activity", "activities", "نشاط", "أنشطة", "انشطة"].includes(text)) return "activity";
  if (["competition", "competitions", "مسابقة", "مسابقات", "منافسة"].includes(text)) return "competition";
  if (["project", "projects", "مشروع", "مشاريع"].includes(text)) return "project";
  if (["file", "files", "ملف", "ملفات", "مرفق", "مرفقات"].includes(text)) return "file";

  if (text.includes("إنجاز") || text.includes("انجاز")) return "achievement";
  if (text.includes("شهادة")) return "certificate";
  if (text.includes("نشاط")) return "activity";
  if (text.includes("مسابقة")) return "competition";
  if (text.includes("مشروع")) return "project";
  if (text.includes("ملف") || text.includes("مرفق")) return "file";

  return "other";
}

function categoryLabel(category?: string | null) {
  const key = normalizeCategory(category);

  if (key === "achievement") return "إنجاز";
  if (key === "certificate") return "شهادة";
  if (key === "activity") return "نشاط";
  if (key === "competition") return "مسابقة";
  if (key === "project") return "مشروع";
  if (key === "file") return "ملف";
  return "أخرى";
}

function categoryClass(category?: string | null) {
  const key = normalizeCategory(category);

  if (key === "achievement") {
    return "border-[color-mix(in_srgb,var(--app-success)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]";
  }

  if (key === "certificate") {
    return "border-[color-mix(in_srgb,var(--app-primary)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)] text-[var(--app-primary)]";
  }

  if (key === "activity") {
    return "border-[color-mix(in_srgb,var(--app-primary)_24%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_8%,transparent)] text-[var(--app-primary)]";
  }

  if (key === "competition") {
    return "border-[color-mix(in_srgb,var(--app-accent)_30%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";
  }

  if (key === "project") {
    return "border-[color-mix(in_srgb,var(--app-primary)_22%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_8%,transparent)] text-[var(--app-primary)]";
  }

  if (key === "file") {
    return "border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text)]";
  }

  return "border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]";
}

function categoryIcon(category?: string | null) {
  const key = normalizeCategory(category);

  if (key === "achievement") return <Award className="h-4 w-4" aria-hidden="true" />;
  if (key === "certificate") return <Medal className="h-4 w-4" aria-hidden="true" />;
  if (key === "activity") return <Sparkles className="h-4 w-4" aria-hidden="true" />;
  if (key === "competition") return <Trophy className="h-4 w-4" aria-hidden="true" />;
  if (key === "project") return <BookOpenCheck className="h-4 w-4" aria-hidden="true" />;
  if (key === "file") return <FileText className="h-4 w-4" aria-hidden="true" />;

  return <Star className="h-4 w-4" aria-hidden="true" />;
}

function statusLabel(status?: string | null) {
  const text = String(status || "").trim();
  if (!text) return "معتمد";

  const lower = text.toLowerCase();

  if (["approved", "active", "published", "معتمد", "منشور"].includes(lower)) return "معتمد";
  if (["pending", "review", "بانتظار المراجعة", "قيد المراجعة"].includes(lower)) return "قيد المراجعة";
  if (["rejected", "مرفوض"].includes(lower)) return "مرفوض";

  return text;
}

function statusClass(status?: string | null) {
  const label = statusLabel(status);

  if (label === "معتمد") {
    return "border-[color-mix(in_srgb,var(--app-success)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]";
  }

  if (label === "قيد المراجعة") {
    return "border-[color-mix(in_srgb,var(--app-accent)_30%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";
  }

  if (label === "مرفوض") {
    return "border-[color-mix(in_srgb,var(--app-danger)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)]";
  }

  return "border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]";
}

async function safeSingleStudentQuery(query: StudentQuery) {
  const { data, error } = await query.limit(1);

  if (error) throw error;

  return Array.isArray(data) && data.length ? data[0] : null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

function mapPortfolioRow(row: Record<string, unknown>, source: string): PortfolioItem {
  const category = pickText(
    row,
    ["category", "type", "item_type", "achievement_type", "file_type"],
    source === "student_files" ? "file" : "achievement",
  );

  return {
    id: String(row.id),
    student_id: String(row.student_id),
    source,
    title: pickText(
      row,
      ["title", "name", "achievement_title", "file_name", "certificate_name"],
      "عنصر في ملف الإنجاز",
    ),
    category,
    description: pickText(row, ["description", "details", "notes", "summary"], "") || null,
    file_url: pickText(row, ["file_url", "url", "attachment_url", "certificate_url"], "") || null,
    file_name: pickText(row, ["file_name", "attachment_name", "name"], "") || null,
    status: pickText(row, ["status", "approval_status"], "معتمد"),
    points: pickNumber(row, ["points", "score", "achievement_points"]),
    item_date:
      pickText(
        row,
        [
          "item_date",
          "achievement_date",
          "certificate_date",
          "activity_date",
          "competition_date",
          "uploaded_at",
          "created_at",
        ],
        "",
      ) || null,
    created_at: String(row.created_at || row.uploaded_at || "") || null,
  };
}

export default function StudentPortfolioPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();
  const schoolId = currentSchool?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [currentEmail, setCurrentEmail] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [items, setItems] = useState<PortfolioItem[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [search, setSearch] = useState("");

  const findStudentForCurrentUser = useCallback(
    async (userId: string, email: string) => {
      const buildQuery = (
        column: "auth_user_id" | "user_id" | "email" | "student_email",
        value: string,
      ) => {
        let query = supabase.from("students").select("*").eq(column, value);

        if (schoolId) {
          query = query.eq("school_id", schoolId);
        }

        return query;
      };

      const attempts = [
        () => safeSingleStudentQuery(buildQuery("auth_user_id", userId)),
        () => safeSingleStudentQuery(buildQuery("user_id", userId)),
        () => safeSingleStudentQuery(buildQuery("email", email)),
        () => safeSingleStudentQuery(buildQuery("student_email", email)),
      ];

      for (const attempt of attempts) {
        try {
          const result = await attempt();

          if (result) {
            return result;
          }
        } catch {
          // بعض الأعمدة قد لا تكون موجودة في كل نسخة من قاعدة البيانات.
        }
      }

      return null;
    },
    [schoolId],
  );

  const loadFromTable = useCallback(
    async (tableName: string, studentId: string) => {
      try {
        let query = supabase.from(tableName).select("*").eq("student_id", studentId);

        if (schoolId) query = query.eq("school_id", schoolId);

        const { data, error: tableError } = await query;

        if (tableError) throw tableError;

        return ((data || []) as Record<string, unknown>[]).map((row) =>
          mapPortfolioRow(row, tableName),
        );
      } catch {
        try {
          const { data, error: fallbackError } = await supabase
            .from(tableName)
            .select("*")
            .eq("student_id", studentId);

          if (fallbackError) throw fallbackError;

          return ((data || []) as Record<string, unknown>[]).map((row) =>
            mapPortfolioRow(row, tableName),
          );
        } catch {
          return [];
        }
      }
    },
    [schoolId],
  );

  const loadPortfolioItems = useCallback(
    async (studentId: string) => {
      const [portfolioRows, achievementRows, certificateRows, fileRows] = await Promise.all([
        loadFromTable("student_portfolio", studentId),
        loadFromTable("student_achievements", studentId),
        loadFromTable("student_certificates", studentId),
        loadFromTable("student_files", studentId),
      ]);

      return [...portfolioRows, ...achievementRows, ...certificateRows, ...fileRows].sort((first, second) => {
        const dateA = first.item_date || first.created_at || "";
        const dateB = second.item_date || second.created_at || "";
        return dateB.localeCompare(dateA);
      });
    },
    [loadFromTable],
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");

        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw new Error(userError.message);

        const userId = user?.id || "";
        const email = user?.email || "";

        setCurrentEmail(email);

        if (!userId || !email) {
          setStudent(null);
          setItems([]);
          setError("تعذر التعرف على حساب الطالب الحالي.");
          return;
        }

        const currentStudent = await findStudentForCurrentUser(userId, email);

        if (!currentStudent) {
          setStudent(null);
          setItems([]);
          return;
        }

        setStudent(currentStudent);

        const rows = await loadPortfolioItems(currentStudent.id);
        setItems(rows);
      } catch (loadError) {
        setError(getErrorMessage(loadError, "حدث خطأ أثناء تحميل ملف الإنجاز."));
        setStudent(null);
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [findStudentForCurrentUser, loadPortfolioItems],
  );

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();

    items.forEach((item) => {
      const label = statusLabel(item.status);
      if (label) set.add(label);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [items]);

  const filteredItems = useMemo(() => {
    const text = search.trim().toLowerCase();

    return items.filter((item) => {
      const category = normalizeCategory(item.category);

      const matchesCategory = selectedCategory === "all" || category === selectedCategory;
      const matchesStatus = selectedStatus === "all" || statusLabel(item.status) === selectedStatus;

      const matchesSearch =
        !text ||
        String(item.title || "").toLowerCase().includes(text) ||
        String(item.description || "").toLowerCase().includes(text) ||
        String(item.file_name || "").toLowerCase().includes(text) ||
        String(categoryLabel(item.category)).toLowerCase().includes(text);

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [items, selectedCategory, selectedStatus, search]);

  const stats = useMemo(() => {
    const total = filteredItems.length;
    const achievements = filteredItems.filter((item) => normalizeCategory(item.category) === "achievement").length;
    const certificates = filteredItems.filter((item) => normalizeCategory(item.category) === "certificate").length;
    const activities = filteredItems.filter((item) => normalizeCategory(item.category) === "activity").length;
    const competitions = filteredItems.filter((item) => normalizeCategory(item.category) === "competition").length;
    const files = filteredItems.filter((item) => !!item.file_url).length;
    const totalPoints = filteredItems.reduce((sum, item) => sum + (item.points || 0), 0);

    return {
      total,
      achievements,
      certificates,
      activities,
      competitions,
      files,
      totalPoints,
    };
  }, [filteredItems]);

  const exportRows = useMemo<(string | number | null | undefined)[][]>(() => {
    return filteredItems.map((item, index) => [
      index + 1,
      student?.full_name || "—",
      student?.national_id || "—",
      student?.grade_name || "—",
      student?.classroom_name || "—",
      item.title || "—",
      categoryLabel(item.category),
      item.description || "—",
      statusLabel(item.status),
      item.points ?? "—",
      formatDate(item.item_date || item.created_at),
      item.file_name || "—",
      item.source,
    ]);
  }, [filteredItems, student]);

  function handleExportPDF() {
    exportTableToPDF({
      title: "تقرير ملف إنجاز الطالب",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: student?.full_name
        ? `ملف إنجاز الطالب: ${student.full_name}`
        : "ملف إنجاز الطالب",
      headers: EXPORT_HEADERS,
      rows: exportRows,
      fileName: `student-portfolio-report-${todayFileStamp()}.pdf`,
    });
  }

  async function handleExportExcel() {
    await exportTableToExcel({
      title: "تقرير ملف إنجاز الطالب",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: student?.full_name
        ? `ملف إنجاز الطالب: ${student.full_name}`
        : "ملف إنجاز الطالب",
      headers: EXPORT_HEADERS,
      rows: exportRows,
      fileName: `student-portfolio-report-${todayFileStamp()}.xlsx`,
      sheetName: "Portfolio",
    });
  }

  if (schoolLoading) {
    return (
      <RoleGuard allowedRoles={STUDENT_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل بيانات المدرسة..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool) {
    return (
      <RoleGuard allowedRoles={STUDENT_ROLES}>
        <AppShell>
          <ErrorState description="لا توجد مدرسة مرتبطة بالمستخدم الحالي." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={STUDENT_ROLES}>
      <AppShell>
        <PageContainer size="wide" className="space-y-5">
          <Breadcrumb />
          <PageHeader
            variant="hero"
            title="ملف إنجازي"
            description="تعرض هذه الصفحة إنجازات الطالب وشهاداته ومشاركاته وملفاته المرتبطة بحسابه في منصة المدرسة الذكية."
            badge="بوابة الطالب"
            icon={<GraduationCap size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة الطالب", href: "/student-portal" },
              { label: "ملف الإنجاز" },
            ]}
            meta={[
              { label: "الطالب", value: student?.full_name || "طالب بدون اسم" },
              { label: "الصف", value: student?.grade_name || "—" },
              { label: "الفصل", value: student?.classroom_name || "—" },
              { label: "البريد", value: currentEmail || "—" },
            ]}
            stats={[
              { label: "إجمالي العناصر", value: stats.total, icon: <FolderOpen size={20} aria-hidden="true" />, tone: "primary" },
              { label: "الإنجازات", value: stats.achievements, icon: <Award size={20} aria-hidden="true" />, tone: "green" },
              { label: "الشهادات", value: stats.certificates, icon: <Medal size={20} aria-hidden="true" />, tone: "gold" },
              { label: "النقاط", value: stats.totalPoints, icon: <Star size={20} aria-hidden="true" />, tone: stats.totalPoints > 0 ? "green" : "slate" },
            ]}
            actions={
              <>
                <SecondaryButton
                  icon={<RefreshCcw className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => void loadData(true)}
                  loading={refreshing}
                >
                  تحديث
                </SecondaryButton>

                <ExportButton
                  icon={<FileText className="h-4 w-4" aria-hidden="true" />}
                  onClick={handleExportPDF}
                  disabled={!filteredItems.length}
                >
                  PDF
                </ExportButton>

                <ExportButton
                  icon={
                    <FileSpreadsheet
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  }
                  onClick={() => void handleExportExcel()}
                  disabled={!exportRows.length}
                >
                  Excel
                </ExportButton>
              </>
            }
          />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
            <ExecutiveCard
              title="إجمالي العناصر"
              value={stats.total}
              subtitle="حسب الفلاتر الحالية"
              icon={<FolderOpen className="h-5 w-5" aria-hidden="true" />}
              tone="primary"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="إنجازات"
              value={stats.achievements}
              subtitle="سجلات الإنجاز"
              icon={<Award className="h-5 w-5" aria-hidden="true" />}
              tone="green"
              progress={stats.total ? Math.round((stats.achievements / stats.total) * 100) : 0}
            />

            <ExecutiveCard
              title="شهادات"
              value={stats.certificates}
              subtitle="الشهادات المرفقة"
              icon={<Medal className="h-5 w-5" aria-hidden="true" />}
              tone="gold"
              progress={stats.total ? Math.round((stats.certificates / stats.total) * 100) : 0}
            />

            <ExecutiveCard
              title="أنشطة"
              value={stats.activities}
              subtitle="المشاركات"
              icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
              tone="primary"
              progress={stats.total ? Math.round((stats.activities / stats.total) * 100) : 0}
            />

            <ExecutiveCard
              title="مسابقات"
              value={stats.competitions}
              subtitle="المنافسات"
              icon={<Trophy className="h-5 w-5" aria-hidden="true" />}
              tone="primary"
              progress={stats.total ? Math.round((stats.competitions / stats.total) * 100) : 0}
            />

            <ExecutiveCard
              title="مرفقات"
              value={stats.files}
              subtitle="روابط ملفات"
              icon={<FileText className="h-5 w-5" aria-hidden="true" />}
              tone="primary"
              progress={stats.total ? Math.round((stats.files / stats.total) * 100) : 0}
            />

            <ExecutiveCard
              title="النقاط"
              value={stats.totalPoints}
              subtitle="مجموع النقاط"
              icon={<Star className="h-5 w-5" aria-hidden="true" />}
              tone={stats.totalPoints > 0 ? "green" : "primary"}
            />
          </section>

          <SummaryCard
            title="ملخص ملف الإنجاز"
            description="قراءة سريعة لتوزيع إنجازات الطالب وشهاداته ومرفقاته حسب الفلاتر الحالية."
            tone={stats.total > 0 ? "green" : "gold"}
            items={[
              { label: "إجمالي العناصر", value: stats.total },
              { label: "إنجازات", value: stats.achievements },
              { label: "شهادات", value: stats.certificates },
              { label: "أنشطة", value: stats.activities },
              { label: "مسابقات", value: stats.competitions },
              { label: "النقاط", value: stats.totalPoints },
            ]}
            footer="يتم عرض العناصر من جداول ملف الإنجاز والإنجازات والشهادات والملفات المرتبطة بالطالب."
          />

          <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث بعنوان الإنجاز، الوصف، أو اسم الملف...",
              }}
              filters={
                <>
                  <ToolbarSelect
                    value={selectedCategory}
                    onChange={(value) => setSelectedCategory(value as CategoryKey)}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={selectedStatus} onChange={setSelectedStatus}>
                    <option value="all">كل الحالات</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </ToolbarSelect>
                </>
              }
              onRefresh={() => void loadData(true)}
              onExportPDF={handleExportPDF}
            onExportExcel={() => void handleExportExcel()}
          />

          {error && <ErrorState description={error} />}

          {loading ? (
            <PageLoader text="جاري تحميل ملف الإنجاز..." />
          ) : !student ? (
            <UiEmptyState
              icon={<UserRound className="h-9 w-9" aria-hidden="true" />}
              title="لم يتم العثور على حساب طالب مرتبط"
              description="تأكد أن حساب الطالب مرتبط في جدول students عبر auth_user_id أو user_id أو email أو student_email."
            />
          ) : !filteredItems.length ? (
            <UiEmptyState
              icon={<FolderOpen className="h-9 w-9" aria-hidden="true" />}
              title="لا توجد عناصر في ملف الإنجاز"
              description="لم يتم تسجيل إنجازات أو شهادات أو ملفات مرتبطة بحساب الطالب حتى الآن."
            />
          ) : (
            <section className="grid gap-4 lg:grid-cols-2">
              {filteredItems.map((item) => (
                <PortfolioCard key={`${item.source}-${item.id}`} item={item} />
              ))}
            </section>
          )}
        </PageContainer>
      </AppShell>
    </RoleGuard>
  );
}

function PortfolioCard({ item }: { item: PortfolioItem }) {
  return (
    <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-[var(--app-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--app-shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]">
            {categoryIcon(item.category)}
          </div>

          <div className="min-w-0">
            <h3 className="line-clamp-2 font-black text-[var(--app-text)]">{item.title}</h3>
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">
              {formatDate(item.item_date || item.created_at)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${categoryClass(item.category)}`}>
            {categoryIcon(item.category)}
            {categoryLabel(item.category)}
          </span>

          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(item.status)}`}>
            {statusLabel(item.status)}
          </span>
        </div>
      </div>

      <p className="mt-4 min-h-[44px] text-sm leading-7 text-[var(--app-text-muted)]">
        {item.description || "لا يوجد وصف مسجل لهذا العنصر."}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--app-border)] pt-3">
        <div className="flex flex-wrap gap-2 text-xs text-[var(--app-text-muted)]">
          <span className="rounded-full bg-[var(--app-card-soft)] px-3 py-1 font-semibold">
            المصدر: {item.source}
          </span>

          <span className="rounded-full bg-[var(--app-card-soft)] px-3 py-1 font-semibold">
            النقاط: {item.points ?? "—"}
          </span>
        </div>

        {item.file_url ? (
          <a
            href={item.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] px-4 py-2 text-xs font-bold text-[var(--app-primary-foreground)] transition hover:opacity-90"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            فتح المرفق
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-2 text-xs font-bold text-[var(--app-text-muted)]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            بدون مرفق
          </span>
        )}
      </div>
    </div>
  );
}



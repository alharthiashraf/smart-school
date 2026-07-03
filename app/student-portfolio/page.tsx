"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

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
  AlertTriangle,
  Award,
  BookOpenCheck,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  GraduationCap,
  Loader2,
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

type QueryLimitResult<T> = {
  data: T[] | null;
  error: unknown;
};

type LimitableQuery<T> = {
  limit: (count: number) => PromiseLike<QueryLimitResult<T>>;
};

type EqCapableQuery<T> = T & {
  eq: (column: string, value: string) => T;
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

  if (key === "achievement") return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
  if (key === "certificate") return "border-[#3D7EB9]/20 bg-[#3D7EB9]/10 text-[#3D7EB9]";
  if (key === "activity") return "border-purple-200 bg-purple-50 text-purple-700";
  if (key === "competition") return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";
  if (key === "project") return "border-[#0DA9A6]/20 bg-[#0DA9A6]/10 text-[#0DA9A6]";
  if (key === "file") return "border-slate-200 bg-slate-50 text-slate-700";

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function categoryIcon(category?: string | null) {
  const key = normalizeCategory(category);

  if (key === "achievement") return <Award className="h-4 w-4" />;
  if (key === "certificate") return <Medal className="h-4 w-4" />;
  if (key === "activity") return <Sparkles className="h-4 w-4" />;
  if (key === "competition") return <Trophy className="h-4 w-4" />;
  if (key === "project") return <BookOpenCheck className="h-4 w-4" />;
  if (key === "file") return <FileText className="h-4 w-4" />;

  return <Star className="h-4 w-4" />;
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

  if (label === "معتمد") return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
  if (label === "قيد المراجعة") return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";
  if (label === "مرفوض") return "border-red-200 bg-red-50 text-red-700";

  return "border-slate-200 bg-slate-50 text-slate-600";
}

async function safeSingleStudentQuery(query: LimitableQuery<Student>) {
  const { data, error } = await query.limit(1);

  if (error) throw error;

  return Array.isArray(data) && data.length ? data[0] : null;
}

function applySchoolFilter<T>(query: T, schoolId: string | null) {
  if (!schoolId) return query;
  return (query as EqCapableQuery<T>).eq("school_id", schoolId);
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
  const { currentSchool } = useSchool();
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
      const attempts = [
        () =>
          safeSingleStudentQuery(
            applySchoolFilter(supabase.from("students").select("*").eq("auth_user_id", userId), schoolId),
          ),
        () =>
          safeSingleStudentQuery(
            applySchoolFilter(supabase.from("students").select("*").eq("user_id", userId), schoolId),
          ),
        () =>
          safeSingleStudentQuery(
            applySchoolFilter(supabase.from("students").select("*").eq("email", email), schoolId),
          ),
        () =>
          safeSingleStudentQuery(
            applySchoolFilter(supabase.from("students").select("*").eq("student_email", email), schoolId),
          ),
      ];

      for (const attempt of attempts) {
        try {
          const result = await attempt();
          if (result) return result;
        } catch {
          // بعض الأعمدة قد لا تكون موجودة في كل مشروع، لذلك نكمل المحاولات.
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

  const exportRows = useMemo(() => {
    return filteredItems.map((item, index) => ({
      "#": index + 1,
      "اسم الطالب": student?.full_name || "—",
      "رقم الهوية": student?.national_id || "—",
      "الصف": student?.grade_name || "—",
      "الفصل": student?.classroom_name || "—",
      "العنوان": item.title || "—",
      "التصنيف": categoryLabel(item.category),
      "الوصف": item.description || "—",
      "الحالة": statusLabel(item.status),
      "النقاط": item.points ?? "—",
      "التاريخ": formatDate(item.item_date || item.created_at),
      "اسم الملف": item.file_name || "—",
      "المصدر": item.source,
    }));
  }, [filteredItems, student]);

  function handleExportPDF() {
    exportTableToPDF({
      title: "تقرير ملف إنجاز الطالب",
      fileName: `student-portfolio-report-${todayFileStamp()}.pdf`,
      rows: exportRows,
    } as any);
  }

  async function handleExportExcel() {
    await exportTableToExcel({
      fileName: `student-portfolio-report-${todayFileStamp()}.xlsx`,
      sheetName: "Portfolio",
      rows: exportRows,
    } as any);
  }

  return (
    <RoleGuard allowedRoles={STUDENT_ROLES}>
      <AppShell>
        <main dir="rtl" className="space-y-5">
          <PageHeader
            variant="hero"
            title="ملف إنجازي"
            description="تعرض هذه الصفحة إنجازات الطالب وشهاداته ومشاركاته وملفاته المرتبطة بحسابه في منصة المدرسة الذكية."
            badge="بوابة الطالب"
            icon={<GraduationCap size={18} />}
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
              { label: "إجمالي العناصر", value: stats.total, icon: <FolderOpen size={20} />, tone: "blue" },
              { label: "الإنجازات", value: stats.achievements, icon: <Award size={20} />, tone: "green" },
              { label: "الشهادات", value: stats.certificates, icon: <Medal size={20} />, tone: "gold" },
              { label: "النقاط", value: stats.totalPoints, icon: <Star size={20} />, tone: stats.totalPoints > 0 ? "green" : "slate" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void loadData(true)}
                  disabled={refreshing}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  تحديث
                </button>

                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={!filteredItems.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </button>

                <button
                  type="button"
                  onClick={() => void handleExportExcel()}
                  disabled={!exportRows.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </button>
              </>
            }
          />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
            <ExecutiveCard
              title="إجمالي العناصر"
              value={stats.total}
              subtitle="حسب الفلاتر الحالية"
              icon={<FolderOpen className="h-5 w-5" />}
              tone="blue"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="إنجازات"
              value={stats.achievements}
              subtitle="سجلات الإنجاز"
              icon={<Award className="h-5 w-5" />}
              tone="green"
              progress={stats.total ? Math.round((stats.achievements / stats.total) * 100) : 0}
            />

            <ExecutiveCard
              title="شهادات"
              value={stats.certificates}
              subtitle="الشهادات المرفقة"
              icon={<Medal className="h-5 w-5" />}
              tone="gold"
              progress={stats.total ? Math.round((stats.certificates / stats.total) * 100) : 0}
            />

            <ExecutiveCard
              title="أنشطة"
              value={stats.activities}
              subtitle="المشاركات"
              icon={<Sparkles className="h-5 w-5" />}
              tone="teal"
              progress={stats.total ? Math.round((stats.activities / stats.total) * 100) : 0}
            />

            <ExecutiveCard
              title="مسابقات"
              value={stats.competitions}
              subtitle="المنافسات"
              icon={<Trophy className="h-5 w-5" />}
              tone="primary"
              progress={stats.total ? Math.round((stats.competitions / stats.total) * 100) : 0}
            />

            <ExecutiveCard
              title="مرفقات"
              value={stats.files}
              subtitle="روابط ملفات"
              icon={<FileText className="h-5 w-5" />}
              tone="blue"
              progress={stats.total ? Math.round((stats.files / stats.total) * 100) : 0}
            />

            <ExecutiveCard
              title="النقاط"
              value={stats.totalPoints}
              subtitle="مجموع النقاط"
              icon={<Star className="h-5 w-5" />}
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

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
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
          </section>

          {error && (
            <div className="rounded-[28px] border border-red-100 bg-red-50 p-4 text-sm leading-7 text-red-700">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">تعذر تحميل البيانات</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <LoadingBox />
          ) : !student ? (
            <EmptyState
              icon={<UserRound className="h-9 w-9" />}
              title="لم يتم العثور على حساب طالب مرتبط"
              description="تأكد أن حساب الطالب مرتبط في جدول students عبر auth_user_id أو user_id أو email أو student_email."
            />
          ) : !filteredItems.length ? (
            <EmptyState
              icon={<FolderOpen className="h-9 w-9" />}
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
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function PortfolioCard({ item }: { item: PortfolioItem }) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
            {categoryIcon(item.category)}
          </div>

          <div className="min-w-0">
            <h3 className="line-clamp-2 font-black text-[#15445A]">{item.title}</h3>
            <p className="mt-1 text-xs text-slate-500">
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

      <p className="mt-4 min-h-[44px] text-sm leading-7 text-slate-600">
        {item.description || "لا يوجد وصف مسجل لهذا العنصر."}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-50 px-3 py-1 font-semibold">
            المصدر: {item.source}
          </span>

          <span className="rounded-full bg-slate-50 px-3 py-1 font-semibold">
            النقاط: {item.points ?? "—"}
          </span>
        </div>

        {item.file_url ? (
          <a
            href={item.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#15445A] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0DA9A6]"
          >
            <ExternalLink className="h-4 w-4" />
            فتح المرفق
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500">
            <ShieldCheck className="h-4 w-4" />
            بدون مرفق
          </span>
        )}
      </div>
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-slate-100 bg-white">
      <div className="flex flex-col items-center gap-3 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <p className="text-sm font-bold">جاري تحميل ملف الإنجاز...</p>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-slate-100 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          {icon}
        </div>

        <h2 className="mt-4 text-xl font-black text-[#15445A]">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

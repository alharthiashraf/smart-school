"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Printer,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";

import RoleGuard from "@/components/auth/RoleGuard";
import AppShell from "@/components/layout/AppShell";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExportButton from "@/components/ui/buttons/ExportButton";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import ErrorState from "@/components/ui/feedback/ErrorState";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import { PageLoader } from "@/components/ui/loading";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, {
  ToolbarSelect,
} from "@/components/ui/page/PageToolbar";
import Section from "@/components/ui/page/PageSection";

import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToExcel } from "@/lib/exports/excel";
import { exportTableToPDF } from "@/lib/exports/pdf";
import type { SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type Teacher = {
  id: string;
  school_id: string | null;
  full_name: string;
  employee_number: string | null;
  subject: string | null;
  department: string | null;
  status: string | null;
};

type EvidenceType = {
  id: number;
  element_id: number;
  evidence_name: string;
  is_required: boolean;
};

type PortfolioItem = {
  id: string;
  teacher_id: string;
  school_id: string;
  evidence_type_id: number | null;
  category: string;
  review_status: string | null;
};

type PortfolioStatus =
  | "مكتمل"
  | "قيد الاستكمال"
  | "يحتاج متابعة"
  | "متعثر";

type TeacherPortfolioSummary = {
  teacher: Teacher;
  uploadedRequired: number;
  totalRequired: number;
  missing: number;
  completionPercent: number;
  approved: number;
  pending: number;
  rejected: number;
  status: PortfolioStatus;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type ExportData = {
  title: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
};

type StatusTone = "primary" | "green" | "gold" | "red";

const PAGE_ROLES: readonly SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
];

const STATUS_OPTIONS: readonly PortfolioStatus[] = [
  "مكتمل",
  "قيد الاستكمال",
  "يحتاج متابعة",
  "متعثر",
];

function formatDateTime(value?: string | null) {
  if (!value) return "غير متوفر";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "غير متوفر";
  }

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeStatus(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function isApproved(status?: string | null) {
  return ["معتمد", "approved", "accepted"].includes(
    normalizeStatus(status),
  );
}

function isRejected(status?: string | null) {
  return ["مرفوض", "rejected"].includes(
    normalizeStatus(status),
  );
}

function isPending(status?: string | null) {
  const value = normalizeStatus(status);

  return (
    !value ||
    ["بانتظار المراجعة", "pending", "review"].includes(
      value,
    )
  );
}

function getStatusTone(
  status: PortfolioStatus,
): StatusTone {
  if (status === "مكتمل") return "green";
  if (status === "قيد الاستكمال") return "primary";
  if (status === "يحتاج متابعة") return "gold";

  return "red";
}

function getProgressClass(value: number) {
  if (value >= 80) return "bg-[var(--app-success)]";
  if (value >= 50) return "bg-[var(--app-accent)]";

  return "bg-[var(--app-danger)]";
}

export default function PortfolioMonitorPage() {
  const { currentSchool, loading: schoolLoading } =
    useSchool();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [evidenceTypes, setEvidenceTypes] = useState<
    EvidenceType[]
  >([]);
  const [portfolioItems, setPortfolioItems] = useState<
    PortfolioItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState("");

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] =
    useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | PortfolioStatus
  >("all");

  const showToast = useCallback(
    (type: Toast["type"], message: string) => {
      setToast({ type, message });

      window.setTimeout(() => {
        setToast(null);
      }, 3200);
    },
    [],
  );

  const fetchMonitorData = useCallback(async () => {
    if (!currentSchool?.id) {
      setTeachers([]);
      setEvidenceTypes([]);
      setPortfolioItems([]);
      setLoading(false);
      setErrorMsg("لا توجد مدرسة مرتبطة بالحساب.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const [
        teachersResult,
        evidenceResult,
        portfolioResult,
      ] = await Promise.allSettled([
        supabase
          .from("teachers")
          .select(
            "id, school_id, full_name, employee_number, subject, department, status",
          )
          .eq("school_id", currentSchool.id)
          .order("full_name", { ascending: true }),

        supabase
          .from("teacher_evidence_types")
          .select(
            "id, element_id, evidence_name, is_required",
          )
          .eq("is_required", true)
          .order("element_id", { ascending: true }),

        supabase
          .from("teacher_portfolio")
          .select(
            "id, teacher_id, school_id, evidence_type_id, category, review_status",
          )
          .eq("school_id", currentSchool.id),
      ]);

      const nextTeachers =
        teachersResult.status === "fulfilled" &&
        !teachersResult.value.error
          ? ((teachersResult.value.data as Teacher[]) ?? [])
          : [];

      const nextEvidenceTypes =
        evidenceResult.status === "fulfilled" &&
        !evidenceResult.value.error
          ? ((evidenceResult.value.data as EvidenceType[]) ??
            [])
          : [];

      const nextPortfolioItems =
        portfolioResult.status === "fulfilled" &&
        !portfolioResult.value.error
          ? ((portfolioResult.value.data as PortfolioItem[]) ??
            [])
          : [];

      setTeachers(nextTeachers);
      setEvidenceTypes(nextEvidenceTypes);
      setPortfolioItems(nextPortfolioItems);

      const hasError = [
        teachersResult,
        evidenceResult,
        portfolioResult,
      ].some(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" &&
            result.value.error),
      );

      if (hasError) {
        setErrorMsg("تعذر تحميل بعض بيانات الملفات.");
      }

      setLastSync(new Date().toISOString());
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "تعذر تحميل بيانات الملفات.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id]);

  useEffect(() => {
    if (schoolLoading) return;

    void fetchMonitorData();
  }, [fetchMonitorData, schoolLoading]);

  const totalRequired = evidenceTypes.length;

  const teacherSummaries =
    useMemo<TeacherPortfolioSummary[]>(() => {
      return teachers.map((teacher) => {
        const teacherPortfolio = portfolioItems.filter(
          (item) => item.teacher_id === teacher.id,
        );

        const uploadedRequired = evidenceTypes.filter(
          (evidence) => {
            const byId = teacherPortfolio.some(
              (item) =>
                item.evidence_type_id === evidence.id,
            );

            const byName = teacherPortfolio.some(
              (item) =>
                item.category === evidence.evidence_name,
            );

            return byId || byName;
          },
        ).length;

        const completionPercent =
          totalRequired > 0
            ? Math.round(
                (uploadedRequired / totalRequired) * 100,
              )
            : 0;

        const approved = teacherPortfolio.filter((item) =>
          isApproved(item.review_status),
        ).length;

        const rejected = teacherPortfolio.filter((item) =>
          isRejected(item.review_status),
        ).length;

        const pending = teacherPortfolio.filter((item) =>
          isPending(item.review_status),
        ).length;

        const status: PortfolioStatus =
          completionPercent >= 100
            ? "مكتمل"
            : completionPercent >= 80
              ? "قيد الاستكمال"
              : completionPercent >= 50
                ? "يحتاج متابعة"
                : "متعثر";

        return {
          teacher,
          uploadedRequired,
          totalRequired,
          missing: Math.max(
            totalRequired - uploadedRequired,
            0,
          ),
          completionPercent,
          approved,
          pending,
          rejected,
          status,
        };
      });
    }, [
      evidenceTypes,
      portfolioItems,
      teachers,
      totalRequired,
    ]);

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(
          teachers
            .map((teacher) => teacher.subject)
            .filter(Boolean) as string[],
        ),
      ).sort((a, b) => a.localeCompare(b, "ar")),
    [teachers],
  );

  const filteredSummaries = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return teacherSummaries
      .filter((summary) => {
        const searchableText = [
          summary.teacher.full_name,
          summary.teacher.employee_number,
          summary.teacher.subject,
          summary.teacher.department,
          summary.teacher.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !keyword || searchableText.includes(keyword);

        const matchesSubject =
          subjectFilter === "all" ||
          summary.teacher.subject === subjectFilter;

        const matchesStatus =
          statusFilter === "all" ||
          summary.status === statusFilter;

        return (
          matchesSearch &&
          matchesSubject &&
          matchesStatus
        );
      })
      .sort(
        (a, b) =>
          a.completionPercent - b.completionPercent,
      );
  }, [
    search,
    statusFilter,
    subjectFilter,
    teacherSummaries,
  ]);

  const summaryStats = useMemo(() => {
    const completed = teacherSummaries.filter(
      (item) => item.status === "مكتمل",
    ).length;

    const inProgress = teacherSummaries.filter(
      (item) => item.status === "قيد الاستكمال",
    ).length;

    const needFollow = teacherSummaries.filter(
      (item) => item.status === "يحتاج متابعة",
    ).length;

    const blocked = teacherSummaries.filter(
      (item) => item.status === "متعثر",
    ).length;

    const averageCompletion =
      teacherSummaries.length > 0
        ? Math.round(
            teacherSummaries.reduce(
              (sum, item) =>
                sum + item.completionPercent,
              0,
            ) / teacherSummaries.length,
          )
        : 0;

    return {
      completed,
      inProgress,
      needFollow,
      blocked,
      averageCompletion,
      approved: teacherSummaries.reduce(
        (sum, item) => sum + item.approved,
        0,
      ),
      pending: teacherSummaries.reduce(
        (sum, item) => sum + item.pending,
        0,
      ),
      rejected: teacherSummaries.reduce(
        (sum, item) => sum + item.rejected,
        0,
      ),
      missing: teacherSummaries.reduce(
        (sum, item) => sum + item.missing,
        0,
      ),
    };
  }, [teacherSummaries]);

  const resetFilters = useCallback(() => {
    setSearch("");
    setSubjectFilter("all");
    setStatusFilter("all");
  }, []);

  const getExportData = useCallback(
    (): ExportData => ({
      title: "تقرير متابعة ملفات الإنجاز",
      headers: [
        "اسم المعلم",
        "الرقم الوظيفي",
        "المادة",
        "القسم",
        "نسبة الإنجاز",
        "الشواهد المكتملة",
        "الشواهد المطلوبة",
        "المتبقي",
        "معتمد",
        "بانتظار المراجعة",
        "مرفوض",
        "الحالة",
      ],
      rows: filteredSummaries.map((summary) => [
        summary.teacher.full_name,
        summary.teacher.employee_number || "",
        summary.teacher.subject || "",
        summary.teacher.department || "",
        `${summary.completionPercent}%`,
        summary.uploadedRequired,
        summary.totalRequired,
        summary.missing,
        summary.approved,
        summary.pending,
        summary.rejected,
        summary.status,
      ]),
    }),
    [filteredSummaries],
  );

  const exportPDF = useCallback(() => {
    const data = getExportData();

    exportTableToPDF({
      title: data.title,
      schoolName:
        currentSchool?.school_name ||
        "منصة المدرسة الذكية",
      subtitle: "متابعة ملفات الإنجاز",
      headers: data.headers,
      rows: data.rows,
      fileName: `${data.title}.pdf`,
    });

    showToast("success", "تم تصدير PDF.");
  }, [
    currentSchool?.school_name,
    getExportData,
    showToast,
  ]);

  const exportExcel = useCallback(() => {
    const data = getExportData();

    exportTableToExcel({
      title: data.title,
      schoolName:
        currentSchool?.school_name ||
        "منصة المدرسة الذكية",
      subtitle: "متابعة ملفات الإنجاز",
      headers: data.headers,
      rows: data.rows,
      fileName: `${data.title}.xlsx`,
    });

    showToast("success", "تم تصدير Excel.");
  }, [
    currentSchool?.school_name,
    getExportData,
    showToast,
  ]);

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل ملفات الإنجاز..." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-6" dir="rtl">
          {toast ? (
            <div className="fixed left-5 top-5 z-50 w-[min(420px,calc(100%-2rem))] print:hidden">
              {toast.type === "success" ? (
                <SuccessBanner
                  description={toast.message}
                />
              ) : (
                <ErrorState
                  description={toast.message}
                />
              )}
            </div>
          ) : null}

          <PageHeader
            variant="hero"
            title="متابعة ملفات الإنجاز"
            description="متابعة الإنجاز والنواقص وحالات المراجعة."
            badge="مراقبة الشواهد"
            icon={
              <Award size={18} aria-hidden="true" />
            }
            breadcrumbs={[
              {
                label: "لوحة التحكم",
                href: "/dashboard",
              },
              {
                label: "متابعة ملفات الإنجاز",
              },
            ]}
            lastUpdated={formatDateTime(lastSync)}
            meta={[
              {
                label: "المدرسة",
                value:
                  currentSchool?.school_name ||
                  "غير متوفر",
              },
              {
                label: "المعلمون",
                value: teachers.length,
              },
              {
                label: "الشواهد المطلوبة",
                value: totalRequired,
              },
              {
                label: "النتائج",
                value: filteredSummaries.length,
              },
            ]}
            stats={[
              {
                label: "متوسط الإنجاز",
                value: `${summaryStats.averageCompletion}%`,
                icon: (
                  <TrendingUp
                    size={20}
                    aria-hidden="true"
                  />
                ),
                tone:
                  summaryStats.averageCompletion >= 80
                    ? "green"
                    : summaryStats.averageCompletion >= 50
                      ? "gold"
                      : "red",
              },
              {
                label: "مكتمل",
                value: summaryStats.completed,
                icon: (
                  <CheckCircle2
                    size={20}
                    aria-hidden="true"
                  />
                ),
                tone: "green",
              },
              {
                label: "بحاجة متابعة",
                value:
                  summaryStats.needFollow +
                  summaryStats.blocked,
                icon: (
                  <AlertCircle
                    size={20}
                    aria-hidden="true"
                  />
                ),
                tone:
                  summaryStats.needFollow +
                    summaryStats.blocked >
                  0
                    ? "red"
                    : "primary",
              },
              {
                label: "المتبقي",
                value: summaryStats.missing,
                icon: (
                  <ShieldCheck
                    size={20}
                    aria-hidden="true"
                  />
                ),
                tone:
                  summaryStats.missing > 0
                    ? "gold"
                    : "green",
              },
            ]}
            actions={
              <>
                <SecondaryButton
                  onClick={() =>
                    void fetchMonitorData()
                  }
                  disabled={loading}
                >
                  <RefreshCcw
                    size={17}
                    className={
                      loading ? "animate-spin" : ""
                    }
                    aria-hidden="true"
                  />
                  تحديث
                </SecondaryButton>

                <SecondaryButton
                  onClick={() => window.print()}
                >
                  <Printer
                    size={17}
                    aria-hidden="true"
                  />
                  طباعة
                </SecondaryButton>

                <ExportButton
                  onClick={exportPDF}
                  icon={
                    <FileText
                      size={17}
                      aria-hidden="true"
                    />
                  }
                >
                  PDF
                </ExportButton>

                <PrimaryButton onClick={exportExcel}>
                  <FileSpreadsheet
                    size={17}
                    aria-hidden="true"
                  />
                  Excel
                </PrimaryButton>
              </>
            }
          />

          {errorMsg ? (
            <ErrorState description={errorMsg} />
          ) : null}

          <section
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
            aria-label="مؤشرات ملفات الإنجاز"
          >
            <ExecutiveCard
              title="المعلمون"
              value={teachers.length}
              subtitle="المشمولون بالمتابعة"
              icon={
                <Users size={22} aria-hidden="true" />
              }
              tone="primary"
              progress={teachers.length > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="متوسط الإنجاز"
              value={`${summaryStats.averageCompletion}%`}
              subtitle="متوسط الاكتمال"
              icon={
                <TrendingUp
                  size={22}
                  aria-hidden="true"
                />
              }
              tone={
                summaryStats.averageCompletion >= 80
                  ? "green"
                  : summaryStats.averageCompletion >= 50
                    ? "gold"
                    : "red"
              }
              progress={summaryStats.averageCompletion}
            />

            <ExecutiveCard
              title="مكتمل"
              value={summaryStats.completed}
              subtitle="ملفات مكتملة"
              icon={
                <CheckCircle2
                  size={22}
                  aria-hidden="true"
                />
              }
              tone="green"
              progress={
                teachers.length
                  ? Math.round(
                      (summaryStats.completed /
                        teachers.length) *
                        100,
                    )
                  : 0
              }
            />

            <ExecutiveCard
              title="قيد الاستكمال"
              value={summaryStats.inProgress}
              subtitle="قاربت الاكتمال"
              icon={
                <ShieldCheck
                  size={22}
                  aria-hidden="true"
                />
              }
              tone="gold"
              progress={
                teachers.length
                  ? Math.round(
                      (summaryStats.inProgress /
                        teachers.length) *
                        100,
                    )
                  : 0
              }
            />

            <ExecutiveCard
              title="يحتاج متابعة"
              value={
                summaryStats.blocked +
                summaryStats.needFollow
              }
              subtitle="منخفضة أو متعثرة"
              icon={
                <AlertCircle
                  size={22}
                  aria-hidden="true"
                />
              }
              tone={
                summaryStats.blocked +
                  summaryStats.needFollow >
                0
                  ? "red"
                  : "green"
              }
              progress={
                teachers.length
                  ? Math.round(
                      ((summaryStats.blocked +
                        summaryStats.needFollow) /
                        teachers.length) *
                        100,
                    )
                  : 0
              }
            />
          </section>

          <SummaryCard
            title="الملخص التنفيذي"
            description="ملخص الجاهزية وحالات المراجعة."
            tone={
              summaryStats.averageCompletion >= 80
                ? "green"
                : summaryStats.averageCompletion >= 50
                  ? "gold"
                  : "red"
            }
            items={[
              {
                label: "متوسط الإنجاز",
                value: `${summaryStats.averageCompletion}%`,
              },
              {
                label: "المعتمد",
                value: summaryStats.approved,
              },
              {
                label: "بانتظار المراجعة",
                value: summaryStats.pending,
              },
              {
                label: "المرفوض",
                value: summaryStats.rejected,
              },
              {
                label: "النواقص",
                value: summaryStats.missing,
              },
            ]}
            footer="تعتمد الدقة على اكتمال تعريف الشواهد."
          />

          <PageToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder:
                "بحث بالاسم أو الرقم أو المادة...",
            }}
            filters={
              <>
                <ToolbarSelect
                  value={subjectFilter}
                  onChange={setSubjectFilter}
                >
                  <option value="all">
                    كل المواد
                  </option>

                  {subjects.map((subject) => (
                    <option
                      key={subject}
                      value={subject}
                    >
                      {subject}
                    </option>
                  ))}
                </ToolbarSelect>

                <ToolbarSelect
                  value={statusFilter}
                  onChange={(value) =>
                    setStatusFilter(
                      value as
                        | "all"
                        | PortfolioStatus,
                    )
                  }
                >
                  <option value="all">
                    كل الحالات
                  </option>

                  {STATUS_OPTIONS.map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ))}
                </ToolbarSelect>
              </>
            }
            onRefresh={() =>
              void fetchMonitorData()
            }
            onPrint={() => window.print()}
            onExportPDF={exportPDF}
            onExportExcel={exportExcel}
            actions={
              <SecondaryButton
                onClick={resetFilters}
              >
                <XCircle
                  size={17}
                  aria-hidden="true"
                />
                مسح
              </SecondaryButton>
            }
          />

          <Section
            title="جاهزية ملفات الإنجاز"
            description={`عرض ${filteredSummaries.length} من ${teacherSummaries.length} معلم.`}
            icon={
              <GraduationCap
                size={20}
                aria-hidden="true"
              />
            }
            badge={`${filteredSummaries.length} نتيجة`}
            empty={filteredSummaries.length === 0}
            emptyTitle="لا توجد نتائج"
            emptyDescription="غيّر البحث أو الفلاتر."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-right">
                <thead className="bg-[var(--app-card-soft)] text-sm text-[var(--app-text-muted)]">
                  <tr>
                    <th className="px-4 py-4">
                      المعلم
                    </th>
                    <th className="px-4 py-4">
                      المادة
                    </th>
                    <th className="px-4 py-4">
                      الإنجاز
                    </th>
                    <th className="px-4 py-4">
                      الشواهد
                    </th>
                    <th className="px-4 py-4">
                      المراجعة
                    </th>
                    <th className="px-4 py-4">
                      المتبقي
                    </th>
                    <th className="px-4 py-4">
                      الحالة
                    </th>
                    <th className="px-4 py-4 print:hidden">
                      الإجراء
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSummaries.map(
                    (summary) => (
                      <tr
                        key={summary.teacher.id}
                        className="border-t border-[var(--app-border)] text-sm transition hover:bg-[var(--app-card-soft)]"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-[var(--app-radius-lg)] bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]">
                              <GraduationCap
                                size={20}
                                aria-hidden="true"
                              />
                            </span>

                            <div>
                              <p className="font-black text-[var(--app-text)]">
                                {
                                  summary.teacher
                                    .full_name
                                }
                              </p>

                              <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                                {summary.teacher
                                  .employee_number ||
                                  "بدون رقم"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-bold text-[var(--app-text)]">
                            {summary.teacher
                              .subject || "—"}
                          </p>

                          <p className="mt-1 text-xs text-[var(--app-text-subtle)]">
                            {summary.teacher
                              .department || "—"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <div className="min-w-[150px]">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-bold text-[var(--app-text-muted)]">
                                الإنجاز
                              </span>

                              <span className="text-sm font-black text-[var(--app-text)]">
                                {
                                  summary.completionPercent
                                }
                                %
                              </span>
                            </div>

                            <ProgressBar
                              value={
                                summary.completionPercent
                              }
                            />
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-black text-[var(--app-text)]">
                            {
                              summary.uploadedRequired
                            }{" "}
                            / {summary.totalRequired}
                          </div>

                          <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                            شاهد مكتمل
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <SmallPill
                              label={`معتمد ${summary.approved}`}
                              tone="green"
                            />
                            <SmallPill
                              label={`مراجعة ${summary.pending}`}
                              tone="gold"
                            />
                            <SmallPill
                              label={`مرفوض ${summary.rejected}`}
                              tone="red"
                            />
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <SmallPill
                            label={`${summary.missing} شاهد`}
                            tone={
                              summary.missing === 0
                                ? "green"
                                : summary.missing <= 8
                                  ? "gold"
                                  : "red"
                            }
                          />
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge
                            status={summary.status}
                          />
                        </td>

                        <td className="px-4 py-4 print:hidden">
                          <Link
                            href={`/teachers/${summary.teacher.id}`}
                            className="inline-flex h-10 items-center gap-2 rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] px-4 text-xs font-bold text-[var(--app-text-inverse)] transition hover:bg-[var(--app-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
                          >
                            <Eye
                              size={15}
                              aria-hidden="true"
                            />
                            عرض
                          </Link>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function ProgressBar({
  value,
}: {
  value: number;
}) {
  const safeValue = Math.max(
    0,
    Math.min(100, value),
  );

  return (
    <div
      className="h-3 overflow-hidden rounded-full bg-[var(--app-border)]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
    >
      <div
        className={`h-full rounded-full ${getProgressClass(
          safeValue,
        )}`}
        style={{
          width: `${safeValue}%`,
        }}
      />
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: PortfolioStatus;
}) {
  const tone = getStatusTone(status);

  const classes: Record<StatusTone, string> = {
    primary:
      "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]",
    green:
      "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]",
    gold:
      "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]",
    red:
      "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${classes[tone]}`}
    >
      {status}
    </span>
  );
}

function SmallPill({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "gold" | "red";
}) {
  const classes = {
    green:
      "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]",
    gold:
      "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]",
    red:
      "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${classes[tone]}`}
    >
      {label}
    </span>
  );
}


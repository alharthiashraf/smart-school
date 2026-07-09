"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import Section from "@/components/ui/page/PageSection";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import KpiCard from "@/components/ui/cards/KpiCard";
import StatCard from "@/components/ui/cards/StatCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  AlertCircle,
  Award,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Loader2,
  Printer,
  RefreshCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";

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

type PortfolioStatus = "مكتمل" | "قيد الاستكمال" | "يحتاج متابعة" | "متعثر";

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

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
];

const STATUS_OPTIONS: PortfolioStatus[] = [
  "مكتمل",
  "قيد الاستكمال",
  "يحتاج متابعة",
  "متعثر",
];

function formatDateTime(value?: string | null) {
  if (!value) return "غير متوفر";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "غير متوفر";
  }
}

function isApproved(status?: string | null) {
  const value = String(status || "").trim();
  return value === "معتمد" || value === "approved" || value === "accepted";
}

function isRejected(status?: string | null) {
  const value = String(status || "").trim();
  return value === "مرفوض" || value === "rejected";
}

function isPending(status?: string | null) {
  const value = String(status || "").trim();
  return !value || value === "بانتظار المراجعة" || value === "pending" || value === "review";
}

function getStatusTone(status: PortfolioStatus) {
  if (status === "مكتمل") return "green";
  if (status === "قيد الاستكمال") return "blue";
  if (status === "يحتاج متابعة") return "gold";
  return "red";
}

function getProgressTone(value: number) {
  if (value >= 80) return "bg-[#07A869]";
  if (value >= 50) return "bg-[#C1B489]";
  return "bg-red-500";
}

export default function PortfolioMonitorPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [evidenceTypes, setEvidenceTypes] = useState<EvidenceType[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PortfolioStatus>("all");

  useEffect(() => {
    if (currentSchool?.id) {
      void fetchMonitorData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSchool?.id]);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function fetchMonitorData() {
    if (!currentSchool?.id) return;

    setLoading(true);

    try {
      const [teachersResult, evidenceResult, portfolioResult] =
        await Promise.allSettled([
          supabase
            .from("teachers")
            .select(
              "id, school_id, full_name, employee_number, subject, department, status",
            )
            .eq("school_id", currentSchool.id)
            .order("full_name", { ascending: true }),

          supabase
            .from("teacher_evidence_types")
            .select("id, element_id, evidence_name, is_required")
            .eq("is_required", true)
            .order("element_id", { ascending: true }),

          supabase
            .from("teacher_portfolio")
            .select(
              "id, teacher_id, school_id, evidence_type_id, category, review_status",
            )
            .eq("school_id", currentSchool.id),
        ]);

      if (
        teachersResult.status === "fulfilled" &&
        !teachersResult.value.error
      ) {
        setTeachers((teachersResult.value.data as Teacher[]) || []);
      } else {
        setTeachers([]);
      }

      if (
        evidenceResult.status === "fulfilled" &&
        !evidenceResult.value.error
      ) {
        setEvidenceTypes((evidenceResult.value.data as EvidenceType[]) || []);
      } else {
        setEvidenceTypes([]);
      }

      if (
        portfolioResult.status === "fulfilled" &&
        !portfolioResult.value.error
      ) {
        setPortfolioItems(
          (portfolioResult.value.data as PortfolioItem[]) || [],
        );
      } else {
        setPortfolioItems([]);
      }

      const hasError = [teachersResult, evidenceResult, portfolioResult].some(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" && result.value.error),
      );

      if (hasError) {
        showToast(
          "error",
          "تم تحميل الصفحة، لكن بعض بيانات ملفات الإنجاز لم تُحمّل بالكامل.",
        );
      }

      setLastSync(new Date().toISOString());
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر تحميل بيانات متابعة ملفات الإنجاز";

      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  const totalRequired = evidenceTypes.length;

  const teacherSummaries = useMemo<TeacherPortfolioSummary[]>(() => {
    return teachers.map((teacher) => {
      const teacherPortfolio = portfolioItems.filter(
        (item) => item.teacher_id === teacher.id,
      );

      const uploadedRequired = evidenceTypes.filter((evidence) => {
        const byId = teacherPortfolio.some(
          (item) => item.evidence_type_id === evidence.id,
        );

        const byName = teacherPortfolio.some(
          (item) => item.category === evidence.evidence_name,
        );

        return byId || byName;
      }).length;

      const completionPercent =
        totalRequired > 0
          ? Math.round((uploadedRequired / totalRequired) * 100)
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
        missing: Math.max(totalRequired - uploadedRequired, 0),
        completionPercent,
        approved,
        pending,
        rejected,
        status,
      };
    });
  }, [teachers, portfolioItems, evidenceTypes, totalRequired]);

  const subjects = useMemo(() => {
    return Array.from(
      new Set(
        teachers
          .map((teacher) => teacher.subject)
          .filter(Boolean) as string[],
      ),
    ).sort((a, b) => a.localeCompare(b, "ar"));
  }, [teachers]);

  const filteredSummaries = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return teacherSummaries
      .filter((summary) => {
        const text = `
          ${summary.teacher.full_name || ""}
          ${summary.teacher.employee_number || ""}
          ${summary.teacher.subject || ""}
          ${summary.teacher.department || ""}
          ${summary.teacher.status || ""}
        `.toLowerCase();

        const matchesSearch = !keyword || text.includes(keyword);

        const matchesSubject =
          subjectFilter === "all" || summary.teacher.subject === subjectFilter;

        const matchesStatus =
          statusFilter === "all" || summary.status === statusFilter;

        return matchesSearch && matchesSubject && matchesStatus;
      })
      .sort((a, b) => a.completionPercent - b.completionPercent);
  }, [teacherSummaries, search, subjectFilter, statusFilter]);

  const completedCount = teacherSummaries.filter(
    (item) => item.status === "مكتمل",
  ).length;

  const inProgressCount = teacherSummaries.filter(
    (item) => item.status === "قيد الاستكمال",
  ).length;

  const needFollowCount = teacherSummaries.filter(
    (item) => item.status === "يحتاج متابعة",
  ).length;

  const blockedCount = teacherSummaries.filter(
    (item) => item.status === "متعثر",
  ).length;

  const averageCompletion =
    teacherSummaries.length > 0
      ? Math.round(
          teacherSummaries.reduce(
            (sum, item) => sum + item.completionPercent,
            0,
          ) / teacherSummaries.length,
        )
      : 0;

  const approvedTotal = teacherSummaries.reduce((sum, item) => sum + item.approved, 0);
  const pendingTotal = teacherSummaries.reduce((sum, item) => sum + item.pending, 0);
  const rejectedTotal = teacherSummaries.reduce((sum, item) => sum + item.rejected, 0);
  const missingTotal = teacherSummaries.reduce((sum, item) => sum + item.missing, 0);

  function resetFilters() {
    setSearch("");
    setSubjectFilter("all");
    setStatusFilter("all");
  }

  function getExportData(): ExportData {
    return {
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
    };
  }

  function exportPDF() {
    const data = getExportData();

    exportTableToPDF({
      title: data.title,
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "تقرير صادر من شاشة مراقبة ملفات الإنجاز",
      headers: data.headers,
      rows: data.rows,
      fileName: `${data.title}.pdf`,
    });

    showToast("success", "تم تصدير تقرير ملفات الإنجاز PDF");
  }

  function exportExcel() {
    const data = getExportData();

    exportTableToExcel({
      title: data.title,
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "تقرير صادر من شاشة مراقبة ملفات الإنجاز",
      headers: data.headers,
      rows: data.rows,
      fileName: `${data.title}.xlsx`,
    });

    showToast("success", "تم تصدير تقرير ملفات الإنجاز Excel");
  }

  function printPage() {
    window.print();
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <div className="flex min-h-[55vh] items-center justify-center">
            <div className="flex items-center gap-3 rounded-3xl border bg-white px-6 py-4 text-slate-600 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-[#15445A]" />
              جاري تحميل متابعة ملفات الإنجاز...
            </div>
          </div>
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center font-bold text-red-700">
            لا توجد مدرسة مرتبطة بالمستخدم الحالي.
          </div>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-6" dir="rtl">
          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="متابعة ملفات الإنجاز"
            description="شاشة إدارية لمتابعة جاهزية ملفات إنجاز المعلمين، الشواهد المكتملة، النواقص، وحالات المراجعة والاعتماد من مكان واحد."
            badge="مراقبة الشواهد"
            icon={<Award size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "متابعة ملفات الإنجاز" },
            ]}
            lastUpdated={formatDateTime(lastSync)}
            meta={[
              { label: "المدرسة", value: currentSchool.school_name },
              { label: "المعلمون", value: teachers.length },
              { label: "الشواهد المطلوبة", value: totalRequired },
              { label: "النتائج المعروضة", value: filteredSummaries.length },
            ]}
            stats={[
              { label: "متوسط الإنجاز", value: `${averageCompletion}%`, icon: <TrendingUp size={20} />, tone: averageCompletion >= 80 ? "green" : averageCompletion >= 50 ? "gold" : "red" },
              { label: "مكتمل", value: completedCount, icon: <CheckCircle2 size={20} />, tone: "green" },
              { label: "بحاجة متابعة", value: needFollowCount + blockedCount, icon: <AlertCircle size={20} />, tone: needFollowCount + blockedCount > 0 ? "red" : "teal" },
              { label: "المتبقي", value: missingTotal, icon: <ShieldCheck size={20} />, tone: missingTotal > 0 ? "gold" : "green" },
            ]}
            actions={
              <>
                <button
                  onClick={() => void fetchMonitorData()}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <RefreshCcw size={17} className={loading ? "animate-spin" : ""} />
                  تحديث
                </button>

                <button
                  onClick={printPage}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Printer size={17} />
                  طباعة
                </button>

                <button
                  onClick={exportPDF}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0DA9A6] hover:shadow-md"
                >
                  <FileText size={17} />
                  PDF
                </button>

                <button
                  onClick={exportExcel}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <FileSpreadsheet size={17} />
                  Excel
                </button>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ExecutiveCard
              title="إجمالي المعلمين"
              value={teachers.length}
              subtitle="المعلمون المشمولون بالمتابعة"
              icon={<Users size={22} />}
              tone="blue"
              progress={teachers.length > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="متوسط الإنجاز"
              value={`${averageCompletion}%`}
              subtitle="متوسط اكتمال ملفات الإنجاز"
              icon={<TrendingUp size={22} />}
              tone={averageCompletion >= 80 ? "green" : averageCompletion >= 50 ? "gold" : "red"}
              progress={averageCompletion}
            />

            <ExecutiveCard
              title="مكتمل"
              value={completedCount}
              subtitle="ملفات مكتملة بالكامل"
              icon={<CheckCircle2 size={22} />}
              tone="green"
              progress={teachers.length ? Math.round((completedCount / teachers.length) * 100) : 0}
            />

            <ExecutiveCard
              title="قيد الاستكمال"
              value={inProgressCount}
              subtitle="ملفات قاربت الاكتمال"
              icon={<ShieldCheck size={22} />}
              tone="gold"
              progress={teachers.length ? Math.round((inProgressCount / teachers.length) * 100) : 0}
            />

            <ExecutiveCard
              title="يحتاج متابعة"
              value={blockedCount + needFollowCount}
              subtitle="ملفات منخفضة أو متعثرة"
              icon={<AlertCircle size={22} />}
              tone={blockedCount + needFollowCount > 0 ? "red" : "green"}
              progress={teachers.length ? Math.round(((blockedCount + needFollowCount) / teachers.length) * 100) : 0}
            />
          </section>

          <SummaryCard
            title="الملخص التنفيذي"
            description="قراءة سريعة لجاهزية ملفات الإنجاز وحالة الشواهد قبل الاعتماد أو الزيارة."
            tone={averageCompletion >= 80 ? "green" : averageCompletion >= 50 ? "gold" : "red"}
            items={[
              { label: "متوسط الإنجاز العام", value: `${averageCompletion}%` },
              { label: "الشواهد المعتمدة", value: approvedTotal },
              { label: "بانتظار المراجعة", value: pendingTotal },
              { label: "الشواهد المرفوضة", value: rejectedTotal },
              { label: "إجمالي النواقص", value: missingTotal },
            ]}
            footer="تزداد دقة المؤشرات عند اكتمال تعريف الشواهد المطلوبة وربط كل شاهد بالمعلم الصحيح."
          />

          <PageToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "ابحث باسم المعلم أو الرقم الوظيفي أو المادة...",
            }}
            filters={
              <>
                <ToolbarSelect value={subjectFilter} onChange={setSubjectFilter}>
                  <option value="all">كل المواد</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </ToolbarSelect>

                <ToolbarSelect
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as typeof statusFilter)}
                >
                  <option value="all">كل الحالات</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </ToolbarSelect>
              </>
            }
            onRefresh={() => void fetchMonitorData()}
            onPrint={printPage}
            onExportPDF={exportPDF}
            onExportExcel={exportExcel}
            actions={
              <button
                onClick={resetFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 text-sm font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
              >
                <XCircle size={17} />
                مسح الفلاتر
              </button>
            }
          />

          <Section
            title="قائمة جاهزية ملفات الإنجاز"
            description={`عرض ${filteredSummaries.length} من ${teacherSummaries.length} معلم. الشواهد المطلوبة لكل معلم: ${totalRequired}.`}
            icon={<GraduationCap size={20} />}
            badge={`${filteredSummaries.length} نتيجة`}
            empty={filteredSummaries.length === 0}
            emptyTitle="لا توجد نتائج مطابقة"
            emptyDescription="جرّب تغيير كلمات البحث أو تصفية الحالة أو المادة."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-right">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-4">المعلم</th>
                    <th className="px-4 py-4">المادة</th>
                    <th className="px-4 py-4">نسبة الإنجاز</th>
                    <th className="px-4 py-4">الشواهد</th>
                    <th className="px-4 py-4">المراجعة</th>
                    <th className="px-4 py-4">المتبقي</th>
                    <th className="px-4 py-4">الحالة</th>
                    <th className="px-4 py-4 print:hidden">الإجراء</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSummaries.map((summary) => (
                    <tr
                      key={summary.teacher.id}
                      className="border-t border-slate-100 text-sm transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#15445A]/10 text-[#15445A]">
                            <GraduationCap size={20} />
                          </div>

                          <div>
                            <p className="font-black text-[#15445A]">
                              {summary.teacher.full_name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {summary.teacher.employee_number || "بدون رقم وظيفي"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-700">
                          {summary.teacher.subject || "-"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {summary.teacher.department || "-"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-[150px]">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">
                              الإنجاز
                            </span>

                            <span className="text-sm font-black text-[#15445A]">
                              {summary.completionPercent}%
                            </span>
                          </div>

                          <ProgressBar value={summary.completionPercent} />
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-black text-[#15445A]">
                          {summary.uploadedRequired} / {summary.totalRequired}
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          شاهد مكتمل
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <SmallPill label={`معتمد ${summary.approved}`} color="green" />
                          <SmallPill label={`مراجعة ${summary.pending}`} color="gold" />
                          <SmallPill label={`مرفوض ${summary.rejected}`} color="red" />
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <SmallPill
                          label={`${summary.missing} شاهد`}
                          color={
                            summary.missing === 0
                              ? "green"
                              : summary.missing <= 8
                                ? "gold"
                                : "red"
                          }
                        />
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={summary.status} />
                      </td>

                      <td className="px-4 py-4 print:hidden">
                        <Link
                          href={`/teachers/${summary.teacher.id}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#15445A] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0DA9A6]"
                        >
                          <Eye size={15} />
                          عرض الملف
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full ${getProgressTone(safeValue)}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: PortfolioStatus }) {
  const tone = getStatusTone(status);

  const style = {
    green: "bg-[#07A869]/10 text-[#07A869]",
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    gold: "bg-[#C1B489]/20 text-[#15445A]",
    red: "bg-red-50 text-red-700",
  }[tone];

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>
      {status}
    </span>
  );
}

function SmallPill({
  label,
  color,
}: {
  label: string;
  color: "green" | "gold" | "red";
}) {
  const colors = {
    green: "bg-[#07A869]/10 text-[#07A869]",
    gold: "bg-[#C1B489]/20 text-[#15445A]",
    red: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${colors[color]}`}
    >
      {label}
    </span>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-lg print:hidden ${
        toast.type === "success"
          ? "bg-emerald-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle2 size={18} />
      ) : (
        <AlertCircle size={18} />
      )}

      {toast.message}
    </div>
  );
}

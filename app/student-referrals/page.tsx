"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
import IconButton from "@/components/ui/buttons/IconButton";
import PageLoader from "@/components/ui/loading/PageLoader";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";
import UiEmptyState from "@/components/ui/empty-state/EmptyState";

import { STAFF_ROLES } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Filter,
  RefreshCcw,
  ShieldAlert,
  User,
  X,
  XCircle,
} from "lucide-react";

type ReferralRow = {
  id: string;
  school_id?: string | null;
  student_id: string;
  reason?: string | null;
  teacher_notes?: string | null;
  status?: string | null;
  received_by?: string | null;
  closed_by?: string | null;
  returned_at?: string | null;
  return_status?: string | null;
  converted_to_behavior?: boolean | null;
  created_at?: string | null;
};

type StudentRow = {
  id: string;
  full_name: string;
  student_number?: string | null;
  grade_level?: string | null;
  class_name?: string | null;
  classroom?: string | null;
  section?: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const EXPORT_HEADERS = [
  "#",
  "الطالب",
  "رقم الطالب",
  "الصف",
  "الفصل",
  "الشعبة",
  "سبب الإحالة",
  "الحالة",
  "ملاحظات",
  "محولة لسلوك",
  "تاريخ الإحالة",
];

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

function isOpenStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return true;

  return !["مغلق", "closed", "منتهي", "مكتمل", "محلول", "resolved", "done"].includes(value);
}

function statusLabel(status?: string | null) {
  return status || "مفتوحة";
}

function statusTone(status?: string | null) {
  if (isOpenStatus(status)) {
    return "border-[color-mix(in_srgb,var(--app-accent)_30%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";
  }

  return "border-[color-mix(in_srgb,var(--app-success)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]";
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export default function StudentReferralsPage() {
  return (
    <Suspense
      fallback={
        <RoleGuard allowedRoles={STAFF_ROLES}>
          <AppShell>
            <PageLoader text="جاري تحميل الإحالات الطلابية..." />
          </AppShell>
        </RoleGuard>
      }
    >
      <StudentReferralsContent />
    </Suspense>
  );
}

function StudentReferralsContent() {
  const searchParams = useSearchParams();
  const studentIdFromUrl = searchParams.get("student_id") || "";

  const { currentSchool, loading: schoolLoading } = useSchool();

  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [students, setStudents] = useState<Record<string, StudentRow>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [selectedReferral, setSelectedReferral] = useState<ReferralRow | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

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

    try {
      let query = supabase
        .from("student_referrals")
        .select("*")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false });

      if (studentIdFromUrl) query = query.eq("student_id", studentIdFromUrl);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []) as ReferralRow[];
      setReferrals(rows);

      const studentIds = Array.from(new Set(rows.map((item) => item.student_id).filter(Boolean)));

      if (studentIds.length > 0) {
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, full_name, student_number, grade_level, class_name, classroom, section")
          .in("id", studentIds);

        if (studentsError) throw studentsError;

        const map: Record<string, StudentRow> = {};
        ((studentsData || []) as StudentRow[]).forEach((student) => {
          map[student.id] = student;
        });

        setStudents(map);
      } else {
        setStudents({});
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل الإحالات الطلابية.";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, showToast, studentIdFromUrl]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setLoading(false);
      setReferrals([]);
      setStudents({});
      return;
    }

    void fetchData();
  }, [currentSchool?.id, fetchData, schoolLoading]);

  const stats = useMemo(() => {
    const total = referrals.length;
    const open = referrals.filter((item) => isOpenStatus(item.status)).length;
    const closed = total - open;
    const converted = referrals.filter((item) => item.converted_to_behavior).length;

    return { total, open, closed, converted };
  }, [referrals]);

  const filteredReferrals = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return referrals.filter((item) => {
      const student = students[item.student_id];

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open" && isOpenStatus(item.status)) ||
        (statusFilter === "closed" && !isOpenStatus(item.status));

      const text = [
        item.reason,
        item.teacher_notes,
        item.status,
        student?.full_name,
        student?.student_number,
        student?.grade_level,
        student?.class_name,
        student?.classroom,
        student?.section,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || text.includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [referrals, students, search, statusFilter]);

  const exportRows = useMemo<(string | number | null | undefined)[][]>(() => {
    return filteredReferrals.map((item, index) => {
      const student = students[item.student_id];

      return [
        index + 1,
        student?.full_name || "—",
        student?.student_number || "—",
        student?.grade_level || "—",
        student?.class_name || student?.classroom || "—",
        student?.section || "—",
        item.reason || "—",
        item.status || "مفتوحة",
        item.teacher_notes || "—",
        item.converted_to_behavior ? "نعم" : "لا",
        formatDateTime(item.created_at),
      ];
    });
  }, [filteredReferrals, students]);

  function exportPDF() {
    exportTableToPDF({
      title: "الإحالات الطلابية",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: studentIdFromUrl
        ? "تقرير إحالات الطالب المحدد"
        : "تقرير الإحالات الطلابية",
      headers: EXPORT_HEADERS,
      rows: exportRows,
      fileName: `student-referrals-${todayStamp()}.pdf`,
    });

    showToast("success", "تم تجهيز PDF");
  }

  async function exportExcel() {
    await exportTableToExcel({
      title: "الإحالات الطلابية",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: studentIdFromUrl
        ? "تقرير إحالات الطالب المحدد"
        : "تقرير الإحالات الطلابية",
      headers: EXPORT_HEADERS,
      rows: exportRows,
      fileName: `student-referrals-${todayStamp()}.xlsx`,
      sheetName: "Student Referrals",
    });

    showToast("success", "تم تصدير Excel");
  }

  async function updateReferralStatus(item: ReferralRow, status: string) {
    try {
      const { data, error } = await supabase
        .from("student_referrals")
        .update({
          status,
          returned_at: status === "مغلق" ? new Date().toISOString() : item.returned_at,
        })
        .eq("id", item.id)
        .select("*")
        .single();

      if (error) throw error;

      setReferrals((previous) =>
        previous.map((row) => (row.id === item.id ? (data as ReferralRow) : row)),
      );

      setSelectedReferral((previous) =>
        previous?.id === item.id ? (data as ReferralRow) : previous,
      );

      showToast("success", "تم تحديث حالة الإحالة");
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحديث حالة الإحالة.";
      showToast("error", message);
    }
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل الإحالات الطلابية..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <ErrorState description="لا توجد مدرسة مرتبطة بالمستخدم الحالي." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AppShell>
        <PageContainer size="wide" className="space-y-5">
          <Breadcrumb />

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
            title="الإحالات الطلابية"
            description="متابعة الإحالات الطلابية واستقبال الحالات ومعالجتها أو إغلاقها حسب حالة الطالب، مع تصدير التقارير للمتابعة الإدارية."
            badge="بوابة الوكيل"
            icon={<ShieldAlert size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة الوكيل", href: "/vice-principal" },
              { label: "الإحالات الطلابية" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "غير محدد" },
              { label: "النطاق", value: studentIdFromUrl ? "طالب محدد" : "جميع الطلاب" },
              { label: "النتائج", value: filteredReferrals.length },
              { label: "الحالة", value: statusFilter === "all" ? "كل الحالات" : statusFilter === "open" ? "المفتوحة" : "المغلقة" },
            ]}
            stats={[
              { label: "إجمالي الإحالات", value: stats.total, icon: <ShieldAlert size={20} aria-hidden="true" />, tone: "primary" },
              { label: "المفتوحة", value: stats.open, icon: <AlertCircle size={20} aria-hidden="true" />, tone: stats.open > 0 ? "gold" : "green" },
              { label: "المغلقة", value: stats.closed, icon: <CheckCircle2 size={20} aria-hidden="true" />, tone: "green" },
              { label: "محولة لسلوك", value: stats.converted, icon: <XCircle size={20} aria-hidden="true" />, tone: stats.converted > 0 ? "red" : "slate" },
            ]}
            actions={
              <>
                <Link
                  href="/vice-principal"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 text-sm font-black text-[var(--app-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-card-soft)]"
                >
                  <ArrowRight size={17} aria-hidden="true" />
                  رجوع
                </Link>

                <ExportButton
                  icon={<FileText size={17} aria-hidden="true" />}
                  onClick={exportPDF}
                  disabled={!filteredReferrals.length}
                >
                  PDF
                </ExportButton>

                <ExportButton
                  icon={<Download size={17} aria-hidden="true" />}
                  onClick={() => void exportExcel()}
                  disabled={!filteredReferrals.length}
                >
                  Excel
                </ExportButton>

                <SecondaryButton
                  icon={<RefreshCcw size={17} aria-hidden="true" />}
                  onClick={() => void fetchData()}
                >
                  تحديث
                </SecondaryButton>
              </>
            }
          />

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ExecutiveCard
              title="إجمالي الإحالات"
              value={stats.total}
              subtitle="جميع الإحالات المسجلة"
              icon={<ShieldAlert size={22} aria-hidden="true" />}
              tone="primary"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="المفتوحة"
              value={stats.open}
              subtitle="تحتاج متابعة"
              icon={<AlertCircle size={22} aria-hidden="true" />}
              tone={stats.open > 0 ? "gold" : "green"}
              progress={percentage(stats.open, stats.total)}
            />

            <ExecutiveCard
              title="المغلقة"
              value={stats.closed}
              subtitle="تمت معالجتها"
              icon={<CheckCircle2 size={22} aria-hidden="true" />}
              tone="green"
              progress={percentage(stats.closed, stats.total)}
            />

            <ExecutiveCard
              title="محولة لسلوك"
              value={stats.converted}
              subtitle="إحالات حُولت لسجل سلوكي"
              icon={<XCircle size={22} aria-hidden="true" />}
              tone={stats.converted > 0 ? "red" : "primary"}
              progress={percentage(stats.converted, stats.total)}
            />
          </section>

          <SummaryCard
            title="الملخص التنفيذي للإحالات"
            description="قراءة سريعة لحجم الإحالات المفتوحة والمغلقة والمحولة إلى السلوك."
            tone={stats.open > 0 ? "gold" : "green"}
            items={[
              { label: "إجمالي الإحالات", value: stats.total },
              { label: "المفتوحة", value: stats.open },
              { label: "المغلقة", value: stats.closed },
              { label: "محولة لسلوك", value: stats.converted },
              { label: "النتائج المعروضة", value: filteredReferrals.length },
              { label: "نسبة الإغلاق", value: `${percentage(stats.closed, stats.total)}%` },
            ]}
            footer="يفضل مراجعة الإحالات المفتوحة يوميًا وإغلاق الحالات بعد اكتمال الإجراء المناسب."
          />

          <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث باسم الطالب أو سبب الإحالة أو رقم الطالب...",
              }}
              filters={
                <ToolbarSelect
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as typeof statusFilter)}
                >
                  <option value="all">كل الحالات</option>
                  <option value="open">المفتوحة</option>
                  <option value="closed">المغلقة</option>
                </ToolbarSelect>
              }
              onRefresh={() => void fetchData()}
              onExportPDF={exportPDF}
              onExportExcel={() => void exportExcel()}
              actions={
                <div className="flex h-11 items-center gap-2 rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] px-4 text-sm font-black text-[var(--app-text-muted)]">
                  <Filter size={17} aria-hidden="true" />
                  {filteredReferrals.length} نتيجة
                </div>
              }
          />

          {filteredReferrals.length === 0 ? (
            <UiEmptyState
              icon={<ShieldAlert className="h-8 w-8" aria-hidden="true" />}
              title="لا توجد إحالات"
              description="غيّر البحث أو الفلاتر لعرض نتائج أخرى."
            />
          ) : (
            <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[var(--app-text)]">قائمة الإحالات</h2>
                  <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                    عرض {filteredReferrals.length} إحالة حسب الفلاتر الحالية.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {filteredReferrals.map((item) => {
                  const student = students[item.student_id];

                  return (
                    <ReferralCard
                      key={item.id}
                      item={item}
                      student={student}
                      onView={setSelectedReferral}
                      onClose={updateReferralStatus}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {selectedReferral && (
            <ReferralDrawer
              item={selectedReferral}
              student={students[selectedReferral.student_id]}
              onClose={() => setSelectedReferral(null)}
              onUpdateStatus={updateReferralStatus}
            />
          )}
        </PageContainer>
      </AppShell>
    </RoleGuard>
  );
}

function ReferralCard({
  item,
  student,
  onView,
  onClose,
}: {
  item: ReferralRow;
  student?: StudentRow;
  onView: (item: ReferralRow) => void;
  onClose: (item: ReferralRow, status: string) => Promise<void>;
}) {
  return (
    <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-5 transition hover:-translate-y-0.5 hover:bg-[var(--app-card)] hover:shadow-[var(--app-shadow-md)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusTone(item.status)}`}>
              {statusLabel(item.status)}
            </span>

            {item.converted_to_behavior && (
              <span className="rounded-full border border-[color-mix(in_srgb,var(--app-danger)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] px-3 py-1 text-xs font-black text-[var(--app-danger)]">
                محولة لسلوك
              </span>
            )}

            <span className="rounded-full bg-[var(--app-card)] px-3 py-1 text-xs font-black text-[var(--app-text-muted)]">
              {formatDateTime(item.created_at)}
            </span>
          </div>

          <h2 className="text-xl font-black text-[var(--app-text)]">
            {student?.full_name || "طالب غير معروف"}
          </h2>

          <p className="mt-2 text-sm leading-7 text-[var(--app-text-muted)]">
            {[student?.grade_level, student?.class_name || student?.classroom, student?.section]
              .filter(Boolean)
              .join(" • ") || "—"}
          </p>

          <p className="mt-4 rounded-[var(--app-radius-lg)] bg-[var(--app-card)] p-4 text-sm leading-7 text-[var(--app-text)]">
            <span className="font-black text-[var(--app-text)]">سبب الإحالة:</span>{" "}
            {item.reason || "—"}
          </p>

          {item.teacher_notes && (
            <p className="mt-3 rounded-[var(--app-radius-lg)] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] p-4 text-sm leading-7 text-[var(--app-text)]">
              <span className="font-black">ملاحظات:</span> {item.teacher_notes}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link
            href={`/students/${item.student_id}`}
            className="flex h-11 items-center gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 text-sm font-black text-[var(--app-text)] hover:bg-[var(--app-card-soft)]"
          >
            ملف الطالب
            <User size={16} aria-hidden="true" />
          </Link>

          <SecondaryButton
            icon={<Eye size={16} aria-hidden="true" />}
            onClick={() => onView(item)}
          >
            عرض
          </SecondaryButton>

          {isOpenStatus(item.status) && (
            <SecondaryButton
              icon={<CheckCircle2 size={16} aria-hidden="true" />}
              onClick={() => void onClose(item, "مغلق")}
            >
              إغلاق
            </SecondaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

function ReferralDrawer({
  item,
  student,
  onClose,
  onUpdateStatus,
}: {
  item: ReferralRow;
  student?: StudentRow;
  onClose: () => void;
  onUpdateStatus: (item: ReferralRow, status: string) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-[color-mix(in_srgb,var(--app-text)_44%,transparent)] p-4 backdrop-blur-sm">
      <aside className="h-full w-full max-w-xl overflow-y-auto rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-6 shadow-[var(--app-shadow-xl)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[var(--app-text)]">تفاصيل الإحالة</h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              {student?.full_name || "طالب غير معروف"}
            </p>
          </div>

          <IconButton
            label="إغلاق تفاصيل الإحالة"
            title="إغلاق"
            onClick={onClose}
            icon={<X size={18} aria-hidden="true" />}
          />
        </div>

        <div className="space-y-3">
          <InfoBox label="اسم الطالب" value={student?.full_name || "طالب غير معروف"} />
          <InfoBox
            label="الصف والفصل"
            value={[student?.grade_level, student?.class_name || student?.classroom, student?.section]
              .filter(Boolean)
              .join(" • ") || "—"}
          />
          <InfoBox label="سبب الإحالة" value={item.reason || "—"} />
          <InfoBox label="ملاحظات المعلم" value={item.teacher_notes || "—"} />

          <div className="grid gap-3 md:grid-cols-2">
            <InfoBox label="الحالة" value={statusLabel(item.status)} />
            <InfoBox label="تاريخ الإحالة" value={formatDateTime(item.created_at)} />
            <InfoBox label="محولة لسلوك" value={item.converted_to_behavior ? "نعم" : "لا"} />
            <InfoBox label="تاريخ الإغلاق/الإرجاع" value={formatDateTime(item.returned_at)} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <SecondaryButton onClick={onClose}>
            إغلاق النافذة
          </SecondaryButton>

          {isOpenStatus(item.status) && (
            <SecondaryButton
              icon={<CheckCircle2 size={16} aria-hidden="true" />}
              onClick={() => void onUpdateStatus(item, "مغلق")}
            >
              إغلاق الإحالة
            </SecondaryButton>
          )}
        </div>
      </aside>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4">
      <p className="text-xs font-bold text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-2 font-black leading-7 text-[var(--app-text)]">{value}</p>
    </div>
  );
}



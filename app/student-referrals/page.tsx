"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

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
  Loader2,
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
  if (isOpenStatus(status)) return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";
  return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
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
            <LoadingBox />
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

  useEffect(() => {
    if (currentSchool?.id) void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSchool?.id, studentIdFromUrl]);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function fetchData() {
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
  }

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

  const exportRows = useMemo(() => {
    return filteredReferrals.map((item, index) => {
      const student = students[item.student_id];

      return {
        "#": index + 1,
        "الطالب": student?.full_name || "—",
        "رقم الطالب": student?.student_number || "—",
        "الصف": student?.grade_level || "—",
        "الفصل": student?.class_name || student?.classroom || "—",
        "الشعبة": student?.section || "—",
        "سبب الإحالة": item.reason || "—",
        "الحالة": item.status || "مفتوحة",
        "ملاحظات": item.teacher_notes || "—",
        "محولة لسلوك": item.converted_to_behavior ? "نعم" : "لا",
        "تاريخ الإحالة": formatDateTime(item.created_at),
      };
    });
  }, [filteredReferrals, students]);

  function exportPDF() {
    exportTableToPDF({
      title: "الإحالات الطلابية",
      fileName: `student-referrals-${todayStamp()}.pdf`,
      rows: exportRows,
    } as any);

    showToast("success", "تم تجهيز PDF");
  }

  async function exportExcel() {
    await exportTableToExcel({
      fileName: `student-referrals-${todayStamp()}.xlsx`,
      sheetName: "Student Referrals",
      rows: exportRows,
    } as any);

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
          <LoadingBox />
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
            title="الإحالات الطلابية"
            description="متابعة الإحالات الطلابية واستقبال الحالات ومعالجتها أو إغلاقها حسب حالة الطالب، مع تصدير التقارير للمتابعة الإدارية."
            badge="بوابة الوكيل"
            icon={<ShieldAlert size={18} />}
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
              { label: "إجمالي الإحالات", value: stats.total, icon: <ShieldAlert size={20} />, tone: "blue" },
              { label: "المفتوحة", value: stats.open, icon: <AlertCircle size={20} />, tone: stats.open > 0 ? "gold" : "green" },
              { label: "المغلقة", value: stats.closed, icon: <CheckCircle2 size={20} />, tone: "green" },
              { label: "محولة لسلوك", value: stats.converted, icon: <XCircle size={20} />, tone: stats.converted > 0 ? "red" : "slate" },
            ]}
            actions={
              <>
                <Link
                  href="/vice-principal"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ArrowRight size={17} />
                  رجوع
                </Link>

                <button
                  type="button"
                  onClick={exportPDF}
                  disabled={!filteredReferrals.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <FileText size={17} />
                  PDF
                </button>

                <button
                  type="button"
                  onClick={() => void exportExcel()}
                  disabled={!filteredReferrals.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <Download size={17} />
                  Excel
                </button>

                <button
                  type="button"
                  onClick={() => void fetchData()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>
              </>
            }
          />

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ExecutiveCard
              title="إجمالي الإحالات"
              value={stats.total}
              subtitle="جميع الإحالات المسجلة"
              icon={<ShieldAlert size={22} />}
              tone="blue"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="المفتوحة"
              value={stats.open}
              subtitle="تحتاج متابعة"
              icon={<AlertCircle size={22} />}
              tone={stats.open > 0 ? "gold" : "green"}
              progress={percentage(stats.open, stats.total)}
            />

            <ExecutiveCard
              title="المغلقة"
              value={stats.closed}
              subtitle="تمت معالجتها"
              icon={<CheckCircle2 size={22} />}
              tone="green"
              progress={percentage(stats.closed, stats.total)}
            />

            <ExecutiveCard
              title="محولة لسلوك"
              value={stats.converted}
              subtitle="إحالات حُولت لسجل سلوكي"
              icon={<XCircle size={22} />}
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

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
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
                <div className="flex h-11 items-center gap-2 rounded-2xl bg-slate-50 px-4 text-sm font-black text-slate-600">
                  <Filter size={17} />
                  {filteredReferrals.length} نتيجة
                </div>
              }
            />
          </section>

          {filteredReferrals.length === 0 ? (
            <EmptyBox text="لا توجد إحالات مطابقة." />
          ) : (
            <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[#15445A]">قائمة الإحالات</h2>
                  <p className="mt-1 text-sm text-slate-500">
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
        </main>
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
    <div className="rounded-[28px] border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusTone(item.status)}`}>
              {statusLabel(item.status)}
            </span>

            {item.converted_to_behavior && (
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                محولة لسلوك
              </span>
            )}

            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
              {formatDateTime(item.created_at)}
            </span>
          </div>

          <h2 className="text-xl font-black text-[#15445A]">
            {student?.full_name || "طالب غير معروف"}
          </h2>

          <p className="mt-2 text-sm leading-7 text-slate-500">
            {[student?.grade_level, student?.class_name || student?.classroom, student?.section]
              .filter(Boolean)
              .join(" • ") || "—"}
          </p>

          <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-7 text-slate-700">
            <span className="font-black text-[#15445A]">سبب الإحالة:</span>{" "}
            {item.reason || "—"}
          </p>

          {item.teacher_notes && (
            <p className="mt-3 rounded-2xl bg-[#C1B489]/20 p-4 text-sm leading-7 text-[#15445A]">
              <span className="font-black">ملاحظات:</span> {item.teacher_notes}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link
            href={`/students/${item.student_id}`}
            className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] hover:bg-slate-50"
          >
            ملف الطالب
            <User size={16} />
          </Link>

          <button
            type="button"
            onClick={() => onView(item)}
            className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] hover:bg-slate-50"
          >
            عرض
            <Eye size={16} />
          </button>

          {isOpenStatus(item.status) && (
            <button
              type="button"
              onClick={() => void onClose(item, "مغلق")}
              className="flex h-11 items-center gap-2 rounded-2xl bg-[#07A869] px-4 text-sm font-black text-white hover:opacity-90"
            >
              إغلاق
              <CheckCircle2 size={16} />
            </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/40 p-4 backdrop-blur-sm">
      <aside className="h-full w-full max-w-xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#15445A]">تفاصيل الإحالة</h2>
            <p className="mt-1 text-sm text-slate-500">
              {student?.full_name || "طالب غير معروف"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-100 p-3 text-slate-600 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
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
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
          >
            إغلاق النافذة
          </button>

          {isOpenStatus(item.status) && (
            <button
              type="button"
              onClick={() => void onUpdateStatus(item, "مغلق")}
              className="h-11 rounded-2xl bg-[#07A869] px-4 text-sm font-black text-white"
            >
              إغلاق الإحالة
            </button>
          )}
        </div>
      </aside>
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
        <p className="text-sm font-bold">جاري تحميل الإحالات الطلابية...</p>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 font-black leading-7 text-[#15445A]">{value}</p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl ${
        toast.type === "success" ? "bg-[#07A869]" : "bg-red-600"
      }`}
    >
      {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      {toast.message}
    </div>
  );
}

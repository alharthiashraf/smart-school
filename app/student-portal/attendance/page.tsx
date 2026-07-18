"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";
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

import { supabase } from "@/lib/supabase";
import type { SchoolRole } from "@/lib/permissions";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HeartPulse,
  RefreshCcw,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

type Student = {
  id: string;
  full_name: string | null;
  email?: string | null;
  student_email?: string | null;
  national_id?: string | null;
  grade_name?: string | null;
  classroom_name?: string | null;
  status?: string | null;
  user_id?: string | null;
  auth_user_id?: string | null;
};

type AttendanceRow = {
  id: string;
  student_id: string;
  attendance_date: string;
  status: string | null;
  notes?: string | null;
  created_at?: string | null;
  period_number?: number | null;
  subject_name?: string | null;
};

type StatusKey =
  | "all"
  | "present"
  | "absent"
  | "late"
  | "excused"
  | "clinic"
  | "unknown";

type AttendanceSessionRow = {
  id: string;
  attendance_date?: string | null;
  period_number?: number | null;
  subject_name?: string | null;
};

type AttendanceRecordRow = {
  id: string;
  student_id: string;
  session_id: string;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

const STUDENT_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "student",
];

const EXPORT_HEADERS = [
  "#",
  "اسم الطالب",
  "رقم الهوية",
  "الصف",
  "الفصل",
  "التاريخ",
  "الحالة",
  "الحصة",
  "المادة",
  "ملاحظات",
];

function getCurrentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    startText: start.toISOString().slice(0, 10),
    endText: end.toISOString().slice(0, 10),
  };
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function normalizeStatus(status?: string | null): StatusKey {
  const value = String(status || "").trim().toLowerCase();

  if (!value) return "unknown";
  if (["present", "حاضر", "حضور"].includes(value)) return "present";
  if (["absent", "غائب", "غياب"].includes(value)) return "absent";
  if (["late", "متأخر", "تأخر", "تاخر"].includes(value)) return "late";
  if (["excused", "بعذر", "استئذان", "مستأذن"].includes(value)) return "excused";
  if (
    [
      "clinic",
      "health",
      "عيادة",
      "العيادة",
      "تحويل إلى العيادة الصحية",
      "تحويل للعيادة",
      "تحويل صحي",
    ].includes(value)
  ) {
    return "clinic";
  }

  return "unknown";
}

function statusLabel(status?: string | null) {
  const key = normalizeStatus(status);

  if (key === "present") return "حاضر";
  if (key === "absent") return "غائب";
  if (key === "late") return "متأخر";
  if (key === "excused") return "بعذر";
  if (key === "clinic") return "تحويل للعيادة";
  return status || "غير محدد";
}

function statusClass(status?: string | null) {
  const key = normalizeStatus(status);

  if (key === "present") {
    return "border-[color-mix(in_srgb,var(--app-success)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]";
  }

  if (key === "absent") {
    return "border-[color-mix(in_srgb,var(--app-danger)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)]";
  }

  if (key === "late") {
    return "border-[color-mix(in_srgb,var(--app-accent)_30%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";
  }

  if (key === "excused") {
    return "border-[color-mix(in_srgb,var(--app-primary)_28%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)] text-[var(--app-primary)]";
  }

  if (key === "clinic") {
    return "border-[color-mix(in_srgb,var(--app-primary)_24%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_8%,transparent)] text-[var(--app-primary)]";
  }

  return "border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]";
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function StudentAttendancePage() {
  const {
    currentSchool,
    loading: schoolLoading,
  } = useSchool();

  const schoolId = currentSchool?.id || null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [currentEmail, setCurrentEmail] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);

  const [selectedStatus, setSelectedStatus] = useState<StatusKey>("all");
  const [month, setMonth] = useState(getCurrentMonth());
  const [search, setSearch] = useState("");

  const findStudentForCurrentUser = useCallback(
    async (userId: string, email: string): Promise<Student | null> => {
      const baseSelect =
        "id, full_name, email, student_email, national_id, grade_name, classroom_name, status, user_id, auth_user_id";

      const lookup = async (column: string, value: string) => {
        let query = supabase
          .from("students")
          .select(baseSelect)
          .eq(column, value);

        if (schoolId) {
          query = query.eq("school_id", schoolId);
        }

        const { data, error: queryError } = await query.limit(1);

        if (queryError) throw queryError;

        return Array.isArray(data) && data.length > 0
          ? (data[0] as Student)
          : null;
      };

      const attempts: Array<[string, string]> = [
        ["auth_user_id", userId],
        ["user_id", userId],
        ["email", email],
        ["student_email", email],
      ];

      for (const [column, value] of attempts) {
        try {
          const result = await lookup(column, value);
          if (result) return result;
        } catch {
          // بعض الأعمدة قد لا تكون موجودة في كل نسخة من قاعدة البيانات.
        }
      }

      return null;
    },
    [schoolId],
  );

  const loadAttendanceFromSimpleTable = useCallback(async (
    studentId: string,
    startText: string,
    endText: string,
  ) => {
    let query = supabase
      .from("attendance")
      .select("id, student_id, attendance_date, status, notes, created_at, period_number, subject_name")
      .eq("student_id", studentId)
      .gte("attendance_date", startText)
      .lte("attendance_date", endText)
      .order("attendance_date", { ascending: false });

    if (schoolId) query = query.eq("school_id", schoolId);

    const { data, error: attendanceError } = await query;

    if (attendanceError) throw attendanceError;

    return (data || []) as AttendanceRow[];
  }, [schoolId]);

  const loadAttendanceFromSessionTables = useCallback(async (
    studentId: string,
    startText: string,
    endText: string,
  ) => {
    let sessionsQuery = supabase
      .from("student_attendance_sessions")
      .select("id, attendance_date, period_number, subject_name")
      .gte("attendance_date", startText)
      .lte("attendance_date", endText);

    if (schoolId) sessionsQuery = sessionsQuery.eq("school_id", schoolId);

    const { data: sessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) throw sessionsError;

    const sessionList = (sessions || []) as AttendanceSessionRow[];
    if (!sessionList.length) return [];

    const sessionIds = sessionList.map((item) => item.id);

    const { data: records, error: recordsError } = await supabase
      .from("student_attendance_records")
      .select("id, student_id, session_id, status, notes, created_at")
      .eq("student_id", studentId)
      .in("session_id", sessionIds);

    if (recordsError) throw recordsError;

    const sessionMap = new Map<string, AttendanceSessionRow>();
    sessionList.forEach((session) => sessionMap.set(session.id, session));

    return ((records || []) as AttendanceRecordRow[])
      .map((record) => {
        const session = sessionMap.get(record.session_id);

        return {
          id: record.id,
          student_id: record.student_id,
          attendance_date: session?.attendance_date || "",
          status: record.status,
          notes: record.notes,
          created_at: record.created_at,
          period_number: session?.period_number ?? null,
          subject_name: session?.subject_name ?? null,
        } as AttendanceRow;
      })
      .filter((row) => row.attendance_date)
      .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
  }, [schoolId]);

  const loadStudentAttendance = useCallback(async (studentId: string) => {
    const { startText, endText } = getMonthRange(month);

    try {
      return await loadAttendanceFromSimpleTable(studentId, startText, endText);
    } catch {
      return await loadAttendanceFromSessionTables(
        studentId,
        startText,
        endText,
      );
    }
  }, [loadAttendanceFromSessionTables, loadAttendanceFromSimpleTable, month]);

  const loadData = useCallback(async (isRefresh = false) => {
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
        setAttendanceRows([]);
        setError("تعذر التعرف على حساب الطالب الحالي.");
        return;
      }

      const currentStudent = await findStudentForCurrentUser(userId, email);

      if (!currentStudent) {
        setStudent(null);
        setAttendanceRows([]);
        return;
      }

      setStudent(currentStudent);

      const rows = await loadStudentAttendance(currentStudent.id);
      setAttendanceRows(rows);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل سجل الحضور.";

      setError(message);
      setStudent(null);
      setAttendanceRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [findStudentForCurrentUser, loadStudentAttendance]);

  useEffect(() => {
    if (schoolLoading) return;
    void loadData(false);
  }, [loadData, schoolLoading]);

  const filteredRows = useMemo(() => {
    const text = search.trim().toLowerCase();

    return attendanceRows.filter((row) => {
      const status = normalizeStatus(row.status);
      const matchesStatus = selectedStatus === "all" || status === selectedStatus;

      const matchesSearch =
        !text ||
        String(row.notes || "").toLowerCase().includes(text) ||
        String(row.subject_name || "").toLowerCase().includes(text) ||
        String(statusLabel(row.status)).toLowerCase().includes(text);

      return matchesStatus && matchesSearch;
    });
  }, [attendanceRows, selectedStatus, search]);

  const stats = useMemo(() => {
    const total = filteredRows.length;
    const present = filteredRows.filter((row) => normalizeStatus(row.status) === "present").length;
    const absent = filteredRows.filter((row) => normalizeStatus(row.status) === "absent").length;
    const late = filteredRows.filter((row) => normalizeStatus(row.status) === "late").length;
    const excused = filteredRows.filter((row) => normalizeStatus(row.status) === "excused").length;
    const clinic = filteredRows.filter((row) => normalizeStatus(row.status) === "clinic").length;

    return {
      total,
      present,
      absent,
      late,
      excused,
      clinic,
      attendanceRate: percentage(present, total),
      absenceRate: percentage(absent, total),
      lateRate: percentage(late, total),
      issueCount: absent + late,
    };
  }, [filteredRows]);

  const exportRows = useMemo<(string | number | null | undefined)[][]>(() => {
    return filteredRows.map((row, index) => [
      index + 1,
      student?.full_name || "—",
      student?.national_id || "—",
      student?.grade_name || "—",
      student?.classroom_name || "—",
      formatDate(row.attendance_date),
      statusLabel(row.status),
      row.period_number || "—",
      row.subject_name || "—",
      row.notes || "—",
    ]);
  }, [filteredRows, student]);

  function handleExportPDF() {
    exportTableToPDF({
      title: "تقرير حضور الطالب",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: student?.full_name
        ? `سجل حضور الطالب: ${student.full_name}`
        : "سجل حضور الطالب",
      headers: EXPORT_HEADERS,
      rows: exportRows,
      fileName: "student-attendance-report.pdf",
    });
  }

  async function handleExportExcel() {
    await exportTableToExcel({
      title: "تقرير حضور الطالب",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: student?.full_name
        ? `سجل حضور الطالب: ${student.full_name}`
        : "سجل حضور الطالب",
      headers: EXPORT_HEADERS,
      rows: exportRows,
      fileName: "student-attendance-report.xlsx",
      sheetName: "Attendance",
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
        <main dir="rtl" className="space-y-5">
          <PageHeader
            variant="hero"
            title="سجل الحضور والغياب"
            description="متابعة حضورك وغيابك وتأخرك خلال الشهر، مع نسب الحضور والتنبيهات والتصدير."
            badge="بوابة الطالب"
            icon={<GraduationCap size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة الطالب", href: "/student-portal" },
              { label: "الحضور والغياب" },
            ]}
            meta={[
              { label: "البريد المستخدم للربط", value: currentEmail || "غير محدد" },
              { label: "الطالب", value: student?.full_name || "غير محدد" },
              { label: "الشهر", value: month },
              { label: "النتائج المعروضة", value: filteredRows.length },
            ]}
            stats={[
              { label: "السجلات", value: stats.total, icon: <CalendarDays size={20} aria-hidden="true" />, tone: "primary" },
              { label: "نسبة الحضور", value: `${stats.attendanceRate}%`, icon: <CheckCircle2 size={20} aria-hidden="true" />, tone: stats.attendanceRate >= 85 ? "green" : "gold" },
              { label: "غياب", value: stats.absent, icon: <XCircle size={20} aria-hidden="true" />, tone: stats.absent > 0 ? "red" : "green" },
              { label: "تأخر", value: stats.late, icon: <Clock3 size={20} aria-hidden="true" />, tone: stats.late > 0 ? "gold" : "green" },
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
                  disabled={!exportRows.length}
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

          {student && (
            <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[var(--app-radius-xl)] bg-[var(--app-primary)] text-[var(--app-primary-foreground)]">
                    <UserRound className="h-7 w-7" aria-hidden="true" />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-[var(--app-text)]">
                      {student.full_name || "طالب بدون اسم"}
                    </h2>

                    <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                      {student.grade_name || "—"} / {student.classroom_name || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-1 font-semibold text-[var(--app-text-muted)]">
                    الهوية: {student.national_id || "—"}
                  </span>

                  <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-1 font-semibold text-[var(--app-text-muted)]">
                    الحالة: {student.status || "نشط"}
                  </span>
                </div>
              </div>
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <ExecutiveCard
              title="إجمالي السجلات"
              value={stats.total}
              subtitle="حسب الفلاتر الحالية"
              icon={<CalendarDays size={22} aria-hidden="true" />}
              tone="primary"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="حضور"
              value={stats.present}
              subtitle={`${stats.attendanceRate}% نسبة الحضور`}
              icon={<CheckCircle2 size={22} aria-hidden="true" />}
              tone="green"
              progress={stats.attendanceRate}
            />

            <ExecutiveCard
              title="غياب"
              value={stats.absent}
              subtitle={`${stats.absenceRate}% نسبة الغياب`}
              icon={<XCircle size={22} aria-hidden="true" />}
              tone={stats.absent > 0 ? "red" : "green"}
              progress={stats.absenceRate}
            />

            <ExecutiveCard
              title="تأخر"
              value={stats.late}
              subtitle={`${stats.lateRate}% نسبة التأخر`}
              icon={<Clock3 size={22} aria-hidden="true" />}
              tone={stats.late > 0 ? "gold" : "green"}
              progress={stats.lateRate}
            />

            <ExecutiveCard
              title="بعذر"
              value={stats.excused}
              subtitle="أعذار واستئذان"
              icon={<ShieldCheck size={22} aria-hidden="true" />}
              tone="primary"
              progress={stats.total ? percentage(stats.excused, stats.total) : 0}
            />

            <ExecutiveCard
              title="تحويل صحي"
              value={stats.clinic}
              subtitle="تحويل للعيادة"
              icon={<HeartPulse size={22} aria-hidden="true" />}
              tone={stats.clinic > 0 ? "gold" : "green"}
              progress={stats.total ? percentage(stats.clinic, stats.total) : 0}
            />
          </section>

          <SummaryCard
            title="ملخص حضوري"
            description="قراءة سريعة لحضورك وغيابك وتأخرك حسب الشهر والفلاتر الحالية."
            tone={stats.issueCount > 0 ? "gold" : "green"}
            items={[
              { label: "السجلات", value: stats.total },
              { label: "نسبة الحضور", value: `${stats.attendanceRate}%` },
              { label: "حضور", value: stats.present },
              { label: "غياب", value: stats.absent },
              { label: "تأخر", value: stats.late },
              { label: "بعذر", value: stats.excused },
            ]}
            footer="يتم عرض البيانات حسب حساب الطالب المرتبط بالبريد أو معرف المستخدم."
          />

          <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث بالحالة، المادة، أو الملاحظة...",
              }}
              filters={
                <>
                  <ToolbarSelect
                    value={selectedStatus}
                    onChange={(value) => setSelectedStatus(value as StatusKey)}
                  >
                    <option value="all">كل الحالات</option>
                    <option value="present">حاضر</option>
                    <option value="absent">غائب</option>
                    <option value="late">متأخر</option>
                    <option value="excused">بعذر</option>
                    <option value="clinic">تحويل للعيادة</option>
                  </ToolbarSelect>

                  <input
                    type="month"
                    value={month}
                    onChange={(event) => setMonth(event.target.value)}
                    className="h-11 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
                  />
                </>
              }
              onRefresh={() => void loadData(true)}
              onExportPDF={handleExportPDF}
            onExportExcel={() => void handleExportExcel()}
          />

          {error && <ErrorState description={error} />}

          {loading ? (
            <PageLoader text="جاري تحميل سجل الحضور..." />
          ) : !student ? (
            <UiEmptyState
              icon={<UserRound className="h-9 w-9" aria-hidden="true" />}
              title="لم يتم العثور على حساب طالب مرتبط"
              description="تأكد أن حساب الطالب مرتبط في جدول students عبر auth_user_id أو user_id أو email أو student_email."
            />
          ) : !filteredRows.length ? (
            <UiEmptyState
              icon={<CalendarDays className="h-9 w-9" aria-hidden="true" />}
              title="لا توجد سجلات حضور مطابقة"
              description="جرّب تغيير الشهر أو الفلاتر الحالية لعرض سجلات أخرى."
            />
          ) : (
            <section className="overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] shadow-[var(--app-shadow-sm)]">
              <div className="flex flex-col gap-2 border-b border-[var(--app-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-[var(--app-text)]">تفاصيل الحضور</h2>
                  <p className="text-sm text-[var(--app-text-muted)]">
                    عدد النتائج: {filteredRows.length}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-2 text-sm font-bold text-[var(--app-text-muted)]">
                  التصدير حسب النتائج المعروضة
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-right text-sm">
                  <thead className="bg-[var(--app-primary)] text-[var(--app-primary-foreground)]">
                    <tr>
                      <th className="px-4 py-3 font-bold">التاريخ</th>
                      <th className="px-4 py-3 font-bold">الحالة</th>
                      <th className="px-4 py-3 font-bold">الحصة</th>
                      <th className="px-4 py-3 font-bold">المادة</th>
                      <th className="px-4 py-3 font-bold">ملاحظات</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--app-border)]">
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-[var(--app-card-soft)]/80">
                        <td className="px-4 py-3 text-[var(--app-text)]">
                          {formatDate(row.attendance_date)}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(row.status)}`}>
                            {statusLabel(row.status)}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-[var(--app-text)]">
                          {row.period_number ? `الحصة ${row.period_number}` : "—"}
                        </td>

                        <td className="px-4 py-3 text-[var(--app-text)]">
                          {row.subject_name || "—"}
                        </td>

                        <td className="max-w-[360px] px-4 py-3 text-[var(--app-text-muted)]">
                          <p className="line-clamp-2">
                            {row.notes || "لا توجد ملاحظات"}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </AppShell>
    </RoleGuard>
  );
}



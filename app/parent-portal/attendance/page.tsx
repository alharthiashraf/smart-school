"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import ExportButton from "@/components/ui/buttons/ExportButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ErrorState from "@/components/ui/feedback/ErrorState";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading";

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
  RefreshCcw,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";

type Student = {
  id: string;
  full_name: string | null;
  national_id?: string | null;
  grade_name?: string | null;
  classroom_name?: string | null;
  guardian_email?: string | null;
  status?: string | null;
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

const PARENT_ROLES: SchoolRole[] = ["super_admin", "school_admin", "parent"];


type AttendanceSessionRow = {
  id: string;
  attendance_date: string | null;
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

type ExportCell = string | number | null | undefined;


function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const endDay = new Date(year, month, 0).getDate();

  return {
    startText: `${year}-${String(month).padStart(2, "0")}-01`,
    endText: `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
  };
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(value);
}

function normalizeStatus(status?: string | null): StatusKey {
  const s = String(status || "").trim().toLowerCase();

  if (!s) return "unknown";
  if (["present", "حاضر", "حضور"].includes(s)) return "present";
  if (["absent", "غائب", "غياب"].includes(s)) return "absent";
  if (["late", "متأخر", "تاخر", "تأخر"].includes(s)) return "late";
  if (["excused", "بعذر", "مستأذن", "استئذان"].includes(s)) return "excused";

  if (
    [
      "clinic",
      "health",
      "عيادة",
      "العيادة",
      "تحويل إلى العيادة الصحية",
      "تحويل للعيادة",
      "تحويل صحي",
    ].includes(s)
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

  if (key === "present") return "border-[color-mix(in_srgb,var(--app-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
  if (key === "absent") return "border-[color-mix(in_srgb,var(--app-danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]";
  if (key === "late") return "border-[color-mix(in_srgb,var(--app-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";
  if (key === "excused") return "border-[color-mix(in_srgb,var(--app-primary)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]";
  if (key === "clinic") return "border-[color-mix(in_srgb,var(--app-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";

  return "border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]";
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function ParentAttendancePage() {
  const { currentSchool } = useSchool();
  const schoolId = currentSchool?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [parentEmail, setParentEmail] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<StatusKey>("all");
  const [month, setMonth] = useState(getCurrentMonth());
  const [search, setSearch] = useState("");

  const [error, setError] = useState<string>("");

  const loadParentStudents = useCallback(async (email: string) => {
    let query = supabase
      .from("students")
      .select("id, full_name, national_id, grade_name, classroom_name, guardian_email, status")
      .eq("guardian_email", email)
      .order("full_name", { ascending: true });

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    const { data, error: studentsError } = await query;

    if (studentsError) throw new Error(studentsError.message);

    return (data || []) as Student[];
  }, [schoolId]);

  const loadAttendanceFromSimpleTable = useCallback(async (
    studentIds: string[],
    startText: string,
    endText: string,
  ) => {
    const { data, error: attendanceError } = await supabase
      .from("attendance")
      .select("id, student_id, attendance_date, status, notes, created_at, period_number, subject_name")
      .in("student_id", studentIds)
      .gte("attendance_date", startText)
      .lte("attendance_date", endText)
      .order("attendance_date", { ascending: false });

    if (attendanceError) throw attendanceError;

    return (data || []) as AttendanceRow[];
  }, []);

  const loadAttendanceFromSessionTables = useCallback(async (
    studentIds: string[],
    startText: string,
    endText: string,
  ) => {
    let sessionsQuery = supabase
      .from("student_attendance_sessions")
      .select("id, attendance_date, period_number, subject_name")
      .gte("attendance_date", startText)
      .lte("attendance_date", endText);

    if (schoolId) {
      sessionsQuery = sessionsQuery.eq("school_id", schoolId);
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery;
    if (sessionsError) throw sessionsError;

    const sessionList = (sessions || []) as AttendanceSessionRow[];
    if (!sessionList.length) return [];

    const sessionIds = sessionList.map((item) => item.id);

    const { data: records, error: recordsError } = await supabase
      .from("student_attendance_records")
      .select("id, student_id, session_id, status, notes, created_at")
      .in("student_id", studentIds)
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

      const email = user?.email || "";

      if (!email) {
        setStudents([]);
        setAttendanceRows([]);
        setParentEmail("");
        setError("تعذر التعرف على بريد ولي الأمر الحالي.");
        return;
      }

      setParentEmail(email);

      const children = await loadParentStudents(email);
      setStudents(children);

      if (!children.length) {
        setAttendanceRows([]);
        return;
      }

      const studentIds = children.map((student) => student.id);
      const { startText, endText } = getMonthRange(month);

      try {
        const rows = await loadAttendanceFromSimpleTable(studentIds, startText, endText);
        setAttendanceRows(rows);
      } catch {
        const rows = await loadAttendanceFromSessionTables(studentIds, startText, endText);
        setAttendanceRows(rows);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل بيانات الحضور.",
      );
      setStudents([]);
      setAttendanceRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    loadAttendanceFromSessionTables,
    loadAttendanceFromSimpleTable,
    loadParentStudents,
    month,
  ]);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const studentsMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((student) => map.set(student.id, student));
    return map;
  }, [students]);

  const filteredRows = useMemo(() => {
    const text = search.trim().toLowerCase();

    return attendanceRows.filter((row) => {
      const student = studentsMap.get(row.student_id);
      const status = normalizeStatus(row.status);

      const matchesStudent =
        selectedStudentId === "all" || row.student_id === selectedStudentId;

      const matchesStatus = selectedStatus === "all" || status === selectedStatus;

      const matchesSearch =
        !text ||
        String(student?.full_name || "").toLowerCase().includes(text) ||
        String(student?.national_id || "").toLowerCase().includes(text) ||
        String(row.notes || "").toLowerCase().includes(text) ||
        String(row.subject_name || "").toLowerCase().includes(text);

      return matchesStudent && matchesStatus && matchesSearch;
    });
  }, [attendanceRows, studentsMap, selectedStudentId, selectedStatus, search]);

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
    };
  }, [filteredRows]);

  const exportRows = useMemo(() => {
    return filteredRows.map((row, index) => {
      const student = studentsMap.get(row.student_id);

      return {
        "#": index + 1,
        "اسم الطالب": student?.full_name || "—",
        "رقم الهوية": student?.national_id || "—",
        "الصف": student?.grade_name || "—",
        "الفصل": student?.classroom_name || "—",
        "التاريخ": formatDate(row.attendance_date),
        "الحالة": statusLabel(row.status),
        "الحصة": row.period_number || "—",
        "المادة": row.subject_name || "—",
        "ملاحظات": row.notes || "—",
      };
    });
  }, [filteredRows, studentsMap]);

  function handleExportPDF() {
    exportTableToPDF({
      title: "تقرير حضور أبناء ولي الأمر",
      headers: Object.keys(exportRows[0] ?? {}),
      rows: exportRows.map((row) => Object.values(row) as ExportCell[]),
      fileName: "parent-attendance-report.pdf",
    });
  }

  function handleExportExcel() {
    exportTableToExcel({
      title: "تقرير حضور أبناء ولي الأمر",
      headers: Object.keys(exportRows[0] ?? {}),
      rows: exportRows.map((row) => Object.values(row) as ExportCell[]),
      fileName: "parent-attendance-report.xlsx",
    });
  }

  return (
    <RoleGuard allowedRoles={PARENT_ROLES}>
      <AppShell>
        <main dir="rtl" className="space-y-5">
          <PageHeader
            variant="hero"
            title="متابعة حضور الأبناء"
            description="سجل حضور وغياب الأبناء مع الفلاتر الشهرية."
            badge="بوابة ولي الأمر"
            icon={<ShieldCheck size={18}  aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة ولي الأمر", href: "/parent-portal" },
              { label: "الحضور" },
            ]}
            meta={[
              { label: "البريد المستخدم للربط", value: parentEmail || "غير محدد" },
              { label: "الشهر", value: month },
              { label: "عدد الأبناء", value: students.length },
              { label: "النتائج المعروضة", value: filteredRows.length },
            ]}
            stats={[
              { label: "السجلات", value: stats.total, icon: <CalendarDays size={20}  aria-hidden="true" />, tone: "primary" },
              { label: "الحضور", value: stats.present, icon: <CheckCircle2 size={20}  aria-hidden="true" />, tone: "green" },
              { label: "الغياب", value: stats.absent, icon: <XCircle size={20}  aria-hidden="true" />, tone: stats.absent > 0 ? "red" : "green" },
              { label: "نسبة الحضور", value: `${stats.attendanceRate}%`, icon: <ShieldCheck size={20}  aria-hidden="true" />, tone: stats.attendanceRate >= 85 ? "green" : "gold" },
            ]}
            actions={
              <>
                <SecondaryButton
                  onClick={() => void loadData(true)}
                  disabled={refreshing}
                  aria-busy={refreshing}
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                  تحديث
                </SecondaryButton>

                <ExportButton
                  onClick={handleExportPDF}
                  disabled={!exportRows.length}
                  icon={<FileText className="h-4 w-4" aria-hidden="true" />}
                >
                  PDF
                </ExportButton>

                <ExportButton
                  onClick={handleExportExcel}
                  disabled={!exportRows.length}
                  icon={<FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
                >
                  Excel
                </ExportButton>
              </>
            }
          />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <ExecutiveCard
              title="إجمالي السجلات"
              value={stats.total}
              subtitle="حسب الفلاتر الحالية"
              icon={<CalendarDays size={22}  aria-hidden="true" />}
              tone="primary"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="حضور"
              value={stats.present}
              subtitle={`${stats.attendanceRate}% نسبة الحضور`}
              icon={<CheckCircle2 size={22}  aria-hidden="true" />}
              tone="green"
              progress={stats.attendanceRate}
            />

            <ExecutiveCard
              title="غياب"
              value={stats.absent}
              subtitle="سجلات الغياب"
              icon={<XCircle size={22}  aria-hidden="true" />}
              tone={stats.absent > 0 ? "red" : "green"}
              progress={stats.total ? percentage(stats.absent, stats.total) : 0}
            />

            <ExecutiveCard
              title="تأخر"
              value={stats.late}
              subtitle="سجلات التأخر"
              icon={<Clock3 size={22}  aria-hidden="true" />}
              tone={stats.late > 0 ? "gold" : "green"}
              progress={stats.total ? percentage(stats.late, stats.total) : 0}
            />

            <ExecutiveCard
              title="بعذر"
              value={stats.excused}
              subtitle="غياب أو استئذان بعذر"
              icon={<ShieldCheck size={22}  aria-hidden="true" />}
              tone="primary"
              progress={stats.total ? percentage(stats.excused, stats.total) : 0}
            />

            <ExecutiveCard
              title="تحويل صحي"
              value={stats.clinic}
              subtitle="تحويل للعيادة"
              icon={<AlertTriangle size={22}  aria-hidden="true" />}
              tone={stats.clinic > 0 ? "gold" : "green"}
              progress={stats.total ? percentage(stats.clinic, stats.total) : 0}
            />
          </section>

          <SummaryCard
            title="ملخص حضور الأبناء"
            description="ملخص الحضور حسب الفلاتر الحالية."
            tone={stats.absent > 0 || stats.late > 0 ? "gold" : "green"}
            items={[
              { label: "الأبناء المرتبطون", value: students.length },
              { label: "السجلات", value: stats.total },
              { label: "حضور", value: stats.present },
              { label: "غياب", value: stats.absent },
              { label: "تأخر", value: stats.late },
              { label: "نسبة الحضور", value: `${stats.attendanceRate}%` },
            ]}
            footer="تُعرض البيانات المرتبطة ببريد ولي الأمر."
          />

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-[var(--app-shadow-sm)]">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "بحث بالطالب أو المادة أو الملاحظة...",
              }}
              filters={
                <>
                  <ToolbarSelect value={selectedStudentId} onChange={setSelectedStudentId}>
                    <option value="all">جميع الأبناء</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name || "طالب بدون اسم"}
                      </option>
                    ))}
                  </ToolbarSelect>

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
                    className="h-11 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-card)]"
                  />
                </>
              }
              onRefresh={() => void loadData(true)}
              onExportPDF={handleExportPDF}
              onExportExcel={handleExportExcel}
            />
          </section>

          {error ? (
            <ErrorState title="تعذر تحميل البيانات" description={error} />
          ) : null}

          {loading ? (
            <PageLoader text="جاري تحميل سجل الحضور..." />
          ) : !students.length ? (
            <EmptyState
              icon={<UsersRound className="h-9 w-9"  aria-hidden="true" />}
              title="لا يوجد أبناء مرتبطون بهذا الحساب"
              description="تحقق من ربط بريد ولي الأمر بالطلاب."
            />
          ) : !filteredRows.length ? (
            <EmptyState
              icon={<CalendarDays className="h-9 w-9"  aria-hidden="true" />}
              title="لا توجد سجلات حضور مطابقة"
              description="غيّر الشهر أو الفلاتر الحالية."
            />
          ) : (
            <section className="overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] shadow-[var(--app-shadow-sm)]">
              <div className="flex flex-col gap-2 border-b border-[var(--app-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-[var(--app-text)]">
                    سجل الحضور
                  </h2>
                  <p className="text-sm text-[var(--app-text-muted)]">
                    عدد النتائج: {filteredRows.length}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-2 text-sm font-bold text-[var(--app-text-muted)]">
                  تصدير النتائج الحالية
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-right text-sm">
                  <thead className="bg-[var(--app-primary)] text-[var(--app-text-inverse)]">
                    <tr>
                      <th className="px-4 py-3 font-bold">الطالب</th>
                      <th className="px-4 py-3 font-bold">الصف / الفصل</th>
                      <th className="px-4 py-3 font-bold">التاريخ</th>
                      <th className="px-4 py-3 font-bold">الحالة</th>
                      <th className="px-4 py-3 font-bold">الحصة</th>
                      <th className="px-4 py-3 font-bold">المادة</th>
                      <th className="px-4 py-3 font-bold">ملاحظات</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--app-border)]">
                    {filteredRows.map((row) => {
                      const student = studentsMap.get(row.student_id);

                      return (
                        <tr key={row.id} className="hover:bg-[var(--app-card-soft)]/80">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] text-[var(--app-text-inverse)]">
                                <UserRound className="h-5 w-5"  aria-hidden="true" />
                              </div>

                              <div>
                                <p className="font-bold text-[var(--app-text)]">
                                  {student?.full_name || "طالب غير محدد"}
                                </p>
                                <p className="text-xs text-[var(--app-text-muted)]">
                                  {student?.national_id || "لا يوجد رقم هوية"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-[var(--app-text)]">
                            <p className="font-semibold">{student?.grade_name || "—"}</p>
                            <p className="text-xs text-[var(--app-text-muted)]">
                              {student?.classroom_name || "—"}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-[var(--app-text)]">
                            {formatDate(row.attendance_date)}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(row.status)}`}
                            >
                              {statusLabel(row.status)}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-[var(--app-text)]">
                            {row.period_number ? `الحصة ${row.period_number}` : "—"}
                          </td>

                          <td className="px-4 py-3 text-[var(--app-text)]">
                            {row.subject_name || "—"}
                          </td>

                          <td className="max-w-[260px] px-4 py-3 text-[var(--app-text-muted)]">
                            <p className="line-clamp-2">
                              {row.notes || "لا توجد ملاحظات"}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
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


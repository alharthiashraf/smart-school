"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

import { supabase } from "@/lib/supabase";
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
  Loader2,
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

const PARENT_ROLES = ["super_admin", "school_admin", "parent"] as any;

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

  if (key === "present") return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
  if (key === "absent") return "border-red-200 bg-red-50 text-red-700";
  if (key === "late") return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";
  if (key === "excused") return "border-[#3D7EB9]/20 bg-[#3D7EB9]/10 text-[#3D7EB9]";
  if (key === "clinic") return "border-purple-200 bg-purple-50 text-purple-700";

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function ParentAttendancePage() {
  const schoolContext = useSchool() as any;
  const schoolId =
    schoolContext?.currentSchool?.id ||
    schoolContext?.schoolId ||
    schoolContext?.school?.id ||
    schoolContext?.selectedSchool?.id ||
    null;

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

  async function loadParentStudents(email: string) {
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
  }

  async function loadAttendanceFromSimpleTable(
    studentIds: string[],
    startText: string,
    endText: string,
  ) {
    const { data, error: attendanceError } = await supabase
      .from("attendance")
      .select("id, student_id, attendance_date, status, notes, created_at, period_number, subject_name")
      .in("student_id", studentIds)
      .gte("attendance_date", startText)
      .lte("attendance_date", endText)
      .order("attendance_date", { ascending: false });

    if (attendanceError) throw attendanceError;

    return (data || []) as AttendanceRow[];
  }

  async function loadAttendanceFromSessionTables(
    studentIds: string[],
    startText: string,
    endText: string,
  ) {
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

    const sessionList = (sessions || []) as any[];
    if (!sessionList.length) return [];

    const sessionIds = sessionList.map((item) => item.id);

    const { data: records, error: recordsError } = await supabase
      .from("student_attendance_records")
      .select("id, student_id, session_id, status, notes, created_at")
      .in("student_id", studentIds)
      .in("session_id", sessionIds);

    if (recordsError) throw recordsError;

    const sessionMap = new Map<string, any>();
    sessionList.forEach((session) => sessionMap.set(session.id, session));

    return ((records || []) as any[])
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
  }

  async function loadData(isRefresh = false) {
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
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تحميل بيانات الحضور.");
      setStudents([]);
      setAttendanceRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, month]);

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
      fileName: "parent-attendance-report.pdf",
      rows: exportRows,
    } as any);
  }

  function handleExportExcel() {
    exportTableToExcel({
      fileName: "parent-attendance-report.xlsx",
      sheetName: "Attendance",
      rows: exportRows,
    } as any);
  }

  return (
    <RoleGuard allowedRoles={PARENT_ROLES}>
      <AppShell>
        <div dir="rtl" className="space-y-5">
          <PageHeader
            variant="hero"
            title="متابعة حضور الأبناء"
            description="تعرض هذه الصفحة سجل حضور وغياب الأبناء المرتبطين ببريد ولي الأمر المسجل في النظام، مع فلاتر شهرية وتصدير PDF وExcel."
            badge="بوابة ولي الأمر"
            icon={<ShieldCheck size={18} />}
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
              { label: "السجلات", value: stats.total, icon: <CalendarDays size={20} />, tone: "blue" },
              { label: "الحضور", value: stats.present, icon: <CheckCircle2 size={20} />, tone: "green" },
              { label: "الغياب", value: stats.absent, icon: <XCircle size={20} />, tone: stats.absent > 0 ? "red" : "green" },
              { label: "نسبة الحضور", value: `${stats.attendanceRate}%`, icon: <ShieldCheck size={20} />, tone: stats.attendanceRate >= 85 ? "green" : "gold" },
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
                  disabled={!exportRows.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={!exportRows.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </button>
              </>
            }
          />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <ExecutiveCard
              title="إجمالي السجلات"
              value={stats.total}
              subtitle="حسب الفلاتر الحالية"
              icon={<CalendarDays size={22} />}
              tone="blue"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="حضور"
              value={stats.present}
              subtitle={`${stats.attendanceRate}% نسبة الحضور`}
              icon={<CheckCircle2 size={22} />}
              tone="green"
              progress={stats.attendanceRate}
            />

            <ExecutiveCard
              title="غياب"
              value={stats.absent}
              subtitle="سجلات الغياب"
              icon={<XCircle size={22} />}
              tone={stats.absent > 0 ? "red" : "green"}
              progress={stats.total ? percentage(stats.absent, stats.total) : 0}
            />

            <ExecutiveCard
              title="تأخر"
              value={stats.late}
              subtitle="سجلات التأخر"
              icon={<Clock3 size={22} />}
              tone={stats.late > 0 ? "gold" : "green"}
              progress={stats.total ? percentage(stats.late, stats.total) : 0}
            />

            <ExecutiveCard
              title="بعذر"
              value={stats.excused}
              subtitle="غياب أو استئذان بعذر"
              icon={<ShieldCheck size={22} />}
              tone="teal"
              progress={stats.total ? percentage(stats.excused, stats.total) : 0}
            />

            <ExecutiveCard
              title="تحويل صحي"
              value={stats.clinic}
              subtitle="تحويل للعيادة"
              icon={<AlertTriangle size={22} />}
              tone={stats.clinic > 0 ? "purple" : "green"}
              progress={stats.total ? percentage(stats.clinic, stats.total) : 0}
            />
          </section>

          <SummaryCard
            title="ملخص حضور الأبناء"
            description="قراءة سريعة لسجل الحضور حسب الشهر والفلاتر الحالية."
            tone={stats.absent > 0 || stats.late > 0 ? "gold" : "green"}
            items={[
              { label: "الأبناء المرتبطون", value: students.length },
              { label: "السجلات", value: stats.total },
              { label: "حضور", value: stats.present },
              { label: "غياب", value: stats.absent },
              { label: "تأخر", value: stats.late },
              { label: "نسبة الحضور", value: `${stats.attendanceRate}%` },
            ]}
            footer="يتم عرض البيانات حسب بريد ولي الأمر المخزن في عمود guardian_email داخل جدول الطلاب."
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث باسم الطالب، الهوية، المادة، أو الملاحظة...",
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
                    className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-[#15445A] outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                  />
                </>
              }
              onRefresh={() => void loadData(true)}
              onExportPDF={handleExportPDF}
              onExportExcel={handleExportExcel}
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
          ) : !students.length ? (
            <EmptyState
              icon={<UsersRound className="h-9 w-9" />}
              title="لا يوجد أبناء مرتبطون بهذا الحساب"
              description="تأكد أن بريد ولي الأمر محفوظ في عمود guardian_email داخل جدول students لنفس بريد الحساب الحالي."
            />
          ) : !filteredRows.length ? (
            <EmptyState
              icon={<CalendarDays className="h-9 w-9" />}
              title="لا توجد سجلات حضور مطابقة"
              description="جرّب تغيير الشهر أو الفلاتر الحالية لعرض سجلات أخرى."
            />
          ) : (
            <section className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#15445A]">
                    سجل الحضور
                  </h2>
                  <p className="text-sm text-slate-500">
                    عدد النتائج: {filteredRows.length}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
                  التصدير حسب النتائج المعروضة
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-right text-sm">
                  <thead className="bg-[#15445A] text-white">
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

                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row) => {
                      const student = studentsMap.get(row.student_id);

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#15445A] text-white">
                                <UserRound className="h-5 w-5" />
                              </div>

                              <div>
                                <p className="font-bold text-[#15445A]">
                                  {student?.full_name || "طالب غير محدد"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {student?.national_id || "لا يوجد رقم هوية"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            <p className="font-semibold">{student?.grade_name || "—"}</p>
                            <p className="text-xs text-slate-500">
                              {student?.classroom_name || "—"}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            {formatDate(row.attendance_date)}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(row.status)}`}
                            >
                              {statusLabel(row.status)}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            {row.period_number ? `الحصة ${row.period_number}` : "—"}
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            {row.subject_name || "—"}
                          </td>

                          <td className="max-w-[260px] px-4 py-3 text-slate-600">
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
        </div>
      </AppShell>
    </RoleGuard>
  );
}

function LoadingBox() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-slate-100 bg-white">
      <div className="flex flex-col items-center gap-3 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <p className="text-sm font-bold">جاري تحميل سجل الحضور...</p>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
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

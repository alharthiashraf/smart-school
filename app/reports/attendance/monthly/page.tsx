"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCcw,
  School,
  Search,
  Users,
  XCircle,
} from "lucide-react";

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

type Student = {
  id: string;
  full_name: string | null;
  grade_name?: string | null;
  classroom_name?: string | null;
  school_id?: string | null;
};

type AttendanceRow = {
  id: string;
  student_id: string;
  attendance_date: string;
  status: string | null;
  notes?: string | null;
  period_number?: number | null;
  subject_name?: string | null;
};

type StatusKey = "all" | "present" | "absent" | "late" | "excused" | "clinic" | "unknown";

const ALLOWED_ROLES = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "teacher",
] as any;

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function normalizeStatus(status?: string | null): StatusKey {
  const value = String(status || "").trim().toLowerCase();

  if (!value) return "unknown";
  if (["present", "حاضر", "حضور"].includes(value)) return "present";
  if (["absent", "غائب", "غياب"].includes(value)) return "absent";
  if (["late", "متأخر", "تأخر", "تاخر"].includes(value)) return "late";
  if (["excused", "بعذر", "استئذان", "مستأذن"].includes(value)) return "excused";
  if (["clinic", "health", "عيادة", "العيادة", "تحويل صحي", "تحويل للعيادة"].includes(value)) return "clinic";

  return "unknown";
}

function statusLabel(status?: string | null) {
  const key = normalizeStatus(status);

  if (key === "present") return "حاضر";
  if (key === "absent") return "غائب";
  if (key === "late") return "متأخر";
  if (key === "excused") return "بعذر";
  if (key === "clinic") return "تحويل صحي";
  return "غير محدد";
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

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function MonthlyAttendancePage() {
  const schoolContext = useSchool() as any;
  const schoolId =
    schoolContext?.currentSchool?.id ||
    schoolContext?.schoolId ||
    schoolContext?.school?.id ||
    schoolContext?.selectedSchool?.id ||
    null;

  const schoolName =
    schoolContext?.currentSchool?.school_name ||
    schoolContext?.school?.school_name ||
    schoolContext?.selectedSchool?.school_name ||
    "غير محدد";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [month, setMonth] = useState(currentMonth());
  const [search, setSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedClassroom, setSelectedClassroom] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<StatusKey>("all");

  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);

  async function loadStudents() {
    let query = supabase
      .from("students")
      .select("id, full_name, grade_name, classroom_name, school_id")
      .order("full_name", { ascending: true });

    if (schoolId) query = query.eq("school_id", schoolId);

    const { data, error: studentsError } = await query;

    if (studentsError) throw studentsError;

    return (data || []) as Student[];
  }

  async function loadAttendanceFromSimpleTable(studentIds: string[], start: string, end: string) {
    const { data, error: attendanceError } = await supabase
      .from("attendance")
      .select("id, student_id, attendance_date, status, notes, period_number, subject_name")
      .in("student_id", studentIds)
      .gte("attendance_date", start)
      .lte("attendance_date", end)
      .order("attendance_date", { ascending: false });

    if (attendanceError) throw attendanceError;

    return (data || []) as AttendanceRow[];
  }

  async function loadAttendanceFromSessionTables(studentIds: string[], start: string, end: string) {
    let sessionsQuery = supabase
      .from("student_attendance_sessions")
      .select("id, attendance_date, period_number, subject_name")
      .gte("attendance_date", start)
      .lte("attendance_date", end);

    if (schoolId) sessionsQuery = sessionsQuery.eq("school_id", schoolId);

    const { data: sessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) throw sessionsError;

    const sessionList = (sessions || []) as any[];
    if (!sessionList.length) return [];

    const sessionIds = sessionList.map((session) => session.id);

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

      const studentRows = await loadStudents();
      setStudents(studentRows);

      if (!studentRows.length) {
        setAttendanceRows([]);
        return;
      }

      const { start, end } = monthRange(month);
      const studentIds = studentRows.map((student) => student.id);

      try {
        const rows = await loadAttendanceFromSimpleTable(studentIds, start, end);
        setAttendanceRows(rows);
      } catch {
        const rows = await loadAttendanceFromSessionTables(studentIds, start, end);
        setAttendanceRows(rows);
      }
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تحميل تقرير الحضور الشهري.");
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

  const gradeOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((student) => {
      if (student.grade_name) set.add(student.grade_name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [students]);

  const classroomOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((student) => {
      if (
        student.classroom_name &&
        (selectedGrade === "all" || student.grade_name === selectedGrade)
      ) {
        set.add(student.classroom_name);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [students, selectedGrade]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return attendanceRows.filter((row) => {
      const student = studentsMap.get(row.student_id);
      const status = normalizeStatus(row.status);

      const matchesGrade = selectedGrade === "all" || student?.grade_name === selectedGrade;
      const matchesClassroom =
        selectedClassroom === "all" || student?.classroom_name === selectedClassroom;
      const matchesStatus = selectedStatus === "all" || status === selectedStatus;

      const matchesSearch =
        !keyword ||
        String(student?.full_name || "").toLowerCase().includes(keyword) ||
        String(student?.grade_name || "").toLowerCase().includes(keyword) ||
        String(student?.classroom_name || "").toLowerCase().includes(keyword) ||
        String(row.subject_name || "").toLowerCase().includes(keyword) ||
        String(row.notes || "").toLowerCase().includes(keyword);

      return matchesGrade && matchesClassroom && matchesStatus && matchesSearch;
    });
  }, [attendanceRows, studentsMap, selectedGrade, selectedClassroom, selectedStatus, search]);

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
    };
  }, [filteredRows]);

  const classroomSummary = useMemo(() => {
    const groups = new Map<string, AttendanceRow[]>();

    filteredRows.forEach((row) => {
      const student = studentsMap.get(row.student_id);
      const key = student?.classroom_name || "غير محدد";
      const current = groups.get(key) || [];
      current.push(row);
      groups.set(key, current);
    });

    return Array.from(groups.entries())
      .map(([classroomName, rows]) => {
        const total = rows.length;
        const present = rows.filter((row) => normalizeStatus(row.status) === "present").length;
        const absent = rows.filter((row) => normalizeStatus(row.status) === "absent").length;
        const late = rows.filter((row) => normalizeStatus(row.status) === "late").length;

        return {
          classroomName,
          total,
          present,
          absent,
          late,
          attendanceRate: percentage(present, total),
        };
      })
      .sort((a, b) => b.attendanceRate - a.attendanceRate);
  }, [filteredRows, studentsMap]);

  const exportRows = useMemo(() => {
    return filteredRows.map((row, index) => {
      const student = studentsMap.get(row.student_id);

      return {
        "#": index + 1,
        "اسم الطالب": student?.full_name || "—",
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
      title: "تقرير الحضور الشهري",
      fileName: "monthly-attendance-report.pdf",
      rows: exportRows,
    } as any);
  }

  function handleExportExcel() {
    exportTableToExcel({
      fileName: "monthly-attendance-report.xlsx",
      sheetName: "Monthly Attendance",
      rows: exportRows,
    } as any);
  }

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <AppShell>
        <main dir="rtl" className="space-y-5">
          <PageHeader
            variant="hero"
            title="تقرير الحضور الشهري"
            description="تقرير موحد لمتابعة حضور الطلاب خلال الشهر، مع نسب الحضور والغياب والتأخر، وملخص حسب الفصول والتصدير الرسمي."
            badge="تقارير الحضور"
            icon={<CalendarDays size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "التقارير", href: "/reports" },
              { label: "الحضور الشهري" },
            ]}
            meta={[
              { label: "المدرسة", value: schoolName },
              { label: "الشهر", value: month },
              { label: "عدد الطلاب", value: students.length },
              { label: "عدد النتائج", value: filteredRows.length },
            ]}
            stats={[
              { label: "السجلات", value: stats.total, icon: <CalendarDays size={20} />, tone: "blue" },
              { label: "نسبة الحضور", value: `${stats.attendanceRate}%`, icon: <CheckCircle2 size={20} />, tone: stats.attendanceRate >= 85 ? "green" : "gold" },
              { label: "الغياب", value: stats.absent, icon: <XCircle size={20} />, tone: stats.absent > 0 ? "red" : "green" },
              { label: "التأخر", value: stats.late, icon: <Clock3 size={20} />, tone: stats.late > 0 ? "gold" : "green" },
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
              subtitle={`${stats.absenceRate}% نسبة الغياب`}
              icon={<XCircle size={22} />}
              tone={stats.absent > 0 ? "red" : "green"}
              progress={stats.absenceRate}
            />

            <ExecutiveCard
              title="تأخر"
              value={stats.late}
              subtitle={`${stats.lateRate}% نسبة التأخر`}
              icon={<Clock3 size={22} />}
              tone={stats.late > 0 ? "gold" : "green"}
              progress={stats.lateRate}
            />

            <ExecutiveCard
              title="بعذر"
              value={stats.excused}
              subtitle="غياب أو استئذان بعذر"
              icon={<School size={22} />}
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
            title="ملخص الحضور الشهري"
            description="قراءة تنفيذية سريعة لمؤشرات الحضور حسب الشهر والفلاتر الحالية."
            tone={stats.attendanceRate >= 85 ? "green" : "gold"}
            items={[
              { label: "عدد الطلاب", value: students.length },
              { label: "السجلات", value: stats.total },
              { label: "نسبة الحضور", value: `${stats.attendanceRate}%` },
              { label: "الغياب", value: stats.absent },
              { label: "التأخر", value: stats.late },
              { label: "الفصول", value: classroomSummary.length },
            ]}
            footer="يعتمد التقرير على سجلات جدول attendance، مع دعم بديل لجداول جلسات الحضور عند الحاجة."
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث باسم الطالب، الصف، الفصل، المادة، أو الملاحظة...",
              }}
              filters={
                <>
                  <ToolbarSelect
                    value={selectedGrade}
                    onChange={(value) => {
                      setSelectedGrade(value);
                      setSelectedClassroom("all");
                    }}
                  >
                    <option value="all">كل الصفوف</option>
                    {gradeOptions.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={selectedClassroom} onChange={setSelectedClassroom}>
                    <option value="all">كل الفصول</option>
                    {classroomOptions.map((classroom) => (
                      <option key={classroom} value={classroom}>
                        {classroom}
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
                    <option value="clinic">تحويل صحي</option>
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
              icon={<Users className="h-9 w-9" />}
              title="لا يوجد طلاب"
              description="لم يتم العثور على طلاب مرتبطين بالمدرسة الحالية."
            />
          ) : !filteredRows.length ? (
            <EmptyState
              icon={<CalendarDays className="h-9 w-9" />}
              title="لا توجد سجلات حضور مطابقة"
              description="جرّب تغيير الشهر أو الفلاتر الحالية لعرض سجلات أخرى."
            />
          ) : (
            <>
              <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-[#15445A]">ملخص الفصول</h2>
                    <p className="text-sm text-slate-500">تحليل سريع حسب الفصل الدراسي/الشعبة.</p>
                  </div>
                  <BarChart3 className="h-6 w-6 text-[#0DA9A6]" />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-right text-sm">
                    <thead className="bg-[#15445A] text-white">
                      <tr>
                        <th className="px-4 py-3 font-bold">الفصل</th>
                        <th className="px-4 py-3 font-bold">السجلات</th>
                        <th className="px-4 py-3 font-bold">حضور</th>
                        <th className="px-4 py-3 font-bold">غياب</th>
                        <th className="px-4 py-3 font-bold">تأخر</th>
                        <th className="px-4 py-3 font-bold">نسبة الحضور</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classroomSummary.map((row) => (
                        <tr key={row.classroomName} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-[#15445A]">{row.classroomName}</td>
                          <td className="px-4 py-3">{row.total}</td>
                          <td className="px-4 py-3">{row.present}</td>
                          <td className="px-4 py-3">{row.absent}</td>
                          <td className="px-4 py-3">{row.late}</td>
                          <td className="px-4 py-3">
                            <div className="min-w-[120px]">
                              <div className="mb-1 text-xs font-bold text-[#15445A]">{row.attendanceRate}%</div>
                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-[#0DA9A6]"
                                  style={{ width: `${row.attendanceRate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[#15445A]">سجل الحضور الشهري</h2>
                    <p className="text-sm text-slate-500">عدد النتائج: {filteredRows.length}</p>
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
                                  <Users className="h-5 w-5" />
                                </div>

                                <div>
                                  <p className="font-bold text-[#15445A]">
                                    {student?.full_name || "طالب غير محدد"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-slate-700">
                              <p className="font-semibold">{student?.grade_name || "—"}</p>
                              <p className="text-xs text-slate-500">{student?.classroom_name || "—"}</p>
                            </td>

                            <td className="px-4 py-3 text-slate-700">{formatDate(row.attendance_date)}</td>

                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(row.status)}`}>
                                {statusLabel(row.status)}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-slate-700">
                              {row.period_number ? `الحصة ${row.period_number}` : "—"}
                            </td>

                            <td className="px-4 py-3 text-slate-700">{row.subject_name || "—"}</td>

                            <td className="max-w-[260px] px-4 py-3 text-slate-600">
                              <p className="line-clamp-2">{row.notes || "لا توجد ملاحظات"}</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </main>
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
        <p className="text-sm font-bold">جاري تحميل تقرير الحضور الشهري...</p>
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


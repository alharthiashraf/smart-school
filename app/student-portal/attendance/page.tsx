"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

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
  GraduationCap,
  HeartPulse,
  Loader2,
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

const STUDENT_ROLES = ["super_admin", "school_admin", "student"] as any;

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

async function safeSingleStudentQuery(query: any) {
  const { data, error } = await query.limit(1);

  if (error) throw error;

  return Array.isArray(data) && data.length ? (data[0] as Student) : null;
}

export default function StudentAttendancePage() {
  const schoolContext = useSchool() as any;

  const schoolId =
    schoolContext?.currentSchool?.id ||
    schoolContext?.schoolId ||
    schoolContext?.school?.id ||
    schoolContext?.selectedSchool?.id ||
    null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [currentEmail, setCurrentEmail] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);

  const [selectedStatus, setSelectedStatus] = useState<StatusKey>("all");
  const [month, setMonth] = useState(getCurrentMonth());
  const [search, setSearch] = useState("");

  async function findStudentForCurrentUser(userId: string, email: string) {
    const baseSelect =
      "id, full_name, email, student_email, national_id, grade_name, classroom_name, status, user_id, auth_user_id";

    const applySchool = (query: any) => {
      if (schoolId) return query.eq("school_id", schoolId);
      return query;
    };

    const attempts = [
      () => safeSingleStudentQuery(applySchool(supabase.from("students").select(baseSelect).eq("auth_user_id", userId))),
      () => safeSingleStudentQuery(applySchool(supabase.from("students").select(baseSelect).eq("user_id", userId))),
      () => safeSingleStudentQuery(applySchool(supabase.from("students").select(baseSelect).eq("email", email))),
      () => safeSingleStudentQuery(applySchool(supabase.from("students").select(baseSelect).eq("student_email", email))),
    ];

    for (const attempt of attempts) {
      try {
        const result = await attempt();
        if (result) return result;
      } catch {
        // بعض الأعمدة قد لا تكون موجودة في كل نسخة من قاعدة البيانات.
      }
    }

    return null;
  }

  async function loadAttendanceFromSimpleTable(
    studentId: string,
    startText: string,
    endText: string,
  ) {
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
  }

  async function loadAttendanceFromSessionTables(
    studentId: string,
    startText: string,
    endText: string,
  ) {
    let sessionsQuery = supabase
      .from("student_attendance_sessions")
      .select("id, attendance_date, period_number, subject_name")
      .gte("attendance_date", startText)
      .lte("attendance_date", endText);

    if (schoolId) sessionsQuery = sessionsQuery.eq("school_id", schoolId);

    const { data: sessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) throw sessionsError;

    const sessionList = (sessions || []) as any[];
    if (!sessionList.length) return [];

    const sessionIds = sessionList.map((item) => item.id);

    const { data: records, error: recordsError } = await supabase
      .from("student_attendance_records")
      .select("id, student_id, session_id, status, notes, created_at")
      .eq("student_id", studentId)
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

  async function loadStudentAttendance(studentId: string) {
    const { startText, endText } = getMonthRange(month);

    try {
      return await loadAttendanceFromSimpleTable(studentId, startText, endText);
    } catch {
      return await loadAttendanceFromSessionTables(studentId, startText, endText);
    }
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
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تحميل سجل الحضور.");
      setStudent(null);
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

  const exportRows = useMemo(() => {
    return filteredRows.map((row, index) => ({
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
    }));
  }, [filteredRows, student]);

  function handleExportPDF() {
    exportTableToPDF({
      title: "تقرير حضور الطالب",
      fileName: "student-attendance-report.pdf",
      rows: exportRows,
    } as any);
  }

  function handleExportExcel() {
    exportTableToExcel({
      fileName: "student-attendance-report.xlsx",
      sheetName: "Attendance",
      rows: exportRows,
    } as any);
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
            icon={<GraduationCap size={18} />}
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
              { label: "السجلات", value: stats.total, icon: <CalendarDays size={20} />, tone: "blue" },
              { label: "نسبة الحضور", value: `${stats.attendanceRate}%`, icon: <CheckCircle2 size={20} />, tone: stats.attendanceRate >= 85 ? "green" : "gold" },
              { label: "غياب", value: stats.absent, icon: <XCircle size={20} />, tone: stats.absent > 0 ? "red" : "green" },
              { label: "تأخر", value: stats.late, icon: <Clock3 size={20} />, tone: stats.late > 0 ? "gold" : "green" },
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

          {student && (
            <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#15445A] text-white">
                    <UserRound className="h-7 w-7" />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-[#15445A]">
                      {student.full_name || "طالب بدون اسم"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {student.grade_name || "—"} / {student.classroom_name || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                    الهوية: {student.national_id || "—"}
                  </span>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
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
              subtitle="أعذار واستئذان"
              icon={<ShieldCheck size={22} />}
              tone="teal"
              progress={stats.total ? percentage(stats.excused, stats.total) : 0}
            />

            <ExecutiveCard
              title="تحويل صحي"
              value={stats.clinic}
              subtitle="تحويل للعيادة"
              icon={<HeartPulse size={22} />}
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

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
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
          ) : !student ? (
            <EmptyState
              icon={<UserRound className="h-9 w-9" />}
              title="لم يتم العثور على حساب طالب مرتبط"
              description="تأكد أن حساب الطالب مرتبط في جدول students عبر auth_user_id أو user_id أو email أو student_email."
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
                  <h2 className="text-lg font-black text-[#15445A]">تفاصيل الحضور</h2>
                  <p className="text-sm text-slate-500">
                    عدد النتائج: {filteredRows.length}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
                  التصدير حسب النتائج المعروضة
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-right text-sm">
                  <thead className="bg-[#15445A] text-white">
                    <tr>
                      <th className="px-4 py-3 font-bold">التاريخ</th>
                      <th className="px-4 py-3 font-bold">الحالة</th>
                      <th className="px-4 py-3 font-bold">الحصة</th>
                      <th className="px-4 py-3 font-bold">المادة</th>
                      <th className="px-4 py-3 font-bold">ملاحظات</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 text-slate-700">
                          {formatDate(row.attendance_date)}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(row.status)}`}>
                            {statusLabel(row.status)}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          {row.period_number ? `الحصة ${row.period_number}` : "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          {row.subject_name || "—"}
                        </td>

                        <td className="max-w-[360px] px-4 py-3 text-slate-600">
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

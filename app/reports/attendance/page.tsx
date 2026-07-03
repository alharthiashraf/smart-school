"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import { STAFF_ROLES } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  AlertCircle,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  PieChart as PieChartIcon,
  Printer,
  RefreshCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

type AttendanceSession = {
  id: string;
  school_id: string;
  teacher_id: string;
  class_name: string;
  section: string | null;
  attendance_date: string;
  period_number: number;
  status: string | null;
  created_at: string | null;
};

type AttendanceRecord = {
  id: string;
  session_id: string;
  school_id: string;
  student_id: string;
  attendance_status: AttendanceStatus;
  notes: string | null;
};

type Teacher = {
  id: string;
  full_name: string | null;
  subject: string | null;
};

type Student = {
  id: string;
  full_name: string | null;
  classroom: string | null;
  grade_level: string | null;
  section: string | null;
};

type ReportRow = AttendanceRecord & {
  session?: AttendanceSession;
  teacher?: Teacher;
  student?: Student;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

type QueryLike<T> = PromiseLike<QueryResult<T>>;

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "معذور",
};

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-emerald-50 text-emerald-700 border-emerald-100",
  absent: "bg-red-50 text-red-700 border-red-100",
  late: "bg-amber-50 text-amber-700 border-amber-100",
  excused: "bg-blue-50 text-blue-700 border-blue-100",
};

const CHART_COLORS = ["#07A869", "#EF4444", "#F59E0B", "#3D7EB9"];

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

function formatArabicDate(value?: string | null) {
  if (!value) return "غير متوفر";

  try {
    return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
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

async function safeQuery<T>(
  query: QueryLike<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    const result = await query;

    if (result.error) {
      console.warn(`attendance report query skipped: ${label}`, result.error);
      return fallback;
    }

    return result.data ?? fallback;
  } catch (error) {
    console.warn(`attendance report query failed: ${label}`, error);
    return fallback;
  }
}

function classLabel(session?: AttendanceSession) {
  if (!session) return "غير محدد";
  return `${session.class_name || "غير محدد"}${session.section ? ` - ${session.section}` : ""}`;
}

export default function AttendanceReportPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceStatus>(
    "all",
  );
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  const [toast, setToast] = useState<Toast | null>(null);
  const [lastUpdate, setLastUpdate] = useState("غير متوفر");

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchReport = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const sessionsData = await safeQuery<AttendanceSession[]>(
        supabase
          .from("student_attendance_sessions")
          .select("*")
          .eq("school_id", currentSchool.id)
          .gte("attendance_date", dateFrom)
          .lte("attendance_date", dateTo)
          .order("attendance_date", { ascending: false })
          .order("period_number", { ascending: true }),
        [],
        "student_attendance_sessions",
      );

      setSessions(sessionsData);

      if (sessionsData.length === 0) {
        setRows([]);
        setLastUpdate(
          new Intl.DateTimeFormat("ar-SA", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date()),
        );
        return;
      }

      const sessionIds = sessionsData.map((session) => session.id);
      const teacherIds = Array.from(
        new Set(
          sessionsData.map((session) => session.teacher_id).filter(Boolean),
        ),
      );

      const [records, teachers] = await Promise.all([
        safeQuery<AttendanceRecord[]>(
          supabase
            .from("student_attendance_records")
            .select("*")
            .eq("school_id", currentSchool.id)
            .in("session_id", sessionIds),
          [],
          "student_attendance_records",
        ),
        teacherIds.length > 0
          ? safeQuery<Teacher[]>(
              supabase
                .from("teachers")
                .select("id, full_name, subject")
                .eq("school_id", currentSchool.id)
                .in("id", teacherIds),
              [],
              "teachers",
            )
          : Promise.resolve([]),
      ]);

      const studentIds = Array.from(
        new Set(records.map((record) => record.student_id).filter(Boolean)),
      );
      const students =
        studentIds.length > 0
          ? await safeQuery<Student[]>(
              supabase
                .from("students")
                .select("id, full_name, classroom, grade_level, section")
                .eq("school_id", currentSchool.id)
                .in("id", studentIds),
              [],
              "students",
            )
          : [];

      const sessionMap = new Map(
        sessionsData.map((session) => [session.id, session]),
      );
      const teacherMap = new Map(
        teachers.map((teacher) => [teacher.id, teacher]),
      );
      const studentMap = new Map(
        students.map((student) => [student.id, student]),
      );

      const reportRows: ReportRow[] = records.map((record) => {
        const session = sessionMap.get(record.session_id);
        const teacher = session
          ? teacherMap.get(session.teacher_id)
          : undefined;
        const student = studentMap.get(record.student_id);

        return {
          ...record,
          session,
          teacher,
          student,
        };
      });

      setRows(reportRows);
      setLastUpdate(
        new Intl.DateTimeFormat("ar-SA", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date()),
      );
    } catch (error) {
      const message = getErrorMessage(error, "تعذر تحميل تقرير الحضور.");
      setErrorMsg(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, dateFrom, dateTo, showToast]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setErrorMsg("لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      setLoading(false);
      return;
    }

    queueMicrotask(() => {
      void fetchReport();
    });
  }, [currentSchool?.id, fetchReport, schoolLoading]);

  const teachers = useMemo(() => {
    const map = new Map<string, string>();

    rows.forEach((row) => {
      if (row.session?.teacher_id) {
        map.set(
          row.session.teacher_id,
          row.teacher?.full_name || "معلم بدون اسم",
        );
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  const classes = useMemo(() => {
    return Array.from(new Set(sessions.map((session) => classLabel(session))));
  }, [sessions]);

  const periods = useMemo(() => {
    return Array.from(
      new Set(sessions.map((session) => session.period_number)),
    ).sort((a, b) => a - b);
  }, [sessions]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      const session = row.session;
      const student = row.student;
      const teacher = row.teacher;
      const currentClass = classLabel(session);

      const text = [
        student?.full_name || "",
        currentClass,
        teacher?.full_name || "",
        teacher?.subject || "",
        STATUS_LABELS[row.attendance_status] || "",
        row.notes || "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || text.includes(keyword);
      const matchesStatus =
        statusFilter === "all" || row.attendance_status === statusFilter;
      const matchesTeacher =
        teacherFilter === "all" || session?.teacher_id === teacherFilter;
      const matchesClass =
        classFilter === "all" || currentClass === classFilter;
      const matchesPeriod =
        periodFilter === "all" ||
        String(session?.period_number || "") === periodFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesTeacher &&
        matchesClass &&
        matchesPeriod
      );
    });
  }, [rows, search, statusFilter, teacherFilter, classFilter, periodFilter]);

  const stats = useMemo(() => {
    const present = filteredRows.filter(
      (row) => row.attendance_status === "present",
    ).length;
    const absent = filteredRows.filter(
      (row) => row.attendance_status === "absent",
    ).length;
    const late = filteredRows.filter(
      (row) => row.attendance_status === "late",
    ).length;
    const excused = filteredRows.filter(
      (row) => row.attendance_status === "excused",
    ).length;
    const total = filteredRows.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    const risk = absent + late;

    return { total, present, absent, late, excused, rate, risk };
  }, [filteredRows]);

  const statusPieData = [
    { name: "حاضر", value: stats.present },
    { name: "غائب", value: stats.absent },
    { name: "متأخر", value: stats.late },
    { name: "معذور", value: stats.excused },
  ].filter((item) => item.value > 0);

  const classBarData = useMemo(() => {
    const map = new Map<
      string,
      {
        className: string;
        total: number;
        present: number;
        absent: number;
        late: number;
      }
    >();

    filteredRows.forEach((row) => {
      const name = classLabel(row.session);
      const current = map.get(name) || {
        className: name,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
      };

      current.total += 1;
      if (row.attendance_status === "present") current.present += 1;
      if (row.attendance_status === "absent") current.absent += 1;
      if (row.attendance_status === "late") current.late += 1;

      map.set(name, current);
    });

    return Array.from(map.values())
      .map((item) => ({
        name: item.className,
        total: item.total,
        rate:
          item.total > 0 ? Math.round((item.present / item.total) * 100) : 0,
      }))
      .slice(0, 8);
  }, [filteredRows]);

  const trendData = useMemo(() => {
    const map = new Map<
      string,
      { date: string; total: number; present: number }
    >();

    filteredRows.forEach((row) => {
      const date = row.session?.attendance_date || dateFrom;
      const current = map.get(date) || { date, total: 0, present: 0 };
      current.total += 1;
      if (row.attendance_status === "present") current.present += 1;
      map.set(date, current);
    });

    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        name: formatArabicDate(item.date),
        rate:
          item.total > 0 ? Math.round((item.present / item.total) * 100) : 0,
      }));
  }, [filteredRows, dateFrom]);

  const executiveCards = [
    {
      title: "نسبة الحضور",
      value: `${stats.rate}%`,
      description: `${stats.present} حاضر من أصل ${stats.total} سجل`,
      icon: <UserCheck size={24} />,
      tone:
        stats.rate >= 90
          ? ("green" as const)
          : stats.rate >= 75
            ? ("amber" as const)
            : ("red" as const),
    },
    {
      title: "الغياب",
      value: stats.absent,
      description: "طلاب مسجلون كغياب في الفترة المحددة",
      icon: <XCircle size={24} />,
      tone:
        stats.absent === 0
          ? ("green" as const)
          : stats.absent <= 5
            ? ("amber" as const)
            : ("red" as const),
    },
    {
      title: "التأخر",
      value: stats.late,
      description: "حالات تأخر تحتاج متابعة يومية",
      icon: <Clock size={24} />,
      tone:
        stats.late === 0
          ? ("green" as const)
          : stats.late <= 5
            ? ("amber" as const)
            : ("red" as const),
    },
    {
      title: "المتابعة العاجلة",
      value: stats.risk,
      description: "غياب + تأخر كمؤشر انضباط عام",
      icon: <ShieldCheck size={24} />,
      tone:
        stats.risk === 0
          ? ("green" as const)
          : stats.risk <= 10
            ? ("amber" as const)
            : ("red" as const),
    },
  ];

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setTeacherFilter("all");
    setClassFilter("all");
    setPeriodFilter("all");
  }

  function getExportRows() {
    return filteredRows.map((row) => [
      row.student?.full_name || "-",
      STATUS_LABELS[row.attendance_status] || "-",
      row.teacher?.full_name || "-",
      row.teacher?.subject || "-",
      classLabel(row.session),
      row.session?.period_number || "-",
      row.session?.attendance_date || "-",
      row.notes || "-",
    ]);
  }

  function exportPDF() {
    (exportTableToPDF as any)({
      title: "تقرير الحضور والغياب",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: `من ${formatArabicDate(dateFrom)} إلى ${formatArabicDate(dateTo)} — نسبة الحضور ${stats.rate}%`,
      headers: [
        "الطالب",
        "الحالة",
        "المعلم",
        "المادة",
        "الفصل",
        "الحصة",
        "التاريخ",
        "ملاحظات",
      ],
      rows: getExportRows(),
      fileName: `تقرير الحضور والغياب ${dateFrom} - ${dateTo}.pdf`,
    });

    showToast("success", "تم تصدير تقرير الحضور بصيغة PDF");
  }

  function exportExcel() {
    (exportTableToExcel as any)({
      title: "تقرير الحضور والغياب",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: `من ${formatArabicDate(dateFrom)} إلى ${formatArabicDate(dateTo)} — نسبة الحضور ${stats.rate}%`,
      headers: [
        "الطالب",
        "الحالة",
        "المعلم",
        "المادة",
        "الفصل",
        "الحصة",
        "التاريخ",
        "ملاحظات",
      ],
      rows: getExportRows(),
      fileName: `تقرير الحضور والغياب ${dateFrom} - ${dateTo}.xlsx`,
      sheetName: "Attendance",
    });

    showToast("success", "تم تصدير تقرير الحضور بصيغة Excel");
  }

  function printPage() {
    window.print();
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <LoadingScreen />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center font-bold text-red-700">
            لا توجد مدرسة مرتبطة بالمستخدم الحالي.
          </div>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AppShell>
        <main className="space-y-6 pb-10" dir="rtl">
          {toast && <ToastBox toast={toast} onClose={() => setToast(null)} />}

          <section className="relative overflow-hidden rounded-[34px] bg-[#15445A] p-6 text-white shadow-xl print:hidden md:p-8">
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#0DA9A6]/20 blur-3xl" />
            <div className="absolute -bottom-24 right-1/3 h-72 w-72 rounded-full bg-[#C1B489]/20 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-[#C1B489]">
                  <CalendarCheck size={17} />
                  منصة المدرسة الذكية
                </div>

                <h1 className="text-4xl font-black md:text-5xl">
                  تقرير الحضور والغياب
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
                  لوحة تنفيذية يومية لمتابعة الحضور والغياب والتأخر حسب الطالب
                  والمعلم والحصة والفصل، مع فلاتر متقدمة وتصدير رسمي PDF وExcel.
                </p>
              </div>

              <div className="grid min-w-[320px] gap-3 sm:grid-cols-2">
                <InfoPill
                  label="المدرسة"
                  value={currentSchool.school_name || "غير متوفر"}
                />
                <InfoPill label="آخر تحديث" value={lastUpdate} />
                <InfoPill label="من تاريخ" value={formatArabicDate(dateFrom)} />
                <InfoPill label="إلى تاريخ" value={formatArabicDate(dateTo)} />
              </div>
            </div>
          </section>

          {errorMsg && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
              {errorMsg}
            </div>
          )}

          <section className="hidden print:block">
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-black">تقرير الحضور والغياب</h1>
              <p className="mt-2 text-sm text-slate-600">
                {currentSchool.school_name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                من {formatArabicDate(dateFrom)} إلى {formatArabicDate(dateTo)}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {executiveCards.map((card) => (
              <ExecutiveCard key={card.title} {...card} />
            ))}
          </section>

          <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm print:hidden">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-black text-[#15445A]">
                  البحث والفلاتر المتقدمة
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  اختر الفترة، الحالة، المعلم، الفصل، أو الحصة لعرض التقرير
                  المطلوب فقط.
                </p>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex w-fit items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-200"
              >
                <X size={16} />
                تصفير الفلاتر
              </button>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.5fr_1fr]">
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
              />

              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
              />

              <div className="relative">
                <Search className="absolute right-4 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث عن طالب، معلم، مادة، فصل، ملاحظة..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-12 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                />
              </div>

              <FilterSelect
                value={statusFilter}
                onChange={(value) =>
                  setStatusFilter(value as typeof statusFilter)
                }
              >
                <option value="all">كل الحالات</option>
                <option value="present">حاضر</option>
                <option value="absent">غائب</option>
                <option value="late">متأخر</option>
                <option value="excused">معذور</option>
              </FilterSelect>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <FilterSelect value={teacherFilter} onChange={setTeacherFilter}>
                <option value="all">كل المعلمين</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect value={classFilter} onChange={setClassFilter}>
                <option value="all">كل الفصول</option>
                {classes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect value={periodFilter} onChange={setPeriodFilter}>
                <option value="all">كل الحصص</option>
                {periods.map((period) => (
                  <option key={period} value={String(period)}>
                    الحصة {period}
                  </option>
                ))}
              </FilterSelect>
            </div>
          </section>

          <section className="flex flex-wrap gap-3 print:hidden">
            <QuickAction
              icon={<RefreshCcw size={17} />}
              label="تحديث التقرير"
              onClick={() => void fetchReport()}
            />
            <QuickAction
              icon={<Printer size={17} />}
              label="طباعة"
              onClick={printPage}
            />
            <QuickAction
              icon={<FileText size={17} />}
              label="تصدير PDF"
              onClick={exportPDF}
              primary
              disabled={filteredRows.length === 0}
            />
            <QuickAction
              icon={<FileSpreadsheet size={17} />}
              label="تصدير Excel"
              onClick={exportExcel}
              disabled={filteredRows.length === 0}
            />
            <QuickAction
              icon={<Download size={17} />}
              label="تحديث البيانات"
              onClick={() => void fetchReport()}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <ChartCard
              title="توزيع حالات الحضور"
              icon={<PieChartIcon size={20} />}
            >
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={92}
                      label
                    >
                      {statusPieData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <NoChartData />
              )}
            </ChartCard>

            <ChartCard
              title="نسبة الحضور حسب الفصل"
              icon={<BarChart3 size={20} />}
            >
              {classBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={classBarData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar
                      dataKey="rate"
                      radius={[12, 12, 0, 0]}
                      fill="#0DA9A6"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <NoChartData />
              )}
            </ChartCard>

            <ChartCard
              title="اتجاه الحضور خلال الفترة"
              icon={<TrendingUp size={20} />}
            >
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#15445A"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <NoChartData />
              )}
            </ChartCard>
          </section>

          <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#15445A]">
                  سجل الحضور التفصيلي
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredRows.length} سجل مطابق للفلاتر الحالية من أصل{" "}
                  {rows.length} سجل.
                </p>
              </div>

              <span className="w-fit rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-500">
                نسبة الحضور {stats.rate}%
              </span>
            </div>

            {filteredRows.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px] text-right text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-4">الطالب</th>
                        <th className="p-4">الحالة</th>
                        <th className="p-4">المعلم</th>
                        <th className="p-4">المادة</th>
                        <th className="p-4">الفصل</th>
                        <th className="p-4">الحصة</th>
                        <th className="p-4">التاريخ</th>
                        <th className="p-4">ملاحظات</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="p-4 font-black text-[#15445A]">
                            {row.student?.full_name || "-"}
                          </td>
                          <td className="p-4">
                            <StatusBadge status={row.attendance_status} />
                          </td>
                          <td className="p-4 text-slate-600">
                            {row.teacher?.full_name || "-"}
                          </td>
                          <td className="p-4 text-slate-600">
                            {row.teacher?.subject || "-"}
                          </td>
                          <td className="p-4 text-slate-600">
                            {classLabel(row.session)}
                          </td>
                          <td className="p-4 text-slate-600">
                            {row.session?.period_number
                              ? `الحصة ${row.session.period_number}`
                              : "-"}
                          </td>
                          <td className="p-4 text-slate-600">
                            {formatArabicDate(row.session?.attendance_date)}
                          </td>
                          <td className="p-4 text-slate-500">
                            {row.notes || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-3xl border bg-white px-6 py-4 text-slate-600 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-[#15445A]" />
        جاري تحميل تقرير الحضور...
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
      <p className="text-xs text-white/60">{label}</p>
      <p className="mt-1 line-clamp-1 font-bold text-white">{value}</p>
    </div>
  );
}

function ExecutiveCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  tone: "green" | "amber" | "red";
}) {
  const colors = {
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    red: "border-red-100 bg-red-50 text-red-700",
  };

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${colors[tone]}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/75">
          {icon}
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black">
          KPI
        </span>
      </div>

      <p className="text-sm font-black opacity-80">{title}</p>
      <h3 className="mt-2 text-3xl font-black">{value}</h3>
      <p className="mt-2 text-xs font-bold leading-6 opacity-75">
        {description}
      </p>
    </div>
  );
}

function FilterSelect({
  children,
  value,
  onChange,
}: {
  children: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-[#15445A] outline-none transition focus:border-[#0DA9A6] focus:bg-white"
    >
      {children}
    </select>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
  primary,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${
        primary
          ? "bg-[#15445A] text-white"
          : "border border-slate-100 bg-white text-[#15445A]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ChartCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-2xl bg-[#0DA9A6]/10 p-2 text-[#0DA9A6]">
          {icon}
        </div>
        <h2 className="font-black text-[#15445A]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function NoChartData() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-3xl bg-slate-50 text-center">
      <div>
        <PieChartIcon className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-bold text-slate-500">
          لا توجد بيانات كافية للرسم البياني
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
      <CalendarDays className="mx-auto mb-3 h-10 w-10 text-slate-300" />
      <h3 className="text-lg font-black text-[#15445A]">
        لا توجد سجلات حضور مطابقة
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        غيّر التاريخ أو الفلاتر، أو تأكد من تسجيل الحضور لهذا اليوم.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function ToastBox({ toast, onClose }: { toast: Toast; onClose: () => void }) {
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
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={onClose}
        className="mr-2 rounded-full bg-white/15 p-1"
      >
        <X size={14} />
      </button>
    </div>
  );
}

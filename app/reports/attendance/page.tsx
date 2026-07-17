"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import SharedExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import UiEmptyState from "@/components/ui/empty-state/EmptyState";
import ErrorState from "@/components/ui/feedback/ErrorState";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import PageLoader from "@/components/ui/loading/PageLoader";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExportButton from "@/components/ui/buttons/ExportButton";
import RoleGuard from "@/components/auth/RoleGuard";
import { STAFF_ROLES } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Clock,
  FileSpreadsheet,
  FileText,
  PieChart as PieChartIcon,
  Printer,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
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
  present:
    "border-[color-mix(in_srgb,var(--app-success)_26%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]",
  absent:
    "border-[color-mix(in_srgb,var(--app-danger)_26%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]",
  late:
    "border-[color-mix(in_srgb,var(--app-accent)_32%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]",
  excused:
    "border-[color-mix(in_srgb,var(--app-primary)_26%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]",
};

const CHART_COLORS = [
  "var(--app-success)",
  "var(--app-danger)",
  "var(--app-accent)",
  "var(--app-primary)",
];

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
  _label: string,
): Promise<T> {
  try {
    const result = await query;

    if (result.error) {
      return fallback;
    }

    return result.data ?? fallback;
  } catch {
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

    void fetchReport();
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

  const statusPieData = useMemo(
    () =>
      [
        { name: "حاضر", value: stats.present },
        { name: "غائب", value: stats.absent },
        { name: "متأخر", value: stats.late },
        { name: "معذور", value: stats.excused },
      ].filter((item) => item.value > 0),
    [stats.absent, stats.excused, stats.late, stats.present],
  );

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
      subtitle: `${stats.present} حاضر من أصل ${stats.total} سجل`,
      icon: <UserCheck size={24} aria-hidden="true" />,
      tone:
        stats.rate >= 90
          ? ("green" as const)
          : stats.rate >= 75
            ? ("gold" as const)
            : ("red" as const),
    },
    {
      title: "الغياب",
      value: stats.absent,
      subtitle: "حالات الغياب في الفترة المحددة",
      icon: <XCircle size={24} aria-hidden="true" />,
      tone:
        stats.absent === 0
          ? ("green" as const)
          : stats.absent <= 5
            ? ("gold" as const)
            : ("red" as const),
    },
    {
      title: "التأخر",
      value: stats.late,
      subtitle: "حالات تأخر تحتاج متابعة يومية",
      icon: <Clock size={24} aria-hidden="true" />,
      tone:
        stats.late === 0
          ? ("green" as const)
          : stats.late <= 5
            ? ("gold" as const)
            : ("red" as const),
    },
    {
      title: "المتابعة العاجلة",
      value: stats.risk,
      subtitle: "الغياب والتأخر كمؤشر انضباط عام",
      icon: <ShieldCheck size={24} aria-hidden="true" />,
      tone:
        stats.risk === 0
          ? ("green" as const)
          : stats.risk <= 10
            ? ("gold" as const)
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
    exportTableToPDF({
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
    exportTableToExcel({
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
          <PageLoader text="جاري تحميل تقرير الحضور..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <div className="rounded-[var(--app-radius-xl)] border border-[color-mix(in_srgb,var(--app-danger)_30%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] p-6 text-center font-bold text-[var(--app-danger)]">
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
            title="تقرير الحضور والغياب"
            description="متابعة الحضور والغياب والتأخر حسب الطالب والمعلم والحصة والفصل، مع تصدير رسمي PDF وExcel."
            badge="التقارير التشغيلية"
            icon={<CalendarCheck size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "التقارير", href: "/reports" },
              { label: "الحضور والغياب" },
            ]}
            meta={[
              {
                label: "المدرسة",
                value: currentSchool.school_name || "غير متوفر",
              },
              { label: "آخر تحديث", value: lastUpdate },
              { label: "من تاريخ", value: formatArabicDate(dateFrom) },
              { label: "إلى تاريخ", value: formatArabicDate(dateTo) },
            ]}
            actions={
              <>
                <SecondaryButton
                  icon={<RefreshCcw size={17} aria-hidden="true" />}
                  onClick={() => void fetchReport()}
                >
                  تحديث
                </SecondaryButton>

                <SecondaryButton
                  icon={<Printer size={17} aria-hidden="true" />}
                  onClick={() => window.print()}
                >
                  طباعة
                </SecondaryButton>

                <ExportButton
                  icon={<FileText size={17} aria-hidden="true" />}
                  onClick={exportPDF}
                  disabled={filteredRows.length === 0}
                >
                  PDF
                </ExportButton>

                <ExportButton
                  icon={<FileSpreadsheet size={17} aria-hidden="true" />}
                  onClick={exportExcel}
                  disabled={filteredRows.length === 0}
                >
                  Excel
                </ExportButton>
              </>
            }
          />

          {errorMsg && <ErrorState description={errorMsg} />}

          <section className="hidden print:block">
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-black">تقرير الحضور والغياب</h1>
              <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                {currentSchool.school_name}
              </p>
              <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                من {formatArabicDate(dateFrom)} إلى {formatArabicDate(dateTo)}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {executiveCards.map((card) => (
              <SharedExecutiveCard key={card.title} {...card} />
            ))}
          </section>

          <SummaryCard
            title="ملخص الحضور"
            description="قراءة سريعة لنتائج الفترة والفلاتر الحالية."
            tone={
              stats.rate >= 90
                ? "green"
                : stats.rate >= 75
                  ? "gold"
                  : "red"
            }
            items={[
              { label: "إجمالي السجلات", value: stats.total },
              { label: "الحضور", value: stats.present },
              { label: "الغياب", value: stats.absent },
              { label: "التأخر", value: stats.late },
              { label: "المعذورون", value: stats.excused },
              { label: "نسبة الحضور", value: `${stats.rate}%` },
            ]}
            footer="تتغير المؤشرات مباشرة بحسب الفترة والفلاتر المحددة."
          />

          <PageToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder:
                "ابحث عن طالب، معلم، مادة، فصل أو ملاحظة...",
            }}
            filters={
              <>
                <ToolbarSelect
                  value={statusFilter}
                  onChange={(value) =>
                    setStatusFilter(
                      value as "all" | AttendanceStatus,
                    )
                  }
                >
                  <option value="all">كل الحالات</option>
                  <option value="present">حاضر</option>
                  <option value="absent">غائب</option>
                  <option value="late">متأخر</option>
                  <option value="excused">معذور</option>
                </ToolbarSelect>

                <ToolbarSelect
                  value={teacherFilter}
                  onChange={setTeacherFilter}
                >
                  <option value="all">كل المعلمين</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </ToolbarSelect>

                <ToolbarSelect
                  value={classFilter}
                  onChange={setClassFilter}
                >
                  <option value="all">كل الفصول</option>
                  {classes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </ToolbarSelect>

                <ToolbarSelect
                  value={periodFilter}
                  onChange={setPeriodFilter}
                >
                  <option value="all">كل الحصص</option>
                  {periods.map((period) => (
                    <option key={period} value={String(period)}>
                      الحصة {period}
                    </option>
                  ))}
                </ToolbarSelect>
              </>
            }
            onRefresh={() => void fetchReport()}
            onExportPDF={exportPDF}
            onExportExcel={exportExcel}
            onPrint={printPage}
          />

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] print:hidden">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-[var(--app-text)]">
                  الفترة الزمنية
                </h2>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  حدّد بداية ونهاية الفترة ثم حدّث التقرير.
                </p>
              </div>

              <SecondaryButton
                icon={<X size={16} aria-hidden="true" />}
                onClick={resetFilters}
              >
                تصفير الفلاتر
              </SecondaryButton>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <DateField
                id="attendance-date-from"
                label="من تاريخ"
                value={dateFrom}
                onChange={setDateFrom}
              />

              <DateField
                id="attendance-date-to"
                label="إلى تاريخ"
                value={dateTo}
                onChange={setDateTo}
              />
            </div>
          </section>

          <section className="flex flex-wrap gap-3 print:hidden">
            <SecondaryButton
              icon={<RefreshCcw size={17} aria-hidden="true" />}
              onClick={() => void fetchReport()}
            >
              تحديث التقرير
            </SecondaryButton>

            <SecondaryButton
              icon={<Printer size={17} aria-hidden="true" />}
              onClick={printPage}
            >
              طباعة
            </SecondaryButton>

            <PrimaryButton
              icon={<FileText size={17} aria-hidden="true" />}
              onClick={exportPDF}
              disabled={filteredRows.length === 0}
            >
              تصدير PDF
            </PrimaryButton>

            <ExportButton
              icon={<FileSpreadsheet size={17} aria-hidden="true" />}
              onClick={exportExcel}
              disabled={filteredRows.length === 0}
            >
              تصدير Excel
            </ExportButton>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <ChartCard
              title="توزيع حالات الحضور"
              icon={<PieChartIcon size={20} aria-hidden="true" />}
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
              icon={<BarChart3 size={20} aria-hidden="true" />}
            >
              {classBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={classBarData}>
                    <CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar
                      dataKey="rate"
                      radius={[12, 12, 0, 0]}
                      fill="var(--app-primary)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <NoChartData />
              )}
            </ChartCard>

            <ChartCard
              title="اتجاه الحضور خلال الفترة"
              icon={<TrendingUp size={20} aria-hidden="true" />}
            >
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendData}>
                    <CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="var(--app-primary)"
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

          <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-[var(--app-text)]">
                  سجل الحضور التفصيلي
                </h2>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  {filteredRows.length} سجل مطابق للفلاتر الحالية من أصل{" "}
                  {rows.length} سجل.
                </p>
              </div>

              <span className="w-fit rounded-full bg-[var(--app-card-soft)] px-4 py-2 text-xs font-black text-[var(--app-text-muted)]">
                نسبة الحضور {stats.rate}%
              </span>
            </div>

            {filteredRows.length === 0 ? (
              <UiEmptyState
                icon={
                  <CalendarDays
                    className="h-8 w-8"
                    aria-hidden="true"
                  />
                }
                title="لا توجد سجلات حضور مطابقة"
                description="غيّر الفترة أو الفلاتر، أو تأكد من تسجيل الحضور."
              />
            ) : (
              <div className="overflow-hidden rounded-[var(--app-radius-lg)] border border-[var(--app-border)]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px] text-right text-sm">
                    <thead className="bg-[var(--app-card-soft)] text-[var(--app-text-muted)]">
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

                    <tbody className="divide-y divide-[var(--app-border)]">
                      {filteredRows.map((row) => (
                        <tr key={row.id} className="hover:bg-[var(--app-card-soft)]">
                          <td className="p-4 font-black text-[var(--app-text)]">
                            {row.student?.full_name || "-"}
                          </td>
                          <td className="p-4">
                            <StatusBadge status={row.attendance_status} />
                          </td>
                          <td className="p-4 text-[var(--app-text-muted)]">
                            {row.teacher?.full_name || "-"}
                          </td>
                          <td className="p-4 text-[var(--app-text-muted)]">
                            {row.teacher?.subject || "-"}
                          </td>
                          <td className="p-4 text-[var(--app-text-muted)]">
                            {classLabel(row.session)}
                          </td>
                          <td className="p-4 text-[var(--app-text-muted)]">
                            {row.session?.period_number
                              ? `الحصة ${row.session.period_number}`
                              : "-"}
                          </td>
                          <td className="p-4 text-[var(--app-text-muted)]">
                            {formatArabicDate(row.session?.attendance_date)}
                          </td>
                          <td className="p-4 text-[var(--app-text-muted)]">
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


function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="space-y-2 text-sm font-bold text-[var(--app-text)]"
    >
      <span>{label}</span>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
      />
    </label>
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
    <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-[var(--app-radius-lg)] bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] p-2 text-[var(--app-primary)]">
          {icon}
        </div>
        <h2 className="font-black text-[var(--app-text)]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function NoChartData() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-[var(--app-radius-xl)] bg-[var(--app-card-soft)] text-center">
      <div>
        <PieChartIcon
          className="mx-auto mb-3 h-8 w-8 text-[var(--app-text-subtle)]"
          aria-hidden="true"
        />
        <p className="text-sm font-bold text-[var(--app-text-muted)]">
          لا توجد بيانات كافية للرسم البياني
        </p>
      </div>
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

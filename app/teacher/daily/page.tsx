"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Grid2X2,
  HeartPulse,
  LayoutList,
  Loader2,
  RefreshCcw,
  Save,
  Search,
  ShieldAlert,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";

type Teacher = {
  id: string;
  full_name: string;
  email?: string | null;
  subject?: string | null;
};

type ScheduleItem = {
  id: string;
  teacher_id: string;
  day_name?: string | null;
  period_number?: number | null;
  class_name?: string | null;
  section?: string | null;
  subject?: string | null;
};

type Student = {
  id: string;
  full_name?: string | null;
  class_name?: string | null;
  section?: string | null;
};

type AttendanceStatus = "حاضر" | "غائب" | "متأخر" | "مستأذن";

type AttendanceRow = {
  student_id: string;
  status: AttendanceStatus;
  notes: string;
};

type AttendanceDbRow = {
  student_id?: string | null;
  attendance_status?: string | null;
  status?: string | null;
  notes?: string | null;
};

type StudentQuickStats = {
  attendance: number;
  behavior: number;
  health: number;
  referrals: number;
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

type ViewMode = "table" | "cards";
type StatusFilter = "الكل" | AttendanceStatus;

const ALLOWED_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "teacher",
];

const STATUS_OPTIONS: AttendanceStatus[] = ["حاضر", "غائب", "متأخر", "مستأذن"];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function todayArabicDay() {
  return new Date().toLocaleDateString("ar-SA", { weekday: "long" });
}

function normalizeStatus(value?: string | null): AttendanceStatus {
  const status = String(value || "").trim();

  if (status === "غائب" || status === "absent") return "غائب";
  if (status === "متأخر" || status === "late") return "متأخر";
  if (status === "مستأذن" || status === "excused") return "مستأذن";

  return "حاضر";
}

function statusStyle(status: AttendanceStatus) {
  if (status === "حاضر") return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
  if (status === "غائب") return "border-red-200 bg-red-50 text-red-700";
  if (status === "متأخر") return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";
  return "border-[#3D7EB9]/20 bg-[#3D7EB9]/10 text-[#3D7EB9]";
}

function statusDot(status: AttendanceStatus) {
  if (status === "حاضر") return "bg-[#07A869]";
  if (status === "غائب") return "bg-red-600";
  if (status === "متأخر") return "bg-[#C1B489]";
  return "bg-[#3D7EB9]";
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
      console.warn(`teacher daily query skipped: ${label}`, result.error);
      return fallback;
    }

    return result.data ?? fallback;
  } catch (error) {
    console.warn(`teacher daily query failed: ${label}`, error);
    return fallback;
  }
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function TeacherDailyPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRow>>({});

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [behaviorStudent, setBehaviorStudent] = useState<Student | null>(null);
  const [healthStudent, setHealthStudent] = useState<Student | null>(null);
  const [studentStats, setStudentStats] = useState<StudentQuickStats>({
    attendance: 0,
    behavior: 0,
    health: 0,
    referrals: 0,
  });

  const [behaviorType, setBehaviorType] = useState("");
  const [behaviorNotes, setBehaviorNotes] = useState("");
  const [healthReason, setHealthReason] = useState("");
  const [healthNotes, setHealthNotes] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("الكل");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const today = todayDate();
  const todayName = todayArabicDay();

  const selectedLesson = useMemo(() => {
    return schedule.find((item) => item.id === selectedScheduleId) || null;
  }, [schedule, selectedScheduleId]);

  const stats = useMemo(() => {
    const rows = Object.values(attendance);

    return {
      total: students.length,
      present: rows.filter((row) => row.status === "حاضر").length,
      absent: rows.filter((row) => row.status === "غائب").length,
      late: rows.filter((row) => row.status === "متأخر").length,
      excused: rows.filter((row) => row.status === "مستأذن").length,
    };
  }, [attendance, students.length]);

  const completionRate = useMemo(() => {
    if (!stats.total) return 0;
    return percentage(Object.keys(attendance).length, stats.total);
  }, [attendance, stats.total]);

  const attendanceRate = useMemo(() => {
    if (!stats.total) return 0;
    return percentage(stats.present, stats.total);
  }, [stats.present, stats.total]);

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return students.filter((student) => {
      const row = attendance[student.id];
      const status = row?.status || "حاضر";
      const text = [
        student.full_name,
        student.class_name,
        student.section,
        row?.notes,
        status,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || text.includes(keyword);
      const matchesStatus = statusFilter === "الكل" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [attendance, search, statusFilter, students]);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  const resetPage = useCallback(() => {
    setTeacher(null);
    setSchedule([]);
    setSelectedScheduleId("");
    setStudents([]);
    setAttendance({});
  }, []);

  const loadStudents = useCallback(
    async (lesson: ScheduleItem) => {
      if (!currentSchool?.id) return;

      setStudentsLoading(true);

      try {
        let query = supabase
          .from("students")
          .select("id, full_name, class_name, section")
          .eq("school_id", currentSchool.id);

        if (lesson.class_name) query = query.eq("class_name", lesson.class_name);
        if (lesson.section) query = query.eq("section", lesson.section);

        const { data: studentsData, error: studentsError } = await query.order(
          "full_name",
          { ascending: true },
        );

        if (studentsError) throw studentsError;

        const loadedStudents = (studentsData || []) as Student[];
        setStudents(loadedStudents);

        if (loadedStudents.length === 0) {
          setAttendance({});
          return;
        }

        const studentIds = loadedStudents.map((student) => student.id);

        const { data: oldAttendance, error: attendanceError } = await supabase
          .from("student_attendance_records")
          .select("student_id, attendance_status, status, notes")
          .eq("school_id", currentSchool.id)
          .eq("attendance_date", today)
          .in("student_id", studentIds);

        if (attendanceError) throw attendanceError;

        const map: Record<string, AttendanceRow> = {};

        loadedStudents.forEach((student) => {
          map[student.id] = {
            student_id: student.id,
            status: "حاضر",
            notes: "",
          };
        });

        ((oldAttendance || []) as AttendanceDbRow[]).forEach((row) => {
          const studentId = row.student_id || "";

          if (!studentId || !map[studentId]) return;

          map[studentId] = {
            student_id: studentId,
            status: normalizeStatus(row.attendance_status || row.status),
            notes: row.notes || "",
          };
        });

        setAttendance(map);
      } catch (error) {
        setStudents([]);
        setAttendance({});
        showToast("error", getErrorMessage(error, "تعذر تحميل طلاب الحصة."));
      } finally {
        setStudentsLoading(false);
      }
    },
    [currentSchool?.id, showToast, today],
  );

  const fetchPage = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      const userEmail = user?.email?.trim().toLowerCase() || "";

      if (!user?.id || !userEmail) {
        resetPage();
        setErrorMsg("لم يتم العثور على مستخدم مسجل الدخول.");
        return;
      }

      const teacherData = await safeQuery<Teacher | null>(
        supabase
          .from("teachers")
          .select("id, full_name, email, subject")
          .eq("school_id", currentSchool.id)
          .ilike("email", userEmail)
          .limit(1)
          .maybeSingle(),
        null,
        "teacher-by-email",
      );

      if (!teacherData?.id) {
        resetPage();
        setErrorMsg("لم يتم العثور على معلم مطابق لبريد تسجيل الدخول.");
        return;
      }

      setTeacher(teacherData);

      const scheduleData = await safeQuery<ScheduleItem[]>(
        supabase
          .from("teacher_schedule")
          .select("*")
          .eq("school_id", currentSchool.id)
          .eq("teacher_id", teacherData.id)
          .order("day_name", { ascending: true })
          .order("period_number", { ascending: true }),
        [],
        "teacher_schedule",
      );

      const lessons = scheduleData || [];
      setSchedule(lessons);

      const todayLessons = lessons.filter((item) => item.day_name === todayName);
      const firstLesson = todayLessons[0] || lessons[0] || null;

      setSelectedScheduleId(firstLesson?.id || "");

      if (firstLesson) {
        await loadStudents(firstLesson);
      } else {
        setStudents([]);
        setAttendance({});
      }
    } catch (error) {
      resetPage();
      const message = getErrorMessage(error, "تعذر تحميل مركز إدارة الحصة.");
      setErrorMsg(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, loadStudents, resetPage, showToast, todayName]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      resetPage();
      setErrorMsg("لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      return;
    }

    queueMicrotask(() => {
      void fetchPage();
    });
  }, [currentSchool?.id, fetchPage, resetPage, schoolLoading]);

  async function loadStudentQuickStats(student: Student) {
    if (!currentSchool?.id) return;

    const [attendanceRows, behaviorRows, healthRows, referralRows] =
      await Promise.all([
        safeQuery<{ id: string }[]>(
          supabase
            .from("student_attendance_records")
            .select("id")
            .eq("school_id", currentSchool.id)
            .eq("student_id", student.id),
          [],
          "student-attendance-count",
        ),
        safeQuery<{ id: string }[]>(
          supabase
            .from("student_behavior")
            .select("id")
            .eq("school_id", currentSchool.id)
            .eq("student_id", student.id),
          [],
          "student-behavior-count",
        ),
        safeQuery<{ id: string }[]>(
          supabase
            .from("health_visits")
            .select("id")
            .eq("school_id", currentSchool.id)
            .eq("student_id", student.id),
          [],
          "student-health-count",
        ),
        safeQuery<{ id: string }[]>(
          supabase
            .from("student_referrals")
            .select("id")
            .eq("school_id", currentSchool.id)
            .eq("student_id", student.id),
          [],
          "student-referrals-count",
        ),
      ]);

    setStudentStats({
      attendance: attendanceRows.length,
      behavior: behaviorRows.length,
      health: healthRows.length,
      referrals: referralRows.length,
    });
  }

  function openStudentPanel(student: Student) {
    setSelectedStudent(student);
    setStudentStats({
      attendance: 0,
      behavior: 0,
      health: 0,
      referrals: 0,
    });

    void loadStudentQuickStats(student);
  }

  function markAllPresent() {
    const map: Record<string, AttendanceRow> = {};

    students.forEach((student) => {
      map[student.id] = {
        student_id: student.id,
        status: "حاضر",
        notes: attendance[student.id]?.notes || "",
      };
    });

    setAttendance(map);
  }

  async function saveAttendance() {
    if (!currentSchool?.id || !teacher?.id || !selectedLesson) {
      showToast("error", "اختر الحصة أولًا.");
      return;
    }

    const rows = Object.values(attendance);

    if (rows.length === 0) {
      showToast("error", "لا يوجد طلاب لحفظ الحضور.");
      return;
    }

    setSaving(true);

    try {
      const studentIds = rows.map((row) => row.student_id);

      const { error: deleteError } = await supabase
        .from("student_attendance_records")
        .delete()
        .eq("school_id", currentSchool.id)
        .eq("attendance_date", today)
        .in("student_id", studentIds);

      if (deleteError) throw deleteError;

      const payload = rows.map((row) => ({
        school_id: currentSchool.id,
        student_id: row.student_id,
        teacher_id: teacher.id,
        attendance_date: today,
        class_name: selectedLesson.class_name || null,
        section: selectedLesson.section || null,
        attendance_status: row.status,
        status: row.status,
        notes: row.notes || null,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from("student_attendance_records")
        .insert(payload);

      if (insertError) throw insertError;

      showToast("success", "تم حفظ الحضور والغياب بنجاح.");
    } catch (error) {
      showToast("error", getErrorMessage(error, "تعذر حفظ الحضور."));
    } finally {
      setSaving(false);
    }
  }

  async function saveBehavior() {
    if (!currentSchool?.id || !behaviorStudent) return;

    if (!behaviorType.trim()) {
      showToast("error", "اكتب نوع المخالفة.");
      return;
    }

    setModalSaving(true);

    try {
      const { error } = await supabase.from("student_behavior").insert({
        school_id: currentSchool.id,
        student_id: behaviorStudent.id,
        behavior_date: today,
        violation_type: behaviorType.trim(),
        violation_level: "متوسطة",
        action_taken: "تسجيل من المعلم",
        status: "جديدة",
        notes: behaviorNotes.trim() || null,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setBehaviorStudent(null);
      setBehaviorType("");
      setBehaviorNotes("");
      showToast("success", "تم تسجيل المخالفة السلوكية.");
    } catch (error) {
      showToast("error", getErrorMessage(error, "تعذر تسجيل المخالفة."));
    } finally {
      setModalSaving(false);
    }
  }

  async function saveHealthVisit() {
    if (!currentSchool?.id || !healthStudent) return;

    if (!healthReason.trim()) {
      showToast("error", "اكتب سبب زيارة العيادة.");
      return;
    }

    setModalSaving(true);

    try {
      const { error } = await supabase.from("health_visits").insert({
        school_id: currentSchool.id,
        student_id: healthStudent.id,
        visit_date: today,
        symptoms: healthReason.trim(),
        diagnosis: null,
        temperature: null,
        blood_pressure: null,
        treatment: null,
        notes: healthNotes.trim() || "تحويل من المعلم",
        visit_status: "جديدة",
      });

      if (error) throw error;

      setHealthStudent(null);
      setHealthReason("");
      setHealthNotes("");
      showToast("success", "تم تحويل الطالب للعيادة.");
    } catch (error) {
      showToast("error", getErrorMessage(error, "تعذر تسجيل زيارة العيادة."));
    } finally {
      setModalSaving(false);
    }
  }

  function updateStatus(studentId: string, status: AttendanceStatus) {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { student_id: studentId, notes: "" }),
        student_id: studentId,
        status,
      },
    }));
  }

  function updateNotes(studentId: string, notes: string) {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {
          student_id: studentId,
          status: "حاضر",
        }),
        student_id: studentId,
        notes,
      },
    }));
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={ALLOWED_ROLES}>
        <AppShell>
          <LoadingBox text="جاري تحميل مركز إدارة الحصة..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool || errorMsg || !teacher) {
    return (
      <RoleGuard allowedRoles={ALLOWED_ROLES}>
        <AppShell>
          <div className="rounded-[28px] border border-red-100 bg-red-50 p-8 text-center font-bold text-red-700">
            {errorMsg || "تعذر فتح متابعة الحصة."}
          </div>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <AppShell>
        <main className="space-y-5" dir="rtl">
          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="مركز إدارة الحصة"
            description="شاشة عملية للمعلم لإدارة حضور الحصة، تسجيل السلوك، تحويل الطالب للعيادة، وفتح ملف الطالب السريع."
            badge="بوابة المعلم"
            icon={<UserCheck size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "بوابة المعلم", href: "/teacher-portal" },
              { label: "إدارة الحصة" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool.school_name || "—" },
              { label: "المعلم", value: teacher.full_name },
              { label: "اليوم", value: `${todayName} - ${today}` },
              { label: "الحصة", value: selectedLesson ? `الحصة ${selectedLesson.period_number || "—"}` : "غير محددة" },
            ]}
            stats={[
              { label: "طلاب الحصة", value: stats.total, icon: <UsersRound size={20} />, tone: "blue" },
              { label: "نسبة الحضور", value: `${attendanceRate}%`, icon: <CheckCircle2 size={20} />, tone: attendanceRate >= 85 ? "green" : attendanceRate >= 60 ? "gold" : "red" },
              { label: "غياب", value: stats.absent, icon: <AlertCircle size={20} />, tone: stats.absent > 0 ? "red" : "green" },
              { label: "مستأذن", value: stats.excused, icon: <FileText size={20} />, tone: stats.excused > 0 ? "blue" : "slate" },
            ]}
            actions={
              <>
                <Link
                  href="/teacher-portal"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ArrowRight size={17} />
                  بوابة المعلم
                </Link>

                <button
                  type="button"
                  onClick={() => void fetchPage()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>

                <button
                  type="button"
                  onClick={() => void saveAttendance()}
                  disabled={saving || !selectedLesson || students.length === 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={17} />}
                  حفظ السجل
                </button>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <ExecutiveCard title="طلاب الحصة" value={stats.total} icon={<UsersRound size={22} />} tone="blue" subtitle="حسب الفصل والشعبة" progress={stats.total > 0 ? 100 : 0} />
            <ExecutiveCard title="حاضر" value={stats.present} icon={<CheckCircle2 size={22} />} tone="green" subtitle={`${attendanceRate}% من الطلاب`} progress={attendanceRate} />
            <ExecutiveCard title="غائب" value={stats.absent} icon={<AlertCircle size={22} />} tone={stats.absent > 0 ? "red" : "green"} subtitle="يحتاج متابعة" progress={stats.total ? percentage(stats.absent, stats.total) : 0} />
            <ExecutiveCard title="متأخر" value={stats.late} icon={<BarChart3 size={22} />} tone={stats.late > 0 ? "gold" : "green"} subtitle="رصد تأخر" progress={stats.total ? percentage(stats.late, stats.total) : 0} />
            <ExecutiveCard title="اكتمال الرصد" value={`${completionRate}%`} icon={<UserCheck size={22} />} tone={completionRate >= 100 ? "green" : "gold"} subtitle="جاهزية السجل" progress={completionRate} />
          </section>

          <SummaryCard
            title="ملخص الحصة"
            description="قراءة مباشرة لحالة الحضور داخل الحصة الحالية، مع أدوات سريعة لتسجيل السلوك والتحويل للعيادة."
            tone={stats.absent > 0 || stats.late > 0 ? "gold" : "green"}
            items={[
              { label: "الحصة", value: selectedLesson ? `الحصة ${selectedLesson.period_number || "—"}` : "—" },
              { label: "المادة", value: selectedLesson?.subject || teacher.subject || "—" },
              { label: "الفصل", value: `${selectedLesson?.class_name || "—"}${selectedLesson?.section ? ` / ${selectedLesson.section}` : ""}` },
              { label: "حاضر", value: stats.present },
              { label: "غائب", value: stats.absent },
              { label: "متأخر", value: stats.late },
            ]}
            footer="بعد حفظ السجل، يتم تسجيل حالة الطلاب في جدول student_attendance_records."
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
              <div>
                <p className="text-sm font-black text-slate-500">الحصة المختارة</p>

                <select
                  value={selectedScheduleId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedScheduleId(value);

                    const lesson = schedule.find((item) => item.id === value);
                    if (lesson) void loadStudents(lesson);
                  }}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-[#15445A] outline-none transition focus:border-[#0DA9A6] focus:bg-white"
                >
                  <option value="">اختر الحصة</option>

                  {schedule.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.day_name || "-"} - الحصة {item.period_number || "-"} - {item.subject || teacher.subject || "-"} - الفصل {item.class_name || "-"}
                      {item.section ? ` / ${item.section}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={markAllPresent}
                  disabled={students.length === 0}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#07A869]/10 px-4 text-sm font-black text-[#07A869] disabled:opacity-60"
                >
                  <CheckCircle2 size={17} />
                  الجميع حاضر
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-black text-[#15445A]"
                >
                  {viewMode === "table" ? <Grid2X2 size={17} /> : <LayoutList size={17} />}
                  {viewMode === "table" ? "عرض بطاقات" : "عرض جدول"}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث باسم الطالب أو الفصل أو الملاحظة...",
              }}
              filters={
                <ToolbarSelect
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as StatusFilter)}
                >
                  <option value="الكل">كل الحالات</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </ToolbarSelect>
              }
              onRefresh={() => void fetchPage()}
            />
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UsersRound className="text-[#15445A]" />
                <div>
                  <h2 className="text-xl font-black text-[#15445A]">كشف طلاب الحصة</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {filteredStudents.length} طالب حسب البحث والفلترة.
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-500">
                {students.length} طالب
              </span>
            </div>

            {studentsLoading ? (
              <LoadingBox text="جاري تحميل طلاب الحصة..." />
            ) : schedule.length === 0 ? (
              <EmptyBox text="لا توجد حصص مجدولة لهذا المعلم." />
            ) : filteredStudents.length === 0 ? (
              <EmptyBox text="لا يوجد طلاب مطابقون للبحث أو الفلتر الحالي." />
            ) : viewMode === "cards" ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredStudents.map((student, index) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    index={index}
                    row={attendance[student.id]}
                    openStudentPanel={openStudentPanel}
                    setBehaviorStudent={setBehaviorStudent}
                    setHealthStudent={setHealthStudent}
                    updateStatus={updateStatus}
                    updateNotes={updateNotes}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-right text-xs font-black text-slate-400">
                      <th className="px-3 py-2">الطالب</th>
                      <th className="px-3 py-2">الحالة</th>
                      <th className="px-3 py-2">ملاحظة</th>
                      <th className="px-3 py-2">إجراءات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudents.map((student, index) => {
                      const row = attendance[student.id];

                      return (
                        <tr key={student.id} className="rounded-2xl bg-slate-50">
                          <td className="rounded-r-2xl px-3 py-3">
                            <StudentNameCell
                              student={student}
                              index={index}
                              openStudentPanel={openStudentPanel}
                            />
                          </td>

                          <td className="px-3 py-3">
                            <StatusSelect
                              value={row?.status || "حاضر"}
                              onChange={(status) => updateStatus(student.id, status)}
                            />
                          </td>

                          <td className="px-3 py-3">
                            <input
                              value={row?.notes || ""}
                              onChange={(event) => updateNotes(student.id, event.target.value)}
                              placeholder="ملاحظة اختيارية"
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#0DA9A6]"
                            />
                          </td>

                          <td className="rounded-l-2xl px-3 py-3">
                            <StudentActions
                              student={student}
                              openStudentPanel={openStudentPanel}
                              setBehaviorStudent={setBehaviorStudent}
                              setHealthStudent={setHealthStudent}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {selectedStudent && (
            <SidePanel
              student={selectedStudent}
              stats={studentStats}
              onClose={() => setSelectedStudent(null)}
            />
          )}

          {behaviorStudent && (
            <Modal title="تسجيل مخالفة" onClose={() => setBehaviorStudent(null)}>
              <p className="mb-4 text-sm font-bold text-slate-500">
                الطالب: {behaviorStudent.full_name || "-"}
              </p>

              <input
                value={behaviorType}
                onChange={(event) => setBehaviorType(event.target.value)}
                placeholder="نوع المخالفة"
                className="mb-3 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-[#0DA9A6]"
              />

              <textarea
                value={behaviorNotes}
                onChange={(event) => setBehaviorNotes(event.target.value)}
                placeholder="وصف أو ملاحظات"
                rows={4}
                className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:border-[#0DA9A6]"
              />

              <button
                type="button"
                onClick={() => void saveBehavior()}
                disabled={modalSaving}
                className="h-12 w-full rounded-2xl bg-[#15445A] text-sm font-black text-white disabled:opacity-60"
              >
                {modalSaving ? "جاري الحفظ..." : "حفظ المخالفة"}
              </button>
            </Modal>
          )}

          {healthStudent && (
            <Modal title="تحويل للعيادة" onClose={() => setHealthStudent(null)}>
              <p className="mb-4 text-sm font-bold text-slate-500">
                الطالب: {healthStudent.full_name || "-"}
              </p>

              <input
                value={healthReason}
                onChange={(event) => setHealthReason(event.target.value)}
                placeholder="سبب زيارة العيادة"
                className="mb-3 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-[#0DA9A6]"
              />

              <textarea
                value={healthNotes}
                onChange={(event) => setHealthNotes(event.target.value)}
                placeholder="ملاحظات إضافية"
                rows={4}
                className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:border-[#0DA9A6]"
              />

              <button
                type="button"
                onClick={() => void saveHealthVisit()}
                disabled={modalSaving}
                className="h-12 w-full rounded-2xl bg-[#15445A] text-sm font-black text-white disabled:opacity-60"
              >
                {modalSaving ? "جاري الإرسال..." : "إرسال للعيادة"}
              </button>
            </Modal>
          )}
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function StudentNameCell({
  student,
  index,
  openStudentPanel,
}: {
  student: Student;
  index: number;
  openStudentPanel: (student: Student) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#15445A] text-sm font-black text-white">
        {index + 1}
      </div>

      <div>
        <button
          type="button"
          onClick={() => openStudentPanel(student)}
          className="font-black text-[#15445A] hover:underline"
        >
          {student.full_name || "طالب بدون اسم"}
        </button>

        <p className="mt-1 text-xs font-bold text-slate-500">
          {student.class_name || "-"} {student.section ? `/ ${student.section}` : ""}
        </p>
      </div>
    </div>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as AttendanceStatus)}
      className={`h-10 rounded-xl border px-3 text-xs font-black outline-none ${statusStyle(value)}`}
    >
      {STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}

function StudentActions({
  student,
  openStudentPanel,
  setBehaviorStudent,
  setHealthStudent,
}: {
  student: Student;
  openStudentPanel: (student: Student) => void;
  setBehaviorStudent: (student: Student) => void;
  setHealthStudent: (student: Student) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setBehaviorStudent(student)}
        className="inline-flex h-10 items-center gap-1 rounded-xl bg-red-50 px-3 text-xs font-black text-red-700 hover:bg-red-100"
      >
        <ShieldAlert size={15} />
        مخالفة
      </button>

      <button
        type="button"
        onClick={() => setHealthStudent(student)}
        className="inline-flex h-10 items-center gap-1 rounded-xl bg-[#07A869]/10 px-3 text-xs font-black text-[#07A869] hover:bg-[#07A869]/15"
      >
        <HeartPulse size={15} />
        عيادة
      </button>

      <button
        type="button"
        onClick={() => openStudentPanel(student)}
        className="inline-flex h-10 items-center gap-1 rounded-xl bg-[#3D7EB9]/10 px-3 text-xs font-black text-[#3D7EB9] hover:bg-[#3D7EB9]/15"
      >
        <FileText size={15} />
        ملف
      </button>
    </div>
  );
}

function StudentCard({
  student,
  index,
  row,
  openStudentPanel,
  setBehaviorStudent,
  setHealthStudent,
  updateStatus,
  updateNotes,
}: {
  student: Student;
  index: number;
  row?: AttendanceRow;
  openStudentPanel: (student: Student) => void;
  setBehaviorStudent: (student: Student) => void;
  setHealthStudent: (student: Student) => void;
  updateStatus: (studentId: string, status: AttendanceStatus) => void;
  updateNotes: (studentId: string, notes: string) => void;
}) {
  const status = row?.status || "حاضر";

  return (
    <article className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <StudentNameCell
          student={student}
          index={index}
          openStudentPanel={openStudentPanel}
        />

        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${statusStyle(status)}`}>
          <span className={`h-2 w-2 rounded-full ${statusDot(status)}`} />
          {status}
        </span>
      </div>

      <div className="grid gap-3">
        <StatusSelect value={status} onChange={(nextStatus) => updateStatus(student.id, nextStatus)} />

        <input
          value={row?.notes || ""}
          onChange={(event) => updateNotes(student.id, event.target.value)}
          placeholder="ملاحظة اختيارية"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#0DA9A6]"
        />

        <StudentActions
          student={student}
          openStudentPanel={openStudentPanel}
          setBehaviorStudent={setBehaviorStudent}
          setHealthStudent={setHealthStudent}
        />
      </div>
    </article>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black text-[#15445A]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SidePanel({
  student,
  stats,
  onClose,
}: {
  student: Student;
  stats: StudentQuickStats;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm">
      <aside className="absolute left-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-black text-[#15445A]">ملف الطالب السريع</h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rounded-[28px] bg-[#15445A] p-5 text-white">
          <p className="text-xs font-black text-[#C1B489]">الطالب</p>

          <h3 className="mt-2 text-2xl font-black">
            {student.full_name || "طالب بدون اسم"}
          </h3>

          <p className="mt-2 text-sm text-slate-300">
            الفصل {student.class_name || "-"} / {student.section || "-"}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <MiniStat label="سجلات الحضور" value={stats.attendance} />
          <MiniStat label="المخالفات" value={stats.behavior} />
          <MiniStat label="زيارات العيادة" value={stats.health} />
          <MiniStat label="الإحالات" value={stats.referrals} />
        </div>

        <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-500">
          هذه نافذة سريعة تساعد المعلم على معرفة مؤشرات الطالب أثناء الحصة.
          ويمكن ربطها بملف الطالب الموحد للحضور والسلوك والصحة والدرجات.
        </p>

        <Link
          href={`/students/${student.id}`}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#15445A] text-sm font-black text-white"
        >
          <FileText size={17} />
          فتح ملف الطالب الكامل
        </Link>
      </aside>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#15445A]">{value}</p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-[28px] bg-white p-6 text-center text-slate-500 shadow-sm">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#15445A]" />
        {text}
      </div>
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
      {toast.type === "success" ? (
        <CheckCircle2 size={18} />
      ) : (
        <AlertCircle size={18} />
      )}
      <span>{toast.message}</span>
    </div>
  );
}

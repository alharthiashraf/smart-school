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
import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  AlertTriangle,
  Award,
  Bell,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  HeartPulse,
  Loader2,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  User,
  Users,
} from "lucide-react";

type StudentProfile = {
  id: string;
  school_id?: string | null;
  full_name?: string | null;
  name?: string | null;
  student_name?: string | null;
  student_number?: string | null;
  grade_level?: string | null;
  grade_name?: string | null;
  classroom?: string | null;
  classroom_name?: string | null;
  class_name?: string | null;
  section?: string | null;
  status?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  parent_email?: string | null;
};

type ParentStudentLink = {
  id: string;
  school_id: string;
  parent_user_id: string | null;
  student_id: string;
  parent_national_id: string | null;
  relationship: string | null;
  link_method: string | null;
  status: string | null;
  is_primary_guardian: boolean | null;
  created_at?: string | null;
};

type AttendanceRow = {
  id: string;
  student_id?: string | null;
  attendance_date?: string | null;
  status?: string | null;
  attendance_status?: string | null;
  notes?: string | null;
};

type GradeRow = {
  id: string;
  student_id?: string | null;
  subject?: string | null;
  subject_name?: string | null;
  score?: number | null;
  max_score?: number | null;
  total_score?: number | null;
  percentage?: number | null;
  grade_label?: string | null;
  result_status?: string | null;
  semester?: string | null;
  academic_year?: string | null;
  created_at?: string | null;
};

type BehaviorRow = {
  id: string;
  student_id?: string | null;
  violation_type?: string | null;
  violation_level?: string | null;
  status?: string | null;
  behavior_date?: string | null;
  created_at?: string | null;
};

type ReferralRow = {
  id: string;
  student_id?: string | null;
  reason?: string | null;
  status?: string | null;
  referred_at?: string | null;
  created_at?: string | null;
};

type NotificationItem = {
  id: string;
  title?: string | null;
  message?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

type SchoolUserRow = {
  id: string;
  school_id?: string | null;
  full_name?: string | null;
  role?: string | null;
  is_active?: boolean | null;
};

type QueryResult<T> = { data: T | null; error: unknown };
type QueryLike<T> = PromiseLike<QueryResult<T>>;

const PAGE_ROLES: SchoolRole[] = ["super_admin", "school_admin", "parent"];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function todayLabel() {
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
      console.warn(`parent portal query skipped: ${label}`, result.error);
      return fallback;
    }

    return result.data ?? fallback;
  } catch (error) {
    console.warn(`parent portal query failed: ${label}`, error);
    return fallback;
  }
}

function studentName(student: StudentProfile | null) {
  return student?.full_name || student?.student_name || student?.name || "الطالب";
}

function classLabel(student: StudentProfile | null) {
  if (!student) return "—";

  const grade = student.grade_name || student.grade_level || "مرحلة غير محددة";
  const classroom =
    student.classroom_name ||
    student.classroom ||
    student.class_name ||
    "فصل غير محدد";
  const section = student.section ? ` - ${student.section}` : "";

  return `${grade} | ${classroom}${section}`;
}

function normalizeAttendanceStatus(value?: string | null) {
  const status = String(value || "").trim();

  if (status === "present" || status === "حاضر") return "حاضر";
  if (status === "absent" || status === "غائب") return "غائب";
  if (status === "late" || status === "متأخر") return "متأخر";
  if (status === "excused" || status === "مستأذن") return "مستأذن";

  return status || "غير مسجل";
}

function isPresent(status?: string | null) {
  return normalizeAttendanceStatus(status) === "حاضر";
}

function isAbsent(status?: string | null) {
  return normalizeAttendanceStatus(status) === "غائب";
}

function isLate(status?: string | null) {
  return normalizeAttendanceStatus(status) === "متأخر";
}

function isOpenReferral(status?: string | null) {
  const value = String(status || "").trim();

  return ![
    "مغلق",
    "مغلقة",
    "تم الإغلاق",
    "مكتملة",
    "مستقرة",
    "عاد للفصل",
    "تم التحسن",
    "closed",
  ].includes(value);
}

function gradeValue(item: GradeRow) {
  const percentage = Number(item.percentage);
  if (Number.isFinite(percentage) && percentage > 0) return percentage;

  const total = Number(item.total_score);
  if (Number.isFinite(total) && total > 0) return total;

  const score = Number(item.score);
  const max = Number(item.max_score);

  if (Number.isFinite(score) && Number.isFinite(max) && max > 0) {
    return Math.round((score / max) * 100);
  }

  return 0;
}

function attendanceStatusTone(status?: string | null) {
  const normalized = normalizeAttendanceStatus(status);

  if (normalized === "حاضر") return "bg-emerald-50 text-emerald-700";
  if (normalized === "غائب") return "bg-red-50 text-red-700";
  if (normalized === "متأخر") return "bg-amber-50 text-amber-700";

  return "bg-slate-100 text-slate-700";
}

function isAdminRole(role?: string | null) {
  return [
    "super_admin",
    "school_admin",
    "vice_principal",
    "administrative_staff",
  ].includes(String(role || "").trim());
}

export default function ParentPortalPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [parentLinks, setParentLinks] = useState<ParentStudentLink[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [behavior, setBehavior] = useState<BehaviorRow[]>([]);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [studentDataLoading, setStudentDataLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedStudent = useMemo(() => {
    return (
      students.find((student) => student.id === selectedStudentId) ||
      students[0] ||
      null
    );
  }, [students, selectedStudentId]);

  const selectedLink = useMemo(() => {
    if (!selectedStudent) return null;

    return parentLinks.find((link) => link.student_id === selectedStudent.id) || null;
  }, [parentLinks, selectedStudent]);

  const resetStudentData = useCallback(() => {
    setAttendance([]);
    setGrades([]);
    setBehavior([]);
    setReferrals([]);
  }, []);

  const loadStudentData = useCallback(
    async (studentId: string) => {
      if (!currentSchool?.id) return;

      setStudentDataLoading(true);

      const [attendanceRows, gradeRows, behaviorRows, referralRows] =
        await Promise.all([
          safeQuery<AttendanceRow[]>(
            supabase
              .from("student_attendance_records")
              .select("id, student_id, attendance_date, status, attendance_status, notes")
              .eq("school_id", currentSchool.id)
              .eq("student_id", studentId)
              .order("attendance_date", { ascending: false })
              .limit(30),
            [],
            "student_attendance_records",
          ),
          safeQuery<GradeRow[]>(
            supabase
              .from("grades")
              .select(
                "id, student_id, subject, subject_name, score, max_score, total_score, percentage, grade_label, result_status, semester, academic_year, created_at",
              )
              .eq("school_id", currentSchool.id)
              .eq("student_id", studentId)
              .order("created_at", { ascending: false })
              .limit(20),
            [],
            "grades",
          ),
          safeQuery<BehaviorRow[]>(
            supabase
              .from("student_behavior")
              .select("id, student_id, violation_type, violation_level, status, behavior_date, created_at")
              .eq("school_id", currentSchool.id)
              .eq("student_id", studentId)
              .order("created_at", { ascending: false })
              .limit(10),
            [],
            "student_behavior",
          ),
          safeQuery<ReferralRow[]>(
            supabase
              .from("student_referrals")
              .select("id, student_id, reason, status, referred_at, created_at")
              .eq("school_id", currentSchool.id)
              .eq("student_id", studentId)
              .order("created_at", { ascending: false })
              .limit(10),
            [],
            "student_referrals",
          ),
        ]);

      setAttendance(attendanceRows);
      setGrades(gradeRows);
      setBehavior(behaviorRows);
      setReferrals(referralRows);
      setStudentDataLoading(false);
    },
    [currentSchool?.id],
  );

  const loadPage = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user?.id) {
        setStudents([]);
        setParentLinks([]);
        setSelectedStudentId("");
        resetStudentData();
        setErrorMsg("لم يتم العثور على حساب مستخدم نشط.");
        return;
      }

      const schoolUser = await safeQuery<SchoolUserRow | null>(
        supabase
          .from("school_members")
          .select("id, school_id, full_name, role, is_active")
          .eq("auth_user_id", user.id)
          .eq("school_id", currentSchool.id)
          .maybeSingle(),
        null,
        "school_members",
      );

      const adminViewer = isAdminRole(schoolUser?.role);
      let loadedLinks: ParentStudentLink[] = [];

      if (schoolUser?.id) {
        loadedLinks = await safeQuery<ParentStudentLink[]>(
          supabase
            .from("parent_students")
            .select(
              "id, school_id, parent_user_id, student_id, parent_national_id, relationship, link_method, status, is_primary_guardian, created_at",
            )
            .eq("school_id", currentSchool.id)
            .eq("status", "verified")
            .eq("parent_user_id", schoolUser.id)
            .order("is_primary_guardian", { ascending: false }),
          [],
          "parent_students",
        );
      }

      if (loadedLinks.length === 0 && adminViewer) {
        loadedLinks = await safeQuery<ParentStudentLink[]>(
          supabase
            .from("parent_students")
            .select(
              "id, school_id, parent_user_id, student_id, parent_national_id, relationship, link_method, status, is_primary_guardian, created_at",
            )
            .eq("school_id", currentSchool.id)
            .eq("status", "verified")
            .order("created_at", { ascending: false })
            .limit(10),
          [],
          "parent_students-admin",
        );
      }

      setParentLinks(loadedLinks);

      const studentIds = Array.from(
        new Set(
          loadedLinks
            .map((link) => link.student_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      if (studentIds.length === 0) {
        setStudents([]);
        setSelectedStudentId("");
        resetStudentData();
      } else {
        const loadedStudents = await safeQuery<StudentProfile[]>(
          supabase
            .from("students")
            .select("*")
            .eq("school_id", currentSchool.id)
            .in("id", studentIds)
            .order("full_name", { ascending: true }),
          [],
          "students",
        );

        setStudents(loadedStudents);

        if (loadedStudents.length > 0) {
          setSelectedStudentId((current) => {
            const stillExists = loadedStudents.some((student) => student.id === current);
            return stillExists ? current : loadedStudents[0].id;
          });
        } else {
          setSelectedStudentId("");
          resetStudentData();
        }
      }

      const notificationsRows = await safeQuery<NotificationItem[]>(
        supabase
          .from("notifications")
          .select("id, title, message, is_read, created_at")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false })
          .limit(6),
        [],
        "notifications",
      );

      setNotifications(notificationsRows);
    } catch (error) {
      setErrorMsg(getErrorMessage(error, "تعذر تحميل بوابة ولي الأمر."));
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, resetStudentData]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setStudents([]);
      setParentLinks([]);
      setSelectedStudentId("");
      resetStudentData();
      setErrorMsg("لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      setLoading(false);
      return;
    }

    queueMicrotask(() => {
      void loadPage();
    });
  }, [currentSchool?.id, loadPage, resetStudentData, schoolLoading]);

  useEffect(() => {
    if (selectedStudent?.id) {
      void loadStudentData(selectedStudent.id);
    } else {
      resetStudentData();
    }
  }, [selectedStudent?.id, loadStudentData, resetStudentData]);

  const stats = useMemo(() => {
    const records = attendance.filter((item) =>
      ["حاضر", "present", "غائب", "absent", "متأخر", "late"].includes(
        String(item.attendance_status || item.status || ""),
      ),
    );

    const present = records.filter((item) =>
      isPresent(item.attendance_status || item.status),
    ).length;
    const absent = records.filter((item) =>
      isAbsent(item.attendance_status || item.status),
    ).length;
    const late = records.filter((item) =>
      isLate(item.attendance_status || item.status),
    ).length;

    const numericGrades = grades.map(gradeValue).filter((value) => value > 0);

    const averageGrade = numericGrades.length
      ? Math.round(
          numericGrades.reduce((sum, value) => sum + value, 0) /
            numericGrades.length,
        )
      : 0;

    const openReferrals = referrals.filter((item) =>
      isOpenReferral(item.status),
    ).length;

    const followUpScore =
      absent * 2 +
      late +
      behavior.length * 2 +
      openReferrals * 3 +
      (averageGrade > 0 && averageGrade < 70 ? 4 : 0);

    const followUpLabel =
      followUpScore >= 8
        ? "يحتاج متابعة عاجلة"
        : followUpScore >= 4
          ? "يحتاج متابعة"
          : "مستقر";

    return {
      attendanceRate: records.length
        ? Math.round((present / records.length) * 100)
        : 0,
      attendanceRecords: records.length,
      present,
      absent,
      late,
      averageGrade,
      behaviorCount: behavior.length,
      openReferrals,
      unreadNotifications: notifications.filter(
        (item) => item.is_read === false,
      ).length,
      followUpScore,
      followUpLabel,
    };
  }, [attendance, grades, behavior, referrals, notifications]);

  const todayAttendance = useMemo(() => {
    return attendance.find((item) => item.attendance_date === todayDate()) || null;
  }, [attendance]);

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <LoadingBox />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main dir="rtl" className="space-y-6">
          <section className="overflow-hidden rounded-[32px] bg-gradient-to-l from-[#0f1f3d] via-[#18315f] to-[#24477f] p-6 text-white shadow-xl">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#d4af37] text-[#0f1f3d] shadow-lg sm:flex">
                  <Users size={32} />
                </div>

                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-[#d4af37]">
                      بوابة ولي الأمر
                    </span>

                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                      اليوم {todayDate()}
                    </span>
                  </div>

                  <h1 className="text-3xl font-black md:text-4xl">
                    متابعة الأبناء
                  </h1>

                  <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
                    متابعة حضور الأبناء، الدرجات، السلوك، الإحالات، والتنبيهات
                    المهمة من المدرسة في مكان واحد.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#d4af37] px-4 py-2 text-xs font-black text-[#0f1f3d]">
                      {selectedStudent
                        ? studentName(selectedStudent)
                        : "لا يوجد طالب مرتبط"}
                    </span>

                    <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white">
                      {todayLabel()}
                    </span>

                    <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white">
                      عدد الأبناء: {students.length}
                    </span>

                    <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white">
                      {currentSchool?.school_name || "منصة المدرسة الذكية"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {students.length > 1 && (
                  <select
                    value={selectedStudent?.id || ""}
                    onChange={(event) => setSelectedStudentId(event.target.value)}
                    className="h-12 min-w-[220px] rounded-2xl border border-white/20 bg-white px-4 text-sm font-black text-[#0f1f3d] outline-none"
                  >
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {studentName(student)}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => void loadPage()}
                  className="flex h-12 items-center gap-2 rounded-2xl bg-[#d4af37] px-4 text-sm font-black text-[#0f1f3d]"
                >
                  تحديث
                  <RefreshCcw size={16} />
                </button>

                <Link
                  href="/notifications"
                  className="flex h-12 items-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black text-white hover:bg-white/20"
                >
                  التنبيهات
                  <Bell size={16} />
                </Link>

                <Link
                  href="/search"
                  className="flex h-12 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#0f1f3d]"
                >
                  البحث
                  <Search size={16} />
                </Link>
              </div>
            </div>
          </section>

          {errorMsg && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
              {errorMsg}
            </div>
          )}

          {!selectedStudent ? (
            <EmptyBox text="لم يتم العثور على طالب مرتبط بحساب ولي الأمر الحالي. يجب وجود ربط معتمد في جدول parent_students بحالة verified." />
          ) : (
            <>
              {studentDataLoading && (
                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-700">
                  جاري تحديث بيانات الطالب...
                </div>
              )}

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-7">
                <SummaryCard
                  title="نسبة الحضور"
                  value={
                    stats.attendanceRecords > 0
                      ? `${stats.attendanceRate}%`
                      : "—"
                  }
                  icon={<CalendarDays size={22} />}
                  color={
                    stats.attendanceRecords === 0
                      ? "slate"
                      : stats.attendanceRate >= 90
                        ? "green"
                        : stats.attendanceRate >= 75
                          ? "amber"
                          : "red"
                  }
                />

                <SummaryCard
                  title="غياب / تأخر"
                  value={`${stats.absent} / ${stats.late}`}
                  icon={<AlertTriangle size={22} />}
                  color={stats.absent > 2 ? "red" : "amber"}
                />

                <SummaryCard
                  title="تنبيهات"
                  value={stats.unreadNotifications}
                  icon={<Bell size={22} />}
                  color={stats.unreadNotifications > 0 ? "red" : "green"}
                />

                <SummaryCard
                  title="حالة اليوم"
                  value={normalizeAttendanceStatus(
                    todayAttendance?.attendance_status || todayAttendance?.status,
                  )}
                  icon={<CheckCircle2 size={22} />}
                  color={todayAttendance ? "green" : "slate"}
                />

                <SummaryCard
                  title="متوسط الدرجات"
                  value={stats.averageGrade ? `${stats.averageGrade}%` : "—"}
                  icon={<Award size={22} />}
                  color={
                    stats.averageGrade >= 90
                      ? "green"
                      : stats.averageGrade >= 70
                        ? "amber"
                        : stats.averageGrade > 0
                          ? "red"
                          : "slate"
                  }
                />

                <SummaryCard
                  title="السلوك"
                  value={stats.behaviorCount}
                  icon={<ShieldAlert size={22} />}
                  color={stats.behaviorCount > 0 ? "amber" : "green"}
                />

                <SummaryCard
                  title="إحالات مفتوحة"
                  value={stats.openReferrals}
                  icon={<HeartPulse size={22} />}
                  color={stats.openReferrals > 0 ? "red" : "green"}
                />
              </section>

              <section
                className={`rounded-3xl border p-5 shadow-sm ${
                  stats.followUpLabel === "يحتاج متابعة عاجلة"
                    ? "border-red-100 bg-red-50 text-red-700"
                    : stats.followUpLabel === "يحتاج متابعة"
                      ? "border-amber-100 bg-amber-50 text-amber-700"
                      : "border-emerald-100 bg-emerald-50 text-emerald-700"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-black">مؤشر متابعة ولي الأمر</p>
                    <h2 className="mt-2 text-3xl font-black">
                      {stats.followUpLabel}
                    </h2>
                    <p className="mt-2 text-sm font-bold leading-7">
                      المؤشر يعتمد على الغياب، التأخر، السلوك، الإحالات،
                      وانخفاض الدرجات.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/70 px-5 py-4 text-center">
                    <p className="text-xs font-black">درجة المتابعة</p>
                    <p className="mt-1 text-3xl font-black">
                      {stats.followUpScore}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[.85fr_1.15fr]">
                <Panel title="بطاقة الطالب" icon={<User size={24} />}>
                  <div className="space-y-3">
                    <InfoRow label="الاسم" value={studentName(selectedStudent)} />
                    <InfoRow
                      label="رقم الطالب"
                      value={selectedStudent.student_number || "—"}
                    />
                    <InfoRow
                      label="المرحلة والفصل"
                      value={classLabel(selectedStudent)}
                    />
                    <InfoRow
                      label="الحالة"
                      value={selectedStudent.status || "منتظم"}
                    />
                    <InfoRow
                      label="ولي الأمر"
                      value={selectedStudent.guardian_name || "—"}
                    />
                    <InfoRow
                      label="جوال ولي الأمر"
                      value={selectedStudent.guardian_phone || "—"}
                    />
                    <InfoRow
                      label="صلة القرابة"
                      value={selectedLink?.relationship || "—"}
                    />
                    <InfoRow
                      label="طريقة الربط"
                      value={selectedLink?.link_method || "—"}
                    />
                    <InfoRow
                      label="هوية ولي الأمر"
                      value={selectedLink?.parent_national_id || "—"}
                    />
                  </div>
                </Panel>

                <Panel title="مؤشرات المتابعة" icon={<Sparkles size={24} />}>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <MetricBox
                      title="مؤشر الحضور"
                      value={
                        stats.attendanceRecords > 0
                          ? `${stats.attendanceRate}%`
                          : "—"
                      }
                      description="يعتمد على آخر سجلات الحضور المسجلة."
                      icon={<CalendarDays size={24} />}
                    />

                    <MetricBox
                      title="المستوى الدراسي"
                      value={stats.averageGrade ? `${stats.averageGrade}%` : "—"}
                      description="متوسط الدرجات المسجلة للطالب."
                      icon={<Award size={24} />}
                    />

                    <MetricBox
                      title="السلوك"
                      value={stats.behaviorCount}
                      description="عدد السجلات السلوكية المسجلة."
                      icon={<ShieldAlert size={24} />}
                    />

                    <MetricBox
                      title="الإحالات المفتوحة"
                      value={stats.openReferrals}
                      description="الإحالات التي لا تزال قيد المتابعة."
                      icon={<HeartPulse size={24} />}
                    />
                  </div>
                </Panel>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <QuickLink
                  href="/parent-portal/attendance"
                  title="الحضور والغياب"
                  description="متابعة حضور الطالب والغياب والتأخر."
                  icon={<CalendarDays size={24} />}
                />

                <QuickLink
                  href="/parent-portal/grades"
                  title="الدرجات"
                  description="متابعة الدرجات والنتائج الدراسية."
                  icon={<Award size={24} />}
                />

                <QuickLink
                  href="/parent-portal/behavior"
                  title="السلوك"
                  description="متابعة السجلات السلوكية والإجراءات."
                  icon={<ShieldAlert size={24} />}
                />

                <QuickLink
                  href="/notifications"
                  title="التنبيهات"
                  description="آخر التنبيهات والرسائل المهمة."
                  icon={<Bell size={24} />}
                />

                <QuickLink
                  href={`/students/${selectedStudent.id}`}
                  title="ملف الطالب"
                  description="عرض الملف الشامل للطالب."
                  icon={<GraduationCap size={24} />}
                />

                <QuickLink
                  href="/student-referrals"
                  title="الإحالات"
                  description="متابعة الإحالات وحالة المعالجة."
                  icon={<HeartPulse size={24} />}
                />
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
                <Panel title="سجل الحضور الأخير" icon={<CalendarDays size={24} />}>
                  {attendance.length === 0 ? (
                    <EmptyBox text="لا توجد سجلات حضور." />
                  ) : (
                    <div className="space-y-2">
                      {attendance.slice(0, 8).map((item) => {
                        const status = normalizeAttendanceStatus(
                          item.attendance_status || item.status,
                        );

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                          >
                            <div>
                              <p className="font-black text-[#0f1f3d]">
                                {formatDate(item.attendance_date)}
                              </p>

                              <p className="text-xs text-slate-400">
                                {item.notes || "—"}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${attendanceStatusTone(
                                status,
                              )}`}
                            >
                              {status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Panel>

                <Panel title="التنبيهات الأخيرة" icon={<Bell size={24} />}>
                  {notifications.length === 0 ? (
                    <EmptyBox text="لا توجد تنبيهات حاليًا." />
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((item) => (
                        <Link
                          key={item.id}
                          href="/notifications"
                          className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <h3 className="line-clamp-1 font-black text-[#0f1f3d]">
                              {item.title || "تنبيه"}
                            </h3>

                            {item.is_read === false && (
                              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                            )}
                          </div>

                          <p className="line-clamp-2 text-sm leading-7 text-slate-500">
                            {item.message || "لا توجد تفاصيل."}
                          </p>

                          <p className="mt-2 text-xs font-bold text-slate-400">
                            {formatDate(item.created_at)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </Panel>
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
                <Panel title="آخر الدرجات" icon={<Award size={24} />}>
                  {grades.length === 0 ? (
                    <EmptyBox text="لا توجد درجات مسجلة حتى الآن." />
                  ) : (
                    <div className="space-y-3">
                      {grades.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-black text-[#0f1f3d]">
                                {item.subject_name || item.subject || "مادة"}
                              </h3>

                              <p className="mt-1 text-sm text-slate-500">
                                {item.semester || "الفصل الدراسي"} —{" "}
                                {item.academic_year || "العام الدراسي"}
                              </p>
                            </div>

                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                              {gradeValue(item) ? `${gradeValue(item)}%` : "—"}
                            </span>
                          </div>

                          <p className="mt-3 text-sm font-bold text-slate-500">
                            {item.grade_label || item.result_status || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="السلوك والإحالات" icon={<ShieldAlert size={24} />}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="mb-3 font-black text-[#0f1f3d]">
                        السجلات السلوكية
                      </h3>

                      {behavior.length === 0 ? (
                        <EmptyBox text="لا توجد سجلات سلوكية." />
                      ) : (
                        <div className="space-y-2">
                          {behavior.slice(0, 4).map((item) => (
                            <SmallRecord
                              key={item.id}
                              title={item.violation_type || "سجل سلوكي"}
                              subtitle={item.violation_level || item.status || "—"}
                              date={item.behavior_date || item.created_at}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="mb-3 font-black text-[#0f1f3d]">
                        الإحالات
                      </h3>

                      {referrals.length === 0 ? (
                        <EmptyBox text="لا توجد إحالات." />
                      ) : (
                        <div className="space-y-2">
                          {referrals.slice(0, 4).map((item) => (
                            <SmallRecord
                              key={item.id}
                              title={item.reason || "إحالة"}
                              subtitle={item.status || "—"}
                              date={item.referred_at || item.created_at}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Panel>
              </section>
            </>
          )}
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: "green" | "amber" | "red" | "slate";
}) {
  const colors = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${colors[color]}`}
      >
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-black text-[#0f1f3d]">{value}</h3>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f1f3d]/5 text-[#0f1f3d]">
          {icon}
        </div>

        <h2 className="text-2xl font-black text-[#0f1f3d]">{title}</h2>
      </div>

      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className="text-left font-black text-[#0f1f3d]">{value}</span>
    </div>
  );
}

function MetricBox({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0f1f3d]">
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-black text-[#0f1f3d]">{value}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#24477f]/30 hover:shadow-lg"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[#0f1f3d]">
        {icon}
      </div>

      <h3 className="text-xl font-black text-[#0f1f3d]">{title}</h3>

      <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-500">
        {description}
      </p>

      <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-black text-[#0f1f3d] transition group-hover:bg-[#0f1f3d] group-hover:text-white">
        فتح
      </div>
    </Link>
  );
}

function SmallRecord({
  title,
  subtitle,
  date,
}: {
  title: string;
  subtitle: string;
  date?: string | null;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="line-clamp-1 font-black text-[#0f1f3d]">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <p className="mt-1 text-xs font-bold text-slate-400">
        {formatDate(date)}
      </p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="rounded-3xl bg-white p-6 text-center text-slate-500 shadow-sm">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#0f1f3d]" />
        جاري تحميل بوابة ولي الأمر...
      </div>
    </div>
  );
}

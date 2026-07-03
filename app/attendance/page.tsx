"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Printer,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  Stethoscope,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import Section from "@/components/ui/page/Section";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import KpiCard from "@/components/ui/cards/KpiCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/lib/supabase";
import { ExportEngine } from "@/core";

type TeacherRow = {
  id: string;
  full_name?: string | null;
  teacher_name?: string | null;
  email?: string | null;
  subject?: string | null;
  is_active?: boolean | null;
  status?: string | null;
};

type SubjectRow = {
  id: string;
  subject_name?: string | null;
  subject_code?: string | null;
};

type ClassroomRow = {
  id: string;
  classroom_name?: string | null;
  grade_name?: string | null;
  class_name?: string | null;
  section?: string | null;
  track_name?: string | null;
};

type TeacherSubjectRow = {
  id: string;
  school_id: string;
  teacher_id: string | null;
  subject_id: string | null;
  classroom_id: string | null;
  academic_year?: string | null;
  semester?: string | null;
  is_active?: boolean | null;
  teachers?: TeacherRow | TeacherRow[] | null;
  subjects?: SubjectRow | SubjectRow[] | null;
  classrooms?: ClassroomRow | ClassroomRow[] | null;
};

type ScheduleRow = {
  id: string;
  school_id: string;
  teacher_subject_id?: string | null;
  teacher_id?: string | null;
  day_name: string;
  period_number: number;
  start_time?: string | null;
  end_time?: string | null;
  room_name?: string | null;
  room?: string | null;
  is_active?: boolean | null;
  class_name?: string | null;
  section?: string | null;
  subject?: string | null;
  teacher_subjects?: TeacherSubjectRow | TeacherSubjectRow[] | null;
};

type LessonView = ScheduleRow & {
  teacherSubject: TeacherSubjectRow | null;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  subjectName: string;
  classroomId: string | null;
  classroomName: string;
  gradeName: string;
  sectionName: string;
  timeRange: string;
  roomName: string;
};

type StudentRow = {
  id: string;
  school_id: string;
  full_name?: string | null;
  name?: string | null;
  student_name?: string | null;
  student_number?: string | null;
  national_id?: string | null;
  class_name?: string | null;
  classroom?: string | null;
  classroom_id?: string | null;
  grade_level?: string | null;
  grade_name?: string | null;
  section?: string | null;
  status?: string | null;
};

type AttendanceStatus = "present" | "absent" | "late" | "excused" | "clinic";

type AttendanceSession = {
  id: string;
};

type AttendanceRecord = {
  id?: string;
  session_id: string;
  school_id: string;
  student_id: string;
  attendance_status?: AttendanceStatus | null;
  status?: AttendanceStatus | string | null;
  notes?: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "مستأذن",
  clinic: "تحويل للعيادة",
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]",
  absent: "border-red-200 bg-red-50 text-red-700",
  late: "border-[#C1B489]/40 bg-[#C1B489]/20 text-[#15445A]",
  excused: "border-[#3D7EB9]/20 bg-[#3D7EB9]/10 text-[#3D7EB9]",
  clinic: "border-[#0DA9A6]/20 bg-[#0DA9A6]/10 text-[#0DA9A6]",
};

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getArabicDay(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  const day = date.getDay();

  const map: Record<number, string> = {
    0: "الأحد",
    1: "الإثنين",
    2: "الثلاثاء",
    3: "الأربعاء",
    4: "الخميس",
  };

  return map[day] || "غير متاح";
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
    }).format(new Date(`${value}T12:00:00`));
  } catch {
    return value;
  }
}

function getTeacherName(teacher?: TeacherRow | null) {
  return (
    teacher?.full_name ||
    teacher?.teacher_name ||
    teacher?.email ||
    "معلم غير محدد"
  );
}

function getSubjectName(subject?: SubjectRow | null) {
  return subject?.subject_name || "مادة غير محددة";
}

function getClassroomName(classroom?: ClassroomRow | null) {
  if (!classroom) return "فصل غير محدد";

  return (
    classroom.classroom_name ||
    classroom.class_name ||
    [classroom.grade_name, classroom.section].filter(Boolean).join(" ") ||
    "فصل غير محدد"
  );
}

function getStudentName(student: StudentRow) {
  return (
    student.full_name ||
    student.student_name ||
    student.name ||
    "طالب بدون اسم"
  );
}

function getStudentClass(student: StudentRow) {
  return (
    student.classroom ||
    student.class_name ||
    student.grade_level ||
    student.grade_name ||
    ""
  );
}

function normalizeLesson(row: ScheduleRow): LessonView {
  const teacherSubject = firstOrSelf(row.teacher_subjects);
  const teacher = firstOrSelf(teacherSubject?.teachers);
  const subject = firstOrSelf(teacherSubject?.subjects);
  const classroom = firstOrSelf(teacherSubject?.classrooms);

  const teacherId = teacherSubject?.teacher_id || row.teacher_id || "";
  const classroomName = getClassroomName(classroom);

  const start = row.start_time || "";
  const end = row.end_time || "";

  return {
    ...row,
    teacherSubject,
    teacherId,
    teacherName: getTeacherName(teacher),
    teacherEmail: teacher?.email || "بدون بريد",
    subjectName: row.subject || getSubjectName(subject),
    classroomId: teacherSubject?.classroom_id || classroom?.id || null,
    classroomName: row.class_name || classroomName,
    gradeName: classroom?.grade_name || row.class_name || "-",
    sectionName: row.section || classroom?.section || "-",
    timeRange: start || end ? `${start || "-"} - ${end || "-"}` : "غير محدد",
    roomName: row.room_name || row.room || "غير محدد",
  };
}

function normalizeRecordStatus(record: AttendanceRecord): AttendanceStatus {
  const value = String(record.attendance_status || record.status || "present");

  if (["absent", "غائب"].includes(value)) return "absent";
  if (["late", "متأخر"].includes(value)) return "late";
  if (["excused", "مستأذن"].includes(value)) return "excused";
  if (["clinic", "عيادة", "تحويل للعيادة"].includes(value)) return "clinic";

  return "present";
}

export default function AttendancePage() {
  const {
    currentSchool,
    currentRole,
    hasPermission,
    loading: schoolLoading,
  } = useSchool();

  const canManage =
    hasPermission("attendance.manage") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin" ||
    currentRole === "vice_principal" ||
    currentRole === "administrative_staff" ||
    currentRole === "teacher";

  const canView =
    hasPermission("attendance.view") ||
    canManage ||
    currentRole === "student_counselor" ||
    currentRole === "health_supervisor";

  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(todayISO());

  const [lessons, setLessons] = useState<LessonView[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonView | null>(null);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceStatus>(
    "all",
  );

  const [loading, setLoading] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [blockReason, setBlockReason] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const dayName = getArabicDay(attendanceDate);
  const isAllowedDay = DAYS.includes(dayName);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadTeachers = useCallback(async () => {
    if (!currentSchool?.id) {
      setTeachers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, teacher_name, email, subject, is_active, status")
        .eq("school_id", currentSchool.id)
        .order("full_name", { ascending: true });

      if (error) throw error;

      const activeTeachers = ((data as TeacherRow[]) || []).filter(
        (teacher) =>
          teacher.is_active !== false &&
          teacher.status !== "غير نشط",
      );

      setTeachers(activeTeachers);

      if (!teacherId && activeTeachers[0]?.id) {
        setTeacherId(activeTeachers[0].id);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر تحميل المعلمين.";
      showToast("error", message);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, teacherId, showToast]);

  const loadTeacherLessons = useCallback(async () => {
    if (!currentSchool?.id || !teacherId) return;

    setSelectedLesson(null);
    setStudents([]);
    setStatuses({});
    setSessionId(null);
    setBlockReason("");
    setLoadingLessons(true);

    try {
      if (!isAllowedDay) {
        setLessons([]);
        setBlockReason("لا توجد حصص متاحة في هذا اليوم.");
        return;
      }

      const { data, error } = await supabase
        .from("teacher_schedule")
        .select(
          `
          id,
          school_id,
          teacher_subject_id,
          teacher_id,
          day_name,
          period_number,
          start_time,
          end_time,
          room_name,
          room,
          is_active,
          class_name,
          section,
          subject,
          teacher_subjects (
            id,
            teacher_id,
            subject_id,
            classroom_id,
            academic_year,
            semester,
            is_active,
            teachers (
              id,
              full_name,
              teacher_name,
              email
            ),
            subjects (
              id,
              subject_name,
              subject_code
            ),
            classrooms (
              id,
              classroom_name,
              class_name,
              grade_name,
              track_name,
              section
            )
          )
        `,
        )
        .eq("school_id", currentSchool.id)
        .eq("day_name", dayName)
        .order("period_number", { ascending: true });

      if (error) throw error;

      const normalized = ((data as ScheduleRow[]) || [])
        .map(normalizeLesson)
        .filter((lesson) => lesson.teacherId === teacherId);

      setLessons(normalized);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر تحميل حصص المعلم.";
      showToast("error", message);
      setLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  }, [currentSchool?.id, teacherId, dayName, isAllowedDay, showToast]);

  useEffect(() => {
    if (!schoolLoading) {
      void loadTeachers();
    }
  }, [schoolLoading, loadTeachers]);

  useEffect(() => {
    if (!schoolLoading && teacherId) {
      void loadTeacherLessons();
    }
  }, [schoolLoading, teacherId, attendanceDate, loadTeacherLessons]);

  const loadStudentsForLesson = useCallback(
    async (lesson: LessonView) => {
      if (!currentSchool?.id) return;

      setBlockReason("");
      setLoadingStudents(true);
      setStudents([]);
      setStatuses({});
      setSessionId(null);

      try {
        const { data: waitingData, error: waitingError } = await supabase
          .from("teacher_waiting_periods")
          .select("id, approval_status")
          .eq("school_id", currentSchool.id)
          .eq("teacher_id", lesson.teacherId)
          .eq("waiting_date", attendanceDate)
          .eq("period_number", lesson.period_number)
          .limit(1);

        if (waitingError) throw waitingError;

        const waiting = waitingData?.[0] as
          | { approval_status?: string | null }
          | undefined;

        if (waiting && waiting.approval_status !== "موافق") {
          setBlockReason(
            waiting.approval_status === "مرفوض"
              ? "لا يمكن تحضير الطلاب لأن حصة الانتظار مرفوضة."
              : "لا يمكن تحضير الطلاب لأن حصة الانتظار بانتظار الموافقة.",
          );
          return;
        }

        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select(
            "id, school_id, full_name, name, student_name, student_number, national_id, classroom_id, class_name, classroom, grade_level, grade_name, section, status",
          )
          .eq("school_id", currentSchool.id);

        if (studentsError) throw studentsError;

        const allStudents = ((studentsData as StudentRow[]) || []).filter(
          (student) => {
            const studentClass = normalizeText(getStudentClass(student));
            const lessonClass = normalizeText(lesson.classroomName);
            const lessonGrade = normalizeText(lesson.gradeName);

            const classMatch =
              (lesson.classroomId && student.classroom_id === lesson.classroomId) ||
              studentClass === lessonClass ||
              studentClass === lessonGrade;

            const sectionMatch =
              !lesson.sectionName ||
              lesson.sectionName === "-" ||
              normalizeText(student.section) === normalizeText(lesson.sectionName);

            const active =
              !student.status ||
              student.status === "نشط" ||
              student.status === "active";

            return classMatch && sectionMatch && active;
          },
        );

        const initialStatuses: Record<string, AttendanceStatus> = {};
        allStudents.forEach((student) => {
          initialStatuses[student.id] = "present";
        });

        const { data: existingSession, error: sessionError } = await supabase
          .from("student_attendance_sessions")
          .select("id")
          .eq("school_id", currentSchool.id)
          .eq("teacher_id", lesson.teacherId)
          .eq("attendance_date", attendanceDate)
          .eq("period_number", lesson.period_number)
          .eq("class_name", lesson.classroomName)
          .eq("section", lesson.sectionName === "-" ? "" : lesson.sectionName)
          .maybeSingle();

        if (sessionError) throw sessionError;

        if ((existingSession as AttendanceSession | null)?.id) {
          const foundSessionId = (existingSession as AttendanceSession).id;
          setSessionId(foundSessionId);

          const { data: recordsData, error: recordsError } = await supabase
            .from("student_attendance_records")
            .select("*")
            .eq("session_id", foundSessionId);

          if (recordsError) throw recordsError;

          ((recordsData as AttendanceRecord[]) || []).forEach((record) => {
            initialStatuses[record.student_id] = normalizeRecordStatus(record);
          });
        }

        setStudents(allStudents);
        setStatuses(initialStatuses);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "تعذر تحميل الطلاب.";
        showToast("error", message);
      } finally {
        setLoadingStudents(false);
      }
    },
    [currentSchool?.id, attendanceDate, showToast],
  );

  useEffect(() => {
    if (selectedLesson) {
      void loadStudentsForLesson(selectedLesson);
    }
  }, [selectedLesson, loadStudentsForLesson]);

  const filteredStudents = useMemo(() => {
    const keyword = normalizeText(search);

    return students.filter((student) => {
      const status = statuses[student.id] || "present";
      const searchable = normalizeText(
        [
          getStudentName(student),
          student.student_number,
          student.national_id,
          getStudentClass(student),
          student.section,
        ].join(" "),
      );

      const matchesSearch = !keyword || searchable.includes(keyword);
      const matchesStatus = statusFilter === "all" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [students, statuses, search, statusFilter]);

  const summary = useMemo(() => {
    const values = Object.values(statuses);

    return {
      present: values.filter((status) => status === "present").length,
      absent: values.filter((status) => status === "absent").length,
      late: values.filter((status) => status === "late").length,
      excused: values.filter((status) => status === "excused").length,
      clinic: values.filter((status) => status === "clinic").length,
    };
  }, [statuses]);

  const attendanceRate =
    students.length > 0
      ? Math.round(
          ((summary.present + summary.late + summary.clinic) / students.length) *
            100,
        )
      : 0;

  const followUpCount = summary.absent + summary.excused;
  const selectedTeacher = teachers.find((teacher) => teacher.id === teacherId);

  function setStudentStatus(studentId: string, status: AttendanceStatus) {
    setStatuses((current) => ({
      ...current,
      [studentId]: status,
    }));
  }

  function markBulkStatus(status: AttendanceStatus) {
    const updated = { ...statuses };

    filteredStudents.forEach((student) => {
      updated[student.id] = status;
    });

    setStatuses(updated);
  }

  async function createClinicVisit(
    student: StudentRow,
    lesson: LessonView,
    sessionRecordId?: string | null,
  ) {
    if (!currentSchool?.id) return;

    await supabase.from("health_visits").insert({
      school_id: currentSchool.id,
      student_id: student.id,
      visit_date: attendanceDate,
      visit_time: new Date().toTimeString().slice(0, 5),
      reason: "تحويل من الحصة إلى العيادة",
      action_taken: `تم تحويل الطالب من حصة ${lesson.subjectName} - الحصة ${lesson.period_number}`,
      status: "مفتوح",
      source: "attendance",
      attendance_record_id: sessionRecordId || null,
    });
  }

  async function saveAttendance() {
    if (!currentSchool?.id || !selectedLesson || students.length === 0) return;

    setSaving(true);

    try {
      let currentSessionId = sessionId;

      if (!currentSessionId) {
        const { data: newSession, error: sessionError } = await supabase
          .from("student_attendance_sessions")
          .insert({
            school_id: currentSchool.id,
            teacher_id: selectedLesson.teacherId,
            class_name: selectedLesson.classroomName,
            section:
              selectedLesson.sectionName === "-" ? "" : selectedLesson.sectionName,
            attendance_date: attendanceDate,
            period_number: selectedLesson.period_number,
            status: "open",
          })
          .select("id")
          .single();

        if (sessionError) throw sessionError;

        currentSessionId = (newSession as AttendanceSession).id;
        setSessionId(currentSessionId);
      }

      const records = students.map((student) => ({
        session_id: currentSessionId,
        school_id: currentSchool.id,
        student_id: student.id,
        attendance_status: statuses[student.id] || "present",
        notes:
          statuses[student.id] === "clinic"
            ? "تحويل للعيادة من صفحة الحضور"
            : null,
      }));

      const { data: savedRecords, error: recordsError } = await supabase
        .from("student_attendance_records")
        .upsert(records, {
          onConflict: "session_id,student_id",
        })
        .select("id, student_id");

      if (recordsError) throw recordsError;

      const recordIdByStudent = new Map<string, string>();
      ((savedRecords as Array<{ id: string; student_id: string }>) || []).forEach(
        (record) => {
          recordIdByStudent.set(record.student_id, record.id);
        },
      );

      const clinicStudents = students.filter(
        (student) => statuses[student.id] === "clinic",
      );

      for (const student of clinicStudents) {
        await createClinicVisit(
          student,
          selectedLesson,
          recordIdByStudent.get(student.id),
        );
      }

      showToast(
        "success",
        clinicStudents.length > 0
          ? `تم حفظ الحضور وتحويل ${clinicStudents.length} طالب للعيادة.`
          : "تم حفظ الحضور بنجاح.",
      );

      await loadStudentsForLesson(selectedLesson);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر حفظ الحضور.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function resetCurrentAttendance() {
    if (!sessionId || resetting) return;

    const confirmed = window.confirm("هل تريد حذف تحضير هذه الحصة؟");
    if (!confirmed) return;

    setResetting(true);

    try {
      const { error } = await supabase
        .from("student_attendance_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;

      const initialStatuses: Record<string, AttendanceStatus> = {};
      students.forEach((student) => {
        initialStatuses[student.id] = "present";
      });

      setSessionId(null);
      setStatuses(initialStatuses);
      showToast("success", "تم حذف تحضير الحصة.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر حذف تحضير الحصة.";
      showToast("error", message);
    } finally {
      setResetting(false);
    }
  }

  function exportExcel() {
    if (!selectedLesson) return;

    ExportEngine.excel("كشف-الحضور", filteredStudents, [
      { header: "اسم الطالب", key: "full_name" },
      { header: "رقم الطالب", key: "student_number" },
      { header: "الصف", key: "grade_level" },
      { header: "الفصل", key: "classroom" },
      { header: "الشعبة", key: "section" },
    ]);
  }

  function exportPDF() {
    if (!selectedLesson) return;

    const rows = filteredStudents.map((student) => ({
      studentName: getStudentName(student),
      studentNumber: student.student_number || "-",
      classroom: getStudentClass(student) || "-",
      section: student.section || "-",
      status: STATUS_LABELS[statuses[student.id] || "present"],
    }));

    ExportEngine.pdf("كشف حضور الطلاب", rows, [
      { header: "اسم الطالب", key: "studentName" },
      { header: "رقم الطالب", key: "studentNumber" },
      { header: "الفصل", key: "classroom" },
      { header: "الشعبة", key: "section" },
      { header: "الحالة", key: "status" },
    ]);
  }

  function printPage() {
    window.print();
  }

  if (!canView) {
    return (
      <AuthGuard>
        <SummaryCard
          title="لا تملك صلاحية الوصول إلى الحضور"
          description="هذه الصفحة مخصصة للطاقم المدرسي حسب الصلاحيات."
          tone="gold"
          icon={<CalendarDays size={22} />}
        />
      </AuthGuard>
    );
  }

  if (schoolLoading || loading) {
    return (
      <AuthGuard>
        <LoadingBox text="جاري تحميل صفحة الحضور..." />
      </AuthGuard>
    );
  }

  if (!currentSchool) {
    return (
      <AuthGuard>
        <SummaryCard
          title="لا توجد مدرسة مرتبطة"
          description="لا توجد مدرسة مرتبطة بالمستخدم الحالي."
          tone="red"
          icon={<AlertTriangle size={22} />}
        />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6" dir="rtl">
        {toast && <ToastBox toast={toast} />}

        <PageHeader
          variant="hero"
          title="حضور الطلاب"
          description={`${currentSchool.school_name} — تسجيل الحضور حسب المعلم والحصة والجدول، مع دعم الغياب والتأخر والاستئذان وتحويل الطالب للعيادة مباشرة.`}
          badge="التحضير والحضور"
          icon={<CalendarDays size={18} />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "الحضور" },
          ]}
          meta={[
            { label: "المدرسة", value: currentSchool.school_name },
            { label: "التاريخ", value: formatDate(attendanceDate) },
            { label: "اليوم", value: dayName },
            { label: "المعلم", value: selectedTeacher ? getTeacherName(selectedTeacher) : "غير محدد" },
          ]}
          stats={[
            { label: "الطلاب", value: students.length, icon: <Users size={20} />, tone: "blue" },
            { label: "الحضور", value: `${attendanceRate}%`, icon: <CheckCircle2 size={20} />, tone: attendanceRate >= 85 ? "green" : attendanceRate >= 60 ? "gold" : "red" },
            { label: "المتابعة", value: followUpCount, icon: <AlertTriangle size={20} />, tone: followUpCount > 0 ? "red" : "green" },
            { label: "الحصة", value: selectedLesson ? `الحصة ${selectedLesson.period_number}` : "غير محددة", icon: <Clock size={20} />, tone: selectedLesson ? "teal" : "slate" },
          ]}
          actions={
            <>
              <button
                type="button"
                onClick={() => void loadTeacherLessons()}
                disabled={!teacherId || loadingLessons}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
              >
                <RefreshCcw size={17} className={loadingLessons ? "animate-spin" : ""} />
                تحديث
              </button>

              <button
                type="button"
                onClick={exportExcel}
                disabled={!selectedLesson || students.length === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0DA9A6] hover:shadow-md disabled:opacity-60"
              >
                <Download size={17} />
                Excel
              </button>

              <button
                type="button"
                onClick={exportPDF}
                disabled={!selectedLesson || students.length === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
              >
                <FileText size={17} />
                PDF
              </button>

              <button
                type="button"
                onClick={printPage}
                disabled={!selectedLesson || students.length === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
              >
                <Printer size={17} />
                طباعة
              </button>
            </>
          }
        />

        <PageToolbar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "ابحث عن طالب بالاسم أو الرقم أو الهوية...",
            disabled: !selectedLesson,
          }}
          filters={
            <>
              <ToolbarSelect value={teacherId} onChange={setTeacherId}>
                <option value="">اختر المعلم</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {getTeacherName(teacher)}
                    {teacher.subject ? ` - ${teacher.subject}` : ""}
                  </option>
                ))}
              </ToolbarSelect>

              <input
                type="date"
                value={attendanceDate}
                onChange={(event) => setAttendanceDate(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-[#15445A] outline-none transition focus:border-[#0DA9A6] focus:bg-white"
              />

              <ToolbarSelect
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as "all" | AttendanceStatus)}
              >
                <option value="all">كل الحالات</option>
                <option value="present">حاضر</option>
                <option value="absent">غائب</option>
                <option value="late">متأخر</option>
                <option value="excused">مستأذن</option>
                <option value="clinic">تحويل للعيادة</option>
              </ToolbarSelect>
            </>
          }
          onRefresh={() => void loadTeacherLessons()}
          onExportExcel={exportExcel}
          onExportPDF={exportPDF}
          onPrint={printPage}
          disabled={!selectedLesson}
        />

        {blockReason && (
          <SummaryCard
            title="تنبيه يمنع التحضير"
            description={blockReason}
            tone="red"
            icon={<AlertTriangle size={22} />}
          />
        )}

        {teacherId && (
          <Section
            title="حصص المعلم في هذا اليوم"
            description={`اليوم: ${dayName} · التاريخ: ${formatDate(attendanceDate)}`}
            icon={<CalendarDays size={20} />}
            badge={`${lessons.length} حصة`}
            loading={loadingLessons}
            loadingText="جاري تحميل الحصص..."
            empty={!loadingLessons && lessons.length === 0}
            emptyTitle="لا توجد حصص"
            emptyDescription="لا توجد حصص لهذا المعلم في هذا اليوم."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {lessons.map((lesson) => {
                const active = selectedLesson?.id === lesson.id;

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedLesson(lesson)}
                    className={[
                      "rounded-[24px] border p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md",
                      active
                        ? "border-[#0DA9A6] bg-[#0DA9A6]/10"
                        : "border-slate-100 bg-slate-50 hover:bg-white",
                    ].join(" ")}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="font-black text-[#15445A]">
                        الحصة {lesson.period_number}
                      </p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
                        {lesson.timeRange}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-slate-600">
                      الفصل: {lesson.classroomName}
                      {lesson.sectionName && lesson.sectionName !== "-"
                        ? ` - ${lesson.sectionName}`
                        : ""}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      المادة: {lesson.subjectName}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      القاعة: {lesson.roomName}
                    </p>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {selectedLesson && !blockReason && (
          <>
            <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <ExecutiveCard
                title="حاضر"
                value={summary.present}
                icon={<CheckCircle2 size={22} />}
                tone="green"
                progress={students.length ? Math.round((summary.present / students.length) * 100) : 0}
              />
              <ExecutiveCard
                title="غائب"
                value={summary.absent}
                icon={<XCircle size={22} />}
                tone={summary.absent > 0 ? "red" : "green"}
                progress={students.length ? Math.round((summary.absent / students.length) * 100) : 0}
              />
              <ExecutiveCard
                title="متأخر"
                value={summary.late}
                icon={<Clock size={22} />}
                tone="gold"
                progress={students.length ? Math.round((summary.late / students.length) * 100) : 0}
              />
              <ExecutiveCard
                title="مستأذن"
                value={summary.excused}
                icon={<AlertTriangle size={22} />}
                tone="blue"
                progress={students.length ? Math.round((summary.excused / students.length) * 100) : 0}
              />
              <ExecutiveCard
                title="تحويل للعيادة"
                value={summary.clinic}
                icon={<Stethoscope size={22} />}
                tone="teal"
                progress={students.length ? Math.round((summary.clinic / students.length) * 100) : 0}
              />
              <ExecutiveCard
                title="نسبة الحضور"
                value={`${attendanceRate}%`}
                icon={<Users size={22} />}
                tone={attendanceRate >= 85 ? "green" : attendanceRate >= 60 ? "gold" : "red"}
                progress={attendanceRate}
              />
            </section>

            <SummaryCard
              title="الملخص التنفيذي للحصة"
              description={`${selectedLesson.classroomName}${selectedLesson.sectionName !== "-" ? ` - ${selectedLesson.sectionName}` : ""} · الحصة ${selectedLesson.period_number} · ${selectedLesson.subjectName}`}
              tone={attendanceRate >= 85 ? "green" : attendanceRate >= 60 ? "gold" : "red"}
              items={[
                { label: "إجمالي الطلاب", value: students.length },
                { label: "حاضر", value: summary.present },
                { label: "غياب", value: summary.absent },
                { label: "تأخر", value: summary.late },
                { label: "تحويل للعيادة", value: summary.clinic },
                { label: "نسبة الحضور", value: `${attendanceRate}%` },
              ]}
              footer="يمكن حفظ الحضور بعد مراجعة الحالات، وأي طالب محدد بتحويل للعيادة سيتم إنشاء زيارة صحية له تلقائيًا."
            />

            <Section
              title="قائمة الطلاب"
              description={`${selectedLesson.classroomName}${selectedLesson.sectionName !== "-" ? ` - ${selectedLesson.sectionName}` : ""} — الحصة ${selectedLesson.period_number}`}
              icon={<UserRound size={20} />}
              badge={`${filteredStudents.length} طالب`}
              loading={loadingStudents}
              loadingText="جاري تحميل الطلاب..."
              empty={!loadingStudents && students.length === 0}
              emptyTitle="لا يوجد طلاب"
              emptyDescription="لا يوجد طلاب مطابقون لهذا الفصل والشعبة."
              actions={
                <div className="flex flex-wrap gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => void resetCurrentAttendance()}
                    disabled={!sessionId || resetting}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                  >
                    <RotateCcw size={17} />
                    {resetting ? "جاري..." : "إعادة تعيين"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void saveAttendance()}
                    disabled={saving || students.length === 0}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-bold text-white transition hover:bg-[#0DA9A6] disabled:opacity-60"
                  >
                    <Save size={18} />
                    {saving ? "جاري الحفظ..." : "حفظ الحضور"}
                  </button>
                </div>
              }
            >
              <div className="mb-5 flex flex-wrap gap-2 print:hidden">
                <BulkButton
                  label="الكل حاضر"
                  icon={<CheckCircle2 size={17} />}
                  tone="green"
                  disabled={filteredStudents.length === 0}
                  onClick={() => markBulkStatus("present")}
                />
                <BulkButton
                  label="الكل غائب"
                  icon={<XCircle size={17} />}
                  tone="red"
                  disabled={filteredStudents.length === 0}
                  onClick={() => markBulkStatus("absent")}
                />
                <BulkButton
                  label="الكل متأخر"
                  icon={<Clock size={17} />}
                  tone="gold"
                  disabled={filteredStudents.length === 0}
                  onClick={() => markBulkStatus("late")}
                />
                <BulkButton
                  label="الكل مستأذن"
                  icon={<ClipboardCheck size={17} />}
                  tone="blue"
                  disabled={filteredStudents.length === 0}
                  onClick={() => markBulkStatus("excused")}
                />
                <BulkButton
                  label="الكل تحويل للعيادة"
                  icon={<Stethoscope size={17} />}
                  tone="teal"
                  disabled={filteredStudents.length === 0}
                  onClick={() => markBulkStatus("clinic")}
                />
              </div>

              <div className="space-y-2">
                {filteredStudents.map((student) => {
                  const currentStatus = statuses[student.id] || "present";

                  return (
                    <div
                      key={student.id}
                      className={[
                        "flex flex-col gap-3 rounded-[22px] border p-4 transition hover:-translate-y-0.5 hover:shadow-sm lg:flex-row lg:items-center lg:justify-between",
                        currentStatus === "present"
                          ? "border-[#07A869]/15 bg-[#07A869]/5"
                          : currentStatus === "absent"
                            ? "border-red-100 bg-red-50/70"
                            : currentStatus === "late"
                              ? "border-[#C1B489]/30 bg-[#C1B489]/10"
                              : currentStatus === "clinic"
                                ? "border-[#0DA9A6]/20 bg-[#0DA9A6]/5"
                                : "border-[#3D7EB9]/20 bg-[#3D7EB9]/5",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#15445A] shadow-sm">
                          <UserRound size={22} />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-[#15445A]">
                              {getStudentName(student)}
                            </p>
                            <span className={`rounded-full border px-3 py-1 text-xs font-black ${STATUS_COLORS[currentStatus]}`}>
                              {STATUS_LABELS[currentStatus]}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            رقم الطالب: {student.student_number || student.national_id || "-"} ·{" "}
                            {getStudentClass(student) || "-"}
                            {student.section ? ` - ${student.section}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map(
                          (status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() =>
                                setStudentStatus(student.id, status)
                              }
                              className={[
                                "rounded-xl border px-3 py-2 text-xs font-bold transition",
                                currentStatus === status
                                  ? STATUS_COLORS[status]
                                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100",
                              ].join(" ")}
                            >
                              {STATUS_LABELS[status]}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            <PrintSection
              selectedLesson={selectedLesson}
              attendanceDate={attendanceDate}
              dayName={dayName}
              students={filteredStudents}
              statuses={statuses}
            />
          </>
        )}
      </div>
    </AuthGuard>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  const isSuccess = toast.type === "success";

  return (
    <div
      className={`fixed left-5 top-5 z-50 flex max-w-md items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl print:hidden ${
        isSuccess ? "bg-[#07A869]" : "bg-red-600"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
        {isSuccess ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
      </span>
      <span>{toast.message}</span>
    </div>
  );
}

function BulkButton({
  label,
  disabled,
  onClick,
  icon,
  tone = "slate",
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon?: ReactNode;
  tone?: "green" | "red" | "gold" | "blue" | "teal" | "slate";
}) {
  const tones = {
    green: "bg-[#07A869]/10 text-[#07A869] hover:bg-[#07A869]/15",
    red: "bg-red-50 text-red-700 hover:bg-red-100",
    gold: "bg-[#C1B489]/20 text-[#15445A] hover:bg-[#C1B489]/30",
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9] hover:bg-[#3D7EB9]/15",
    teal: "bg-[#0DA9A6]/10 text-[#0DA9A6] hover:bg-[#0DA9A6]/15",
    slate: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition disabled:opacity-60 ${tones[tone]}`}
    >
      {icon}
      {label}
    </button>
  );
}

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
        <RefreshCcw className="h-6 w-6 animate-spin" />
      </div>
      <p className="font-bold">{text}</p>
      <div className="mx-auto mt-5 grid max-w-md gap-2">
        <div className="h-3 rounded-full bg-slate-100" />
        <div className="h-3 rounded-full bg-slate-100" />
        <div className="h-3 w-2/3 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

function PrintSection({
  selectedLesson,
  attendanceDate,
  dayName,
  students,
  statuses,
}: {
  selectedLesson: LessonView;
  attendanceDate: string;
  dayName: string;
  students: StudentRow[];
  statuses: Record<string, AttendanceStatus>;
}) {
  return (
    <section className="hidden rounded-3xl border border-slate-200 bg-white p-6 print:block">
      <h1 className="text-3xl font-black text-[#15445A]">
        كشف حضور الطلاب
      </h1>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <p>التاريخ: {attendanceDate}</p>
        <p>اليوم: {dayName}</p>
        <p>المعلم: {selectedLesson.teacherName}</p>
        <p>الحصة: {selectedLesson.period_number}</p>
        <p>الفصل: {selectedLesson.classroomName}</p>
        <p>المادة: {selectedLesson.subjectName}</p>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 p-4 text-sm">
        <p className="font-bold text-[#15445A]">بيانات الحصة</p>
        <p className="mt-2">المادة: {selectedLesson.subjectName} · القاعة: {selectedLesson.roomName}</p>
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border p-2 text-right">الطالب</th>
            <th className="border p-2 text-right">الفصل</th>
            <th className="border p-2 text-right">الحالة</th>
          </tr>
        </thead>

        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <td className="border p-2">{getStudentName(student)}</td>
              <td className="border p-2">
                {getStudentClass(student) || "-"}
                {student.section ? ` - ${student.section}` : ""}
              </td>
              <td className="border p-2">
                {STATUS_LABELS[statuses[student.id] || "present"]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
        <div className="border-t border-slate-400 pt-3">
          توقيع المعلم
        </div>
        <div className="border-t border-slate-400 pt-3">
          اعتماد الإدارة
        </div>
      </div>
    </section>
  );
}

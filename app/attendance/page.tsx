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
  BrainCircuit,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Printer,
  RefreshCcw,
  RotateCcw,
  Save,
  Sparkles,
  Stethoscope,
  Target,
  TrendingDown,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import Section from "@/components/ui/page/PageSection";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import PageLoader from "@/components/ui/loading/PageLoader";
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

type AttendanceInsightTone = "green" | "gold" | "red" | "primary" | "neutral";

type AttendanceInsight = {
  title: string;
  description: string;
  tone: AttendanceInsightTone;
  icon: ReactNode;
};

type AttendanceHealth = {
  attendanceRate: number;
  absenceRate: number;
  lateRate: number;
  followUpRate: number;
  dataCompletion: number;
};

type StudentAttendanceRisk = {
  student: StudentRow;
  status: AttendanceStatus;
  score: number;
  label: "مستقر" | "متابعة" | "خطر";
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
  present:
    "border-[color-mix(in_srgb,var(--app-success)_22%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]",
  absent:
    "border-[color-mix(in_srgb,var(--app-danger)_22%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)]",
  late:
    "border-[color-mix(in_srgb,var(--app-accent)_34%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]",
  excused:
    "border-[color-mix(in_srgb,var(--app-primary)_20%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_8%,transparent)] text-[var(--app-primary)]",
  clinic:
    "border-[color-mix(in_srgb,var(--app-primary)_24%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]",
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

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function insightTone(tone: AttendanceInsightTone) {
  const tones: Record<AttendanceInsightTone, string> = {
    green:
      "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]",
    gold:
      "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]",
    red:
      "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]",
    primary:
      "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]",
    neutral:
      "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
  };

  return tones[tone];
}

function progressTone(tone: AttendanceInsightTone) {
  const tones: Record<AttendanceInsightTone, string> = {
    green: "bg-[var(--app-success)]",
    gold: "bg-[var(--app-accent)]",
    red: "bg-[var(--app-danger)]",
    primary: "bg-[var(--app-primary)]",
    neutral: "bg-[var(--app-text-muted)]",
  };

  return tones[tone];
}

function buildAttendanceRecommendations(
  student: StudentRow,
  status: AttendanceStatus,
) {
  const recommendations: string[] = [];

  if (status === "absent") {
    recommendations.push("التواصل مع ولي الأمر وتوثيق سبب الغياب.");
  }

  if (status === "late") {
    recommendations.push("متابعة نمط التأخر في الأيام القادمة.");
  }

  if (status === "excused") {
    recommendations.push("التحقق من توثيق الاستئذان واعتماده.");
  }

  if (status === "clinic") {
    recommendations.push("متابعة الزيارة الصحية ونتيجة التحويل للعيادة.");
  }

  if (status === "present") {
    recommendations.push("الحالة مستقرة ولا توجد متابعة عاجلة.");
  }

  return recommendations;
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
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);

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

  const health = useMemo<AttendanceHealth>(() => {
    const total = Math.max(1, students.length);
    const assignedStatuses = Object.keys(statuses).length;

    return {
      attendanceRate,
      absenceRate: percentage(summary.absent, total),
      lateRate: percentage(summary.late, total),
      followUpRate: percentage(followUpCount + summary.clinic, total),
      dataCompletion: percentage(assignedStatuses, students.length),
    };
  }, [attendanceRate, followUpCount, statuses, students.length, summary]);

  const risks = useMemo<StudentAttendanceRisk[]>(() => {
    return students
      .map((student) => {
        const status = statuses[student.id] || "present";
        const score =
          status === "absent"
            ? 100
            : status === "clinic"
              ? 75
              : status === "excused"
                ? 60
                : status === "late"
                  ? 45
                  : 0;

        return {
          student,
          status,
          score,
          label: score >= 75 ? "خطر" : score >= 45 ? "متابعة" : "مستقر",
        } satisfies StudentAttendanceRisk;
      })
      .sort((a, b) => b.score - a.score);
  }, [students, statuses]);

  const smartInsights = useMemo<AttendanceInsight[]>(() => {
    const items: AttendanceInsight[] = [];

    if (summary.absent > 0) {
      items.push({
        title: "طلاب غائبون",
        description: `يوجد ${summary.absent} طالب غائب ويحتاجون إلى متابعة.`,
        tone: "red",
        icon: <TrendingDown className="h-5 w-5" />,
      });
    }

    if (summary.late > 0) {
      items.push({
        title: "حالات تأخر",
        description: `تم تسجيل ${summary.late} حالة تأخر في الحصة الحالية.`,
        tone: "gold",
        icon: <Clock className="h-5 w-5" />,
      });
    }

    if (summary.clinic > 0) {
      items.push({
        title: "تحويلات صحية",
        description: `${summary.clinic} طالب تم تحويلهم للعيادة.`,
        tone: "primary",
        icon: <Stethoscope className="h-5 w-5" />,
      });
    }

    if (attendanceRate < 85 && students.length > 0) {
      items.push({
        title: "نسبة حضور تحتاج متابعة",
        description: `نسبة الحضور الحالية ${attendanceRate}% وهي أقل من المستوى المستهدف.`,
        tone: "primary",
        icon: <Target className="h-5 w-5" />,
      });
    }

    if (items.length === 0) {
      items.push({
        title: "الحضور مستقر",
        description: "لا توجد مؤشرات حرجة في الحصة الحالية.",
        tone: "green",
        icon: <Sparkles className="h-5 w-5" />,
      });
    }

    return items.slice(0, 4);
  }, [attendanceRate, students.length, summary]);

  function runSmartSearch(command: string) {
    const value = normalizeText(command);

    setSearch("");
    setStatusFilter("all");

    if (value.includes("غائب")) {
      setStatusFilter("absent");
      return;
    }

    if (value.includes("متأخر")) {
      setStatusFilter("late");
      return;
    }

    if (value.includes("عياده")) {
      setStatusFilter("clinic");
      return;
    }

    if (value.includes("مستأذن")) {
      setStatusFilter("excused");
      return;
    }

    setSearch(command.replace("طلاب", "").trim());
  }


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
        <PageLoader text="جاري تحميل صفحة الحضور..." />
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
            { label: "الطلاب", value: students.length, icon: <Users size={20} />, tone: "primary" },
            { label: "الحضور", value: `${attendanceRate}%`, icon: <CheckCircle2 size={20} />, tone: attendanceRate >= 85 ? "green" : attendanceRate >= 60 ? "gold" : "red" },
            { label: "المتابعة", value: followUpCount, icon: <AlertTriangle size={20} />, tone: followUpCount > 0 ? "red" : "green" },
            { label: "الحصة", value: selectedLesson ? `الحصة ${selectedLesson.period_number}` : "غير محددة", icon: <Clock size={20} />, tone: selectedLesson ? "primary" : "slate" },
          ]}
          actions={
            <>
              <SecondaryButton
                type="button"
                onClick={() => void loadTeacherLessons()}
                disabled={!teacherId || loadingLessons}
                icon={<RefreshCcw size={17} className={loadingLessons ? "animate-spin" : ""} />}
              >
                تحديث
              </SecondaryButton>

              <PrimaryButton
                type="button"
                onClick={exportExcel}
                disabled={!selectedLesson || students.length === 0}
                icon={<Download size={17} />}
              >
                Excel
              </PrimaryButton>

              <PrimaryButton
                type="button"
                onClick={exportPDF}
                disabled={!selectedLesson || students.length === 0}
                icon={<FileText size={17} />}
              >
                PDF
              </PrimaryButton>

              <SecondaryButton
                type="button"
                onClick={printPage}
                disabled={!selectedLesson || students.length === 0}
                icon={<Printer size={17} />}
              >
                طباعة
              </SecondaryButton>
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
                className="h-11 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
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
                      "rounded-[var(--app-radius-xl)] border p-4 text-right transition hover:-translate-y-0.5 hover:shadow-[var(--app-shadow-md)]",
                      active
                        ? "border-[var(--app-primary)] bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)]"
                        : "border-[var(--app-border)] bg-[var(--app-card-soft)] hover:bg-[var(--app-card)]",
                    ].join(" ")}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="font-black text-[var(--app-text)]">
                        الحصة {lesson.period_number}
                      </p>
                      <span className="rounded-full bg-[var(--app-card)] px-3 py-1 text-xs font-black text-[var(--app-text-muted)] shadow-[var(--app-shadow-sm)]">
                        {lesson.timeRange}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-[var(--app-text-muted)]">
                      الفصل: {lesson.classroomName}
                      {lesson.sectionName && lesson.sectionName !== "-"
                        ? ` - ${lesson.sectionName}`
                        : ""}
                    </p>

                    <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                      المادة: {lesson.subjectName}
                    </p>

                    <p className="mt-1 text-xs text-[var(--app-text-subtle)]">
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
                tone="primary"
                progress={students.length ? Math.round((summary.excused / students.length) * 100) : 0}
              />
              <ExecutiveCard
                title="تحويل للعيادة"
                value={summary.clinic}
                icon={<Stethoscope size={22} />}
                tone="primary"
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


            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <AttendanceExecutiveAnalytics
                health={health}
                summary={summary}
                studentsCount={students.length}
                selectedLesson={selectedLesson}
              />

              <AttendanceSmartInsights insights={smartInsights} />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <AttendanceHealthPanel health={health} />

              <AttendanceRiskPanel
                risks={risks}
                total={students.length}
              />

              <AttendanceDistributionPanel summary={summary} />
            </section>

            <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] print:hidden">
              <div className="mb-4">
                <h2 className="text-xl font-black text-[var(--app-text)]">
                  البحث الذكي في الحضور
                </h2>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  جرّب: الطلاب الغائبون، الطلاب المتأخرون، المحولون للعيادة، الطلاب المستأذنون.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {["الطلاب الغائبون", "الطلاب المتأخرون", "المحولون للعيادة", "الطلاب المستأذنون"].map((command) => (
                  <button
                    key={command}
                    type="button"
                    onClick={() => runSmartSearch(command)}
                    className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-2 text-sm font-black text-[var(--app-text)] transition hover:-translate-y-0.5 hover:border-[var(--app-primary)] hover:text-[var(--app-primary)]"
                  >
                    {command}
                  </button>
                ))}
              </div>
            </section>

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
                  <SecondaryButton
                    type="button"
                    onClick={() => void resetCurrentAttendance()}
                    disabled={!sessionId || resetting}
                    icon={<RotateCcw size={17} />}
                  >
                    {resetting ? "جاري..." : "إعادة تعيين"}
                  </SecondaryButton>

                  <PrimaryButton
                    type="button"
                    onClick={() => void saveAttendance()}
                    disabled={saving || students.length === 0}
                    icon={<Save size={18} />}
                  >
                    {saving ? "جاري الحفظ..." : "حفظ الحضور"}
                  </PrimaryButton>
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
                  tone="primary"
                  disabled={filteredStudents.length === 0}
                  onClick={() => markBulkStatus("excused")}
                />
                <BulkButton
                  label="الكل تحويل للعيادة"
                  icon={<Stethoscope size={17} />}
                  tone="primary"
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
                      onClick={() => setSelectedStudent(student)}
                      className={[
                        "flex cursor-pointer flex-col gap-3 rounded-[var(--app-radius-lg)] border p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--app-shadow-sm)] lg:flex-row lg:items-center lg:justify-between",
                        currentStatus === "present"
                          ? "border-[var(--app-success)]/15 bg-[var(--app-success)]/5"
                          : currentStatus === "absent"
                            ? "border-[color-mix(in_srgb,var(--app-danger)_18%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)]/70"
                            : currentStatus === "late"
                              ? "border-[var(--app-accent)]/30 bg-[var(--app-accent)]/10"
                              : currentStatus === "clinic"
                                ? "border-[color-mix(in_srgb,var(--app-primary)_20%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_5%,transparent)]"
                                : "border-[color-mix(in_srgb,var(--app-primary)_20%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_5%,transparent)]",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-card)] text-[var(--app-text)] shadow-[var(--app-shadow-sm)]">
                          <UserRound size={22} />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-[var(--app-text)]">
                              {getStudentName(student)}
                            </p>
                            <span className={`rounded-full border px-3 py-1 text-xs font-black ${STATUS_COLORS[currentStatus]}`}>
                              {STATUS_LABELS[currentStatus]}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-[var(--app-text-muted)]">
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
                              onClick={(event) => {
                                event.stopPropagation();
                                setStudentStatus(student.id, status);
                              }}
                              className={[
                                "rounded-xl border px-3 py-2 text-xs font-bold transition",
                                currentStatus === status
                                  ? STATUS_COLORS[status]
                                  : "border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)] hover:bg-[var(--app-card-soft)]",
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


            {selectedStudent && (
              <AttendanceStudentDrawer
                student={selectedStudent}
                status={statuses[selectedStudent.id] || "present"}
                onClose={() => setSelectedStudent(null)}
              />
            )}

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
      className={`fixed left-5 top-5 z-50 flex max-w-md items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-[var(--app-shadow-xl)] print:hidden ${
        isSuccess ? "bg-[var(--app-success)]" : "bg-[var(--app-danger)]"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--app-card)]/15">
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
  tone = "neutral",
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon?: ReactNode;
  tone?: "green" | "red" | "gold" | "primary" | "neutral";
}) {
  const tones = {
    green:
      "bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)] hover:bg-[color-mix(in_srgb,var(--app-success)_16%,transparent)]",
    red:
      "bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)] hover:bg-[color-mix(in_srgb,var(--app-danger)_16%,transparent)]",
    gold:
      "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)] hover:bg-[color-mix(in_srgb,var(--app-accent)_24%,transparent)]",
    primary:
      "bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)] text-[var(--app-primary)] hover:bg-[color-mix(in_srgb,var(--app-primary)_16%,transparent)]",
    neutral:
      "bg-[var(--app-card-soft)] text-[var(--app-text-muted)] hover:bg-[var(--app-border)]",
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
    <section className="hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-6 print:block">
      <h1 className="text-3xl font-black text-[var(--app-text)]">
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

      <div className="mt-5 rounded-2xl border border-[var(--app-border)] p-4 text-sm">
        <p className="font-bold text-[var(--app-text)]">بيانات الحصة</p>
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


function AttendanceExecutiveAnalytics({
  health,
  summary,
  studentsCount,
  selectedLesson,
}: {
  health: AttendanceHealth;
  summary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    clinic: number;
  };
  studentsCount: number;
  selectedLesson: LessonView;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <div className="mb-4">
        <h2 className="text-xl font-black text-[var(--app-text)]">
          التحليلات التنفيذية
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          قراءة تنفيذية لحالة الحضور والمتابعة داخل الحصة.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AttendanceMetric label="نسبة الحضور" value={`${health.attendanceRate}%`} icon={<CheckCircle2 size={18} />} tone="green" />
        <AttendanceMetric label="نسبة الغياب" value={`${health.absenceRate}%`} icon={<XCircle size={18} />} tone="red" />
        <AttendanceMetric label="نسبة التأخر" value={`${health.lateRate}%`} icon={<Clock size={18} />} tone="gold" />
        <AttendanceMetric label="اكتمال البيانات" value={`${health.dataCompletion}%`} icon={<ClipboardCheck size={18} />} tone="primary" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <AttendanceInfoLine
          label="الحصة الحالية"
          value={`${selectedLesson.subjectName} · الحصة ${selectedLesson.period_number}`}
        />
        <AttendanceInfoLine label="إجمالي الطلاب" value={studentsCount} />
        <AttendanceInfoLine label="حاضرون" value={summary.present} />
        <AttendanceInfoLine label="بحاجة متابعة" value={summary.absent + summary.excused + summary.clinic} />
      </div>
    </section>
  );
}

function AttendanceSmartInsights({
  insights,
}: {
  insights: AttendanceInsight[];
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
          <BrainCircuit size={20} />
          الرؤى الذكية
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          توصيات فورية مبنية على حالات الحضور الحالية.
        </p>
      </div>

      <div className="space-y-3">
        {insights.map((item) => (
          <div
            key={item.title}
            className="flex gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${insightTone(item.tone)}`}>
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-black text-[var(--app-text)]">{item.title}</p>
              <p className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AttendanceHealthPanel({
  health,
}: {
  health: AttendanceHealth;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="text-xl font-black text-[var(--app-text)]">صحة الحضور</h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مؤشرات جودة الحضور والمتابعة واكتمال الرصد.
      </p>

      <div className="mt-5 space-y-4">
        <AttendanceProgress label="الحضور" value={health.attendanceRate} total={100} tone="green" suffix="%" />
        <AttendanceProgress label="الغياب" value={health.absenceRate} total={100} tone="red" suffix="%" />
        <AttendanceProgress label="التأخر" value={health.lateRate} total={100} tone="gold" suffix="%" />
        <AttendanceProgress label="المتابعة" value={health.followUpRate} total={100} tone="primary" suffix="%" />
      </div>
    </section>
  );
}

function AttendanceRiskPanel({
  risks,
  total,
}: {
  risks: StudentAttendanceRisk[];
  total: number;
}) {
  const danger = risks.filter((item) => item.label === "خطر").length;
  const watch = risks.filter((item) => item.label === "متابعة").length;
  const stable = risks.filter((item) => item.label === "مستقر").length;

  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="text-xl font-black text-[var(--app-text)]">مؤشر المخاطر</h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        تصنيف حالات الطلاب حسب أولوية المتابعة.
      </p>

      <div className="mt-5 space-y-4">
        <AttendanceProgress label="خطر" value={danger} total={Math.max(1, total)} tone="red" />
        <AttendanceProgress label="متابعة" value={watch} total={Math.max(1, total)} tone="gold" />
        <AttendanceProgress label="مستقر" value={stable} total={Math.max(1, total)} tone="green" />
      </div>

      <div className="mt-4 space-y-2">
        {risks.slice(0, 4).map((item) => (
          <div key={item.student.id} className="rounded-2xl bg-[var(--app-card-soft)] px-3 py-2">
            <p className="text-sm font-black text-[var(--app-text)]">
              {getStudentName(item.student)}
            </p>
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">
              {STATUS_LABELS[item.status]} · {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AttendanceDistributionPanel({
  summary,
}: {
  summary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    clinic: number;
  };
}) {
  const total = Math.max(
    1,
    summary.present + summary.absent + summary.late + summary.excused + summary.clinic,
  );

  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <ChartNoAxesCombined size={20} />
        توزيع الحضور
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        توزيع حالات الحضور في الحصة الحالية.
      </p>

      <div className="mt-5 space-y-4">
        <AttendanceProgress label="حاضر" value={summary.present} total={total} tone="green" />
        <AttendanceProgress label="غائب" value={summary.absent} total={total} tone="red" />
        <AttendanceProgress label="متأخر" value={summary.late} total={total} tone="gold" />
        <AttendanceProgress label="مستأذن" value={summary.excused} total={total} tone="primary" />
        <AttendanceProgress label="عيادة" value={summary.clinic} total={total} tone="primary" />
      </div>
    </section>
  );
}

function AttendanceStudentDrawer({
  student,
  status,
  onClose,
}: {
  student: StudentRow;
  status: AttendanceStatus;
  onClose: () => void;
}) {
  const recommendations = buildAttendanceRecommendations(student, status);

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-[color-mix(in_srgb,var(--app-text)_40%,transparent)] backdrop-blur-sm print:hidden">
      <button type="button" className="flex-1" onClick={onClose} aria-label="إغلاق" />
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-xl)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-[var(--app-accent)]">تفاصيل الحضور</p>
            <h2 className="mt-1 text-2xl font-black text-[var(--app-text)]">
              {getStudentName(student)}
            </h2>
          </div>

          <button type="button" onClick={onClose} className="rounded-xl bg-[var(--app-card-soft)] p-2 text-[var(--app-text-muted)]">
            <XCircle size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <AttendanceDrawerMetric label="الحالة" value={STATUS_LABELS[status]} />
          <AttendanceDrawerMetric label="رقم الطالب" value={student.student_number || "-"} />
          <AttendanceDrawerMetric label="الفصل" value={getStudentClass(student) || "-"} />
          <AttendanceDrawerMetric label="الشعبة" value={student.section || "-"} />
        </div>

        <div className="mt-5 space-y-3">
          <AttendanceDrawerSection
            title="الملخص"
            items={[
              `الاسم: ${getStudentName(student)}`,
              `الهوية: ${student.national_id || "-"}`,
              `الحالة الحالية: ${STATUS_LABELS[status]}`,
            ]}
          />

          <AttendanceDrawerSection
            title="التوصيات"
            items={recommendations}
          />

          <AttendanceDrawerSection
            title="السجل"
            items={[
              "تم تحديث حالة الطالب في الحصة الحالية.",
              "تم احتساب مستوى المخاطر تلقائيًا.",
              status === "clinic"
                ? "تم تجهيز التحويل للعيادة عند الحفظ."
                : "لا يوجد تحويل صحي في الحالة الحالية.",
            ]}
          />
        </div>
      </aside>
    </div>
  );
}

function AttendanceMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: AttendanceInsightTone;
}) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${insightTone(tone)}`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function AttendanceInfoLine({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[var(--app-card-soft)] px-3 py-2">
      <span className="text-xs font-bold text-[var(--app-text-muted)]">{label}</span>
      <span className="text-sm font-black text-[var(--app-text)]">{value}</span>
    </div>
  );
}

function AttendanceProgress({
  label,
  value,
  total,
  tone,
  suffix = "",
}: {
  label: string;
  value: number;
  total: number;
  tone: AttendanceInsightTone;
  suffix?: string;
}) {
  const width = Math.min(100, Math.max(4, percentage(value, total)));

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-[var(--app-text-muted)]">
        <span>{label}</span>
        <span>{value}{suffix}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--app-card-soft)]">
        <div className={`h-full rounded-full ${progressTone(tone)}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function AttendanceDrawerMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--app-card-soft)] p-4">
      <p className="text-xs font-bold text-[var(--app-text-subtle)]">{label}</p>
      <p className="mt-1 text-lg font-black text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function AttendanceDrawerSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <p className="mb-2 text-sm font-black text-[var(--app-text)]">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <p key={item} className="text-xs leading-6 text-[var(--app-text-muted)]">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}


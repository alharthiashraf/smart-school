"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Gauge,
  GripVertical,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  School,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import Section from "@/components/ui/page/PageSection";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/lib/supabase";
import { ExportEngine } from "@/core";

type TeacherRow = {
  id: string;
  full_name?: string | null;
  teacher_name?: string | null;
  email?: string | null;
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
  track_name?: string | null;
  section?: string | null;
};

type TeacherSubjectRow = {
  id: string;
  school_id: string;
  teacher_id: string | null;
  subject_id: string | null;
  classroom_id: string | null;
  academic_year: string | null;
  semester: string | null;
  is_active: boolean | null;
  teachers?: TeacherRow | TeacherRow[] | null;
  subjects?: SubjectRow | SubjectRow[] | null;
  classrooms?: ClassroomRow | ClassroomRow[] | null;
};

type ScheduleRow = {
  id: string;
  school_id: string;
  teacher_subject_id: string;
  day_name: string;
  period_number: number;
  start_time?: string | null;
  end_time?: string | null;
  room_name?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  teacher_subjects?: TeacherSubjectRow | TeacherSubjectRow[] | null;
};

type ScheduleView = ScheduleRow & {
  teacherSubject: TeacherSubjectRow | null;
  teacherId: string | null;
  classroomId: string | null;
  teacherName: string;
  teacherEmail: string;
  subjectName: string;
  subjectCode: string;
  classroomName: string;
  gradeName: string;
  sectionName: string;
  academicYearText: string;
  semesterText: string;
  periodLabel: string;
  timeRange: string;
  roomName: string;
  statusLabel: "نشطة" | "غير نشطة";
};

type ScheduleForm = {
  teacher_subject_id: string;
  day_name: string;
  period_number: string;
  start_time: string;
  end_time: string;
  room_name: string;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type SchedulePayload = {
  school_id: string;
  teacher_subject_id: string;
  day_name: string;
  period_number: number;
  start_time: string | null;
  end_time: string | null;
  room_name: string | null;
  is_active: boolean;
};

type Conflict = {
  id: string;
  type: "teacher" | "classroom" | "room";
  title: string;
  description: string;
  dayName: string;
  periodNumber: number;
};

type ScheduleInsightTone = "green" | "gold" | "red" | "blue" | "primary";

type ScheduleInsight = {
  title: string;
  description: string;
  tone: ScheduleInsightTone;
  icon: ReactNode;
};

type ScheduleHealth = {
  completionRate: number;
  conflictRate: number;
  balanceScore: number;
  roomCoverage: number;
  emptySlots: number;
};

type WorkloadItem = {
  id: string;
  name: string;
  lessons: number;
  days: number;
  averagePerDay: number;
};

type UtilizationItem = {
  id: string;
  name: string;
  lessons: number;
};


const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

const emptyForm: ScheduleForm = {
  teacher_subject_id: "",
  day_name: "الأحد",
  period_number: "1",
  start_time: "",
  end_time: "",
  room_name: "",
};

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return "-";
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
    [classroom.grade_name, classroom.section].filter(Boolean).join(" ") ||
    "فصل غير محدد"
  );
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildTimeRange(startMinute: number, periodMinutes = 45) {
  const start = minutesToTime(startMinute);
  const end = minutesToTime(startMinute + periodMinutes);
  return { start, end };
}

function scheduleLabel(assignment: TeacherSubjectRow) {
  const teacher = firstOrSelf(assignment.teachers);
  const subject = firstOrSelf(assignment.subjects);
  const classroom = firstOrSelf(assignment.classrooms);

  return `${getTeacherName(teacher)} - ${getSubjectName(subject)} - ${getClassroomName(classroom)}`;
}

function normalizeSchedule(row: ScheduleRow): ScheduleView {
  const teacherSubject = firstOrSelf(row.teacher_subjects);
  const teacher = firstOrSelf(teacherSubject?.teachers);
  const subject = firstOrSelf(teacherSubject?.subjects);
  const classroom = firstOrSelf(teacherSubject?.classrooms);

  const start = row.start_time || "";
  const end = row.end_time || "";

  return {
    ...row,
    teacherSubject,
    teacherId: teacherSubject?.teacher_id || null,
    classroomId: teacherSubject?.classroom_id || null,
    teacherName: getTeacherName(teacher),
    teacherEmail: teacher?.email || "بدون بريد",
    subjectName: getSubjectName(subject),
    subjectCode: subject?.subject_code || "-",
    classroomName: getClassroomName(classroom),
    gradeName: classroom?.grade_name || "-",
    sectionName: classroom?.section || "-",
    academicYearText: teacherSubject?.academic_year || "غير محدد",
    semesterText: teacherSubject?.semester || "غير محدد",
    periodLabel: `الحصة ${row.period_number}`,
    timeRange: start || end ? `${start || "-"} - ${end || "-"}` : "غير محدد",
    roomName: row.room_name || "غير محدد",
    statusLabel: row.is_active === false ? "غير نشطة" : "نشطة",
  };
}


function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function insightTone(tone: ScheduleInsightTone) {
  const tones: Record<ScheduleInsightTone, string> = {
    green: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
    gold: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    red: "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    primary: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
  };

  return tones[tone];
}

function progressTone(tone: ScheduleInsightTone) {
  const tones: Record<ScheduleInsightTone, string> = {
    green: "bg-[var(--app-green)]",
    gold: "bg-[var(--app-accent)]",
    red: "bg-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue)]",
    primary: "bg-[var(--app-primary)]",
  };

  return tones[tone];
}

function buildScheduleRecommendations(
  row: ScheduleView,
  teacherLessons: number,
) {
  const recommendations: string[] = [];

  if (teacherLessons >= 24) {
    recommendations.push("حمل المعلم مرتفع؛ يفضل مراجعة توزيع الحصص.");
  }

  if (row.roomName === "غير محدد") {
    recommendations.push("يفضل تحديد القاعة قبل نشر الجدول.");
  }

  if (row.timeRange === "غير محدد") {
    recommendations.push("يفضل تحديد وقت البداية والنهاية.");
  }

  if (recommendations.length === 0) {
    recommendations.push("الحصة مكتملة ولا توجد ملاحظات تشغيلية حرجة.");
  }

  return recommendations;
}

function detectConflicts(rows: ScheduleView[]): Conflict[] {
  const conflicts: Conflict[] = [];

  const groups = new Map<string, ScheduleView[]>();

  rows
    .filter((row) => row.is_active !== false)
    .forEach((row) => {
      const baseKey = `${row.day_name}-${row.period_number}`;

      if (row.teacherId) {
        const key = `teacher-${baseKey}-${row.teacherId}`;
        groups.set(key, [...(groups.get(key) || []), row]);
      }

      if (row.classroomId) {
        const key = `classroom-${baseKey}-${row.classroomId}`;
        groups.set(key, [...(groups.get(key) || []), row]);
      }

      if (row.room_name) {
        const key = `room-${baseKey}-${row.room_name}`;
        groups.set(key, [...(groups.get(key) || []), row]);
      }
    });

  groups.forEach((items, key) => {
    if (items.length < 2) return;

    const first = items[0];

    if (key.startsWith("teacher")) {
      conflicts.push({
        id: key,
        type: "teacher",
        title: "تعارض معلم",
        description: `${first.teacherName} لديه أكثر من حصة في نفس الوقت.`,
        dayName: first.day_name,
        periodNumber: first.period_number,
      });
    } else if (key.startsWith("classroom")) {
      conflicts.push({
        id: key,
        type: "classroom",
        title: "تعارض فصل",
        description: `${first.classroomName} لديه أكثر من حصة في نفس الوقت.`,
        dayName: first.day_name,
        periodNumber: first.period_number,
      });
    } else {
      conflicts.push({
        id: key,
        type: "room",
        title: "تعارض قاعة",
        description: `${first.roomName} مستخدمة في أكثر من حصة في نفس الوقت.`,
        dayName: first.day_name,
        periodNumber: first.period_number,
      });
    }
  });

  return conflicts;
}

export default function SchedulesPage() {
  const {
    currentSchool,
    currentRole,
    hasPermission,
    academicYear,
    semester,
    loading: schoolLoading,
  } = useSchool();

  const canManage =
    hasPermission("schedules.manage") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin" ||
    currentRole === "vice_principal";

  const canView =
    hasPermission("schedules.view") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin" ||
    currentRole === "vice_principal" ||
    currentRole === "administrative_staff" ||
    currentRole === "teacher";

  const [assignments, setAssignments] = useState<TeacherSubjectRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [classroomFilter, setClassroomFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"week" | "table">("week");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(true);
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleView | null>(null);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadData = useCallback(async () => {
    if (!currentSchool?.id) {
      setAssignments([]);
      setSchedules([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const schoolId = currentSchool.id;

      const [assignmentsResult, schedulesResult] = await Promise.allSettled([
        supabase
          .from("teacher_subjects")
          .select(
            `
            id,
            school_id,
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
              grade_name,
              track_name,
              section
            )
          `,
          )
          .eq("school_id", schoolId)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),

        supabase
          .from("teacher_schedule")
          .select(
            `
            id,
            school_id,
            teacher_subject_id,
            day_name,
            period_number,
            start_time,
            end_time,
            room_name,
            is_active,
            created_at,
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
                grade_name,
                track_name,
                section
              )
            )
          `,
          )
          .eq("school_id", schoolId)
          .order("day_name", { ascending: true })
          .order("period_number", { ascending: true }),
      ]);

      if (assignmentsResult.status === "fulfilled") {
        if (assignmentsResult.value.error) throw assignmentsResult.value.error;
        setAssignments((assignmentsResult.value.data as TeacherSubjectRow[]) || []);
      }

      if (schedulesResult.status === "fulfilled") {
        if (schedulesResult.value.error) throw schedulesResult.value.error;
        setSchedules((schedulesResult.value.data as ScheduleRow[]) || []);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر تحميل الجداول الدراسية.";
      showToast("error", message);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, showToast]);

  useEffect(() => {
    if (!schoolLoading) {
      void loadData();
    }
  }, [schoolLoading, loadData]);

  useEffect(() => {
    setPage(1);
  }, [search, dayFilter, teacherFilter, classroomFilter, viewMode]);

  const rows = useMemo(() => schedules.map(normalizeSchedule), [schedules]);

  const activeAssignments = useMemo(
    () => assignments.filter((item) => item.is_active !== false),
    [assignments],
  );

  const conflicts = useMemo(() => detectConflicts(rows), [rows]);

  const teachers = useMemo(() => {
    const map = new Map<string, string>();

    rows.forEach((row) => {
      if (row.teacherId) map.set(row.teacherId, row.teacherName);
    });

    activeAssignments.forEach((assignment) => {
      if (!assignment.teacher_id) return;
      map.set(
        assignment.teacher_id,
        getTeacherName(firstOrSelf(assignment.teachers)),
      );
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rows, activeAssignments]);

  const classrooms = useMemo(() => {
    const map = new Map<string, string>();

    rows.forEach((row) => {
      if (row.classroomId) map.set(row.classroomId, row.classroomName);
    });

    activeAssignments.forEach((assignment) => {
      if (!assignment.classroom_id) return;
      map.set(
        assignment.classroom_id,
        getClassroomName(firstOrSelf(assignment.classrooms)),
      );
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rows, activeAssignments]);

  const filteredRows = useMemo(() => {
    const keyword = normalizeText(search);

    return rows.filter((row) => {
      const searchable = normalizeText(
        [
          row.teacherName,
          row.teacherEmail,
          row.subjectName,
          row.subjectCode,
          row.classroomName,
          row.gradeName,
          row.sectionName,
          row.day_name,
          row.periodLabel,
          row.timeRange,
          row.roomName,
          row.academicYearText,
          row.semesterText,
        ].join(" "),
      );

      const matchesSearch = !keyword || searchable.includes(keyword);

      const matchesDay = dayFilter === "all" || row.day_name === dayFilter;

      const matchesTeacher =
        teacherFilter === "all" || row.teacherId === teacherFilter;

      const matchesClassroom =
        classroomFilter === "all" || row.classroomId === classroomFilter;

      return matchesSearch && matchesDay && matchesTeacher && matchesClassroom;
    });
  }, [rows, search, dayFilter, teacherFilter, classroomFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / 10));
  const pagedRows = filteredRows.slice((page - 1) * 10, page * 10);

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.is_active !== false);
    const teachersCount = new Set(active.map((row) => row.teacherId).filter(Boolean))
      .size;
    const subjectsCount = new Set(active.map((row) => row.subjectName).filter(Boolean))
      .size;
    const classroomsCount = new Set(
      active.map((row) => row.classroomId).filter(Boolean),
    ).size;

    return {
      total: rows.length,
      filtered: filteredRows.length,
      active: active.length,
      teachers: teachersCount,
      subjects: subjectsCount,
      classrooms: classroomsCount,
      conflicts: conflicts.length,
    };
  }, [rows, filteredRows.length, conflicts.length]);

  const scheduledAssignmentIds = useMemo(
    () => new Set(rows.map((row) => row.teacher_subject_id)),
    [rows],
  );

  const unscheduledAssignments = useMemo(
    () =>
      activeAssignments.filter(
        (assignment) => !scheduledAssignmentIds.has(assignment.id),
      ),
    [activeAssignments, scheduledAssignmentIds],
  );

  const workload = useMemo<WorkloadItem[]>(() => {
    const map = new Map<string, { name: string; lessons: number; days: Set<string> }>();

    rows.forEach((row) => {
      if (!row.teacherId) return;

      const current = map.get(row.teacherId) || {
        name: row.teacherName,
        lessons: 0,
        days: new Set<string>(),
      };

      current.lessons += 1;
      current.days.add(row.day_name);
      map.set(row.teacherId, current);
    });

    return Array.from(map.entries())
      .map(([id, item]) => ({
        id,
        name: item.name,
        lessons: item.lessons,
        days: item.days.size,
        averagePerDay: item.days.size
          ? Math.round((item.lessons / item.days.size) * 10) / 10
          : 0,
      }))
      .sort((a, b) => b.lessons - a.lessons);
  }, [rows]);

  const classroomUtilization = useMemo<UtilizationItem[]>(() => {
    const map = new Map<string, UtilizationItem>();

    rows.forEach((row) => {
      if (!row.classroomId) return;
      const current = map.get(row.classroomId) || {
        id: row.classroomId,
        name: row.classroomName,
        lessons: 0,
      };
      current.lessons += 1;
      map.set(row.classroomId, current);
    });

    return Array.from(map.values()).sort((a, b) => b.lessons - a.lessons);
  }, [rows]);

  const roomUtilization = useMemo<UtilizationItem[]>(() => {
    const map = new Map<string, UtilizationItem>();

    rows.forEach((row) => {
      const room = row.roomName;
      if (!room || room === "غير محدد") return;

      const current = map.get(room) || {
        id: room,
        name: room,
        lessons: 0,
      };
      current.lessons += 1;
      map.set(room, current);
    });

    return Array.from(map.values()).sort((a, b) => b.lessons - a.lessons);
  }, [rows]);

  const dayDistribution = useMemo(
    () =>
      DAYS.map((day) => ({
        day,
        count: rows.filter((row) => row.day_name === day).length,
      })),
    [rows],
  );

  const periodDistribution = useMemo(
    () =>
      PERIODS.map((period) => ({
        period,
        count: rows.filter((row) => row.period_number === period).length,
      })),
    [rows],
  );

  const health = useMemo<ScheduleHealth>(() => {
    const totalSlots = DAYS.length * PERIODS.length;
    const usedSlots = new Set(
      rows.map((row) => `${row.day_name}-${row.period_number}`),
    ).size;

    const dayCounts = dayDistribution.map((item) => item.count);
    const maxDay = Math.max(0, ...dayCounts);
    const minDay = Math.min(...dayCounts);
    const balanceScore =
      maxDay === 0 ? 0 : Math.max(0, 100 - Math.round(((maxDay - minDay) / maxDay) * 100));

    const withRoom = rows.filter((row) => row.roomName !== "غير محدد").length;

    return {
      completionRate: percent(
        activeAssignments.length - unscheduledAssignments.length,
        activeAssignments.length,
      ),
      conflictRate: percent(conflicts.length, Math.max(1, rows.length)),
      balanceScore,
      roomCoverage: percent(withRoom, rows.length),
      emptySlots: Math.max(0, totalSlots - usedSlots),
    };
  }, [
    activeAssignments.length,
    conflicts.length,
    dayDistribution,
    rows,
    unscheduledAssignments.length,
  ]);

  const smartInsights = useMemo<ScheduleInsight[]>(() => {
    const items: ScheduleInsight[] = [];
    const heavyTeachers = workload.filter((item) => item.lessons >= 24);
    const roomsMissing = rows.filter((row) => row.roomName === "غير محدد").length;
    const busiestDay = [...dayDistribution].sort((a, b) => b.count - a.count)[0];
    const quietestDay = [...dayDistribution].sort((a, b) => a.count - b.count)[0];

    if (heavyTeachers.length > 0) {
      items.push({
        title: "حمل مرتفع لبعض المعلمين",
        description: `يوجد ${heavyTeachers.length} معلم لديهم 24 حصة أو أكثر.`,
        tone: "red",
        icon: <UsersRound className="h-5 w-5" />,
      });
    }

    if (conflicts.length > 0) {
      items.push({
        title: "تعارضات تحتاج معالجة",
        description: `تم اكتشاف ${conflicts.length} تعارضًا في الجدول الحالي.`,
        tone: "gold",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    }

    if (roomsMissing > 0) {
      items.push({
        title: "حصص بدون قاعات",
        description: `${roomsMissing} حصة لا تحتوي على قاعة محددة.`,
        tone: "blue",
        icon: <School className="h-5 w-5" />,
      });
    }

    if (busiestDay && quietestDay) {
      items.push({
        title: "توازن الأيام",
        description: `${busiestDay.day} هو الأكثر ازدحامًا، و${quietestDay.day} هو الأقل.`,
        tone: "primary",
        icon: <Activity className="h-5 w-5" />,
      });
    }

    if (items.length === 0) {
      items.push({
        title: "الجدول مستقر",
        description: "لا توجد مؤشرات حرجة في التوزيع الحالي.",
        tone: "green",
        icon: <Sparkles className="h-5 w-5" />,
      });
    }

    return items.slice(0, 4);
  }, [conflicts.length, dayDistribution, rows, workload]);

  function runSmartSearch(command: string) {
    const value = normalizeText(command);

    setSearch("");
    setDayFilter("all");
    setTeacherFilter("all");
    setClassroomFilter("all");

    const matchingDay = DAYS.find((day) => value.includes(normalizeText(day)));
    if (matchingDay) {
      setDayFilter(matchingDay);
      return;
    }

    const matchingPeriod = PERIODS.find((period) =>
      value.includes(String(period)),
    );
    if (matchingPeriod) {
      setSearch(`الحصة ${matchingPeriod}`);
      return;
    }

    if (value.includes("بدون قاعه") || value.includes("القاعات الفارغه")) {
      setSearch("غير محدد");
      return;
    }

    setSearch(command.replace("حصص", "").trim());
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      teacher_subject_id: activeAssignments[0]?.id || "",
    });
  }

  function buildPayload(input: ScheduleForm): SchedulePayload {
    if (!currentSchool?.id) {
      throw new Error("لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
    }

    const period = Number(input.period_number);

    if (!input.teacher_subject_id) {
      throw new Error("اختر الإسناد قبل الحفظ.");
    }

    if (!input.day_name) {
      throw new Error("اختر اليوم.");
    }

    if (!Number.isFinite(period) || period <= 0) {
      throw new Error("رقم الحصة غير صحيح.");
    }

    return {
      school_id: currentSchool.id,
      teacher_subject_id: input.teacher_subject_id,
      day_name: input.day_name,
      period_number: period,
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      room_name: input.room_name.trim() || null,
      is_active: true,
    };
  }

  function hasConflict(payload: {
    teacher_subject_id: string;
    day_name: string;
    period_number: number;
    room_name?: string | null;
  }) {
    const assignment = activeAssignments.find(
      (item) => item.id === payload.teacher_subject_id,
    );

    if (!assignment) return false;

    const teacherId = assignment.teacher_id;
    const classroomId = assignment.classroom_id;

    return rows.some((row) => {
      if (row.day_name !== payload.day_name) return false;
      if (row.period_number !== payload.period_number) return false;
      if (teacherId && row.teacherId === teacherId) return true;
      if (classroomId && row.classroomId === classroomId) return true;

      if (
        payload.room_name &&
        row.room_name &&
        normalizeText(row.room_name) === normalizeText(payload.room_name)
      ) {
        return true;
      }

      return false;
    });
  }

  async function submitSchedule(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!canManage) {
      showToast("error", "لا تملك صلاحية إدارة الجداول.");
      return;
    }

    setSaving(true);

    try {
      const payload = buildPayload(form);

      if (hasConflict(payload)) {
        showToast(
          "error",
          "لا يمكن الحفظ: يوجد تعارض للمعلم أو الفصل أو القاعة في نفس اليوم والحصة.",
        );
        return;
      }

      const { error } = await supabase.from("teacher_schedule").insert(payload);
      if (error) throw error;

      showToast("success", "تمت إضافة الحصة بنجاح.");
      resetForm();
      await loadData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر حفظ الحصة.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function removeSchedule(id: string) {
    if (!canManage || !currentSchool?.id) return;

    const confirmed = window.confirm("هل تريد حذف هذه الحصة من الجدول؟");
    if (!confirmed) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("teacher_schedule")
        .delete()
        .eq("id", id)
        .eq("school_id", currentSchool.id);

      if (error) throw error;

      showToast("success", "تم حذف الحصة.");
      await loadData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر حذف الحصة.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function moveSchedule(id: string, dayName: string, periodNumber: number) {
    if (!canManage || !currentSchool?.id) return;

    const row = rows.find((item) => item.id === id);
    if (!row) return;

    const assignment = row.teacherSubject;
    if (!assignment) return;

    const conflict = rows.some((item) => {
      if (item.id === id) return false;
      if (item.day_name !== dayName) return false;
      if (item.period_number !== periodNumber) return false;
      if (row.teacherId && item.teacherId === row.teacherId) return true;
      if (row.classroomId && item.classroomId === row.classroomId) return true;

      if (
        row.room_name &&
        item.room_name &&
        normalizeText(row.room_name) === normalizeText(item.room_name)
      ) {
        return true;
      }

      return false;
    });

    if (conflict) {
      showToast("error", "لا يمكن النقل: يوجد تعارض في الخانة الجديدة.");
      return;
    }

    const { error } = await supabase
      .from("teacher_schedule")
      .update({
        day_name: dayName,
        period_number: periodNumber,
      })
      .eq("id", id)
      .eq("school_id", currentSchool.id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    showToast("success", "تم نقل الحصة.");
    await loadData();
  }

  async function generateAutoSchedule() {
    if (!canManage || !currentSchool?.id) return;

    if (unscheduledAssignments.length === 0) {
      showToast("error", "لا توجد إسنادات جديدة تحتاج جدولة.");
      return;
    }

    const confirmed = window.confirm(
      "سيتم إنشاء حصة واحدة لكل إسناد غير مجدول مع تجنب تعارض المعلم والفصل. هل تريد المتابعة؟",
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const payloads: SchedulePayload[] = [];
      const tempRows = [...rows];

      let dayIndex = 0;
      let periodIndex = 0;

      for (const assignment of unscheduledAssignments) {
        let placed = false;

        for (let attempt = 0; attempt < DAYS.length * PERIODS.length; attempt++) {
          const dayName = DAYS[dayIndex % DAYS.length];
          const periodNumber = PERIODS[periodIndex % PERIODS.length];
          const baseStart = 7 * 60 + (periodNumber - 1) * 50;
          const { start, end } = buildTimeRange(baseStart);

          const testPayload: SchedulePayload = {
            school_id: currentSchool.id,
            teacher_subject_id: assignment.id,
            day_name: dayName,
            period_number: periodNumber,
            start_time: start,
            end_time: end,
            room_name: null,
            is_active: true,
          };

          const testAssignment = normalizeSchedule({
            id: `temp-${assignment.id}`,
            school_id: currentSchool.id,
            teacher_subject_id: assignment.id,
            day_name: dayName,
            period_number: periodNumber,
            start_time: start,
            end_time: end,
            room_name: null,
            is_active: true,
            teacher_subjects: assignment,
          });

          const hasConflictNow = tempRows.some((row) => {
            if (row.day_name !== dayName) return false;
            if (row.period_number !== periodNumber) return false;
            if (testAssignment.teacherId && row.teacherId === testAssignment.teacherId) return true;
            if (testAssignment.classroomId && row.classroomId === testAssignment.classroomId) return true;
            return false;
          });

          periodIndex += 1;
          if (periodIndex >= PERIODS.length) {
            periodIndex = 0;
            dayIndex += 1;
          }

          if (!hasConflictNow) {
            payloads.push(testPayload);
            tempRows.push(testAssignment);
            placed = true;
            break;
          }
        }

        if (!placed) {
          break;
        }
      }

      if (payloads.length === 0) {
        showToast("error", "لم يتم العثور على خانات مناسبة للجدولة التلقائية.");
        return;
      }

      const { error } = await supabase.from("teacher_schedule").insert(payloads);
      if (error) throw error;

      showToast("success", `تم إنشاء ${payloads.length} حصة تلقائيًا.`);
      await loadData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر إنشاء الجدول تلقائيًا.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function importExcel(file: File) {
    if (!canManage || !currentSchool?.id) return;

    setSaving(true);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      const payloads: SchedulePayload[] = rawRows
        .map((row): SchedulePayload | null => {
          const teacherText = normalizeText(
            row["المعلم"] || row["teacher"] || row["Teacher"],
          );
          const subjectText = normalizeText(
            row["المادة"] || row["subject"] || row["Subject"],
          );
          const classroomText = normalizeText(
            row["الفصل"] || row["classroom"] || row["Classroom"],
          );
          const dayName = String(row["اليوم"] || row["day"] || row["Day"] || "").trim();
          const periodNumber = Number(
            row["الحصة"] || row["period"] || row["Period"] || 0,
          );

          const assignment = activeAssignments.find((item) => {
            return (
              normalizeText(getTeacherName(firstOrSelf(item.teachers))).includes(
                teacherText,
              ) &&
              normalizeText(getSubjectName(firstOrSelf(item.subjects))).includes(
                subjectText,
              ) &&
              normalizeText(getClassroomName(firstOrSelf(item.classrooms))).includes(
                classroomText,
              )
            );
          });

          if (!assignment || !dayName || !periodNumber) return null;

          return {
            school_id: currentSchool.id,
            teacher_subject_id: assignment.id,
            day_name: dayName,
            period_number: periodNumber,
            start_time: String(row["البداية"] || row["start_time"] || "").trim() || null,
            end_time: String(row["النهاية"] || row["end_time"] || "").trim() || null,
            room_name: String(row["القاعة"] || row["room"] || "").trim() || null,
            is_active: true,
          };
        })
        .filter((payload): payload is SchedulePayload => payload !== null);

      if (payloads.length === 0) {
        showToast("error", "لم يتم التعرف على أي حصص صالحة داخل الملف.");
        return;
      }

      const { error } = await supabase.from("teacher_schedule").insert(payloads);
      if (error) throw error;

      showToast("success", `تم استيراد ${payloads.length} حصة من الملف.`);
      await loadData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر استيراد الملف.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  function exportExcel() {
    ExportEngine.excel("الجداول-الدراسية", filteredRows, [
      { header: "المعلم", key: "teacherName" },
      { header: "المادة", key: "subjectName" },
      { header: "الفصل", key: "classroomName" },
      { header: "اليوم", key: "day_name" },
      { header: "الحصة", key: "periodLabel" },
      { header: "الوقت", key: "timeRange" },
      { header: "القاعة", key: "roomName" },
      { header: "السنة", key: "academicYearText" },
      { header: "الفصل الدراسي", key: "semesterText" },
    ]);
  }

  function exportPDF() {
    ExportEngine.pdf("الجداول الدراسية", filteredRows, [
      { header: "المعلم", key: "teacherName" },
      { header: "المادة", key: "subjectName" },
      { header: "الفصل", key: "classroomName" },
      { header: "اليوم", key: "day_name" },
      { header: "الحصة", key: "periodLabel" },
      { header: "الوقت", key: "timeRange" },
      { header: "القاعة", key: "roomName" },
    ]);
  }

  if (!canView) {
    return (
      <AuthGuard>
        <SummaryCard
          title="لا تملك صلاحية الوصول إلى الجداول الدراسية"
          description="هذه الصفحة مخصصة للإدارة المدرسية حسب الصلاحيات."
          tone="gold"
          icon={<CalendarDays size={22} />}
        />
      </AuthGuard>
    );
  }

  if (schoolLoading) {
    return (
      <AuthGuard>
        <LoadingBox text="جاري تحميل بيانات المدرسة..." />
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
      <div className="space-y-5" dir="rtl">
        {toast && <ToastBox toast={toast} />}
        <PageHeader
          variant="hero"
          title="الجداول الدراسية"
          description={`${currentSchool.school_name} — إنشاء الجداول من إسناد المعلمين، مع فحص تعارض المعلم والفصل والقاعة، ودعم الاستيراد والتصدير والجدولة التلقائية.`}
          badge="محرك الجداول الدراسية"
          icon={<CalendarDays size={18} />}
          breadcrumbs={[{ label: "لوحة التحكم", href: "/dashboard" }, { label: "الجداول الدراسية" }]}
          meta={[
            { label: "المدرسة", value: currentSchool.school_name },
            { label: "العام الدراسي", value: academicYear || "غير محدد" },
            { label: "الفصل الدراسي", value: semester || "غير محدد" },
            { label: "الإسنادات غير المجدولة", value: unscheduledAssignments.length },
          ]}
          stats={[
            { label: "إجمالي الحصص", value: stats.total, icon: <CalendarDays size={20} />, tone: "blue" },
            { label: "المعلمون", value: stats.teachers, icon: <UserRound size={20} />, tone: "green" },
            { label: "الفصول", value: stats.classrooms, icon: <School size={20} />, tone: "primary" },
            { label: "التعارضات", value: stats.conflicts, icon: <AlertTriangle size={20} />, tone: stats.conflicts > 0 ? "red" : "green" },
          ]}
          actions={
            <>
              {canManage && (
                <button type="button" onClick={generateAutoSchedule} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--app-accent)] px-4 text-sm font-black text-[var(--app-primary)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60">
                  <Bot size={17} />
                  إنشاء ذكي
                </button>
              )}
              {canManage && (
                <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-4 text-sm font-black text-[var(--app-primary)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <Upload size={17} />
                  استيراد
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importExcel(file); event.currentTarget.value = ""; }} />
                </label>
              )}
              <button type="button" onClick={exportExcel} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-4 text-sm font-black text-[var(--app-primary)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Download size={17} /> Excel
              </button>
              <button type="button" onClick={exportPDF} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--app-primary)] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Printer size={17} /> PDF
              </button>
              <button type="button" onClick={() => void loadData()} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--app-primary)] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60">
                <RefreshCcw size={17} className={loading ? "animate-spin" : ""} /> تحديث
              </button>
            </>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <ExecutiveCard
            title="إجمالي الحصص"
            value={stats.total}
            subtitle="كل الحصص المسجلة"
            icon={<CalendarDays size={22} />}
            tone="blue"
            progress={stats.total > 0 ? 100 : 0}
          />
          <ExecutiveCard
            title="نتائج البحث"
            value={stats.filtered}
            subtitle="حسب الفلاتر الحالية"
            icon={<FileText size={22} />}
            tone="primary"
            progress={stats.total ? Math.round((stats.filtered / stats.total) * 100) : 0}
          />
          <ExecutiveCard
            title="المعلمون"
            value={stats.teachers}
            subtitle="معلمون داخل الجدول"
            icon={<UserRound size={22} />}
            tone="green"
          />
          <ExecutiveCard
            title="المواد"
            value={stats.subjects}
            subtitle="مواد مجدولة"
            icon={<BookOpen size={22} />}
            tone="gold"
          />
          <ExecutiveCard
            title="الفصول"
            value={stats.classrooms}
            subtitle="فصول مشمولة"
            icon={<School size={22} />}
            tone="primary"
          />
          <ExecutiveCard
            title="التعارضات"
            value={stats.conflicts}
            subtitle={stats.conflicts > 0 ? "تحتاج مراجعة" : "لا توجد تعارضات"}
            icon={<AlertTriangle size={22} />}
            tone={stats.conflicts > 0 ? "red" : "green"}
            progress={stats.conflicts > 0 ? 100 : 0}
          />
        </section>

        <SummaryCard
          title="الملخص التنفيذي للجداول"
          description="قراءة سريعة لحالة الجدول الدراسي والتعارضات والإسنادات غير المجدولة."
          tone={stats.conflicts > 0 ? "red" : "green"}
          items={[
            { label: "إجمالي الحصص", value: stats.total },
            { label: "الحصص النشطة", value: stats.active },
            { label: "نتائج البحث", value: stats.filtered },
            { label: "المعلمون", value: stats.teachers },
            { label: "الإسنادات غير المجدولة", value: unscheduledAssignments.length },
            { label: "التعارضات", value: stats.conflicts },
          ]}
          footer="يفضل معالجة التعارضات قبل اعتماد الجدول ونشره للمعلمين والطلاب."
        />


        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <ScheduleExecutiveAnalytics
            stats={stats}
            health={health}
            workload={workload}
            roomUtilization={roomUtilization}
          />

          <ScheduleSmartInsights insights={smartInsights} />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ScheduleHealthPanel health={health} />
          <ScheduleHeatMap
            days={dayDistribution}
            periods={periodDistribution}
          />
          <ScheduleUtilizationPanel
            workload={workload}
            classrooms={classroomUtilization}
            rooms={roomUtilization}
          />
        </section>

        <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm print:hidden">
          <div className="mb-4">
            <h2 className="text-xl font-black text-[var(--app-text)]">
              البحث الذكي في الجداول
            </h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              جرّب: حصص الرياضيات، الثلاثاء، الحصة 3، القاعات الفارغة.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {["حصص الرياضيات", "الثلاثاء", "الحصة 3", "القاعات الفارغة"].map((command) => (
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

        {conflicts.length > 0 && (
          <Section title="تقرير التعارضات" description="تعارضات تحتاج مراجعة قبل اعتماد الجدول." icon={<AlertTriangle size={20} />} className="border-[var(--app-destructive)]/20 bg-[var(--app-destructive-soft)]">
            <div className="grid gap-3 md:grid-cols-2">
              {conflicts.slice(0, 8).map((conflict) => (
                <div key={conflict.id} className="rounded-2xl bg-[var(--app-card)] px-4 py-3 shadow-sm">
                  <p className="font-black text-[var(--app-destructive)]">{conflict.title}</p>
                  <p className="mt-1 text-sm text-[var(--app-text-muted)]">{conflict.description}</p>
                  <p className="mt-2 text-xs font-bold text-[var(--app-text-muted)]">{conflict.dayName} · الحصة {conflict.periodNumber}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {canManage && formOpen && (
          <Section
            title="إضافة حصة يدوية"
            description="أضف حصة إلى الجدول مع فحص التعارضات قبل الحفظ."
            icon={<Plus size={20} />}
            className="print:hidden"
            actions={
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-2xl bg-[var(--app-card-soft)] px-4 py-2 text-sm font-bold text-[var(--app-text)] transition hover:bg-[var(--app-card-soft)]"
              >
                إخفاء
              </button>
            }
          >

            <form onSubmit={submitSchedule}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                <select
                  value={form.teacher_subject_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      teacher_subject_id: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-[var(--app-border)] px-4 py-3 text-sm outline-none focus:border-[var(--app-accent)] xl:col-span-2"
                >
                  <option value="">اختر إسناد المعلم والمادة</option>
                  {activeAssignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {scheduleLabel(assignment)}
                    </option>
                  ))}
                </select>

                <select
                  value={form.day_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      day_name: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-card)]"
                >
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>

                <select
                  value={form.period_number}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      period_number: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-card)]"
                >
                  {PERIODS.map((period) => (
                    <option key={period} value={period}>
                      الحصة {period}
                    </option>
                  ))}
                </select>

                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, start_time: value }))
                  }
                />

                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, end_time: value }))
                  }
                />

                <Input
                  placeholder="القاعة"
                  value={form.room_name}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, room_name: value }))
                  }
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-5 flex items-center gap-2 rounded-2xl bg-[var(--app-primary)] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                <Save size={16} />
                {saving ? "جاري الحفظ..." : "حفظ الحصة"}
              </button>
            </form>
          </Section>
        )}

        {canManage && !formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-[var(--app-primary)] px-5 py-3 text-sm font-bold text-white print:hidden"
          >
            <Plus size={16} />
            إظهار نموذج إضافة حصة
          </button>
        )}
        <PageToolbar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "ابحث باسم المعلم أو المادة أو الفصل...",
          }}
          filters={
            <>
              <ToolbarSelect value={dayFilter} onChange={setDayFilter}>
                <option value="all">كل الأيام</option>
                {DAYS.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </ToolbarSelect>
              <ToolbarSelect value={teacherFilter} onChange={setTeacherFilter}>
                <option value="all">كل المعلمين</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))}
              </ToolbarSelect>
              <ToolbarSelect value={classroomFilter} onChange={setClassroomFilter}>
                <option value="all">كل الفصول</option>
                {classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                ))}
              </ToolbarSelect>
            </>
          }
          onRefresh={() => void loadData()}
          onExportExcel={exportExcel}
          onExportPDF={exportPDF}
          actions={
            <div className="flex rounded-2xl bg-[var(--app-card-soft)] p-1">
              <button type="button" onClick={() => setViewMode("week")} className={`rounded-xl px-4 py-2 text-sm font-black transition ${viewMode === "week" ? "bg-[var(--app-primary)] text-white" : "text-[var(--app-text-muted)] hover:bg-[var(--app-card)]"}`}>
                عرض أسبوعي
              </button>
              <button type="button" onClick={() => setViewMode("table")} className={`rounded-xl px-4 py-2 text-sm font-black transition ${viewMode === "table" ? "bg-[var(--app-primary)] text-white" : "text-[var(--app-text-muted)] hover:bg-[var(--app-card)]"}`}>
                جدول بيانات
              </button>
            </div>
          }
        />

        {loading ? (
          <LoadingBox text="جاري تحميل الجداول الدراسية..." />
        ) : filteredRows.length === 0 ? (
          <EmptyBox text="لا توجد حصص مطابقة للبحث أو لم يتم إنشاء الجدول بعد." />
        ) : viewMode === "week" ? (
          <WeeklySchedule
            rows={filteredRows}
            canManage={canManage}
            onMove={moveSchedule}
            onRemove={removeSchedule}
            onSelect={setSelectedSchedule}
          />
        ) : (
          <ScheduleTable
            rows={pagedRows}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            onRemove={removeSchedule}
            canManage={canManage}
            onSelect={setSelectedSchedule}
          />
        )}

        {selectedSchedule && (
          <ScheduleDrawer
            row={selectedSchedule}
            workload={workload.find((item) => item.id === selectedSchedule.teacherId)}
            onClose={() => setSelectedSchedule(null)}
          />
        )}
      </div>
    </AuthGuard>
  );
}

function WeeklySchedule({
  rows,
  canManage,
  onMove,
  onRemove,
  onSelect,
}: {
  rows: ScheduleView[];
  canManage: boolean;
  onMove: (id: string, dayName: string, periodNumber: number) => void;
  onRemove: (id: string) => void;
  onSelect: (row: ScheduleView) => void;
}) {
  const bySlot = useMemo(() => {
    const map = new Map<string, ScheduleView[]>();

    rows.forEach((row) => {
      const key = `${row.day_name}-${row.period_number}`;
      map.set(key, [...(map.get(key) || []), row]);
    });

    return map;
  }, [rows]);

  return (
    <Section
      title="الجدول الأسبوعي"
      description="اسحب الحصة وانقلها بين الأيام والحصص عند وجود الصلاحية."
      icon={<CalendarDays size={20} />}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-separate border-spacing-2 text-sm">
          <thead>
            <tr>
              <th className="rounded-2xl bg-[var(--app-card-soft)] p-3 text-right font-black text-[var(--app-text-muted)]">
                الحصة
              </th>
              {DAYS.map((day) => (
                <th
                  key={day}
                  className="rounded-2xl bg-[var(--app-primary)] p-3 font-black text-white shadow-sm"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {PERIODS.map((period) => (
              <tr key={period}>
                <td className="rounded-2xl bg-[var(--app-card-soft)] p-3 text-center font-black text-[var(--app-text)]">
                  {period}
                </td>

                {DAYS.map((day) => {
                  const items = bySlot.get(`${day}-${period}`) || [];

                  return (
                    <td
                      key={`${day}-${period}`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        const id = event.dataTransfer.getData("schedule-id");
                        if (id) void onMove(id, day, period);
                      }}
                      className="h-36 rounded-[22px] border border-dashed border-[var(--app-border)] bg-[var(--app-card-soft)] p-2 align-top transition hover:bg-[var(--app-card)]"
                    >
                      {items.map((item) => (
                        <div
                          key={item.id}
                          draggable={canManage}
                          onDragStart={(event) =>
                            event.dataTransfer.setData("schedule-id", item.id)
                          }
                          onClick={() => onSelect(item)}
                          className="mb-2 cursor-pointer rounded-[18px] border border-[var(--app-border)] bg-[var(--app-card)] p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--app-primary)]/30 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1 text-xs font-black text-[var(--app-primary)]">
                                {canManage && <GripVertical size={13} />}
                                {item.subjectName}
                              </div>

                              <p className="mt-1 text-xs font-bold text-[var(--app-text-muted)]">
                                {item.teacherName}
                              </p>

                              <p className="mt-1 text-[11px] font-bold text-[var(--app-text-muted)]">
                                {item.classroomName} · {item.roomName}
                              </p>
                            </div>

                            {canManage && (
                              <button
                                type="button"
                                aria-label={`حذف حصة ${item.subjectName}`}
                                title="حذف الحصة"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void onRemove(item.id);
                                }}
                                className="rounded-lg bg-[var(--app-destructive-soft)] p-1 text-[var(--app-destructive)] hover:bg-[var(--app-destructive-soft)]"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function ScheduleTable({
  rows,
  page,
  totalPages,
  setPage,
  onRemove,
  canManage,
  onSelect,
}: {
  rows: ScheduleView[];
  page: number;
  totalPages: number;
  setPage: (value: number | ((current: number) => number)) => void;
  onRemove: (id: string) => void;
  canManage: boolean;
  onSelect: (row: ScheduleView) => void;
}) {
  return (
    <Section
      title="جدول البيانات"
      description="عرض مفصل للحصص حسب البحث والفلاتر الحالية."
      icon={<FileText size={20} />}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px]">
          <thead>
            <tr className="border-b border-[var(--app-border)] bg-[var(--app-card-soft)] text-right text-sm text-[var(--app-text-muted)]">
              <th className="rounded-r-2xl px-4 py-3">المعلم</th>
              <th className="px-4 py-3">المادة</th>
              <th className="px-4 py-3">الفصل</th>
              <th className="px-4 py-3">اليوم</th>
              <th className="px-4 py-3">الحصة</th>
              <th className="px-4 py-3">الوقت</th>
              <th className="px-4 py-3">القاعة</th>
              <th className="rounded-l-2xl px-4 py-3 print:hidden">
                الإجراءات
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onSelect(row)}
                className="cursor-pointer border-b border-[var(--app-border)] text-sm transition hover:bg-[var(--app-card-soft)]"
              >
                <td className="px-4 py-3">
                  <div className="font-black text-[var(--app-primary)]">
                    {row.teacherName}
                  </div>
                  <div className="mt-1 text-xs text-[var(--app-text-muted)]">
                    {row.teacherEmail}
                  </div>
                </td>
                <td className="px-4 py-3">{row.subjectName}</td>
                <td className="px-4 py-3">
                  {row.classroomName}
                  <div className="mt-1 text-xs text-[var(--app-text-muted)]">
                    {row.gradeName} - {row.sectionName}
                  </div>
                </td>
                <td className="px-4 py-3">{row.day_name}</td>
                <td className="px-4 py-3">{row.periodLabel}</td>
                <td className="px-4 py-3">{row.timeRange}</td>
                <td className="px-4 py-3">{row.roomName}</td>
                <td className="px-4 py-3 print:hidden">
                  {canManage ? (
                    <button
                      type="button"
                      aria-label={`حذف حصة ${row.subjectName}`}
                      title="حذف الحصة"
                      onClick={(event) => {
                        event.stopPropagation();
                        void onRemove(row.id);
                      }}
                      className="rounded-xl bg-[var(--app-destructive-soft)] p-2 text-[var(--app-destructive)] hover:bg-[var(--app-destructive-soft)]"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-[var(--app-text-muted)]">
                      عرض فقط
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-[var(--app-text-muted)]">صفحة {page} من {totalPages}</p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page === 1}
            className="rounded-xl border p-2 disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page === totalPages}
            className="rounded-xl border p-2 disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>
    </Section>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl print:hidden ${
        toast.type === "success" ? "bg-[var(--app-green)]" : "bg-[var(--app-destructive)]"
      }`}
    >
      <span>{toast.message}</span>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-card)]"
    />
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[var(--app-border)] bg-[var(--app-card)] p-10 text-center text-sm font-bold text-[var(--app-text-muted)]">
      {text}
    </div>
  );
}

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-6 text-center text-[var(--app-text-muted)] shadow-sm">
      <RefreshCcw className="mx-auto mb-3 h-6 w-6 animate-spin text-[var(--app-primary)]" />
      {text}
    </div>
  );
}


function ScheduleExecutiveAnalytics({
  stats,
  health,
  workload,
  roomUtilization,
}: {
  stats: {
    total: number;
    filtered: number;
    active: number;
    teachers: number;
    subjects: number;
    classrooms: number;
    conflicts: number;
  };
  health: ScheduleHealth;
  workload: WorkloadItem[];
  roomUtilization: UtilizationItem[];
}) {
  const busiestTeacher = workload[0];

  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black text-[var(--app-text)]">
          Executive Analytics
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          قراءة تنفيذية لاكتمال الجدول والإشغال والحمل.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ScheduleMetric label="اكتمال الجدولة" value={`${health.completionRate}%`} icon={<Gauge size={18} />} tone="green" />
        <ScheduleMetric label="الخانات الفارغة" value={health.emptySlots} icon={<CalendarDays size={18} />} tone="blue" />
        <ScheduleMetric label="القاعات المستخدمة" value={roomUtilization.length} icon={<School size={18} />} tone="primary" />
        <ScheduleMetric label="التعارضات" value={stats.conflicts} icon={<AlertTriangle size={18} />} tone={stats.conflicts > 0 ? "red" : "green"} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ScheduleInfoLine
          label="أعلى حمل تدريسي"
          value={busiestTeacher ? `${busiestTeacher.name} · ${busiestTeacher.lessons} حصة` : "-"}
        />
        <ScheduleInfoLine label="إجمالي الحصص" value={stats.total} />
      </div>
    </section>
  );
}

function ScheduleSmartInsights({ insights }: { insights: ScheduleInsight[] }) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
          <BrainCircuit size={20} />
          AI Smart Insights
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          توصيات تشغيلية مبنية على توزيع الجدول الحالي.
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
              <p className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScheduleHealthPanel({ health }: { health: ScheduleHealth }) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--app-text)]">Schedule Health</h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مؤشرات اكتمال وجودة وتوازن الجدول.
      </p>

      <div className="mt-5 space-y-4">
        <ScheduleProgress label="اكتمال الجدولة" value={health.completionRate} total={100} tone="green" suffix="%" />
        <ScheduleProgress label="توازن الأيام" value={health.balanceScore} total={100} tone="blue" suffix="%" />
        <ScheduleProgress label="تغطية القاعات" value={health.roomCoverage} total={100} tone="primary" suffix="%" />
        <ScheduleProgress label="نسبة التعارض" value={health.conflictRate} total={100} tone="red" suffix="%" />
      </div>
    </section>
  );
}

function ScheduleHeatMap({
  days,
  periods,
}: {
  days: Array<{ day: string; count: number }>;
  periods: Array<{ period: number; count: number }>;
}) {
  const maxDay = Math.max(1, ...days.map((item) => item.count));
  const maxPeriod = Math.max(1, ...periods.map((item) => item.count));

  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--app-text)]">Heat Map</h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        كثافة الحصص حسب الأيام والحصص.
      </p>

      <div className="mt-5 space-y-3">
        {days.map((item) => (
          <ScheduleProgress
            key={item.day}
            label={item.day}
            value={item.count}
            total={maxDay}
            tone="blue"
          />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2">
        {periods.map((item) => (
          <div key={item.period} className="rounded-2xl bg-[var(--app-card-soft)] p-3 text-center">
            <p className="text-xs font-bold text-[var(--app-text-muted)]">{item.period}</p>
            <p className="mt-1 text-lg font-black text-[var(--app-text)]">{item.count}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScheduleUtilizationPanel({
  workload,
  classrooms,
  rooms,
}: {
  workload: WorkloadItem[];
  classrooms: UtilizationItem[];
  rooms: UtilizationItem[];
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--app-text)]">Utilization</h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        استخدام المعلمين والفصول والقاعات.
      </p>

      <div className="mt-5 space-y-4">
        <ScheduleMiniList
          title="Teacher Workload"
          items={workload.slice(0, 4).map((item) => `${item.name} — ${item.lessons} حصة`)}
        />
        <ScheduleMiniList
          title="Classroom Utilization"
          items={classrooms.slice(0, 4).map((item) => `${item.name} — ${item.lessons} حصة`)}
        />
        <ScheduleMiniList
          title="Room Utilization"
          items={rooms.slice(0, 4).map((item) => `${item.name} — ${item.lessons} حصة`)}
        />
      </div>
    </section>
  );
}

function ScheduleDrawer({
  row,
  workload,
  onClose,
}: {
  row: ScheduleView;
  workload?: WorkloadItem;
  onClose: () => void;
}) {
  const recommendations = buildScheduleRecommendations(row, workload?.lessons ?? 0);

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40 backdrop-blur-sm print:hidden">
      <button type="button" className="flex-1" onClick={onClose} aria-label="إغلاق" />
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-[var(--app-card)] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-[var(--app-accent)]">Schedule Drawer V2</p>
            <h2 className="mt-1 text-2xl font-black text-[var(--app-primary)]">{row.subjectName}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-[var(--app-card-soft)] p-2 text-[var(--app-text-muted)]">
            <XCircle size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DrawerMetric label="اليوم" value={row.day_name} />
          <DrawerMetric label="الحصة" value={row.periodLabel} />
          <DrawerMetric label="المعلم" value={row.teacherName} />
          <DrawerMetric label="الفصل" value={row.classroomName} />
        </div>

        <div className="mt-5 space-y-3">
          <DrawerSection
            title="Overview"
            items={[
              `المادة: ${row.subjectName}`,
              `القاعة: ${row.roomName}`,
              `الوقت: ${row.timeRange}`,
              `الحالة: ${row.statusLabel}`,
            ]}
          />
          <DrawerSection
            title="Teacher Workload"
            items={[
              `إجمالي الحصص: ${workload?.lessons ?? 0}`,
              `عدد الأيام: ${workload?.days ?? 0}`,
              `متوسط الحصص اليومية: ${workload?.averagePerDay ?? 0}`,
            ]}
          />
          <DrawerSection title="AI Recommendations" items={recommendations} />
          <DrawerSection
            title="Timeline"
            items={[
              `تاريخ الإضافة: ${formatDate(row.created_at)}`,
              "تم احتساب التعارضات والحمل تلقائيًا.",
              "تمت مقارنة الحصة مع الجدول الأسبوعي الحالي.",
            ]}
          />
        </div>
      </aside>
    </div>
  );
}

function ScheduleMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: ScheduleInsightTone;
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

function ScheduleInfoLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[var(--app-card-soft)] px-3 py-2">
      <span className="text-xs font-bold text-[var(--app-text-muted)]">{label}</span>
      <span className="text-sm font-black text-[var(--app-text)]">{value}</span>
    </div>
  );
}

function ScheduleProgress({
  label,
  value,
  total,
  tone,
  suffix = "",
}: {
  label: string;
  value: number;
  total: number;
  tone: ScheduleInsightTone;
  suffix?: string;
}) {
  const width = Math.min(100, Math.max(4, percent(value, total)));

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

function ScheduleMiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl bg-[var(--app-card-soft)] p-4">
      <p className="mb-2 text-sm font-black text-[var(--app-text)]">{title}</p>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-[var(--app-text-muted)]">لا توجد بيانات.</p>
        ) : (
          items.map((item) => (
            <div key={item} className="rounded-2xl bg-[var(--app-card)] px-3 py-2 text-sm font-bold text-[var(--app-text)]">
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DrawerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--app-card-soft)] p-4">
      <p className="text-xs font-bold text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-black text-[var(--app-primary)]">{value}</p>
    </div>
  );
}

function DrawerSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <p className="mb-2 text-sm font-black text-[var(--app-primary)]">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <p key={item} className="text-xs leading-6 text-[var(--app-text-muted)]">{item}</p>
        ))}
      </div>
    </div>
  );
}


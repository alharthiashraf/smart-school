"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  GripVertical,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  School,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import Section from "@/components/ui/page/Section";
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
            { label: "الفصول", value: stats.classrooms, icon: <School size={20} />, tone: "teal" },
            { label: "التعارضات", value: stats.conflicts, icon: <AlertTriangle size={20} />, tone: stats.conflicts > 0 ? "red" : "green" },
          ]}
          actions={
            <>
              {canManage && (
                <button type="button" onClick={generateAutoSchedule} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#C1B489] px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60">
                  <Bot size={17} />
                  إنشاء ذكي
                </button>
              )}
              {canManage && (
                <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <Upload size={17} />
                  استيراد
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importExcel(file); event.currentTarget.value = ""; }} />
                </label>
              )}
              <button type="button" onClick={exportExcel} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Download size={17} /> Excel
              </button>
              <button type="button" onClick={exportPDF} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Printer size={17} /> PDF
              </button>
              <button type="button" onClick={() => void loadData()} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60">
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
            tone="teal"
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

        {conflicts.length > 0 && (
          <Section title="تقرير التعارضات" description="تعارضات تحتاج مراجعة قبل اعتماد الجدول." icon={<AlertTriangle size={20} />} className="border-red-100 bg-red-50">
            <div className="grid gap-3 md:grid-cols-2">
              {conflicts.slice(0, 8).map((conflict) => (
                <div key={conflict.id} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="font-black text-red-700">{conflict.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{conflict.description}</p>
                  <p className="mt-2 text-xs font-bold text-slate-400">{conflict.dayName} · الحصة {conflict.periodNumber}</p>
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
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
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
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#C1B489] xl:col-span-2"
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
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
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
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
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
                className="mt-5 flex items-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
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
            className="flex items-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-bold text-white print:hidden"
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
            <div className="flex rounded-2xl bg-slate-100 p-1">
              <button type="button" onClick={() => setViewMode("week")} className={`rounded-xl px-4 py-2 text-sm font-black transition ${viewMode === "week" ? "bg-[#15445A] text-white" : "text-slate-600 hover:bg-white"}`}>
                عرض أسبوعي
              </button>
              <button type="button" onClick={() => setViewMode("table")} className={`rounded-xl px-4 py-2 text-sm font-black transition ${viewMode === "table" ? "bg-[#15445A] text-white" : "text-slate-600 hover:bg-white"}`}>
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
          />
        ) : (
          <ScheduleTable
            rows={pagedRows}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            onRemove={removeSchedule}
            canManage={canManage}
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
}: {
  rows: ScheduleView[];
  canManage: boolean;
  onMove: (id: string, dayName: string, periodNumber: number) => void;
  onRemove: (id: string) => void;
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
              <th className="rounded-2xl bg-slate-100 p-3 text-right font-black text-slate-600">
                الحصة
              </th>
              {DAYS.map((day) => (
                <th
                  key={day}
                  className="rounded-2xl bg-[#15445A] p-3 font-black text-white shadow-sm"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {PERIODS.map((period) => (
              <tr key={period}>
                <td className="rounded-2xl bg-slate-100 p-3 text-center font-black text-slate-700">
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
                      className="h-36 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-2 align-top transition hover:bg-white"
                    >
                      {items.map((item) => (
                        <div
                          key={item.id}
                          draggable={canManage}
                          onDragStart={(event) =>
                            event.dataTransfer.setData("schedule-id", item.id)
                          }
                          className="mb-2 rounded-[18px] border border-slate-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0DA9A6]/30 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1 text-xs font-black text-[#15445A]">
                                {canManage && <GripVertical size={13} />}
                                {item.subjectName}
                              </div>

                              <p className="mt-1 text-xs font-bold text-slate-500">
                                {item.teacherName}
                              </p>

                              <p className="mt-1 text-[11px] font-bold text-slate-400">
                                {item.classroomName} · {item.roomName}
                              </p>
                            </div>

                            {canManage && (
                              <button
                                type="button"
                                onClick={() => void onRemove(item.id)}
                                className="rounded-lg bg-red-50 p-1 text-red-600 hover:bg-red-100"
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
}: {
  rows: ScheduleView[];
  page: number;
  totalPages: number;
  setPage: (value: number | ((current: number) => number)) => void;
  onRemove: (id: string) => void;
  canManage: boolean;
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
            <tr className="border-b border-slate-100 bg-slate-50 text-right text-sm text-slate-500">
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
                className="border-b border-slate-50 text-sm transition hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <div className="font-black text-[#15445A]">
                    {row.teacherName}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {row.teacherEmail}
                  </div>
                </td>
                <td className="px-4 py-3">{row.subjectName}</td>
                <td className="px-4 py-3">
                  {row.classroomName}
                  <div className="mt-1 text-xs text-slate-400">
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
                      onClick={() => void onRemove(row.id)}
                      className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">
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
        <p className="text-sm text-slate-500">صفحة {page} من {totalPages}</p>

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
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
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
      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
    />
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-6 text-center text-slate-500 shadow-sm">
      <RefreshCcw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#15445A]" />
      {text}
    </div>
  );
}

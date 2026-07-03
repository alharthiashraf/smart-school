"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileText,
  GraduationCap,
  Layers3,
  Plus,
  Power,
  Printer,
  RefreshCcw,
  Save,
  Search,
  School,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/lib/supabase";
import { ExportEngine } from "@/core";

type TeacherRow = {
  id: string;
  school_id?: string | null;
  full_name?: string | null;
  teacher_name?: string | null;
  email?: string | null;
  is_active?: boolean | null;
  status?: string | null;
  created_at?: string | null;
};

type SubjectRow = {
  id: string;
  school_id: string;
  stage_id?: string | null;
  subject_name?: string | null;
  subject_code?: string | null;
  subject_type?: string | null;
  is_active?: boolean | null;
};

type ClassroomRow = {
  id: string;
  school_id: string;
  stage_id?: string | null;
  classroom_name?: string | null;
  grade_name?: string | null;
  track_name?: string | null;
  section?: string | null;
  is_active?: boolean | null;
  stages?:
    | {
        id: string;
        stage_name: string | null;
      }
    | {
        id: string;
        stage_name: string | null;
      }[]
    | null;
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
  created_at?: string | null;
  teachers?: TeacherRow | TeacherRow[] | null;
  subjects?: SubjectRow | SubjectRow[] | null;
  classrooms?: ClassroomRow | ClassroomRow[] | null;
};

type AssignmentView = TeacherSubjectRow & {
  teacherName: string;
  teacherEmail: string;
  subjectName: string;
  subjectCode: string;
  classroomName: string;
  gradeName: string;
  stageName: string;
  trackName: string;
  sectionName: string;
  academicYearText: string;
  semesterText: string;
  statusLabel: "نشط" | "غير نشط";
  label: string;
};

type AssignmentForm = {
  teacher_id: string;
  subject_id: string;
  classroom_id: string;
  academic_year: string;
  semester: string;
  is_active: boolean;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type ViewMode = "table" | "cards";

const PAGE_SIZE = 10;

const DEFAULT_SEMESTERS = ["الفصل الدراسي الأول", "الفصل الدراسي الثاني"];

const emptyForm: AssignmentForm = {
  teacher_id: "",
  subject_id: "",
  classroom_id: "",
  academic_year: "",
  semester: "الفصل الدراسي الأول",
  is_active: true,
};

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
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
  return teacher?.full_name || teacher?.teacher_name || teacher?.email || "معلم غير محدد";
}

function getSubjectName(subject?: SubjectRow | null) {
  return subject?.subject_name || "مادة غير محددة";
}

function getClassroomName(classroom?: ClassroomRow | null) {
  return classroom?.classroom_name || "فصل غير محدد";
}

function getStageName(classroom?: ClassroomRow | null) {
  const stage = firstOrSelf(classroom?.stages);
  return stage?.stage_name || "غير محدد";
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeTrackName(value?: string | null) {
  const text = String(value || "").trim();
  if (!text || text === "-") return "عام";
  if (text === "عام") return "المسار العام";
  return text;
}

function buildAssignmentLabel(row: {
  stageName: string;
  gradeName: string;
  trackName: string;
  subjectName: string;
  semesterText: string;
}) {
  return [row.stageName, row.gradeName, row.trackName, row.subjectName, row.semesterText]
    .filter((item) => item && item !== "-" && item !== "غير محدد")
    .join(" – ");
}

function normalizeAssignment(
  assignment: TeacherSubjectRow,
  teachersMap: Map<string, TeacherRow>,
  subjectsMap: Map<string, SubjectRow>,
  classroomsMap: Map<string, ClassroomRow>,
): AssignmentView {
  const teacher =
    firstOrSelf(assignment.teachers) ||
    teachersMap.get(assignment.teacher_id || "") ||
    null;

  const subject =
    firstOrSelf(assignment.subjects) ||
    subjectsMap.get(assignment.subject_id || "") ||
    null;

  const classroom =
    firstOrSelf(assignment.classrooms) ||
    classroomsMap.get(assignment.classroom_id || "") ||
    null;

  const statusLabel: "نشط" | "غير نشط" =
    assignment.is_active === false ? "غير نشط" : "نشط";

  const base = {
    ...assignment,
    teacherName: getTeacherName(teacher),
    teacherEmail: teacher?.email || "بدون بريد",
    subjectName: getSubjectName(subject),
    subjectCode: subject?.subject_code || "-",
    classroomName: getClassroomName(classroom),
    gradeName: classroom?.grade_name || "-",
    stageName: getStageName(classroom),
    trackName: normalizeTrackName(classroom?.track_name),
    sectionName: classroom?.section || "-",
    academicYearText: assignment.academic_year || "غير محدد",
    semesterText: assignment.semester || "غير محدد",
    statusLabel,
  };

  return {
    ...base,
    label: buildAssignmentLabel(base),
  };
}

function getSemesterOptions(semesterSystem?: string | null) {
  if (
    semesterSystem === "3" ||
    semesterSystem === "three" ||
    semesterSystem === "ثلاثة فصول"
  ) {
    return ["الفصل الدراسي الأول", "الفصل الدراسي الثاني", "الفصل الدراسي الثالث"];
  }

  return DEFAULT_SEMESTERS;
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ar"),
  );
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function rowKey(row: AssignmentView) {
  return [
    row.teacher_id || "",
    row.subject_id || "",
    row.classroom_id || "",
    row.academicYearText,
    row.semesterText,
  ].join("|");
}

export default function TeacherSubjectsPage() {
  const {
    currentSchool,
    currentRole,
    hasPermission,
    academicYear,
    semester,
    semesterSystem,
    loading: schoolLoading,
  } = useSchool();

  const canManage =
    hasPermission("teacher_subjects.manage") ||
    hasPermission("teachers.manage") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin";

  const canView =
    hasPermission("teacher_subjects.view") ||
    hasPermission("teacher_subjects.view") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin" ||
    currentRole === "vice_principal" ||
    currentRole === "administrative_staff" ||
    currentRole === "teacher";

  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomRow[]>([]);
  const [assignments, setAssignments] = useState<TeacherSubjectRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [classroomFilter, setClassroomFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentView | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentView | null>(null);
  const [form, setForm] = useState<AssignmentForm>(emptyForm);

  const semesterOptions = useMemo(() => getSemesterOptions(semesterSystem), [semesterSystem]);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadData = useCallback(async () => {
    if (!currentSchool?.id) {
      setTeachers([]);
      setSubjects([]);
      setClassrooms([]);
      setAssignments([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const schoolId = currentSchool.id;

      const [teachersResult, subjectsResult, classroomsResult, assignmentsResult] = await Promise.allSettled([
        supabase
          .from("teachers")
          .select("id, school_id, full_name, teacher_name, email, is_active, status, created_at")
          .eq("school_id", schoolId)
          .order("full_name", { ascending: true }),

        supabase
          .from("subjects")
          .select("id, school_id, stage_id, subject_name, subject_code, subject_type, is_active")
          .eq("school_id", schoolId)
          .order("subject_name", { ascending: true }),

        supabase
          .from("classrooms")
          .select(
            `
              id,
              school_id,
              stage_id,
              classroom_name,
              grade_name,
              track_name,
              section,
              is_active,
              stages (
                id,
                stage_name
              )
            `,
          )
          .eq("school_id", schoolId)
          .order("grade_name", { ascending: true })
          .order("classroom_name", { ascending: true }),

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
              created_at,
              teachers (
                id,
                full_name,
                teacher_name,
                email,
                is_active,
                status
              ),
              subjects (
                id,
                subject_name,
                subject_code,
                subject_type,
                is_active
              ),
              classrooms (
                id,
                classroom_name,
                grade_name,
                track_name,
                section,
                is_active,
                stages (
                  id,
                  stage_name
                )
              )
            `,
          )
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false }),
      ]);

      if (teachersResult.status === "fulfilled") {
        if (teachersResult.value.error) throw teachersResult.value.error;
        setTeachers((teachersResult.value.data as TeacherRow[]) || []);
      }

      if (subjectsResult.status === "fulfilled") {
        if (subjectsResult.value.error) throw subjectsResult.value.error;
        setSubjects((subjectsResult.value.data as SubjectRow[]) || []);
      }

      if (classroomsResult.status === "fulfilled") {
        if (classroomsResult.value.error) throw classroomsResult.value.error;
        setClassrooms((classroomsResult.value.data as ClassroomRow[]) || []);
      }

      if (assignmentsResult.status === "fulfilled") {
        if (assignmentsResult.value.error) throw assignmentsResult.value.error;
        setAssignments((assignmentsResult.value.data as TeacherSubjectRow[]) || []);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل إسناد المعلمين.";
      showToast("error", message);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, showToast]);

  useEffect(() => {
    if (!schoolLoading) void loadData();
  }, [schoolLoading, loadData]);

  useEffect(() => {
    setPage(1);
  }, [search, teacherFilter, subjectFilter, classroomFilter, semesterFilter, gradeFilter, stageFilter, statusFilter]);

  const activeTeachers = useMemo(
    () => teachers.filter((teacher) => teacher.is_active !== false && teacher.status !== "غير نشط"),
    [teachers],
  );

  const activeSubjects = useMemo(() => subjects.filter((subject) => subject.is_active !== false), [subjects]);

  const activeClassrooms = useMemo(
    () => classrooms.filter((classroom) => classroom.is_active !== false),
    [classrooms],
  );

  const teachersMap = useMemo(() => new Map(teachers.map((teacher) => [teacher.id, teacher])), [teachers]);
  const subjectsMap = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const classroomsMap = useMemo(() => new Map(classrooms.map((classroom) => [classroom.id, classroom])), [classrooms]);

  const rows = useMemo(
    () => assignments.map((assignment) => normalizeAssignment(assignment, teachersMap, subjectsMap, classroomsMap)),
    [assignments, teachersMap, subjectsMap, classroomsMap],
  );

  const gradeOptions = useMemo(() => uniqueValues(classrooms.map((classroom) => classroom.grade_name)), [classrooms]);

  const stageOptions = useMemo(() => {
    return uniqueValues(classrooms.map((classroom) => getStageName(classroom)));
  }, [classrooms]);

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
          row.stageName,
          row.trackName,
          row.sectionName,
          row.academicYearText,
          row.semesterText,
          row.statusLabel,
          row.label,
        ].join(" "),
      );

      const matchesSearch = !keyword || searchable.includes(keyword);
      const matchesTeacher = teacherFilter === "all" || row.teacher_id === teacherFilter;
      const matchesSubject = subjectFilter === "all" || row.subject_id === subjectFilter;
      const matchesClassroom = classroomFilter === "all" || row.classroom_id === classroomFilter;
      const matchesSemester = semesterFilter === "all" || row.semesterText === semesterFilter;
      const matchesGrade = gradeFilter === "all" || row.gradeName === gradeFilter;
      const matchesStage = stageFilter === "all" || row.stageName === stageFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && row.is_active !== false) ||
        (statusFilter === "inactive" && row.is_active === false);

      return (
        matchesSearch &&
        matchesTeacher &&
        matchesSubject &&
        matchesClassroom &&
        matchesSemester &&
        matchesGrade &&
        matchesStage &&
        matchesStatus
      );
    });
  }, [rows, search, teacherFilter, subjectFilter, classroomFilter, semesterFilter, gradeFilter, stageFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const duplicateRows = useMemo(() => {
    const map = new Map<string, AssignmentView[]>();

    rows.forEach((row) => {
      const key = rowKey(row);
      const current = map.get(key) || [];
      current.push(row);
      map.set(key, current);
    });

    return Array.from(map.values()).filter((group) => group.length > 1).flat();
  }, [rows]);

  const teacherLoad = useMemo(() => {
    const map = new Map<string, AssignmentView[]>();

    rows
      .filter((row) => row.is_active !== false)
      .forEach((row) => {
        if (!row.teacher_id) return;
        map.set(row.teacher_id, [...(map.get(row.teacher_id) || []), row]);
      });

    return Array.from(map.entries())
      .map(([teacherId, items]) => ({
        teacherId,
        teacherName: getTeacherName(teachersMap.get(teacherId)),
        count: items.length,
        subjects: new Set(items.map((item) => item.subjectName)).size,
        classrooms: new Set(items.map((item) => item.classroomName)).size,
        rows: items,
      }))
      .sort((a, b) => b.count - a.count);
  }, [rows, teachersMap]);

  const unassignedTeachers = useMemo(() => {
    const assigned = new Set(rows.filter((row) => row.is_active !== false && row.teacher_id).map((row) => row.teacher_id as string));
    return activeTeachers.filter((teacher) => !assigned.has(teacher.id));
  }, [rows, activeTeachers]);

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.is_active !== false);
    const inactive = rows.filter((row) => row.is_active === false);

    const teachersCount = new Set(active.map((row) => row.teacher_id).filter(Boolean)).size;
    const subjectsCount = new Set(active.map((row) => row.subject_id).filter(Boolean)).size;
    const classroomsCount = new Set(active.map((row) => row.classroom_id).filter(Boolean)).size;

    return {
      total: rows.length,
      filtered: filteredRows.length,
      active: active.length,
      inactive: inactive.length,
      teachers: teachersCount,
      subjects: subjectsCount,
      classrooms: classroomsCount,
      unassignedTeachers: unassignedTeachers.length,
      duplicates: duplicateRows.length,
    };
  }, [rows, filteredRows.length, unassignedTeachers.length, duplicateRows.length]);

  function openCreateForm() {
    setEditingAssignment(null);
    setForm({
      ...emptyForm,
      academic_year: academicYear || "1447",
      semester: semester || semesterOptions[0],
      teacher_id: activeTeachers[0]?.id || "",
      subject_id: activeSubjects[0]?.id || "",
      classroom_id: activeClassrooms[0]?.id || "",
    });
    setFormOpen(true);
  }

  function openEditForm(assignment: AssignmentView) {
    setEditingAssignment(assignment);
    setForm({
      teacher_id: assignment.teacher_id || "",
      subject_id: assignment.subject_id || "",
      classroom_id: assignment.classroom_id || "",
      academic_year: assignment.academic_year || academicYear || "1447",
      semester: assignment.semester || semester || semesterOptions[0],
      is_active: assignment.is_active !== false,
    });
    setFormOpen(true);
  }

  function closeForm() {
    setEditingAssignment(null);
    setForm(emptyForm);
    setFormOpen(false);
  }

  function isDuplicateAssignment() {
    return assignments.some((assignment) => {
      if (editingAssignment && assignment.id === editingAssignment.id) return false;

      return (
        assignment.teacher_id === form.teacher_id &&
        assignment.subject_id === form.subject_id &&
        assignment.classroom_id === form.classroom_id &&
        assignment.academic_year === form.academic_year &&
        assignment.semester === form.semester
      );
    });
  }

  async function submitForm() {
    if (!canManage) {
      showToast("error", "لا تملك صلاحية إدارة إسناد المعلمين.");
      return;
    }

    if (!currentSchool?.id) {
      showToast("error", "لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      return;
    }

    if (!form.teacher_id || !form.subject_id || !form.classroom_id) {
      showToast("error", "اختر المعلم والمادة والفصل قبل الحفظ.");
      return;
    }

    if (!form.academic_year.trim() || !form.semester) {
      showToast("error", "السنة الدراسية والفصل الدراسي مطلوبة.");
      return;
    }

    if (isDuplicateAssignment()) {
      showToast("error", "هذا الإسناد موجود مسبقًا لنفس المعلم والمادة والفصل والسنة والفصل الدراسي.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        school_id: currentSchool.id,
        teacher_id: form.teacher_id,
        subject_id: form.subject_id,
        classroom_id: form.classroom_id,
        academic_year: form.academic_year.trim(),
        semester: form.semester,
        is_active: form.is_active,
      };

      const { error } = editingAssignment
        ? await supabase.from("teacher_subjects").update(payload).eq("id", editingAssignment.id).eq("school_id", currentSchool.id)
        : await supabase.from("teacher_subjects").insert(payload);

      if (error) throw error;

      showToast("success", editingAssignment ? "تم تحديث الإسناد بنجاح." : "تم إنشاء الإسناد بنجاح.");
      closeForm();
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الإسناد.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(assignment: AssignmentView) {
    if (!canManage || !currentSchool?.id) return;

    const nextStatus = assignment.is_active === false;
    const confirmed = window.confirm(nextStatus ? "هل تريد تفعيل هذا الإسناد؟" : "هل تريد تعطيل هذا الإسناد؟");

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("teacher_subjects")
        .update({ is_active: nextStatus })
        .eq("id", assignment.id)
        .eq("school_id", currentSchool.id);

      if (error) throw error;

      showToast("success", nextStatus ? "تم تفعيل الإسناد." : "تم تعطيل الإسناد.");
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تغيير حالة الإسناد.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function removeAssignment(assignment: AssignmentView) {
    if (!canManage || !currentSchool?.id) return;

    const confirmed = window.confirm(`سيتم حذف إسناد ${assignment.teacherName} لمادة ${assignment.subjectName}. هل أنت متأكد؟`);

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("teacher_subjects")
        .delete()
        .eq("id", assignment.id)
        .eq("school_id", currentSchool.id);

      if (error) throw error;

      if (selectedAssignment?.id === assignment.id) setSelectedAssignment(null);

      showToast("success", "تم حذف الإسناد بنجاح.");
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حذف الإسناد.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  function exportExcel() {
    ExportEngine.excel("إسناد-المعلمين-للمواد", filteredRows, [
      { header: "المعلم", key: "teacherName" },
      { header: "البريد", key: "teacherEmail" },
      { header: "المادة", key: "subjectName" },
      { header: "رمز المادة", key: "subjectCode" },
      { header: "الفصل", key: "classroomName" },
      { header: "المرحلة", key: "stageName" },
      { header: "الصف", key: "gradeName" },
      { header: "المسار", key: "trackName" },
      { header: "الشعبة", key: "sectionName" },
      { header: "السنة الدراسية", key: "academicYearText" },
      { header: "الفصل الدراسي", key: "semesterText" },
      { header: "الحالة", key: "statusLabel" },
    ]);
  }

  function exportPDF() {
    ExportEngine.pdf("إسناد المعلمين للمواد", filteredRows, [
      { header: "المعلم", key: "teacherName" },
      { header: "المادة", key: "subjectName" },
      { header: "الفصل", key: "classroomName" },
      { header: "الصف", key: "gradeName" },
      { header: "السنة", key: "academicYearText" },
      { header: "الفصل الدراسي", key: "semesterText" },
      { header: "الحالة", key: "statusLabel" },
    ]);
  }

  if (!canView) {
    return (
      <AuthGuard>
        <SummaryCard
          title="لا تملك صلاحية الوصول إلى إسناد المعلمين"
          description="هذه الصفحة مخصصة للإدارة المدرسية حسب الصلاحيات."
          tone="gold"
          icon={<Layers3 size={22} />}
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
          icon={<Layers3 size={22} />}
        />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="space-y-5" dir="rtl">
        {toast && <ToastBox toast={toast} />}

        <PageHeader
          variant="hero"
          title="إسناد المعلمين للمواد"
          description={`${currentSchool.school_name} — ربط المعلم بالمادة والفصل والسنة الدراسية والفصل الدراسي؛ ليُستخدم مباشرة في الجداول والدرجات والحضور والتحضير الإلكتروني والتقارير.`}
          badge="قلب النظام الأكاديمي"
          icon={<Layers3 size={18} />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "إسناد المعلمين" },
          ]}
          meta={[
            { label: "المدرسة", value: currentSchool.school_name },
            { label: "العام الدراسي", value: academicYear || "غير محدد" },
            { label: "الفصل الدراسي", value: semester || "غير محدد" },
            { label: "المعروض", value: stats.filtered },
          ]}
          stats={[
            { label: "إجمالي الإسنادات", value: stats.total, icon: <Layers3 size={20} />, tone: "blue" },
            { label: "إسنادات نشطة", value: stats.active, icon: <CheckCircle2 size={20} />, tone: "green" },
            { label: "معلمون مرتبطون", value: stats.teachers, icon: <UserRound size={20} />, tone: "teal" },
            { label: "تنبيهات", value: stats.unassignedTeachers + stats.duplicates, icon: <AlertTriangle size={20} />, tone: stats.unassignedTeachers + stats.duplicates > 0 ? "gold" : "green" },
          ]}
          actions={
            <>
              {canManage && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#C1B489] px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Plus size={17} />
                  إضافة إسناد
                </button>
              )}

              <button
                type="button"
                onClick={exportExcel}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Download size={17} />
                Excel
              </button>

              <button
                type="button"
                onClick={exportPDF}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Printer size={17} />
                PDF
              </button>

              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
              >
                <RefreshCcw size={17} className={loading ? "animate-spin" : ""} />
                تحديث
              </button>
            </>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <ExecutiveCard title="إجمالي الإسنادات" value={stats.total} subtitle="كل الإسنادات" icon={<Layers3 size={22} />} tone="blue" progress={stats.total > 0 ? 100 : 0} />
          <ExecutiveCard title="نشطة" value={stats.active} subtitle="جاهزة للتشغيل" icon={<CheckCircle2 size={22} />} tone="green" progress={percentage(stats.active, stats.total)} />
          <ExecutiveCard title="غير نشطة" value={stats.inactive} subtitle={stats.inactive > 0 ? "تحتاج مراجعة" : "لا توجد"} icon={<XCircle size={22} />} tone={stats.inactive > 0 ? "red" : "green"} progress={percentage(stats.inactive, stats.total)} />
          <ExecutiveCard title="معلمون" value={stats.teachers} subtitle={`${stats.unassignedTeachers} بلا إسناد`} icon={<UserRound size={22} />} tone="primary" />
          <ExecutiveCard title="مواد" value={stats.subjects} subtitle="ضمن الإسنادات" icon={<BookOpen size={22} />} tone="gold" />
          <ExecutiveCard title="تكرارات" value={stats.duplicates} subtitle="إسنادات مكررة" icon={<ShieldAlert size={22} />} tone={stats.duplicates > 0 ? "red" : "green"} />
        </section>

        <SummaryCard
          title="الملخص التنفيذي لإسناد المعلمين"
          description="قراءة سريعة لحالة الإسنادات، المعلمين المرتبطين، المواد والفصول المستخدمة، والمعلمين الذين يحتاجون إسناد."
          tone={stats.unassignedTeachers > 0 || stats.inactive > 0 || stats.duplicates > 0 ? "gold" : "green"}
          items={[
            { label: "إجمالي الإسنادات", value: stats.total },
            { label: "الإسنادات النشطة", value: stats.active },
            { label: "غير النشطة", value: stats.inactive },
            { label: "معلمون مرتبطون", value: stats.teachers },
            { label: "معلمون بلا إسناد", value: stats.unassignedTeachers },
            { label: "تكرارات", value: stats.duplicates },
          ]}
          footer="هذه الصفحة هي الأساس الذي تعتمد عليه الجداول والدرجات والحضور؛ لذلك يفضل مراجعة الإسنادات قبل بناء الجدول الدراسي."
        />

        {(unassignedTeachers.length > 0 || teacherLoad.length > 0 || duplicateRows.length > 0) && (
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            {teacherLoad.length > 0 && (
              <Panel title="حمل المعلمين" icon={<BarChart3 size={24} />}>
                <div className="space-y-3">
                  {teacherLoad.slice(0, 6).map((item) => (
                    <LoadBar key={item.teacherId} name={item.teacherName} count={item.count} max={teacherLoad[0]?.count || 1} />
                  ))}
                </div>
              </Panel>
            )}

            {unassignedTeachers.length > 0 && (
              <Panel title="معلمون بلا إسناد" icon={<AlertTriangle size={24} />} tone="gold">
                <div className="grid gap-3">
                  {unassignedTeachers.slice(0, 6).map((teacher) => (
                    <div key={teacher.id} className="rounded-2xl bg-white px-4 py-3">
                      <p className="font-black text-[#15445A]">{getTeacherName(teacher)}</p>
                      <p className="mt-1 text-xs font-bold text-slate-400">يحتاج إسناد مادة وفصل</p>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {duplicateRows.length > 0 && (
              <Panel title="إسنادات مكررة" icon={<ShieldAlert size={24} />} tone="red">
                <div className="space-y-3">
                  {duplicateRows.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedAssignment(item)}
                      className="w-full rounded-2xl bg-white px-4 py-3 text-right transition hover:shadow-sm"
                    >
                      <p className="font-black text-[#15445A]">{item.teacherName}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{item.subjectName} — {item.classroomName}</p>
                    </button>
                  ))}
                </div>
              </Panel>
            )}
          </section>
        )}

        {formOpen && (
          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm print:hidden">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {editingAssignment ? <Edit3 className="text-[#C1B489]" /> : <Plus className="text-[#C1B489]" />}
                <h2 className="text-xl font-black text-[#15445A]">{editingAssignment ? "تعديل إسناد" : "إضافة إسناد"}</h2>
              </div>

              <button type="button" onClick={closeForm} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold">
                إغلاق
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Select value={form.teacher_id} onChange={(value) => setForm((current) => ({ ...current, teacher_id: value }))}>
                <option value="">اختر المعلم</option>
                {activeTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {getTeacherName(teacher)}
                  </option>
                ))}
              </Select>

              <Select value={form.subject_id} onChange={(value) => setForm((current) => ({ ...current, subject_id: value }))}>
                <option value="">اختر المادة</option>
                {activeSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {getSubjectName(subject)}
                    {subject.subject_code ? ` - ${subject.subject_code}` : ""}
                  </option>
                ))}
              </Select>

              <Select value={form.classroom_id} onChange={(value) => setForm((current) => ({ ...current, classroom_id: value }))}>
                <option value="">اختر الفصل</option>
                {activeClassrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {getStageName(classroom)} - {classroom.grade_name || "صف غير محدد"} - {normalizeTrackName(classroom.track_name)} - {getClassroomName(classroom)}
                    {classroom.section ? ` - ${classroom.section}` : ""}
                  </option>
                ))}
              </Select>

              <Input placeholder="السنة الدراسية" value={form.academic_year} onChange={(value) => setForm((current) => ({ ...current, academic_year: value }))} />

              <Select value={form.semester} onChange={(value) => setForm((current) => ({ ...current, semester: value }))}>
                <option value="">اختر الفصل الدراسي</option>
                {semesterOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                  className="h-4 w-4"
                />
                الإسناد نشط
              </label>
            </div>

            <button
              type="button"
              onClick={() => void submitForm()}
              disabled={saving}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </section>
        )}

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-5 flex flex-col gap-4 print:hidden">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-[#15445A]">قائمة الإسنادات</h2>
                  <p className="mt-1 text-sm text-slate-500">عرض {pagedRows.length} من {filteredRows.length} إسناد</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`rounded-2xl px-4 py-2 text-sm font-black ${viewMode === "table" ? "bg-[#15445A] text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    جدول
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={`rounded-2xl px-4 py-2 text-sm font-black ${viewMode === "cards" ? "bg-[#15445A] text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    بطاقات
                  </button>
                </div>
              </div>

              <PageToolbar
                search={{
                  value: search,
                  onChange: setSearch,
                  placeholder: "ابحث باسم المعلم أو المادة أو الفصل...",
                }}
                filters={
                  <>
                    <ToolbarSelect value={teacherFilter} onChange={setTeacherFilter}>
                      <option value="all">كل المعلمين</option>
                      {activeTeachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {getTeacherName(teacher)}
                        </option>
                      ))}
                    </ToolbarSelect>

                    <ToolbarSelect value={subjectFilter} onChange={setSubjectFilter}>
                      <option value="all">كل المواد</option>
                      {activeSubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {getSubjectName(subject)}
                        </option>
                      ))}
                    </ToolbarSelect>

                    <ToolbarSelect value={stageFilter} onChange={setStageFilter}>
                      <option value="all">كل المراحل</option>
                      {stageOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </ToolbarSelect>

                    <ToolbarSelect value={gradeFilter} onChange={setGradeFilter}>
                      <option value="all">كل الصفوف</option>
                      {gradeOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </ToolbarSelect>

                    <ToolbarSelect value={semesterFilter} onChange={setSemesterFilter}>
                      <option value="all">كل الفصول الدراسية</option>
                      {semesterOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </ToolbarSelect>

                    <ToolbarSelect value={statusFilter} onChange={(value) => setStatusFilter(value as "all" | "active" | "inactive")}>
                      <option value="all">كل الحالات</option>
                      <option value="active">نشط</option>
                      <option value="inactive">غير نشط</option>
                    </ToolbarSelect>
                  </>
                }
                onRefresh={() => void loadData()}
                onExportExcel={exportExcel}
                onExportPDF={exportPDF}
              />
            </div>

            {loading ? (
              <LoadingBox text="جاري تحميل إسناد المعلمين..." />
            ) : filteredRows.length === 0 ? (
              <EmptyBox text="لا توجد إسنادات مطابقة للبحث أو الفلاتر الحالية." />
            ) : viewMode === "cards" ? (
              <div className="grid gap-3 md:grid-cols-2">
                {pagedRows.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    canManage={canManage}
                    onView={setSelectedAssignment}
                    onEdit={openEditForm}
                    onToggle={toggleActive}
                    onDelete={removeAssignment}
                  />
                ))}
              </div>
            ) : (
              <AssignmentsTable
                rows={pagedRows}
                canManage={canManage}
                onView={setSelectedAssignment}
                onEdit={openEditForm}
                onToggle={toggleActive}
                onDelete={removeAssignment}
              />
            )}

            {!loading && filteredRows.length > 0 && (
              <div className="mt-5 flex items-center justify-between">
                <p className="text-sm text-slate-500">عرض {pagedRows.length} من {filteredRows.length}</p>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded-xl border p-2 disabled:opacity-40">
                    <ChevronRight size={18} />
                  </button>

                  <span className="text-sm font-bold text-slate-700">
                    {page} / {totalPages}
                  </span>

                  <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="rounded-xl border p-2 disabled:opacity-40">
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            )}
          </section>

          <AssignmentSideCard
            selectedAssignment={selectedAssignment}
            setSelectedAssignment={setSelectedAssignment}
            teacherLoad={teacherLoad}
          />
        </section>
      </main>
    </AuthGuard>
  );
}

function AssignmentsTable({
  rows,
  canManage,
  onView,
  onEdit,
  onToggle,
  onDelete,
}: {
  rows: AssignmentView[];
  canManage: boolean;
  onView: (assignment: AssignmentView) => void;
  onEdit: (assignment: AssignmentView) => void;
  onToggle: (assignment: AssignmentView) => Promise<void>;
  onDelete: (assignment: AssignmentView) => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1250px]">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-right text-sm text-slate-500">
            <th className="rounded-r-2xl px-4 py-3">المعلم</th>
            <th className="px-4 py-3">المادة</th>
            <th className="px-4 py-3">الفصل</th>
            <th className="px-4 py-3">المرحلة</th>
            <th className="px-4 py-3">الصف</th>
            <th className="px-4 py-3">المسار</th>
            <th className="px-4 py-3">السنة</th>
            <th className="px-4 py-3">الفصل الدراسي</th>
            <th className="px-4 py-3">الحالة</th>
            <th className="rounded-l-2xl px-4 py-3 print:hidden">الإجراءات</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((assignment) => (
            <tr key={assignment.id} className="border-b border-slate-50 text-sm transition hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="font-black text-[#15445A]">{assignment.teacherName}</div>
                <div className="mt-1 text-xs font-bold text-slate-400">{assignment.teacherEmail}</div>
              </td>

              <td className="px-4 py-3">
                <div className="font-bold text-slate-700">{assignment.subjectName}</div>
                <div className="mt-1 text-xs text-slate-400">الرمز: {assignment.subjectCode}</div>
              </td>

              <td className="px-4 py-3">
                <div>{assignment.classroomName}</div>
                <div className="mt-1 text-xs text-slate-400">الشعبة: {assignment.sectionName}</div>
              </td>

              <td className="px-4 py-3">{assignment.stageName}</td>
              <td className="px-4 py-3">{assignment.gradeName}</td>
              <td className="px-4 py-3">{assignment.trackName}</td>
              <td className="px-4 py-3">{assignment.academicYearText}</td>
              <td className="px-4 py-3">{assignment.semesterText}</td>

              <td className="px-4 py-3">
                <AssignmentStatusBadge active={assignment.is_active !== false} />
              </td>

              <td className="px-4 py-3 print:hidden">
                <RowActions
                  assignment={assignment}
                  canManage={canManage}
                  onView={onView}
                  onEdit={onEdit}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssignmentCard({
  assignment,
  canManage,
  onView,
  onEdit,
  onToggle,
  onDelete,
}: {
  assignment: AssignmentView;
  canManage: boolean;
  onView: (assignment: AssignmentView) => void;
  onEdit: (assignment: AssignmentView) => void;
  onToggle: (assignment: AssignmentView) => Promise<void>;
  onDelete: (assignment: AssignmentView) => Promise<void>;
}) {
  return (
    <article className="rounded-[24px] border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-[#15445A]">{assignment.teacherName}</h3>
          <p className="mt-1 text-sm text-slate-500">{assignment.subjectName}</p>
        </div>

        <AssignmentStatusBadge active={assignment.is_active !== false} />
      </div>

      <div className="rounded-2xl bg-white p-4">
        <p className="text-sm font-black text-[#15445A]">{assignment.label || assignment.classroomName}</p>
        <p className="mt-2 text-xs leading-6 text-slate-500">
          الفصل: {assignment.classroomName} • الشعبة: {assignment.sectionName}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <RowActions
          assignment={assignment}
          canManage={canManage}
          onView={onView}
          onEdit={onEdit}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      </div>
    </article>
  );
}

function RowActions({
  assignment,
  canManage,
  onView,
  onEdit,
  onToggle,
  onDelete,
}: {
  assignment: AssignmentView;
  canManage: boolean;
  onView: (assignment: AssignmentView) => void;
  onEdit: (assignment: AssignmentView) => void;
  onToggle: (assignment: AssignmentView) => Promise<void>;
  onDelete: (assignment: AssignmentView) => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => onView(assignment)} className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200" title="عرض مختصر">
        <Eye size={16} />
      </button>

      {canManage && (
        <>
          <button type="button" onClick={() => onEdit(assignment)} className="rounded-xl bg-[#3D7EB9]/10 p-2 text-[#3D7EB9] hover:bg-[#3D7EB9]/20" title="تعديل">
            <Edit3 size={16} />
          </button>

          <button type="button" onClick={() => void onToggle(assignment)} className="rounded-xl bg-[#C1B489]/20 p-2 text-[#15445A] hover:bg-[#C1B489]/30" title={assignment.is_active === false ? "تفعيل" : "تعطيل"}>
            <Power size={16} />
          </button>

          <button type="button" onClick={() => void onDelete(assignment)} className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100" title="حذف">
            <Trash2 size={16} />
          </button>
        </>
      )}
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
  tone = "white",
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  tone?: "white" | "gold" | "red";
}) {
  const styles = {
    white: "border-slate-100 bg-white",
    gold: "border-[#C1B489]/40 bg-[#C1B489]/15",
    red: "border-red-100 bg-red-50",
  };

  return (
    <section className={`rounded-[28px] border p-5 shadow-sm ${styles[tone]}`}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          {icon}
        </div>
        <h2 className="text-xl font-black text-[#15445A]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function LoadBar({ name, count, max }: { name: string; count: number; max: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="mb-2 flex items-center justify-between text-sm font-black">
        <span className="text-[#15445A]">{name}</span>
        <span className="text-slate-500">{count}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-[#0DA9A6]" style={{ width: `${percentage(count, max)}%` }} />
      </div>
    </div>
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

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
    >
      {children}
    </select>
  );
}

function Input({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
    />
  );
}

function AssignmentStatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${active ? "bg-[#07A869]/10 text-[#07A869]" : "bg-red-50 text-red-700"}`}>
      {active ? "نشط" : "غير نشط"}
    </span>
  );
}

function AssignmentSideCard({
  selectedAssignment,
  setSelectedAssignment,
  teacherLoad,
}: {
  selectedAssignment: AssignmentView | null;
  setSelectedAssignment: (assignment: AssignmentView | null) => void;
  teacherLoad: Array<{ teacherId: string; teacherName: string; count: number; subjects: number; classrooms: number; rows: AssignmentView[] }>;
}) {
  if (!selectedAssignment) {
    return (
      <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="flex min-h-[350px] items-center justify-center rounded-3xl bg-slate-50 text-center">
          <div>
            <Layers3 size={42} className="mx-auto text-[#C1B489]" />
            <h3 className="mt-4 text-xl font-black text-[#15445A]">اختر إسنادًا</h3>
            <p className="mt-2 text-sm text-slate-500">اضغط على أيقونة العين لعرض تفاصيل الإسناد</p>
          </div>
        </div>
      </div>
    );
  }

  const load = teacherLoad.find((item) => item.teacherId === selectedAssignment.teacher_id);

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#15445A]">تفاصيل الإسناد</h2>

        <button type="button" onClick={() => setSelectedAssignment(null)} className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200">
          <X size={18} />
        </button>
      </div>

      <div className="rounded-[28px] bg-[#15445A] p-5 text-white">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C1B489] text-[#15445A]">
            <Layers3 size={28} />
          </div>

          <div>
            <h3 className="text-2xl font-black text-[#C1B489]">{selectedAssignment.teacherName}</h3>
            <p className="text-sm text-slate-300">{selectedAssignment.subjectName} — {selectedAssignment.classroomName}</p>
          </div>
        </div>

        <p className="rounded-2xl bg-white/10 p-3 text-sm font-black text-white">
          {selectedAssignment.label}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <InfoMini title="المعلم" value={selectedAssignment.teacherName} />
          <InfoMini title="المادة" value={selectedAssignment.subjectName} />
          <InfoMini title="الفصل" value={selectedAssignment.classroomName} />
          <InfoMini title="المرحلة" value={selectedAssignment.stageName} />
          <InfoMini title="الصف" value={selectedAssignment.gradeName} />
          <InfoMini title="المسار" value={selectedAssignment.trackName} />
          <InfoMini title="السنة" value={selectedAssignment.academicYearText} />
          <InfoMini title="الفصل الدراسي" value={selectedAssignment.semesterText} />
          <InfoMini title="الحالة" value={selectedAssignment.statusLabel} />
          <InfoMini title="المعرّف" value={selectedAssignment.id.slice(0, 8)} />
        </div>
      </div>

      {load && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MiniMetric label="إسنادات المعلم" value={load.count} />
          <MiniMetric label="مواد" value={load.subjects} />
          <MiniMetric label="فصول" value={load.classrooms} />
        </div>
      )}

      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-500">ملاحظة تشغيلية</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          هذا الإسناد سيستخدم لاحقًا في الجدول الدراسي، حضور الحصص، رصد الدرجات، والتحضير الإلكتروني. أي خطأ هنا سيظهر أثره في الصفحات الأكاديمية التالية.
        </p>
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-black text-slate-400">تاريخ الإضافة</p>
        <p className="mt-2 font-black text-[#15445A]">{formatDate(selectedAssignment.created_at)}</p>
      </div>
    </div>
  );
}

function InfoMini({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs text-slate-300">{title}</p>
      <p className="mt-1 truncate font-black text-white">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-center">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#15445A]">{value}</p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">
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

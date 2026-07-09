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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FileText,
  Grid2X2,
  List,
  Loader2,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import EmptyState from "@/components/ui/empty-state/EmptyState";
import PageLoader from "@/components/ui/loading/PageLoader";
import UiStatusBadge from "@/components/ui/badges/StatusBadge";
import { useSchool } from "@/contexts/SchoolContext";
import {
  StudentsService,
  type AttendanceStatus,
  type SchoolGradeSubjectRecord,
  type StudentAttendanceRecord,
  type StudentPeriodScoreRecord,
  type StudentRecord,
} from "@/services/students.service";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

type Student = StudentRecord & {
  grade_level?: string | null;
  classroom?: string | null;
  section?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  parent_email?: string | null;
  status?: string | null;
};

type Attendance = StudentAttendanceRecord;
type StudentPeriodScore = StudentPeriodScoreRecord;
type SchoolGradeSubject = SchoolGradeSubjectRecord;

type StudentWithAverage = Student & {
  average: number;
  hasGrades: boolean;
  absenceCount: number;
  todayStatus?: string;
};

type StudentForm = {
  full_name: string;
  national_id: string;
  student_number: string;
  grade_level: string;
  classroom: string;
  section: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  status: string;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type ViewMode = "table" | "cards";

const PAGE_SIZE = 10;
const DEFAULT_STATUS = "نشط";
const STUDENT_STATUSES = ["نشط", "منقول", "منسحب", "متخرج", "غير نشط"];

const emptyForm: StudentForm = {
  full_name: "",
  national_id: "",
  student_number: "",
  grade_level: "",
  classroom: "",
  section: "",
  guardian_name: "",
  guardian_phone: "",
  guardian_email: "",
  status: DEFAULT_STATUS,
};

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

function normalizeAttendance(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (["present", "حاضر", "حضور"].includes(value)) return "present";
  if (["absent", "غائب", "غياب"].includes(value)) return "absent";
  if (["late", "متأخر", "تأخر", "تاخر"].includes(value)) return "late";
  if (["clinic", "عيادة", "excused", "مستأذن", "تحويل إلى العيادة الصحية"].includes(value)) return "clinic";

  return "none";
}

function isPresent(status?: string | null) {
  return normalizeAttendance(status) === "present";
}

function isAbsent(status?: string | null) {
  return normalizeAttendance(status) === "absent";
}

function isLate(status?: string | null) {
  return normalizeAttendance(status) === "late";
}

function isClinic(status?: string | null) {
  return normalizeAttendance(status) === "clinic";
}

function getStatusLabel(status?: string | null) {
  const normalized = normalizeAttendance(status);

  if (normalized === "present") return "حاضر";
  if (normalized === "absent") return "غائب";
  if (normalized === "late") return "متأخر";
  if (normalized === "clinic") return "عيادة";

  return "لم يسجل";
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "ar"));
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function getExportHeaders() {
  return [
    "رقم الطالب",
    "رقم الهوية",
    "اسم الطالب",
    "المرحلة",
    "الفصل",
    "الشعبة",
    "ولي الأمر",
    "جوال ولي الأمر",
    "بريد ولي الأمر",
    "حضور اليوم",
    "متوسط الدرجات",
    "حالة التحصيل",
    "الحالة العامة",
  ];
}

function gradeTone(average: number) {
  if (average >= 90) return "bg-[#07A869]/10 text-[#07A869]";
  if (average >= 60) return "bg-[#3D7EB9]/10 text-[#3D7EB9]";
  if (average > 0) return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-500";
}

function riskLabel(student: StudentWithAverage) {
  if (student.absenceCount >= 5 || (student.average > 0 && student.average < 60)) return "عالي";
  if (student.absenceCount >= 3 || (student.average > 0 && student.average < 75)) return "متوسط";
  return "مستقر";
}

function riskTone(student: StudentWithAverage) {
  const label = riskLabel(student);
  if (label === "عالي") return "bg-red-50 text-red-700";
  if (label === "متوسط") return "bg-[#C1B489]/20 text-[#15445A]";
  return "bg-[#07A869]/10 text-[#07A869]";
}

export default function StudentsPage() {
  const {
    currentSchool,
    currentRole,
    hasPermission,
    loading: schoolLoading,
  } = useSchool();

  const canManage =
    hasPermission("students.manage") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin" ||
    currentRole === "administrative_staff";

  const canMarkAttendance =
    hasPermission("attendance.manage") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin" ||
    currentRole === "vice_principal" ||
    currentRole === "administrative_staff" ||
    currentRole === "teacher";

  const canView =
    hasPermission("students.view") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin" ||
    currentRole === "vice_principal" ||
    currentRole === "administrative_staff" ||
    currentRole === "teacher" ||
    currentRole === "student_counselor" ||
    currentRole === "health_supervisor";

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [scores, setScores] = useState<StudentPeriodScore[]>([]);
  const [gradeSubjects, setGradeSubjects] = useState<SchoolGradeSubject[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [classroomFilter, setClassroomFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithAverage | null>(null);
  const [attendanceMenuId, setAttendanceMenuId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);

  const today = todayISO();

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!currentSchool?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const result = await StudentsService.getDashboard(currentSchool.id);

      if (result.error) {
        showToast("error", result.error);
      }

      setStudents(result.data?.students ?? []);
      setAttendance(result.data?.attendance ?? []);
      setScores(result.data?.scores ?? []);
      setGradeSubjects(result.data?.gradeSubjects ?? []);
      setSelectedIds([]);
      setAttendanceMenuId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل بيانات الطلاب";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, showToast]);

  useEffect(() => {
    if (!schoolLoading) void fetchAllData();
  }, [schoolLoading, fetchAllData]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [search, gradeFilter, classroomFilter, statusFilter, quickFilter]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateForm<K extends keyof StudentForm>(key: K, value: StudentForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
  }

  function startEdit(student: Student) {
    setShowForm(true);
    setEditingId(student.id);
    setForm({
      full_name: student.full_name || "",
      national_id: student.national_id || "",
      student_number: student.student_number || "",
      grade_level: student.grade_level || "",
      classroom: student.classroom || "",
      section: student.section || "",
      guardian_name: student.guardian_name || "",
      guardian_phone: student.guardian_phone || "",
      guardian_email: student.guardian_email || student.parent_email || "",
      status: student.status || DEFAULT_STATUS,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveStudent() {
    if (!canManage) {
      showToast("error", "لا تملك صلاحية إدارة الطلاب.");
      return;
    }

    if (!currentSchool?.id) {
      showToast("error", "لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      return;
    }

    if (!form.full_name.trim()) {
      showToast("error", "يرجى إدخال اسم الطالب.");
      return;
    }

    setSaving(true);

    const payload = {
      school_id: currentSchool.id,
      full_name: form.full_name.trim(),
      national_id: form.national_id.trim() || null,
      student_number: form.student_number.trim() || null,
      grade_level: form.grade_level.trim() || null,
      classroom: form.classroom.trim() || null,
      section: form.section.trim() || null,
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: form.guardian_phone.trim() || null,
      guardian_email: form.guardian_email.trim() || null,
      parent_email: form.guardian_email.trim() || null,
      status: form.status.trim() || DEFAULT_STATUS,
    };

    const result = editingId
      ? await StudentsService.update(currentSchool.id, editingId, payload)
      : await StudentsService.create(payload);

    setSaving(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", editingId ? "تم تعديل بيانات الطالب." : "تمت إضافة الطالب.");
    closeForm();
    void fetchAllData();
  }

  async function deleteStudent(id: string) {
    if (!canManage || !currentSchool?.id) return;

    const confirmed = window.confirm("هل تريد حذف الطالب؟");
    if (!confirmed) return;

    const result = await StudentsService.remove(currentSchool.id, id);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    if (selectedStudent?.id === id) setSelectedStudent(null);

    showToast("success", "تم حذف الطالب.");
    void fetchAllData();
  }

  async function deleteSelectedStudents() {
    if (!canManage || !currentSchool?.id || selectedIds.length === 0) return;

    const confirmed = window.confirm(`هل تريد حذف ${selectedIds.length} طالب؟`);
    if (!confirmed) return;

    const result = await StudentsService.removeMany(currentSchool.id, selectedIds);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", "تم حذف الطلاب المحددين.");
    setSelectedIds([]);
    setSelectedStudent(null);
    void fetchAllData();
  }

  async function updateSelectedStatus(newStatus: string) {
    if (!canManage || !currentSchool?.id || selectedIds.length === 0) return;

    const result = await StudentsService.updateStatus(currentSchool.id, selectedIds, newStatus);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", "تم تحديث حالة الطلاب المحددين.");
    setSelectedIds([]);
    void fetchAllData();
  }

  async function markAttendance(studentId: string, status: AttendanceStatus) {
    if (!canMarkAttendance) {
      showToast("error", "لا تملك صلاحية تسجيل الحضور.");
      return;
    }

    if (!currentSchool?.id) return;

    const result = await StudentsService.markAttendance({
      schoolId: currentSchool.id,
      studentId,
      date: today,
      status,
    });

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setAttendanceMenuId(null);
    showToast("success", "تم تسجيل الحضور.");
    void fetchAllData();
  }

  function todayAttendance(studentId: string) {
    return attendance.find(
      (item) => item.student_id === studentId && item.attendance_date === today,
    )?.status;
  }

  function getStudentAverage(studentId: string, studentGradeLevel?: string | null) {
    const studentScores = scores.filter((score) => score.student_id === studentId);
    if (studentScores.length === 0) return 0;

    const subjectsForLevel = gradeSubjects.filter(
      (subject) => !studentGradeLevel || subject.grade_level === studentGradeLevel,
    );

    const subjectIds = new Set(subjectsForLevel.map((subject) => subject.id));
    const grouped: Record<string, number> = {};

    studentScores.forEach((score) => {
      if (subjectIds.size > 0 && !subjectIds.has(score.school_subject_id)) return;
      grouped[score.school_subject_id] = (grouped[score.school_subject_id] || 0) + Number(score.score || 0);
    });

    const subjectTotals = Object.entries(grouped)
      .map(([subjectId, total]) => {
        const subject = gradeSubjects.find((item) => item.id === subjectId);
        const max = Number(subject?.total_score || 100);
        return max > 0 ? Math.round((total / max) * 100) : 0;
      })
      .filter((value) => value > 0);

    if (subjectTotals.length === 0) return 0;

    return Math.round(subjectTotals.reduce((sum, value) => sum + value, 0) / subjectTotals.length);
  }

  function getStudentGradeStatus(studentId: string, gradeLevel?: string | null) {
    const average = getStudentAverage(studentId, gradeLevel);
    if (average >= 90) return "متفوق";
    if (average >= 60) return "مستقر";
    if (average > 0) return "يحتاج متابعة";
    return "لا توجد درجات";
  }

  const gradeLevels = useMemo(() => uniqueValues(students.map((student) => student.grade_level)), [students]);
  const classrooms = useMemo(() => uniqueValues(students.map((student) => student.classroom)), [students]);
  const statuses = useMemo(() => uniqueValues(students.map((student) => student.status)), [students]);

  const repeatedAbsenceStudents = useMemo(() => {
    const absenceMap: Record<string, number> = {};

    attendance.forEach((item) => {
      if (isAbsent(item.status)) {
        absenceMap[item.student_id] = (absenceMap[item.student_id] || 0) + 1;
      }
    });

    return students
      .map((student) => ({ ...student, absenceCount: absenceMap[student.id] || 0 }))
      .filter((student) => student.absenceCount >= 3)
      .sort((a, b) => b.absenceCount - a.absenceCount);
  }, [students, attendance]);

  const studentsWithGrades = useMemo<StudentWithAverage[]>(() => {
    return students.map((student) => {
      const average = getStudentAverage(student.id, student.grade_level);
      const absenceCount =
        repeatedAbsenceStudents.find((item) => item.id === student.id)?.absenceCount || 0;

      return {
        ...student,
        average,
        hasGrades: average > 0,
        absenceCount,
        todayStatus: todayAttendance(student.id),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, scores, gradeSubjects, attendance, repeatedAbsenceStudents]);

  const filteredStudents = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return studentsWithGrades.filter((student) => {
      const text = [
        student.full_name,
        student.student_number,
        student.grade_level,
        student.classroom,
        student.section,
        student.national_id,
        student.guardian_name,
        student.guardian_phone,
        student.guardian_email,
        student.parent_email,
        student.status,
      ]
        .join(" ")
        .toLowerCase();

      const matchQuick =
        quickFilter === "all" ||
        (quickFilter === "present" && isPresent(student.todayStatus)) ||
        (quickFilter === "absent" && isAbsent(student.todayStatus)) ||
        (quickFilter === "late" && isLate(student.todayStatus)) ||
        (quickFilter === "excellent" && student.average >= 90) ||
        (quickFilter === "weak" && student.average > 0 && student.average < 60) ||
        (quickFilter === "risk" && student.absenceCount >= 3);

      return (
        text.includes(keyword) &&
        matchQuick &&
        (gradeFilter === "all" || student.grade_level === gradeFilter) &&
        (classroomFilter === "all" || student.classroom === classroomFilter) &&
        (statusFilter === "all" || student.status === statusFilter)
      );
    });
  }, [studentsWithGrades, search, gradeFilter, classroomFilter, statusFilter, quickFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const pagedStudents = filteredStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const todayRecords = useMemo(
    () => attendance.filter((item) => item.attendance_date === today),
    [attendance, today],
  );

  const presentToday = todayRecords.filter((item) => isPresent(item.status)).length;
  const absentToday = todayRecords.filter((item) => isAbsent(item.status)).length;
  const lateToday = todayRecords.filter((item) => isLate(item.status)).length;
  const clinicToday = todayRecords.filter((item) => isClinic(item.status)).length;

  const attendanceRate = todayRecords.length > 0 ? Math.round((presentToday / todayRecords.length) * 100) : 0;

  const excellentStudents = studentsWithGrades.filter((student) => student.hasGrades && student.average >= 90);
  const weakStudents = studentsWithGrades.filter((student) => student.hasGrades && student.average < 60);
  const gradedStudents = studentsWithGrades.filter((student) => student.hasGrades);

  const averageGrade =
    gradedStudents.length > 0
      ? Math.round(gradedStudents.reduce((sum, student) => sum + student.average, 0) / gradedStudents.length)
      : 0;

  const allPageSelected =
    pagedStudents.length > 0 && pagedStudents.every((student) => selectedIds.includes(student.id));

  function toggleSelectStudent(id: string) {
    setSelectedIds((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    );
  }

  function toggleSelectPage() {
    const pageIds = pagedStudents.map((student) => student.id);
    setSelectedIds((previous) =>
      allPageSelected
        ? previous.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...previous, ...pageIds])),
    );
  }

  const selectedAttendance = selectedStudent
    ? attendance.filter((item) => item.student_id === selectedStudent.id)
    : [];

  const selectedAverage = selectedStudent ? getStudentAverage(selectedStudent.id, selectedStudent.grade_level) : 0;
  const selectedAbsentCount = selectedAttendance.filter((item) => isAbsent(item.status)).length;
  const selectedLateCount = selectedAttendance.filter((item) => isLate(item.status)).length;
  const selectedPresentCount = selectedAttendance.filter((item) => isPresent(item.status)).length;

  const selectedRisk =
    selectedAbsentCount >= 5 || (selectedAverage > 0 && selectedAverage < 60)
      ? "يحتاج متابعة"
      : selectedAbsentCount >= 3 || (selectedAverage > 0 && selectedAverage < 75)
        ? "متابعة خفيفة"
        : "مستقر";

  function getExportRows(source: StudentWithAverage[] = filteredStudents) {
    return source.map((student) => [
      student.student_number || "-",
      student.national_id || "-",
      student.full_name || "-",
      student.grade_level || "-",
      student.classroom || "-",
      student.section || "-",
      student.guardian_name || "-",
      student.guardian_phone || "-",
      student.guardian_email || student.parent_email || "-",
      getStatusLabel(student.todayStatus),
      student.average > 0 ? `${student.average}%` : "-",
      getStudentGradeStatus(student.id, student.grade_level),
      student.status || DEFAULT_STATUS,
    ]);
  }

  async function exportStudentsExcel(source: StudentWithAverage[] = filteredStudents) {
    await exportTableToExcel({
      title: "تقرير الطلاب",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "قائمة الطلاب مع الحضور والمؤشرات الدراسية",
      headers: getExportHeaders(),
      rows: getExportRows(source),
      fileName: `students-${today}.xlsx`,
    });

    showToast("success", "تم تصدير الطلاب Excel.");
  }

  function exportStudentsPDF(source: StudentWithAverage[] = filteredStudents) {
    exportTableToPDF({
      title: "تقرير الطلاب",
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "قائمة الطلاب مع الحضور والمؤشرات الدراسية",
      headers: getExportHeaders(),
      rows: getExportRows(source),
      fileName: `students-${today}.pdf`,
    });

    showToast("success", "تم تجهيز PDF للطلاب.");
  }

  async function exportSelectedExcel() {
    const selected = filteredStudents.filter((student) => selectedIds.includes(student.id));
    await exportStudentsExcel(selected);
  }

  function exportSelectedPDF() {
    const selected = filteredStudents.filter((student) => selectedIds.includes(student.id));
    exportStudentsPDF(selected);
  }

  if (!canView) {
    return (
      <AuthGuard>
        <SummaryCard
          title="لا تملك صلاحية الوصول إلى إدارة الطلاب"
          description="هذه الصفحة مخصصة للطاقم المدرسي حسب الصلاحيات."
          tone="gold"
          icon={<Users size={22} />}
        />
      </AuthGuard>
    );
  }

  if (schoolLoading) {
    return (
      <AuthGuard>
        <PageLoader text="جاري تحميل بيانات المدرسة..." />
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
      <main className="space-y-5" dir="rtl">
        {toast && <ToastBox toast={toast} />}

        <PageHeader
          variant="hero"
          title="إدارة الطلاب"
          description={`${currentSchool.school_name} — إدارة بيانات الطلاب، متابعة حضور اليوم، مؤشرات الدرجات، والتنبيهات الذكية للغياب والتعثر.`}
          badge="منصة المدرسة الذكية"
          icon={<Users size={18} />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "إدارة الطلاب" },
          ]}
          meta={[
            { label: "المدرسة", value: currentSchool.school_name },
            { label: "تاريخ اليوم", value: today },
            { label: "الطلاب الظاهرون", value: filteredStudents.length },
            { label: "المحددون", value: selectedIds.length },
          ]}
          stats={[
            { label: "إجمالي الطلاب", value: students.length, icon: <Users size={20} />, tone: "blue" },
            { label: "نسبة الحضور", value: `${attendanceRate}%`, icon: <ClipboardCheck size={20} />, tone: attendanceRate >= 85 ? "green" : attendanceRate >= 60 ? "gold" : "red" },
            { label: "متوسط المدرسة", value: `${averageGrade}%`, icon: <BarChart3 size={20} />, tone: averageGrade >= 85 ? "green" : averageGrade >= 60 ? "gold" : "red" },
            { label: "غياب متكرر", value: repeatedAbsenceStudents.length, icon: <AlertTriangle size={20} />, tone: repeatedAbsenceStudents.length > 0 ? "red" : "green" },
          ]}
          actions={
            <>
              {canManage && (
                <SecondaryButton
                  icon={<Plus size={17} />}
                  onClick={openAddForm}
                  tone="warning"
                >
                  إضافة طالب
                </SecondaryButton>
              )}

              <SecondaryButton
                icon={<Download size={17} />}
                onClick={() => void exportStudentsExcel()}
              >
                Excel
              </SecondaryButton>

              <PrimaryButton
                icon={<FileText size={17} />}
                onClick={() => exportStudentsPDF()}
              >
                PDF
              </PrimaryButton>

              <SecondaryButton
                icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw size={17} />}
                onClick={() => void fetchAllData()}
                disabled={loading}
                tone="dark"
              >
                تحديث
              </SecondaryButton>

              <SecondaryButton
                icon={<Printer size={17} />}
                onClick={() => window.print()}
              >
                طباعة
              </SecondaryButton>
            </>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <ExecutiveCard title="إجمالي الطلاب" value={students.length} subtitle={`${gradeLevels.length} مرحلة · ${classrooms.length} فصل`} icon={<Users size={22} />} tone="blue" progress={students.length > 0 ? 100 : 0} />
          <ExecutiveCard title="نسبة الحضور" value={`${attendanceRate}%`} subtitle={`${presentToday} حاضر · ${absentToday} غائب · ${lateToday} متأخر`} icon={<ClipboardCheck size={22} />} tone={attendanceRate >= 85 ? "green" : attendanceRate >= 60 ? "gold" : "red"} progress={attendanceRate} />
          <ExecutiveCard title="متوسط المدرسة" value={`${averageGrade}%`} subtitle={`${gradedStudents.length} طالب لديهم درجات`} icon={<BarChart3 size={22} />} tone={averageGrade >= 85 ? "green" : averageGrade >= 60 ? "gold" : "red"} progress={averageGrade} />
          <ExecutiveCard title="المتفوقون" value={excellentStudents.length} subtitle="متوسط 90% فأعلى" icon={<ShieldCheck size={22} />} tone="green" progress={students.length ? percentage(excellentStudents.length, students.length) : 0} />
          <ExecutiveCard title="يحتاجون متابعة" value={weakStudents.length} subtitle="متوسط أقل من 60%" icon={<AlertTriangle size={22} />} tone={weakStudents.length > 0 ? "red" : "green"} progress={students.length ? percentage(weakStudents.length, students.length) : 0} />
          <ExecutiveCard title="عيادة اليوم" value={clinicToday} subtitle="تحويلات صحية اليوم" icon={<Clock size={22} />} tone={clinicToday > 0 ? "gold" : "green"} progress={todayRecords.length ? percentage(clinicToday, todayRecords.length) : 0} />
        </section>

        <SummaryCard
          title="الملخص التنفيذي للطلاب"
          description="قراءة سريعة للمجتمع الطلابي، حضور اليوم، الأداء الدراسي، وحالات المتابعة."
          tone={repeatedAbsenceStudents.length > 0 || weakStudents.length > 0 ? "gold" : "green"}
          items={[
            { label: "إجمالي الطلاب", value: students.length },
            { label: "الطلاب الظاهرون", value: filteredStudents.length },
            { label: "حضور اليوم", value: `${attendanceRate}%` },
            { label: "متوسط المدرسة", value: `${averageGrade}%` },
            { label: "متعثرون", value: weakStudents.length },
            { label: "غياب متكرر", value: repeatedAbsenceStudents.length },
          ]}
          footer="تعتمد المؤشرات على الحضور والدرجات المسجلة في المنصة، وتزداد دقتها مع اكتمال إدخال البيانات."
        />

        {showForm && (
          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm print:hidden">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-[#15445A]">
                  {editingId ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  أدخل بيانات الطالب الأساسية وبيانات ولي الأمر ثم احفظ التغييرات.
                </p>
              </div>

              <SecondaryButton onClick={closeForm}>
                إغلاق
              </SecondaryButton>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Input placeholder="اسم الطالب" value={form.full_name} onChange={(value) => updateForm("full_name", value)} />
              <Input placeholder="رقم الطالب" value={form.student_number} onChange={(value) => updateForm("student_number", value)} />
              <Input placeholder="رقم الهوية" value={form.national_id} onChange={(value) => updateForm("national_id", value)} />
              <Input placeholder="المرحلة" value={form.grade_level} onChange={(value) => updateForm("grade_level", value)} />
              <Input placeholder="الفصل" value={form.classroom} onChange={(value) => updateForm("classroom", value)} />
              <Input placeholder="الشعبة" value={form.section} onChange={(value) => updateForm("section", value)} />
              <Input placeholder="ولي الأمر" value={form.guardian_name} onChange={(value) => updateForm("guardian_name", value)} />
              <Input placeholder="جوال ولي الأمر" value={form.guardian_phone} onChange={(value) => updateForm("guardian_phone", value)} />
              <Input placeholder="بريد ولي الأمر" value={form.guardian_email} onChange={(value) => updateForm("guardian_email", value)} />

              <select
                value={form.status}
                onChange={(event) => updateForm("status", event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
              >
                {STUDENT_STATUSES.map((studentStatus) => (
                  <option key={studentStatus} value={studentStatus}>
                    {studentStatus}
                  </option>
                ))}
              </select>
            </div>

            <PrimaryButton
              className="mt-5"
              icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save size={16} /> : <Plus size={16} />}
              onClick={() => void saveStudent()}
              disabled={saving}
            >
              {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديل" : "إضافة الطالب"}
            </PrimaryButton>
          </section>
        )}

        {repeatedAbsenceStudents.length > 0 && (
          <section className="rounded-[28px] border border-red-100 bg-red-50 p-5">
            <div className="mb-5 flex items-center gap-2">
              <AlertTriangle className="text-red-700" size={22} />
              <h2 className="text-xl font-black text-red-800">طلاب يحتاجون متابعة بسبب الغياب</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {repeatedAbsenceStudents.slice(0, 8).map((student) => (
                <Link key={student.id} href={`/students/${student.id}`} className="rounded-2xl bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                  <p className="font-black text-slate-900">{student.full_name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {student.grade_level || "-"} - {student.classroom || "-"}
                  </p>
                  <p className="mt-2 font-bold text-red-600">{student.absenceCount} غياب</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-5 flex flex-col gap-4 print:hidden">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-[#15445A]">قائمة الطلاب</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    عرض {pagedStudents.length} من {filteredStudents.length} طالب حسب الفلاتر الحالية.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-black ${viewMode === "table" ? "bg-[#15445A] text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    <List size={16} />
                    جدول
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={`inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-black ${viewMode === "cards" ? "bg-[#15445A] text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    <Grid2X2 size={16} />
                    بطاقات
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <QuickFilter label="الكل" value="all" active={quickFilter} onClick={setQuickFilter} />
                <QuickFilter label="حاضر اليوم" value="present" active={quickFilter} onClick={setQuickFilter} />
                <QuickFilter label="غائب اليوم" value="absent" active={quickFilter} onClick={setQuickFilter} />
                <QuickFilter label="متأخر" value="late" active={quickFilter} onClick={setQuickFilter} />
                <QuickFilter label="متفوقون" value="excellent" active={quickFilter} onClick={setQuickFilter} />
                <QuickFilter label="متعثرون" value="weak" active={quickFilter} onClick={setQuickFilter} />
                <QuickFilter label="غياب متكرر" value="risk" active={quickFilter} onClick={setQuickFilter} />
              </div>

              <PageToolbar
                search={{
                  value: search,
                  onChange: setSearch,
                  placeholder: "ابحث عن طالب بالاسم أو الرقم أو ولي الأمر...",
                }}
                filters={
                  <>
                    <ToolbarSelect value={gradeFilter} onChange={setGradeFilter}>
                      <option value="all">كل المراحل</option>
                      {gradeLevels.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </ToolbarSelect>

                    <ToolbarSelect value={classroomFilter} onChange={setClassroomFilter}>
                      <option value="all">كل الفصول</option>
                      {classrooms.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </ToolbarSelect>

                    <ToolbarSelect value={statusFilter} onChange={setStatusFilter}>
                      <option value="all">كل الحالات</option>
                      {statuses.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </ToolbarSelect>
                  </>
                }
                onRefresh={() => void fetchAllData()}
                onExportExcel={() => void exportStudentsExcel()}
                onExportPDF={() => exportStudentsPDF()}
                onPrint={() => window.print()}
              />

              {selectedIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C1B489]/40 bg-[#C1B489]/20 p-3">
                  <p className="text-sm font-black text-[#15445A]">تم تحديد {selectedIds.length} طالب</p>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void exportSelectedExcel()} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700">
                      Excel المحدد
                    </button>

                    <button type="button" onClick={exportSelectedPDF} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700">
                      PDF المحدد
                    </button>

                    {canManage && (
                      <>
                        <button type="button" onClick={() => void updateSelectedStatus(DEFAULT_STATUS)} className="rounded-xl bg-[#07A869] px-3 py-2 text-xs font-black text-white">
                          جعلهم نشطين
                        </button>

                        <button type="button" onClick={() => void updateSelectedStatus("غير نشط")} className="rounded-xl bg-[#C1B489] px-3 py-2 text-xs font-black text-[#15445A]">
                          جعلهم غير نشطين
                        </button>

                        <button type="button" onClick={() => void deleteSelectedStudents()} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white">
                          حذف المحدد
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <PageLoader text="جاري تحميل الطلاب..." />
            ) : filteredStudents.length === 0 ? (
              <EmptyState icon={<Search size={30} />} title="لا توجد نتائج" description="لا يوجد طلاب مطابقون للبحث أو الفلاتر الحالية." />
            ) : viewMode === "cards" ? (
              <div className="grid gap-3 md:grid-cols-2">
                {pagedStudents.map((student) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    canManage={canManage}
                    canMarkAttendance={canMarkAttendance}
                    attendanceMenuId={attendanceMenuId}
                    setAttendanceMenuId={setAttendanceMenuId}
                    onSelect={setSelectedStudent}
                    onEdit={startEdit}
                    onDelete={deleteStudent}
                    onMarkAttendance={markAttendance}
                  />
                ))}
              </div>
            ) : (
              <StudentsTable
                pagedStudents={pagedStudents}
                allPageSelected={allPageSelected}
                selectedIds={selectedIds}
                canManage={canManage}
                canMarkAttendance={canMarkAttendance}
                attendanceMenuId={attendanceMenuId}
                setAttendanceMenuId={setAttendanceMenuId}
                toggleSelectPage={toggleSelectPage}
                toggleSelectStudent={toggleSelectStudent}
                setSelectedStudent={setSelectedStudent}
                startEdit={startEdit}
                deleteStudent={deleteStudent}
                markAttendance={markAttendance}
                getStudentGradeStatus={getStudentGradeStatus}
              />
            )}

            {!loading && filteredStudents.length > 0 && (
              <div className="mt-5 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  عرض {pagedStudents.length} من {filteredStudents.length}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page === 1}
                    className="rounded-xl border p-2 disabled:opacity-40"
                  >
                    <ChevronRight size={18} />
                  </button>

                  <span className="text-sm font-bold text-slate-700">
                    {page} / {totalPages}
                  </span>

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
            )}
          </section>

          <StudentSideCard
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
            selectedAverage={selectedAverage}
            selectedRisk={selectedRisk}
            selectedPresentCount={selectedPresentCount}
            selectedAbsentCount={selectedAbsentCount}
            selectedLateCount={selectedLateCount}
          />
        </section>
      </main>
    </AuthGuard>
  );
}

function StudentsTable({
  pagedStudents,
  allPageSelected,
  selectedIds,
  canManage,
  canMarkAttendance,
  attendanceMenuId,
  setAttendanceMenuId,
  toggleSelectPage,
  toggleSelectStudent,
  setSelectedStudent,
  startEdit,
  deleteStudent,
  markAttendance,
  getStudentGradeStatus,
}: {
  pagedStudents: StudentWithAverage[];
  allPageSelected: boolean;
  selectedIds: string[];
  canManage: boolean;
  canMarkAttendance: boolean;
  attendanceMenuId: string | null;
  setAttendanceMenuId: (id: string | null) => void;
  toggleSelectPage: () => void;
  toggleSelectStudent: (id: string) => void;
  setSelectedStudent: (student: StudentWithAverage) => void;
  startEdit: (student: Student) => void;
  deleteStudent: (id: string) => Promise<void>;
  markAttendance: (studentId: string, status: AttendanceStatus) => Promise<void>;
  getStudentGradeStatus: (studentId: string, gradeLevel?: string | null) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1280px]">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-right text-sm text-slate-500">
            <th className="rounded-r-2xl px-4 py-3 print:hidden">
              <input type="checkbox" checked={allPageSelected} onChange={toggleSelectPage} />
            </th>
            <th className="px-4 py-3">الطالب</th>
            <th className="px-4 py-3">رقم الطالب</th>
            <th className="px-4 py-3">الهوية</th>
            <th className="px-4 py-3">المرحلة</th>
            <th className="px-4 py-3">الفصل</th>
            <th className="px-4 py-3">ولي الأمر</th>
            <th className="px-4 py-3">حضور اليوم</th>
            <th className="px-4 py-3">متوسط الدرجات</th>
            <th className="px-4 py-3">المخاطر</th>
            <th className="px-4 py-3">الحالة</th>
            <th className="rounded-l-2xl px-4 py-3 print:hidden">الإجراءات</th>
          </tr>
        </thead>

        <tbody>
          {pagedStudents.map((student) => (
            <tr key={student.id} className="border-b border-slate-50 text-sm transition hover:bg-slate-50">
              <td className="px-4 py-3 print:hidden">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(student.id)}
                  onChange={() => toggleSelectStudent(student.id)}
                />
              </td>

              <td className="px-4 py-3 font-bold text-[#15445A]">{student.full_name}</td>
              <td className="px-4 py-3">{student.student_number || "-"}</td>
              <td className="px-4 py-3">{student.national_id || "-"}</td>
              <td className="px-4 py-3">{student.grade_level || "-"}</td>
              <td className="px-4 py-3">{student.classroom || "-"}{student.section ? ` - ${student.section}` : ""}</td>

              <td className="px-4 py-3">
                <p>{student.guardian_name || "-"}</p>
                <p className="mt-1 text-xs text-slate-400">{student.guardian_phone || "-"}</p>
                <p className="mt-1 text-xs text-slate-400">{student.guardian_email || student.parent_email || "-"}</p>
              </td>

              <td className="px-4 py-3">
                <AttendanceStatusBadge status={student.todayStatus} />
              </td>

              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${gradeTone(student.average)}`}>
                    {student.average > 0 ? `${student.average}%` : "لا توجد درجات"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {getStudentGradeStatus(student.id, student.grade_level)}
                  </span>
                </div>
              </td>

              <td className="px-4 py-3">
                <span className={`rounded-full px-3 py-1 text-xs font-black ${riskTone(student)}`}>
                  {riskLabel(student)}
                </span>
              </td>

              <td className="px-4 py-3">
                <UiStatusBadge tone="default">
                  {student.status || DEFAULT_STATUS}
                </UiStatusBadge>
              </td>

              <td className="px-4 py-3 print:hidden">
                <StudentActions
                  student={student}
                  canManage={canManage}
                  canMarkAttendance={canMarkAttendance}
                  attendanceMenuId={attendanceMenuId}
                  setAttendanceMenuId={setAttendanceMenuId}
                  onSelect={setSelectedStudent}
                  onEdit={startEdit}
                  onDelete={deleteStudent}
                  onMarkAttendance={markAttendance}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentCard({
  student,
  canManage,
  canMarkAttendance,
  attendanceMenuId,
  setAttendanceMenuId,
  onSelect,
  onEdit,
  onDelete,
  onMarkAttendance,
}: {
  student: StudentWithAverage;
  canManage: boolean;
  canMarkAttendance: boolean;
  attendanceMenuId: string | null;
  setAttendanceMenuId: (id: string | null) => void;
  onSelect: (student: StudentWithAverage) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => Promise<void>;
  onMarkAttendance: (studentId: string, status: AttendanceStatus) => Promise<void>;
}) {
  return (
    <article className="rounded-[24px] border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#15445A]">{student.full_name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {student.grade_level || "-"} · {student.classroom || "-"}
            {student.section ? ` · ${student.section}` : ""}
          </p>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-black ${riskTone(student)}`}>
          {riskLabel(student)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MiniValue label="رقم الطالب" value={student.student_number || "-"} />
        <MiniValue label="حضور اليوم" value={getStatusLabel(student.todayStatus)} />
        <MiniValue label="المتوسط" value={student.average > 0 ? `${student.average}%` : "-"} />
        <MiniValue label="الغياب" value={student.absenceCount} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StudentActions
          student={student}
          canManage={canManage}
          canMarkAttendance={canMarkAttendance}
          attendanceMenuId={attendanceMenuId}
          setAttendanceMenuId={setAttendanceMenuId}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onMarkAttendance={onMarkAttendance}
        />
      </div>
    </article>
  );
}

function StudentActions({
  student,
  canManage,
  canMarkAttendance,
  attendanceMenuId,
  setAttendanceMenuId,
  onSelect,
  onEdit,
  onDelete,
  onMarkAttendance,
}: {
  student: StudentWithAverage;
  canManage: boolean;
  canMarkAttendance: boolean;
  attendanceMenuId: string | null;
  setAttendanceMenuId: (id: string | null) => void;
  onSelect: (student: StudentWithAverage) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => Promise<void>;
  onMarkAttendance: (studentId: string, status: AttendanceStatus) => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onSelect(student)}
        className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
        title="عرض مختصر"
      >
        <Eye size={16} />
      </button>

      <Link
        href={`/students/${student.id}`}
        className="rounded-xl bg-[#07A869]/10 p-2 text-[#07A869] hover:bg-[#07A869]/15"
        title="فتح ملف الطالب"
      >
        <FileText size={16} />
      </Link>

      {canManage && (
        <button
          type="button"
          onClick={() => onEdit(student)}
          className="rounded-xl bg-[#3D7EB9]/10 p-2 text-[#3D7EB9] hover:bg-[#3D7EB9]/15"
          title="تعديل"
        >
          <Pencil size={16} />
        </button>
      )}

      {canMarkAttendance && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setAttendanceMenuId(attendanceMenuId === student.id ? null : student.id)}
            className="rounded-xl bg-[#15445A] px-3 py-2 text-xs font-black text-white"
          >
            الحضور
          </button>

          {attendanceMenuId === student.id && (
            <div className="absolute left-0 top-10 z-20 w-44 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
              <AttendanceAction label="حاضر" color="green" onClick={() => onMarkAttendance(student.id, "حاضر")} />
              <AttendanceAction label="غائب" color="red" onClick={() => onMarkAttendance(student.id, "غائب")} />
              <AttendanceAction label="متأخر" color="amber" onClick={() => onMarkAttendance(student.id, "متأخر")} />
              <AttendanceAction label="عيادة" color="blue" onClick={() => onMarkAttendance(student.id, "عيادة")} />
            </div>
          )}
        </div>
      )}

      {canManage && (
        <button
          type="button"
          onClick={() => void onDelete(student.id)}
          className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100"
          title="حذف"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl print:hidden ${
        toast.type === "success" ? "bg-[#07A869]" : "bg-red-600"
      }`}
    >
      <span>{toast.message}</span>
    </div>
  );
}

function Input({
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-[#0DA9A6] focus:bg-white"
    />
  );
}

function QuickFilter({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: string;
  onClick: (value: string) => void;
}) {
  const isActive = active === value;

  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
        isActive ? "bg-[#15445A] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function AttendanceStatusBadge({ status }: { status?: string | null }) {
  const label = getStatusLabel(status);

  const style = isPresent(status)
    ? "bg-[#07A869]/10 text-[#07A869]"
    : isAbsent(status)
      ? "bg-red-50 text-red-700"
      : isLate(status)
        ? "bg-[#C1B489]/20 text-[#15445A]"
        : isClinic(status)
          ? "bg-[#3D7EB9]/10 text-[#3D7EB9]"
          : "bg-slate-100 text-slate-500";

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>{label}</span>;
}

function AttendanceAction({
  label,
  color,
  onClick,
}: {
  label: string;
  color: "green" | "red" | "amber" | "blue";
  onClick: () => void;
}) {
  const colors = {
    green: "text-[#07A869] hover:bg-[#07A869]/10",
    red: "text-red-700 hover:bg-red-50",
    amber: "text-[#15445A] hover:bg-[#C1B489]/20",
    blue: "text-[#3D7EB9] hover:bg-[#3D7EB9]/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-xl px-3 py-2 text-right text-sm font-black ${colors[color]}`}
    >
      {label}
    </button>
  );
}

function StudentSideCard({
  selectedStudent,
  setSelectedStudent,
  selectedAverage,
  selectedRisk,
  selectedPresentCount,
  selectedAbsentCount,
  selectedLateCount,
}: {
  selectedStudent: StudentWithAverage | null;
  setSelectedStudent: (student: StudentWithAverage | null) => void;
  selectedAverage: number;
  selectedRisk: string;
  selectedPresentCount: number;
  selectedAbsentCount: number;
  selectedLateCount: number;
}) {
  if (!selectedStudent) {
    return (
      <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="flex min-h-[350px] items-center justify-center rounded-3xl bg-slate-50 text-center">
          <div>
            <Users size={40} className="mx-auto text-[#C1B489]" />
            <h3 className="mt-4 text-xl font-black text-[#15445A]">اختر طالبًا</h3>
            <p className="mt-2 text-sm text-slate-500">اضغط على أيقونة العين لعرض الملف المختصر</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#15445A]">الملف المختصر</h2>

        <button
          type="button"
          onClick={() => setSelectedStudent(null)}
          className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
        >
          <X size={18} />
        </button>
      </div>

      <div className="rounded-[28px] bg-[#15445A] p-5 text-white">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C1B489] text-[#15445A]">
            <UserRound size={28} />
          </div>

          <div>
            <h3 className="text-2xl font-black text-[#C1B489]">{selectedStudent.full_name}</h3>
            <p className="text-sm text-slate-300">
              {selectedStudent.grade_level || "-"} - {selectedStudent.classroom || "-"}
              {selectedStudent.section ? ` - ${selectedStudent.section}` : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoMini title="رقم الطالب" value={selectedStudent.student_number || "-"} />
          <InfoMini title="رقم الهوية" value={selectedStudent.national_id || "-"} />
          <InfoMini title="ولي الأمر" value={selectedStudent.guardian_name || "-"} />
          <InfoMini title="متوسط الدرجات" value={selectedAverage ? `${selectedAverage}%` : "-"} />
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-500">مؤشر المتابعة</p>
        <h3 className="mt-2 text-2xl font-black text-[#15445A]">{selectedRisk}</h3>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <DetailStat title="متوسط" value={selectedAverage ? `${selectedAverage}%` : "-"} icon={<BarChart3 size={18} />} color="blue" />
        <DetailStat title="حضور" value={selectedPresentCount} icon={<CheckCircle2 size={18} />} color="green" />
        <DetailStat title="غياب" value={selectedAbsentCount} icon={<ClipboardCheck size={18} />} color="red" />
        <DetailStat title="تأخر" value={selectedLateCount} icon={<Clock size={18} />} color="gold" />
      </div>

      <Link
        href={`/students/${selectedStudent.id}`}
        className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-[#C1B489] px-5 py-3 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <FileText size={17} />
        فتح ملف الطالب
      </Link>
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

function DetailStat({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: "blue" | "red" | "gold" | "green";
}) {
  const colors = {
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    red: "bg-red-50 text-red-700",
    gold: "bg-[#C1B489]/20 text-[#15445A]",
    green: "bg-[#07A869]/10 text-[#07A869]",
  };

  return (
    <div className={`rounded-2xl p-4 ${colors[color]}`}>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p className="text-xs font-bold">{title}</p>
      </div>
      <h3 className="text-2xl font-black">{value}</h3>
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-2">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 font-black text-[#15445A]">{value}</p>
    </div>
  );
}


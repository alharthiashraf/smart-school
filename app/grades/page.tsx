"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  History,
  ListChecks,
  Lock,
  Printer,
  RefreshCcw,
  Save,
  ShieldCheck,
  Upload,
  UsersRound,
  XCircle,
  GraduationCap,
} from "lucide-react";
import * as XLSX from "xlsx";

import AuthGuard from "@/components/auth/AuthGuard";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExportButton from "@/components/ui/buttons/ExportButton";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import Section from "@/components/ui/page/PageSection";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import EmptyState from "@/components/ui/empty-state/EmptyState";
import ErrorState from "@/components/ui/feedback/ErrorState";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import PageLoader from "@/components/ui/loading/PageLoader";
import { useSchool } from "@/contexts/SchoolContext";
import {
  GradesService,
  type ConductAction,
  type ConductEvent,
  type ConductScore,
  type ConductScoreType,
  type GradeBook,
  type GradeBookStatus,
  type GradeComponent,
  type GradeEntry,
  type GradeValueMap,
  type StudentForGrades,
  type TeacherSubjectForGrades,
} from "@/services/grades.service";
import { buildGradeAnalytics } from "@/services/gradingAnalytics";
import { GradingExport } from "@/services/gradingExport";
import { normalizeImportedRows } from "@/services/gradingImport";
import { validateGradeEntry } from "@/services/gradingValidation";

const PAGE_SIZE = 10;

const DEFAULT_COMPONENTS: GradeComponent[] = [
  { key: "participation", name: "المشاركة", max_score: 10, is_required: false },
  { key: "homework", name: "الواجب", max_score: 10, is_required: false },
  { key: "quiz", name: "اختبار قصير", max_score: 20, is_required: false },
  { key: "midterm", name: "منتصف الفصل", max_score: 20, is_required: false },
  { key: "final", name: "الاختبار النهائي", max_score: 40, is_required: true },
];

const TABS = [
  { key: "subjects", label: "درجات المواد" },
  { key: "behavior", label: "السلوك" },
  { key: "attendance", label: "المواظبة" },
  { key: "analytics", label: "التحليلات" },
  { key: "history", label: "السجل" },
] as const;

type GradeTab = (typeof TABS)[number]["key"];

type EditableEntry = {
  student: StudentForGrades;
  entry?: GradeEntry;
  values: GradeValueMap;
  total_score: number;
  max_score: number;
  percentage: number;
  grade_label: string;
  result_status: string;
  dirty: boolean;
  issues: string[];
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type GradeInsightTone = "primary" | "green" | "gold" | "red" | "neutral";

type GradeSmartInsight = {
  title: string;
  description: string;
  tone: GradeInsightTone;
  icon: ReactNode;
};

type GradeQuality = {
  completionRate: number;
  missingRequired: number;
  ungradedStudents: number;
  dirtyEntries: number;
  approvedRate: number;
};

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function getTeacherName(item: TeacherSubjectForGrades | null) {
  return item?.teachers?.full_name || item?.teachers?.email || "معلم غير محدد";
}

function getSubjectName(item: TeacherSubjectForGrades | null) {
  return (
    item?.subjects?.subject_name ||
    item?.subjects?.subject_code ||
    "مادة غير محددة"
  );
}

function getClassroomName(item: TeacherSubjectForGrades | null) {
  return item?.classrooms?.classroom_name || "فصل غير محدد";
}

function teacherSubjectLabel(item: TeacherSubjectForGrades) {
  return `${getTeacherName(item)} · ${getSubjectName(item)} · ${getClassroomName(item)}`;
}

function studentName(student: StudentForGrades) {
  return (
    student.full_name ||
    student.national_id ||
    student.student_number ||
    "طالب بدون اسم"
  );
}

function statusLabel(status?: GradeBookStatus | null) {
  const labels: Record<GradeBookStatus, string> = {
    draft: "مسودة",
    submitted: "بانتظار الاعتماد",
    approved: "معتمد",
    locked: "مقفل",
    reopened: "معاد فتحه",
  };
  return status ? (labels[status] ?? "غير مهيأ") : "غير مهيأ";
}

function safeComponents(book: GradeBook | null) {
  return Array.isArray(book?.components) && book.components.length > 0
    ? book.components
    : DEFAULT_COMPONENTS;
}

function calculateGrade(components: GradeComponent[], values: GradeValueMap) {
  const maxTotal = components.reduce(
    (sum, component) => sum + Number(component.max_score || 0),
    0,
  );

  const total = components.reduce((sum, component) => {
    const value = values[component.key];
    return sum + (Number.isFinite(Number(value)) ? Number(value) : 0);
  }, 0);

  const percentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  let gradeLabel = "ضعيف";
  if (percentage >= 90) gradeLabel = "ممتاز";
  else if (percentage >= 80) gradeLabel = "جيد جدًا";
  else if (percentage >= 70) gradeLabel = "جيد";
  else if (percentage >= 60) gradeLabel = "مقبول";

  const hasMissingRequired = components.some(
    (component) =>
      component.is_required &&
      (values[component.key] === null || values[component.key] === undefined),
  );

  return {
    total: Math.round(total * 100) / 100,
    maxTotal,
    percentage,
    grade_label: gradeLabel,
    result_status: hasMissingRequired
      ? "غير مكتمل"
      : percentage >= 60
        ? "ناجح"
        : "راسب",
  };
}

function getIssues(components: GradeComponent[], values: GradeValueMap) {
  return validateGradeEntry({ values, components })
    .filter((issue) => issue.level === "error")
    .map((issue) => issue.message);
}

function conductLabel(score: number) {
  if (score >= 95) return "ممتاز";
  if (score >= 85) return "جيد جدًا";
  if (score >= 75) return "جيد";
  if (score >= 60) return "يحتاج متابعة";
  return "خطر";
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return fallback;
}

function insightTone(tone: GradeInsightTone) {
  const tones: Record<GradeInsightTone, string> = {
    primary:
      "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]",
    green:
      "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]",
    gold: "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]",
    red: "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]",
    neutral: "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
  };

  return tones[tone];
}

function progressTone(tone: GradeInsightTone) {
  const tones: Record<GradeInsightTone, string> = {
    primary: "bg-[var(--app-primary)]",
    green: "bg-[var(--app-success)]",
    gold: "bg-[var(--app-accent)]",
    red: "bg-[var(--app-danger)]",
    neutral: "bg-[var(--app-text-muted)]",
  };

  return tones[tone];
}

function buildStudentRecommendations(entry: EditableEntry) {
  const recommendations: string[] = [];

  if (entry.percentage < 60) {
    recommendations.push(
      "إعداد خطة علاجية قصيرة ومراجعة عناصر التقييم منخفضة الأداء.",
    );
  } else if (entry.percentage < 75) {
    recommendations.push(
      "متابعة الطالب أسبوعيًا ورفع مستوى المشاركة والواجبات.",
    );
  } else if (entry.percentage >= 90) {
    recommendations.push("ترشيح الطالب لبرامج الإثراء والتحفيز.");
  }

  if (entry.result_status === "غير مكتمل") {
    recommendations.push("استكمال عناصر التقييم الإلزامية قبل اعتماد الرصد.");
  }

  if (entry.issues.length > 0) {
    recommendations.push("مراجعة أخطاء التحقق الظاهرة في سجل الطالب.");
  }

  return recommendations.length
    ? recommendations
    : ["لا توجد توصيات حرجة حاليًا، استمر في المتابعة الدورية."];
}

export default function GradesPage() {
  const {
    currentSchool,
    currentRole,
    hasPermission,
    academicYear,
    semester,
    loading: schoolLoading,
  } = useSchool();

  const canManage =
    hasPermission("grades.manage") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin" ||
    currentRole === "teacher";

  const canView =
    hasPermission("grades.view") ||
    canManage ||
    currentRole === "vice_principal" ||
    currentRole === "administrative_staff" ||
    currentRole === "student_counselor";

  const canApprove =
    hasPermission("grades.manage") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin" ||
    currentRole === "vice_principal";

  const canLock =
    hasPermission("grades.manage") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin";

  const [activeTab, setActiveTab] = useState<GradeTab>("subjects");
  const [teacherSubjects, setTeacherSubjects] = useState<
    TeacherSubjectForGrades[]
  >([]);
  const [selectedTeacherSubjectId, setSelectedTeacherSubjectId] = useState("");
  const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
  const [students, setStudents] = useState<StudentForGrades[]>([]);
  const [entries, setEntries] = useState<EditableEntry[]>([]);
  const [conductScores, setConductScores] = useState<ConductScore[]>([]);
  const [conductEvents, setConductEvents] = useState<ConductEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<Toast | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<EditableEntry | null>(
    null,
  );

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedTeacherSubject = useMemo(
    () =>
      teacherSubjects.find((item) => item.id === selectedTeacherSubjectId) ||
      null,
    [teacherSubjects, selectedTeacherSubjectId],
  );

  const components = useMemo(() => safeComponents(gradeBook), [gradeBook]);
  const activeAcademicYear =
    gradeBook?.academic_year ||
    selectedTeacherSubject?.academic_year ||
    academicYear ||
    "1447";
  const activeSemester =
    gradeBook?.semester ||
    selectedTeacherSubject?.semester ||
    semester ||
    "الفصل الدراسي الأول";
  const isLocked =
    gradeBook?.status === "locked" || gradeBook?.status === "approved";
  const editEnabled = canManage && !!gradeBook && !isLocked;

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadTeacherSubjects = useCallback(async () => {
    if (!currentSchool?.id || !canView) {
      setTeacherSubjects([]);
      setSelectedTeacherSubjectId("");
      setLoading(false);
      return;
    }

    setLoading(true);

    const result = await GradesService.getTeacherSubjects({
      schoolId: currentSchool.id,
      academicYear,
      semester,
    });

    if (result.error) {
      showToast("error", result.error);
      setTeacherSubjects([]);
      setSelectedTeacherSubjectId("");
      setLoading(false);
      return;
    }

    const list = result.data ?? [];
    setTeacherSubjects(list);
    setSelectedTeacherSubjectId((current) => {
      if (current && list.some((item) => item.id === current)) return current;
      const preferred = list.find(
        (item) =>
          item.academic_year === academicYear && item.semester === semester,
      );
      return preferred?.id || list[0]?.id || "";
    });
    setLoading(false);
  }, [academicYear, canView, currentSchool?.id, semester, showToast]);

  const buildEntries = useCallback(
    (
      studentList: StudentForGrades[],
      book: GradeBook,
      savedEntries: GradeEntry[],
    ) => {
      const entryMap = new Map(
        savedEntries.map((entry) => [entry.student_id, entry]),
      );
      const bookComponents = safeComponents(book);

      return studentList.map((student) => {
        const entry = entryMap.get(student.id);
        const values: GradeValueMap = {};

        for (const component of bookComponents) {
          values[component.key] = entry?.values?.[component.key] ?? null;
        }

        const calculation = calculateGrade(bookComponents, values);

        return {
          student,
          entry,
          values,
          total_score: Number(entry?.total_score ?? calculation.total),
          max_score: Number(entry?.max_score ?? calculation.maxTotal),
          percentage: Number(entry?.percentage ?? calculation.percentage),
          grade_label: entry?.grade_label ?? calculation.grade_label,
          result_status: entry?.result_status ?? calculation.result_status,
          dirty: false,
          issues: getIssues(bookComponents, values),
        };
      });
    },
    [],
  );

  const loadGradeBook = useCallback(async () => {
    if (!currentSchool?.id || !selectedTeacherSubject) {
      setGradeBook(null);
      setStudents([]);
      setEntries([]);
      return;
    }

    setLoading(true);

    try {
      const year =
        selectedTeacherSubject.academic_year || academicYear || "1447";
      const sem =
        selectedTeacherSubject.semester || semester || "الفصل الدراسي الأول";

      const [
        studentsResult,
        bookResult,
        conductScoresResult,
        conductEventsResult,
      ] = await Promise.all([
        GradesService.getStudents({
          schoolId: currentSchool.id,
          classroomId: selectedTeacherSubject.classroom_id,
        }),
        GradesService.ensureGradeBook({
          school_id: currentSchool.id,
          teacher_subject_id: selectedTeacherSubject.id,
          teacher_id: selectedTeacherSubject.teacher_id,
          subject_id: selectedTeacherSubject.subject_id,
          classroom_id: selectedTeacherSubject.classroom_id,
          academic_year: year,
          semester: sem,
          components: DEFAULT_COMPONENTS,
        }),
        GradesService.getConductScores({
          schoolId: currentSchool.id,
          academicYear: year,
          semester: sem,
        }),
        GradesService.getConductEvents({
          schoolId: currentSchool.id,
          academicYear: year,
          semester: sem,
        }),
      ]);

      if (studentsResult.error) throw new Error(studentsResult.error);
      if (bookResult.error) throw new Error(bookResult.error);

      const studentList = studentsResult.data ?? [];
      const book = bookResult.data;

      if (!book) throw new Error("تعذر إنشاء أو تحميل سجل الدرجات.");

      const entriesResult = await GradesService.getEntries(book.id);
      if (entriesResult.error) throw new Error(entriesResult.error);

      setStudents(studentList);
      setGradeBook(book);
      setConductScores(conductScoresResult.data ?? []);
      setConductEvents(conductEventsResult.data ?? []);
      setEntries(buildEntries(studentList, book, entriesResult.data ?? []));
    } catch (error) {
      showToast("error", errorMessage(error, "تعذر تحميل سجل الدرجات."));
      setGradeBook(null);
      setStudents([]);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [
    academicYear,
    buildEntries,
    currentSchool?.id,
    selectedTeacherSubject,
    semester,
    showToast,
  ]);

  useEffect(() => {
    if (!schoolLoading) void loadTeacherSubjects();
  }, [schoolLoading, loadTeacherSubjects]);

  useEffect(() => {
    if (!schoolLoading && selectedTeacherSubjectId) void loadGradeBook();
  }, [schoolLoading, selectedTeacherSubjectId, loadGradeBook]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, statusFilter]);

  async function saveDirtyEntries(nextEntries = entries) {
    if (!gradeBook || !editEnabled) return;

    const dirtyRows = nextEntries.filter((entry) => entry.dirty);
    if (dirtyRows.length === 0) return;

    setSaving(true);

    const payload = dirtyRows.map((row) => ({
      grade_book_id: gradeBook.id,
      student_id: row.student.id,
      values: row.values,
      total_score: row.total_score,
      max_score: row.max_score,
      percentage: row.percentage,
      grade_label: row.grade_label,
      result_status: row.result_status,
      updated_at: new Date().toISOString(),
    }));

    const result = await GradesService.upsertEntries(payload);

    if (result.error) {
      showToast("error", result.error);
      setSaving(false);
      return;
    }

    setEntries((current) =>
      current.map((entry) => ({ ...entry, dirty: false })),
    );
    setLastSavedAt(new Date().toLocaleTimeString("ar-SA"));
    showToast("success", "تم حفظ الدرجات بنجاح.");
    setSaving(false);
  }

  function scheduleAutosave(nextEntries: EditableEntry[]) {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(
      () => void saveDirtyEntries(nextEntries),
      900,
    );
  }

  function updateScore(
    studentId: string,
    component: GradeComponent,
    rawValue: string,
  ) {
    if (!editEnabled) return;

    const nextEntries = entries.map((entry) => {
      if (entry.student.id !== studentId) return entry;

      const numericValue = rawValue === "" ? null : Number(rawValue);
      const cleanValue =
        numericValue === null || Number.isFinite(numericValue)
          ? numericValue
          : null;

      const values: GradeValueMap = {
        ...entry.values,
      };

      values[component.key] = cleanValue;

      const calculation = calculateGrade(components, values);

      return {
        ...entry,
        values,
        total_score: calculation.total,
        max_score: calculation.maxTotal,
        percentage: calculation.percentage,
        grade_label: calculation.grade_label,
        result_status: calculation.result_status,
        dirty: true,
        issues: getIssues(components, values),
      };
    });

    setEntries(nextEntries);
    scheduleAutosave(nextEntries);
  }

  async function updateGradeBookStatus(nextStatus: GradeBookStatus) {
    if (!gradeBook) return;

    setSaving(true);
    await saveDirtyEntries();
    const result = await GradesService.updateStatus({
      gradeBookId: gradeBook.id,
      status: nextStatus,
    });
    setSaving(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", "تم تحديث حالة الرصد.");
    await loadGradeBook();
  }

  async function importGrades(file: File | null) {
    if (!file || !editEnabled || !gradeBook) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      const importedRows = normalizeImportedRows({ rows: rawRows, components });

      const nextEntries = entries.map((entry) => {
        const match = importedRows.find((row) => {
          const name = normalizeText(row.student_name);
          const nationalId = normalizeText(row.national_id);
          return (
            (name && name === normalizeText(studentName(entry.student))) ||
            (nationalId &&
              nationalId === normalizeText(entry.student.national_id))
          );
        });

        if (!match) return entry;

        const values: GradeValueMap = {};

        for (const component of components) {
          const imported = match.values?.[component.key];

          values[component.key] =
            imported === undefined
              ? (entry.values[component.key] ?? null)
              : imported;
        }

        const calculation = calculateGrade(components, values);

        return {
          ...entry,
          values,
          total_score: calculation.total,
          max_score: calculation.maxTotal,
          percentage: calculation.percentage,
          grade_label: calculation.grade_label,
          result_status: calculation.result_status,
          dirty: true,
          issues: getIssues(components, values),
        };
      });

      setEntries(nextEntries);
      await saveDirtyEntries(nextEntries);
    } catch (error) {
      showToast("error", errorMessage(error, "تعذر استيراد ملف الدرجات."));
    }
  }

  const getConductScore = useCallback(
    (studentId: string, scoreType: ConductScoreType) =>
      conductScores.find(
        (score) =>
          score.student_id === studentId && score.score_type === scoreType,
      )?.score ?? 100,
    [conductScores],
  );

  async function updateConductScore(
    student: StudentForGrades,
    scoreType: ConductScoreType,
    action: ConductAction,
  ) {
    if (!currentSchool?.id || !canManage) return;

    const pointsText = window.prompt(
      action === "set" ? "اكتب الدرجة الجديدة" : "اكتب مقدار النقاط",
      "5",
    );
    if (!pointsText) return;

    const points = Number(pointsText);
    if (!Number.isFinite(points) || points < 0) {
      showToast("error", "قيمة النقاط غير صحيحة.");
      return;
    }

    const notes = window.prompt(
      "سبب العملية",
      action === "increase"
        ? "تعزيز"
        : action === "decrease"
          ? "ملاحظة"
          : "تعديل يدوي",
    );
    if (!notes?.trim()) {
      showToast("error", "سبب العملية مطلوب.");
      return;
    }

    const currentScore = getConductScore(student.id, scoreType);
    const nextScore =
      action === "set"
        ? clamp(points)
        : action === "increase"
          ? clamp(currentScore + points)
          : clamp(currentScore - points);

    const existing = conductScores.find(
      (score) =>
        score.student_id === student.id && score.score_type === scoreType,
    );

    setSaving(true);

    const scoreResult = await GradesService.upsertConductScore({
      id: existing?.id,
      school_id: currentSchool.id,
      student_id: student.id,
      score_type: scoreType,
      score: nextScore,
      max_score: 100,
      semester: activeSemester,
      academic_year: activeAcademicYear,
    });

    if (scoreResult.error || !scoreResult.data) {
      showToast(
        "error",
        scoreResult.error || "تعذر حفظ درجة السلوك أو المواظبة.",
      );
      setSaving(false);
      return;
    }

    const eventResult = await GradesService.createConductEvent({
      school_id: currentSchool.id,
      student_id: student.id,
      score_type: scoreType,
      event_type: action,
      points,
      notes,
      semester: activeSemester,
      academic_year: activeAcademicYear,
    });

    if (eventResult.error) {
      showToast("error", eventResult.error);
      setSaving(false);
      return;
    }

    const savedScore = scoreResult.data;
    setConductScores((current) => [
      savedScore,
      ...current.filter(
        (score) =>
          !(
            score.student_id === savedScore.student_id &&
            score.score_type === savedScore.score_type
          ),
      ),
    ]);
    if (eventResult.data)
      setConductEvents((current) => [eventResult.data!, ...current]);
    setLastSavedAt(new Date().toLocaleTimeString("ar-SA"));
    showToast("success", "تم حفظ العملية بنجاح.");
    setSaving(false);
  }

  const filteredEntries = useMemo(() => {
    const text = normalizeText(search);
    return entries.filter((entry) => {
      const matchesSearch =
        !text ||
        normalizeText(studentName(entry.student)).includes(text) ||
        normalizeText(entry.student.national_id).includes(text) ||
        normalizeText(entry.student.student_number).includes(text);
      const matchesStatus =
        statusFilter === "all" || entry.result_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [entries, search, statusFilter]);

  const analytics = useMemo(
    () =>
      buildGradeAnalytics(
        entries.map((entry) => ({
          student_id: entry.student.id,
          student_name: studentName(entry.student),
          total_score: entry.total_score,
          percentage: entry.percentage,
          result_status: entry.result_status,
          grade_label: entry.grade_label,
        })),
      ),
    [entries],
  );

  const quality = useMemo<GradeQuality>(() => {
    const total = Math.max(1, entries.length);
    const completed = entries.filter(
      (entry) =>
        entry.result_status !== "غير مكتمل" && entry.issues.length === 0,
    ).length;
    const ungradedStudents = entries.filter(
      (entry) =>
        entry.total_score === 0 &&
        Object.values(entry.values).every(
          (value) => value === null || value === undefined,
        ),
    ).length;
    const missingRequired = entries.filter(
      (entry) => entry.result_status === "غير مكتمل",
    ).length;
    const dirtyEntries = entries.filter((entry) => entry.dirty).length;
    const approvedRate =
      gradeBook?.status === "approved" || gradeBook?.status === "locked"
        ? 100
        : 0;

    return {
      completionRate: Math.round((completed / total) * 100),
      missingRequired,
      ungradedStudents,
      dirtyEntries,
      approvedRate,
    };
  }, [entries, gradeBook?.status]);

  const smartInsights = useMemo<GradeSmartInsight[]>(() => {
    const items: GradeSmartInsight[] = [];

    if (analytics.weak > 0) {
      items.push({
        title: "طلاب معرضون للتعثر",
        description: `يوجد ${analytics.weak} طالب في نطاق الخطر ويحتاجون إلى تدخل أكاديمي.`,
        tone: "red",
        icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
      });
    }

    if (quality.missingRequired > 0) {
      items.push({
        title: "رصد غير مكتمل",
        description: `${quality.missingRequired} طالب لديهم عناصر تقييم إلزامية غير مكتملة.`,
        tone: "gold",
        icon: <ListChecks className="h-5 w-5" aria-hidden="true" />,
      });
    }

    if (analytics.passRate < 70 && entries.length > 0) {
      items.push({
        title: "نسبة النجاح تحتاج متابعة",
        description: `نسبة النجاح الحالية ${Math.round(analytics.passRate)}% وهي أقل من المستوى المستهدف.`,
        tone: "primary",
        icon: <BarChart3 className="h-5 w-5" aria-hidden="true" />,
      });
    }

    if (quality.dirtyEntries > 0) {
      items.push({
        title: "تعديلات غير محفوظة",
        description: `يوجد ${quality.dirtyEntries} سجلًا بانتظار الحفظ أو الحفظ التلقائي.`,
        tone: "primary",
        icon: <Save className="h-5 w-5" aria-hidden="true" />,
      });
    }

    if (items.length === 0) {
      items.push({
        title: "الرصد مستقر",
        description: "لا توجد مؤشرات حرجة في الرصد الحالي.",
        tone: "green",
        icon: <CheckCircle2 className="h-5 w-5" aria-hidden="true" />,
      });
    }

    return items.slice(0, 4);
  }, [analytics.passRate, analytics.weak, entries.length, quality]);

  const behaviorRows = useMemo(
    () =>
      students.map((student) => {
        const score = getConductScore(student.id, "behavior");
        return {
          student,
          score,
          label: conductLabel(score),
          status: score >= 75 ? "مستقر" : "يحتاج متابعة",
        };
      }),
    [getConductScore, students],
  );

  const attendanceRows = useMemo(
    () =>
      students.map((student) => {
        const score = getConductScore(student.id, "attendance");
        return {
          student,
          score,
          label: conductLabel(score),
          status: score >= 75 ? "منتظم" : "ضعيف المواظبة",
        };
      }),
    [getConductScore, students],
  );

  const pagedEntries = filteredEntries.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));

  function exportRows() {
    if (activeTab === "subjects") {
      return filteredEntries.map((entry) => ({
        student_name: studentName(entry.student),
        total_score: entry.total_score,
        max_score: entry.max_score,
        percentage: entry.percentage,
        grade_label: entry.grade_label,
        result_status: entry.result_status,
      }));
    }

    return (activeTab === "behavior" ? behaviorRows : attendanceRows).map(
      (row) => ({
        student_name: studentName(row.student),
        total_score: row.score,
        max_score: 100,
        percentage: row.score,
        grade_label: row.label,
        result_status: row.status,
      }),
    );
  }

  function exportExcel() {
    GradingExport.excel(
      activeTab === "behavior"
        ? "السلوك"
        : activeTab === "attendance"
          ? "المواظبة"
          : "رصد-الدرجات",
      exportRows(),
    );
  }

  function exportPDF() {
    GradingExport.pdf(
      activeTab === "behavior"
        ? "السلوك"
        : activeTab === "attendance"
          ? "المواظبة"
          : "رصد الدرجات",
      exportRows(),
    );
  }

  if (!canView) {
    return (
      <AuthGuard>
        <EmptyState
          icon={<BookOpen size={28} aria-hidden="true" />}
          title="لا تملك صلاحية الوصول"
          description="لا تملك صلاحية الوصول إلى الدرجات."
        />
      </AuthGuard>
    );
  }

  if (schoolLoading || loading) {
    return (
      <AuthGuard>
        <PageLoader text="جاري تحميل صفحة الدرجات..." />
      </AuthGuard>
    );
  }

  if (!currentSchool) {
    return (
      <AuthGuard>
        <EmptyState
          title="لا توجد مدرسة مرتبطة"
          description="لا توجد مدرسة مرتبطة بالمستخدم الحالي."
        />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-5 pb-16" dir="rtl">
        {toast && (
          <div className="fixed left-5 top-5 z-50 w-[min(28rem,calc(100%-2rem))] print:hidden">
            {toast.type === "success" ? (
              <SuccessBanner description={toast.message} />
            ) : (
              <ErrorState description={toast.message} />
            )}
          </div>
        )}

        <PageHeader
          variant="hero"
          title="مركز التقييم الأكاديمي"
          description={`${currentSchool.school_name} — إدارة الدرجات والسلوك والمواظبة.`}
          badge="التقييم الأكاديمي"
          icon={<BookOpen size={18} aria-hidden="true" />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "الدرجات" },
          ]}
          lastUpdated={
            lastSavedAt ? `آخر حفظ ${lastSavedAt}` : "لم يتم الحفظ بعد"
          }
          meta={[
            { label: "المدرسة", value: currentSchool.school_name },
            { label: "المادة", value: getSubjectName(selectedTeacherSubject) },
            { label: "الفصل", value: getClassroomName(selectedTeacherSubject) },
            {
              label: "السنة والفصل",
              value: `${activeAcademicYear} · ${activeSemester}`,
            },
          ]}
          stats={[
            {
              label: "الطلاب",
              value: students.length || entries.length,
              icon: <UsersRound size={20} aria-hidden="true" />,
              tone: "primary",
            },
            {
              label: "متوسط الدرجات",
              value: `${Math.round(analytics.averagePercentage)}%`,
              icon: <BarChart3 size={20} aria-hidden="true" />,
              tone: "primary",
            },
            {
              label: "نسبة النجاح",
              value: `${Math.round(analytics.passRate)}%`,
              icon: <CheckCircle2 size={20} aria-hidden="true" />,
              tone: analytics.passRate >= 80 ? "green" : "gold",
            },
            {
              label: "حالة الرصد",
              value: statusLabel(gradeBook?.status),
              icon: <Lock size={20} aria-hidden="true" />,
              tone: isLocked ? "red" : "slate",
            },
          ]}
          actions={
            <>
              <SecondaryButton onClick={() => void loadGradeBook()}>
                <RefreshCcw size={17} aria-hidden="true" />
                تحديث
              </SecondaryButton>

              {editEnabled && activeTab === "subjects" ? (
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 text-sm font-bold text-[var(--app-text)] shadow-[var(--app-shadow-sm)] transition hover:border-[var(--app-accent-border)] hover:bg-[var(--app-card-soft)] focus-within:ring-2 focus-within:ring-[var(--app-primary)]">
                  <Upload size={17} aria-hidden="true" />
                  استيراد
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="sr-only"
                    onChange={(event) => {
                      void importGrades(event.target.files?.[0] || null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              ) : null}

              <ExportButton onClick={exportExcel}>Excel</ExportButton>

              <ExportButton
                onClick={exportPDF}
                icon={
                  <Printer size={17} aria-hidden="true" />
                }
              >
                PDF
              </ExportButton>
            </>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <ExecutiveCard
            title="الطلاب"
            value={students.length || entries.length}
            subtitle="إجمالي الطلاب في هذا الرصد"
            icon={<UsersRound size={22} aria-hidden="true" />}
            tone="primary"
            progress={students.length || entries.length ? 100 : 0}
          />
          <ExecutiveCard
            title="المتوسط"
            value={`${Math.round(analytics.averagePercentage)}%`}
            subtitle="متوسط نسب الطلاب"
            icon={<BarChart3 size={22} aria-hidden="true" />}
            tone="primary"
            progress={Math.round(analytics.averagePercentage)}
          />
          <ExecutiveCard
            title="نسبة النجاح"
            value={`${Math.round(analytics.passRate)}%`}
            subtitle={`${analytics.passed} ناجح · ${analytics.failed} راسب`}
            icon={<CheckCircle2 size={22} aria-hidden="true" />}
            tone={analytics.passRate >= 80 ? "green" : "gold"}
            progress={Math.round(analytics.passRate)}
          />
          <ExecutiveCard
            title="المتفوقون"
            value={analytics.excellent}
            subtitle="طلاب بمستوى ممتاز"
            icon={<ShieldCheck size={22} aria-hidden="true" />}
            tone="green"
          />
          <ExecutiveCard
            title="يحتاجون متابعة"
            value={analytics.weak}
            subtitle="طلاب في نطاق الخطر"
            icon={<XCircle size={22} aria-hidden="true" />}
            tone={analytics.weak > 0 ? "red" : "green"}
          />
          <ExecutiveCard
            title="حالة الرصد"
            value={statusLabel(gradeBook?.status)}
            subtitle={
              isLocked ? "الرصد مغلق أو معتمد" : "يمكن التعديل حسب الصلاحية"
            }
            icon={<Lock size={22} aria-hidden="true" />}
            tone={isLocked ? "red" : "primary"}
          />
        </section>

        <SummaryCard
          title="الملخص التنفيذي للرصد"
          description="ملخص الاكتمال والنتائج قبل الاعتماد."
          tone={
            analytics.passRate >= 80
              ? "green"
              : analytics.passRate >= 60
                ? "gold"
                : "red"
          }
          items={[
            {
              label: "إجمالي الطلاب",
              value: students.length || entries.length,
            },
            {
              label: "نسبة النجاح",
              value: `${Math.round(analytics.passRate)}%`,
            },
            { label: "المتفوقون", value: analytics.excellent },
            { label: "يحتاجون متابعة", value: analytics.weak },
            { label: "حالة الرصد", value: statusLabel(gradeBook?.status) },
          ]}
          footer={
            lastSavedAt
              ? `آخر عملية حفظ: ${lastSavedAt}`
              : "الحفظ التلقائي يعمل عند التعديل."
          }
        />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <GradeExecutiveAnalytics
            analytics={analytics}
            quality={quality}
            status={statusLabel(gradeBook?.status)}
          />
          <GradeSmartInsights insights={smartInsights} />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <GradeRiskPanel analytics={analytics} />
          <GradeQualityPanel quality={quality} />
          <GradeImportCenter
            editEnabled={editEnabled}
            onImport={importGrades}
          />
        </section>

        <Section
          title="اختيار المادة والفصل"
          description="حدد الإسناد قبل بدء الرصد."
          icon={<GraduationCap size={20} aria-hidden="true" />}
          className="print:hidden"
          badge={
            teacherSubjects.length
              ? `${teacherSubjects.length} إسناد`
              : "لا توجد إسنادات"
          }
        >
          <div className="grid gap-3 lg:grid-cols-4">
            <select
              value={selectedTeacherSubjectId}
              onChange={(event) =>
                setSelectedTeacherSubjectId(event.target.value)
              }
              className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-sm font-bold text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] lg:col-span-2"
            >
              <option value="">اختر إسناد المعلم بالمادة</option>
              {teacherSubjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {teacherSubjectLabel(item)}
                </option>
              ))}
            </select>

            <InfoBox label="السنة" value={activeAcademicYear} />
            <InfoBox label="الفصل" value={activeSemester} />
          </div>
        </Section>

        <section className="flex flex-wrap gap-2 rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-2 shadow-[var(--app-shadow-sm)] print:hidden">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
              className={`rounded-[var(--app-radius-lg)] px-4 py-2 text-sm font-black transition ${
                activeTab === tab.key
                  ? "bg-[var(--app-primary)] text-[var(--app-text-inverse)] shadow-[var(--app-shadow-sm)]"
                  : "text-[var(--app-text-muted)] hover:bg-[var(--app-card-soft)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {gradeBook && activeTab === "subjects" && (
          <Section
            title="سير العمل والاعتماد"
            description={`حالة الرصد الحالية: ${statusLabel(gradeBook.status)}`}
            icon={<Lock size={20} aria-hidden="true" />}
            className="print:hidden"
            badge={isLocked ? "مغلق" : "قابل للتعديل"}
          >
            <div className="flex flex-wrap gap-2">
              {canManage && !isLocked && (
                <ActionButton
                  onClick={() => void saveDirtyEntries()}
                  disabled={saving}
                  label={saving ? "جاري الحفظ..." : "حفظ الآن"}
                  icon={<Save size={16} aria-hidden="true" />}
                />
              )}
              {canManage && gradeBook.status !== "submitted" && !isLocked && (
                <ActionButton
                  onClick={() => void updateGradeBookStatus("submitted")}
                  disabled={saving}
                  label="رفع للاعتماد"
                />
              )}
              {canApprove && gradeBook.status === "submitted" && (
                <ActionButton
                  onClick={() => void updateGradeBookStatus("approved")}
                  disabled={saving}
                  label="اعتماد الرصد"
                />
              )}
              {canLock && gradeBook.status === "approved" && (
                <ActionButton
                  onClick={() => void updateGradeBookStatus("locked")}
                  disabled={saving}
                  label="إقفال الرصد"
                />
              )}
              {canLock && isLocked && (
                <ActionButton
                  onClick={() => void updateGradeBookStatus("reopened")}
                  disabled={saving}
                  label="إعادة فتح الرصد"
                />
              )}
              {canManage && !isLocked && entries.length > 0 && (
                <ActionButton
                  onClick={() => {
                    const nextEntries = entries.map((entry) => ({
                      ...entry,
                      values: Object.fromEntries(
                        components.map((component) => [
                          component.key,
                          component.max_score,
                        ]),
                      ) as GradeValueMap,
                      ...calculateGrade(
                        components,
                        Object.fromEntries(
                          components.map((component) => [
                            component.key,
                            component.max_score,
                          ]),
                        ) as GradeValueMap,
                      ),
                      dirty: true,
                      issues: [],
                    }));
                    setEntries(nextEntries);
                    void saveDirtyEntries(nextEntries);
                  }}
                  disabled={saving}
                  label="إكمال الكل بالدرجة القصوى"
                />
              )}
            </div>
          </Section>
        )}

        <PageToolbar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "ابحث باسم الطالب أو الهوية...",
          }}
          filters={
            activeTab === "subjects" ? (
              <ToolbarSelect value={statusFilter} onChange={setStatusFilter}>
                <option value="all">كل الحالات</option>
                <option value="ناجح">ناجح</option>
                <option value="راسب">راسب</option>
                <option value="غير مكتمل">غير مكتمل</option>
              </ToolbarSelect>
            ) : null
          }
          onRefresh={() => void loadGradeBook()}
          onExportPDF={exportPDF}
          onExportExcel={exportExcel}
          onPrint={() => window.print()}
        />

        {!selectedTeacherSubject ? (
          <EmptyState
            title="اختر إسناد المعلم"
            description="اختر إسناد المعلم بالمادة لعرض الطلاب والرصد."
          />
        ) : activeTab === "subjects" ? (
          <>
            <GradesTable
              entries={pagedEntries}
              components={components}
              editEnabled={editEnabled}
              updateScore={updateScore}
              onSelect={setSelectedEntry}
            />
            {filteredEntries.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                setPage={setPage}
              />
            )}
          </>
        ) : activeTab === "behavior" ? (
          <ConductTable
            title="السلوك"
            rows={behaviorRows}
            canEdit={canManage}
            onAction={(student, action) =>
              void updateConductScore(student, "behavior", action)
            }
          />
        ) : activeTab === "attendance" ? (
          <ConductTable
            title="المواظبة"
            rows={attendanceRows}
            canEdit={canManage}
            onAction={(student, action) =>
              void updateConductScore(student, "attendance", action)
            }
          />
        ) : activeTab === "analytics" ? (
          <AnalyticsSection analytics={analytics} />
        ) : (
          <HistorySection
            events={conductEvents}
            students={students}
            aria-hidden="true"
          />
        )}

        {selectedEntry && (
          <StudentGradeDrawer
            entry={selectedEntry}
            behaviorScore={getConductScore(
              selectedEntry.student.id,
              "behavior",
            )}
            attendanceScore={getConductScore(
              selectedEntry.student.id,
              "attendance",
            )}
            onClose={() => setSelectedEntry(null)}
          />
        )}

        <div className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-2rem)] max-w-[900px] -translate-x-1/2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-card)_95%,transparent)] px-4 py-2 shadow-[var(--app-shadow-lg)] backdrop-blur print:hidden">
          <div className="flex justify-between text-xs font-black text-[var(--app-text-muted)]">
            <div>الطلاب {students.length || entries.length}</div>
            <div>
              {lastSavedAt ? `آخر حفظ ${lastSavedAt}` : "لم يتم الحفظ بعد"}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

function GradesTable({
  entries,
  components,
  editEnabled,
  updateScore,
  onSelect,
}: {
  entries: EditableEntry[];
  components: GradeComponent[];
  editEnabled: boolean;
  updateScore: (
    studentId: string,
    component: GradeComponent,
    rawValue: string,
  ) => void;
  onSelect: (entry: EditableEntry) => void;
}) {
  if (entries.length === 0)
    return (
      <EmptyState
        title="لا توجد بيانات"
        description="لا توجد بيانات طلاب مطابقة للتصفية الحالية."
      />
    );

  return (
    <div className="overflow-x-auto rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] shadow-[var(--app-shadow-sm)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--app-card-soft)] text-xs font-black text-[var(--app-text-muted)]">
          <tr>
            <th className="px-4 py-3 text-right">الطالب</th>
            {components.map((component) => (
              <th key={component.key} className="px-3 py-3 text-center">
                {component.name}
                <div className="mt-1 text-[10px] text-[var(--app-text-subtle)]">
                  /{component.max_score}
                </div>
              </th>
            ))}
            <th className="px-3 py-3 text-center">المجموع</th>
            <th className="px-3 py-3 text-center">النسبة</th>
            <th className="px-3 py-3 text-center">التقدير</th>
            <th className="px-3 py-3 text-center">الحالة</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--app-border)]">
          {entries.map((entry) => (
            <tr
              key={entry.student.id}
              className={
                entry.dirty
                  ? "bg-[color-mix(in_srgb,var(--app-accent)_7%,transparent)]"
                  : "bg-[var(--app-card)]"
              }
            >
              <td className="min-w-[220px] px-4 py-3">
                <button
                  type="button"
                  onClick={() => onSelect(entry)}
                  className="text-right font-black text-[var(--app-text)] hover:text-[var(--app-primary)]"
                >
                  {studentName(entry.student)}
                </button>
                <div className="mt-1 text-xs font-bold text-[var(--app-text-subtle)]">
                  {entry.student.national_id ||
                    entry.student.student_number ||
                    "-"}
                </div>
                {entry.issues.length > 0 && (
                  <div className="mt-1 text-xs font-bold text-[var(--app-danger)]">
                    {entry.issues[0]}
                  </div>
                )}
              </td>
              {components.map((component) => (
                <td key={component.key} className="px-3 py-3 text-center">
                  <input
                    type="number"
                    min={0}
                    max={component.max_score}
                    step="0.25"
                    value={entry.values[component.key] ?? ""}
                    disabled={!editEnabled}
                    onChange={(event) =>
                      updateScore(
                        entry.student.id,
                        component,
                        event.target.value,
                      )
                    }
                    className="w-24 rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-2 text-center text-sm font-bold outline-none focus:border-[var(--app-primary)] disabled:bg-[var(--app-card-soft)] disabled:text-[var(--app-text-subtle)]"
                  />
                </td>
              ))}
              <td className="px-3 py-3 text-center font-black text-[var(--app-text)]">
                {entry.total_score} / {entry.max_score}
              </td>
              <td className="px-3 py-3 text-center font-black text-[var(--app-text)]">
                {entry.percentage}%
              </td>
              <td className="px-3 py-3 text-center font-black text-[var(--app-text)]">
                {entry.grade_label}
              </td>
              <td className="px-3 py-3 text-center">
                <StatusBadge status={entry.result_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConductTable({
  title,
  rows,
  canEdit,
  onAction,
}: {
  title: string;
  rows: {
    student: StudentForGrades;
    score: number;
    label: string;
    status: string;
  }[];
  canEdit: boolean;
  onAction: (student: StudentForGrades, action: ConductAction) => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="لا توجد بيانات"
        description={`لا توجد بيانات ${title}.`}
      />
    );
  }

  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="mb-5 text-2xl font-black text-[var(--app-text)]">
        {title}
      </h2>
      <div className="overflow-x-auto rounded-[var(--app-radius-xl)] border border-[var(--app-border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--app-card-soft)] text-xs font-black text-[var(--app-text-muted)]">
            <tr>
              <th className="px-4 py-3 text-right">الطالب</th>
              <th className="px-4 py-3 text-center">الدرجة</th>
              <th className="px-4 py-3 text-center">التقدير</th>
              <th className="px-4 py-3 text-center">الحالة</th>
              {canEdit && <th className="px-4 py-3 text-center">إجراء</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border)]">
            {rows.map((row) => (
              <tr key={row.student.id}>
                <td className="px-4 py-3 font-black text-[var(--app-text)]">
                  {studentName(row.student)}
                </td>
                <td className="px-4 py-3 text-center font-black">
                  {row.score} / 100
                </td>
                <td className="px-4 py-3 text-center font-bold">{row.label}</td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={row.status} />
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAction(row.student, "increase")}
                        className="rounded-[var(--app-radius-md)] border border-[color-mix(in_srgb,var(--app-success)_24%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] px-3 py-2 text-xs font-bold text-[var(--app-success)]"
                      >
                        زيادة
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction(row.student, "decrease")}
                        className="rounded-[var(--app-radius-md)] border border-[color-mix(in_srgb,var(--app-danger)_24%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] px-3 py-2 text-xs font-bold text-[var(--app-danger)]"
                      >
                        خصم
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction(row.student, "set")}
                        className="rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-2 text-xs font-bold text-[var(--app-text)]"
                      >
                        تعيين
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AnalyticsSection({
  analytics,
}: {
  analytics: ReturnType<typeof buildGradeAnalytics>;
}) {
  const distributionRows = [
    {
      label: "ممتاز",
      value: analytics.distribution.excellent,
      tone: "green" as const,
    },
    {
      label: "جيد جدًا",
      value: analytics.distribution.veryGood,
      tone: "primary" as const,
    },
    {
      label: "جيد",
      value: analytics.distribution.good,
      tone: "neutral" as const,
    },
    {
      label: "مقبول",
      value: analytics.distribution.acceptable,
      tone: "gold" as const,
    },
    { label: "ضعيف", value: analytics.distribution.weak, tone: "red" as const },
  ];

  const totalDistribution = Math.max(
    1,
    distributionRows.reduce((sum, item) => sum + item.value, 0),
  );

  const topStudents = analytics.topStudents?.slice(0, 5) ?? [];
  const weakStudents = analytics.weakStudents?.slice(0, 6) ?? [];
  const watchStudents = analytics.watchStudents?.slice(0, 6) ?? [];

  return (
    <section className="space-y-5">
      <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-[var(--app-accent)]">
              لوحة التحليلات المتقدمة
            </p>
            <h2 className="mt-1 text-2xl font-black text-[var(--app-text)]">
              تحليل النتائج والمؤشرات
            </h2>
          </div>
          <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] px-4 py-3 text-sm font-black text-[var(--app-text-muted)]">
            إجمالي السجلات: {analytics.total}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <AnalyticsCard
            title="متوسط الصف"
            value={`${analytics.averagePercentage}%`}
            detail={`متوسط الدرجات: ${analytics.averageScore}`}
          />
          <AnalyticsCard
            title="نسبة النجاح"
            value={`${analytics.passRate}%`}
            detail={`ناجح ${analytics.passed} / راسب ${analytics.failed}`}
          />
          <AnalyticsCard
            title="الوسيط"
            value={`${analytics.medianPercentage}%`}
            detail={`الانحراف المعياري: ${analytics.standardDeviation}`}
          />
          <AnalyticsCard
            title="حالة المتابعة"
            value={analytics.weak}
            detail={`طلاب يحتاجون متابعة`}
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-black text-[var(--app-text)]">
              توزيع التقديرات
            </h3>
            <span className="rounded-full bg-[var(--app-card-soft)] px-3 py-1 text-xs font-black text-[var(--app-text-muted)]">
              حسب النسبة
            </span>
          </div>

          <div className="space-y-4">
            {distributionRows.map((item) => (
              <DistributionBar
                key={item.label}
                label={item.label}
                value={item.value}
                percent={Math.round((item.value / totalDistribution) * 100)}
                tone={item.tone}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
          <h3 className="mb-4 text-xl font-black text-[var(--app-text)]">
            ملخص الجودة
          </h3>
          <div className="space-y-3">
            <QualityRow
              label="المتفوقون"
              value={analytics.risk.excellent}
              tone="green"
            />
            <QualityRow
              label="المستقرون"
              value={analytics.risk.stable}
              tone="primary"
            />
            <QualityRow
              label="قيد المتابعة"
              value={analytics.risk.watch}
              tone="gold"
            />
            <QualityRow
              label="متعثرون"
              value={analytics.risk.risk}
              tone="red"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <StudentRankList
          title="أفضل الطلاب"
          emptyText="لا توجد بيانات ترتيب."
          rows={topStudents}
          tone="green"
        />

        <StudentRankList
          title="طلاب يحتاجون متابعة"
          emptyText="لا يوجد طلاب في منطقة المتابعة."
          rows={watchStudents}
          tone="gold"
        />

        <StudentRankList
          title="الطلاب المتعثرون"
          emptyText="لا يوجد طلاب متعثرون."
          rows={weakStudents}
          tone="red"
        />
      </div>

      <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
        <h3 className="mb-4 text-xl font-black text-[var(--app-text)]">
          قراءة سريعة للنتائج
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBox
            title="أعلى نتيجة"
            value={analytics.highest?.student_name || "-"}
            detail={`${analytics.highest?.percentage ?? 0}%`}
          />
          <InsightBox
            title="أقل نتيجة"
            value={analytics.lowest?.student_name || "-"}
            detail={`${analytics.lowest?.percentage ?? 0}%`}
          />
          <InsightBox
            title="مؤشر النجاح"
            value={
              analytics.passRate >= 85
                ? "ممتاز"
                : analytics.passRate >= 70
                  ? "مستقر"
                  : "يحتاج متابعة"
            }
            detail={`نسبة النجاح الحالية ${analytics.passRate}%`}
          />
          <InsightBox
            title="مؤشر التشتت"
            value={
              analytics.standardDeviation <= 10
                ? "منخفض"
                : analytics.standardDeviation <= 18
                  ? "متوسط"
                  : "مرتفع"
            }
            detail={`الانحراف المعياري ${analytics.standardDeviation}`}
          />
        </div>
      </div>
    </section>
  );
}

function HistorySection({
  events,
  students,
}: {
  events: ConductEvent[];
  students: StudentForGrades[];
}) {
  if (events.length === 0)
    return (
      <EmptyState
        title="لا توجد عمليات"
        description="لا توجد عمليات مسجلة حتى الآن."
      />
    );

  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="mb-5 flex items-center gap-2 text-2xl font-black text-[var(--app-text)]">
        <History size={20} aria-hidden="true" /> سجل السلوك والمواظبة
      </h2>
      <div className="overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--app-card-soft)] text-xs font-black text-[var(--app-text-muted)]">
            <tr>
              <th className="px-4 py-3 text-right">الطالب</th>
              <th className="px-4 py-3 text-right">النوع</th>
              <th className="px-4 py-3 text-right">العملية</th>
              <th className="px-4 py-3 text-right">النقاط</th>
              <th className="px-4 py-3 text-right">السبب</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border)]">
            {events.map((event, index) => {
              const student = students.find(
                (item) => item.id === event.student_id,
              );
              return (
                <tr key={event.id || index}>
                  <td className="px-4 py-3 font-bold">
                    {student ? studentName(student) : "طالب"}
                  </td>
                  <td className="px-4 py-3">
                    {event.score_type === "behavior" ? "السلوك" : "المواظبة"}
                  </td>
                  <td className="px-4 py-3">{event.event_type}</td>
                  <td className="px-4 py-3">{event.points}</td>
                  <td className="px-4 py-3">{event.notes || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const green = ["ناجح", "مستقر", "منتظم", "ممتاز", "جيد", "جيد جدًا"].includes(
    status,
  );
  const red = ["راسب", "خطر", "ضعيف المواظبة"].includes(status);
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
        green
          ? "border-[color-mix(in_srgb,var(--app-success)_24%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]"
          : red
            ? "border-[color-mix(in_srgb,var(--app-danger)_24%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)]"
            : "border-[var(--app-accent-border)] bg-[color-mix(in_srgb,var(--app-accent)_12%,transparent)] text-[var(--app-accent-foreground)]"
      }`}
    >
      {status}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-sm font-bold text-[var(--app-text)]">
      {label}: {value}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <SecondaryButton disabled={disabled} onClick={onClick} icon={icon}>
      {label}
    </SecondaryButton>
  );
}

function AnalyticsCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-gradient-to-br from-white to-slate-50 p-5">
      <div className="text-xs font-black text-[var(--app-text-subtle)]">
        {title}
      </div>
      <div className="mt-2 text-3xl font-black text-[var(--app-text)]">
        {value}
      </div>
      <div className="mt-2 text-sm font-bold text-[var(--app-text-muted)]">
        {detail}
      </div>
    </div>
  );
}

function DistributionBar({
  label,
  value,
  percent,
  tone,
}: {
  label: string;
  value: number;
  percent: number;
  tone: "green" | "primary" | "neutral" | "gold" | "red";
}) {
  const colors = {
    green: "bg-[var(--app-success)]",
    primary: "bg-[var(--app-primary)]",
    neutral: "bg-[var(--app-text-muted)]",
    gold: "bg-[var(--app-accent)]",
    red: "bg-[var(--app-danger)]",
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-black">
        <span className="text-[var(--app-text)]">{label}</span>
        <span className="text-[var(--app-text-muted)]">
          {value} طالب · {percent}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[var(--app-card-soft)]">
        <div
          className={`h-full rounded-full ${colors[tone]}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

function QualityRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "primary" | "gold" | "red";
}) {
  const colors = {
    green:
      "bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]",
    primary:
      "bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)] text-[var(--app-primary)]",
    gold: "bg-[color-mix(in_srgb,var(--app-accent)_12%,transparent)] text-[var(--app-accent-foreground)]",
    red: "bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)]",
  };

  return (
    <div
      className={`flex items-center justify-between rounded-[var(--app-radius-lg)] px-4 py-3 ${colors[tone]}`}
    >
      <span className="text-sm font-black">{label}</span>
      <span className="text-xl font-black">{value}</span>
    </div>
  );
}

function StudentRankList({
  title,
  rows,
  emptyText,
  tone,
}: {
  title: string;
  rows: Array<{
    student_name?: string | null;
    percentage: number;
    grade_label: string;
    risk_label?: string;
    rank?: number;
  }>;
  emptyText: string;
  tone: "green" | "gold" | "red";
}) {
  const badgeColors = {
    green:
      "bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]",
    gold: "bg-[color-mix(in_srgb,var(--app-accent)_12%,transparent)] text-[var(--app-accent-foreground)]",
    red: "bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)]",
  };

  return (
    <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h3 className="mb-4 text-xl font-black text-[var(--app-text)]">
        {title}
      </h3>

      {rows.length === 0 ? (
        <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4 text-center text-sm font-bold text-[var(--app-text-muted)]">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={`${row.student_name}-${index}`}
              className="flex items-center justify-between rounded-[var(--app-radius-lg)] border border-[var(--app-border)] p-3"
            >
              <div>
                <div className="font-black text-[var(--app-text)]">
                  {row.rank ? `${row.rank}. ` : ""}
                  {row.student_name || "طالب بدون اسم"}
                </div>
                <div className="mt-1 text-xs font-bold text-[var(--app-text-subtle)]">
                  {row.grade_label}{" "}
                  {row.risk_label ? `· ${row.risk_label}` : ""}
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${badgeColors[tone]}`}
              >
                {row.percentage}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InsightBox({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-5">
      <div className="text-xs font-black text-[var(--app-text-subtle)]">
        {title}
      </div>
      <div className="mt-2 text-xl font-black text-[var(--app-text)]">
        {value}
      </div>
      <div className="mt-1 text-sm font-bold text-[var(--app-text-muted)]">
        {detail}
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  setPage,
}: {
  page: number;
  totalPages: number;
  setPage: (value: number | ((current: number) => number)) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-4">
      <p className="text-sm text-[var(--app-text-muted)]">
        صفحة {page} من {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPage((value) => Math.max(1, value - 1))}
          disabled={page === 1}
          className="rounded-[var(--app-radius-md)] border p-2 disabled:opacity-40"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          disabled={page === totalPages}
          className="rounded-[var(--app-radius-md)] border p-2 disabled:opacity-40"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function GradeExecutiveAnalytics({
  analytics,
  quality,
  status,
}: {
  analytics: ReturnType<typeof buildGradeAnalytics>;
  quality: GradeQuality;
  status: string;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <div className="mb-4">
        <h2 className="text-xl font-black text-[var(--app-text)]">
          التحليلات التنفيذية
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          ملخص الاكتمال والجودة والمخاطر.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <GradeMetric
          label="أعلى نتيجة"
          value={`${analytics.highest?.percentage ?? 0}%`}
          icon={<ShieldCheck size={18} aria-hidden="true" />}
          tone="green"
        />
        <GradeMetric
          label="أقل نتيجة"
          value={`${analytics.lowest?.percentage ?? 0}%`}
          icon={<AlertCircle size={18} aria-hidden="true" />}
          tone="red"
        />
        <GradeMetric
          label="اكتمال الرصد"
          value={`${quality.completionRate}%`}
          icon={<ListChecks size={18} aria-hidden="true" />}
          tone="primary"
        />
        <GradeMetric
          label="حالة الاعتماد"
          value={status}
          icon={<Lock size={18} aria-hidden="true" />}
          tone="gold"
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <GradeInsightBox
          title="أعلى طالب"
          value={analytics.highest?.student_name || "-"}
          detail={`${analytics.highest?.percentage ?? 0}%`}
        />
        <GradeInsightBox
          title="أقل طالب"
          value={analytics.lowest?.student_name || "-"}
          detail={`${analytics.lowest?.percentage ?? 0}%`}
        />
      </div>
    </section>
  );
}

function GradeSmartInsights({ insights }: { insights: GradeSmartInsight[] }) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
          <BrainCircuit size={20} aria-hidden="true" />
          الرؤى الذكية
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          توصيات مبنية على الرصد الحالي.
        </p>
      </div>

      <div className="space-y-3">
        {insights.map((item) => (
          <div
            key={item.title}
            className="flex gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] ${insightTone(item.tone)}`}
            >
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-black text-[var(--app-text)]">
                {item.title}
              </p>
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

function GradeRiskPanel({
  analytics,
}: {
  analytics: ReturnType<typeof buildGradeAnalytics>;
}) {
  const total = Math.max(1, analytics.total);

  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="text-xl font-black text-[var(--app-text)]">
        مؤشر المخاطر
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        تصنيف المخاطر الأكاديمية.
      </p>

      <div className="mt-5 space-y-4">
        <GradeProgress
          label="متفوق"
          value={analytics.risk.excellent}
          total={total}
          tone="green"
        />
        <GradeProgress
          label="مستقر"
          value={analytics.risk.stable}
          total={total}
          tone="primary"
        />
        <GradeProgress
          label="قيد المتابعة"
          value={analytics.risk.watch}
          total={total}
          tone="gold"
        />
        <GradeProgress
          label="خطر"
          value={analytics.risk.risk}
          total={total}
          tone="red"
        />
      </div>
    </section>
  );
}

function GradeQualityPanel({ quality }: { quality: GradeQuality }) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="text-xl font-black text-[var(--app-text)]">
        Quality Indicators
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مؤشرات جودة واكتمال الرصد الحالي.
      </p>

      <div className="mt-5 space-y-3">
        <QualityValue
          label="اكتمال الرصد"
          value={`${quality.completionRate}%`}
        />
        <QualityValue
          label="طلاب غير مرصودين"
          value={quality.ungradedStudents}
        />
        <QualityValue
          label="عناصر إلزامية ناقصة"
          value={quality.missingRequired}
        />
        <QualityValue label="تعديلات غير محفوظة" value={quality.dirtyEntries} />
      </div>
    </section>
  );
}

function GradeImportCenter({
  editEnabled,
  onImport,
}: {
  editEnabled: boolean;
  onImport: (file: File | null) => Promise<void>;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] print:hidden">
      <h2 className="text-xl font-black text-[var(--app-text)]">
        مركز الاستيراد
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        استيراد Excel وCSV، مع جاهزية الربط لاحقًا مع نور.
      </p>

      <label
        className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[var(--app-radius-xl)] border border-dashed border-[var(--app-border)] bg-[var(--app-card-soft)] p-6 text-center ${!editEnabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <Upload
          className="h-8 w-8 text-[var(--app-primary)]"
          aria-hidden="true"
        />
        <span className="mt-3 text-sm font-black text-[var(--app-text)]">
          اختر ملف الدرجات
        </span>
        <span className="mt-1 text-xs text-[var(--app-text-muted)]">
          XLSX · XLS · CSV
        </span>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(event) => {
            void onImport(event.target.files?.[0] || null);
            event.currentTarget.value = "";
          }}
        />
      </label>
    </section>
  );
}

function StudentGradeDrawer({
  entry,
  behaviorScore,
  attendanceScore,
  onClose,
}: {
  entry: EditableEntry;
  behaviorScore: number;
  attendanceScore: number;
  onClose: () => void;
}) {
  const recommendations = buildStudentRecommendations(entry);

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40 backdrop-blur-sm print:hidden">
      <button
        type="button"
        className="flex-1"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-[var(--app-card)] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-[var(--app-accent)]">
              Student Drawer V2
            </p>
            <h2 className="mt-1 text-2xl font-black text-[var(--app-text)]">
              {studentName(entry.student)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--app-radius-md)] bg-[var(--app-card-soft)] p-2 text-[var(--app-text-muted)]"
          >
            <XCircle size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <GradeDrawerMetric label="النسبة" value={`${entry.percentage}%`} />
          <GradeDrawerMetric label="التقدير" value={entry.grade_label} />
          <GradeDrawerMetric label="السلوك" value={`${behaviorScore}/100`} />
          <GradeDrawerMetric
            label="المواظبة"
            value={`${attendanceScore}/100`}
          />
        </div>

        <div className="mt-5 space-y-3">
          <GradeDrawerSection
            title="تفاصيل الدرجات"
            items={Object.entries(entry.values).map(
              ([key, value]) => `${key}: ${value ?? "-"}`,
            )}
          />
          <GradeDrawerSection
            title="حالة الرصد"
            items={[
              `المجموع: ${entry.total_score} / ${entry.max_score}`,
              `الحالة: ${entry.result_status}`,
              `أخطاء التحقق: ${entry.issues.length}`,
            ]}
          />
          <GradeDrawerSection
            title="AI Recommendations"
            items={recommendations}
          />
          <GradeDrawerSection
            title="Timeline"
            items={[
              entry.dirty
                ? "يوجد تعديل حديث غير محفوظ."
                : "لا توجد تعديلات معلقة.",
              "تم احتساب النسبة والتقدير تلقائيًا.",
              "تمت مقارنة الطالب بمؤشرات الرصد الحالي.",
            ]}
          />
        </div>
      </aside>
    </div>
  );
}

function GradeMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: GradeInsightTone;
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-lg)] ${insightTone(tone)}`}
      >
        {icon}
      </div>
      <p className="text-xs font-bold text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function GradeInsightBox({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4">
      <p className="text-xs font-bold text-[var(--app-text-muted)]">{title}</p>
      <p className="mt-1 text-lg font-black text-[var(--app-text)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--app-text-muted)]">{detail}</p>
    </div>
  );
}

function GradeProgress({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: GradeInsightTone;
}) {
  const width = Math.max(4, Math.round((value / total) * 100));

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-[var(--app-text-muted)]">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--app-card-soft)]">
        <div
          className={`h-full rounded-full ${progressTone(tone)}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function QualityValue({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] px-4 py-3">
      <span className="text-sm font-bold text-[var(--app-text-muted)]">
        {label}
      </span>
      <span className="text-lg font-black text-[var(--app-text)]">{value}</span>
    </div>
  );
}

function GradeDrawerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4">
      <p className="text-xs font-bold text-[var(--app-text-subtle)]">{label}</p>
      <p className="mt-1 text-xl font-black text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function GradeDrawerSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <p className="mb-2 text-sm font-black text-[var(--app-text)]">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <p
            key={item}
            className="text-xs leading-6 text-[var(--app-text-muted)]"
          >
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}


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
  CheckCircle2,
  FileSearch,
  GraduationCap,
  HeartPulse,
  Lightbulb,
  MessageSquareText,
  RefreshCcw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  WandSparkles,
  X,
} from "lucide-react";

import RoleGuard from "@/components/auth/RoleGuard";
import AppShell from "@/components/layout/AppShell";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { EmptyState } from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/feedback/ErrorState";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import { PageLoader } from "@/components/ui/loading";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, {
  ToolbarSelect,
} from "@/components/ui/page/PageToolbar";

import { useSchool } from "@/contexts/SchoolContext";
import type { SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type DataRow = Record<string, unknown>;

type Toast = {
  type: "success" | "error";
  message: string;
};

type AiTone = "green" | "gold" | "red" | "primary" | "neutral";

type AiInsight = {
  title: string;
  description: string;
  tone: AiTone;
  icon: ReactNode;
};

type AiModule = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  badge: string;
  tone: AiTone;
  prompt: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type SchoolMetrics = {
  students: number;
  teachers: number;
  classrooms: number;
  subjects: number;
  attendanceRecords: number;
  attendanceRate: number;
  gradeRecords: number;
  gradeAverage: number;
  behaviorRecords: number;
  openReferrals: number;
  riskStudents: number;
  dataQuality: number;
  aiReadiness: number;
};

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

type QueryLike<T> = PromiseLike<QueryResult<T>>;

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "student_counselor",
  "teacher",
];

const TONE_CLASSES: Record<AiTone, string> = {
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

const PROGRESS_CLASSES: Record<AiTone, string> = {
  green: "bg-[var(--app-success)]",
  gold: "bg-[var(--app-accent)]",
  red: "bg-[var(--app-danger)]",
  primary: "bg-[var(--app-primary)]",
  neutral: "bg-[var(--app-text-muted)]",
};

function numberValue(
  row: DataRow,
  keys: string[],
  fallback = 0,
) {
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }

  return fallback;
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function normalizeAttendance(value: unknown) {
  const status = String(value || "").trim().toLowerCase();

  if (["present", "حاضر"].includes(status)) return "present";
  if (["absent", "غائب"].includes(status)) return "absent";
  if (["late", "متأخر"].includes(status)) return "late";

  return "other";
}

function gradePercent(row: DataRow) {
  const direct = numberValue(row, ["percentage"], 0);
  if (direct > 0) return Math.round(direct);

  const score = numberValue(row, ["score", "total_score"], 0);
  const max = numberValue(row, ["max_score"], 0);

  if (score > 0 && max > 0) {
    return Math.round((score / max) * 100);
  }

  return 0;
}

function isOpenReferral(value: unknown) {
  const status = String(value || "").trim().toLowerCase();

  return ![
    "closed",
    "مغلق",
    "مغلقة",
    "تم الإغلاق",
    "مكتملة",
    "مستقرة",
  ].includes(status);
}

async function safeQuery<T>(
  query: QueryLike<T>,
  fallback: T,
): Promise<T> {
  try {
    const result = await query;
    return result.error ? fallback : (result.data ?? fallback);
  } catch {
    return fallback;
  }
}

function nowLabel() {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

function createMessageId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export default function AiCenterPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [students, setStudents] = useState<DataRow[]>([]);
  const [teachers, setTeachers] = useState<DataRow[]>([]);
  const [classrooms, setClassrooms] = useState<DataRow[]>([]);
  const [subjects, setSubjects] = useState<DataRow[]>([]);
  const [attendance, setAttendance] = useState<DataRow[]>([]);
  const [grades, setGrades] = useState<DataRow[]>([]);
  const [behavior, setBehavior] = useState<DataRow[]>([]);
  const [referrals, setReferrals] = useState<DataRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "مرحبًا. اسأل عن المخاطر أو الحضور أو الدرجات أو جودة البيانات.",
      createdAt: nowLabel(),
    },
  ]);
  const [selectedInsight, setSelectedInsight] =
    useState<AiInsight | null>(null);

  const showToast = useCallback(
    (type: Toast["type"], message: string) => {
      setToast({ type, message });

      window.setTimeout(() => {
        setToast(null);
      }, 3200);
    },
    [],
  );

  const loadAiData = useCallback(async () => {
    if (!currentSchool?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const schoolId = currentSchool.id;

    const [
      studentsData,
      teachersData,
      classroomsData,
      subjectsData,
      attendanceData,
      gradesData,
      behaviorData,
      referralsData,
    ] = await Promise.all([
      safeQuery<DataRow[]>(
        supabase
          .from("students")
          .select("*")
          .eq("school_id", schoolId)
          .limit(1500),
        [],
      ),
      safeQuery<DataRow[]>(
        supabase
          .from("teachers")
          .select("*")
          .eq("school_id", schoolId)
          .limit(1000),
        [],
      ),
      safeQuery<DataRow[]>(
        supabase
          .from("classrooms")
          .select("*")
          .eq("school_id", schoolId)
          .limit(500),
        [],
      ),
      safeQuery<DataRow[]>(
        supabase
          .from("subjects")
          .select("*")
          .eq("school_id", schoolId)
          .limit(500),
        [],
      ),
      safeQuery<DataRow[]>(
        supabase
          .from("student_attendance_records")
          .select("*")
          .eq("school_id", schoolId)
          .limit(2000),
        [],
      ),
      safeQuery<DataRow[]>(
        supabase
          .from("grades")
          .select("*")
          .eq("school_id", schoolId)
          .limit(2000),
        [],
      ),
      safeQuery<DataRow[]>(
        supabase
          .from("student_behavior")
          .select("*")
          .eq("school_id", schoolId)
          .limit(1000),
        [],
      ),
      safeQuery<DataRow[]>(
        supabase
          .from("student_referrals")
          .select("*")
          .eq("school_id", schoolId)
          .limit(1000),
        [],
      ),
    ]);

    setStudents(studentsData);
    setTeachers(teachersData);
    setClassrooms(classroomsData);
    setSubjects(subjectsData);
    setAttendance(attendanceData);
    setGrades(gradesData);
    setBehavior(behaviorData);
    setReferrals(referralsData);
    setLoading(false);
  }, [currentSchool?.id]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setLoading(false);
      return;
    }

    void loadAiData();
  }, [currentSchool?.id, loadAiData, schoolLoading]);

  const metrics = useMemo<SchoolMetrics>(() => {
    const present = attendance.filter(
      (row) =>
        normalizeAttendance(
          row.attendance_status ?? row.status,
        ) === "present",
    ).length;

    const attendanceRate = percentage(
      present,
      attendance.length,
    );

    const gradeValues = grades
      .map(gradePercent)
      .filter((value) => value > 0);

    const gradeAverage = gradeValues.length
      ? Math.round(
          gradeValues.reduce((sum, value) => sum + value, 0) /
            gradeValues.length,
        )
      : 0;

    const openReferrals = referrals.filter((row) =>
      isOpenReferral(row.status),
    ).length;

    const riskStudents = students.filter((student) => {
      const studentId = String(student.id || "");

      const absent = attendance.filter(
        (row) =>
          String(row.student_id || "") === studentId &&
          normalizeAttendance(
            row.attendance_status ?? row.status,
          ) === "absent",
      ).length;

      const studentGrades = grades
        .filter(
          (row) =>
            String(row.student_id || "") === studentId,
        )
        .map(gradePercent)
        .filter((value) => value > 0);

      const average = studentGrades.length
        ? studentGrades.reduce(
            (sum, value) => sum + value,
            0,
          ) / studentGrades.length
        : 100;

      const behaviorCount = behavior.filter(
        (row) =>
          String(row.student_id || "") === studentId,
      ).length;

      return absent >= 3 || average < 60 || behaviorCount >= 2;
    }).length;

    const qualitySignals = [
      students.length > 0,
      teachers.length > 0,
      classrooms.length > 0,
      subjects.length > 0,
      attendance.length > 0,
      grades.length > 0,
    ].filter(Boolean).length;

    const dataQuality = percentage(qualitySignals, 6);

    const aiReadiness = Math.round(
      dataQuality * 0.4 +
        attendanceRate * 0.2 +
        gradeAverage * 0.2 +
        Math.max(0, 100 - riskStudents * 3) * 0.2,
    );

    return {
      students: students.length,
      teachers: teachers.length,
      classrooms: classrooms.length,
      subjects: subjects.length,
      attendanceRecords: attendance.length,
      attendanceRate,
      gradeRecords: grades.length,
      gradeAverage,
      behaviorRecords: behavior.length,
      openReferrals,
      riskStudents,
      dataQuality,
      aiReadiness,
    };
  }, [
    attendance,
    behavior,
    classrooms.length,
    grades,
    referrals,
    students,
    subjects.length,
    teachers.length,
  ]);

  const insights = useMemo<AiInsight[]>(() => {
    const items: AiInsight[] = [];

    if (metrics.riskStudents > 0) {
      items.push({
        title: "طلاب معرضون للخطر",
        description: `تم رصد ${metrics.riskStudents} طالب بحاجة إلى متابعة.`,
        tone: "red",
        icon: <ShieldAlert className="h-5 w-5" aria-hidden="true" />,
      });
    }

    if (
      metrics.attendanceRecords > 0 &&
      metrics.attendanceRate < 85
    ) {
      items.push({
        title: "الحضور أقل من المستهدف",
        description: `نسبة الحضور الحالية ${metrics.attendanceRate}%.`,
        tone: "gold",
        icon: <Activity className="h-5 w-5" aria-hidden="true" />,
      });
    }

    if (
      metrics.gradeRecords > 0 &&
      metrics.gradeAverage < 70
    ) {
      items.push({
        title: "التحصيل يحتاج دعمًا",
        description: `متوسط الدرجات ${metrics.gradeAverage}%.`,
        tone: "primary",
        icon: <BookOpen className="h-5 w-5" aria-hidden="true" />,
      });
    }

    if (metrics.openReferrals > 0) {
      items.push({
        title: "إحالات مفتوحة",
        description: `يوجد ${metrics.openReferrals} إحالة قيد المتابعة.`,
        tone: "primary",
        icon: <HeartPulse className="h-5 w-5" aria-hidden="true" />,
      });
    }

    if (items.length === 0) {
      items.push({
        title: "الوضع مستقر",
        description: "لا توجد مؤشرات حرجة حاليًا.",
        tone: "green",
        icon: <CheckCircle2 className="h-5 w-5" aria-hidden="true" />,
      });
    }

    return items;
  }, [metrics]);

  const modules = useMemo<AiModule[]>(
    () => [
      {
        id: "assistant",
        title: "المساعد الذكي",
        description: "أسئلة مباشرة عن بيانات المدرسة.",
        icon: <Bot className="h-6 w-6" aria-hidden="true" />,
        badge: "مباشر",
        tone: "primary",
        prompt: "أعطني ملخصًا تنفيذيًا عن المدرسة",
      },
      {
        id: "risk",
        title: "مخاطر الطلاب",
        description: "تحليل الحضور والدرجات والسلوك.",
        icon: <ShieldAlert className="h-6 w-6" aria-hidden="true" />,
        badge: `${metrics.riskStudents} حالة`,
        tone: "red",
        prompt: "من هم الطلاب المعرضون للخطر؟",
      },
      {
        id: "reports",
        title: "التقارير الذكية",
        description: "ملخصات وتوصيات تنفيذية.",
        icon: <WandSparkles className="h-6 w-6" aria-hidden="true" />,
        badge: "تلقائي",
        tone: "primary",
        prompt: "أنشئ تقريرًا تنفيذيًا مختصرًا",
      },
      {
        id: "files",
        title: "محلل الملفات",
        description: "تحليل Excel وPDF وCSV.",
        icon: <FileSearch className="h-6 w-6" aria-hidden="true" />,
        badge: "جاهز للربط",
        tone: "gold",
        prompt: "كيف أستخدم محلل الملفات؟",
      },
      {
        id: "recommendations",
        title: "التوصيات",
        description: "إجراءات علاجية وتحسينية.",
        icon: <Lightbulb className="h-6 w-6" aria-hidden="true" />,
        badge: `${insights.length} توصية`,
        tone: "green",
        prompt: "أعطني أهم التوصيات التربوية",
      },
      {
        id: "decision",
        title: "دعم القرار",
        description: "ترتيب الأولويات والإجراءات.",
        icon: <Target className="h-6 w-6" aria-hidden="true" />,
        badge: `${metrics.aiReadiness}%`,
        tone: "primary",
        prompt: "ما أهم قرار يجب اتخاذه الآن؟",
      },
    ],
    [insights.length, metrics.aiReadiness, metrics.riskStudents],
  );

  const filteredModules = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return modules.filter((module) => {
      const matchesType =
        selectedModule === "all" ||
        module.id === selectedModule;

      const matchesSearch =
        !keyword ||
        `${module.title} ${module.description}`
          .toLowerCase()
          .includes(keyword);

      return matchesType && matchesSearch;
    });
  }, [modules, search, selectedModule]);

  const generateAnswer = useCallback(
    (question: string) => {
      const normalized = question.trim().toLowerCase();

      if (
        normalized.includes("خطر") ||
        normalized.includes("متعثر") ||
        normalized.includes("متابعة")
      ) {
        return `تم رصد ${metrics.riskStudents} طالب ضمن مؤشرات المخاطر.`;
      }

      if (
        normalized.includes("حضور") ||
        normalized.includes("غياب") ||
        normalized.includes("تأخر")
      ) {
        return `نسبة الحضور ${metrics.attendanceRate}% من ${metrics.attendanceRecords} سجل.`;
      }

      if (
        normalized.includes("درجة") ||
        normalized.includes("تحصيل") ||
        normalized.includes("أكاديمي")
      ) {
        return `متوسط الدرجات ${metrics.gradeAverage}% من ${metrics.gradeRecords} سجل.`;
      }

      if (
        normalized.includes("تقرير") ||
        normalized.includes("ملخص")
      ) {
        return `الملخص: ${metrics.students} طالب، ${metrics.teachers} معلم، حضور ${metrics.attendanceRate}%، متوسط درجات ${metrics.gradeAverage}%، و${metrics.riskStudents} حالة متابعة.`;
      }

      if (
        normalized.includes("قرار") ||
        normalized.includes("أولوية")
      ) {
        if (metrics.riskStudents > 0) {
          return `الأولوية متابعة ${metrics.riskStudents} حالة خطر طلابي.`;
        }

        if (metrics.attendanceRate < 85) {
          return "الأولوية رفع نسبة الحضور وتحليل الغياب المتكرر.";
        }

        if (metrics.gradeAverage < 70) {
          return "الأولوية إعداد خطة علاجية للمواد الأقل متوسطًا.";
        }

        return "المؤشرات مستقرة؛ ركز على جودة البيانات.";
      }

      if (
        normalized.includes("ملف") ||
        normalized.includes("excel") ||
        normalized.includes("pdf")
      ) {
        return "محلل الملفات جاهز للربط بمحرك تحليل خارجي.";
      }

      return `جاهزية AI ${metrics.aiReadiness}%، جودة البيانات ${metrics.dataQuality}%، الحضور ${metrics.attendanceRate}%، ومتوسط الدرجات ${metrics.gradeAverage}%.`;
    },
    [metrics],
  );

  const sendMessage = useCallback(
    (value?: string) => {
      const question = (value ?? chatInput).trim();
      if (!question) return;

      setChatMessages((current) => [
        ...current,
        {
          id: createMessageId("user"),
          role: "user",
          content: question,
          createdAt: nowLabel(),
        },
        {
          id: createMessageId("assistant"),
          role: "assistant",
          content: generateAnswer(question),
          createdAt: nowLabel(),
        },
      ]);

      setChatInput("");
    },
    [chatInput, generateAnswer],
  );

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل مركز الذكاء الاصطناعي..." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-6 pb-10" dir="rtl">
          {toast ? (
            <div className="fixed left-5 top-5 z-50 w-[min(420px,calc(100%-2rem))]">
              {toast.type === "success" ? (
                <SuccessBanner description={toast.message} />
              ) : (
                <ErrorState description={toast.message} />
              )}
            </div>
          ) : null}

          <PageHeader
            variant="hero"
            title="مركز الذكاء الاصطناعي"
            description="تحليل المخاطر ودعم القرار والتوصيات."
            badge="AI Center"
            icon={<BrainCircuit size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الذكاء الاصطناعي" },
            ]}
            meta={[
              {
                label: "المدرسة",
                value: currentSchool?.school_name || "غير متوفر",
              },
              {
                label: "جاهزية AI",
                value: `${metrics.aiReadiness}%`,
              },
              {
                label: "جودة البيانات",
                value: `${metrics.dataQuality}%`,
              },
              {
                label: "آخر تحليل",
                value: nowLabel(),
              },
            ]}
            stats={[
              {
                label: "الطلاب",
                value: metrics.students,
                icon: <Users size={20} aria-hidden="true" />,
                tone: "primary",
              },
              {
                label: "المخاطر",
                value: metrics.riskStudents,
                icon: <ShieldAlert size={20} aria-hidden="true" />,
                tone:
                  metrics.riskStudents > 0 ? "red" : "green",
              },
              {
                label: "الحضور",
                value: `${metrics.attendanceRate}%`,
                icon: <Activity size={20} aria-hidden="true" />,
                tone:
                  metrics.attendanceRate >= 85
                    ? "green"
                    : "gold",
              },
              {
                label: "الدرجات",
                value: `${metrics.gradeAverage}%`,
                icon: <GraduationCap size={20} aria-hidden="true" />,
                tone:
                  metrics.gradeAverage >= 80
                    ? "green"
                    : "gold",
              },
            ]}
            actions={
              <>
                <SecondaryButton onClick={() => void loadAiData()}>
                  <RefreshCcw size={17} aria-hidden="true" />
                  تحديث
                </SecondaryButton>

                <PrimaryButton
                  onClick={() => {
                    setChatMessages((current) =>
                      current.slice(0, 1),
                    );
                    showToast("success", "تم بدء جلسة جديدة.");
                  }}
                >
                  <Sparkles size={17} aria-hidden="true" />
                  جلسة جديدة
                </PrimaryButton>
              </>
            }
          />

          <section
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
            aria-label="مؤشرات الذكاء الاصطناعي"
          >
            <ExecutiveCard
              title="جاهزية AI"
              value={`${metrics.aiReadiness}%`}
              subtitle="جودة واكتمال البيانات"
              icon={<BrainCircuit size={24} aria-hidden="true" />}
              tone={
                metrics.aiReadiness >= 80 ? "green" : "gold"
              }
              progress={metrics.aiReadiness}
            />

            <ExecutiveCard
              title="جودة البيانات"
              value={`${metrics.dataQuality}%`}
              subtitle="المصادر الأساسية"
              icon={<BarChart3 size={24} aria-hidden="true" />}
              tone={
                metrics.dataQuality >= 80 ? "green" : "gold"
              }
              progress={metrics.dataQuality}
            />

            <ExecutiveCard
              title="مخاطر الطلاب"
              value={metrics.riskStudents}
              subtitle="حضور ودرجات وسلوك"
              icon={<AlertTriangle size={24} aria-hidden="true" />}
              tone={
                metrics.riskStudents > 0 ? "red" : "green"
              }
              progress={
                metrics.students
                  ? percentage(
                      metrics.riskStudents,
                      metrics.students,
                    )
                  : 0
              }
            />

            <ExecutiveCard
              title="الإحالات"
              value={metrics.openReferrals}
              subtitle="قيد المتابعة"
              icon={<HeartPulse size={24} aria-hidden="true" />}
              tone={
                metrics.openReferrals > 0 ? "gold" : "green"
              }
              progress={
                metrics.students
                  ? percentage(
                      metrics.openReferrals,
                      metrics.students,
                    )
                  : 0
              }
            />
          </section>

          <SummaryCard
            title="الملخص التنفيذي"
            description="قراءة موحدة لجاهزية التحليلات الذكية."
            tone={
              metrics.riskStudents > 0 ||
              metrics.attendanceRate < 85 ||
              metrics.gradeAverage < 70
                ? "gold"
                : "green"
            }
            items={[
              { label: "الطلاب", value: metrics.students },
              { label: "المعلمون", value: metrics.teachers },
              { label: "الفصول", value: metrics.classrooms },
              { label: "المواد", value: metrics.subjects },
              {
                label: "جودة البيانات",
                value: `${metrics.dataQuality}%`,
              },
              {
                label: "جاهزية AI",
                value: `${metrics.aiReadiness}%`,
              },
            ]}
            footer="التحليل محلي وجاهز للربط بخدمة AI خارجية."
          />

          <PageToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "بحث في الوحدات...",
            }}
            filters={
              <ToolbarSelect
                value={selectedModule}
                onChange={setSelectedModule}
              >
                <option value="all">كل الوحدات</option>
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))}
              </ToolbarSelect>
            }
            onRefresh={() => void loadAiData()}
          />

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <AiExecutiveAnalytics metrics={metrics} />

            <AiSmartInsights
              insights={insights}
              onSelect={setSelectedInsight}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <AiHealthPanel metrics={metrics} />
            <AiDecisionPanel metrics={metrics} />
            <AiRecommendations insights={insights} />
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredModules.map((module) => (
              <button
                key={module.id}
                type="button"
                onClick={() => {
                  setSelectedModule(module.id);
                  sendMessage(module.prompt);
                }}
                className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 text-right shadow-[var(--app-shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--app-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-lg)] ${TONE_CLASSES[module.tone]}`}
                    aria-hidden="true"
                  >
                    {module.icon}
                  </span>

                  <span className="rounded-full bg-[var(--app-card-soft)] px-3 py-1 text-xs font-black text-[var(--app-text-muted)]">
                    {module.badge}
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-black text-[var(--app-text)]">
                  {module.title}
                </h3>

                <p className="mt-2 text-sm leading-7 text-[var(--app-text-muted)]">
                  {module.description}
                </p>
              </button>
            ))}
          </section>

          {filteredModules.length === 0 ? (
            <EmptyState
              title="لا توجد وحدات"
              description="غيّر البحث أو الفلتر."
              icon={<Search className="h-8 w-8" aria-hidden="true" />}
            />
          ) : null}

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <AiChat
              messages={chatMessages}
              input={chatInput}
              onInput={setChatInput}
              onSend={() => sendMessage()}
              onSuggestion={sendMessage}
            />

            <AiFileAnalyzer />
          </section>

          {selectedInsight ? (
            <AiInsightDrawer
              insight={selectedInsight}
              metrics={metrics}
              onClose={() => setSelectedInsight(null)}
            />
          ) : null}
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function Panel({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        {icon}
        {title}
      </h2>

      {description ? (
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          {description}
        </p>
      ) : null}

      <div className="mt-5">{children}</div>
    </section>
  );
}

function AiExecutiveAnalytics({
  metrics,
}: {
  metrics: SchoolMetrics;
}) {
  return (
    <Panel
      title="التحليلات التنفيذية"
      description="المؤشرات الأساسية للتحليل."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AiMetric
          label="جاهزية AI"
          value={`${metrics.aiReadiness}%`}
          icon={<BrainCircuit size={18} aria-hidden="true" />}
          tone="green"
        />

        <AiMetric
          label="جودة البيانات"
          value={`${metrics.dataQuality}%`}
          icon={<BarChart3 size={18} aria-hidden="true" />}
          tone="primary"
        />

        <AiMetric
          label="المخاطر"
          value={metrics.riskStudents}
          icon={<ShieldAlert size={18} aria-hidden="true" />}
          tone={
            metrics.riskStudents > 0 ? "red" : "green"
          }
        />

        <AiMetric
          label="الإحالات"
          value={metrics.openReferrals}
          icon={<HeartPulse size={18} aria-hidden="true" />}
          tone="gold"
        />
      </div>
    </Panel>
  );
}

function AiSmartInsights({
  insights,
  onSelect,
}: {
  insights: AiInsight[];
  onSelect: (insight: AiInsight) => void;
}) {
  return (
    <Panel
      title="الرؤى الذكية"
      description="أبرز الملاحظات المستخرجة."
      icon={<BrainCircuit size={20} aria-hidden="true" />}
    >
      <div className="space-y-3">
        {insights.map((insight) => (
          <button
            key={insight.title}
            type="button"
            onClick={() => onSelect(insight)}
            className="flex w-full gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 text-right transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] ${TONE_CLASSES[insight.tone]}`}
              aria-hidden="true"
            >
              {insight.icon}
            </span>

            <span>
              <span className="block text-sm font-black text-[var(--app-text)]">
                {insight.title}
              </span>

              <span className="mt-1 block text-xs leading-6 text-[var(--app-text-muted)]">
                {insight.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function AiHealthPanel({
  metrics,
}: {
  metrics: SchoolMetrics;
}) {
  return (
    <Panel title="صحة البيانات" description="جودة المؤشرات المستخدمة.">
      <div className="space-y-4">
        <AiProgress
          label="جودة البيانات"
          value={metrics.dataQuality}
          tone="primary"
        />
        <AiProgress
          label="جاهزية AI"
          value={metrics.aiReadiness}
          tone="green"
        />
        <AiProgress
          label="الحضور"
          value={metrics.attendanceRate}
          tone="primary"
        />
        <AiProgress
          label="التحصيل"
          value={metrics.gradeAverage}
          tone="gold"
        />
      </div>
    </Panel>
  );
}

function AiDecisionPanel({
  metrics,
}: {
  metrics: SchoolMetrics;
}) {
  const decision =
    metrics.riskStudents > 0
      ? `ابدأ بمتابعة ${metrics.riskStudents} حالة خطر.`
      : metrics.attendanceRate < 85
        ? "ابدأ بتحليل الغياب المتكرر."
        : metrics.gradeAverage < 70
          ? "ابدأ بخطة علاجية للتحصيل."
          : "المؤشرات مستقرة؛ ركز على جودة البيانات.";

  return (
    <Panel
      title="دعم القرار"
      description="الأولوية المقترحة حاليًا."
      icon={<Target size={20} aria-hidden="true" />}
    >
      <div className="rounded-[var(--app-radius-xl)] bg-[var(--app-card-soft)] p-5">
        <p className="text-lg font-black leading-8 text-[var(--app-text)]">
          {decision}
        </p>
      </div>
    </Panel>
  );
}

function AiRecommendations({
  insights,
}: {
  insights: AiInsight[];
}) {
  return (
    <Panel
      title="التوصيات"
      description="إجراءات عملية مقترحة."
      icon={<Lightbulb size={20} aria-hidden="true" />}
    >
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={insight.title}
            className="flex gap-3 rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--app-radius-md)] bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-sm font-black text-[var(--app-primary)]">
              {index + 1}
            </span>

            <p className="text-sm leading-7 text-[var(--app-text)]">
              {insight.description}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AiChat({
  messages,
  input,
  onInput,
  onSend,
  onSuggestion,
}: {
  messages: ChatMessage[];
  input: string;
  onInput: (value: string) => void;
  onSend: () => void;
  onSuggestion: (value: string) => void;
}) {
  const suggestions = [
    "أعطني ملخصًا تنفيذيًا",
    "من هم الطلاب المعرضون للخطر؟",
    "حلل الحضور والغياب",
    "ما أهم قرار الآن؟",
  ];

  return (
    <Panel
      title="المساعد الذكي"
      description="محادثة مع مؤشرات المدرسة."
      icon={<MessageSquareText size={20} aria-hidden="true" />}
    >
      <div
        className="max-h-[480px] space-y-3 overflow-y-auto rounded-[var(--app-radius-xl)] bg-[var(--app-card-soft)] p-4"
        aria-live="polite"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[88%] rounded-[var(--app-radius-lg)] p-4 ${
              message.role === "assistant"
                ? "mr-auto bg-[var(--app-card)] text-[var(--app-text)]"
                : "ml-auto bg-[var(--app-primary)] text-[var(--app-text-inverse)]"
            }`}
          >
            <p className="text-sm leading-7">
              {message.content}
            </p>

            <time
              className={`mt-2 block text-[10px] ${
                message.role === "assistant"
                  ? "text-[var(--app-text-subtle)]"
                  : "text-[color-mix(in_srgb,var(--app-text-inverse)_65%,transparent)]"
              }`}
            >
              {message.createdAt}
            </time>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestion(suggestion)}
            className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] px-3 py-2 text-xs font-black text-[var(--app-text)] transition hover:bg-[var(--app-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSend();
          }}
          placeholder="اكتب سؤالك..."
          aria-label="سؤال المساعد الذكي"
          className="h-12 flex-1 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
        />

        <button
          type="button"
          onClick={onSend}
          aria-label="إرسال السؤال"
          className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] text-[var(--app-text-inverse)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
        >
          <Send size={18} aria-hidden="true" />
        </button>
      </div>
    </Panel>
  );
}

function AiFileAnalyzer() {
  return (
    <Panel
      title="محلل الملفات"
      description="واجهة جاهزة للربط."
      icon={<FileSearch size={20} aria-hidden="true" />}
    >
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-[var(--app-radius-xl)] border border-dashed border-[var(--app-border)] bg-[var(--app-card-soft)] p-8 text-center transition hover:bg-[var(--app-card)]">
        <FileSearch
          className="h-10 w-10 text-[var(--app-primary)]"
          aria-hidden="true"
        />

        <span className="mt-3 font-black text-[var(--app-text)]">
          اختر ملفًا
        </span>

        <span className="mt-1 text-xs text-[var(--app-text-muted)]">
          PDF · Excel · CSV · JSON
        </span>

        <input
          type="file"
          accept=".pdf,.xlsx,.xls,.csv,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              window.alert(
                `تم اختيار الملف: ${file.name}\nيلزم ربط محرك التحليل لإكمال العملية.`,
              );
            }

            event.currentTarget.value = "";
          }}
        />
      </label>

      <div className="mt-4 rounded-[var(--app-radius-lg)] bg-[color-mix(in_srgb,var(--app-warning)_10%,transparent)] p-4 text-xs leading-6 text-[var(--app-warning-foreground)]">
        لا يتم إرسال الملفات إلى أي مزود خارجي حاليًا.
      </div>
    </Panel>
  );
}

function AiInsightDrawer({
  insight,
  metrics,
  onClose,
}: {
  insight: AiInsight;
  metrics: SchoolMetrics;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-[color-mix(in_srgb,var(--app-text)_40%,transparent)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={insight.title}
    >
      <button
        type="button"
        className="flex-1"
        onClick={onClose}
        aria-label="إغلاق النافذة"
      />

      <aside className="h-full w-full max-w-xl overflow-y-auto bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-xl)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-[var(--app-accent)]">
              AI Insight
            </p>

            <h2 className="mt-1 text-2xl font-black text-[var(--app-text)]">
              {insight.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-[var(--app-radius-md)] bg-[var(--app-card-soft)] p-2 text-[var(--app-text-muted)]"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4 text-sm leading-7 text-[var(--app-text-muted)]">
            {insight.description}
          </div>

          <DrawerSection
            title="البيانات الداعمة"
            items={[
              `جاهزية AI: ${metrics.aiReadiness}%`,
              `جودة البيانات: ${metrics.dataQuality}%`,
              `الحضور: ${metrics.attendanceRate}%`,
              `متوسط الدرجات: ${metrics.gradeAverage}%`,
              `طلاب المخاطر: ${metrics.riskStudents}`,
              `الإحالات المفتوحة: ${metrics.openReferrals}`,
            ]}
          />

          <DrawerSection
            title="الإجراء المقترح"
            items={[
              insight.tone === "red"
                ? "ابدأ تدخلًا عاجلًا وحدد مسؤول المتابعة."
                : insight.tone === "gold"
                  ? "أنشئ خطة متابعة قصيرة."
                  : "استمر في المتابعة والتحسين.",
            ]}
          />
        </div>
      </aside>
    </div>
  );
}

function AiMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: AiTone;
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <span
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-lg)] ${TONE_CLASSES[tone]}`}
        aria-hidden="true"
      >
        {icon}
      </span>

      <p className="text-xs font-bold text-[var(--app-text-muted)]">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-[var(--app-text)]">
        {value}
      </p>
    </div>
  );
}

function AiProgress({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: AiTone;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-bold text-[var(--app-text-muted)]">
        <span>{label}</span>
        <span>{safeValue}%</span>
      </div>

      <div
        className="h-2.5 overflow-hidden rounded-full bg-[var(--app-card-soft)]"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
      >
        <div
          className={`h-full rounded-full ${PROGRESS_CLASSES[tone]}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function DrawerSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <p className="mb-2 text-sm font-black text-[var(--app-text)]">
        {title}
      </p>

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


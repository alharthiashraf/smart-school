"use client";

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
import PageToolbar, {
  ToolbarSelect,
} from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { PageLoader } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";

import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/lib/supabase";
import { type SchoolRole } from "@/lib/permissions";

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

type AnyRow = Record<string, unknown>;

type Toast = {
  type: "success" | "error";
  message: string;
};

type AiTone = "green" | "gold" | "red" | "blue" | "teal";

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

function numberValue(row: AnyRow, keys: string[], fallback = 0) {
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

function gradePercent(row: AnyRow) {
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

function insightTone(tone: AiTone) {
  const tones: Record<AiTone, string> = {
    green: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
    gold: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    red: "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    teal: "bg-[var(--app-teal-soft)] text-[var(--app-teal)]",
  };

  return tones[tone];
}

function progressTone(tone: AiTone) {
  const tones: Record<AiTone, string> = {
    green: "bg-[var(--app-green)]",
    gold: "bg-[var(--app-accent)]",
    red: "bg-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue)]",
    teal: "bg-[var(--app-teal)]",
  };

  return tones[tone];
}

async function safeQuery<T>(
  query: QueryLike<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    const result = await query;

    if (result.error) {
      console.warn(`ai-center query skipped: ${label}`, result.error);
      return fallback;
    }

    return result.data ?? fallback;
  } catch (error) {
    console.warn(`ai-center query failed: ${label}`, error);
    return fallback;
  }
}

function nowLabel() {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

export default function AiCenterPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [students, setStudents] = useState<AnyRow[]>([]);
  const [teachers, setTeachers] = useState<AnyRow[]>([]);
  const [classrooms, setClassrooms] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [attendance, setAttendance] = useState<AnyRow[]>([]);
  const [grades, setGrades] = useState<AnyRow[]>([]);
  const [behavior, setBehavior] = useState<AnyRow[]>([]);
  const [referrals, setReferrals] = useState<AnyRow[]>([]);

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
        "مرحبًا بك في مركز الذكاء الاصطناعي. اسألني عن الطلاب المعرضين للخطر، الحضور، الدرجات، السلوك، أو جودة بيانات المدرسة.",
      createdAt: nowLabel(),
    },
  ]);
  const [selectedInsight, setSelectedInsight] = useState<AiInsight | null>(null);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadAiData = useCallback(async () => {
    if (!currentSchool?.id) return;

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
      safeQuery<AnyRow[]>(
        supabase.from("students").select("*").eq("school_id", schoolId).limit(1500),
        [],
        "students",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("teachers").select("*").eq("school_id", schoolId).limit(1000),
        [],
        "teachers",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("classrooms").select("*").eq("school_id", schoolId).limit(500),
        [],
        "classrooms",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("subjects").select("*").eq("school_id", schoolId).limit(500),
        [],
        "subjects",
      ),
      safeQuery<AnyRow[]>(
        supabase
          .from("student_attendance_records")
          .select("*")
          .eq("school_id", schoolId)
          .limit(2000),
        [],
        "attendance",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("grades").select("*").eq("school_id", schoolId).limit(2000),
        [],
        "grades",
      ),
      safeQuery<AnyRow[]>(
        supabase
          .from("student_behavior")
          .select("*")
          .eq("school_id", schoolId)
          .limit(1000),
        [],
        "behavior",
      ),
      safeQuery<AnyRow[]>(
        supabase
          .from("student_referrals")
          .select("*")
          .eq("school_id", schoolId)
          .limit(1000),
        [],
        "referrals",
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

    const attendanceRate = percentage(present, attendance.length);

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
          normalizeAttendance(row.attendance_status ?? row.status) ===
            "absent",
      ).length;

      const studentGrades = grades
        .filter((row) => String(row.student_id || "") === studentId)
        .map(gradePercent)
        .filter((value) => value > 0);

      const avg = studentGrades.length
        ? studentGrades.reduce((sum, value) => sum + value, 0) /
          studentGrades.length
        : 100;

      const studentBehavior = behavior.filter(
        (row) => String(row.student_id || "") === studentId,
      ).length;

      return absent >= 3 || avg < 60 || studentBehavior >= 2;
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
        (gradeAverage || 0) * 0.2 +
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
        description: `تم رصد ${metrics.riskStudents} طالب لديهم مؤشرات تعثر أكاديمي أو سلوكي أو حضور متكرر.`,
        tone: "red",
        icon: <ShieldAlert className="h-5 w-5" />,
      });
    }

    if (metrics.attendanceRecords > 0 && metrics.attendanceRate < 85) {
      items.push({
        title: "الحضور أقل من المستهدف",
        description: `نسبة الحضور الحالية ${metrics.attendanceRate}% وتحتاج إلى تدخل تشغيلي.`,
        tone: "gold",
        icon: <Activity className="h-5 w-5" />,
      });
    }

    if (metrics.gradeRecords > 0 && metrics.gradeAverage < 70) {
      items.push({
        title: "التحصيل يحتاج دعمًا",
        description: `متوسط الدرجات الحالي ${metrics.gradeAverage}%، ويُنصح بخطط علاجية للمواد الأضعف.`,
        tone: "blue",
        icon: <BookOpen className="h-5 w-5" />,
      });
    }

    if (metrics.openReferrals > 0) {
      items.push({
        title: "إحالات مفتوحة",
        description: `يوجد ${metrics.openReferrals} إحالة ما زالت قيد المتابعة.`,
        tone: "teal",
        icon: <HeartPulse className="h-5 w-5" />,
      });
    }

    if (items.length === 0) {
      items.push({
        title: "الوضع مستقر",
        description:
          "لا توجد مؤشرات حرجة في البيانات الحالية. استمر في المتابعة الدورية.",
        tone: "green",
        icon: <CheckCircle2 className="h-5 w-5" />,
      });
    }

    return items;
  }, [metrics]);

  const modules = useMemo<AiModule[]>(
    () => [
      {
        id: "assistant",
        title: "المساعد الذكي",
        description:
          "اسأل عن بيانات المدرسة واحصل على إجابة فورية مبنية على المؤشرات الحالية.",
        icon: <Bot className="h-6 w-6" />,
        badge: "مباشر",
        tone: "blue",
        prompt: "أعطني ملخصًا تنفيذيًا عن المدرسة",
      },
      {
        id: "risk",
        title: "محرك مخاطر الطلاب",
        description:
          "تحليل الحضور والدرجات والسلوك والإحالات لاكتشاف الطلاب الأعلى احتياجًا.",
        icon: <ShieldAlert className="h-6 w-6" />,
        badge: `${metrics.riskStudents} حالة`,
        tone: "red",
        prompt: "من هم الطلاب المعرضون للخطر؟",
      },
      {
        id: "reports",
        title: "مولد التقارير الذكي",
        description:
          "إنشاء ملخصات تنفيذية وتوصيات جاهزة للإدارة والمعلمين.",
        icon: <WandSparkles className="h-6 w-6" />,
        badge: "تلقائي",
        tone: "teal",
        prompt: "أنشئ تقريرًا تنفيذيًا مختصرًا",
      },
      {
        id: "files",
        title: "محلل الملفات",
        description:
          "واجهة مركزية لتحليل ملفات Excel وPDF وCSV التعليمية والإدارية.",
        icon: <FileSearch className="h-6 w-6" />,
        badge: "جاهز للربط",
        tone: "gold",
        prompt: "كيف أستخدم محلل الملفات؟",
      },
      {
        id: "recommendations",
        title: "التوصيات التربوية",
        description:
          "خطط علاجية وتحسينية مبنية على التحصيل والحضور والسلوك.",
        icon: <Lightbulb className="h-6 w-6" />,
        badge: `${insights.length} توصية`,
        tone: "green",
        prompt: "أعطني أهم التوصيات التربوية",
      },
      {
        id: "decision",
        title: "دعم القرار",
        description:
          "مؤشرات تنفيذية تساعد الإدارة على تحديد الأولويات والإجراءات القادمة.",
        icon: <Target className="h-6 w-6" />,
        badge: `${metrics.aiReadiness}%`,
        tone: "blue",
        prompt: "ما أهم قرار يجب اتخاذه الآن؟",
      },
    ],
    [insights.length, metrics.aiReadiness, metrics.riskStudents],
  );

  const filteredModules = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return modules.filter((module) => {
      const matchesType =
        selectedModule === "all" || module.id === selectedModule;
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
        return `تم رصد ${metrics.riskStudents} طالب ضمن مؤشرات المخاطر. يعتمد التصنيف على تكرار الغياب، انخفاض الدرجات، وتعدد السجلات السلوكية. الأولوية: مراجعة الحالات الأعلى تكرارًا ثم إعداد خطة تدخل مشتركة مع المرشد وولي الأمر.`;
      }

      if (
        normalized.includes("حضور") ||
        normalized.includes("غياب") ||
        normalized.includes("تأخر")
      ) {
        return `نسبة الحضور الحالية ${metrics.attendanceRate}% من ${metrics.attendanceRecords} سجل حضور. ${
          metrics.attendanceRate >= 85
            ? "المؤشر جيد، مع ضرورة متابعة الحالات المتكررة."
            : "المؤشر أقل من المستوى المستهدف ويحتاج متابعة الفصول الأعلى غيابًا."
        }`;
      }

      if (
        normalized.includes("درجة") ||
        normalized.includes("تحصيل") ||
        normalized.includes("أكاديمي")
      ) {
        return `متوسط الدرجات الحالي ${metrics.gradeAverage || 0}% من ${metrics.gradeRecords} سجل. ${
          metrics.gradeAverage >= 80
            ? "الأداء الأكاديمي جيد."
            : "يوصى بتحليل المواد الأقل متوسطًا وإعداد خطط علاجية."
        }`;
      }

      if (
        normalized.includes("تقرير") ||
        normalized.includes("ملخص")
      ) {
        return `الملخص التنفيذي: ${metrics.students} طالب، ${metrics.teachers} معلم، ${metrics.classrooms} فصل، حضور ${metrics.attendanceRate}%، متوسط درجات ${metrics.gradeAverage || 0}%، ${metrics.riskStudents} طالب يحتاج متابعة، و${metrics.openReferrals} إحالة مفتوحة. جاهزية الذكاء الاصطناعي ${metrics.aiReadiness}%.`;
      }

      if (
        normalized.includes("قرار") ||
        normalized.includes("أولوية")
      ) {
        if (metrics.riskStudents > 0) {
          return `الأولوية الأولى هي معالجة ${metrics.riskStudents} حالة خطر طلابي، ثم متابعة الحضور والدرجات للحالات نفسها.`;
        }

        if (metrics.attendanceRate < 85) {
          return "الأولوية الحالية هي رفع نسبة الحضور وتحليل الغياب المتكرر حسب الفصل والطالب.";
        }

        if (metrics.gradeAverage < 70) {
          return "الأولوية الحالية هي بناء خطة علاجية للمواد الأقل متوسطًا ومراجعة أدوات التقويم.";
        }

        return "المؤشرات مستقرة. الأولوية المناسبة هي رفع جودة البيانات وتوسيع التحليلات التنبؤية.";
      }

      if (
        normalized.includes("ملف") ||
        normalized.includes("excel") ||
        normalized.includes("pdf")
      ) {
        return "محلل الملفات سيكون نقطة موحدة لرفع Excel وPDF وCSV وتحليل المحتوى واكتشاف الأخطاء وإنتاج توصيات. هذه النسخة تعرض الواجهة وجاهزية الربط، ولا ترسل الملف إلى خدمة ذكاء اصطناعي خارجية تلقائيًا.";
      }

      return `بناءً على البيانات الحالية: جاهزية الذكاء الاصطناعي ${metrics.aiReadiness}%، جودة البيانات ${metrics.dataQuality}%، الحضور ${metrics.attendanceRate}%، ومتوسط الدرجات ${metrics.gradeAverage || 0}%. يمكنك سؤالي عن المخاطر أو الحضور أو الدرجات أو القرارات التنفيذية.`;
    },
    [metrics],
  );

  function sendMessage(value?: string) {
    const question = (value ?? chatInput).trim();
    if (!question) return;

    const userMessage: ChatMessage = {
      id: `user-${crypto.randomUUID()}`,
      role: "user",
      content: question,
      createdAt: nowLabel(),
    };

    const answerMessage: ChatMessage = {
      id: `assistant-${crypto.randomUUID()}`,
      role: "assistant",
      content: generateAnswer(question),
      createdAt: nowLabel(),
    };

    setChatMessages((current) => [
      ...current,
      userMessage,
      answerMessage,
    ]);

    setChatInput("");
  }

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
          {toast && (
            <div className="fixed left-5 top-5 z-50 w-[min(420px,calc(100%-2rem))]">
              {toast.type === "success" ? (
                <SuccessBanner description={toast.message} />
              ) : (
                <ErrorState description={toast.message} />
              )}
            </div>
          )}

          <PageHeader
            variant="hero"
            title="مركز الذكاء الاصطناعي"
            description="مركز موحد للمساعد الذكي، تحليل مخاطر الطلاب، التوصيات التربوية، دعم القرار، توليد التقارير، وتحليل الملفات."
            badge="AI Center Enterprise V3"
            icon={<BrainCircuit size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "مركز الذكاء الاصطناعي" },
            ]}
            meta={[
              {
                label: "المدرسة",
                value: currentSchool?.school_name || "غير متوفر",
              },
              {
                label: "جاهزية الذكاء الاصطناعي",
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
                icon: <Users size={20} />,
                tone: "blue",
              },
              {
                label: "المخاطر",
                value: metrics.riskStudents,
                icon: <ShieldAlert size={20} />,
                tone: metrics.riskStudents > 0 ? "red" : "green",
              },
              {
                label: "الحضور",
                value: `${metrics.attendanceRate}%`,
                icon: <Activity size={20} />,
                tone: metrics.attendanceRate >= 85 ? "green" : "gold",
              },
              {
                label: "الدرجات",
                value: `${metrics.gradeAverage || 0}%`,
                icon: <GraduationCap size={20} />,
                tone: metrics.gradeAverage >= 80 ? "green" : "gold",
              },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void loadAiData()}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A]"
                >
                  <RefreshCcw size={17} />
                  تحديث البيانات
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setChatMessages((current) => current.slice(0, 1));
                    showToast("success", "تم بدء جلسة جديدة");
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white"
                >
                  <Sparkles size={17} />
                  جلسة جديدة
                </button>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ExecutiveCard
              title="جاهزية الذكاء الاصطناعي"
              value={`${metrics.aiReadiness}%`}
              subtitle="اعتمادًا على جودة واكتمال البيانات"
              icon={<BrainCircuit size={24} />}
              tone={metrics.aiReadiness >= 80 ? "green" : "gold"}
              progress={metrics.aiReadiness}
            />

            <ExecutiveCard
              title="جودة البيانات"
              value={`${metrics.dataQuality}%`}
              subtitle="الطلاب والمعلمون والفصول والحضور والدرجات"
              icon={<BarChart3 size={24} />}
              tone={metrics.dataQuality >= 80 ? "green" : "gold"}
              progress={metrics.dataQuality}
            />

            <ExecutiveCard
              title="طلاب معرضون للخطر"
              value={metrics.riskStudents}
              subtitle="تحليل التحصيل والحضور والسلوك"
              icon={<AlertTriangle size={24} />}
              tone={metrics.riskStudents > 0 ? "red" : "green"}
              progress={metrics.students ? percentage(metrics.riskStudents, metrics.students) : 0}
            />

            <ExecutiveCard
              title="الإحالات المفتوحة"
              value={metrics.openReferrals}
              subtitle="حالات تحتاج متابعة"
              icon={<HeartPulse size={24} />}
              tone={metrics.openReferrals > 0 ? "gold" : "green"}
              progress={metrics.students ? percentage(metrics.openReferrals, metrics.students) : 0}
            />
          </section>

          <SummaryCard
            title="الملخص التنفيذي للذكاء الاصطناعي"
            description="قراءة موحدة لمدى جاهزية المدرسة للاستفادة من التحليلات الذكية والتنبؤ بالمخاطر ودعم القرار."
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
              { label: "جودة البيانات", value: `${metrics.dataQuality}%` },
              { label: "جاهزية AI", value: `${metrics.aiReadiness}%` },
            ]}
            footer="هذه النسخة تستخدم تحليلًا ذكيًا محليًا قائمًا على بيانات المنصة، وهي جاهزة لاحقًا للربط بخدمة نماذج ذكاء اصطناعي خارجية."
          />

          <PageToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "ابحث عن مساعد، مخاطر، تقارير، توصيات...",
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
                className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 text-right shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${insightTone(module.tone)}`}
                  >
                    {module.icon}
                  </div>
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

          {filteredModules.length === 0 && (
            <EmptyState
              title="لا توجد وحدات مطابقة"
              description="جرّب تغيير البحث أو تحديد كل الوحدات."
              icon={<Search className="h-8 w-8" />}
            />
          )}

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

          {selectedInsight && (
            <AiInsightDrawer
              insight={selectedInsight}
              metrics={metrics}
              onClose={() => setSelectedInsight(null)}
            />
          )}
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function AiExecutiveAnalytics({
  metrics,
}: {
  metrics: SchoolMetrics;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--app-text)]">
        AI Executive Analytics
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        المؤشرات التنفيذية التي يعتمد عليها مركز الذكاء الاصطناعي.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AiMetric
          label="جاهزية AI"
          value={`${metrics.aiReadiness}%`}
          icon={<BrainCircuit size={18} />}
          tone="green"
        />
        <AiMetric
          label="جودة البيانات"
          value={`${metrics.dataQuality}%`}
          icon={<BarChart3 size={18} />}
          tone="blue"
        />
        <AiMetric
          label="مخاطر الطلاب"
          value={metrics.riskStudents}
          icon={<ShieldAlert size={18} />}
          tone={metrics.riskStudents > 0 ? "red" : "green"}
        />
        <AiMetric
          label="الإحالات"
          value={metrics.openReferrals}
          icon={<HeartPulse size={18} />}
          tone="gold"
        />
      </div>
    </section>
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
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <BrainCircuit size={20} />
        AI Smart Insights
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        أبرز الملاحظات الذكية المستخرجة من بيانات المدرسة.
      </p>

      <div className="mt-5 space-y-3">
        {insights.map((insight) => (
          <button
            key={insight.title}
            type="button"
            onClick={() => onSelect(insight)}
            className="flex w-full gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 text-right transition hover:-translate-y-0.5"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${insightTone(insight.tone)}`}
            >
              {insight.icon}
            </div>
            <div>
              <p className="text-sm font-black text-[var(--app-text)]">
                {insight.title}
              </p>
              <p className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]">
                {insight.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function AiHealthPanel({
  metrics,
}: {
  metrics: SchoolMetrics;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--app-text)]">
        AI Health
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        صحة البيانات والمؤشرات المستخدمة في التحليل.
      </p>

      <div className="mt-5 space-y-4">
        <AiProgress
          label="جودة البيانات"
          value={metrics.dataQuality}
          tone="blue"
        />
        <AiProgress
          label="جاهزية AI"
          value={metrics.aiReadiness}
          tone="green"
        />
        <AiProgress
          label="الحضور"
          value={metrics.attendanceRate}
          tone="teal"
        />
        <AiProgress
          label="التحصيل"
          value={metrics.gradeAverage}
          tone="gold"
        />
      </div>
    </section>
  );
}

function AiDecisionPanel({
  metrics,
}: {
  metrics: SchoolMetrics;
}) {
  const decision =
    metrics.riskStudents > 0
      ? `ابدأ بمتابعة ${metrics.riskStudents} طالب ذوي المخاطر الأعلى.`
      : metrics.attendanceRate < 85
        ? "ابدأ بتحليل الغياب المتكرر ورفع نسبة الحضور."
        : metrics.gradeAverage < 70
          ? "ابدأ بخطة علاجية للمواد الأقل متوسطًا."
          : "المؤشرات مستقرة؛ ركز على التحسين المستمر.";

  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <Target size={20} />
        Decision Support
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        القرار المقترح حاليًا حسب أولوية المؤشرات.
      </p>

      <div className="mt-5 rounded-3xl bg-[var(--app-card-soft)] p-5">
        <p className="text-lg font-black leading-8 text-[var(--app-text)]">
          {decision}
        </p>
      </div>
    </section>
  );
}

function AiRecommendations({
  insights,
}: {
  insights: AiInsight[];
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <Lightbulb size={20} />
        Smart Recommendations
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        إجراءات عملية مقترحة.
      </p>

      <div className="mt-5 space-y-3">
        {insights.map((insight, index) => (
          <div
            key={insight.title}
            className="flex gap-3 rounded-2xl bg-[var(--app-card-soft)] p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--app-teal-soft)] text-sm font-black text-[var(--app-teal)]">
              {index + 1}
            </span>
            <p className="text-sm leading-7 text-[var(--app-text)]">
              {insight.description}
            </p>
          </div>
        ))}
      </div>
    </section>
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
    "ما أهم قرار يجب اتخاذه الآن؟",
  ];

  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <MessageSquareText size={20} />
        المساعد الذكي
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        محادثة مباشرة مع مؤشرات المدرسة الحالية.
      </p>

      <div className="mt-5 max-h-[480px] space-y-3 overflow-y-auto rounded-3xl bg-[var(--app-card-soft)] p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[88%] rounded-2xl p-4 ${
              message.role === "assistant"
                ? "mr-auto bg-white text-slate-700"
                : "ml-auto bg-[#15445A] text-white"
            }`}
          >
            <p className="text-sm leading-7">{message.content}</p>
            <p
              className={`mt-2 text-[10px] ${
                message.role === "assistant"
                  ? "text-slate-400"
                  : "text-white/60"
              }`}
            >
              {message.createdAt}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestion(suggestion)}
            className="rounded-2xl bg-[var(--app-card-soft)] px-3 py-2 text-xs font-black text-[var(--app-text)]"
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
          placeholder="اكتب سؤالك عن بيانات المدرسة..."
          className="h-12 flex-1 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text)] outline-none"
        />
        <button
          type="button"
          onClick={onSend}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#15445A] text-white"
        >
          <Send size={18} />
        </button>
      </div>
    </section>
  );
}

function AiFileAnalyzer() {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <FileSearch size={20} />
        محلل الملفات
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        واجهة جاهزة لربط تحليل Excel وPDF وCSV.
      </p>

      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--app-border)] bg-[var(--app-card-soft)] p-8 text-center">
        <FileSearch className="h-10 w-10 text-[var(--app-teal)]" />
        <span className="mt-3 font-black text-[var(--app-text)]">
          اختر ملفًا للتحليل
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
                `تم اختيار الملف: ${file.name}\nواجهة التحليل جاهزة، ويحتاج التحليل الحقيقي إلى ربط خدمة AI أو محرك الملفات.`,
              );
            }
            event.currentTarget.value = "";
          }}
        />
      </label>

      <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
        لا يتم إرسال الملفات حاليًا إلى أي مزود خارجي. هذه الواجهة جاهزة
        للربط لاحقًا مع محرك التحليل الذي تختاره.
      </div>
    </section>
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
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/40 backdrop-blur-sm">
      <button
        type="button"
        className="flex-1"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-[#C1B489]">
              AI Insight Details
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#15445A]">
              {insight.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            {insight.description}
          </div>

          <AiDrawerSection
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

          <AiDrawerSection
            title="الإجراء المقترح"
            items={[
              insight.tone === "red"
                ? "ابدأ تدخلًا عاجلًا وحدد مسؤول المتابعة."
                : insight.tone === "gold"
                  ? "أنشئ خطة متابعة قصيرة وراجع المؤشر أسبوعيًا."
                  : "استمر في المتابعة والتحسين التدريجي.",
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
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${insightTone(tone)}`}
      >
        {icon}
      </div>
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
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-bold text-[var(--app-text-muted)]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--app-card-soft)]">
        <div
          className={`h-full rounded-full ${progressTone(tone)}`}
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function AiDrawerSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="mb-2 text-sm font-black text-[#15445A]">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <p key={item} className="text-xs leading-6 text-slate-500">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

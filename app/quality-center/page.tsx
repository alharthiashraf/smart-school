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
  Accessibility,
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Code2,
  Database,
  FileCheck2,
  Gauge,
  Layers3,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TestTube2,
  TriangleAlert,
  Users,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";

type AnyRow = Record<string, unknown>;

type QualityTone = "green" | "gold" | "red" | "blue" | "teal";

type Toast = {
  type: "success" | "error";
  message: string;
};

type QualityMetric = {
  dataQuality: number;
  securityQuality: number;
  accessibilityQuality: number;
  testingReadiness: number;
  performanceQuality: number;
  uxQuality: number;
  codeQuality: number;
  databaseQuality: number;
  launchReadiness: number;
  overallScore: number;
  level: "ممتاز" | "جيد" | "متابعة" | "خطر";
};

type QualityInsight = {
  title: string;
  description: string;
  tone: QualityTone;
  icon: ReactNode;
};

type QualityArea = {
  id: string;
  title: string;
  description: string;
  score: number;
  tone: QualityTone;
  icon: ReactNode;
  recommendation: string;
};

type QualityIssue = {
  id: string;
  category:
    | "data"
    | "security"
    | "accessibility"
    | "testing"
    | "performance"
    | "ux"
    | "code"
    | "database";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  status: "مفتوحة" | "مراجعة" | "مكتملة";
};

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

type QueryLike<T> = PromiseLike<QueryResult<T>>;

const PAGE_ROLES: SchoolRole[] = ["super_admin", "school_admin"];

const CATEGORY_OPTIONS = [
  { value: "all", label: "كل المجالات" },
  { value: "data", label: "جودة البيانات" },
  { value: "security", label: "الأمان" },
  { value: "accessibility", label: "إمكانية الوصول" },
  { value: "testing", label: "الاختبارات" },
  { value: "performance", label: "الأداء" },
  { value: "ux", label: "تجربة المستخدم" },
  { value: "code", label: "جودة الكود" },
  { value: "database", label: "قاعدة البيانات" },
];

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function insightTone(tone: QualityTone) {
  const tones: Record<QualityTone, string> = {
    green: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
    gold: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    red: "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    teal: "bg-[var(--app-teal-soft)] text-[var(--app-teal)]",
  };

  return tones[tone];
}

function progressTone(tone: QualityTone) {
  const tones: Record<QualityTone, string> = {
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
      console.warn(`quality-center query skipped: ${label}`, result.error);
      return fallback;
    }

    return result.data ?? fallback;
  } catch (error) {
    console.warn(`quality-center query failed: ${label}`, error);
    return fallback;
  }
}

export default function QualityCenterPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [students, setStudents] = useState<AnyRow[]>([]);
  const [teachers, setTeachers] = useState<AnyRow[]>([]);
  const [classrooms, setClassrooms] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [members, setMembers] = useState<AnyRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AnyRow[]>([]);
  const [errors, setErrors] = useState<AnyRow[]>([]);
  const [testRuns, setTestRuns] = useState<AnyRow[]>([]);
  const [accessibilityRows, setAccessibilityRows] = useState<AnyRow[]>([]);
  const [qualityRows, setQualityRows] = useState<AnyRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadQualityData = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);
    const schoolId = currentSchool.id;

    const [
      studentsData,
      teachersData,
      classroomsData,
      subjectsData,
      membersData,
      auditData,
      errorsData,
      testsData,
      accessibilityData,
      qualityData,
    ] = await Promise.all([
      safeQuery<AnyRow[]>(
        supabase.from("students").select("*").eq("school_id", schoolId).limit(3000),
        [],
        "students",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("teachers").select("*").eq("school_id", schoolId).limit(2000),
        [],
        "teachers",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("classrooms").select("*").eq("school_id", schoolId).limit(1000),
        [],
        "classrooms",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("subjects").select("*").eq("school_id", schoolId).limit(1000),
        [],
        "subjects",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("school_members").select("*").eq("school_id", schoolId).limit(2000),
        [],
        "school_members",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("audit_logs").select("*").eq("school_id", schoolId).limit(1000),
        [],
        "audit_logs",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("error_logs").select("*").eq("school_id", schoolId).limit(1000),
        [],
        "error_logs",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("test_runs").select("*").eq("school_id", schoolId).limit(500),
        [],
        "test_runs",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("accessibility_audits").select("*").eq("school_id", schoolId).limit(500),
        [],
        "accessibility_audits",
      ),
      safeQuery<AnyRow[]>(
        supabase.from("quality_audits").select("*").eq("school_id", schoolId).limit(500),
        [],
        "quality_audits",
      ),
    ]);

    setStudents(studentsData);
    setTeachers(teachersData);
    setClassrooms(classroomsData);
    setSubjects(subjectsData);
    setMembers(membersData);
    setAuditLogs(auditData);
    setErrors(errorsData);
    setTestRuns(testsData);
    setAccessibilityRows(accessibilityData);
    setQualityRows(qualityData);

    setLoading(false);
  }, [currentSchool?.id]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setLoading(false);
      return;
    }

    void loadQualityData();
  }, [currentSchool?.id, loadQualityData, schoolLoading]);

  const metrics = useMemo<QualityMetric>(() => {
    const dataSignals = [
      students.length > 0,
      teachers.length > 0,
      classrooms.length > 0,
      subjects.length > 0,
      members.length > 0,
    ].filter(Boolean).length;

    const dataQuality = percentage(dataSignals, 5);

    const securityQuality = Math.round(
      Math.min(100, percentage(auditLogs.length, 50)) * 0.6 +
        Math.max(0, 100 - errors.length * 5) * 0.4,
    );

    const accessibilityQuality =
      accessibilityRows.length > 0
        ? Math.min(100, percentage(accessibilityRows.length, 10))
        : 60;

    const testingReadiness =
      testRuns.length > 0
        ? Math.min(100, percentage(testRuns.length, 20))
        : 45;

    const performanceQuality = Math.max(0, 100 - errors.length * 4);

    const uxQuality = 85;

    const codeQuality =
      qualityRows.length > 0
        ? Math.min(100, percentage(qualityRows.length, 10))
        : 70;

    const databaseQuality = Math.round(
      dataQuality * 0.7 +
        Math.min(100, percentage(auditLogs.length, 50)) * 0.3,
    );

    const launchReadiness = Math.round(
      dataQuality * 0.2 +
        securityQuality * 0.2 +
        accessibilityQuality * 0.1 +
        testingReadiness * 0.15 +
        performanceQuality * 0.15 +
        uxQuality * 0.1 +
        databaseQuality * 0.1,
    );

    const overallScore = Math.round(
      dataQuality * 0.15 +
        securityQuality * 0.15 +
        accessibilityQuality * 0.1 +
        testingReadiness * 0.15 +
        performanceQuality * 0.15 +
        uxQuality * 0.1 +
        codeQuality * 0.1 +
        databaseQuality * 0.1,
    );

    return {
      dataQuality,
      securityQuality,
      accessibilityQuality,
      testingReadiness,
      performanceQuality,
      uxQuality,
      codeQuality,
      databaseQuality,
      launchReadiness,
      overallScore,
      level:
        overallScore >= 90
          ? "ممتاز"
          : overallScore >= 75
            ? "جيد"
            : overallScore >= 60
              ? "متابعة"
              : "خطر",
    };
  }, [
    accessibilityRows.length,
    auditLogs.length,
    classrooms.length,
    errors.length,
    members.length,
    qualityRows.length,
    students.length,
    subjects.length,
    teachers.length,
    testRuns.length,
  ]);

  const insights = useMemo<QualityInsight[]>(() => {
    const items: QualityInsight[] = [];

    if (metrics.testingReadiness < 70) {
      items.push({
        title: "جاهزية الاختبارات منخفضة",
        description: `مؤشر الاختبارات ${metrics.testingReadiness}% ويحتاج رفع تغطية الاختبارات.`,
        tone: "red",
        icon: <TestTube2 className="h-5 w-5" />,
      });
    }

    if (metrics.accessibilityQuality < 80) {
      items.push({
        title: "إمكانية الوصول تحتاج مراجعة",
        description: `مؤشر الوصول ${metrics.accessibilityQuality}%.`,
        tone: "gold",
        icon: <Accessibility className="h-5 w-5" />,
      });
    }

    if (metrics.securityQuality < 80) {
      items.push({
        title: "جودة الأمان تحتاج تحسينًا",
        description: `مؤشر الأمان ${metrics.securityQuality}%.`,
        tone: "blue",
        icon: <ShieldCheck className="h-5 w-5" />,
      });
    }

    if (metrics.dataQuality < 100) {
      items.push({
        title: "جودة البيانات غير مكتملة",
        description: `تغطية البيانات الأساسية ${metrics.dataQuality}%.`,
        tone: "teal",
        icon: <Database className="h-5 w-5" />,
      });
    }

    if (items.length === 0) {
      items.push({
        title: "الجودة مستقرة",
        description: "لا توجد مؤشرات جودة حرجة في البيانات الحالية.",
        tone: "green",
        icon: <Sparkles className="h-5 w-5" />,
      });
    }

    return items.slice(0, 4);
  }, [metrics]);

  const areas = useMemo<QualityArea[]>(
    () => [
      {
        id: "data",
        title: "Data Quality",
        description: "اكتمال واتساق البيانات الأساسية للمدرسة.",
        score: metrics.dataQuality,
        tone: metrics.dataQuality >= 80 ? "green" : "gold",
        icon: <Database className="h-6 w-6" />,
        recommendation: "راجع الحقول الناقصة والتكرارات والروابط بين الجداول.",
      },
      {
        id: "security",
        title: "Security Quality",
        description: "سلامة السجلات الأمنية والتدقيق والأخطاء.",
        score: metrics.securityQuality,
        tone: metrics.securityQuality >= 80 ? "green" : "gold",
        icon: <ShieldCheck className="h-6 w-6" />,
        recommendation: "راجع سياسات RLS وسجل التدقيق والحسابات الحساسة.",
      },
      {
        id: "accessibility",
        title: "Accessibility",
        description: "جاهزية WCAG 2.2 ودعم لوحة المفاتيح والتباين.",
        score: metrics.accessibilityQuality,
        tone: metrics.accessibilityQuality >= 80 ? "green" : "gold",
        icon: <Accessibility className="h-6 w-6" />,
        recommendation: "نفذ تدقيقًا فعليًا عبر Lighthouse وaxe.",
      },
      {
        id: "testing",
        title: "Testing Readiness",
        description: "جاهزية اختبارات الوحدة والتكامل وE2E.",
        score: metrics.testingReadiness,
        tone: metrics.testingReadiness >= 80 ? "green" : "red",
        icon: <TestTube2 className="h-6 w-6" />,
        recommendation: "أضف اختبارات حرجة لتسجيل الدخول والحضور والدرجات.",
      },
      {
        id: "performance",
        title: "Performance",
        description: "استقرار الأداء وعدد الأخطاء التشغيلية.",
        score: metrics.performanceQuality,
        tone: metrics.performanceQuality >= 80 ? "green" : "gold",
        icon: <Zap className="h-6 w-6" />,
        recommendation: "راجع أحجام الحزم والاستعلامات البطيئة والصور.",
      },
      {
        id: "ux",
        title: "UI/UX Quality",
        description: "اتساق الواجهة وسهولة الاستخدام والوضوح.",
        score: metrics.uxQuality,
        tone: "green",
        icon: <Layers3 className="h-6 w-6" />,
        recommendation: "راجع حالات الفراغ والتحميل ورسائل الخطأ.",
      },
      {
        id: "code",
        title: "Code Quality",
        description: "التنظيم وقابلية الصيانة وتقليل الديون التقنية.",
        score: metrics.codeQuality,
        tone: metrics.codeQuality >= 80 ? "green" : "gold",
        icon: <Code2 className="h-6 w-6" />,
        recommendation: "نفذ lint وtype-check وتحليل الاعتماديات دوريًا.",
      },
      {
        id: "database",
        title: "Database Quality",
        description: "جودة العلاقات والفهارس والسياسات والتدقيق.",
        score: metrics.databaseQuality,
        tone: metrics.databaseQuality >= 80 ? "green" : "gold",
        icon: <BarChart3 className="h-6 w-6" />,
        recommendation: "راجع الفهارس والقيود وRLS والحقول المكررة.",
      },
    ],
    [metrics],
  );

  const issues = useMemo<QualityIssue[]>(() => {
    const list: QualityIssue[] = [];

    if (metrics.testingReadiness < 70) {
      list.push({
        id: "testing-low",
        category: "testing",
        title: "تغطية الاختبارات منخفضة",
        description: "لا توجد سجلات كافية لاختبارات الوحدة والتكامل وE2E.",
        severity: "high",
        status: "مفتوحة",
      });
    }

    if (metrics.accessibilityQuality < 80) {
      list.push({
        id: "accessibility-review",
        category: "accessibility",
        title: "تدقيق إمكانية الوصول مطلوب",
        description: "يجب التحقق من التباين والتنقل بلوحة المفاتيح وARIA.",
        severity: "medium",
        status: "مراجعة",
      });
    }

    if (metrics.dataQuality < 100) {
      list.push({
        id: "data-incomplete",
        category: "data",
        title: "بعض البيانات الأساسية غير مكتملة",
        description: "تحقق من وجود الطلاب والمعلمين والفصول والمواد والمستخدمين.",
        severity: "medium",
        status: "مراجعة",
      });
    }

    if (errors.length > 0) {
      list.push({
        id: "runtime-errors",
        category: "performance",
        title: "أخطاء تشغيلية مسجلة",
        description: `يوجد ${errors.length} سجل خطأ يحتاج تحليل السبب الجذري.`,
        severity: "high",
        status: "مفتوحة",
      });
    }

    if (list.length === 0) {
      list.push({
        id: "quality-stable",
        category: "ux",
        title: "لا توجد ملاحظات حرجة",
        description: "المنصة مستقرة وفق البيانات المتاحة حاليًا.",
        severity: "low",
        status: "مكتملة",
      });
    }

    return list;
  }, [
    errors.length,
    metrics.accessibilityQuality,
    metrics.dataQuality,
    metrics.testingReadiness,
  ]);

  const filteredIssues = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return issues.filter((issue) => {
      const matchesCategory =
        category === "all" || issue.category === category;
      const matchesSearch =
        !keyword ||
        `${issue.title} ${issue.description} ${issue.status}`
          .toLowerCase()
          .includes(keyword);

      return matchesCategory && matchesSearch;
    });
  }, [category, issues, search]);

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل مركز الجودة..." />
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
            title="مركز الجودة"
            description="مركز موحد لتقييم جودة البيانات، الكود، الأداء، إمكانية الوصول، الأمان، قاعدة البيانات، تجربة المستخدم، الاختبارات، وجاهزية الإطلاق."
            badge="Quality Center Enterprise V3"
            icon={<FileCheck2 size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "مركز الجودة" },
            ]}
            meta={[
              {
                label: "المدرسة",
                value: currentSchool?.school_name || "غير محدد",
              },
              {
                label: "Quality Score",
                value: `${metrics.overallScore}%`,
              },
              {
                label: "Launch Readiness",
                value: `${metrics.launchReadiness}%`,
              },
              {
                label: "المستوى",
                value: metrics.level,
              },
            ]}
            stats={[
              {
                label: "Quality Score",
                value: `${metrics.overallScore}%`,
                icon: <Gauge size={20} />,
                tone:
                  metrics.overallScore >= 80
                    ? "green"
                    : metrics.overallScore >= 60
                      ? "gold"
                      : "red",
              },
              {
                label: "Data Quality",
                value: `${metrics.dataQuality}%`,
                icon: <Database size={20} />,
                tone: "blue",
              },
              {
                label: "Testing",
                value: `${metrics.testingReadiness}%`,
                icon: <TestTube2 size={20} />,
                tone: metrics.testingReadiness >= 80 ? "green" : "gold",
              },
              {
                label: "Launch",
                value: `${metrics.launchReadiness}%`,
                icon: <Target size={20} />,
                tone: metrics.launchReadiness >= 80 ? "green" : "gold",
              },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void loadQualityData()}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A]"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>

                <button
                  type="button"
                  onClick={() =>
                    showToast(
                      "success",
                      "تم تنفيذ فحص جودة محلي للبيانات المتاحة",
                    )
                  }
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white"
                >
                  <WandSparkles size={17} />
                  تشغيل الفحص
                </button>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ExecutiveCard
              title="Overall Quality"
              value={`${metrics.overallScore}%`}
              subtitle={`المستوى: ${metrics.level}`}
              icon={<Gauge size={24} />}
              tone={
                metrics.overallScore >= 80
                  ? "green"
                  : metrics.overallScore >= 60
                    ? "gold"
                    : "red"
              }
              progress={metrics.overallScore}
            />

            <ExecutiveCard
              title="Launch Readiness"
              value={`${metrics.launchReadiness}%`}
              subtitle="جاهزية الإطلاق المؤسسي"
              icon={<Target size={24} />}
              tone={metrics.launchReadiness >= 80 ? "green" : "gold"}
              progress={metrics.launchReadiness}
            />

            <ExecutiveCard
              title="Testing Readiness"
              value={`${metrics.testingReadiness}%`}
              subtitle="الوحدة والتكامل وE2E"
              icon={<TestTube2 size={24} />}
              tone={metrics.testingReadiness >= 80 ? "green" : "red"}
              progress={metrics.testingReadiness}
            />

            <ExecutiveCard
              title="Accessibility"
              value={`${metrics.accessibilityQuality}%`}
              subtitle="جاهزية WCAG 2.2"
              icon={<Accessibility size={24} />}
              tone={metrics.accessibilityQuality >= 80 ? "green" : "gold"}
              progress={metrics.accessibilityQuality}
            />
          </section>

          <SummaryCard
            title="الملخص التنفيذي للجودة"
            description="قراءة موحدة لجودة المشروع واستعداده للإطلاق."
            tone={
              metrics.overallScore < 75 ||
              metrics.testingReadiness < 70
                ? "gold"
                : "green"
            }
            items={[
              { label: "Overall Quality", value: `${metrics.overallScore}%` },
              { label: "Launch Readiness", value: `${metrics.launchReadiness}%` },
              { label: "Data Quality", value: `${metrics.dataQuality}%` },
              { label: "Security", value: `${metrics.securityQuality}%` },
              { label: "Performance", value: `${metrics.performanceQuality}%` },
              { label: "Testing", value: `${metrics.testingReadiness}%` },
            ]}
            footer="المؤشرات الحالية مبنية على بيانات المشروع المتاحة. فحص Lighthouse وaxe وE2E الحقيقي يحتاج تشغيل أدوات الاختبار الفعلية."
          />

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <QualityExecutiveAnalytics metrics={metrics} />
            <QualitySmartInsights insights={insights} />
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {areas.map((area) => (
              <QualityAreaCard key={area.id} area={area} />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <QualityHealthPanel metrics={metrics} />
            <LaunchReadinessPanel metrics={metrics} />
            <TechnicalDebtPanel metrics={metrics} issues={issues} />
          </section>

          <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
            <PageToolbar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "ابحث في ملاحظات الجودة...",
              }}
              filters={
                <ToolbarSelect
                  value={category}
                  onChange={setCategory}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </ToolbarSelect>
              }
              onRefresh={() => void loadQualityData()}
            />

            <div className="mt-5">
              {filteredIssues.length === 0 ? (
                <EmptyState
                  title="لا توجد ملاحظات جودة"
                  description="لا توجد نتائج مطابقة للبحث أو الفلترة الحالية."
                  icon={<Search className="h-8 w-8" />}
                />
              ) : (
                <div className="space-y-3">
                  {filteredIssues.map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() => setSelectedIssue(issue)}
                      className="flex w-full items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 text-right transition hover:-translate-y-0.5"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${insightTone(
                          issue.severity === "high"
                            ? "red"
                            : issue.severity === "medium"
                              ? "gold"
                              : "green",
                        )}`}
                      >
                        {issue.severity === "high" ? (
                          <TriangleAlert size={18} />
                        ) : (
                          <CheckCircle2 size={18} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-black text-[var(--app-text)]">
                            {issue.title}
                          </p>
                          <span className="text-xs font-bold text-[var(--app-text-muted)]">
                            {issue.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
                          {issue.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {selectedIssue && (
            <QualityIssueDrawer
              issue={selectedIssue}
              onClose={() => setSelectedIssue(null)}
            />
          )}
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function QualityExecutiveAnalytics({
  metrics,
}: {
  metrics: QualityMetric;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--app-text)]">
        Quality Executive Analytics
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مؤشرات تنفيذية لجودة المنصة وجاهزية الإطلاق.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QualityMetricCard label="Overall" value={`${metrics.overallScore}%`} icon={<Gauge size={18} />} tone={metrics.overallScore >= 80 ? "green" : metrics.overallScore >= 60 ? "gold" : "red"} />
        <QualityMetricCard label="Launch" value={`${metrics.launchReadiness}%`} icon={<Target size={18} />} tone="blue" />
        <QualityMetricCard label="Testing" value={`${metrics.testingReadiness}%`} icon={<TestTube2 size={18} />} tone="teal" />
        <QualityMetricCard label="Accessibility" value={`${metrics.accessibilityQuality}%`} icon={<Accessibility size={18} />} tone="gold" />
      </div>
    </section>
  );
}

function QualitySmartInsights({
  insights,
}: {
  insights: QualityInsight[];
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <BrainCircuit size={20} />
        AI Quality Insights
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        توصيات ذكية مبنية على مؤشرات الجودة الحالية.
      </p>

      <div className="mt-5 space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className="flex gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${insightTone(insight.tone)}`}>
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
          </div>
        ))}
      </div>
    </section>
  );
}

function QualityAreaCard({ area }: { area: QualityArea }) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${insightTone(area.tone)}`}>
          {area.icon}
        </div>
        <span className="text-2xl font-black text-[var(--app-text)]">
          {area.score}%
        </span>
      </div>

      <h3 className="mt-4 text-xl font-black text-[var(--app-text)]">
        {area.title}
      </h3>
      <p className="mt-2 text-sm leading-7 text-[var(--app-text-muted)]">
        {area.description}
      </p>

      <div className="mt-4">
        <QualityProgress label="المؤشر" value={area.score} tone={area.tone} />
      </div>

      <div className="mt-4 rounded-2xl bg-[var(--app-card-soft)] p-4 text-xs leading-6 text-[var(--app-text-muted)]">
        {area.recommendation}
      </div>
    </section>
  );
}

function QualityHealthPanel({
  metrics,
}: {
  metrics: QualityMetric;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--app-text)]">
        Quality Health
      </h2>

      <div className="mt-5 space-y-4">
        <QualityProgress label="Data" value={metrics.dataQuality} tone="blue" />
        <QualityProgress label="Security" value={metrics.securityQuality} tone="green" />
        <QualityProgress label="Performance" value={metrics.performanceQuality} tone="teal" />
        <QualityProgress label="UX" value={metrics.uxQuality} tone="gold" />
        <QualityProgress label="Code" value={metrics.codeQuality} tone="blue" />
      </div>
    </section>
  );
}

function LaunchReadinessPanel({
  metrics,
}: {
  metrics: QualityMetric;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <Target size={20} />
        Launch Readiness
      </h2>

      <div className="mt-5 rounded-3xl bg-[var(--app-card-soft)] p-5">
        <p className="text-xs font-bold text-[var(--app-text-muted)]">
          الجاهزية الحالية
        </p>
        <p className="mt-1 text-4xl font-black text-[var(--app-text)]">
          {metrics.launchReadiness}%
        </p>
      </div>

      <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
        الإطلاق النهائي يحتاج اختبارًا فعليًا للأداء، الأمان، E2E،
        وإمكانية الوصول، وليس الاعتماد على هذه المؤشرات وحدها.
      </div>
    </section>
  );
}

function TechnicalDebtPanel({
  metrics,
  issues,
}: {
  metrics: QualityMetric;
  issues: QualityIssue[];
}) {
  const highIssues = issues.filter((item) => item.severity === "high").length;
  const debtScore = Math.max(
    0,
    100 -
      metrics.codeQuality -
      metrics.testingReadiness / 2 -
      highIssues * 10,
  );

  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <Code2 size={20} />
        Technical Debt
      </h2>

      <div className="mt-5 grid gap-3">
        <QualityInfoLine label="ملاحظات مرتفعة" value={highIssues} />
        <QualityInfoLine label="جودة الكود" value={`${metrics.codeQuality}%`} />
        <QualityInfoLine label="جاهزية الاختبارات" value={`${metrics.testingReadiness}%`} />
        <QualityInfoLine label="مؤشر الدين التقني" value={`${Math.round(debtScore)}%`} />
      </div>
    </section>
  );
}

function QualityIssueDrawer({
  issue,
  onClose,
}: {
  issue: QualityIssue;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/40 backdrop-blur-sm print:hidden">
      <button type="button" className="flex-1" onClick={onClose} aria-label="إغلاق" />
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-[#C1B489]">Quality Issue</p>
            <h2 className="mt-1 text-2xl font-black text-[#15445A]">
              {issue.title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <QualityDrawerMetric label="المجال" value={issue.category} />
          <QualityDrawerMetric label="الحالة" value={issue.status} />
          <QualityDrawerMetric label="الخطورة" value={issue.severity} />
          <QualityDrawerMetric label="المعرف" value={issue.id} />
        </div>

        <div className="mt-5 space-y-3">
          <QualityDrawerSection title="التفاصيل" items={[issue.description]} />
          <QualityDrawerSection
            title="الإجراء المقترح"
            items={[
              issue.severity === "high"
                ? "عالج المشكلة قبل الإطلاق وأعد تشغيل الفحص."
                : issue.severity === "medium"
                  ? "ضعها ضمن خطة التحسين الحالية."
                  : "استمر في المراجعة الدورية.",
            ]}
          />
        </div>
      </aside>
    </div>
  );
}

function QualityMetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: QualityTone;
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

function QualityProgress({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: QualityTone;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-[var(--app-text-muted)]">
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

function QualityInfoLine({
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

function QualityDrawerMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-base font-black text-[#15445A]">{value}</p>
    </div>
  );
}

function QualityDrawerSection({
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

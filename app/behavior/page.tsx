"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageActions from "@/components/layout/PageActions";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import RoleGuard from "@/components/auth/RoleGuard";
import { STAFF_ROLES } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ChartNoAxesCombined,
  Clock,
  Eye,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  ShieldAlert,
  Target,
  TrendingDown,
  UserRoundSearch,
  Trash2,
  Loader2,
  X,
} from "lucide-react";

type Student = {
  id: string;
  school_id: string | null;
  full_name: string;
  grade_level: string | null;
  classroom: string | null;
  section: string | null;
  student_number: string | null;
};

type Violation = {
  id: string;
  school_id: string | null;
  student_id: string;
  violation_title: string;
  violation_degree: number;
  points_deducted: number;
  violation_date: string;
  action_taken: string | null;
  notes: string | null;
  status: string | null;
  reported_by_name: string | null;
  reported_by_role: string | null;
  created_at: string;
  students?: {
    full_name: string;
    grade_level: string | null;
    classroom: string | null;
    section: string | null;
    student_number: string | null;
  } | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type BehaviorInsightTone = "green" | "gold" | "red" | "blue" | "teal";

type BehaviorInsight = {
  title: string;
  description: string;
  tone: BehaviorInsightTone;
  icon: ReactNode;
};

type BehaviorHealth = {
  closureRate: number;
  followUpRate: number;
  highSeverityRate: number;
  documentationRate: number;
  averageDeduction: number;
};

type StudentBehaviorRisk = {
  studentId: string;
  studentName: string;
  violations: number;
  deducted: number;
  highSeverity: number;
  score: number;
  label: "مستقر" | "متابعة" | "خطر";
};

type DistributionItem = {
  name: string;
  count: number;
};


const VIOLATION_OPTIONS = [
  { title: "التأخر الصباحي", degree: 1, points: 1 },
  {
    title: "عدم التقيد بالزي المدرسي",
    degree: 1,
    points: 1,
  },
  { title: "التأخر عن دخول الحصة", degree: 1, points: 1 },
  {
    title:
      "تناول الأطعمة أو المشروبات أثناء الدرس بدون استئذان",
    degree: 1,
    points: 1,
  },
  { title: "النوم داخل الفصل", degree: 1, points: 1 },

  {
    title: "عدم حضور الحصة أو الهروب منها",
    degree: 2,
    points: 2,
  },
  {
    title:
      "الدخول أو الخروج من الفصل دون استئذان",
    degree: 2,
    points: 2,
  },
  {
    title: "دخول فصل آخر دون استئذان",
    degree: 2,
    points: 2,
  },
  {
    title: "إثارة الفوضى داخل الفصل أو المدرسة",
    degree: 2,
    points: 2,
  },
  {
    title: "الشجار أو الاشتراك في مضاربة",
    degree: 2,
    points: 2,
  },
  {
    title: "التلفظ بكلمات غير لائقة",
    degree: 2,
    points: 2,
  },
  {
    title: "إلحاق الضرر بممتلكات الطلبة",
    degree: 2,
    points: 2,
  },
  {
    title: "العبث بتجهيزات المدرسة أو مبانيها",
    degree: 2,
    points: 2,
  },

  {
    title:
      "إلحاق الضرر المتعمد بتجهيزات المدرسة",
    degree: 3,
    points: 3,
  },
  {
    title:
      "سرقة شيء من ممتلكات الطلبة أو المدرسة",
    degree: 3,
    points: 3,
  },
  {
    title: "التعرض لأحد الطلبة بالضرب",
    degree: 3,
    points: 3,
  },
  {
    title: "التصوير أو التسجيل الصوتي للطلبة",
    degree: 3,
    points: 3,
  },
  { title: "الهروب من المدرسة", degree: 3, points: 3 },
  {
    title: "التوقيع عن ولي الأمر دون علمه",
    degree: 3,
    points: 3,
  },
  {
    title: "إحضار أو استخدام مواد أو ألعاب خطرة",
    degree: 3,
    points: 3,
  },

  {
    title:
      "الإساءة أو الاستهزاء بشيء من شعائر الإسلام",
    degree: 4,
    points: 10,
  },
  {
    title: "الإساءة للدولة أو رموزها",
    degree: 4,
    points: 10,
  },
  { title: "التحرش الجسدي", degree: 4, points: 10 },
  {
    title: "إشعال النار داخل المدرسة",
    degree: 4,
    points: 10,
  },
  {
    title: "حيازة السجائر بأنواعها",
    degree: 4,
    points: 10,
  },
  { title: "التدخين داخل المدرسة", degree: 4, points: 10 },
  { title: "حيازة آلة حادة", degree: 4, points: 10 },
  { title: "الجرائم المعلوماتية", degree: 4, points: 10 },
  { title: "التنمر بجميع أنواعه", degree: 4, points: 10 },
];

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function insightTone(tone: BehaviorInsightTone) {
  const tones: Record<BehaviorInsightTone, string> = {
    green: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
    gold: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    red: "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    teal: "bg-[var(--app-teal-soft)] text-[var(--app-teal)]",
  };

  return tones[tone];
}

function progressTone(tone: BehaviorInsightTone) {
  const tones: Record<BehaviorInsightTone, string> = {
    green: "bg-[var(--app-green)]",
    gold: "bg-[var(--app-accent)]",
    red: "bg-[var(--app-destructive)]",
    blue: "bg-[var(--app-blue)]",
    teal: "bg-[var(--app-teal)]",
  };

  return tones[tone];
}

function buildBehaviorRecommendations(item: Violation) {
  const recommendations: string[] = [];

  if (item.violation_degree >= 4) {
    recommendations.push("تتطلب المخالفة تصعيدًا إداريًا وخطة متابعة موثقة.");
  } else if (item.violation_degree === 3) {
    recommendations.push("يوصى بإحالة الحالة للمرشد الطلابي ومتابعة ولي الأمر.");
  } else if (item.violation_degree === 2) {
    recommendations.push("يوصى بإجراء تربوي واضح ومتابعة تكرار السلوك.");
  } else {
    recommendations.push("يمكن معالجة الحالة بتوجيه تربوي ومتابعة قصيرة.");
  }

  if (!item.action_taken) {
    recommendations.push("أضف الإجراء المتخذ لرفع جودة التوثيق.");
  }

  if (!item.notes) {
    recommendations.push("أضف ملاحظات توضح سياق المخالفة.");
  }

  if ((item.status || "مفتوحة") === "مفتوحة") {
    recommendations.push("الحالة ما زالت مفتوحة وتحتاج قرار متابعة.");
  }

  return recommendations;
}

export default function BehaviorPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [students, setStudents] = useState<Student[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [degreeFilter, setDegreeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [selectedViolation, setSelectedViolation] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [notes, setNotes] = useState("");

  const [toast, setToast] = useState<Toast | null>(null);
  const [selectedViolationDetails, setSelectedViolationDetails] =
    useState<Violation | null>(null);

  const selectedOption = useMemo(() => {
    return VIOLATION_OPTIONS.find((item) => item.title === selectedViolation);
  }, [selectedViolation]);

  useEffect(() => {
    if (!schoolLoading) {
      fetchData();
    }
  }, [schoolLoading, currentSchool?.id]);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function fetchData() {
    setLoading(true);

    try {
      let studentsQuery = supabase
        .from("students")
        .select(
          "id, school_id, full_name, grade_level, classroom, section, student_number",
        )
        .order("full_name", { ascending: true });

      if (currentSchool?.id) {
        studentsQuery = studentsQuery.eq("school_id", currentSchool.id);
      }

      const { data: studentsData, error: studentsError } = await studentsQuery;

      if (studentsError) throw studentsError;

      let violationsQuery = supabase
        .from("student_violations")
        .select(
          `
          *,
          students (
            full_name,
            grade_level,
            classroom,
            section,
            student_number
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (currentSchool?.id) {
        violationsQuery = violationsQuery.eq("school_id", currentSchool.id);
      }

      const { data: violationsData, error: violationsError } =
        await violationsQuery;

      if (violationsError) throw violationsError;

      setStudents((studentsData as Student[]) || []);
      setViolations((violationsData as Violation[]) || []);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر تحميل بيانات السلوك";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  const filteredViolations = useMemo(() => {
    let list = violations;

    if (degreeFilter !== "all") {
      list = list.filter(
        (item) => item.violation_degree === Number(degreeFilter),
      );
    }

    if (statusFilter !== "all") {
      list = list.filter(
        (item) => (item.status || "مفتوحة") === statusFilter,
      );
    }

    const q = search.trim();

    if (q) {
      list = list.filter((item) => {
        return (
          item.violation_title.includes(q) ||
          item.students?.full_name?.includes(q) ||
          item.students?.student_number?.includes(q) ||
          item.action_taken?.includes(q) ||
          item.notes?.includes(q) ||
          item.reported_by_name?.includes(q) ||
          item.reported_by_role?.includes(q)
        );
      });
    }

    return list;
  }, [violations, search, degreeFilter, statusFilter]);

  const totalViolations = violations.length;

  const openViolations = violations.filter(
    (item) => (item.status || "مفتوحة") === "مفتوحة",
  ).length;

  const followViolations = violations.filter(
    (item) => item.status === "تحت المتابعة",
  ).length;

  const closedViolations = violations.filter(
    (item) => item.status === "مغلقة",
  ).length;

  const totalDeducted = violations.reduce(
    (sum, item) => sum + Number(item.points_deducted || 0),
    0,
  );

  const highViolations = violations.filter(
    (item) => Number(item.violation_degree || 0) >= 3,
  ).length;

  const health = useMemo<BehaviorHealth>(() => {
    const documented = violations.filter(
      (item) => Boolean(item.action_taken) && Boolean(item.notes),
    ).length;

    return {
      closureRate: percentage(closedViolations, totalViolations),
      followUpRate: percentage(followViolations, totalViolations),
      highSeverityRate: percentage(highViolations, totalViolations),
      documentationRate: percentage(documented, totalViolations),
      averageDeduction: totalViolations
        ? Math.round((totalDeducted / totalViolations) * 10) / 10
        : 0,
    };
  }, [
    closedViolations,
    followViolations,
    highViolations,
    totalDeducted,
    totalViolations,
    violations,
  ]);

  const distributions = useMemo(() => {
    const count = (values: string[]): DistributionItem[] => {
      const map = new Map<string, number>();

      values.forEach((value) => {
        const key = value || "غير محدد";
        map.set(key, (map.get(key) || 0) + 1);
      });

      return Array.from(map.entries())
        .map(([name, countValue]) => ({ name, count: countValue }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      degrees: count(
        violations.map((item) => `الدرجة ${item.violation_degree}`),
      ),
      statuses: count(
        violations.map((item) => item.status || "مفتوحة"),
      ),
      titles: count(
        violations.map((item) => item.violation_title),
      ),
    };
  }, [violations]);

  const studentRisks = useMemo<StudentBehaviorRisk[]>(() => {
    const map = new Map<string, StudentBehaviorRisk>();

    violations.forEach((item) => {
      const studentId = item.student_id;
      const current = map.get(studentId) || {
        studentId,
        studentName: item.students?.full_name || "غير محدد",
        violations: 0,
        deducted: 0,
        highSeverity: 0,
        score: 0,
        label: "مستقر" as const,
      };

      current.violations += 1;
      current.deducted += Number(item.points_deducted || 0);
      if (Number(item.violation_degree || 0) >= 3) current.highSeverity += 1;

      current.score =
        current.deducted * 2 +
        current.highSeverity * 20 +
        current.violations * 5;

      current.label =
        current.score >= 60
          ? "خطر"
          : current.score >= 25
            ? "متابعة"
            : "مستقر";

      map.set(studentId, current);
    });

    return Array.from(map.values()).sort((a, b) => b.score - a.score);
  }, [violations]);

  const smartInsights = useMemo<BehaviorInsight[]>(() => {
    const items: BehaviorInsight[] = [];

    if (highViolations > 0) {
      items.push({
        title: "مخالفات مرتفعة الخطورة",
        description: `يوجد ${highViolations} مخالفة من الدرجة الثالثة أو الرابعة.`,
        tone: "red",
        icon: <TrendingDown className="h-5 w-5" />,
      });
    }

    if (openViolations > 0) {
      items.push({
        title: "حالات مفتوحة",
        description: `${openViolations} مخالفة ما زالت مفتوحة وتحتاج إجراء.`,
        tone: "gold",
        icon: <Clock className="h-5 w-5" />,
      });
    }

    if (health.documentationRate < 100 && totalViolations > 0) {
      items.push({
        title: "توثيق غير مكتمل",
        description: `اكتمال الإجراء والملاحظات يبلغ ${health.documentationRate}% فقط.`,
        tone: "blue",
        icon: <Target className="h-5 w-5" />,
      });
    }

    if (studentRisks[0]?.label === "خطر") {
      items.push({
        title: "طالب عالي الخطورة",
        description: `${studentRisks[0].studentName} يحتاج خطة تدخل ومتابعة.`,
        tone: "teal",
        icon: <UserRoundSearch className="h-5 w-5" />,
      });
    }

    if (items.length === 0) {
      items.push({
        title: "الوضع السلوكي مستقر",
        description: "لا توجد مؤشرات حرجة في المخالفات الحالية.",
        tone: "green",
        icon: <Sparkles className="h-5 w-5" />,
      });
    }

    return items.slice(0, 4);
  }, [
    health.documentationRate,
    highViolations,
    openViolations,
    studentRisks,
    totalViolations,
  ]);

  function runSmartSearch(command: string) {
    const value = command.trim();

    setSearch("");
    setDegreeFilter("all");
    setStatusFilter("all");

    if (value.includes("الدرجة الرابعة")) {
      setDegreeFilter("4");
      return;
    }

    if (value.includes("مفتوحة")) {
      setStatusFilter("مفتوحة");
      return;
    }

    if (value.includes("تحت المتابعة")) {
      setStatusFilter("تحت المتابعة");
      return;
    }

    if (value.includes("مغلقة")) {
      setStatusFilter("مغلقة");
      return;
    }

    setSearch(value.replace("مخالفات", "").trim());
  }

  async function addViolation() {
    if (!studentId || !selectedOption) {
      showToast("error", "اختر الطالب ونوع المخالفة");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("student_violations").insert({
        school_id: currentSchool?.id || null,
        student_id: studentId,
        violation_title: selectedOption.title,
        violation_degree: selectedOption.degree,
        points_deducted: selectedOption.points,
        violation_date: new Date().toISOString().slice(0, 10),
        action_taken: actionTaken || null,
        notes: notes || null,
        status: "مفتوحة",
        reported_by_name: "مستخدم النظام",
        reported_by_role: "إدارة المدرسة",
      });

      if (error) throw error;

      setStudentId("");
      setSelectedViolation("");
      setActionTaken("");
      setNotes("");
      setShowForm(false);

      showToast("success", "تم تسجيل المخالفة بنجاح");
      await fetchData();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر حفظ المخالفة";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function updateViolationStatus(id: string, status: string) {
    try {
      const { error } = await supabase
        .from("student_violations")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      showToast("success", "تم تحديث حالة المخالفة");
      await fetchData();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر تحديث الحالة";
      showToast("error", message);
    }
  }

  async function deleteViolation(id: string) {
    const ok = confirm("هل تريد حذف هذه المخالفة؟");
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("student_violations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      showToast("success", "تم حذف المخالفة");
      await fetchData();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر حذف المخالفة";
      showToast("error", message);
    }
  }
  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <LoadingBox />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AppShell>
        <PageContainer size="wide" className="space-y-6">
          <Breadcrumb />

          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="السلوك والانضباط"
            description="إدارة المخالفات السلوكية، متابعة الإجراءات، وربطها بملف الطالب والتقارير."
            badge="السلوك والمواظبة"
            icon={<ShieldAlert className="h-4 w-4" />}
          />

          <PageActions>
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#15445A] shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              تحديث
            </button>

            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              إضافة مخالفة
            </button>
          </PageActions>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
            <ExecutiveCard
              title="إجمالي المخالفات"
              value={totalViolations}
              icon={<ShieldAlert size={22} />}
              tone="blue"
            />

            <ExecutiveCard
              title="مفتوحة"
              value={openViolations}
              icon={<Clock size={22} />}
              tone="gold"
            />

            <ExecutiveCard
              title="تحت المتابعة"
              value={followViolations}
              icon={<Eye size={22} />}
              tone="green"
            />

            <ExecutiveCard
              title="إجمالي الحسم"
              value={totalDeducted}
              icon={<AlertTriangle size={22} />}
              tone="red"
            />
          </section>


          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <BehaviorExecutiveAnalytics
              health={health}
              totals={{
                totalViolations,
                openViolations,
                followViolations,
                closedViolations,
                totalDeducted,
                highViolations,
              }}
              topViolation={distributions.titles[0]}
            />

            <BehaviorSmartInsights insights={smartInsights} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <BehaviorHealthPanel health={health} />

            <BehaviorRiskPanel
              risks={studentRisks}
              totalStudents={students.length}
            />

            <BehaviorDistributionPanel
              degrees={distributions.degrees}
              statuses={distributions.statuses}
            />
          </section>

          <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-black text-[var(--app-text)]">
                البحث الذكي في السلوك
              </h2>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                جرّب: مخالفات الدرجة الرابعة، مخالفات مفتوحة، تحت المتابعة، مخالفات مغلقة.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {["مخالفات الدرجة الرابعة", "مخالفات مفتوحة", "تحت المتابعة", "مخالفات مغلقة"].map((command) => (
                <button
                  key={command}
                  type="button"
                  onClick={() => runSmartSearch(command)}
                  className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-2 text-sm font-black text-[var(--app-text)] transition hover:-translate-y-0.5 hover:border-[var(--app-teal)] hover:text-[var(--app-teal)]"
                >
                  {command}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث باسم الطالب أو رقم الطالب أو المخالفة..."
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              <select
                value={degreeFilter}
                onChange={(e) => setDegreeFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="all">كل الدرجات</option>
                <option value="1">الدرجة الأولى</option>
                <option value="2">الدرجة الثانية</option>
                <option value="3">الدرجة الثالثة</option>
                <option value="4">الدرجة الرابعة</option>
                <option value="5">الدرجة الخامسة</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="all">كل الحالات</option>
                <option value="مفتوحة">مفتوحة</option>
                <option value="تحت المتابعة">
                  تحت المتابعة
                </option>
                <option value="مغلقة">مغلقة</option>
              </select>
            </div>

            {filteredViolations.length === 0 ? (
              <div className="rounded-3xl bg-slate-50 p-10 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 text-sm font-bold text-slate-500">
                  لا توجد مخالفات مطابقة.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-right text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-600">
                      <th className="p-3">الطالب</th>
                      <th className="p-3">الصف / الفصل</th>
                      <th className="p-3">المخالفة</th>
                      <th className="p-3">الدرجة</th>
                      <th className="p-3">الحسم</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">الإجراء</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">تغيير الحالة</th>
                      <th className="p-3">حذف</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredViolations.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedViolationDetails(item)}
                        className="cursor-pointer border-b last:border-0 hover:bg-slate-50"
                      >
                        <td className="p-3">
                          <div className="font-black text-[#15445A]">
                            {item.students?.full_name || "غير محدد"}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {item.students?.student_number || "-"}
                          </div>
                        </td>

                        <td className="p-3 text-slate-600">
                          {item.students?.grade_level || "-"}
                          {item.students?.classroom
                            ? ` / ${item.students.classroom}`
                            : ""}
                          {item.students?.section
                            ? ` / ${item.students.section}`
                            : ""}
                        </td>

                        <td className="p-3 font-bold text-slate-700">
                          {item.violation_title}
                        </td>

                        <td className="p-3">
                          <DegreeBadge degree={item.violation_degree} />
                        </td>

                        <td className="p-3 font-black text-red-600">
                          {item.points_deducted}
                        </td>

                        <td className="p-3 text-slate-600">
                          {item.violation_date || "-"}
                        </td>

                        <td className="p-3 text-slate-600">
                          {item.action_taken || "لم يحدد"}
                        </td>

                        <td className="p-3">
                          <StatusBadge status={item.status || "مفتوحة"} />
                        </td>

                        <td className="p-3">
                          <select
                            value={item.status || "مفتوحة"}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              updateViolationStatus(item.id, e.target.value)
                            }
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                          >
                            <option value="مفتوحة">مفتوحة</option>
                            <option value="تحت المتابعة">
                              تحت المتابعة
                            </option>
                            <option value="مغلقة">مغلقة</option>
                          </select>
                        </td>

                        <td className="p-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void deleteViolation(item.id);
                            }}
                            className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <p>
                يتم تسجيل المخالفة هنا، ثم تظهر
                داخل ملف الطالب في صفحة تفاصيل
                الطالب بعد ربط جدول student_violations.
              </p>
            </div>
          </section>


          {selectedViolationDetails && (
            <BehaviorViolationDrawer
              item={selectedViolationDetails}
              onClose={() => setSelectedViolationDetails(null)}
            />
          )}

          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-[#15445A]">
                      تسجيل مخالفة جديدة
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      اختر الطالب ونوع المخالفة
                      والإجراء المتخذ.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      الطالب
                    </label>

                    <select
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="">اختر الطالب</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.full_name}
                          {student.grade_level
                            ? ` - ${student.grade_level}`
                            : ""}
                          {student.classroom ? ` / ${student.classroom}` : ""}
                          {student.section ? ` / ${student.section}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      نوع المخالفة
                    </label>

                    <select
                      value={selectedViolation}
                      onChange={(e) => setSelectedViolation(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="">اختر المخالفة</option>
                      {VIOLATION_OPTIONS.map((item) => (
                        <option key={item.title} value={item.title}>
                          {item.title} - الدرجة {item.degree}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      الإجراء المتخذ
                    </label>

                    <input
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      placeholder="مثال: تنبيه شفهي / إشعار ولي الأمر / إحالة للمرشد"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      ملاحظات
                    </label>

                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="ملاحظات إضافية"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                {selectedOption && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                    درجة المخالفة: {selectedOption.degree} —
                    مقدار الحسم: {selectedOption.points} درجة
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={addViolation}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#07A869] px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    حفظ المخالفة
                  </button>

                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
        </PageContainer>
      </AppShell>
    </RoleGuard>
  );
}

function DegreeBadge({ degree }: { degree: number }) {
  const style =
    degree >= 4
      ? "bg-red-50 text-red-700"
      : degree >= 3
        ? "bg-amber-50 text-amber-700"
        : "bg-blue-50 text-blue-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      الدرجة {degree}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "مغلقة"
      ? "bg-emerald-50 text-emerald-700"
      : status === "تحت المتابعة"
        ? "bg-amber-50 text-amber-700"
        : "bg-blue-50 text-blue-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      {status}
    </span>
  );
}

function LoadingBox() {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-sm">
      <RefreshCcw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#15445A]" />
      جاري تحميل صفحة السلوك والانضباط...
    </div>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-[60] flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl ${
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      <div
        className={`h-2.5 w-2.5 rounded-full ${
          toast.type === "success" ? "bg-emerald-200" : "bg-red-200"
        }`}
      />

      <span>{toast.message}</span>
    </div>
  );
}


function BehaviorExecutiveAnalytics({
  health,
  totals,
  topViolation,
}: {
  health: BehaviorHealth;
  totals: {
    totalViolations: number;
    openViolations: number;
    followViolations: number;
    closedViolations: number;
    totalDeducted: number;
    highViolations: number;
  };
  topViolation?: DistributionItem;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black text-[var(--app-text)]">
          Executive Analytics
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          قراءة تنفيذية لحالة السلوك وجودة الإغلاق والتوثيق.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BehaviorMetric label="نسبة الإغلاق" value={`${health.closureRate}%`} icon={<CheckCircle2 size={18} />} tone="green" />
        <BehaviorMetric label="نسبة المتابعة" value={`${health.followUpRate}%`} icon={<Eye size={18} />} tone="blue" />
        <BehaviorMetric label="عالية الخطورة" value={`${health.highSeverityRate}%`} icon={<AlertTriangle size={18} />} tone="red" />
        <BehaviorMetric label="اكتمال التوثيق" value={`${health.documentationRate}%`} icon={<Target size={18} />} tone="teal" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <BehaviorInfoLine label="متوسط الحسم" value={health.averageDeduction} />
        <BehaviorInfoLine label="أكثر مخالفة" value={topViolation?.name || "-"} />
        <BehaviorInfoLine label="إجمالي الحسم" value={totals.totalDeducted} />
        <BehaviorInfoLine label="إجمالي المخالفات" value={totals.totalViolations} />
      </div>
    </section>
  );
}

function BehaviorSmartInsights({
  insights,
}: {
  insights: BehaviorInsight[];
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
          <BrainCircuit size={20} />
          AI Behavior Insights
        </h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          توصيات تشغيلية مبنية على المخالفات الحالية.
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

function BehaviorHealthPanel({
  health,
}: {
  health: BehaviorHealth;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--app-text)]">Behavior Health</h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مؤشرات الإغلاق والمتابعة والتوثيق.
      </p>

      <div className="mt-5 space-y-4">
        <BehaviorProgress label="الإغلاق" value={health.closureRate} total={100} tone="green" suffix="%" />
        <BehaviorProgress label="تحت المتابعة" value={health.followUpRate} total={100} tone="blue" suffix="%" />
        <BehaviorProgress label="مرتفعة الخطورة" value={health.highSeverityRate} total={100} tone="red" suffix="%" />
        <BehaviorProgress label="اكتمال التوثيق" value={health.documentationRate} total={100} tone="teal" suffix="%" />
      </div>
    </section>
  );
}

function BehaviorRiskPanel({
  risks,
  totalStudents,
}: {
  risks: StudentBehaviorRisk[];
  totalStudents: number;
}) {
  const danger = risks.filter((item) => item.label === "خطر").length;
  const watch = risks.filter((item) => item.label === "متابعة").length;
  const stable = Math.max(0, totalStudents - danger - watch);

  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--app-text)]">Behavior Risk Engine</h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        تصنيف الطلاب حسب تكرار المخالفات وحدتها.
      </p>

      <div className="mt-5 space-y-4">
        <BehaviorProgress label="خطر" value={danger} total={Math.max(1, totalStudents)} tone="red" />
        <BehaviorProgress label="متابعة" value={watch} total={Math.max(1, totalStudents)} tone="gold" />
        <BehaviorProgress label="مستقر" value={stable} total={Math.max(1, totalStudents)} tone="green" />
      </div>

      <div className="mt-4 space-y-2">
        {risks.slice(0, 4).map((item) => (
          <div key={item.studentId} className="rounded-2xl bg-[var(--app-card-soft)] px-3 py-2">
            <p className="text-sm font-black text-[var(--app-text)]">{item.studentName}</p>
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">
              {item.violations} مخالفات · حسم {item.deducted} · {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BehaviorDistributionPanel({
  degrees,
  statuses,
}: {
  degrees: DistributionItem[];
  statuses: DistributionItem[];
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[var(--app-text)]">
        <ChartNoAxesCombined size={20} />
        Behavior Distribution
      </h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        توزيع المخالفات حسب الدرجة والحالة.
      </p>

      <div className="mt-5 space-y-4">
        <BehaviorMiniList
          title="حسب الدرجة"
          items={degrees.slice(0, 5).map((item) => `${item.name} — ${item.count}`)}
        />
        <BehaviorMiniList
          title="حسب الحالة"
          items={statuses.slice(0, 5).map((item) => `${item.name} — ${item.count}`)}
        />
      </div>
    </section>
  );
}

function BehaviorViolationDrawer({
  item,
  onClose,
}: {
  item: Violation;
  onClose: () => void;
}) {
  const recommendations = buildBehaviorRecommendations(item);

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40 backdrop-blur-sm">
      <button type="button" className="flex-1" onClick={onClose} aria-label="إغلاق" />
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-[#C1B489]">Behavior Drawer V2</p>
            <h2 className="mt-1 text-2xl font-black text-[#15445A]">
              {item.students?.full_name || "غير محدد"}
            </h2>
          </div>

          <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <BehaviorDrawerMetric label="المخالفة" value={item.violation_title} />
          <BehaviorDrawerMetric label="الدرجة" value={`الدرجة ${item.violation_degree}`} />
          <BehaviorDrawerMetric label="الحسم" value={String(item.points_deducted)} />
          <BehaviorDrawerMetric label="الحالة" value={item.status || "مفتوحة"} />
        </div>

        <div className="mt-5 space-y-3">
          <BehaviorDrawerSection
            title="Overview"
            items={[
              `الطالب: ${item.students?.full_name || "غير محدد"}`,
              `الصف: ${item.students?.grade_level || "-"}`,
              `الفصل: ${item.students?.classroom || "-"}`,
              `التاريخ: ${item.violation_date || "-"}`,
            ]}
          />

          <BehaviorDrawerSection
            title="Action & Notes"
            items={[
              `الإجراء: ${item.action_taken || "لم يحدد"}`,
              `الملاحظات: ${item.notes || "لا توجد"}`,
              `المبلّغ: ${item.reported_by_name || "غير محدد"}`,
              `الدور: ${item.reported_by_role || "غير محدد"}`,
            ]}
          />

          <BehaviorDrawerSection
            title="AI Recommendations"
            items={recommendations}
          />

          <BehaviorDrawerSection
            title="Timeline"
            items={[
              `تاريخ المخالفة: ${item.violation_date || "-"}`,
              `تاريخ التسجيل: ${item.created_at || "-"}`,
              `الحالة الحالية: ${item.status || "مفتوحة"}`,
            ]}
          />
        </div>
      </aside>
    </div>
  );
}

function BehaviorMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: BehaviorInsightTone;
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

function BehaviorInfoLine({
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

function BehaviorProgress({
  label,
  value,
  total,
  tone,
  suffix = "",
}: {
  label: string;
  value: number;
  total: number;
  tone: BehaviorInsightTone;
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

function BehaviorMiniList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
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

function BehaviorDrawerMetric({
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

function BehaviorDrawerSection({
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

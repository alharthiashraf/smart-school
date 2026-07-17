"use client";

import Link from "next/link";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageContainer from "@/components/layout/PageContainer";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  Bell,
  Building2,
  ClipboardCheck,
  ExternalLink,
  FileSearch,
  GraduationCap,
  HeartPulse,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Search,
  ShieldAlert,
  Target,
  User,
} from "lucide-react";

type SearchSource =
  | "students"
  | "teachers"
  | "student_referrals"
  | "student_interventions"
  | "student_behavior"
  | "health_cases"
  | "parent_communications"
  | "notifications";

type SearchResult = {
  id: string;
  source: SearchSource;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  href: string;
  created_at?: string | null;
};

type StudentRow = {
  id: string;
  full_name?: string | null;
  student_number?: string | null;
  classroom?: string | null;
  class_name?: string | null;
  section?: string | null;
  grade_level?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
};

type TeacherRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  teacher_name?: string | null;
  subject?: string | null;
  specialization?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
};

type ReferralRow = {
  id: string;
  student_id?: string | null;
  student_name?: string | null;
  reason?: string | null;
  teacher_notes?: string | null;
  status?: string | null;
  referred_at?: string | null;
  created_at?: string | null;
};

type InterventionRow = {
  id: string;
  student_id?: string | null;
  title?: string | null;
  intervention_type?: string | null;
  notes?: string | null;
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
};

type BehaviorRow = {
  id: string;
  student_id?: string | null;
  violation_type?: string | null;
  violation_level?: string | null;
  action_taken?: string | null;
  status?: string | null;
  notes?: string | null;
  behavior_date?: string | null;
  created_at?: string | null;
};

type HealthCaseRow = {
  id: string;
  student_id?: string | null;
  case_type?: string | null;
  severity?: string | null;
  diagnosis?: string | null;
  case_status?: string | null;
  created_at?: string | null;
};

type ParentCommunicationRow = {
  id: string;
  student_id?: string | null;
  guardian_name?: string | null;
  communication_method?: string | null;
  topic?: string | null;
  result?: string | null;
  notes?: string | null;
  communication_date?: string | null;
  created_at?: string | null;
};

type NotificationRow = {
  id: string;
  title?: string | null;
  message?: string | null;
  type?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "student_counselor",
  "health_supervisor",
  "activity_leader",
  "teacher",
  "student",
  "parent",
];

const SOURCE_FILTERS: { value: "all" | SearchSource; label: string }[] = [
  { value: "all", label: "كل النتائج" },
  { value: "students", label: "الطلاب" },
  { value: "teachers", label: "المعلمون" },
  { value: "student_referrals", label: "الإحالات" },
  { value: "student_interventions", label: "التدخلات" },
  { value: "student_behavior", label: "السلوك" },
  { value: "health_cases", label: "الصحة" },
  { value: "parent_communications", label: "التواصل" },
  { value: "notifications", label: "التنبيهات" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function cleanKeyword(value: string) {
  return value.trim().replaceAll("%", "").replaceAll(",", " ");
}

function like(value: string) {
  return `%${cleanKeyword(value)}%`;
}

function rows<T>(result: PromiseSettledResult<any>): T[] {
  if (result.status !== "fulfilled") return [];
  if (result.value?.error) return [];
  return (result.value?.data as T[]) || [];
}

function getSourceLabel(source: SearchSource) {
  if (source === "students") return "طالب";
  if (source === "teachers") return "معلم";
  if (source === "student_referrals") return "إحالة";
  if (source === "student_interventions") return "تدخل";
  if (source === "student_behavior") return "سلوك";
  if (source === "health_cases") return "صحة";
  if (source === "parent_communications") return "تواصل";
  if (source === "notifications") return "تنبيه";
  return "نتيجة";
}

function getSourceIcon(source: SearchSource) {
  if (source === "students") return <User size={18} />;
  if (source === "teachers") return <GraduationCap size={18} />;
  if (source === "student_referrals") return <ClipboardCheck size={18} />;
  if (source === "student_interventions") return <Target size={18} />;
  if (source === "student_behavior") return <ShieldAlert size={18} />;
  if (source === "health_cases") return <HeartPulse size={18} />;
  if (source === "parent_communications") return <MessageCircle size={18} />;
  if (source === "notifications") return <Bell size={18} />;

  return <FileSearch size={18} />;
}

function getSourceStyle(source: SearchSource) {
  if (source === "students") return "bg-[var(--app-blue-soft)] text-[var(--app-blue)]";
  if (source === "teachers") return "bg-[var(--app-green-soft)] text-[var(--app-green)]";
  if (source === "student_referrals") return "bg-[var(--app-accent)]/20 text-[var(--app-primary)]";
  if (source === "student_interventions") return "bg-orange-50 text-orange-700";
  if (source === "student_behavior") return "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]";
  if (source === "health_cases") return "bg-pink-50 text-pink-700";
  if (source === "parent_communications") return "bg-indigo-50 text-indigo-700";
  if (source === "notifications") return "bg-[var(--app-card-soft)] text-[var(--app-text)]";

  return "bg-[var(--app-card-soft)] text-[var(--app-text)]";
}

function sourceOrder(source: SearchSource) {
  const order: Record<SearchSource, number> = {
    students: 1,
    teachers: 2,
    student_referrals: 3,
    student_interventions: 4,
    student_behavior: 5,
    health_cases: 6,
    parent_communications: 7,
    notifications: 8,
  };

  return order[source] || 99;
}

function sourceCount(results: SearchResult[], source: SearchSource) {
  return results.filter((item) => item.source === source).length;
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <RoleGuard allowedRoles={PAGE_ROLES}>
          <AppShell>
            <LoadingBox text="جاري تحميل البحث الشامل..." />
          </AppShell>
        </RoleGuard>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const { currentSchool, loading: schoolLoading } = useSchool();
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryFromUrl = searchParams.get("q") || "";

  const [keyword, setKeyword] = useState(queryFromUrl);
  const [sourceFilter, setSourceFilter] = useState<"all" | SearchSource>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearchRef = useRef("");

  useEffect(() => {
    setKeyword(queryFromUrl);

    if (queryFromUrl.trim()) {
      void runSearch(queryFromUrl, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryFromUrl, currentSchool?.id]);

  useEffect(() => {
    const term = cleanKeyword(keyword);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!term) {
      setResults([]);
      setSearched(false);
      setErrorMsg("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      void runSearch(term, true);
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, currentSchool?.id]);

  async function runSearch(value = keyword, updateUrl = true) {
    if (!currentSchool?.id) return;

    const term = cleanKeyword(value);

    if (!term) {
      setResults([]);
      setSearched(false);
      if (updateUrl) router.push("/search");
      return;
    }

    latestSearchRef.current = term;
    setLoading(true);
    setErrorMsg("");
    setSearched(true);

    if (updateUrl) router.replace(`/search?q=${encodeURIComponent(term)}`);

    try {
      const searchValue = like(term);

      const [
        studentsResult,
        teachersResult,
        referralsResult,
        interventionsResult,
        behaviorResult,
        healthResult,
        communicationsResult,
        notificationsResult,
      ] = await Promise.allSettled([
        supabase
          .from("students")
          .select(
            "id, full_name, student_number, classroom, class_name, section, grade_level, guardian_name, guardian_phone",
          )
          .eq("school_id", currentSchool.id)
          .or(
            `full_name.ilike.${searchValue},student_number.ilike.${searchValue},classroom.ilike.${searchValue},class_name.ilike.${searchValue},section.ilike.${searchValue},grade_level.ilike.${searchValue},guardian_name.ilike.${searchValue},guardian_phone.ilike.${searchValue}`,
          )
          .limit(30),

        supabase
          .from("teachers")
          .select(
            "id, full_name, name, teacher_name, subject, specialization, department, phone, email",
          )
          .eq("school_id", currentSchool.id)
          .or(
            `full_name.ilike.${searchValue},name.ilike.${searchValue},teacher_name.ilike.${searchValue},subject.ilike.${searchValue},specialization.ilike.${searchValue},department.ilike.${searchValue},phone.ilike.${searchValue},email.ilike.${searchValue}`,
          )
          .limit(30),

        supabase
          .from("student_referrals")
          .select("id, student_id, student_name, reason, teacher_notes, status, referred_at, created_at")
          .eq("school_id", currentSchool.id)
          .or(`student_name.ilike.${searchValue},reason.ilike.${searchValue},teacher_notes.ilike.${searchValue},status.ilike.${searchValue}`)
          .limit(30),

        supabase
          .from("student_interventions")
          .select("id, student_id, title, intervention_type, notes, status, priority, created_at")
          .eq("school_id", currentSchool.id)
          .or(`title.ilike.${searchValue},intervention_type.ilike.${searchValue},notes.ilike.${searchValue},status.ilike.${searchValue},priority.ilike.${searchValue}`)
          .limit(30),

        supabase
          .from("student_behavior")
          .select("id, student_id, violation_type, violation_level, action_taken, status, notes, behavior_date, created_at")
          .eq("school_id", currentSchool.id)
          .or(`violation_type.ilike.${searchValue},violation_level.ilike.${searchValue},action_taken.ilike.${searchValue},status.ilike.${searchValue},notes.ilike.${searchValue}`)
          .limit(30),

        supabase
          .from("health_cases")
          .select("id, student_id, case_type, severity, diagnosis, case_status, created_at")
          .eq("school_id", currentSchool.id)
          .or(`case_type.ilike.${searchValue},severity.ilike.${searchValue},diagnosis.ilike.${searchValue},case_status.ilike.${searchValue}`)
          .limit(30),

        supabase
          .from("parent_communications")
          .select("id, student_id, guardian_name, communication_method, topic, result, notes, communication_date, created_at")
          .eq("school_id", currentSchool.id)
          .or(`guardian_name.ilike.${searchValue},communication_method.ilike.${searchValue},topic.ilike.${searchValue},result.ilike.${searchValue},notes.ilike.${searchValue}`)
          .limit(30),

        supabase
          .from("notifications")
          .select("id, title, message, type, is_read, created_at")
          .eq("school_id", currentSchool.id)
          .or(`title.ilike.${searchValue},message.ilike.${searchValue},type.ilike.${searchValue}`)
          .limit(30),
      ]);

      if (latestSearchRef.current !== term) return;

      const students = rows<StudentRow>(studentsResult).map<SearchResult>((item) => ({
        id: `students-${item.id}`,
        source: "students",
        title: item.full_name || "طالب بدون اسم",
        subtitle: `${item.grade_level || "مرحلة غير محددة"} | ${
          item.classroom || item.class_name || "فصل غير محدد"
        }${item.section ? ` - ${item.section}` : ""}`,
        description: `رقم الطالب: ${item.student_number || "—"} | ولي الأمر: ${
          item.guardian_name || "—"
        } | الجوال: ${item.guardian_phone || "—"}`,
        badge: "طالب",
        href: `/students/${item.id}`,
        created_at: null,
      }));

      const teachers = rows<TeacherRow>(teachersResult).map<SearchResult>((item) => ({
        id: `teachers-${item.id}`,
        source: "teachers",
        title: item.full_name || item.teacher_name || item.name || "معلم بدون اسم",
        subtitle: item.subject || item.specialization || "معلم",
        description: `القسم: ${item.department || "—"} | الجوال: ${
          item.phone || "—"
        } | البريد: ${item.email || "—"}`,
        badge: "معلم",
        href: `/teachers/${item.id}`,
        created_at: null,
      }));

      const referrals = rows<ReferralRow>(referralsResult).map<SearchResult>((item) => ({
        id: `student_referrals-${item.id}`,
        source: "student_referrals",
        title: item.student_name ? `إحالة: ${item.student_name}` : "إحالة طالب",
        subtitle: item.reason || "سبب الإحالة غير محدد",
        description: item.teacher_notes || "لا توجد ملاحظات.",
        badge: item.status || "إحالة",
        href: "/vice-principal",
        created_at: item.referred_at || item.created_at || null,
      }));

      const interventions = rows<InterventionRow>(interventionsResult).map<SearchResult>((item) => ({
        id: `student_interventions-${item.id}`,
        source: "student_interventions",
        title: item.title || "خطة تدخل",
        subtitle: `${item.intervention_type || "تدخل"} | ${item.priority || "متوسط"}`,
        description: item.notes || "لا توجد ملاحظات.",
        badge: item.status || "تدخل",
        href: "/student-interventions",
        created_at: item.created_at || null,
      }));

      const behavior = rows<BehaviorRow>(behaviorResult).map<SearchResult>((item) => ({
        id: `student_behavior-${item.id}`,
        source: "student_behavior",
        title: item.violation_type || "سجل سلوكي",
        subtitle: item.violation_level || item.status || "سلوك",
        description: item.notes || item.action_taken || "لا توجد تفاصيل.",
        badge: item.status || "سلوك",
        href: "/behavior",
        created_at: item.behavior_date || item.created_at || null,
      }));

      const healthCases = rows<HealthCaseRow>(healthResult).map<SearchResult>((item) => ({
        id: `health_cases-${item.id}`,
        source: "health_cases",
        title: item.case_type || "حالة صحية",
        subtitle: item.severity || item.case_status || "صحة",
        description: item.diagnosis || "لا توجد تفاصيل.",
        badge: item.case_status || "حالة صحية",
        href: "/health",
        created_at: item.created_at || null,
      }));

      const communications = rows<ParentCommunicationRow>(communicationsResult).map<SearchResult>((item) => ({
        id: `parent_communications-${item.id}`,
        source: "parent_communications",
        title: item.topic || "تواصل مع ولي الأمر",
        subtitle: `${item.communication_method || "تواصل"} | ${
          item.guardian_name || "ولي الأمر"
        }`,
        description: item.notes || item.result || "لا توجد تفاصيل.",
        badge: item.result || "تواصل",
        href: "/parent-communications",
        created_at: item.communication_date || item.created_at || null,
      }));

      const notifications = rows<NotificationRow>(notificationsResult).map<SearchResult>((item) => ({
        id: `notifications-${item.id}`,
        source: "notifications",
        title: item.title || "تنبيه",
        subtitle: item.type || (item.is_read ? "مقروء" : "غير مقروء"),
        description: item.message || "لا توجد تفاصيل.",
        badge: item.is_read ? "مقروء" : "غير مقروء",
        href: "/notifications",
        created_at: item.created_at || null,
      }));

      const finalResults = [
        ...students,
        ...teachers,
        ...referrals,
        ...interventions,
        ...behavior,
        ...healthCases,
        ...communications,
        ...notifications,
      ].sort((a, b) => {
        if (sourceOrder(a.source) !== sourceOrder(b.source)) {
          return sourceOrder(a.source) - sourceOrder(b.source);
        }

        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();

        return bTime - aTime;
      });

      setResults(finalResults);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تنفيذ البحث";
      setErrorMsg(message);
    } finally {
      if (latestSearchRef.current === term) setLoading(false);
    }
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(keyword, true);
  }

  const filteredResults = useMemo(() => {
    return results.filter((item) => sourceFilter === "all" || item.source === sourceFilter);
  }, [results, sourceFilter]);

  const stats = useMemo(
    () => ({
      total: results.length,
      students: sourceCount(results, "students"),
      teachers: sourceCount(results, "teachers"),
      studentFiles: results.filter((item) =>
        [
          "student_referrals",
          "student_interventions",
          "student_behavior",
          "health_cases",
          "parent_communications",
        ].includes(item.source),
      ).length,
      filtered: filteredResults.length,
    }),
    [results, filteredResults],
  );

  if (schoolLoading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <LoadingBox text="جاري تحميل البحث الشامل..." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <PageContainer size="wide" className="space-y-5">
          <Breadcrumb />
          <PageHeader
            variant="hero"
            title="البحث الشامل"
            description="ابحث في الطلاب، المعلمين، الإحالات، التدخلات، السلوك، الحالات الصحية، التواصل، والتنبيهات من مكان واحد."
            badge="بحث فوري داخل بيانات المدرسة"
            icon={<FileSearch size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "البحث الشامل" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "غير محدد" },
              { label: "كلمة البحث", value: cleanKeyword(keyword) || "لم يتم البحث" },
              { label: "المصدر", value: SOURCE_FILTERS.find((item) => item.value === sourceFilter)?.label || "كل النتائج" },
              { label: "المعروض", value: filteredResults.length },
            ]}
            stats={[
              { label: "كل النتائج", value: stats.total, icon: <FileSearch size={20} />, tone: "blue" },
              { label: "طلاب", value: stats.students, icon: <User size={20} />, tone: "blue" },
              { label: "معلمون", value: stats.teachers, icon: <GraduationCap size={20} />, tone: "green" },
              { label: "سجلات طلابية", value: stats.studentFiles, icon: <Building2 size={20} />, tone: "gold" },
            ]}
            actions={
              <button
                type="button"
                onClick={() => void runSearch(keyword, true)}
                disabled={loading || !keyword.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--app-primary)] px-4 text-sm font-black text-[var(--app-primary-foreground)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw size={16} />}
                تحديث البحث
              </button>
            }
          />

          {errorMsg && (
            <div className="rounded-[28px] border border-[var(--app-destructive)]/20 bg-[var(--app-destructive-soft)] p-5 text-sm font-bold text-[var(--app-destructive)]">
              {errorMsg}
            </div>
          )}

          <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
            <form
              onSubmit={submitSearch}
              className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_150px]"
            >
              <div className="relative">
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]"
                />

                <input
                  autoFocus
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="اكتب اسم طالب، معلم، رقم، حالة، إحالة، ملاحظة..."
                  className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] py-3 pr-10 pl-4 text-sm font-bold text-[var(--app-primary)] outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-card)]"
                />

                {loading && (
                  <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--app-text-muted)]" />
                )}
              </div>

              <ToolbarSelect
                value={sourceFilter}
                onChange={(value) => setSourceFilter(value as "all" | SearchSource)}
              >
                {SOURCE_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </ToolbarSelect>

              <button
                type="submit"
                disabled={loading || !keyword.trim()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--app-primary)] px-5 text-sm font-black text-[var(--app-primary-foreground)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search size={17} />}
                بحث
              </button>
            </form>
          </section>

          {searched && (
            <>
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <ExecutiveCard
                  title="كل النتائج"
                  value={stats.total}
                  icon={<FileSearch size={22} />}
                  tone="blue"
                  subtitle="نتائج البحث"
                  progress={stats.total > 0 ? 100 : 0}
                />

                <ExecutiveCard
                  title="طلاب"
                  value={stats.students}
                  icon={<User size={22} />}
                  tone="blue"
                  subtitle="نتائج الطلاب"
                  progress={stats.total ? Math.round((stats.students / stats.total) * 100) : 0}
                />

                <ExecutiveCard
                  title="معلمون"
                  value={stats.teachers}
                  icon={<GraduationCap size={22} />}
                  tone="green"
                  subtitle="نتائج المعلمين"
                  progress={stats.total ? Math.round((stats.teachers / stats.total) * 100) : 0}
                />

                <ExecutiveCard
                  title="سجلات طلابية"
                  value={stats.studentFiles}
                  icon={<Building2 size={22} />}
                  tone="gold"
                  subtitle="إحالات وتدخلات وسلوك"
                  progress={stats.total ? Math.round((stats.studentFiles / stats.total) * 100) : 0}
                />
              </section>

              <SummaryCard
                title="ملخص نتائج البحث"
                description="قراءة سريعة لتوزيع النتائج حسب المصدر والفلاتر الحالية."
                tone={stats.filtered > 0 ? "green" : "gold"}
                items={[
                  { label: "كل النتائج", value: stats.total },
                  { label: "المعروض", value: stats.filtered },
                  { label: "طلاب", value: stats.students },
                  { label: "معلمون", value: stats.teachers },
                  { label: "سلوك", value: sourceCount(results, "student_behavior") },
                  { label: "تنبيهات", value: sourceCount(results, "notifications") },
                ]}
                footer="يعرض البحث النتائج داخل نطاق المدرسة الحالية فقط."
              />
            </>
          )}

          <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-[var(--app-primary)]">نتائج البحث</h2>

                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  {searched
                    ? `تم العثور على ${filteredResults.length} نتيجة حسب الفلتر الحالي.`
                    : "ابدأ بالكتابة وسيظهر البحث تلقائيًا."}
                </p>
              </div>
            </div>

            {!searched ? (
              <EmptyBox text="ابدأ بكتابة كلمة للبحث." />
            ) : loading && results.length === 0 ? (
              <LoadingBox text="جاري تحميل نتائج البحث..." />
            ) : filteredResults.length === 0 ? (
              <EmptyBox text="لا توجد نتائج مطابقة." />
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                {filteredResults.map((item) => (
                  <SearchResultCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        </PageContainer>
      </AppShell>
    </RoleGuard>
  );
}

function SearchResultCard({ item }: { item: SearchResult }) {
  return (
    <Link
      href={item.href}
      className="group rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-5 transition hover:-translate-y-0.5 hover:bg-[var(--app-card)] hover:shadow-md"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${getSourceStyle(item.source)}`}
        >
          {getSourceIcon(item.source)}
          {getSourceLabel(item.source)}
        </span>

        <span className="rounded-full bg-[var(--app-card)] px-3 py-1 text-xs font-bold text-[var(--app-text-muted)]">
          {item.badge}
        </span>
      </div>

      <h3 className="line-clamp-1 text-lg font-black text-[var(--app-primary)]">
        {item.title}
      </h3>

      <p className="mt-1 line-clamp-1 text-sm font-bold text-[var(--app-text-muted)]">
        {item.subtitle}
      </p>

      <p className="mt-2 line-clamp-2 text-sm leading-7 text-[var(--app-text-muted)]">
        {item.description}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-[var(--app-text-muted)]">
          {item.created_at ? formatDate(item.created_at) : "—"}
        </span>

        <span className="inline-flex items-center gap-1 text-xs font-black text-[var(--app-primary)]">
          فتح
          <ExternalLink size={13} />
        </span>
      </div>
    </Link>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-card-soft)] p-8 text-center text-sm font-bold text-[var(--app-text-muted)]">
      {text}
    </div>
  );
}

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="flex min-h-[30vh] items-center justify-center">
      <div className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-8 text-center text-[var(--app-text-muted)] shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-primary)]/10 text-[var(--app-primary)]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="font-bold">{text}</p>
      </div>
    </div>
  );
}

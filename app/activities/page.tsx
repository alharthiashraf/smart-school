"use client";

import Link from "next/link";
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
import PageSection from "@/components/ui/page/PageSection";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading";
import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  Award,
  Bell,
  CheckCircle2,
  FileText,
  Flag,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";

type ActivityStats = {
  activities: number;
  activeActivities: number;
  teams: number;
  competitions: number;
  participants: number;
  reports: number;
  unreadNotifications: number;
};

type ActivityRow = {
  id: string;
  title?: string | null;
  activity_name?: string | null;
  activity_type?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
};

type CompetitionRow = {
  id: string;
  title?: string | null;
  competition_name?: string | null;
  status?: string | null;
  competition_date?: string | null;
  created_at?: string | null;
};

type TeamRow = {
  id: string;
  team_name?: string | null;
  title?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type NotificationItem = {
  id: string;
  title?: string | null;
  message?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

type QuickLink = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: "blue" | "green" | "gold" | "red" | "slate";
};

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "activity_leader",
];

const QUICK_LINKS: QuickLink[] = [
  {
    title: "الأنشطة",
    description: "إدارة الأنشطة المدرسية والخطط والبرامج.",
    href: "/activities/manage",
    icon: Sparkles,
    color: "blue",
  },
  {
    title: "الفرق",
    description: "إدارة فرق النشاط والطلاب المشاركين.",
    href: "/activities/teams",
    icon: Users,
    color: "green",
  },
  {
    title: "المسابقات",
    description: "متابعة المسابقات الداخلية والخارجية.",
    href: "/activities/competitions",
    icon: Trophy,
    color: "gold",
  },
  {
    title: "المشاركات",
    description: "توثيق مشاركات الطلاب والإنجازات.",
    href: "/activities/participations",
    icon: Award,
    color: "blue",
  },
  {
    title: "التقارير",
    description: "تقارير النشاط والإنجازات والمشاركات.",
    href: "/activities/reports",
    icon: FileText,
    color: "slate",
  },
  {
    title: "التنبيهات",
    description: "متابعة التنبيهات المرتبطة بالأنشطة.",
    href: "/notifications",
    icon: Bell,
    color: "red",
  },
  {
    title: "البحث الشامل",
    description: "البحث في الطلاب والمعلمين والسجلات.",
    href: "/search",
    icon: Search,
    color: "slate",
  },
];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayLabel() {
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

type SupabaseListResult<T> = {
  data: T[] | null;
  error: unknown;
};

function rows<T>(
  result: PromiseSettledResult<SupabaseListResult<T>>,
): T[] {
  if (result.status !== "fulfilled") return [];
  if (result.value.error) return [];
  return result.value.data ?? [];
}

function isActiveStatus(value?: string | null) {
  const status = String(value || "");

  return (
    status.includes("نشط") ||
    status.includes("قائم") ||
    status.includes("معتمد") ||
    status === "active" ||
    status === "approved"
  );
}

function getQuickColorClasses(color: QuickLink["color"]) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    gold: "bg-[#C1B489]/20 text-[#15445A]",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return colors[color];
}

function getStatusPill(value?: string | null) {
  const status = String(value || "");

  if (
    status.includes("نشط") ||
    status.includes("قائم") ||
    status.includes("معتمد") ||
    status === "active" ||
    status === "approved"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    status.includes("انتظار") ||
    status.includes("مسودة") ||
    status.includes("قيد") ||
    status === "pending"
  ) {
    return "bg-[#C1B489]/20 text-[#15445A]";
  }

  if (
    status.includes("مغلق") ||
    status.includes("ملغي") ||
    status.includes("مرفوض") ||
    status === "closed" ||
    status === "cancelled"
  ) {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
}

export default function ActivitiesPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [stats, setStats] = useState<ActivityStats>({
    activities: 0,
    activeActivities: 0,
    teams: 0,
    competitions: 0,
    participants: 0,
    reports: 0,
    unreadNotifications: 0,
  });

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const today = getTodayDate();

  const loadPage = useCallback(async () => {
    if (!currentSchool?.id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const [
        activitiesResult,
        teamsResult,
        competitionsResult,
        participantsResult,
        reportsResult,
        notificationsResult,
      ] = await Promise.allSettled([
        supabase
          .from("activities")
          .select("id, title, activity_name, activity_type, status, start_date, end_date, created_at")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false })
          .limit(8),

        supabase
          .from("activity_teams")
          .select("id, team_name, title, status, created_at")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false })
          .limit(8),

        supabase
          .from("activity_competitions")
          .select("id, title, competition_name, status, competition_date, created_at")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false })
          .limit(8),

        supabase
          .from("activity_participants")
          .select("id")
          .eq("school_id", currentSchool.id),

        supabase
          .from("activity_reports")
          .select("id")
          .eq("school_id", currentSchool.id),

        supabase
          .from("notifications")
          .select("id, title, message, is_read, created_at")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const activityRows = rows<ActivityRow>(activitiesResult);
      const teamRows = rows<TeamRow>(teamsResult);
      const competitionRows = rows<CompetitionRow>(competitionsResult);
      const participantRows = rows<{ id: string }>(participantsResult);
      const reportRows = rows<{ id: string }>(reportsResult);
      const notificationRows = rows<NotificationItem>(notificationsResult);

      setActivities(activityRows);
      setTeams(teamRows);
      setCompetitions(competitionRows);
      setNotifications(notificationRows);

      setStats({
        activities: activityRows.length,
        activeActivities: activityRows.filter((item) =>
          isActiveStatus(item.status),
        ).length,
        teams: teamRows.length,
        competitions: competitionRows.length,
        participants: participantRows.length,
        reports: reportRows.length,
        unreadNotifications: notificationRows.filter(
          (item) => item.is_read === false,
        ).length,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر تحميل بوابة رائد النشاط";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setLoading(false);
      setErrorMsg("لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      return;
    }

    void loadPage();
  }, [currentSchool?.id, loadPage, schoolLoading]);

  const achievementLevel = useMemo(() => {
    const score =
      stats.activeActivities * 15 +
      stats.competitions * 10 +
      stats.teams * 8 +
      stats.participants;

    if (score >= 80) return "متميز";
    if (score >= 40) return "جيد";
    return "قيد البناء";
  }, [stats]);

  const readinessValue =
    achievementLevel === "متميز" ? 90 : achievementLevel === "جيد" ? 60 : 25;

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل بوابة رائد النشاط..." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-6" dir="rtl">
          <PageHeader
            variant="hero"
            title="مركز النشاط الطلابي"
            description="متابعة الأنشطة المدرسية، الفرق، المسابقات، المشاركات، التقارير، والإنجازات في مكان واحد."
            badge="بوابة رائد النشاط"
            icon={<Trophy size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الأنشطة" },
            ]}
            meta={[
              { label: "اليوم", value: today },
              { label: "التاريخ", value: getTodayLabel() },
              { label: "المدرسة", value: currentSchool?.school_name || "منصة المدرسة الذكية" },
              { label: "مستوى النشاط", value: achievementLevel },
            ]}
            stats={[
              { label: "الأنشطة", value: stats.activities, icon: <Sparkles size={20} />, tone: "blue" },
              { label: "الفرق", value: stats.teams, icon: <Users size={20} />, tone: "green" },
              { label: "المسابقات", value: stats.competitions, icon: <Trophy size={20} />, tone: "gold" },
              { label: "التنبيهات", value: stats.unreadNotifications, icon: <Bell size={20} />, tone: stats.unreadNotifications > 0 ? "red" : "green" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void loadPage()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>

                <Link
                  href="/search"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0DA9A6] hover:shadow-md"
                >
                  <Search size={17} />
                  البحث
                </Link>

                <Link
                  href="/notifications"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Bell size={17} />
                  التنبيهات
                </Link>
              </>
            }
          />

          {errorMsg && (
            <SummaryCard
              title="تنبيه تشغيل"
              description={errorMsg}
              tone="gold"
              items={[
                {
                  label: "ملاحظة",
                  value:
                    "إذا لم تكن جداول الأنشطة موجودة بعد، ستبقى الصفحة تعمل كواجهة رئيسية ويمكن إنشاء الجداول لاحقًا.",
                },
              ]}
            />
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <ExecutiveCard
              title="الأنشطة"
              value={stats.activities}
              subtitle="إجمالي الأنشطة"
              icon={<Sparkles size={22} />}
              tone="blue"
              progress={stats.activities > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="النشطة"
              value={stats.activeActivities}
              subtitle="أنشطة مفعلة"
              icon={<CheckCircle2 size={22} />}
              tone="green"
              progress={stats.activities ? Math.round((stats.activeActivities / stats.activities) * 100) : 0}
            />

            <ExecutiveCard
              title="الفرق"
              value={stats.teams}
              subtitle="فرق النشاط"
              icon={<Users size={22} />}
              tone="green"
              progress={stats.teams > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="المسابقات"
              value={stats.competitions}
              subtitle="داخلية وخارجية"
              icon={<Trophy size={22} />}
              tone="gold"
              progress={stats.competitions > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="المشاركون"
              value={stats.participants}
              subtitle="طلاب مشاركون"
              icon={<UserCheck size={22} />}
              tone="blue"
              progress={stats.participants > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="تنبيهات"
              value={stats.unreadNotifications}
              subtitle="غير مقروءة"
              icon={<Bell size={22} />}
              tone={stats.unreadNotifications > 0 ? "red" : "green"}
              progress={stats.unreadNotifications > 0 ? 100 : 0}
            />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <Panel title="ملخص النشاط الطلابي" icon={<Target size={24} />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <MiniInfo
                  label="أنشطة مفعلة"
                  value={stats.activeActivities}
                  icon={<CheckCircle2 size={18} />}
                />

                <MiniInfo
                  label="فرق النشاط"
                  value={stats.teams}
                  icon={<Users size={18} />}
                />

                <MiniInfo
                  label="المسابقات"
                  value={stats.competitions}
                  icon={<Flag size={18} />}
                />

                <MiniInfo
                  label="المشاركون"
                  value={stats.participants}
                  icon={<UserCheck size={18} />}
                />

                <MiniInfo
                  label="التقارير"
                  value={stats.reports}
                  icon={<FileText size={18} />}
                />

                <MiniInfo
                  label="مستوى النشاط"
                  value={achievementLevel}
                  icon={<Trophy size={18} />}
                />
              </div>

              <div className="mt-5 rounded-3xl bg-slate-50 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-black text-[#15445A]">
                    جاهزية النشاط المدرسي
                  </p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      achievementLevel === "متميز"
                        ? "bg-emerald-50 text-emerald-700"
                        : achievementLevel === "جيد"
                          ? "bg-[#C1B489]/20 text-[#15445A]"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {achievementLevel}
                  </span>
                </div>

                <ProgressBar value={readinessValue} />

                <p className="mt-3 text-sm leading-7 text-slate-500">
                  يقيس المؤشر كثافة الأنشطة، الفرق، المسابقات، ومشاركات الطلاب.
                </p>
              </div>
            </Panel>

            <Panel title="التنبيهات الأخيرة" icon={<Bell size={24} />}>
              {notifications.length === 0 ? (
                <EmptyState
                  title="لا توجد تنبيهات"
                  description="لا توجد تنبيهات مرتبطة بالأنشطة حاليًا."
                />
              ) : (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <Link
                      key={item.id}
                      href="/notifications"
                      className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <h3 className="line-clamp-1 font-black text-[#15445A]">
                          {item.title || "تنبيه"}
                        </h3>

                        {item.is_read === false && (
                          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        )}
                      </div>

                      <p className="line-clamp-2 text-sm leading-7 text-slate-500">
                        {item.message || "لا توجد تفاصيل."}
                      </p>

                      <p className="mt-2 text-xs font-bold text-slate-400">
                        {formatDate(item.created_at)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
            <Panel title="آخر الأنشطة" icon={<Sparkles size={24} />}>
              {activities.length === 0 ? (
                <EmptyState
                  title="لا توجد أنشطة"
                  description="لا توجد أنشطة مسجلة حتى الآن."
                />
              ) : (
                <div className="space-y-3">
                  {activities.map((item) => (
                    <ActivityCard
                      key={item.id}
                      title={item.title || item.activity_name || "نشاط مدرسي"}
                      subtitle={item.activity_type || "نشاط"}
                      status={item.status || "غير محدد"}
                      date={item.start_date || item.created_at}
                      href="/activities/manage"
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="المسابقات والفرق" icon={<Trophy size={24} />}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="mb-3 font-black text-[#15445A]">
                    المسابقات الأخيرة
                  </h3>

                  {competitions.length === 0 ? (
                    <EmptyState
                      title="لا توجد مسابقات"
                      description="لا توجد مسابقات مسجلة."
                    />
                  ) : (
                    <div className="space-y-3">
                      {competitions.slice(0, 4).map((item) => (
                        <ActivityCard
                          key={item.id}
                          title={item.title || item.competition_name || "مسابقة"}
                          subtitle="مسابقة"
                          status={item.status || "غير محدد"}
                          date={item.competition_date || item.created_at}
                          href="/activities/competitions"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 font-black text-[#15445A]">
                    فرق النشاط
                  </h3>

                  {teams.length === 0 ? (
                    <EmptyState
                      title="لا توجد فرق"
                      description="لا توجد فرق نشاط مسجلة."
                    />
                  ) : (
                    <div className="space-y-3">
                      {teams.slice(0, 4).map((item) => (
                        <ActivityCard
                          key={item.id}
                          title={item.team_name || item.title || "فريق نشاط"}
                          subtitle="فريق"
                          status={item.status || "غير محدد"}
                          date={item.created_at}
                          href="/activities/teams"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          </section>

          <PageSection
            title="خدمات بوابة رائد النشاط"
            description="أهم الصفحات اليومية لإدارة النشاط الطلابي."
            icon={<Sparkles size={24} />}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {QUICK_LINKS.map((link) => (
                <QuickLinkCard key={link.href} link={link} />
              ))}
            </div>
          </PageSection>
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageSection title={title} icon={icon} className="transition hover:shadow-md">
      {children}
    </PageSection>
  );
}

function MiniInfo({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-[#15445A]">
        {icon}
        <p className="text-xs font-black text-slate-500">{label}</p>
      </div>

      <p className="text-lg font-black text-slate-800">{value}</p>
    </div>
  );
}

function ActivityCard({
  title,
  subtitle,
  status,
  date,
  href,
}: {
  title: string;
  subtitle: string;
  status: string;
  date?: string | null;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#15445A]">
          {subtitle}
        </span>

        <span className={`rounded-full px-3 py-1 text-xs font-black ${getStatusPill(status)}`}>
          {status}
        </span>
      </div>

      <h3 className="line-clamp-1 font-black text-[#15445A]">{title}</h3>

      <p className="mt-2 text-xs font-bold text-slate-400">
        {formatDate(date)}
      </p>
    </Link>
  );
}

function QuickLinkCard({ link }: { link: QuickLink }) {
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      className="group rounded-3xl border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition ${getQuickColorClasses(
          link.color,
        )}`}
      >
        <Icon size={24} />
      </div>

      <h3 className="text-xl font-black text-[#15445A]">{link.title}</h3>

      <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-500">
        {link.description}
      </p>

      <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-black text-[#15445A] transition group-hover:bg-[#15445A] group-hover:text-white">
        فتح
      </div>
    </Link>
  );
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  const color =
    safeValue >= 75
      ? "bg-emerald-500"
      : safeValue >= 40
        ? "bg-[#C1B489]"
        : "bg-red-500";

  return (
    <div className="h-4 overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
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

import RoleGuard from "@/components/auth/RoleGuard";
import AppShell from "@/components/layout/AppShell";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading";
import PageHeader from "@/components/ui/page/PageHeader";
import PageSection from "@/components/ui/page/PageSection";

import { useSchool } from "@/contexts/SchoolContext";
import type { SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

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

type QuickLinkTone = "primary" | "success" | "accent" | "danger" | "neutral";

type QuickLink = {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  tone: QuickLinkTone;
};

type SupabaseListResult<T> = {
  data: T[] | null;
  error: unknown;
};

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "activity_leader",
];

const EMPTY_STATS: ActivityStats = {
  activities: 0,
  activeActivities: 0,
  teams: 0,
  competitions: 0,
  participants: 0,
  reports: 0,
  unreadNotifications: 0,
};

const QUICK_LINKS: readonly QuickLink[] = [
  {
    title: "الأنشطة",
    description: "إدارة البرامج والخطط.",
    href: "/activities/manage",
    icon: Sparkles,
    tone: "primary",
  },
  {
    title: "الفرق",
    description: "إدارة الفرق والمشاركين.",
    href: "/activities/teams",
    icon: Users,
    tone: "success",
  },
  {
    title: "المسابقات",
    description: "متابعة المسابقات.",
    href: "/activities/competitions",
    icon: Trophy,
    tone: "accent",
  },
  {
    title: "المشاركات",
    description: "توثيق المشاركات.",
    href: "/activities/participations",
    icon: Award,
    tone: "primary",
  },
  {
    title: "التقارير",
    description: "تقارير النشاط.",
    href: "/activities/reports",
    icon: FileText,
    tone: "neutral",
  },
  {
    title: "التنبيهات",
    description: "تنبيهات النشاط.",
    href: "/notifications",
    icon: Bell,
    tone: "danger",
  },
  {
    title: "البحث",
    description: "بحث شامل.",
    href: "/search",
    icon: Search,
    tone: "neutral",
  },
] as const;

const QUICK_LINK_TONE_CLASSES: Record<QuickLinkTone, string> = {
  primary:
    "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]",
  success:
    "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]",
  accent:
    "bg-[color-mix(in_srgb,var(--app-accent)_18%,transparent)] text-[var(--app-accent-foreground)]",
  danger:
    "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]",
  neutral: "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
};

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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function rows<T>(result: PromiseSettledResult<SupabaseListResult<T>>): T[] {
  if (result.status !== "fulfilled" || result.value.error) {
    return [];
  }

  return result.value.data ?? [];
}

function isActiveStatus(value?: string | null) {
  const status = String(value || "").toLowerCase();

  return (
    status.includes("نشط") ||
    status.includes("قائم") ||
    status.includes("معتمد") ||
    status === "active" ||
    status === "approved"
  );
}

function getStatusClass(value?: string | null) {
  const status = String(value || "").toLowerCase();

  if (isActiveStatus(status)) {
    return "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
  }

  if (
    status.includes("انتظار") ||
    status.includes("مسودة") ||
    status.includes("قيد") ||
    status === "pending"
  ) {
    return "bg-[color-mix(in_srgb,var(--app-warning)_14%,transparent)] text-[var(--app-warning-foreground)]";
  }

  if (
    status.includes("مغلق") ||
    status.includes("ملغي") ||
    status.includes("مرفوض") ||
    status === "closed" ||
    status === "cancelled"
  ) {
    return "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]";
  }

  return "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]";
}

function getAchievementLevel(score: number) {
  if (score >= 80) return "متميز";
  if (score >= 40) return "جيد";
  return "قيد البناء";
}

function getReadinessValue(level: string) {
  if (level === "متميز") return 90;
  if (level === "جيد") return 60;
  return 25;
}

function getProgressClass(value: number) {
  if (value >= 75) return "bg-[var(--app-success)]";
  if (value >= 40) return "bg-[var(--app-accent)]";
  return "bg-[var(--app-danger)]";
}

export default function ActivitiesPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [stats, setStats] = useState<ActivityStats>(EMPTY_STATS);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const today = useMemo(() => getTodayDate(), []);

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
          .select(
            "id, title, activity_name, activity_type, status, start_date, end_date, created_at",
          )
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
          .select(
            "id, title, competition_name, status, competition_date, created_at",
          )
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
      setErrorMsg(
        error instanceof Error ? error.message : "تعذر تحميل بيانات النشاط.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setLoading(false);
      setErrorMsg("لا توجد مدرسة مرتبطة بالحساب.");
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

    return getAchievementLevel(score);
  }, [stats]);

  const readinessValue = getReadinessValue(achievementLevel);

  const activeRate = stats.activities
    ? Math.round((stats.activeActivities / stats.activities) * 100)
    : 0;

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل مركز النشاط..." />
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
            description="إدارة الأنشطة والفرق والمسابقات والمشاركات."
            badge="بوابة رائد النشاط"
            icon={<Trophy size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الأنشطة" },
            ]}
            meta={[
              { label: "اليوم", value: today },
              { label: "التاريخ", value: getTodayLabel() },
              {
                label: "المدرسة",
                value: currentSchool?.school_name || "منصة المدرسة الذكية",
              },
              { label: "المستوى", value: achievementLevel },
            ]}
            stats={[
              {
                label: "الأنشطة",
                value: stats.activities,
                icon: <Sparkles size={20} aria-hidden="true" />,
                tone: "primary",
              },
              {
                label: "الفرق",
                value: stats.teams,
                icon: <Users size={20} aria-hidden="true" />,
                tone: "green",
              },
              {
                label: "المسابقات",
                value: stats.competitions,
                icon: <Trophy size={20} aria-hidden="true" />,
                tone: "gold",
              },
              {
                label: "التنبيهات",
                value: stats.unreadNotifications,
                icon: <Bell size={20} aria-hidden="true" />,
                tone: stats.unreadNotifications > 0 ? "red" : "green",
              },
            ]}
            actions={
              <>
                <SecondaryButton
                  onClick={() => void loadPage()}
                  aria-label="تحديث بيانات النشاط"
                >
                  <RefreshCcw size={17} aria-hidden="true" />
                  تحديث
                </SecondaryButton>

                <ActionLink
                  href="/search"
                  icon={<Search size={17} aria-hidden="true" />}
                  label="البحث"
                  variant="primary"
                />

                <ActionLink
                  href="/notifications"
                  icon={<Bell size={17} aria-hidden="true" />}
                  label="التنبيهات"
                  variant="accent"
                />
              </>
            }
          />

          {errorMsg ? (
            <SummaryCard
              title="تنبيه"
              description={errorMsg}
              tone="gold"
              items={[
                {
                  label: "الحالة",
                  value: "ستبقى الصفحة متاحة حتى اكتمال الجداول.",
                },
              ]}
            />
          ) : null}

          <section
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6"
            aria-label="مؤشرات النشاط"
          >
            <ExecutiveCard
              title="الأنشطة"
              value={stats.activities}
              subtitle="الإجمالي"
              icon={<Sparkles size={22} aria-hidden="true" />}
              tone="primary"
              progress={stats.activities > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="النشطة"
              value={stats.activeActivities}
              subtitle="مفعلة"
              icon={<CheckCircle2 size={22} aria-hidden="true" />}
              tone="green"
              progress={activeRate}
            />

            <ExecutiveCard
              title="الفرق"
              value={stats.teams}
              subtitle="فرق النشاط"
              icon={<Users size={22} aria-hidden="true" />}
              tone="green"
              progress={stats.teams > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="المسابقات"
              value={stats.competitions}
              subtitle="العدد"
              icon={<Trophy size={22} aria-hidden="true" />}
              tone="gold"
              progress={stats.competitions > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="المشاركون"
              value={stats.participants}
              subtitle="طلاب"
              icon={<UserCheck size={22} aria-hidden="true" />}
              tone="primary"
              progress={stats.participants > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="التنبيهات"
              value={stats.unreadNotifications}
              subtitle="غير مقروءة"
              icon={<Bell size={22} aria-hidden="true" />}
              tone={stats.unreadNotifications > 0 ? "red" : "green"}
              progress={stats.unreadNotifications > 0 ? 100 : 0}
            />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <Panel title="ملخص النشاط" icon={<Target size={24} aria-hidden="true" />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <MiniInfo
                  label="الأنشطة المفعلة"
                  value={stats.activeActivities}
                  icon={<CheckCircle2 size={18} aria-hidden="true" />}
                />
                <MiniInfo
                  label="الفرق"
                  value={stats.teams}
                  icon={<Users size={18} aria-hidden="true" />}
                />
                <MiniInfo
                  label="المسابقات"
                  value={stats.competitions}
                  icon={<Flag size={18} aria-hidden="true" />}
                />
                <MiniInfo
                  label="المشاركون"
                  value={stats.participants}
                  icon={<UserCheck size={18} aria-hidden="true" />}
                />
                <MiniInfo
                  label="التقارير"
                  value={stats.reports}
                  icon={<FileText size={18} aria-hidden="true" />}
                />
                <MiniInfo
                  label="المستوى"
                  value={achievementLevel}
                  icon={<Trophy size={18} aria-hidden="true" />}
                />
              </div>

              <div className="mt-5 rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-black text-[var(--app-text)]">
                    جاهزية النشاط
                  </p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                      achievementLevel,
                    )}`}
                  >
                    {achievementLevel}
                  </span>
                </div>

                <ProgressBar value={readinessValue} />

                <p className="mt-3 text-sm leading-7 text-[var(--app-text-muted)]">
                  يعتمد المؤشر على الأنشطة والفرق والمسابقات والمشاركات.
                </p>
              </div>
            </Panel>

            <Panel title="آخر التنبيهات" icon={<Bell size={24} aria-hidden="true" />}>
              {notifications.length === 0 ? (
                <EmptyState
                  title="لا توجد تنبيهات"
                  description="لا توجد تنبيهات حاليًا."
                />
              ) : (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <Link
                      key={item.id}
                      href="/notifications"
                      className="block rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 transition hover:bg-[var(--app-card)] hover:shadow-[var(--app-shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <h3 className="line-clamp-1 font-black text-[var(--app-text)]">
                          {item.title || "تنبيه"}
                        </h3>

                        {item.is_read === false ? (
                          <span
                            className="h-2.5 w-2.5 rounded-full bg-[var(--app-danger)]"
                            aria-label="غير مقروء"
                          />
                        ) : null}
                      </div>

                      <p className="line-clamp-2 text-sm leading-7 text-[var(--app-text-muted)]">
                        {item.message || "لا توجد تفاصيل."}
                      </p>

                      <time
                        dateTime={item.created_at || undefined}
                        className="mt-2 block text-xs font-bold text-[var(--app-text-subtle)]"
                      >
                        {formatDate(item.created_at)}
                      </time>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel title="آخر الأنشطة" icon={<Sparkles size={24} aria-hidden="true" />}>
              {activities.length === 0 ? (
                <EmptyState
                  title="لا توجد أنشطة"
                  description="لا توجد أنشطة مسجلة."
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

            <Panel title="المسابقات والفرق" icon={<Trophy size={24} aria-hidden="true" />}>
              <div className="grid gap-5">
                <ActivityListSection
                  title="المسابقات الأخيرة"
                  emptyTitle="لا توجد مسابقات"
                  emptyDescription="لا توجد مسابقات مسجلة."
                  hasItems={competitions.length > 0}
                >
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
                </ActivityListSection>

                <ActivityListSection
                  title="فرق النشاط"
                  emptyTitle="لا توجد فرق"
                  emptyDescription="لا توجد فرق مسجلة."
                  hasItems={teams.length > 0}
                >
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
                </ActivityListSection>
              </div>
            </Panel>
          </section>

          <PageSection
            title="خدمات النشاط"
            description="روابط الإدارة اليومية."
            icon={<Sparkles size={24} aria-hidden="true" />}
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

function ActionLink({
  href,
  icon,
  label,
  variant,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  variant: "primary" | "accent";
}) {
  const variantClass =
    variant === "primary"
      ? "bg-[var(--app-primary)] text-[var(--app-primary-foreground)] focus-visible:ring-[var(--app-primary)]"
      : "bg-[var(--app-accent)] text-[var(--app-accent-foreground)] focus-visible:ring-[var(--app-accent)]";

  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold shadow-[var(--app-shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-background)] ${variantClass}`}
    >
      {icon}
      {label}
    </Link>
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
    <PageSection title={title} icon={icon}>
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
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-[var(--app-primary)]">
        {icon}
        <p className="text-xs font-black text-[var(--app-text-muted)]">
          {label}
        </p>
      </div>

      <p className="text-lg font-black text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function ActivityListSection({
  title,
  emptyTitle,
  emptyDescription,
  hasItems,
  children,
}: {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  hasItems: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 font-black text-[var(--app-text)]">{title}</h3>

      {hasItems ? (
        <div className="space-y-3">{children}</div>
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
    </section>
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
      className="block rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 transition hover:bg-[var(--app-card)] hover:shadow-[var(--app-shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[var(--app-card)] px-3 py-1 text-xs font-black text-[var(--app-text)]">
          {subtitle}
        </span>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
            status,
          )}`}
        >
          {status}
        </span>
      </div>

      <h3 className="line-clamp-1 font-black text-[var(--app-text)]">
        {title}
      </h3>

      <time
        dateTime={date || undefined}
        className="mt-2 block text-xs font-bold text-[var(--app-text-subtle)]"
      >
        {formatDate(date)}
      </time>
    </Link>
  );
}

function QuickLinkCard({ link }: { link: QuickLink }) {
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      className="group rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-5 transition hover:-translate-y-0.5 hover:bg-[var(--app-card)] hover:shadow-[var(--app-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
      aria-label={`فتح ${link.title}`}
    >
      <span
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-lg)] transition ${QUICK_LINK_TONE_CLASSES[link.tone]}`}
        aria-hidden="true"
      >
        <Icon size={24} />
      </span>

      <h3 className="text-xl font-black text-[var(--app-text)]">
        {link.title}
      </h3>

      <p className="mt-3 line-clamp-2 text-sm leading-7 text-[var(--app-text-muted)]">
        {link.description}
      </p>

      <div className="mt-5 rounded-[var(--app-radius-lg)] bg-[var(--app-card)] px-4 py-3 text-center text-sm font-black text-[var(--app-text)] transition group-hover:bg-[var(--app-primary)] group-hover:text-[var(--app-primary-foreground)]">
        فتح
      </div>
    </Link>
  );
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className="h-4 overflow-hidden rounded-full bg-[var(--app-border)]"
      role="progressbar"
      aria-label="جاهزية النشاط"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${getProgressClass(
          safeValue,
        )}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}


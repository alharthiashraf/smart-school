"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/auth/RoleGuard";
import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  Award,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Flag,
  FolderKanban,
  Loader2,
  Megaphone,
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
    title: "ط§ظ„ط£ظ†ط´ط·ط©",
    description: "ط¥ط¯ط§ط±ط© ط§ظ„ط£ظ†ط´ط·ط© ط§ظ„ظ…ط¯ط±ط³ظٹط© ظˆط§ظ„ط®ط·ط· ظˆط§ظ„ط¨ط±ط§ظ…ط¬.",
    href: "/activities",
    icon: Sparkles,
    color: "blue",
  },
  {
    title: "ط§ظ„ظپط±ظ‚",
    description: "ط¥ط¯ط§ط±ط© ظپط±ظ‚ ط§ظ„ظ†ط´ط§ط· ظˆط§ظ„ط·ظ„ط§ط¨ ط§ظ„ظ…ط´ط§ط±ظƒظٹظ†.",
    href: "/activities/teams",
    icon: Users,
    color: "green",
  },
  {
    title: "ط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھ",
    description: "ظ…طھط§ط¨ط¹ط© ط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھ ط§ظ„ط¯ط§ط®ظ„ظٹط© ظˆط§ظ„ط®ط§ط±ط¬ظٹط©.",
    href: "/activities/competitions",
    icon: Trophy,
    color: "gold",
  },
  {
    title: "ط§ظ„ظ…ط´ط§ط±ظƒط§طھ",
    description: "طھظˆط«ظٹظ‚ ظ…ط´ط§ط±ظƒط§طھ ط§ظ„ط·ظ„ط§ط¨ ظˆط§ظ„ط¥ظ†ط¬ط§ط²ط§طھ.",
    href: "/activities/participations",
    icon: Award,
    color: "blue",
  },
  {
    title: "ط§ظ„طھظ‚ط§ط±ظٹط±",
    description: "طھظ‚ط§ط±ظٹط± ط§ظ„ظ†ط´ط§ط· ظˆط§ظ„ط¥ظ†ط¬ط§ط²ط§طھ ظˆط§ظ„ظ…ط´ط§ط±ظƒط§طھ.",
    href: "/activities/reports",
    icon: FileText,
    color: "slate",
  },
  {
    title: "ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ",
    description: "ظ…طھط§ط¨ط¹ط© ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ ط§ظ„ظ…ط±طھط¨ط·ط© ط¨ط§ظ„ط£ظ†ط´ط·ط©.",
    href: "/notifications",
    icon: Bell,
    color: "red",
  },
  {
    title: "ط§ظ„ط¨ط­ط« ط§ظ„ط´ط§ظ…ظ„",
    description: "ط§ظ„ط¨ط­ط« ظپظٹ ط§ظ„ط·ظ„ط§ط¨ ظˆط§ظ„ظ…ط¹ظ„ظ…ظٹظ† ظˆط§ظ„ط³ط¬ظ„ط§طھ.",
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
  if (!value) return "â€”";

  return new Date(value).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function rows<T>(result: PromiseSettledResult<any>): T[] {
  if (result.status !== "fulfilled") return [];
  if (result.value?.error) return [];
  return (result.value?.data as T[]) || [];
}

function isActiveStatus(value?: string | null) {
  const status = String(value || "");

  return (
    status.includes("ظ†ط´ط·") ||
    status.includes("ظ‚ط§ط¦ظ…") ||
    status.includes("ظ…ط¹طھظ…ط¯") ||
    status === "active" ||
    status === "approved"
  );
}

function getQuickColorClasses(color: QuickLink["color"]) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    gold: "bg-gold-50 text-gold-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return colors[color];
}

function getStatusPill(value?: string | null) {
  const status = String(value || "");

  if (
    status.includes("ظ†ط´ط·") ||
    status.includes("ظ‚ط§ط¦ظ…") ||
    status.includes("ظ…ط¹طھظ…ط¯") ||
    status === "active" ||
    status === "approved"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    status.includes("ط§ظ†طھط¸ط§ط±") ||
    status.includes("ظ…ط³ظˆط¯ط©") ||
    status.includes("ظ‚ظٹط¯") ||
    status === "pending"
  ) {
    return "bg-gold-50 text-gold-700";
  }

  if (
    status.includes("ظ…ط؛ظ„ظ‚") ||
    status.includes("ظ…ظ„ط؛ظٹ") ||
    status.includes("ظ…ط±ظپظˆط¶") ||
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

  useEffect(() => {
    if (currentSchool?.id) void loadPage();
  }, [currentSchool?.id]);

  async function loadPage() {
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
          isActiveStatus(item.status)
        ).length,
        teams: teamRows.length,
        competitions: competitionRows.length,
        participants: participantRows.length,
        reports: reportRows.length,
        unreadNotifications: notificationRows.filter(
          (item) => item.is_read === false
        ).length,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "طھط¹ط°ط± طھط­ظ…ظٹظ„ ط¨ظˆط§ط¨ط© ط±ط§ط¦ط¯ ط§ظ„ظ†ط´ط§ط·";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }

  const achievementLevel = useMemo(() => {
    const score =
      stats.activeActivities * 15 +
      stats.competitions * 10 +
      stats.teams * 8 +
      stats.participants;

    if (score >= 80) return "ظ…طھظ…ظٹط²";
    if (score >= 40) return "ط¬ظٹط¯";
    return "ظ‚ظٹط¯ ط§ظ„ط¨ظ†ط§ط،";
  }, [stats]);

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <LoadingBox />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-6" dir="rtl">
          <section className="overflow-hidden rounded-[32px] bg-gradient-to-l from-[#15445A] via-[#15445A] to-[#0DA9A6] p-6 text-white shadow-xl">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#C1B489] text-[#15445A] shadow-lg sm:flex">
                  <Trophy size={32} />
                </div>

                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-[#C1B489]">
                      ط¨ظˆط§ط¨ط© ط±ط§ط¦ط¯ ط§ظ„ظ†ط´ط§ط·
                    </span>

                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                      ط§ظ„ظٹظˆظ… {today}
                    </span>
                  </div>

                  <h1 className="text-3xl font-black md:text-4xl">
                    ظ…ط±ظƒط² ط§ظ„ظ†ط´ط§ط· ط§ظ„ط·ظ„ط§ط¨ظٹ
                  </h1>

                  <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
                    ظ…طھط§ط¨ط¹ط© ط§ظ„ط£ظ†ط´ط·ط© ط§ظ„ظ…ط¯ط±ط³ظٹط©طŒ ط§ظ„ظپط±ظ‚طŒ ط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھطŒ ط§ظ„ظ…ط´ط§ط±ظƒط§طھطŒ
                    ط§ظ„طھظ‚ط§ط±ظٹط±طŒ ظˆط§ظ„ط¥ظ†ط¬ط§ط²ط§طھ ظپظٹ ظ…ظƒط§ظ† ظˆط§ط­ط¯.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#C1B489] px-4 py-2 text-xs font-black text-[#15445A]">
                      ط±ط§ط¦ط¯ ط§ظ„ظ†ط´ط§ط·
                    </span>

                    <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white">
                      {getTodayLabel()}
                    </span>

                    <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white">
                      ظ…ط³طھظˆظ‰ ط§ظ„ظ†ط´ط§ط·: {achievementLevel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  onClick={() => void loadPage()}
                  className="flex h-12 items-center gap-2 rounded-2xl bg-[#C1B489] px-4 text-sm font-black text-[#15445A]"
                >
                  طھط­ط¯ظٹط«
                  <RefreshCcw size={16} />
                </button>

                <Link
                  href="/search"
                  className="flex h-12 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#15445A]"
                >
                  ط§ظ„ط¨ط­ط«
                  <Search size={16} />
                </Link>

                <Link
                  href="/notifications"
                  className="flex h-12 items-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black text-white hover:bg-white/20"
                >
                  ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ
                  <Bell size={16} />
                </Link>
              </div>
            </div>
          </section>

          {errorMsg && (
            <div className="rounded-3xl border border-gold-100 bg-gold-50 p-5 text-sm font-bold text-gold-700">
              {errorMsg}
              <div className="mt-2 text-xs leading-6 text-gold-600">
                ط¥ط°ط§ ظ„ظ… طھظƒظ† ط¬ط¯ط§ظˆظ„ ط§ظ„ط£ظ†ط´ط·ط© ظ…ظˆط¬ظˆط¯ط© ط¨ط¹ط¯طŒ ط³طھط¨ظ‚ظ‰ ط§ظ„طµظپط­ط© طھط¹ظ…ظ„ ظƒظˆط§ط¬ظ‡ط©
                ط±ط¦ظٹط³ظٹط© ظˆظٹظ…ظƒظ† ط¥ظ†ط´ط§ط، ط§ظ„ط¬ط¯ط§ظˆظ„ ظ„ط§ط­ظ‚ظ‹ط§.
              </div>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <SummaryCard
              title="ط§ظ„ط£ظ†ط´ط·ط©"
              value={stats.activities}
              icon={<Sparkles size={22} />}
              color="blue"
            />

            <SummaryCard
              title="ط§ظ„ظ†ط´ط·ط©"
              value={stats.activeActivities}
              icon={<CheckCircle2 size={22} />}
              color="green"
            />

            <SummaryCard
              title="ط§ظ„ظپط±ظ‚"
              value={stats.teams}
              icon={<Users size={22} />}
              color="green"
            />

            <SummaryCard
              title="ط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھ"
              value={stats.competitions}
              icon={<Trophy size={22} />}
              color="gold"
            />

            <SummaryCard
              title="ط§ظ„ظ…ط´ط§ط±ظƒظˆظ†"
              value={stats.participants}
              icon={<UserCheck size={22} />}
              color="blue"
            />

            <SummaryCard
              title="طھظ†ط¨ظٹظ‡ط§طھ"
              value={stats.unreadNotifications}
              icon={<Bell size={22} />}
              color="red"
            />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <Panel title="ظ…ظ„ط®طµ ط§ظ„ظ†ط´ط§ط· ط§ظ„ط·ظ„ط§ط¨ظٹ" icon={<Target size={24} />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <MiniInfo
                  label="ط£ظ†ط´ط·ط© ظ…ظپط¹ظ„ط©"
                  value={stats.activeActivities}
                  icon={<CheckCircle2 size={18} />}
                />

                <MiniInfo
                  label="ظپط±ظ‚ ط§ظ„ظ†ط´ط§ط·"
                  value={stats.teams}
                  icon={<Users size={18} />}
                />

                <MiniInfo
                  label="ط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھ"
                  value={stats.competitions}
                  icon={<Flag size={18} />}
                />

                <MiniInfo
                  label="ط§ظ„ظ…ط´ط§ط±ظƒظˆظ†"
                  value={stats.participants}
                  icon={<UserCheck size={18} />}
                />

                <MiniInfo
                  label="ط§ظ„طھظ‚ط§ط±ظٹط±"
                  value={stats.reports}
                  icon={<FileText size={18} />}
                />

                <MiniInfo
                  label="ظ…ط³طھظˆظ‰ ط§ظ„ظ†ط´ط§ط·"
                  value={achievementLevel}
                  icon={<Trophy size={18} />}
                />
              </div>

              <div className="mt-5 rounded-3xl bg-slate-50 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-black text-[#15445A]">
                    ط¬ط§ظ‡ط²ظٹط© ط§ظ„ظ†ط´ط§ط· ط§ظ„ظ…ط¯ط±ط³ظٹ
                  </p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      achievementLevel === "ظ…طھظ…ظٹط²"
                        ? "bg-emerald-50 text-emerald-700"
                        : achievementLevel === "ط¬ظٹط¯"
                          ? "bg-gold-50 text-gold-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {achievementLevel}
                  </span>
                </div>

                <ProgressBar
                  value={
                    achievementLevel === "ظ…طھظ…ظٹط²"
                      ? 90
                      : achievementLevel === "ط¬ظٹط¯"
                        ? 60
                        : 25
                  }
                />

                <p className="mt-3 text-sm leading-7 text-slate-500">
                  ظٹظ‚ظٹط³ ط§ظ„ظ…ط¤ط´ط± ظƒط«ط§ظپط© ط§ظ„ط£ظ†ط´ط·ط©طŒ ط§ظ„ظپط±ظ‚طŒ ط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھطŒ ظˆظ…ط´ط§ط±ظƒط§طھ ط§ظ„ط·ظ„ط§ط¨.
                </p>
              </div>
            </Panel>

            <Panel title="ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ ط§ظ„ط£ط®ظٹط±ط©" icon={<Bell size={24} />}>
              {notifications.length === 0 ? (
                <EmptyBox text="ظ„ط§ طھظˆط¬ط¯ طھظ†ط¨ظٹظ‡ط§طھ ط­ط§ظ„ظٹط§ظ‹." />
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
                          {item.title || "طھظ†ط¨ظٹظ‡"}
                        </h3>

                        {item.is_read === false && (
                          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        )}
                      </div>

                      <p className="line-clamp-2 text-sm leading-7 text-slate-500">
                        {item.message || "ظ„ط§ طھظˆط¬ط¯ طھظپط§طµظٹظ„."}
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
            <Panel title="ط¢ط®ط± ط§ظ„ط£ظ†ط´ط·ط©" icon={<Sparkles size={24} />}>
              {activities.length === 0 ? (
                <EmptyBox text="ظ„ط§ طھظˆط¬ط¯ ط£ظ†ط´ط·ط© ظ…ط³ط¬ظ„ط© ط­طھظ‰ ط§ظ„ط¢ظ†." />
              ) : (
                <div className="space-y-3">
                  {activities.map((item) => (
                    <ActivityCard
                      key={item.id}
                      title={item.title || item.activity_name || "ظ†ط´ط§ط· ظ…ط¯ط±ط³ظٹ"}
                      subtitle={item.activity_type || "ظ†ط´ط§ط·"}
                      status={item.status || "ط؛ظٹط± ظ…ط­ط¯ط¯"}
                      date={item.start_date || item.created_at}
                      href="/activities"
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="ط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھ ظˆط§ظ„ظپط±ظ‚" icon={<Trophy size={24} />}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="mb-3 font-black text-[#15445A]">
                    ط§ظ„ظ…ط³ط§ط¨ظ‚ط§طھ ط§ظ„ط£ط®ظٹط±ط©
                  </h3>

                  {competitions.length === 0 ? (
                    <EmptyBox text="ظ„ط§ طھظˆط¬ط¯ ظ…ط³ط§ط¨ظ‚ط§طھ ظ…ط³ط¬ظ„ط©." />
                  ) : (
                    <div className="space-y-3">
                      {competitions.slice(0, 4).map((item) => (
                        <ActivityCard
                          key={item.id}
                          title={
                            item.title || item.competition_name || "ظ…ط³ط§ط¨ظ‚ط©"
                          }
                          subtitle="ظ…ط³ط§ط¨ظ‚ط©"
                          status={item.status || "ط؛ظٹط± ظ…ط­ط¯ط¯"}
                          date={item.competition_date || item.created_at}
                          href="/activities/competitions"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 font-black text-[#15445A]">
                    ظپط±ظ‚ ط§ظ„ظ†ط´ط§ط·
                  </h3>

                  {teams.length === 0 ? (
                    <EmptyBox text="ظ„ط§ طھظˆط¬ط¯ ظپط±ظ‚ ظ†ط´ط§ط· ظ…ط³ط¬ظ„ط©." />
                  ) : (
                    <div className="space-y-3">
                      {teams.slice(0, 4).map((item) => (
                        <ActivityCard
                          key={item.id}
                          title={item.team_name || item.title || "ظپط±ظٹظ‚ ظ†ط´ط§ط·"}
                          subtitle="ظپط±ظٹظ‚"
                          status={item.status || "ط؛ظٹط± ظ…ط­ط¯ط¯"}
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

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-black text-[#15445A]">
                ط®ط¯ظ…ط§طھ ط¨ظˆط§ط¨ط© ط±ط§ط¦ط¯ ط§ظ„ظ†ط´ط§ط·
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                ط£ظ‡ظ… ط§ظ„طµظپط­ط§طھ ط§ظ„ظٹظˆظ…ظٹط© ظ„ط¥ط¯ط§ط±ط© ط§ظ„ظ†ط´ط§ط· ط§ظ„ط·ظ„ط§ط¨ظٹ.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {QUICK_LINKS.map((link) => (
                <QuickLinkCard key={link.href} link={link} />
              ))}
            </div>
          </section>
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: "blue" | "green" | "gold" | "red";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    gold: "bg-gold-50 text-gold-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${colors[color]}`}
      >
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>

      <h3 className="mt-2 text-3xl font-black text-[#15445A]">{value}</h3>
    </div>
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
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#15445A]/5 text-[#15445A]">
          {icon}
        </div>

        <h2 className="text-2xl font-black text-[#15445A]">{title}</h2>
      </div>

      {children}
    </section>
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
          link.color
        )}`}
      >
        <Icon size={24} />
      </div>

      <h3 className="text-xl font-black text-[#15445A]">{link.title}</h3>

      <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-500">
        {link.description}
      </p>

      <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-black text-[#15445A] transition group-hover:bg-[#15445A] group-hover:text-white">
        ظپطھط­
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
        ? "bg-gold-500"
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

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="rounded-3xl bg-white p-6 text-center text-slate-500 shadow-sm">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#15445A]" />
        ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط¨ظˆط§ط¨ط© ط±ط§ط¦ط¯ ط§ظ„ظ†ط´ط§ط·...
      </div>
    </div>
  );
}

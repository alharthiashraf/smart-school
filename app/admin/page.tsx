"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Database,
  GraduationCap,
  History,
  Loader2,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  XCircle,
} from "lucide-react";

const cards = [
  {
    title: "ط§ظ„ظ…ط¹ظ„ظ…ظˆظ†",
    description: "ط¥ط¯ط§ط±ط© ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط¹ظ„ظ…ظٹظ† ظˆظ…ظ„ظپط§طھظ‡ظ… ظˆط¬ط¯ط§ظˆظ„ظ‡ظ….",
    href: "/teachers",
    icon: GraduationCap,
  },
  {
    title: "ط§ظ„ط·ظ„ط§ط¨",
    description: "ط¥ط¯ط§ط±ط© ط¨ظٹط§ظ†ط§طھ ط§ظ„ط·ظ„ط§ط¨ ظˆط§ظ„ط­ط§ظ„ط© ط§ظ„ط¯ط±ط§ط³ظٹط© ظˆط§ظ„ظ…طھط§ط¨ط¹ط©.",
    href: "/students",
    icon: Users,
  },
  {
    title: "ط§ظ„طھظ‚ط§ط±ظٹط±",
    description: "طھظ‚ط§ط±ظٹط± ط§ظ„ط­ط¶ظˆط±طŒ ط§ظ„ط¯ط±ط¬ط§طھطŒ ط§ظ„ط³ظ„ظˆظƒ ظˆط§ظ„ظ…ط¤ط´ط±ط§طھ.",
    href: "/reports",
    icon: BarChart3,
  },
  {
    title: "ط§ظ„ظ…ط³طھط®ط¯ظ…ظˆظ†",
    description: "ط¥ط¯ط§ط±ط© ط­ط³ط§ط¨ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ† ظˆط§ظ„طµظ„ط§ط­ظٹط§طھ.",
    href: "/users",
    icon: UsersRound,
  },
  {
    title: "ط§ظ„طھط­ظ„ظٹظ„ط§طھ",
    description: "ظ„ظˆط­ط§طھ طھط­ظ„ظٹظ„ظٹط© ظˆظ…ط¤ط´ط±ط§طھ ط£ط¯ط§ط، ط§ظ„ظ…ط¯ط±ط³ط©.",
    href: "/analytics",
    icon: ShieldCheck,
  },
  {
    title: "ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ",
    description: "ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ظ…ط¯ط±ط³ط© ظˆط§ظ„ظ†ط¸ط§ظ… ظˆط§ظ„طµظ„ط§ط­ظٹط§طھ.",
    href: "/settings",
    icon: Settings,
  },
];

type ReadinessKey =
  | "students"
  | "teachers"
  | "users"
  | "attendance"
  | "grades"
  | "referrals"
  | "notifications"
  | "parents";

type ReadinessCounts = Record<ReadinessKey, number>;

type AuditLog = {
  id: string;
  school_id: string | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  module: string;
  description: string | null;
  created_at: string;
};

const emptyCounts: ReadinessCounts = {
  students: 0,
  teachers: 0,
  users: 0,
  attendance: 0,
  grades: 0,
  referrals: 0,
  notifications: 0,
  parents: 0,
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function moduleLabel(module: string) {
  const labels: Record<string, string> = {
    students: "ط§ظ„ط·ظ„ط§ط¨",
    teachers: "ط§ظ„ظ…ط¹ظ„ظ…ظˆظ†",
    attendance: "ط§ظ„ط­ط¶ظˆط±",
    grades: "ط§ظ„ط¯ط±ط¬ط§طھ",
    behavior: "ط§ظ„ط³ظ„ظˆظƒ",
    referrals: "ط§ظ„ط¥ط­ط§ظ„ط§طھ",
    settings: "ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ",
    users: "ط§ظ„ظ…ط³طھط®ط¯ظ…ظˆظ†",
    health: "ط§ظ„طµط­ط©",
    activities: "ط§ظ„ظ†ط´ط§ط·",
    system: "ط§ظ„ظ†ط¸ط§ظ…",
  };

  return labels[module] ?? module;
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    create: "ط¥ط¶ط§ظپط©",
    update: "طھط¹ط¯ظٹظ„",
    delete: "ط­ط°ظپ",
    login: "ط¯ط®ظˆظ„",
    logout: "ط®ط±ظˆط¬",
    export: "طھطµط¯ظٹط±",
    print: "ط·ط¨ط§ط¹ط©",
    close: "ط¥ط؛ظ„ط§ظ‚",
    approve: "ط§ط¹طھظ…ط§ط¯",
    reject: "ط±ظپط¶",
    unknown: "ط¹ظ…ظ„ظٹط©",
  };

  return labels[action] ?? action;
}

export default function AdminPage() {
  const { currentSchool } = useSchool();

  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<ReadinessCounts>(emptyCounts);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function safeCount(
    table: string,
    options?: {
      schoolScoped?: boolean;
      notNullColumn?: string;
    }
  ) {
    try {
      let query = supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (options?.schoolScoped && currentSchool?.id) {
        query = query.eq("school_id", currentSchool.id);
      }

      if (options?.notNullColumn) {
        query = query.not(options.notNullColumn, "is", null);
      }

      const { count, error } = await query;

      if (error) {
        console.warn(`Count failed for ${table}:`, error.message);
        return 0;
      }

      return count ?? 0;
    } catch (error) {
      console.warn(`Unexpected count error for ${table}:`, error);
      return 0;
    }
  }

  async function countFirstAvailable(
    tables: string[],
    options?: {
      schoolScoped?: boolean;
      notNullColumn?: string;
    }
  ) {
    for (const table of tables) {
      const value = await safeCount(table, options);
      if (value > 0) return value;
    }

    return 0;
  }

  async function loadAdminData() {
    try {
      setRefreshing(true);

      const [
        studentsCount,
        teachersCount,
        usersCount,
        attendanceCount,
        gradesCount,
        referralsCount,
        notificationsCount,
        parentsLinkedCount,
      ] = await Promise.all([
        safeCount("students", { schoolScoped: true }),
        safeCount("teachers", { schoolScoped: true }),
        safeCount("school_users", { schoolScoped: true }),
        countFirstAvailable(["attendance_records", "attendance"], {
          schoolScoped: true,
        }),
        countFirstAvailable(["student_period_scores", "grades", "student_grades"], {
          schoolScoped: true,
        }),
        safeCount("student_referrals", { schoolScoped: true }),
        countFirstAvailable(["notifications", "alerts"], {
          schoolScoped: true,
        }),
        safeCount("students", {
          schoolScoped: true,
          notNullColumn: "guardian_email",
        }),
      ]);

      setCounts({
        students: studentsCount,
        teachers: teachersCount,
        users: usersCount,
        attendance: attendanceCount,
        grades: gradesCount,
        referrals: referralsCount,
        notifications: notificationsCount,
        parents: parentsLinkedCount,
      });

      let logsQuery = supabase
        .from("audit_logs")
        .select(
          "id, school_id, user_name, user_role, action, module, description, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(10);

      if (currentSchool?.id) {
        logsQuery = logsQuery.eq("school_id", currentSchool.id);
      }

      const { data: logsData, error: logsError } = await logsQuery;

      if (logsError) {
        console.warn("Audit logs load failed:", logsError.message);
        setAuditLogs([]);
      } else {
        setAuditLogs((logsData ?? []) as AuditLog[]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSchool?.id]);

  const readinessItems = useMemo(() => {
    return [
      {
        key: "students",
        label: "ط¨ظٹط§ظ†ط§طھ ط§ظ„ط·ظ„ط§ط¨",
        description: "ظˆط¬ظˆط¯ ط·ظ„ط§ط¨ ظ…ط¶ط§ظپظٹظ† ظپظٹ ط§ظ„ظ…ط¯ط±ط³ط©.",
        count: counts.students,
        ready: counts.students > 0,
      },
      {
        key: "teachers",
        label: "ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط¹ظ„ظ…ظٹظ†",
        description: "ظˆط¬ظˆط¯ ظ…ط¹ظ„ظ…ظٹظ† ظ…ط¶ط§ظپظٹظ† ظپظٹ ط§ظ„ظ…ط¯ط±ط³ط©.",
        count: counts.teachers,
        ready: counts.teachers > 0,
      },
      {
        key: "users",
        label: "ط­ط³ط§ط¨ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ†",
        description: "ظˆط¬ظˆط¯ ظ…ط³طھط®ط¯ظ…ظٹظ† ظˆطµظ„ط§ط­ظٹط§طھ ظ„ظ„ظ…ط¯ط±ط³ط©.",
        count: counts.users,
        ready: counts.users > 0,
      },
      {
        key: "attendance",
        label: "ط³ط¬ظ„ط§طھ ط§ظ„ط­ط¶ظˆط±",
        description: "ظˆط¬ظˆط¯ ط³ط¬ظ„ط§طھ ط­ط¶ظˆط± ظ„ط§ط®طھط¨ط§ط± طھط´ط؛ظٹظ„ ط§ظ„ط­ط¶ظˆط±.",
        count: counts.attendance,
        ready: counts.attendance > 0,
      },
      {
        key: "grades",
        label: "ط³ط¬ظ„ط§طھ ط§ظ„ط¯ط±ط¬ط§طھ",
        description: "ظˆط¬ظˆط¯ ط¯ط±ط¬ط§طھ ط£ظˆ ظ†طھط§ط¦ط¬ ظ…ط±طھط¨ط·ط© ط¨ط§ظ„ط·ظ„ط§ط¨.",
        count: counts.grades,
        ready: counts.grades > 0,
      },
      {
        key: "parents",
        label: "ط±ط¨ط· ط£ظˆظ„ظٹط§ط، ط§ظ„ط£ظ…ظˆط±",
        description: "ظˆط¬ظˆط¯ ط·ظ„ط§ط¨ ظ…ط±طھط¨ط·ظٹظ† ط¨ط¨ط±ظٹط¯ ظˆظ„ظٹ ط§ظ„ط£ظ…ط±.",
        count: counts.parents,
        ready: counts.parents > 0,
      },
      {
        key: "referrals",
        label: "ط§ظ„ط¥ط­ط§ظ„ط§طھ ط§ظ„ط·ظ„ط§ط¨ظٹط©",
        description: "ظˆط¬ظˆط¯ ط¥ط­ط§ظ„ط§طھ ط£ظˆ ط³ط¬ظ„ ظ…طھط§ط¨ط¹ط© ط·ظ„ط§ط¨ظٹط©.",
        count: counts.referrals,
        ready: counts.referrals > 0,
      },
      {
        key: "notifications",
        label: "ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ",
        description: "ظˆط¬ظˆط¯ طھظ†ط¨ظٹظ‡ط§طھ ط£ظˆ ط¥ط´ط¹ط§ط±ط§طھ ط¯ط§ط®ظ„ ط§ظ„ظ†ط¸ط§ظ….",
        count: counts.notifications,
        ready: counts.notifications > 0,
      },
    ];
  }, [counts]);

  const readyCount = readinessItems.filter((item) => item.ready).length;
  const readinessPercent = Math.round(
    (readyCount / readinessItems.length) * 100
  );

  const readinessStatus =
    readinessPercent >= 85
      ? "ط¬ط§ظ‡ط²ط© ظ„ظ„طھط´ط؛ظٹظ„"
      : readinessPercent >= 60
      ? "طھط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط© ط¨ط³ظٹط·ط©"
      : "طھط­طھط§ط¬ ط§ط³طھظƒظ…ط§ظ„ ط¨ظٹط§ظ†ط§طھ";

  return (
    <AppShell>
      <main className="min-h-screen bg-slate-50" dir="rtl">
        <section className="rounded-[2rem] bg-gradient-to-br from-[#0f1f3d] via-[#18315f] to-[#24477f] p-8 text-white shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-sm font-bold text-[#d4af37]">
                ط¨ظˆط§ط¨ط© ظ…ط¯ظٹط± ط§ظ„ظ…ط¯ط±ط³ط©
              </p>

              <h1 className="text-4xl font-black">ظ…ط±ظƒط² ط¥ط¯ط§ط±ط© ط§ظ„ظ…ط¯ط±ط³ط©</h1>

              <p className="mt-4 leading-8 text-white/80">
                ظ…ظ† ظ‡ظ†ط§ ظٹط³طھط·ظٹط¹ ظ…ط¯ظٹط± ط§ظ„ظ…ط¯ط±ط³ط© ط§ظ„ظˆطµظˆظ„ ط§ظ„ط³ط±ظٹط¹ ظ„ط£ظ‡ظ… ط£ظ‚ط³ط§ظ… ط§ظ„ظ…ظ†طµط©
                ظˆظ…طھط§ط¨ط¹ط© ط§ظ„ط¹ظ…ظ„ ط§ظ„ظٹظˆظ…ظٹ ظ„ظ„ظ…ط¯ط±ط³ط©.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAdminData}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCcw size={18} />
              )}
              طھط­ط¯ظٹط« ط§ظ„ظ…ط¤ط´ط±ط§طھ
            </button>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#d4af37] hover:shadow-xl"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f1f3d] text-white transition group-hover:bg-[#d4af37] group-hover:text-slate-950">
                    <Icon size={26} />
                  </div>

                  <ChevronLeft
                    size={22}
                    className="text-slate-400 transition group-hover:-translate-x-1 group-hover:text-[#d4af37]"
                  />
                </div>

                <h2 className="text-xl font-black text-slate-900">
                  {card.title}
                </h2>

                <p className="mt-3 leading-7 text-slate-600">
                  {card.description}
                </p>
              </Link>
            );
          })}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f1f3d] text-white">
                    <Database size={22} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      ط¬ط§ظ‡ط²ظٹط© ط§ظ„طھط´ط؛ظٹظ„
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      ظپط­طµ ط³ط±ظٹط¹ ظ„ط£ظ‡ظ… ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط¯ط±ط³ط© ظ‚ط¨ظ„ ط§ظ„ظ†ط´ط± ظˆط§ظ„طھط´ط؛ظٹظ„.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-5 py-4 text-center">
                <p className="text-sm font-bold text-slate-500">
                  ظ†ط³ط¨ط© ط§ظ„ط¬ط§ظ‡ط²ظٹط©
                </p>
                <p className="mt-1 text-3xl font-black text-[#0f1f3d]">
                  {loading ? "..." : `${readinessPercent}%`}
                </p>
                <p className="mt-1 text-xs font-bold text-[#d4af37]">
                  {readinessStatus}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center rounded-3xl border border-dashed border-slate-200 p-10 text-slate-500">
                <Loader2 className="ml-2 animate-spin" size={22} />
                ط¬ط§ط±ظٹ ظپط­طµ ط¬ط§ظ‡ط²ظٹط© ط§ظ„طھط´ط؛ظٹظ„...
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {readinessItems.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {item.ready ? (
                          <CheckCircle2 className="text-emerald-600" size={20} />
                        ) : (
                          <XCircle className="text-rose-500" size={20} />
                        )}
                        <h3 className="font-black text-slate-900">
                          {item.label}
                        </h3>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          item.ready
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {item.count}
                      </span>
                    </div>

                    <p className="text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {!loading && readinessPercent < 85 && (
              <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-1 shrink-0" size={20} />
                  <p className="text-sm font-bold leading-7">
                    طھظˆط¬ط¯ ط¹ظ†ط§طµط± ظ„ظ… طھظƒطھظ…ظ„ ط¨ط¹ط¯. ظ‡ط°ط§ ظ„ط§ ظٹط¹ظ†ظٹ ظˆط¬ظˆط¯ ط®ط·ط£طŒ ظ„ظƒظ†ظ‡ ظٹط³ط§ط¹ط¯ظƒ
                    ط¹ظ„ظ‰ ظ…ط¹ط±ظپط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„طھظٹ طھط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط© ظ‚ط¨ظ„ ط§ظ„ظ†ط´ط± ط§ظ„ط±ط³ظ…ظٹ.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f1f3d] text-white">
                  <History size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    ط¢ط®ط± ط§ظ„ظ†ط´ط§ط·ط§طھ
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    ط¢ط®ط± ط§ظ„ط¹ظ…ظ„ظٹط§طھ ط§ظ„ظ…ط³ط¬ظ„ط© ط¯ط§ط®ظ„ ط§ظ„ظ†ط¸ط§ظ….
                  </p>
                </div>
              </div>

              <Activity className="text-[#d4af37]" size={24} />
            </div>

            {loading ? (
              <div className="flex items-center justify-center rounded-3xl border border-dashed border-slate-200 p-10 text-slate-500">
                <Loader2 className="ml-2 animate-spin" size={22} />
                ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط³ط¬ظ„ ط§ظ„ظ†ط´ط§ط·ط§طھ...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <History className="mx-auto mb-3 text-slate-400" size={34} />
                <h3 className="text-lg font-black text-slate-800">
                  ظ„ط§ طھظˆط¬ط¯ ظ†ط´ط§ط·ط§طھ ظ…ط³ط¬ظ„ط© ط¨ط¹ط¯
                </h3>
                <p className="mt-2 leading-7 text-slate-500">
                  ط³ظٹط¨ط¯ط£ ط³ط¬ظ„ ط§ظ„ظ†ط´ط§ط·ط§طھ ط¨ط§ظ„ط¸ظ‡ظˆط± ط¨ط¹ط¯ ط±ط¨ط· ط¹ظ…ظ„ظٹط§طھ ط§ظ„ط¥ط¶ط§ظپط© ظˆط§ظ„طھط¹ط¯ظٹظ„
                  ظˆط§ظ„ط­ط°ظپ ط¯ط§ط®ظ„ ط§ظ„طµظپط­ط§طھ ط§ظ„ظ…ظ‡ظ…ط©.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900">
                          {log.description ||
                            `${actionLabel(log.action)} ظپظٹ ${moduleLabel(
                              log.module
                            )}`}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {log.user_name || "ظ…ط³طھط®ط¯ظ… ط؛ظٹط± ظ…ط­ط¯ط¯"}
                          {log.user_role ? ` آ· ${log.user_role}` : ""}
                        </p>
                      </div>

                      <span className="rounded-full bg-[#d4af37]/15 px-3 py-1 text-xs font-black text-[#8a6a12]">
                        {moduleLabel(log.module)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Clock size={14} />
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </AppShell>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Award,
  CheckCircle2,
  Edit,
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Trophy,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

import RoleGuard from "@/components/auth/RoleGuard";
import AppShell from "@/components/layout/AppShell";
import DangerButton from "@/components/ui/buttons/DangerButton";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import { EmptyState } from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/feedback/ErrorState";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import { PageLoader } from "@/components/ui/loading";
import PageHeader from "@/components/ui/page/PageHeader";
import Section from "@/components/ui/page/PageSection";

import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToExcel } from "@/lib/exports/excel";
import { exportTableToPDF } from "@/lib/exports/pdf";
import type { SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type ActivityToast = {
  type: "success" | "error";
  message: string;
};

type Participant = {
  id: string;
  school_id: string;
  activity_id?: string | null;
  team_id?: string | null;
  competition_id?: string | null;
  student_id?: string | null;
  student_name?: string | null;
  class_name?: string | null;
  section?: string | null;
  role?: string | null;
  participation_status?: string | null;
  achievement?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type Activity = {
  id: string;
  title?: string | null;
  activity_name?: string | null;
};

type Team = {
  id: string;
  team_name?: string | null;
  title?: string | null;
};

type Competition = {
  id: string;
  title?: string | null;
  competition_name?: string | null;
};

type OptionItem = {
  id: string;
  label: string;
};

type FormState = {
  id?: string;
  activity_id: string;
  team_id: string;
  competition_id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  section: string;
  role: string;
  participation_status: string;
  achievement: string;
  notes: string;
};

const PAGE_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "activity_leader",
];

const EMPTY_FORM: FormState = {
  activity_id: "",
  team_id: "",
  competition_id: "",
  student_id: "",
  student_name: "",
  class_name: "",
  section: "",
  role: "مشارك",
  participation_status: "مشارك",
  achievement: "",
  notes: "",
};

const STATUS_OPTIONS = [
  "مشارك",
  "مرشح",
  "حاضر",
  "غائب",
  "فائز",
  "منسحب",
  "مكرم",
] as const;

const ROLE_OPTIONS = [
  "مشارك",
  "قائد فريق",
  "منظم",
  "ممثل المدرسة",
  "فائز",
  "مرشح",
] as const;

const KIND_OPTIONS = [
  "نشاط",
  "فريق",
  "مسابقة",
  "عام",
] as const;

function getStatusClass(status?: string | null) {
  const value = String(status || "");

  if (["فائز", "مكرم", "حاضر"].includes(value)) {
    return "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
  }

  if (["مشارك", "مرشح"].includes(value)) {
    return "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]";
  }

  if (["غائب", "منسحب"].includes(value)) {
    return "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]";
  }

  return "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]";
}

function optionLabel(
  id: string | null | undefined,
  options: OptionItem[],
) {
  if (!id) return "—";

  return options.find((item) => item.id === id)?.label || "—";
}

function getParticipationKind(item: Participant) {
  if (item.competition_id) return "مسابقة";
  if (item.team_id) return "فريق";
  if (item.activity_id) return "نشاط";
  return "عام";
}

export default function ActivityParticipationsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [items, setItems] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [kindFilter, setKindFilter] = useState("الكل");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<ActivityToast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const activityOptions = useMemo<OptionItem[]>(
    () =>
      activities.map((item) => ({
        id: item.id,
        label: item.title || item.activity_name || "نشاط",
      })),
    [activities],
  );

  const teamOptions = useMemo<OptionItem[]>(
    () =>
      teams.map((item) => ({
        id: item.id,
        label: item.team_name || item.title || "فريق",
      })),
    [teams],
  );

  const competitionOptions = useMemo<OptionItem[]>(
    () =>
      competitions.map((item) => ({
        id: item.id,
        label: item.title || item.competition_name || "مسابقة",
      })),
    [competitions],
  );

  const showToast = useCallback(
    (type: ActivityToast["type"], message: string) => {
      setToast({ type, message });

      window.setTimeout(() => {
        setToast(null);
      }, 3000);
    },
    [],
  );

  const loadData = useCallback(async () => {
    if (!currentSchool?.id) {
      setItems([]);
      setActivities([]);
      setTeams([]);
      setCompetitions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const [
      participantsResult,
      activitiesResult,
      teamsResult,
      competitionsResult,
    ] = await Promise.all([
      supabase
        .from("activity_participants")
        .select("*")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("activities")
        .select("id, title, activity_name")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("activity_teams")
        .select("id, team_name, title")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("activity_competitions")
        .select("id, title, competition_name")
        .eq("school_id", currentSchool.id)
        .order("created_at", { ascending: false }),
    ]);

    setLoading(false);

    if (participantsResult.error) {
      setErrorMsg(participantsResult.error.message);
      setItems([]);
      return;
    }

    setItems((participantsResult.data ?? []) as Participant[]);
    setActivities(
      activitiesResult.error
        ? []
        : ((activitiesResult.data ?? []) as Activity[]),
    );
    setTeams(
      teamsResult.error
        ? []
        : ((teamsResult.data ?? []) as Team[]),
    );
    setCompetitions(
      competitionsResult.error
        ? []
        : ((competitionsResult.data ?? []) as Competition[]),
    );
  }, [currentSchool?.id]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setLoading(false);
      setErrorMsg("لا توجد مدرسة مرتبطة بالحساب.");
      return;
    }

    void loadData();
  }, [currentSchool?.id, loadData, schoolLoading]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setShowForm(false);
  }, []);

  const editItem = useCallback((item: Participant) => {
    setForm({
      id: item.id,
      activity_id: item.activity_id || "",
      team_id: item.team_id || "",
      competition_id: item.competition_id || "",
      student_id: item.student_id || "",
      student_name: item.student_name || "",
      class_name: item.class_name || "",
      section: item.section || "",
      role: item.role || "مشارك",
      participation_status: item.participation_status || "مشارك",
      achievement: item.achievement || "",
      notes: item.notes || "",
    });

    setShowForm(true);
  }, []);

  const saveItem = useCallback(async () => {
    if (!currentSchool?.id) {
      showToast("error", "تعذر تحديد المدرسة.");
      return;
    }

    if (!form.student_name.trim()) {
      showToast("error", "أدخل اسم الطالب.");
      return;
    }

    if (!form.activity_id && !form.team_id && !form.competition_id) {
      showToast("error", "اربط المشاركة بنشاط أو فريق أو مسابقة.");
      return;
    }

    setSaving(true);

    const payload = {
      school_id: currentSchool.id,
      activity_id: form.activity_id || null,
      team_id: form.team_id || null,
      competition_id: form.competition_id || null,
      student_id: form.student_id.trim() || null,
      student_name: form.student_name.trim(),
      class_name: form.class_name.trim() || null,
      section: form.section.trim() || null,
      role: form.role,
      participation_status: form.participation_status,
      achievement: form.achievement.trim() || null,
      notes: form.notes.trim() || null,
    };

    const result = form.id
      ? await supabase
          .from("activity_participants")
          .update(payload)
          .eq("id", form.id)
          .eq("school_id", currentSchool.id)
      : await supabase
          .from("activity_participants")
          .insert(payload);

    setSaving(false);

    if (result.error) {
      showToast("error", result.error.message);
      return;
    }

    showToast(
      "success",
      form.id ? "تم تحديث المشاركة." : "تمت إضافة المشاركة.",
    );

    resetForm();
    void loadData();
  }, [currentSchool?.id, form, loadData, resetForm, showToast]);

  const deleteItem = useCallback(
    async (item: Participant) => {
      if (!currentSchool?.id) return;

      const confirmed = window.confirm(
        `حذف مشاركة الطالب "${item.student_name || "طالب"}"؟`,
      );

      if (!confirmed) return;

      const { error } = await supabase
        .from("activity_participants")
        .delete()
        .eq("id", item.id)
        .eq("school_id", currentSchool.id);

      if (error) {
        showToast("error", error.message);
        return;
      }

      showToast("success", "تم حذف المشاركة.");
      void loadData();
    },
    [currentSchool?.id, loadData, showToast],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const kind = getParticipationKind(item);

      const searchableText = [
        item.student_name,
        item.class_name,
        item.section,
        item.role,
        item.participation_status,
        item.achievement,
        item.notes,
        optionLabel(item.activity_id, activityOptions),
        optionLabel(item.team_id, teamOptions),
        optionLabel(item.competition_id, competitionOptions),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesStatus =
        statusFilter === "الكل" ||
        item.participation_status === statusFilter;

      const matchesKind =
        kindFilter === "الكل" || kindFilter === kind;

      return matchesSearch && matchesStatus && matchesKind;
    });
  }, [
    activityOptions,
    competitionOptions,
    items,
    kindFilter,
    search,
    statusFilter,
    teamOptions,
  ]);

  const stats = useMemo(
    () => ({
      total: items.length,
      winners: items.filter((item) =>
        ["فائز", "مكرم"].includes(
          String(item.participation_status || ""),
        ),
      ).length,
      competitions: items.filter((item) => item.competition_id).length,
      teams: items.filter((item) => item.team_id).length,
    }),
    [items],
  );

  const exportExcel = useCallback(async () => {
    await exportTableToExcel({
      title: "مشاركات النشاط",
      schoolName:
        currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "قائمة الطلاب المشاركين",
      headers: [
        "الطالب",
        "الفصل",
        "الشعبة",
        "الدور",
        "الحالة",
        "النشاط",
        "الفريق",
        "المسابقة",
        "الإنجاز",
      ],
      rows: filteredItems.map((item) => [
        item.student_name || "-",
        item.class_name || "-",
        item.section || "-",
        item.role || "-",
        item.participation_status || "-",
        optionLabel(item.activity_id, activityOptions),
        optionLabel(item.team_id, teamOptions),
        optionLabel(item.competition_id, competitionOptions),
        item.achievement || "-",
      ]),
      fileName: "activity-participations.xlsx",
    });

    showToast("success", "تم تصدير Excel.");
  }, [
    activityOptions,
    competitionOptions,
    currentSchool?.school_name,
    filteredItems,
    showToast,
    teamOptions,
  ]);

  const exportPDF = useCallback(() => {
    exportTableToPDF({
      title: "مشاركات النشاط",
      schoolName:
        currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "قائمة الطلاب المشاركين",
      headers: [
        "الطالب",
        "الفصل",
        "الدور",
        "الحالة",
        "الإنجاز",
      ],
      rows: filteredItems.map((item) => [
        item.student_name || "-",
        `${item.class_name || "-"} ${item.section || ""}`.trim(),
        item.role || "-",
        item.participation_status || "-",
        item.achievement || "-",
      ]),
      fileName: "activity-participations.pdf",
    });

    showToast("success", "تم تجهيز PDF.");
  }, [
    currentSchool?.school_name,
    filteredItems,
    showToast,
  ]);

  const winnersProgress = stats.total
    ? Math.round((stats.winners / stats.total) * 100)
    : 0;

  const competitionsProgress = stats.total
    ? Math.round((stats.competitions / stats.total) * 100)
    : 0;

  const teamsProgress = stats.total
    ? Math.round((stats.teams / stats.total) * 100)
    : 0;

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={PAGE_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل المشاركات..." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={PAGE_ROLES}>
      <AppShell>
        <main className="space-y-6" dir="rtl">
          {toast?.type === "success" ? (
            <SuccessBanner description={toast.message} />
          ) : toast ? (
            <ErrorState description={toast.message} />
          ) : null}

          <PageHeader
            variant="hero"
            title="المشاركات"
            description="إدارة الطلاب المشاركين والإنجازات."
            badge="رائد النشاط"
            icon={<UserCheck size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الأنشطة", href: "/activities" },
              { label: "المشاركات" },
            ]}
            meta={[
              {
                label: "المدرسة",
                value: currentSchool?.school_name || "غير متوفر",
              },
              { label: "الإجمالي", value: stats.total },
              { label: "الفائزون والمكرمون", value: stats.winners },
            ]}
            stats={[
              {
                label: "المشاركات",
                value: stats.total,
                icon: <Users size={20} aria-hidden="true" />,
                tone: "primary",
              },
              {
                label: "الفائزون",
                value: stats.winners,
                icon: <Trophy size={20} aria-hidden="true" />,
                tone: "green",
              },
              {
                label: "المسابقات",
                value: stats.competitions,
                icon: <Award size={20} aria-hidden="true" />,
                tone: "gold",
              },
              {
                label: "الفرق",
                value: stats.teams,
                icon: <UserCheck size={20} aria-hidden="true" />,
                tone: "slate",
              },
            ]}
            actions={
              <>
                <PrimaryButton onClick={() => setShowForm(true)}>
                  <Plus size={16} aria-hidden="true" />
                  إضافة
                </PrimaryButton>

                <SecondaryButton onClick={() => void loadData()}>
                  <RefreshCcw size={16} aria-hidden="true" />
                  تحديث
                </SecondaryButton>
              </>
            }
          />

          {errorMsg ? <ErrorState description={errorMsg} /> : null}

          <section
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="مؤشرات المشاركات"
          >
            <ExecutiveCard
              title="المشاركات"
              value={stats.total}
              subtitle="الإجمالي"
              icon={<Users size={22} aria-hidden="true" />}
              tone="primary"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="فائزون ومكرمون"
              value={stats.winners}
              subtitle="إنجازات"
              icon={<Trophy size={22} aria-hidden="true" />}
              tone="green"
              progress={winnersProgress}
            />

            <ExecutiveCard
              title="مسابقات"
              value={stats.competitions}
              subtitle="مرتبطة بمسابقة"
              icon={<Award size={22} aria-hidden="true" />}
              tone="gold"
              progress={competitionsProgress}
            />

            <ExecutiveCard
              title="فرق"
              value={stats.teams}
              subtitle="مرتبطة بفريق"
              icon={<UserCheck size={22} aria-hidden="true" />}
              tone="slate"
              progress={teamsProgress}
            />
          </section>

          {showForm ? (
            <Section
              title={form.id ? "تعديل مشاركة" : "إضافة مشاركة"}
              icon={<Edit size={22} aria-hidden="true" />}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field
                  label="اسم الطالب"
                  value={form.student_name}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      student_name: value,
                    }))
                  }
                  required
                />

                <Field
                  label="رقم الطالب"
                  value={form.student_id}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      student_id: value,
                    }))
                  }
                />

                <Field
                  label="الفصل"
                  value={form.class_name}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      class_name: value,
                    }))
                  }
                />

                <Field
                  label="الشعبة"
                  value={form.section}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      section: value,
                    }))
                  }
                />

                <SelectField
                  label="الدور"
                  value={form.role}
                  options={ROLE_OPTIONS}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      role: value,
                    }))
                  }
                />

                <SelectField
                  label="الحالة"
                  value={form.participation_status}
                  options={STATUS_OPTIONS}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      participation_status: value,
                    }))
                  }
                />

                <IdSelectField
                  label="النشاط"
                  value={form.activity_id}
                  options={activityOptions}
                  placeholder="بدون نشاط"
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      activity_id: value,
                    }))
                  }
                />

                <IdSelectField
                  label="الفريق"
                  value={form.team_id}
                  options={teamOptions}
                  placeholder="بدون فريق"
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      team_id: value,
                    }))
                  }
                />

                <IdSelectField
                  label="المسابقة"
                  value={form.competition_id}
                  options={competitionOptions}
                  placeholder="بدون مسابقة"
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      competition_id: value,
                    }))
                  }
                />

                <Field
                  label="الإنجاز"
                  value={form.achievement}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      achievement: value,
                    }))
                  }
                />
              </div>

              <div className="mt-3">
                <TextAreaField
                  label="ملاحظات"
                  value={form.notes}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      notes: value,
                    }))
                  }
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <PrimaryButton
                  onClick={() => void saveItem()}
                  loading={saving}
                >
                  <CheckCircle2 size={16} aria-hidden="true" />
                  حفظ
                </PrimaryButton>

                <SecondaryButton onClick={resetForm}>
                  <XCircle size={16} aria-hidden="true" />
                  إلغاء
                </SecondaryButton>
              </div>
            </Section>
          ) : null}

          <Section
            title="البحث والتصفية"
            icon={<Search size={22} aria-hidden="true" />}
          >
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_auto_auto]">
              <SearchField value={search} onChange={setSearch} />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="تصفية حسب الحالة"
                className={fieldClassName}
              >
                <option value="الكل">كل الحالات</option>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={kindFilter}
                onChange={(event) =>
                  setKindFilter(event.target.value)
                }
                aria-label="تصفية حسب نوع الارتباط"
                className={fieldClassName}
              >
                <option value="الكل">كل الارتباطات</option>
                {KIND_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <SecondaryButton onClick={() => void exportExcel()}>
                Excel
              </SecondaryButton>

              <SecondaryButton onClick={exportPDF}>
                <FileText size={16} aria-hidden="true" />
                PDF
              </SecondaryButton>
            </div>
          </Section>

          <section
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-label="قائمة المشاركات"
          >
            {filteredItems.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState
                  title="لا توجد نتائج"
                  description="غيّر البحث أو أضف مشاركة."
                  icon={<Search size={28} aria-hidden="true" />}
                />
              </div>
            ) : (
              filteredItems.map((item) => (
                <ParticipationCard
                  key={item.id}
                  item={item}
                  activityOptions={activityOptions}
                  teamOptions={teamOptions}
                  competitionOptions={competitionOptions}
                  onEdit={editItem}
                  onDelete={deleteItem}
                />
              ))
            )}
          </section>
        </main>
      </AppShell>
    </RoleGuard>
  );
}

const fieldClassName =
  "h-11 w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]";

function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-subtle)]"
        size={18}
        aria-hidden="true"
      />

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="بحث..."
        aria-label="البحث في المشاركات"
        className={`${fieldClassName} pr-10`}
      />
    </div>
  );
}

function ParticipationCard({
  item,
  activityOptions,
  teamOptions,
  competitionOptions,
  onEdit,
  onDelete,
}: {
  item: Participant;
  activityOptions: OptionItem[];
  teamOptions: OptionItem[];
  competitionOptions: OptionItem[];
  onEdit: (item: Participant) => void;
  onDelete: (item: Participant) => Promise<void>;
}) {
  return (
    <article className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--app-shadow-md)]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
            item.participation_status,
          )}`}
        >
          {item.participation_status || "مشارك"}
        </span>

        <span className="rounded-full bg-[var(--app-card-soft)] px-3 py-1 text-xs font-bold text-[var(--app-text-muted)]">
          {item.role || "مشارك"}
        </span>

        <span className="rounded-full bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] px-3 py-1 text-xs font-black text-[var(--app-primary)]">
          {getParticipationKind(item)}
        </span>
      </div>

      <h3 className="text-xl font-black text-[var(--app-text)]">
        {item.student_name || "طالب"}
      </h3>

      <p className="mt-1 text-sm font-bold text-[var(--app-text-muted)]">
        {item.class_name || "فصل غير محدد"}
        {item.section ? ` - ${item.section}` : ""}
      </p>

      <div className="mt-4 grid gap-2 text-sm">
        <InfoBox
          label="النشاط"
          value={optionLabel(item.activity_id, activityOptions)}
        />

        <InfoBox
          label="الفريق"
          value={optionLabel(item.team_id, teamOptions)}
        />

        <InfoBox
          label="المسابقة"
          value={optionLabel(
            item.competition_id,
            competitionOptions,
          )}
        />

        <InfoBox
          label="الإنجاز"
          value={item.achievement || "—"}
        />
      </div>

      {item.notes ? (
        <p className="mt-3 rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-3 text-sm leading-7 text-[var(--app-text-muted)]">
          {item.notes}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <SecondaryButton size="sm" onClick={() => onEdit(item)}>
          <Edit size={15} aria-hidden="true" />
          تعديل
        </SecondaryButton>

        <DangerButton
          size="sm"
          onClick={() => void onDelete(item)}
          icon={<Trash2 size={15} aria-hidden="true" />}
        >
          حذف
        </DangerButton>
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const id = `participation-field-${label}`;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
        {label}
      </span>

      <input
        id={id}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClassName}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const id = `participation-select-${label}`;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
        {label}
      </span>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClassName}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function IdSelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: OptionItem[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const id = `participation-id-select-${label}`;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
        {label}
      </span>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClassName}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `participation-textarea-${label}`;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
        {label}
      </span>

      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className={`${fieldClassName} h-auto resize-none py-3`}
      />
    </label>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] px-4 py-3">
      <p className="text-xs font-bold text-[var(--app-text-muted)]">
        {label}
      </p>

      <p className="mt-1 line-clamp-1 font-black text-[var(--app-text)]">
        {value}
      </p>
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckCircle2,
  ClipboardList,
  PhoneCall,
  Plus,
  RefreshCcw,
  Search,
  UserRoundCheck,
} from "lucide-react";

import RoleGuard from "@/components/auth/RoleGuard";
import AppShell from "@/components/layout/AppShell";
import PageContainer from "@/components/layout/PageContainer";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import { EmptyState } from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/feedback/ErrorState";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import { PageLoader } from "@/components/ui/loading";
import PageHeader from "@/components/ui/page/PageHeader";
import PageSection from "@/components/ui/page/PageSection";

import { useSchool } from "@/contexts/SchoolContext";
import { STAFF_ROLES } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type Student = {
  id: string;
  full_name: string;
  classroom: string | null;
  section: string | null;
  grade_level: string | null;
};

type Intervention = {
  id: string;
  school_id: string;
  student_id: string;
  intervention_type: string | null;
  title: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const STATUS_OPTIONS = [
  "مفتوح",
  "قيد المتابعة",
  "مغلق",
] as const;

const TYPE_OPTIONS = [
  { value: "parent_call", label: "استدعاء ولي أمر" },
  { value: "counseling_session", label: "جلسة إرشادية" },
  { value: "academic_followup", label: "متابعة أكاديمية" },
  { value: "behavior_followup", label: "متابعة سلوكية" },
  { value: "health_referral", label: "تحويل للعيادة" },
] as const;

const FIELD_CLASS_NAME =
  "h-11 w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]";

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusClass(status?: string | null) {
  if (status === "مغلق") {
    return "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
  }

  if (status === "قيد المتابعة") {
    return "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";
  }

  return "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]";
}

export default function CounselorInterventionsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [students, setStudents] = useState<Student[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);

  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState("parent_call");
  const [title, setTitle] = useState("استدعاء ولي أمر");
  const [notes, setNotes] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const showToast = useCallback(
    (type: Toast["type"], message: string) => {
      setToast({ type, message });

      window.setTimeout(() => {
        setToast(null);
      }, 3000);
    },
    [],
  );

  const fetchData = useCallback(async () => {
    if (!currentSchool?.id) {
      setStudents([]);
      setInterventions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const [studentsResult, interventionsResult] =
      await Promise.all([
        supabase
          .from("students")
          .select(
            "id, full_name, classroom, section, grade_level",
          )
          .eq("school_id", currentSchool.id)
          .order("full_name", { ascending: true }),

        supabase
          .from("student_interventions")
          .select("*")
          .eq("school_id", currentSchool.id)
          .order("created_at", { ascending: false }),
      ]);

    setLoading(false);

    if (studentsResult.error) {
      setErrorMsg(studentsResult.error.message);
      return;
    }

    if (interventionsResult.error) {
      setErrorMsg(interventionsResult.error.message);
      return;
    }

    const loadedStudents =
      (studentsResult.data as Student[]) ?? [];

    setStudents(loadedStudents);
    setInterventions(
      (interventionsResult.data as Intervention[]) ?? [],
    );

    setStudentId((current) => {
      if (current || loadedStudents.length === 0) {
        return current;
      }

      return loadedStudents[0].id;
    });
  }, [currentSchool?.id]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setLoading(false);
      setErrorMsg("لا توجد مدرسة مرتبطة بالحساب.");
      return;
    }

    void fetchData();
  }, [currentSchool?.id, fetchData, schoolLoading]);

  const studentMap = useMemo(
    () =>
      new Map(
        students.map((student) => [student.id, student]),
      ),
    [students],
  );

  const filteredInterventions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return interventions.filter((item) => {
      const student = studentMap.get(item.student_id);

      const searchableText = [
        item.title,
        item.notes,
        item.status,
        item.intervention_type,
        student?.full_name,
        student?.classroom,
        student?.section,
        student?.grade_level,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword || searchableText.includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        item.status === statusFilter;

      const matchesType =
        typeFilter === "all" ||
        item.intervention_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [
    interventions,
    search,
    statusFilter,
    studentMap,
    typeFilter,
  ]);

  const stats = useMemo(
    () => ({
      total: interventions.length,
      open: interventions.filter(
        (item) => item.status === "مفتوح",
      ).length,
      follow: interventions.filter(
        (item) => item.status === "قيد المتابعة",
      ).length,
      closed: interventions.filter(
        (item) => item.status === "مغلق",
      ).length,
    }),
    [interventions],
  );

  const handleTypeChange = useCallback((value: string) => {
    setType(value);

    const selected = TYPE_OPTIONS.find(
      (item) => item.value === value,
    );

    setTitle(selected?.label ?? "");
  }, []);

  const createIntervention = useCallback(async () => {
    if (!currentSchool?.id) {
      showToast("error", "تعذر تحديد المدرسة.");
      return;
    }

    if (!studentId) {
      showToast("error", "اختر الطالب.");
      return;
    }

    if (!title.trim()) {
      showToast("error", "أدخل عنوان التدخل.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("student_interventions")
      .insert({
        school_id: currentSchool.id,
        student_id: studentId,
        intervention_type: type,
        title: title.trim(),
        notes: notes.trim() || null,
        status: "مفتوح",
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      showToast("error", error.message);
      return;
    }

    setInterventions((current) => [
      data as Intervention,
      ...current,
    ]);

    setNotes("");
    showToast("success", "تم حفظ التدخل.");
  }, [
    currentSchool?.id,
    notes,
    showToast,
    studentId,
    title,
    type,
  ]);

  const updateStatus = useCallback(
    async (id: string, status: string) => {
      if (!currentSchool?.id) return;

      const { error } = await supabase
        .from("student_interventions")
        .update({ status })
        .eq("id", id)
        .eq("school_id", currentSchool.id);

      if (error) {
        showToast("error", error.message);
        return;
      }

      setInterventions((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status } : item,
        ),
      );

      showToast("success", "تم تحديث الحالة.");
    },
    [currentSchool?.id, showToast],
  );

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <PageContainer size="wide">
            <PageLoader text="جاري تحميل التدخلات..." />
          </PageContainer>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AppShell>
        <PageContainer size="wide" className="space-y-6">
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
            title="التدخلات الإرشادية"
            description="تسجيل التدخلات ومتابعة حالاتها."
            badge="الإرشاد الطلابي"
            icon={
              <ClipboardList size={18} aria-hidden="true" />
            }
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              {
                label: "الإرشاد الطلابي",
                href: "/counselor",
              },
              { label: "التدخلات الإرشادية" },
            ]}
            stats={[
              {
                label: "الإجمالي",
                value: stats.total,
                icon: (
                  <ClipboardList
                    size={20}
                    aria-hidden="true"
                  />
                ),
                tone: "primary",
              },
              {
                label: "مفتوحة",
                value: stats.open,
                icon: (
                  <PhoneCall size={20} aria-hidden="true" />
                ),
                tone: "gold",
              },
              {
                label: "قيد المتابعة",
                value: stats.follow,
                icon: (
                  <UserRoundCheck
                    size={20}
                    aria-hidden="true"
                  />
                ),
                tone: "red",
              },
              {
                label: "مغلقة",
                value: stats.closed,
                icon: (
                  <CheckCircle2
                    size={20}
                    aria-hidden="true"
                  />
                ),
                tone: "green",
              },
            ]}
            actions={
              <>
                <SecondaryButton
                  onClick={() => void fetchData()}
                >
                  <RefreshCcw
                    size={16}
                    aria-hidden="true"
                  />
                  تحديث
                </SecondaryButton>

                <PrimaryButton
                  onClick={() => void createIntervention()}
                  loading={saving}
                  disabled={students.length === 0}
                >
                  <Plus size={16} aria-hidden="true" />
                  حفظ
                </PrimaryButton>
              </>
            }
          />

          {errorMsg ? (
            <ErrorState description={errorMsg} />
          ) : null}

          <section
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="مؤشرات التدخلات"
          >
            <ExecutiveCard
              title="إجمالي التدخلات"
              value={stats.total}
              subtitle="كل السجلات"
              icon={
                <ClipboardList size={22} aria-hidden="true" />
              }
              tone="primary"
              progress={stats.total > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="مفتوحة"
              value={stats.open}
              subtitle="تحتاج متابعة"
              icon={<PhoneCall size={22} aria-hidden="true" />}
              tone="gold"
              progress={
                stats.total
                  ? Math.round(
                      (stats.open / stats.total) * 100,
                    )
                  : 0
              }
            />

            <ExecutiveCard
              title="قيد المتابعة"
              value={stats.follow}
              subtitle="متابعة جارية"
              icon={
                <UserRoundCheck
                  size={22}
                  aria-hidden="true"
                />
              }
              tone="red"
              progress={
                stats.total
                  ? Math.round(
                      (stats.follow / stats.total) * 100,
                    )
                  : 0
              }
            />

            <ExecutiveCard
              title="مغلقة"
              value={stats.closed}
              subtitle="تمت معالجتها"
              icon={
                <CheckCircle2
                  size={22}
                  aria-hidden="true"
                />
              }
              tone="green"
              progress={
                stats.total
                  ? Math.round(
                      (stats.closed / stats.total) * 100,
                    )
                  : 0
              }
            />
          </section>

          <PageSection
            title="إضافة تدخل"
            icon={
              <Plus size={22} aria-hidden="true" />
            }
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
                  الطالب
                </span>

                <select
                  value={studentId}
                  onChange={(event) =>
                    setStudentId(event.target.value)
                  }
                  className={FIELD_CLASS_NAME}
                >
                  {students.length === 0 ? (
                    <option value="">لا يوجد طلاب</option>
                  ) : (
                    students.map((student) => (
                      <option
                        key={student.id}
                        value={student.id}
                      >
                        {student.full_name}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
                  النوع
                </span>

                <select
                  value={type}
                  onChange={(event) =>
                    handleTypeChange(event.target.value)
                  }
                  className={FIELD_CLASS_NAME}
                >
                  {TYPE_OPTIONS.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
                  العنوان
                </span>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="عنوان التدخل"
                  className={FIELD_CLASS_NAME}
                />
              </label>

              <div className="flex items-end">
                <PrimaryButton
                  className="w-full"
                  onClick={() => void createIntervention()}
                  loading={saving}
                  disabled={students.length === 0}
                >
                  <Plus size={16} aria-hidden="true" />
                  حفظ
                </PrimaryButton>
              </div>
            </div>

            <label className="mt-3 block">
              <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
                الملاحظات
              </span>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="ملاحظات..."
                rows={4}
                className={`${FIELD_CLASS_NAME} h-auto resize-none py-3`}
              />
            </label>
          </PageSection>

          <PageSection
            title="التدخلات"
            icon={
              <ClipboardList
                size={22}
                aria-hidden="true"
              />
            }
          >
            <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-subtle)]"
                  aria-hidden="true"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="بحث..."
                  aria-label="البحث في التدخلات"
                  className={`${FIELD_CLASS_NAME} pr-10`}
                />
              </div>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value)
                }
                aria-label="تصفية حسب النوع"
                className={FIELD_CLASS_NAME}
              >
                <option value="all">كل الأنواع</option>

                {TYPE_OPTIONS.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="تصفية حسب الحالة"
                className={FIELD_CLASS_NAME}
              >
                <option value="all">كل الحالات</option>

                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {filteredInterventions.length === 0 ? (
              <EmptyState
                title="لا توجد نتائج"
                description="غيّر البحث أو الفلاتر."
                icon={
                  <Search size={28} aria-hidden="true" />
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredInterventions.map((item) => {
                  const student = studentMap.get(
                    item.student_id,
                  );

                  return (
                    <article
                      key={item.id}
                      className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-5 transition hover:bg-[var(--app-card)] hover:shadow-[var(--app-shadow-sm)]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black text-[var(--app-text)]">
                              {item.title ||
                                "تدخل إرشادي"}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                                item.status,
                              )}`}
                            >
                              {item.status || "مفتوح"}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                            {student?.full_name ||
                              "طالب غير معروف"}
                            {" — "}
                            {student?.classroom || "—"}
                            {student?.section
                              ? ` - ${student.section}`
                              : ""}
                          </p>

                          {item.notes ? (
                            <p className="mt-2 line-clamp-3 text-sm leading-7 text-[var(--app-text-muted)]">
                              {item.notes}
                            </p>
                          ) : null}

                          <time
                            dateTime={
                              item.created_at || undefined
                            }
                            className="mt-2 block text-xs text-[var(--app-text-subtle)]"
                          >
                            {formatDate(item.created_at)}
                          </time>
                        </div>

                        <select
                          value={item.status || "مفتوح"}
                          onChange={(event) =>
                            void updateStatus(
                              item.id,
                              event.target.value,
                            )
                          }
                          aria-label={`تحديث حالة ${item.title || "التدخل"}`}
                          className={`${FIELD_CLASS_NAME} lg:w-48`}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </PageSection>
        </PageContainer>
      </AppShell>
    </RoleGuard>
  );
}


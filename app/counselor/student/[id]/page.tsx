"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  HeartPulse,
  Phone,
  PlusCircle,
  Printer,
  ShieldAlert,
  User,
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
  school_id: string;
  full_name: string;
  classroom: string | null;
  section: string | null;
  grade_level: string | null;
  phone?: string | null;
};

type AlertItem = {
  id: string;
  school_id?: string | null;
  student_id: string | null;
  alert_type: string;
  title: string;
  message: string | null;
  severity: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type Intervention = {
  id: string;
  school_id?: string | null;
  student_id: string;
  intervention_type: string | null;
  title: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

type HealthReferral = {
  id: string;
  school_id?: string | null;
  student_id: string;
  referral_date: string | null;
  reason: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

type ParentContact = {
  id: string;
  school_id: string;
  student_id: string;
  contact_type: string | null;
  contact_date: string | null;
  notes: string | null;
  created_at: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type RiskLevel = "حرج" | "مرتفع" | "متوسط" | "منخفض";

type RiskSummary = {
  score: number;
  level: RiskLevel;
  tone: "red" | "gold" | "green";
  note: string;
};

const CONTACT_TYPES = [
  "اتصال هاتفي",
  "رسالة واتساب",
  "استدعاء ولي أمر",
  "اجتماع حضوري",
  "ملاحظة مكتوبة",
] as const;

const FIELD_CLASS_NAME =
  "h-11 w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]";

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 10);
}

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

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  const { currentSchool, loading: schoolLoading } = useSchool();

  const [student, setStudent] = useState<Student | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [healthReferrals, setHealthReferrals] = useState<HealthReferral[]>([]);
  const [parentContacts, setParentContacts] = useState<ParentContact[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingContact, setSavingContact] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const [contactType, setContactType] = useState("اتصال هاتفي");
  const [contactDate, setContactDate] = useState(todayISO());
  const [contactNotes, setContactNotes] = useState("");

  const showToast = useCallback(
    (type: Toast["type"], message: string) => {
      setToast({ type, message });

      window.setTimeout(() => {
        setToast(null);
      }, 3000);
    },
    [],
  );

  const fetchStudentProfile = useCallback(async () => {
    if (!studentId || !currentSchool?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const schoolId = currentSchool.id;

    const [
      studentResult,
      alertsResult,
      interventionsResult,
      healthResult,
      contactsResult,
    ] = await Promise.all([
      supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .eq("school_id", schoolId)
        .maybeSingle(),

      supabase
        .from("alerts")
        .select("*")
        .eq("student_id", studentId)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),

      supabase
        .from("student_interventions")
        .select("*")
        .eq("student_id", studentId)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),

      supabase
        .from("health_referrals")
        .select("*")
        .eq("student_id", studentId)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),

      supabase
        .from("parent_contacts")
        .select("*")
        .eq("student_id", studentId)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
    ]);

    setLoading(false);

    if (studentResult.error) {
      setErrorMsg(studentResult.error.message);
      return;
    }

    if (!studentResult.data) {
      setStudent(null);
      return;
    }

    setStudent(studentResult.data as Student);
    setAlerts(
      alertsResult.error
        ? []
        : ((alertsResult.data as AlertItem[]) ?? []),
    );
    setInterventions(
      interventionsResult.error
        ? []
        : ((interventionsResult.data as Intervention[]) ?? []),
    );
    setHealthReferrals(
      healthResult.error
        ? []
        : ((healthResult.data as HealthReferral[]) ?? []),
    );
    setParentContacts(
      contactsResult.error
        ? []
        : ((contactsResult.data as ParentContact[]) ?? []),
    );
  }, [currentSchool?.id, studentId]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setLoading(false);
      setErrorMsg("لا توجد مدرسة مرتبطة بالحساب.");
      return;
    }

    void fetchStudentProfile();
  }, [
    currentSchool?.id,
    fetchStudentProfile,
    schoolLoading,
  ]);

  const highAlerts = useMemo(
    () =>
      alerts.filter((item) => item.severity === "high")
        .length,
    [alerts],
  );

  const unreadAlerts = useMemo(
    () => alerts.filter((item) => !item.is_read).length,
    [alerts],
  );

  const openInterventions = useMemo(
    () =>
      interventions.filter(
        (item) =>
          item.status === "مفتوح" ||
          item.status === "قيد المتابعة",
      ).length,
    [interventions],
  );

  const activeHealth = useMemo(
    () =>
      healthReferrals.filter(
        (item) => item.status !== "عاد للفصل",
      ).length,
    [healthReferrals],
  );

  const lastContact = parentContacts[0];

  const risk = useMemo<RiskSummary>(() => {
    const score =
      highAlerts * 30 +
      unreadAlerts * 10 +
      openInterventions * 20 +
      activeHealth * 20 +
      (parentContacts.length === 0 ? 15 : 0);

    if (score >= 90) {
      return {
        score,
        level: "حرج",
        tone: "red",
        note: "تحتاج الحالة متابعة عاجلة.",
      };
    }

    if (score >= 60) {
      return {
        score,
        level: "مرتفع",
        tone: "red",
        note: "تحتاج الحالة خطة متابعة.",
      };
    }

    if (score >= 30) {
      return {
        score,
        level: "متوسط",
        tone: "gold",
        note: "يفضل متابعة الحالة أسبوعيًا.",
      };
    }

    return {
      score,
      level: "منخفض",
      tone: "green",
      note: "وضع الطالب مستقر.",
    };
  }, [
    activeHealth,
    highAlerts,
    openInterventions,
    parentContacts.length,
    unreadAlerts,
  ]);

  const recommendations = useMemo(() => {
    const items: string[] = [];

    if (highAlerts > 0) {
      items.push("راجع التنبيهات عالية الخطورة.");
    }

    if (openInterventions > 0) {
      items.push("تابع التدخلات المفتوحة.");
    }

    if (activeHealth > 0) {
      items.push("تابع الحالة الصحية.");
    }

    if (parentContacts.length === 0) {
      items.push("وثّق التواصل مع ولي الأمر.");
    }

    if (
      risk.level === "حرج" ||
      risk.level === "مرتفع"
    ) {
      items.push("أنشئ خطة متابعة أسبوعية.");
    }

    if (items.length === 0) {
      items.push("لا توجد توصيات عاجلة.");
    }

    return items;
  }, [
    activeHealth,
    highAlerts,
    openInterventions,
    parentContacts.length,
    risk.level,
  ]);

  const addParentContact = useCallback(async () => {
    if (!student || !currentSchool?.id) return;

    if (!contactNotes.trim()) {
      showToast("error", "أدخل تفاصيل التواصل.");
      return;
    }

    setSavingContact(true);

    const { data, error } = await supabase
      .from("parent_contacts")
      .insert({
        school_id: currentSchool.id,
        student_id: student.id,
        contact_type: contactType,
        contact_date: contactDate,
        notes: contactNotes.trim(),
      })
      .select()
      .single();

    if (error) {
      setSavingContact(false);
      showToast("error", error.message);
      return;
    }

    const { error: alertError } = await supabase
      .from("alerts")
      .insert({
        school_id: currentSchool.id,
        student_id: student.id,
        alert_type: "parent_contact",
        title: "تواصل مع ولي الأمر",
        message: `تم توثيق ${contactType}.`,
        severity: "low",
        is_read: false,
      });

    setSavingContact(false);

    setParentContacts((current) => [
      data as ParentContact,
      ...current,
    ]);
    setContactNotes("");

    if (alertError) {
      showToast("success", "تم حفظ التواصل.");
      return;
    }

    showToast("success", "تم حفظ التواصل.");
  }, [
    contactDate,
    contactNotes,
    contactType,
    currentSchool?.id,
    showToast,
    student,
  ]);

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل ملف الطالب..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!student) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <PageContainer size="wide">
            {errorMsg ? (
              <ErrorState description={errorMsg} />
            ) : (
              <EmptyState
                title="الطالب غير موجود"
                description="تعذر العثور على الملف."
                icon={
                  <User size={28} aria-hidden="true" />
                }
              />
            )}
          </PageContainer>
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AppShell>
        <PageContainer
          size="wide"
          className="space-y-5 print:space-y-4"
        >
          {toast ? (
            <div className="fixed left-5 top-5 z-50 w-[min(420px,calc(100%-2rem))] print:hidden">
              {toast.type === "success" ? (
                <SuccessBanner description={toast.message} />
              ) : (
                <ErrorState description={toast.message} />
              )}
            </div>
          ) : null}

          <PageHeader
            variant="hero"
            title={student.full_name}
            description="ملف موحد للتنبيهات والتدخلات والصحة والتواصل."
            badge="ملف الطالب"
            icon={<User size={18} aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              {
                label: "الإرشاد الطلابي",
                href: "/counselor",
              },
              { label: "ملف الطالب" },
            ]}
            meta={[
              {
                label: "المرحلة",
                value: student.grade_level || "—",
              },
              {
                label: "الفصل",
                value: student.classroom || "—",
              },
              {
                label: "الشعبة",
                value: student.section || "—",
              },
              {
                label: "الخطورة",
                value: risk.level,
              },
            ]}
            stats={[
              {
                label: "التنبيهات",
                value: alerts.length,
                icon: (
                  <Bell size={20} aria-hidden="true" />
                ),
                tone: "primary",
              },
              {
                label: "التدخلات",
                value: interventions.length,
                icon: (
                  <ShieldAlert
                    size={20}
                    aria-hidden="true"
                  />
                ),
                tone: "red",
              },
              {
                label: "الصحة",
                value: healthReferrals.length,
                icon: (
                  <HeartPulse
                    size={20}
                    aria-hidden="true"
                  />
                ),
                tone: "green",
              },
              {
                label: "ولي الأمر",
                value: parentContacts.length,
                icon: (
                  <Phone size={20} aria-hidden="true" />
                ),
                tone: "gold",
              },
            ]}
            actions={
              <>
                <Link
                  href="/counselor"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 text-sm font-bold text-[var(--app-text)] transition hover:bg-[var(--app-card-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
                >
                  <ArrowRight
                    size={18}
                    aria-hidden="true"
                  />
                  العودة
                </Link>

                <SecondaryButton
                  onClick={() => window.print()}
                >
                  <Printer size={17} aria-hidden="true" />
                  طباعة
                </SecondaryButton>
              </>
            }
          />

          {errorMsg ? (
            <ErrorState description={errorMsg} />
          ) : null}

          <section
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
            aria-label="مؤشرات ملف الطالب"
          >
            <ExecutiveCard
              title="التنبيهات"
              value={alerts.length}
              subtitle={`${unreadAlerts} غير مقروء`}
              icon={<Bell size={22} aria-hidden="true" />}
              tone="primary"
              progress={
                alerts.length
                  ? Math.round(
                      (unreadAlerts / alerts.length) * 100,
                    )
                  : 0
              }
            />

            <ExecutiveCard
              title="التدخلات"
              value={interventions.length}
              subtitle={`${openInterventions} مفتوحة`}
              icon={
                <ShieldAlert size={22} aria-hidden="true" />
              }
              tone="red"
              progress={
                interventions.length
                  ? Math.round(
                      (openInterventions /
                        interventions.length) *
                        100,
                    )
                  : 0
              }
            />

            <ExecutiveCard
              title="الصحة"
              value={healthReferrals.length}
              subtitle={`${activeHealth} نشطة`}
              icon={
                <HeartPulse size={22} aria-hidden="true" />
              }
              tone="green"
              progress={
                healthReferrals.length
                  ? Math.round(
                      (activeHealth /
                        healthReferrals.length) *
                        100,
                    )
                  : 0
              }
            />

            <ExecutiveCard
              title="تواصل ولي الأمر"
              value={parentContacts.length}
              subtitle={
                lastContact ? "موثق" : "غير موثق"
              }
              icon={<Phone size={22} aria-hidden="true" />}
              tone="gold"
              progress={
                parentContacts.length > 0 ? 100 : 0
              }
            />

            <ExecutiveCard
              title="مستوى الخطورة"
              value={risk.level}
              subtitle={`الدرجة ${risk.score}`}
              icon={
                <Activity size={22} aria-hidden="true" />
              }
              tone={risk.tone}
              progress={Math.min(100, risk.score)}
            />
          </section>

          <PageSection
            title="ملخص الحالة"
            icon={<Activity size={22} aria-hidden="true" />}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Recommendation text={risk.note} />

              <Recommendation
                text={
                  lastContact
                    ? `آخر تواصل: ${
                        lastContact.contact_type || "تواصل"
                      } بتاريخ ${
                        lastContact.contact_date || "—"
                      }`
                    : "لا يوجد تواصل موثق."
                }
              />

              <Recommendation
                text={
                  activeHealth > 0
                    ? "توجد حالة صحية نشطة."
                    : "لا توجد حالة صحية نشطة."
                }
              />
            </div>
          </PageSection>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PageSection
              title="بيانات الطالب"
              icon={<User size={22} aria-hidden="true" />}
            >
              <div className="space-y-3 text-sm">
                <Row
                  title="اسم الطالب"
                  value={student.full_name}
                />
                <Row
                  title="المرحلة"
                  value={student.grade_level}
                />
                <Row
                  title="الفصل"
                  value={student.classroom}
                />
                <Row
                  title="الشعبة"
                  value={student.section}
                />
                <Row
                  title="رقم الجوال"
                  value={student.phone}
                />
              </div>
            </PageSection>

            <PageSection
              title="تواصل ولي الأمر"
              icon={<Phone size={22} aria-hidden="true" />}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
                    النوع
                  </span>

                  <select
                    value={contactType}
                    onChange={(event) =>
                      setContactType(event.target.value)
                    }
                    className={FIELD_CLASS_NAME}
                  >
                    {CONTACT_TYPES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
                    التاريخ
                  </span>

                  <input
                    type="date"
                    value={contactDate}
                    onChange={(event) =>
                      setContactDate(event.target.value)
                    }
                    className={FIELD_CLASS_NAME}
                  />
                </label>
              </div>

              <label className="mt-3 block">
                <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
                  التفاصيل
                </span>

                <textarea
                  value={contactNotes}
                  onChange={(event) =>
                    setContactNotes(event.target.value)
                  }
                  placeholder="تفاصيل التواصل..."
                  rows={4}
                  className={`${FIELD_CLASS_NAME} h-auto resize-none py-3`}
                />
              </label>

              <PrimaryButton
                className="mt-3"
                onClick={() => void addParentContact()}
                loading={savingContact}
              >
                <PlusCircle
                  size={17}
                  aria-hidden="true"
                />
                حفظ
              </PrimaryButton>
            </PageSection>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ListSection
              title="آخر التنبيهات"
              icon={<Bell size={22} aria-hidden="true" />}
            >
              {alerts.length === 0 ? (
                <EmptyState
                  title="لا توجد تنبيهات"
                  description="لا توجد سجلات حالية."
                  icon={<Bell size={26} aria-hidden="true" />}
                />
              ) : (
                alerts.slice(0, 5).map((item) => (
                  <TimelineItem
                    key={item.id}
                    title={item.title}
                    description={item.message || "—"}
                    meta={`${item.severity || "medium"} | ${formatDate(
                      item.created_at,
                    )}`}
                  />
                ))
              )}
            </ListSection>

            <ListSection
              title="التدخلات الإرشادية"
              icon={
                <ShieldAlert size={22} aria-hidden="true" />
              }
            >
              {interventions.length === 0 ? (
                <EmptyState
                  title="لا توجد تدخلات"
                  description="لا توجد سجلات حالية."
                  icon={
                    <ShieldAlert
                      size={26}
                      aria-hidden="true"
                    />
                  }
                />
              ) : (
                interventions.map((item) => (
                  <TimelineItem
                    key={item.id}
                    title={item.title || "تدخل إرشادي"}
                    description={
                      item.notes ||
                      item.intervention_type ||
                      "—"
                    }
                    meta={`${item.status || "—"} | ${formatDate(
                      item.created_at,
                    )}`}
                  />
                ))
              )}
            </ListSection>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ListSection
              title="السجل الصحي"
              icon={
                <HeartPulse size={22} aria-hidden="true" />
              }
            >
              {healthReferrals.length === 0 ? (
                <EmptyState
                  title="لا توجد تحويلات"
                  description="لا توجد سجلات حالية."
                  icon={
                    <HeartPulse
                      size={26}
                      aria-hidden="true"
                    />
                  }
                />
              ) : (
                healthReferrals.map((item) => (
                  <TimelineItem
                    key={item.id}
                    title={item.reason || "تحويل صحي"}
                    description={item.notes || "—"}
                    meta={`${item.status || "—"} | ${
                      item.referral_date || "—"
                    }`}
                  />
                ))
              )}
            </ListSection>

            <ListSection
              title="سجل التواصل"
              icon={<Phone size={22} aria-hidden="true" />}
            >
              {parentContacts.length === 0 ? (
                <EmptyState
                  title="لا توجد سجلات"
                  description="لم يتم توثيق تواصل."
                  icon={<Phone size={26} aria-hidden="true" />}
                />
              ) : (
                parentContacts.map((item) => (
                  <TimelineItem
                    key={item.id}
                    title={item.contact_type || "تواصل"}
                    description={item.notes || "—"}
                    meta={
                      item.contact_date ||
                      formatDate(item.created_at)
                    }
                  />
                ))
              )}
            </ListSection>
          </section>

          <PageSection
            title="التوصيات"
            icon={<BookOpen size={22} aria-hidden="true" />}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recommendations.map((item) => (
                <Recommendation key={item} text={item} />
              ))}
            </div>
          </PageSection>
        </PageContainer>
      </AppShell>
    </RoleGuard>
  );
}

function ListSection({
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
      <div className="space-y-3">{children}</div>
    </PageSection>
  );
}

function Row({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--app-border)] pb-2">
      <span className="text-[var(--app-text-muted)]">
        {title}
      </span>

      <span className="text-left font-bold text-[var(--app-text)]">
        {value || "—"}
      </span>
    </div>
  );
}

function TimelineItem({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  meta: string;
}) {
  return (
    <article className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4">
      <p className="font-black text-[var(--app-text)]">
        {title}
      </p>

      <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
        {description}
      </p>

      <p className="mt-2 flex items-center gap-1 text-xs text-[var(--app-text-subtle)]">
        <CalendarDays size={13} aria-hidden="true" />
        {meta}
      </p>
    </article>
  );
}

function Recommendation({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 text-sm font-bold leading-7 text-[var(--app-text)]">
      {text}
    </div>
  );
}

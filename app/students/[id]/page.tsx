"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import AppShell from "@/components/layout/AppShell";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageActions from "@/components/layout/PageActions";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import PageLoader from "@/components/ui/loading/PageLoader";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";
import UiEmptyState from "@/components/ui/empty-state/EmptyState";
import RoleGuard from "@/components/auth/RoleGuard";
import { STAFF_ROLES } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  HeartPulse,
  Phone,
  PlusCircle,
  Printer,
  ShieldAlert,
  User,
  Users,
  XCircle,
} from "lucide-react";

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
  student_id: string;
  intervention_type: string | null;
  title: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

type HealthReferral = {
  id: string;
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

const CONTACT_TYPES = [
  "اتصال هاتفي",
  "رسالة واتساب",
  "استدعاء ولي أمر",
  "اجتماع حضوري",
  "ملاحظة مكتوبة",
];

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params.id as string;
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
      window.setTimeout(() => setToast(null), 2500);
    },
    [],
  );

  const fetchStudentProfile = useCallback(async () => {
    if (!studentId || !currentSchool?.id) return;

    setLoading(true);
    setErrorMsg("");

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
        .eq("school_id", currentSchool?.id || "")
        .single(),

      supabase
        .from("alerts")
        .select("*")
        .eq("school_id", currentSchool?.id || "")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),

      supabase
        .from("student_interventions")
        .select("*")
        .eq("school_id", currentSchool?.id || "")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),

      supabase
        .from("health_referrals")
        .select("*")
        .eq("school_id", currentSchool?.id || "")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),

      supabase
        .from("parent_contacts")
        .select("*")
        .eq("school_id", currentSchool?.id || "")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
    ]);

    if (studentResult.error) {
      setErrorMsg(studentResult.error.message);
      setStudent(null);
      setLoading(false);
      return;
    }

    setStudent((studentResult.data as Student) || null);
    setAlerts((alertsResult.data as AlertItem[]) || []);
    setInterventions((interventionsResult.data as Intervention[]) || []);
    setHealthReferrals((healthResult.data as HealthReferral[]) || []);
    setParentContacts((contactsResult.data as ParentContact[]) || []);

    const optionalErrors = [
      alertsResult.error,
      interventionsResult.error,
      healthResult.error,
      contactsResult.error,
    ].filter(Boolean);

    if (optionalErrors.length > 0) {
      setErrorMsg("تم تحميل ملف الطالب، لكن تعذر تحميل بعض السجلات المرتبطة.");
    }

    setLoading(false);
  }, [currentSchool?.id, studentId]);

  useEffect(() => {
    void fetchStudentProfile();
  }, [fetchStudentProfile]);

  async function addParentContact() {
    if (!student || !currentSchool?.id) return;

    if (!contactNotes.trim()) {
      showToast("error", "اكتب ملاحظات التواصل أولاً");
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

    await supabase.from("alerts").insert({
      school_id: currentSchool.id,
      student_id: student.id,
      alert_type: "parent_contact",
      title: "تواصل مع ولي الأمر",
      message: `تم توثيق ${contactType} للطالب ${student.full_name}`,
      severity: "low",
      is_read: false,
    });

    setSavingContact(false);
    setParentContacts((prev) => [data as ParentContact, ...prev]);
    setContactNotes("");
    showToast("success", "تم حفظ تواصل ولي الأمر");
  }

  function printProfile() {
    window.print();
  }

  const highAlerts = alerts.filter((item) => item.severity === "high").length;

  const unreadAlerts = alerts.filter((item) => !item.is_read).length;

  const openInterventions = interventions.filter(
    (item) => item.status === "مفتوح" || item.status === "قيد المتابعة"
  ).length;

  const activeHealth = healthReferrals.filter(
    (item) => item.status !== "عاد للفصل"
  ).length;

  const lastContact = parentContacts[0];

  const risk = useMemo(() => {
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
        color: "bg-[var(--app-danger)] text-white",
        note: "يتطلب متابعة عاجلة وتدخل مباشر.",
      };
    }

    if (score >= 60) {
      return {
        score,
        level: "مرتفع",
        color: "bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)]",
        note: "يحتاج خطة متابعة قريبة.",
      };
    }

    if (score >= 30) {
      return {
        score,
        level: "متوسط",
        color: "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]",
        note: "يفضل متابعة الحالة أسبوعياً.",
      };
    }

    return {
      score,
      level: "منخفض",
      color: "bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]",
      note: "وضع الطالب مستقر حالياً.",
    };
  }, [highAlerts, unreadAlerts, openInterventions, activeHealth, parentContacts.length]);

  const recommendations = useMemo(() => {
    const items: string[] = [];

    if (highAlerts > 0) {
      items.push("مراجعة التنبيهات عالية الخطورة فوراً.");
    }

    if (openInterventions > 0) {
      items.push("متابعة التدخلات الإرشادية المفتوحة وإغلاق المنجز منها.");
    }

    if (activeHealth > 0) {
      items.push("متابعة الحالة الصحية مع الموجه الصحي حتى عودة الطالب للفصل.");
    }

    if (parentContacts.length === 0) {
      items.push("توثيق أول تواصل مع ولي الأمر لهذا الطالب.");
    }

    if (risk.level === "حرج" || risk.level === "مرتفع") {
      items.push("إنشاء خطة متابعة أسبوعية للطالب وربطها بالموجه الطلابي.");
    }

    if (items.length === 0) {
      items.push("لا توجد توصيات عاجلة حالياً، الوضع مستقر.");
    }

    return items;
  }, [highAlerts, openInterventions, activeHealth, parentContacts.length, risk.level]);

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل ملف الطالب..." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!currentSchool) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <ErrorState description="لا توجد مدرسة مرتبطة بالمستخدم الحالي." />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!student) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <UiEmptyState
            icon={<User className="h-9 w-9" aria-hidden="true" />}
            title="الطالب غير موجود"
            description="تعذر العثور على الطالب ضمن المدرسة الحالية."
          />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AppShell>
        <PageContainer size="wide" className="space-y-5 print:space-y-4">
          <Breadcrumb />

          {toast && (
            <div className="fixed left-5 top-5 z-50 w-[min(420px,calc(100%-2rem))] print:hidden">
              {toast.type === "success" ? (
                <SuccessBanner description={toast.message} />
              ) : (
                <ErrorState description={toast.message} />
              )}
            </div>
          )}

          <PageHeader
            variant="hero"
            title={student.full_name}
            description="ملف الطالب الذكي لمتابعة التنبيهات، التدخلات الإرشادية، التحويلات الصحية، وتواصل ولي الأمر في مكان واحد."
            badge="ملف الطالب الذكي"
            icon={<User className="h-4 w-4" aria-hidden="true" />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الإرشاد الطلابي", href: "/counselor" },
              { label: "ملف الطالب" },
            ]}
            meta={[
              { label: "المرحلة", value: student.grade_level || "-" },
              { label: "الفصل", value: student.classroom || "-" },
              { label: "الشعبة", value: student.section || "-" },
              { label: "مستوى الخطورة", value: risk.level },
            ]}
            stats={[
              { label: "التنبيهات", value: alerts.length, icon: <Bell size={20} aria-hidden="true" />, tone: "primary" },
              { label: "التدخلات", value: interventions.length, icon: <ShieldAlert size={20} aria-hidden="true" />, tone: "red" },
              { label: "الصحة", value: healthReferrals.length, icon: <HeartPulse size={20} aria-hidden="true" />, tone: "green" },
              { label: "ولي الأمر", value: parentContacts.length, icon: <Phone size={20} aria-hidden="true" />, tone: "gold" },
            ]}
          />

          <PageActions className="print:hidden">
            <Link
              href="/counselor"
              className="inline-flex items-center gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-2 text-sm font-bold text-[var(--app-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-card-soft)] hover:text-[var(--app-text)]"
            >
              <ArrowRight size={18} aria-hidden="true" />
              العودة للموجه الطلابي
            </Link>

            <SecondaryButton
              icon={<Printer size={17} aria-hidden="true" />}
              onClick={printProfile}
            >
              طباعة ملف الطالب
            </SecondaryButton>
          </PageActions>

          {errorMsg && <ErrorState description={errorMsg} />}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ExecutiveCard
              title="التنبيهات"
              value={alerts.length}
              subtitle={`${unreadAlerts} غير مقروءة`}
              icon={<Bell size={22} aria-hidden="true" />}
              tone="primary"
              progress={alerts.length > 0 ? Math.min(100, unreadAlerts * 20) : 0}
            />

            <ExecutiveCard
              title="التدخلات"
              value={interventions.length}
              subtitle={`${openInterventions} مفتوحة`}
              icon={<ShieldAlert size={22} aria-hidden="true" />}
              tone="red"
              progress={interventions.length > 0 ? Math.round((openInterventions / interventions.length) * 100) : 0}
            />

            <ExecutiveCard
              title="التحويلات الصحية"
              value={healthReferrals.length}
              subtitle={`${activeHealth} حالة نشطة`}
              icon={<HeartPulse size={22} aria-hidden="true" />}
              tone="green"
              progress={healthReferrals.length > 0 ? Math.round((activeHealth / healthReferrals.length) * 100) : 0}
            />

            <ExecutiveCard
              title="تواصل ولي الأمر"
              value={parentContacts.length}
              subtitle={lastContact ? "آخر تواصل موثق" : "لم يوثق بعد"}
              icon={<Phone size={22} aria-hidden="true" />}
              tone="gold"
              progress={parentContacts.length > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="مستوى الخطورة"
              value={risk.level}
              subtitle={`الدرجة ${risk.score}`}
              icon={<Activity size={22} aria-hidden="true" />}
              tone={risk.level === "حرج" || risk.level === "مرتفع" ? "red" : risk.level === "متوسط" ? "gold" : "green"}
              progress={Math.min(100, risk.score)}
            />
          </section>

          <Card title="ملخص الحالة الذكي" icon={<Activity size={22} aria-hidden="true" />}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Recommendation text={risk.note} />
              <Recommendation
                text={
                  lastContact
                    ? `آخر تواصل مع ولي الأمر: ${lastContact.contact_type || "تواصل"} بتاريخ ${lastContact.contact_date || "-"}`
                    : "لم يتم توثيق تواصل مع ولي الأمر حتى الآن."
                }
              />
              <Recommendation
                text={
                  activeHealth > 0
                    ? "يوجد تحويل صحي نشط يحتاج متابعة."
                    : "لا توجد حالات صحية نشطة حالياً."
                }
              />
            </div>
          </Card>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card title="بيانات الطالب" icon={<User size={22} aria-hidden="true" />}>
              <div className="space-y-3 text-sm">
                <Row title="اسم الطالب" value={student.full_name} />
                <Row title="المرحلة" value={student.grade_level} />
                <Row title="الفصل" value={student.classroom} />
                <Row title="الشعبة" value={student.section} />
                <Row title="رقم الجوال" value={student.phone} />
              </div>
            </Card>

            <Card title="إضافة تواصل مع ولي الأمر" icon={<Phone size={22} aria-hidden="true" />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <select
                  value={contactType}
                  onChange={(event) => setContactType(event.target.value)}
                  className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
                >
                  {CONTACT_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={contactDate}
                  onChange={(event) => setContactDate(event.target.value)}
                  className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
                />
              </div>

              <textarea
                value={contactNotes}
                onChange={(event) => setContactNotes(event.target.value)}
                placeholder="اكتب تفاصيل التواصل مع ولي الأمر..."
                className="mt-3 min-h-24 w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)]"
              />

              <PrimaryButton
                className="mt-3"
                icon={<PlusCircle size={17} aria-hidden="true" />}
                onClick={() => void addParentContact()}
                loading={savingContact}
              >
                حفظ التواصل
              </PrimaryButton>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ListCard title="آخر التنبيهات" icon={<Bell size={22} aria-hidden="true" />}>
              {alerts.length === 0 ? (
                <UiEmptyState title="لا توجد تنبيهات" description="لا توجد تنبيهات مسجلة لهذا الطالب." />
              ) : (
                alerts.slice(0, 5).map((item) => (
                  <TimelineItem
                    key={item.id}
                    title={item.title}
                    description={item.message || "-"}
                    meta={`${item.severity || "medium"} | ${formatDate(item.created_at)}`}
                  />
                ))
              )}
            </ListCard>

            <ListCard title="التدخلات الإرشادية" icon={<ShieldAlert size={22} aria-hidden="true" />}>
              {interventions.length === 0 ? (
                <UiEmptyState title="لا توجد تدخلات" description="لا توجد تدخلات إرشادية مسجلة." />
              ) : (
                interventions.map((item) => (
                  <TimelineItem
                    key={item.id}
                    title={item.title || "تدخل إرشادي"}
                    description={item.notes || item.intervention_type || "-"}
                    meta={`${item.status || "-"} | ${formatDate(item.created_at)}`}
                  />
                ))
              )}
            </ListCard>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ListCard title="السجل الصحي" icon={<HeartPulse size={22} aria-hidden="true" />}>
              {healthReferrals.length === 0 ? (
                <UiEmptyState title="لا توجد تحويلات صحية" description="لا توجد تحويلات صحية مسجلة." />
              ) : (
                healthReferrals.map((item) => (
                  <TimelineItem
                    key={item.id}
                    title={item.reason || "تحويل صحي"}
                    description={item.notes || "-"}
                    meta={`${item.status || "-"} | ${item.referral_date || "-"}`}
                  />
                ))
              )}
            </ListCard>

            <ListCard title="سجل التواصل مع ولي الأمر" icon={<Phone size={22} aria-hidden="true" />}>
              {parentContacts.length === 0 ? (
                <UiEmptyState title="لا توجد سجلات تواصل" description="لم يتم توثيق تواصل مع ولي الأمر." />
              ) : (
                parentContacts.map((item) => (
                  <TimelineItem
                    key={item.id}
                    title={item.contact_type || "تواصل"}
                    description={item.notes || "-"}
                    meta={item.contact_date || formatDate(item.created_at)}
                  />
                ))
              )}
            </ListCard>
          </section>

          <Card title="توصيات ذكية للموجه الطلابي" icon={<BookOpen size={22} aria-hidden="true" />}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recommendations.map((item) => (
                <Recommendation key={item} text={item} />
              ))}
            </div>
          </Card>
        </PageContainer>
      </AppShell>
    </RoleGuard>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-primary)]/10 text-[var(--app-text)]">
          {icon}
        </div>
        <h2 className="text-xl font-black text-[var(--app-text)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ListCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card title={title} icon={icon}>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

function Row({ title, value }: { title: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2">
      <span className="text-[var(--app-text-muted)]">{title}</span>
      <span className="font-bold text-[var(--app-text)]">{value || "-"}</span>
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
    <div className="rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-4">
      <p className="font-black text-[var(--app-text)]">{title}</p>
      <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">{description}</p>
      <p className="mt-2 flex items-center gap-1 text-xs text-[var(--app-text-subtle)]">
        <CalendarDays size={13} aria-hidden="true" />
        {meta}
      </p>
    </div>
  );
}

function Recommendation({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 text-sm font-bold leading-7 text-[var(--app-text)]">
      {text}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
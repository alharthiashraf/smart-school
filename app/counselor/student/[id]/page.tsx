"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import AppShell from "@/components/layout/AppShell";
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
  Loader2,
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

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2500);
  }

  const fetchStudentProfile = useCallback(async () => {
    if (!studentId) return;

    setLoading(true);
    setErrorMsg("");

    const [
      studentResult,
      alertsResult,
      interventionsResult,
      healthResult,
      contactsResult,
    ] = await Promise.all([
      supabase.from("students").select("*").eq("id", studentId).single(),

      supabase
        .from("alerts")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),

      supabase
        .from("student_interventions")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),

      supabase
        .from("health_referrals")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),

      supabase
        .from("parent_contacts")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
    ]);

    setLoading(false);

    if (studentResult.error) {
      setErrorMsg(studentResult.error.message);
      return;
    }

    setStudent((studentResult.data as Student) || null);
    setAlerts((alertsResult.data as AlertItem[]) || []);
    setInterventions((interventionsResult.data as Intervention[]) || []);
    setHealthReferrals((healthResult.data as HealthReferral[]) || []);
    setParentContacts((contactsResult.data as ParentContact[]) || []);
  }, [studentId]);

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
        color: "bg-red-600 text-white",
        note: "يتطلب متابعة عاجلة وتدخل مباشر.",
      };
    }

    if (score >= 60) {
      return {
        score,
        level: "مرتفع",
        color: "bg-red-50 text-red-700",
        note: "يحتاج خطة متابعة قريبة.",
      };
    }

    if (score >= 30) {
      return {
        score,
        level: "متوسط",
        color: "bg-amber-50 text-amber-700",
        note: "يفضل متابعة الحالة أسبوعياً.",
      };
    }

    return {
      score,
      level: "منخفض",
      color: "bg-emerald-50 text-emerald-700",
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
          <LoadingBox />
        </AppShell>
      </RoleGuard>
    );
  }

  if (!student) {
    return (
      <RoleGuard allowedRoles={STAFF_ROLES}>
        <AppShell>
          <EmptyBox text="الطالب غير موجود." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AppShell>
        <div className="space-y-5 print:space-y-4">
          {toast && <ToastBox toast={toast} />}

          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <Link
              href="/counselor"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#0f1f3d]"
            >
              <ArrowRight size={18} />
              العودة للموجه الطلابي
            </Link>

            <button
              onClick={printProfile}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0f1f3d] px-5 py-3 text-sm font-bold text-white"
            >
              <Printer size={17} />
              طباعة ملف الطالب
            </button>
          </div>

          <section className="relative overflow-hidden rounded-[30px] bg-[#0f1f3d] p-6 text-white shadow-sm">
            <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-[#d4af37]/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10">
                  <User size={38} />
                </div>

                <div>
                  <p className="mb-2 text-sm font-bold text-[#d4af37]">
                    ملف الطالب الذكي
                  </p>

                  <h1 className="text-3xl font-black md:text-4xl">
                    {student.full_name}
                  </h1>

                  <p className="mt-2 text-sm text-slate-300">
                    {student.grade_level || "-"} | {student.classroom || "-"} |{" "}
                    {student.section || "-"}
                  </p>
                </div>
              </div>

              <div className={`rounded-2xl px-5 py-3 text-sm font-black ${risk.color}`}>
                مستوى الخطورة: {risk.level}
                <div className="mt-1 text-xs font-bold opacity-80">
                  الدرجة: {risk.score}
                </div>
              </div>
            </div>
          </section>

          {errorMsg && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
              {errorMsg}
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard title="التنبيهات" value={alerts.length} icon={<Bell size={22} />} color="blue" />
            <StatCard title="التدخلات" value={interventions.length} icon={<ShieldAlert size={22} />} color="red" />
            <StatCard title="التحويلات الصحية" value={healthReferrals.length} icon={<HeartPulse size={22} />} color="emerald" />
            <StatCard title="تواصل ولي الأمر" value={parentContacts.length} icon={<Phone size={22} />} color="amber" />
            <StatCard title="مستوى الخطورة" value={risk.level} icon={<Activity size={22} />} color="blue" />
          </section>

          <Card title="ملخص الحالة الذكي" icon={<Activity size={22} />}>
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
            <Card title="بيانات الطالب" icon={<User size={22} />}>
              <div className="space-y-3 text-sm">
                <Row title="اسم الطالب" value={student.full_name} />
                <Row title="المرحلة" value={student.grade_level} />
                <Row title="الفصل" value={student.classroom} />
                <Row title="الشعبة" value={student.section} />
                <Row title="رقم الجوال" value={student.phone} />
              </div>
            </Card>

            <Card title="إضافة تواصل مع ولي الأمر" icon={<Phone size={22} />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <select
                  value={contactType}
                  onChange={(event) => setContactType(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
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
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
                />
              </div>

              <textarea
                value={contactNotes}
                onChange={(event) => setContactNotes(event.target.value)}
                placeholder="اكتب تفاصيل التواصل مع ولي الأمر..."
                className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
              />

              <button
                onClick={addParentContact}
                disabled={savingContact}
                className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-[#0f1f3d] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <PlusCircle size={17} />
                {savingContact ? "جاري الحفظ..." : "حفظ التواصل"}
              </button>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ListCard title="آخر التنبيهات" icon={<Bell size={22} />}>
              {alerts.length === 0 ? (
                <EmptyBox text="لا توجد تنبيهات." />
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

            <ListCard title="التدخلات الإرشادية" icon={<ShieldAlert size={22} />}>
              {interventions.length === 0 ? (
                <EmptyBox text="لا توجد تدخلات إرشادية." />
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
            <ListCard title="السجل الصحي" icon={<HeartPulse size={22} />}>
              {healthReferrals.length === 0 ? (
                <EmptyBox text="لا توجد تحويلات صحية." />
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

            <ListCard title="سجل التواصل مع ولي الأمر" icon={<Phone size={22} />}>
              {parentContacts.length === 0 ? (
                <EmptyBox text="لا توجد سجلات تواصل." />
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

          <Card title="توصيات ذكية للموجه الطلابي" icon={<BookOpen size={22} />}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recommendations.map((item) => (
                <Recommendation key={item} text={item} />
              ))}
            </div>
          </Card>
        </div>
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
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f1f3d]/10 text-[#0f1f3d]">
          {icon}
        </div>
        <h2 className="text-xl font-black text-[#0f1f3d]">{title}</h2>
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
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <span className="text-slate-500">{title}</span>
      <span className="font-bold text-[#0f1f3d]">{value || "-"}</span>
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
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="font-black text-[#0f1f3d]">{title}</p>
      <p className="mt-1 text-sm leading-7 text-slate-600">{description}</p>
      <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
        <CalendarDays size={13} />
        {meta}
      </p>
    </div>
  );
}

function Recommendation({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-700">
      {text}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "blue" | "amber" | "red" | "emerald";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-3xl font-black text-[#0f1f3d]">{value}</h2>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-slate-50 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-lg ${
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      {toast.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      {toast.message}
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-3xl border bg-white px-6 py-4 text-slate-600 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-[#0f1f3d]" />
        جاري تحميل ملف الطالب...
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
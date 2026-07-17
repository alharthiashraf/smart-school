"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Gauge,
  ImageIcon,
  Plus,
  Printer,
  RefreshCcw,
  School,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  Wand2,
  XCircle,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import DangerButton from "@/components/ui/buttons/DangerButton";
import ExportButton from "@/components/ui/buttons/ExportButton";

import { analyzeEvidence, scoreEvidence } from "@/lib/ai/evidenceAI";
import { ExportEngine } from "@/core";
import { validateEvidence } from "@/lib/validations/evidence";

type EvidenceType =
  | "تقرير"
  | "محضر"
  | "خطة"
  | "صورة"
  | "جدول"
  | "نموذج"
  | "رابط"
  | "ملف Excel"
  | "ملف PDF"
  | "أخرى";

type EvidenceItem = {
  id: string;
  name: string;
  type: EvidenceType;
  proves: string;
  impact: string;
  notes: string;
  hasDate: boolean;
  hasOwner: boolean;
  hasResult: boolean;
  hasSignature: boolean;
  hasVisualProof: boolean;
};

type EvidenceExportRow = Record<string, unknown> & {
  name: string;
  type: string;
  proves: string;
  impact: string;
  strength: string;
  score: string | number;
  reason: string;
  aiAdvice: string;
  uploadStatus: string;
};

const evidenceTypes: EvidenceType[] = [
  "تقرير",
  "محضر",
  "خطة",
  "صورة",
  "جدول",
  "نموذج",
  "رابط",
  "ملف Excel",
  "ملف PDF",
  "أخرى",
];

const domains = [
  "غير متوفر",
  "القيادة المدرسية",
  "التعليم والتعلم",
  "نواتج التعلم",
  "التوجيه الطلابي",
  "الصحة المدرسية",
  "النشاط الطلابي",
  "الشراكة المجتمعية",
  "السلامة والانضباط",
  "الجودة والتميز",
];

const categories = [
  "غير متوفر",
  "قيادة",
  "تعليم وتعلم",
  "نواتج تعلم",
  "توجيه طلابي",
  "شراكة",
  "نشاط",
  "صحة مدرسية",
  "انضباط",
  "جودة",
];

const uid = () => Math.random().toString(36).slice(2, 10);

function emptyEvidence(): EvidenceItem {
  return {
    id: uid(),
    name: "",
    type: "تقرير",
    proves: "",
    impact: "",
    notes: "",
    hasDate: false,
    hasOwner: false,
    hasResult: false,
    hasSignature: false,
    hasVisualProof: false,
  };
}

function normalizeStrength(value: string) {
  const strength = String(value || "").toLowerCase();

  if (strength === "strong" || strength === "قوي") return "قوي";
  if (strength === "medium" || strength === "متوسط") return "متوسط";
  return "ضعيف";
}

function normalizeUploadStatus(value: string) {
  const status = String(value || "").toLowerCase();

  if (status === "yes" || status === "نعم" || status === "ready") return "نعم";
  if (status === "needs improvement" || status === "يحتاج تحسين") return "يحتاج تحسين";
  return "لا";
}

function normalizeReadiness(value: string) {
  const readiness = String(value || "").toLowerCase();

  if (readiness === "high" || readiness === "مرتفع") return "مرتفع";
  if (readiness === "medium" || readiness === "متوسط") return "متوسط";
  return "منخفض";
}

function strengthClass(strength: string) {
  const value = normalizeStrength(strength);

  if (value === "قوي") return "border-[color-mix(in_srgb,var(--app-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
  if (value === "متوسط") return "border-[color-mix(in_srgb,var(--app-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";

  return "border-[color-mix(in_srgb,var(--app-danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]";
}

function uploadClass(status: string) {
  const value = normalizeUploadStatus(status);

  if (value === "نعم") return "border-[color-mix(in_srgb,var(--app-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]";
  if (value === "يحتاج تحسين") return "border-[color-mix(in_srgb,var(--app-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]";

  return "border-[color-mix(in_srgb,var(--app-danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]";
}

function readinessTone(level: string) {
  const value = normalizeReadiness(level);
  if (value === "مرتفع") return "green";
  if (value === "متوسط") return "gold";
  return "red";
}

function readinessClass(level: string) {
  const value = normalizeReadiness(level);
  if (value === "مرتفع") return "bg-[var(--app-success)]";
  if (value === "متوسط") return "bg-[var(--app-accent)]";
  return "bg-[var(--app-danger)]";
}

export default function EvidenceAuditorPage() {
  const [schoolName, setSchoolName] = useState("");
  const [domain, setDomain] = useState("غير متوفر");
  const [category, setCategory] = useState("غير متوفر");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [principal, setPrincipal] = useState("");
  const [xAccount, setXAccount] = useState("");
  const [aiUsed, setAiUsed] = useState(false);

  const [items, setItems] = useState<EvidenceItem[]>([
    {
      ...emptyEvidence(),
      name: "تقرير تحليل نتائج الطلاب",
      type: "تقرير",
      proves: "تحليل مستوى التحصيل وتحديد فئات الدعم",
      impact: "تحسين قرارات المعالجة ورفع نسبة الإتقان",
      notes: "يحتاج إرفاق مقارنة قبلية وبعدية",
      hasDate: true,
      hasOwner: true,
      hasResult: true,
      hasSignature: false,
      hasVisualProof: true,
    },
    {
      ...emptyEvidence(),
      name: "محضر اجتماع لجنة التحصيل",
      type: "محضر",
      proves: "وجود متابعة مدرسية منظمة للتحصيل",
      impact: "توزيع مسؤوليات علاج الفاقد التعليمي",
      notes: "",
      hasDate: true,
      hasOwner: true,
      hasResult: false,
      hasSignature: true,
      hasVisualProof: false,
    },
    {
      ...emptyEvidence(),
      name: "صور تنفيذ برنامج علاجي",
      type: "صورة",
      proves: "تنفيذ نشاط علاجي للطلاب المستهدفين",
      impact: "",
      notes: "الصورة وحدها لا تكفي دون كشف مستفيدين ونتائج",
      hasDate: false,
      hasOwner: false,
      hasResult: false,
      hasSignature: false,
      hasVisualProof: true,
    },
  ]);

  const auditRows = useMemo(() => items.map(scoreEvidence), [items]);

  const analysis = useMemo(
    () =>
      analyzeEvidence({
        items,
        schoolName,
        domain,
        category,
        academicYear,
        preparedBy,
        principal,
      }),
    [items, schoolName, domain, category, academicYear, preparedBy, principal],
  );

  const strongestItems = analysis.strongestEvidence.length
    ? analysis.strongestEvidence
    : auditRows.slice(0, 3);

  const stats = useMemo(() => {
    const total = auditRows.length;
    const strong = auditRows.filter((row) => normalizeStrength(String(row.strength)) === "قوي").length;
    const medium = auditRows.filter((row) => normalizeStrength(String(row.strength)) === "متوسط").length;
    const weak = auditRows.filter((row) => normalizeStrength(String(row.strength)) === "ضعيف").length;

    return { total, strong, medium, weak };
  }, [auditRows]);

  function updateItem(id: string, patch: Partial<EvidenceItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setAiUsed(false);
  }

  function addEvidence() {
    setItems((prev) => [...prev, emptyEvidence()]);
    setAiUsed(false);
  }

  function removeEvidence(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setAiUsed(false);
  }

  function runAiAuditor() {
    setAiUsed(true);

    setItems((prev) =>
      prev.map((item) => {
        const result = validateEvidence(item);
        const patch: Partial<EvidenceItem> = {};

        if (item.type === "تقرير" || item.type === "ملف Excel") {
          patch.hasResult = item.hasResult || Boolean(item.impact.trim());
        }

        if (item.type === "محضر") {
          patch.hasSignature = item.hasSignature || item.name.includes("محضر");
        }

        if (item.type === "صورة") {
          patch.hasVisualProof = true;
        }

        if (!result.valid) {
          patch.notes = item.notes || result.errors.join(" ");
        }

        return { ...item, ...patch };
      }),
    );
  }

  function resetAll() {
    setSchoolName("");
    setDomain("غير متوفر");
    setCategory("غير متوفر");
    setSemester("");
    setAcademicYear("");
    setPreparedBy("");
    setPrincipal("");
    setXAccount("");
    setAiUsed(false);
    setItems([emptyEvidence()]);
  }

  function getExportRows(): EvidenceExportRow[] {
    return auditRows.map((row) => ({
      name: row.name || "غير متوفر",
      type: row.type,
      proves: row.proves || "غير متوفر",
      impact: row.impact || "غير متوفر",
      strength: normalizeStrength(String(row.strength)),
      score: row.score,
      reason: row.reason,
      aiAdvice: row.aiAdvice,
      uploadStatus: normalizeUploadStatus(String(row.uploadStatus)),
    }));
  }

  function exportExcel() {
    ExportEngine.excel("مدقق-الشواهد-الذكي", getExportRows(), [
      { header: "اسم الشاهد", key: "name" },
      { header: "نوعه", key: "type" },
      { header: "ماذا يثبت؟", key: "proves" },
      { header: "الأثر", key: "impact" },
      { header: "درجة القوة", key: "strength" },
      { header: "النسبة", key: "score" },
      { header: "سبب التقييم", key: "reason" },
      { header: "التوصية الذكية", key: "aiAdvice" },
      { header: "هل يصلح للرفع؟", key: "uploadStatus" },
    ]);
  }

  function exportPDF() {
    ExportEngine.pdf("مدقق الشواهد الذكي", getExportRows(), [
      { header: "اسم الشاهد", key: "name" },
      { header: "نوعه", key: "type" },
      { header: "درجة القوة", key: "strength" },
      {
        header: "النسبة",
        key: "score",
        format: (value) => `${value}%`,
      },
      { header: "هل يصلح للرفع؟", key: "uploadStatus" },
    ]);
  }

  return (
    <AppShell>
      <main dir="rtl" className="space-y-5 print:bg-[var(--app-card)]">
        <PageHeader
          variant="hero"
          title="مدقق الشواهد الذكي"
          description="فحص قوة الشواهد، كشف الفجوات، وبناء خطة إغلاق قبل الرفع أو التقييم."
          badge="الجودة والتميز"
          icon={<Sparkles size={18}  aria-hidden="true" />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "الجودة", href: "/quality" },
            { label: "مدقق الشواهد" },
          ]}
          meta={[
            { label: "اسم المدرسة", value: schoolName || "غير متوفر" },
            { label: "المجال", value: domain || "غير متوفر" },
            { label: "الفئة", value: category || "غير متوفر" },
            { label: "العام الدراسي", value: academicYear || "غير متوفر" },
          ]}
          stats={[
            { label: "عدد الشواهد", value: stats.total, icon: <FileText size={20}  aria-hidden="true" />, tone: "primary" },
            { label: "مستوى الجاهزية", value: normalizeReadiness(analysis.readiness), icon: <Gauge size={20}  aria-hidden="true" />, tone: readinessTone(analysis.readiness) },
            { label: "متوسط القوة", value: `${analysis.averageScore}%`, icon: <BarChart3 size={20}  aria-hidden="true" />, tone: analysis.averageScore >= 80 ? "green" : "gold" },
            { label: "الشواهد القوية", value: stats.strong, icon: <CheckCircle2 size={20}  aria-hidden="true" />, tone: "green" },
          ]}
          actions={
            <>
              <PrimaryButton icon={<Wand2 size={17}  aria-hidden="true" />} onClick={runAiAuditor}>
                تشغيل التحليل الذكي
              </PrimaryButton>

              <PrimaryButton icon={<Plus size={17}  aria-hidden="true" />} onClick={addEvidence}>
                شاهد جديد
              </PrimaryButton>

              <ExportButton
                icon={<Printer size={17} aria-hidden="true" />}
                onClick={exportPDF}
              >
                PDF
              </ExportButton>

              <ExportButton
                icon={<Download size={17} aria-hidden="true" />}
                onClick={exportExcel}
              >
                Excel
              </ExportButton>

              <SecondaryButton icon={<RefreshCcw size={17}  aria-hidden="true" />} onClick={resetAll}>
                تصفير
              </SecondaryButton>
            </>
          }
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 no-print">
          <ExecutiveCard
            title="عدد الشواهد"
            value={stats.total}
            subtitle="إجمالي الشواهد المدخلة"
            icon={<FileText size={22}  aria-hidden="true" />}
            tone="primary"
            progress={stats.total > 0 ? 100 : 0}
          />

          <ExecutiveCard
            title="مستوى الجاهزية"
            value={normalizeReadiness(analysis.readiness)}
            subtitle={`${analysis.averageScore}% متوسط القوة`}
            icon={<Gauge size={22}  aria-hidden="true" />}
            tone={readinessTone(analysis.readiness)}
            progress={analysis.averageScore}
          />

          <ExecutiveCard
            title="الشواهد القوية"
            value={stats.strong}
            subtitle="جاهزة نسبيًا للرفع"
            icon={<CheckCircle2 size={22}  aria-hidden="true" />}
            tone="green"
            progress={stats.total ? Math.round((stats.strong / stats.total) * 100) : 0}
          />

          <ExecutiveCard
            title="تحتاج تحسين"
            value={stats.medium + stats.weak}
            subtitle="متوسطة أو ضعيفة"
            icon={<AlertTriangle size={22}  aria-hidden="true" />}
            tone={stats.medium + stats.weak > 0 ? "gold" : "green"}
            progress={stats.total ? Math.round(((stats.medium + stats.weak) / stats.total) * 100) : 0}
          />
        </section>

        <SummaryCard
          title="ملخص جاهزية ملف الشواهد"
          description="ملخص قوة الشواهد وجودة التوثيق."
          tone={readinessTone(analysis.readiness)}
          items={[
            { label: "عدد الشواهد", value: stats.total },
            { label: "قوية", value: stats.strong },
            { label: "متوسطة", value: stats.medium },
            { label: "ضعيفة", value: stats.weak },
            { label: "متوسط القوة", value: `${analysis.averageScore}%` },
            { label: "مستوى الجاهزية", value: normalizeReadiness(analysis.readiness) },
          ]}
          footer="الشاهد القوي لا يكتفي بوصف النشاط؛ بل يثبت أثره ونتيجته بمسؤول وتاريخ وتوثيق واضح."
        />

        {aiUsed && (
          <div className="no-print">
            <SuccessBanner description="تم تشغيل التحليل الذكي وفق سياسة مدقق الشواهد: لا مجاملة، تقييم موضوعي، فصل بين الشاهد القوي والشكلي، وربط كل شاهد بالأثر المتوقع." />
          </div>
        )}

        <section className="no-print rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
          <Title
            title="بيانات الملف"
            description="إذا لم تتوفر بعض البيانات ستظهر في التقرير باسم: غير متوفر."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="اسم المدرسة" value={schoolName} onChange={setSchoolName} icon={<School className="h-4 w-4"  aria-hidden="true" />} />
            <SelectField label="المجال أو المؤشر" value={domain} onChange={setDomain} options={domains} icon={<Target className="h-4 w-4"  aria-hidden="true" />} />
            <SelectField label="الفئة" value={category} onChange={setCategory} options={categories} icon={<ShieldCheck className="h-4 w-4"  aria-hidden="true" />} />
            <Field label="الفصل الدراسي" value={semester} onChange={setSemester} icon={<CalendarDays className="h-4 w-4"  aria-hidden="true" />} />
            <Field label="العام الدراسي" value={academicYear} onChange={setAcademicYear} icon={<CalendarDays className="h-4 w-4"  aria-hidden="true" />} />
            <Field label="اسم المعد" value={preparedBy} onChange={setPreparedBy} icon={<UserRound className="h-4 w-4"  aria-hidden="true" />} />
            <Field label="مدير المدرسة" value={principal} onChange={setPrincipal} icon={<ShieldCheck className="h-4 w-4"  aria-hidden="true" />} />
            <Field label="حساب X" value={xAccount} onChange={setXAccount} icon={<FileText className="h-4 w-4"  aria-hidden="true" />} />
          </div>
        </section>

        <section className="no-print rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)]">
          <Title
            title="إدخال الشواهد"
            description="أدخل بيانات الشاهد. التحليل الذكي يقيم القوة حسب وضوح الشاهد والأثر والتوثيق."
          />

          <div className="mt-5 space-y-4">
            {items.map((item, index) => {
              const row = scoreEvidence(item);

              return (
                <div key={item.id} className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-text)] text-sm font-black text-[var(--app-text-inverse)]">
                        {index + 1}
                      </div>

                      <div>
                        <div className="font-black text-[var(--app-text)]">شاهد رقم {index + 1}</div>
                        <div className="text-xs text-[var(--app-text-muted)]">الدرجة الحالية: {row.score}%</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={strengthClass(row.strength)}>
                        {normalizeStrength(String(row.strength))}
                      </Badge>

                      <DangerButton
                        onClick={() => removeEvidence(item.id)}
                        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                      >
                        حذف
                      </DangerButton>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-12">
                    <InputBox
                      className="lg:col-span-3"
                      label="اسم الشاهد"
                      value={item.name}
                      onChange={(value) => updateItem(item.id, { name: value })}
                    />

                    <div className="lg:col-span-2">
                      <InputLabel label="نوع الشاهد" />
                      <select
                        aria-label="نوع الشاهد"
                        value={item.type}
                        onChange={(event) =>
                          updateItem(item.id, { type: event.target.value as EvidenceType })
                        }
                        className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--app-primary)_12%,transparent)]"
                      >
                        {evidenceTypes.map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <InputBox
                      className="lg:col-span-3"
                      label="ماذا يثبت؟"
                      value={item.proves}
                      onChange={(value) => updateItem(item.id, { proves: value })}
                    />

                    <InputBox
                      className="lg:col-span-4"
                      label="الأثر المتوقع / الناتج"
                      value={item.impact}
                      onChange={(value) => updateItem(item.id, { impact: value })}
                    />

                    <InputBox
                      className="lg:col-span-12"
                      label="ملاحظات"
                      value={item.notes}
                      onChange={(value) => updateItem(item.id, { notes: value })}
                    />
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    <CheckOption label="يوجد تاريخ" checked={item.hasDate} onChange={(value) => updateItem(item.id, { hasDate: value })} />
                    <CheckOption label="يوجد مسؤول" checked={item.hasOwner} onChange={(value) => updateItem(item.id, { hasOwner: value })} />
                    <CheckOption label="يوجد أثر/نتيجة" checked={item.hasResult} onChange={(value) => updateItem(item.id, { hasResult: value })} />
                    <CheckOption label="يوجد اعتماد" checked={item.hasSignature} onChange={(value) => updateItem(item.id, { hasSignature: value })} />
                    <CheckOption label="يوجد توثيق بصري" checked={item.hasVisualProof} onChange={(value) => updateItem(item.id, { hasVisualProof: value })} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <ReportCard pageNumber="01" preparedBy={preparedBy} xAccount={xAccount}>
          <ReportTitle icon={<Gauge className="h-7 w-7"  aria-hidden="true" />} title="بطاقة تشخيص الملف" />

          <div className="mt-5 grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)]">
                <InfoRow label="اسم المدرسة" value={schoolName || "غير متوفر"} />
                <InfoRow label="المجال / المؤشر" value={domain || "غير متوفر"} />
                <InfoRow label="الفئة" value={category || "غير متوفر"} />
                <InfoRow label="الفصل الدراسي" value={semester || "غير متوفر"} />
                <InfoRow label="العام الدراسي" value={academicYear || "غير متوفر"} />
                <InfoRow label="عدد الشواهد" value={String(auditRows.length)} />
                <InfoRow
                  label="مستوى الجاهزية"
                  value={normalizeReadiness(analysis.readiness)}
                  danger={normalizeReadiness(analysis.readiness) === "منخفض"}
                />
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-black text-[var(--app-text)]">أقوى 3 شواهد موجودة</h3>
                  <span className={`rounded-full px-4 py-2 text-sm font-black text-[var(--app-text-inverse)] ${readinessClass(analysis.readiness)}`}>
                    {normalizeReadiness(analysis.readiness)} / {analysis.averageScore}%
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {strongestItems.map((item, index) => (
                    <div key={item.id} className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--app-success)] text-sm font-black text-[var(--app-text-inverse)]">
                          {index + 1}
                        </span>
                        <Badge className={strengthClass(item.strength)}>
                          {normalizeStrength(String(item.strength))}
                        </Badge>
                      </div>

                      <ImageBox label="مربع صورة الشاهد" />
                      <h4 className="mt-3 min-h-10 font-black text-[var(--app-text)]">
                        {item.name || "غير متوفر"}
                      </h4>
                      <p className="mt-2 text-xs leading-6 text-[var(--app-text-muted)]">
                        {item.proves || "غير متوفر"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-5">
                <h3 className="mb-3 text-xl font-black text-[var(--app-text)]">ملخص تنفيذي ذكي</h3>
                <p className="text-sm leading-8 text-[var(--app-text)]">{analysis.executiveSummary}</p>
              </div>
            </div>
          </div>
        </ReportCard>

        <ReportCard pageNumber="02" preparedBy={preparedBy} xAccount={xAccount}>
          <ReportTitle icon={<BarChart3 className="h-7 w-7"  aria-hidden="true" />} title="جدول قوة الشواهد" />

          <div className="mt-5 overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--app-text)] text-[var(--app-text-inverse)]">
                    <Th>م</Th>
                    <Th>اسم الشاهد</Th>
                    <Th>نوعه</Th>
                    <Th>ماذا يثبت؟</Th>
                    <Th>درجة قوته</Th>
                    <Th>سبب التقييم</Th>
                    <Th>توصية ذكية</Th>
                    <Th>هل يصلح للرفع؟</Th>
                  </tr>
                </thead>

                <tbody>
                  {auditRows.map((row, index) => (
                    <tr key={row.id} className="border-b border-[var(--app-border)]">
                      <Td>{index + 1}</Td>
                      <Td>{row.name || "غير متوفر"}</Td>
                      <Td>{row.type}</Td>
                      <Td>{row.proves || "غير متوفر"}</Td>
                      <Td>
                        <Badge className={strengthClass(row.strength)}>
                          {normalizeStrength(String(row.strength))}
                        </Badge>
                      </Td>
                      <Td>{row.reason}</Td>
                      <Td>{row.aiAdvice}</Td>
                      <Td>
                        <Badge className={uploadClass(row.uploadStatus)}>
                          {normalizeUploadStatus(String(row.uploadStatus))}
                        </Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ReportCard>

        <ReportCard pageNumber="03" preparedBy={preparedBy} xAccount={xAccount}>
          <ReportTitle icon={<AlertTriangle className="h-7 w-7"  aria-hidden="true" />} title="النواقص والفجوات" />

          <div className="mt-5 grid gap-5 lg:grid-cols-4">
            <GapCard title="الشواهد الناقصة" items={analysis.missingEvidence} />
            <GapCard title="الشواهد الضعيفة" items={analysis.weakEvidence} />
            <GapCard title="توثيق أفضل" items={analysis.betterDocumentation} />
            <GapCard title="بيانات غير واضحة" items={analysis.unclearData} />
          </div>

          <div className="mt-5 rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5">
            <h3 className="mb-4 text-xl font-black text-[var(--app-text)]">أكثر 5 تحسينات عاجلة</h3>
            <ol className="grid gap-3 md:grid-cols-2">
              {analysis.urgentImprovements.slice(0, 5).map((item, index) => (
                <li key={item} className="flex gap-3 rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] p-3 text-sm leading-7 text-[var(--app-text)]">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--app-success)] text-xs font-black text-[var(--app-text-inverse)]">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </ReportCard>

        <ReportCard pageNumber="04" preparedBy={preparedBy} xAccount={xAccount}>
          <ReportTitle icon={<ClipboardCheck className="h-7 w-7"  aria-hidden="true" />} title="خطة إغلاق الفجوات" />

          <div className="mt-5 overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--app-text)] text-[var(--app-text-inverse)]">
                    <Th>م</Th>
                    <Th>ماذا نضيف؟</Th>
                    <Th>من المسؤول؟</Th>
                    <Th>متى ينفذ؟</Th>
                    <Th>كيف نوثق؟</Th>
                    <Th>مؤشر قبول الشاهد</Th>
                  </tr>
                </thead>

                <tbody>
                  {analysis.actionPlan.map((row, index) => (
                    <tr key={row.add} className="border-b border-[var(--app-border)]">
                      <Td>{index + 1}</Td>
                      <Td>{row.add}</Td>
                      <Td>{row.owner}</Td>
                      <Td>{row.date}</Td>
                      <Td>{row.document}</Td>
                      <Td>{row.acceptance}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 rounded-[var(--app-radius-xl)] border border-[color-mix(in_srgb,var(--app-accent)_50%,transparent)] bg-gradient-to-br from-[var(--app-card-soft)] to-white p-6">
            <blockquote className="text-3xl font-black leading-[1.8] text-[var(--app-text)]">
              “الشاهد القوي لا يقول إننا عملنا… بل يثبت أثر ما عملنا.”
            </blockquote>
          </div>
        </ReportCard>
      </main>
    </AppShell>
  );
}

function Title({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-black text-[var(--app-text)]">{title}</h2>
      <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">{description}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
        {icon}
        {label}
      </span>
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="غير متوفر"
        className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--app-primary)_12%,transparent)]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  icon: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
        {icon}
        {label}
      </span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--app-primary)_12%,transparent)]">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function InputLabel({ label }: { label: string }) {
  return <div className="mb-2 text-xs font-black text-[var(--app-text-muted)]">{label}</div>;
}

function InputBox({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <InputLabel label={label} />
      <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-subtle)] focus:border-[var(--app-primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--app-primary)_12%,transparent)]" />
    </div>
  );
}

function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between rounded-[var(--app-radius-lg)] border px-4 py-3 text-sm font-bold transition ${
        checked
          ? "border-[color-mix(in_srgb,var(--app-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]"
          : "border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)]"
      }`}
    >
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--app-primary)]"
      />
    </label>
  );
}

function ReportCard({
  children,
  pageNumber,
  preparedBy,
  xAccount,
}: {
  children: ReactNode;
  pageNumber: string;
  preparedBy: string;
  xAccount: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] print:rounded-none print:shadow-none">
      <div className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-bl-3xl rounded-tr-3xl bg-[var(--app-success)] text-lg font-black text-[var(--app-text-inverse)]">
        {pageNumber}
      </div>

      <div className="mb-5 flex items-center justify-between border-b border-[var(--app-border)] pb-5">
        <div>
          <h2 className="text-2xl font-black text-[var(--app-text)]">مدقق الشواهد الذكي</h2>
          <p className="mt-1 text-sm font-bold text-[var(--app-primary)]">
            منصة المدرسة الذكية · جودة وتميز واعتماد
          </p>
        </div>
      </div>

      {children}

      <div className="mt-6 flex flex-col gap-2 border-t border-[var(--app-border)] pt-4 text-xs font-bold text-[var(--app-text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>إعداد: {preparedBy || "غير متوفر"}</span>
        <span>حساب X: {xAccount || "غير متوفر"}</span>
      </div>
    </section>
  );
}

function ReportTitle({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-lg)] bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]">
        {icon}
      </div>
      <div>
        <h2 className="text-2xl font-black text-[var(--app-text)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          قراءة موضوعية لقوة الملف وجودة التوثيق
        </p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 border-b border-[var(--app-border)] last:border-b-0">
      <div className="bg-[var(--app-text)] px-4 py-3 text-sm font-black text-[var(--app-text-inverse)]">{label}</div>
      <div className={`px-4 py-3 text-sm font-bold ${danger ? "text-[var(--app-danger)]" : "text-[var(--app-text)]"}`}>
        {value}
      </div>
    </div>
  );
}

function ImageBox({ label }: { label: string }) {
  return (
    <div className="flex h-32 flex-col items-center justify-center rounded-[var(--app-radius-lg)] border-2 border-dashed border-[var(--app-border-strong)] bg-[var(--app-card)] text-center text-xs text-[var(--app-text-subtle)]">
      <ImageIcon className="mb-2 h-7 w-7"  aria-hidden="true" />
      <span className="font-bold">{label}</span>
    </div>
  );
}

function GapCard({ title, items }: { title: string; items: string[] }) {
  const cleanItems = items.length ? items : ["غير متوفر"];

  return (
    <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--app-text)]">
        <XCircle className="h-5 w-5 text-[var(--app-primary)]"  aria-hidden="true" />
        {title}
      </h3>

      <ul className="space-y-2">
        {cleanItems.slice(0, 5).map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-7 text-[var(--app-text)]">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--app-success)]" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${className}`}>
      {children}
    </span>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="border border-[color-mix(in_srgb,var(--app-text-inverse)_10%,transparent)] px-4 py-4 text-right text-xs font-black">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return (
    <td className="border border-[var(--app-border)] px-4 py-4 align-top text-sm leading-7 text-[var(--app-text)]">
      {children}
    </td>
  );
}

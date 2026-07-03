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

  if (value === "قوي") return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
  if (value === "متوسط") return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";

  return "border-red-200 bg-red-50 text-red-700";
}

function uploadClass(status: string) {
  const value = normalizeUploadStatus(status);

  if (value === "نعم") return "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]";
  if (value === "يحتاج تحسين") return "border-[#C1B489]/30 bg-[#C1B489]/20 text-[#15445A]";

  return "border-red-200 bg-red-50 text-red-700";
}

function readinessTone(level: string) {
  const value = normalizeReadiness(level);
  if (value === "مرتفع") return "green";
  if (value === "متوسط") return "gold";
  return "red";
}

function readinessClass(level: string) {
  const value = normalizeReadiness(level);
  if (value === "مرتفع") return "bg-[#07A869]";
  if (value === "متوسط") return "bg-[#C1B489]";
  return "bg-red-600";
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
      <main dir="rtl" className="space-y-5 print:bg-white">
        <PageHeader
          variant="hero"
          title="مدقق الشواهد الذكي"
          description="فحص الشواهد المدرسية، قياس قوتها، كشف الفجوات، وبناء خطة إغلاق قبل الرفع أو الزيارة أو التقييم."
          badge="الجودة والتميز"
          icon={<Sparkles size={18} />}
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
            { label: "عدد الشواهد", value: stats.total, icon: <FileText size={20} />, tone: "blue" },
            { label: "مستوى الجاهزية", value: normalizeReadiness(analysis.readiness), icon: <Gauge size={20} />, tone: readinessTone(analysis.readiness) },
            { label: "متوسط القوة", value: `${analysis.averageScore}%`, icon: <BarChart3 size={20} />, tone: analysis.averageScore >= 80 ? "green" : "gold" },
            { label: "الشواهد القوية", value: stats.strong, icon: <CheckCircle2 size={20} />, tone: "green" },
          ]}
          actions={
            <>
              <button
                type="button"
                onClick={runAiAuditor}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Wand2 size={17} />
                تشغيل التحليل الذكي
              </button>

              <button
                type="button"
                onClick={addEvidence}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#07A869] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Plus size={17} />
                شاهد جديد
              </button>

              <button
                type="button"
                onClick={exportPDF}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Printer size={17} />
                PDF
              </button>

              <button
                type="button"
                onClick={exportExcel}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Download size={17} />
                Excel
              </button>

              <button
                type="button"
                onClick={resetAll}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <RefreshCcw size={17} />
                تصفير
              </button>
            </>
          }
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 no-print">
          <ExecutiveCard
            title="عدد الشواهد"
            value={stats.total}
            subtitle="إجمالي الشواهد المدخلة"
            icon={<FileText size={22} />}
            tone="blue"
            progress={stats.total > 0 ? 100 : 0}
          />

          <ExecutiveCard
            title="مستوى الجاهزية"
            value={normalizeReadiness(analysis.readiness)}
            subtitle={`${analysis.averageScore}% متوسط القوة`}
            icon={<Gauge size={22} />}
            tone={readinessTone(analysis.readiness)}
            progress={analysis.averageScore}
          />

          <ExecutiveCard
            title="الشواهد القوية"
            value={stats.strong}
            subtitle="جاهزة نسبيًا للرفع"
            icon={<CheckCircle2 size={22} />}
            tone="green"
            progress={stats.total ? Math.round((stats.strong / stats.total) * 100) : 0}
          />

          <ExecutiveCard
            title="تحتاج تحسين"
            value={stats.medium + stats.weak}
            subtitle="متوسطة أو ضعيفة"
            icon={<AlertTriangle size={22} />}
            tone={stats.medium + stats.weak > 0 ? "gold" : "green"}
            progress={stats.total ? Math.round(((stats.medium + stats.weak) / stats.total) * 100) : 0}
          />
        </section>

        <SummaryCard
          title="ملخص جاهزية ملف الشواهد"
          description="قراءة تنفيذية سريعة لقوة الشواهد وجودة التوثيق قبل الرفع."
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
          <div className="no-print rounded-[28px] border border-[#07A869]/20 bg-[#07A869]/10 p-4 text-sm font-bold leading-7 text-[#15445A]">
            تم تشغيل التحليل الذكي وفق سياسة مدقق الشواهد: لا مجاملة، تقييم موضوعي،
            فصل بين الشاهد القوي والشكلي، وربط كل شاهد بالأثر المتوقع.
          </div>
        )}

        <section className="no-print rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
          <Title
            title="بيانات الملف"
            description="إذا لم تتوفر بعض البيانات ستظهر في التقرير باسم: غير متوفر."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="اسم المدرسة" value={schoolName} onChange={setSchoolName} icon={<School className="h-4 w-4" />} />
            <SelectField label="المجال أو المؤشر" value={domain} onChange={setDomain} options={domains} icon={<Target className="h-4 w-4" />} />
            <SelectField label="الفئة" value={category} onChange={setCategory} options={categories} icon={<ShieldCheck className="h-4 w-4" />} />
            <Field label="الفصل الدراسي" value={semester} onChange={setSemester} icon={<CalendarDays className="h-4 w-4" />} />
            <Field label="العام الدراسي" value={academicYear} onChange={setAcademicYear} icon={<CalendarDays className="h-4 w-4" />} />
            <Field label="اسم المعد" value={preparedBy} onChange={setPreparedBy} icon={<UserRound className="h-4 w-4" />} />
            <Field label="مدير المدرسة" value={principal} onChange={setPrincipal} icon={<ShieldCheck className="h-4 w-4" />} />
            <Field label="حساب X" value={xAccount} onChange={setXAccount} icon={<FileText className="h-4 w-4" />} />
          </div>
        </section>

        <section className="no-print rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
          <Title
            title="إدخال الشواهد"
            description="أدخل بيانات الشاهد. التحليل الذكي يقيم القوة حسب وضوح الشاهد والأثر والتوثيق."
          />

          <div className="mt-5 space-y-4">
            {items.map((item, index) => {
              const row = scoreEvidence(item);

              return (
                <div key={item.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#15445A] text-sm font-black text-white">
                        {index + 1}
                      </div>

                      <div>
                        <div className="font-black text-[#15445A]">شاهد رقم {index + 1}</div>
                        <div className="text-xs text-slate-500">الدرجة الحالية: {row.score}%</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={strengthClass(row.strength)}>
                        {normalizeStrength(String(row.strength))}
                      </Badge>

                      <button
                        type="button"
                        onClick={() => removeEvidence(item.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </button>
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
                        value={item.type}
                        onChange={(event) =>
                          updateItem(item.id, { type: event.target.value as EvidenceType })
                        }
                        className="input"
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
          <ReportTitle icon={<Gauge className="h-7 w-7" />} title="بطاقة تشخيص الملف" />

          <div className="mt-5 grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="overflow-hidden rounded-[24px] border border-slate-200">
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
              <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-black text-[#15445A]">أقوى 3 شواهد موجودة</h3>
                  <span className={`rounded-full px-4 py-2 text-sm font-black text-white ${readinessClass(analysis.readiness)}`}>
                    {normalizeReadiness(analysis.readiness)} / {analysis.averageScore}%
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {strongestItems.map((item, index) => (
                    <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#07A869] text-sm font-black text-white">
                          {index + 1}
                        </span>
                        <Badge className={strengthClass(item.strength)}>
                          {normalizeStrength(String(item.strength))}
                        </Badge>
                      </div>

                      <ImageBox label="مربع صورة الشاهد" />
                      <h4 className="mt-3 min-h-10 font-black text-[#15445A]">
                        {item.name || "غير متوفر"}
                      </h4>
                      <p className="mt-2 text-xs leading-6 text-slate-600">
                        {item.proves || "غير متوفر"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-slate-200 bg-[#F8FBFA] p-5">
                <h3 className="mb-3 text-xl font-black text-[#15445A]">ملخص تنفيذي ذكي</h3>
                <p className="text-sm leading-8 text-slate-700">{analysis.executiveSummary}</p>
              </div>
            </div>
          </div>
        </ReportCard>

        <ReportCard pageNumber="02" preparedBy={preparedBy} xAccount={xAccount}>
          <ReportTitle icon={<BarChart3 className="h-7 w-7" />} title="جدول قوة الشواهد" />

          <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#15445A] text-white">
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
                    <tr key={row.id} className="border-b border-slate-200">
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
          <ReportTitle icon={<AlertTriangle className="h-7 w-7" />} title="النواقص والفجوات" />

          <div className="mt-5 grid gap-5 lg:grid-cols-4">
            <GapCard title="الشواهد الناقصة" items={analysis.missingEvidence} />
            <GapCard title="الشواهد الضعيفة" items={analysis.weakEvidence} />
            <GapCard title="توثيق أفضل" items={analysis.betterDocumentation} />
            <GapCard title="بيانات غير واضحة" items={analysis.unclearData} />
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-xl font-black text-[#15445A]">أكثر 5 تحسينات عاجلة</h3>
            <ol className="grid gap-3 md:grid-cols-2">
              {analysis.urgentImprovements.slice(0, 5).map((item, index) => (
                <li key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm leading-7 text-slate-700">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#07A869] text-xs font-black text-white">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </ReportCard>

        <ReportCard pageNumber="04" preparedBy={preparedBy} xAccount={xAccount}>
          <ReportTitle icon={<ClipboardCheck className="h-7 w-7" />} title="خطة إغلاق الفجوات" />

          <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#15445A] text-white">
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
                    <tr key={row.add} className="border-b border-slate-200">
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

          <div className="mt-5 rounded-[24px] border border-[#C1B489]/50 bg-gradient-to-br from-[#fffdf6] to-white p-6">
            <blockquote className="text-3xl font-black leading-[1.8] text-[#15445A]">
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
      <h2 className="text-xl font-black text-[#15445A]">{title}</h2>
      <p className="mt-1 text-sm leading-7 text-slate-500">{description}</p>
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
      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-[#15445A]">
        {icon}
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="غير متوفر"
        className="input"
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
      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-[#15445A]">
        {icon}
        {label}
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="input">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function InputLabel({ label }: { label: string }) {
  return <div className="mb-2 text-xs font-black text-slate-600">{label}</div>;
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
      <input value={value} onChange={(event) => onChange(event.target.value)} className="input" />
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
      className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition ${
        checked
          ? "border-[#07A869]/20 bg-[#07A869]/10 text-[#07A869]"
          : "border-slate-200 bg-white text-slate-500"
      }`}
    >
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#07A869]"
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
    <section className="relative overflow-hidden rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm print:rounded-none print:shadow-none">
      <div className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-bl-3xl rounded-tr-3xl bg-[#07A869] text-lg font-black text-white">
        {pageNumber}
      </div>

      <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-black text-[#15445A]">مدقق الشواهد الذكي</h2>
          <p className="mt-1 text-sm font-bold text-[#0DA9A6]">
            منصة المدرسة الذكية · جودة وتميز واعتماد
          </p>
        </div>
      </div>

      {children}

      <div className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>إعداد: {preparedBy || "غير متوفر"}</span>
        <span>حساب X: {xAccount || "غير متوفر"}</span>
      </div>
    </section>
  );
}

function ReportTitle({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
        {icon}
      </div>
      <div>
        <h2 className="text-2xl font-black text-[#15445A]">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">
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
    <div className="grid grid-cols-2 border-b border-slate-200 last:border-b-0">
      <div className="bg-[#15445A] px-4 py-3 text-sm font-black text-white">{label}</div>
      <div className={`px-4 py-3 text-sm font-bold ${danger ? "text-red-600" : "text-slate-700"}`}>
        {value}
      </div>
    </div>
  );
}

function ImageBox({ label }: { label: string }) {
  return (
    <div className="flex h-32 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white text-center text-xs text-slate-400">
      <ImageIcon className="mb-2 h-7 w-7" />
      <span className="font-bold">{label}</span>
    </div>
  );
}

function GapCard({ title, items }: { title: string; items: string[] }) {
  const cleanItems = items.length ? items : ["غير متوفر"];

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[#15445A]">
        <XCircle className="h-5 w-5 text-[#0DA9A6]" />
        {title}
      </h3>

      <ul className="space-y-2">
        {cleanItems.slice(0, 5).map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-7 text-slate-700">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#07A869]" />
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
  return <th className="border border-white/10 px-4 py-4 text-right text-xs font-black">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return (
    <td className="border border-slate-200 px-4 py-4 align-top text-sm leading-7 text-slate-700">
      {children}
    </td>
  );
}

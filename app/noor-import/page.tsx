"use client";

import { ChangeEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  MessageSquareWarning,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { supabase } from "@/lib/supabase";

type SectionId = "students" | "attendance" | "grades" | "behavior" | "reports" | "ai";

type NoorRow = {
  name: string;
  className: string;
  attendance: number;
  grade: number;
  behaviorNote: string;
  subject: string;
  teacher: string;
};

type ImportPreviewRow = Record<string, unknown>;

type Toast = {
  type: "success" | "error";
  message: string;
};

const importSections: {
  id: SectionId;
  title: string;
  desc: string;
  icon: typeof Users;
}[] = [
  {
    id: "students",
    title: "استيراد الطلاب",
    desc: "الأسماء والفصول والبيانات الأساسية.",
    icon: Users,
  },
  {
    id: "attendance",
    title: "تحليل الحضور",
    desc: "الغياب والتأخر والانضباط.",
    icon: ClipboardCheck,
  },
  {
    id: "grades",
    title: "تحليل الدرجات",
    desc: "المتعثرون والمتميزون.",
    icon: GraduationCap,
  },
  {
    id: "behavior",
    title: "تحليل السلوك",
    desc: "الملاحظات والمتابعة.",
    icon: MessageSquareWarning,
  },
  {
    id: "reports",
    title: "التقارير",
    desc: "تقارير PDF وExcel.",
    icon: FileText,
  },
  {
    id: "ai",
    title: "تحليل AI",
    desc: "قرارات وتوصيات ذكية.",
    icon: Brain,
  },
];

function getText(row: ImportPreviewRow, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return fallback;
}

function getNumber(row: ImportPreviewRow, keys: string[], fallback = 0) {
  for (const key of keys) {
    const raw = row[key];
    const value = Number(String(raw ?? "").replace("%", "").replace(",", "."));
    if (Number.isFinite(value)) return value;
  }

  return fallback;
}

function getStatus(row: NoorRow) {
  const risk = row.attendance < 75 || row.grade < 60;
  const excellent = row.attendance >= 95 && row.grade >= 90;

  if (risk) return "يحتاج دعم";
  if (excellent) return "متميز";
  return "مستقر";
}

function getRecommendation(row: NoorRow) {
  const risk = row.attendance < 75 || row.grade < 60;
  const excellent = row.attendance >= 95 && row.grade >= 90;

  if (risk) return "خطة متابعة + تواصل مع ولي الأمر";
  if (excellent) return "تكريم وتحفيز";
  return "متابعة دورية";
}

export default function NoorImportPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("students");
  const [rows, setRows] = useState<NoorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setFileName(file.name);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<ImportPreviewRow>(sheet, {
        defval: "",
      });

      const parsedRows: NoorRow[] = json.map((row) => ({
        name: getText(
          row,
          ["اسم الطالب", "الطالب", "الاسم", "student_name", "name", "Name"],
          "غير معروف",
        ),
        className: getText(
          row,
          ["الفصل", "الصف", "الشعبة", "class_name", "class", "Class"],
          "غير محدد",
        ),
        attendance: getNumber(
          row,
          ["نسبة الحضور", "الحضور", "حضور", "attendance", "Attendance"],
          0,
        ),
        grade: getNumber(
          row,
          ["المعدل", "الدرجة", "النسبة", "grade", "Grade"],
          0,
        ),
        behaviorNote: getText(
          row,
          ["السلوك", "الملاحظات", "ملاحظة", "behavior", "Behavior"],
          "لا توجد ملاحظات",
        ),
        subject: getText(
          row,
          ["المادة", "اسم المادة", "subject", "Subject"],
          "غير محدد",
        ),
        teacher: getText(
          row,
          ["المعلم", "اسم المعلم", "teacher", "Teacher"],
          "غير محدد",
        ),
      }));

      setRows(parsedRows);

      const rowsToInsert = parsedRows.map((row) => ({
        file_name: file.name,
        import_type: activeSection,
        student_name: row.name,
        class_name: row.className,
        subject_name: row.subject,
        teacher_name: row.teacher,
        attendance: row.attendance,
        grade: row.grade,
        behavior_note: row.behaviorNote,
        status: getStatus(row),
        recommendation: getRecommendation(row),
      }));

      if (rowsToInsert.length > 0) {
        const { error } = await supabase.from("noor_imports").insert(rowsToInsert);

        if (error) {
          console.error(error);
          showToast("error", "تم تحليل الملف، لكن حدث خطأ أثناء الحفظ في Supabase.");
        } else {
          showToast("success", "تم رفع وتحليل وحفظ ملف نور بنجاح.");
        }
      } else {
        showToast("error", "لم يتم العثور على صفوف قابلة للتحليل داخل الملف.");
      }
    } catch (error) {
      console.error(error);
      showToast("error", "حدث خطأ أثناء معالجة ملف نور.");
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.className.toLowerCase().includes(q) ||
        row.subject.toLowerCase().includes(q) ||
        row.teacher.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const risk = rows.filter((row) => row.attendance < 75 || row.grade < 60);
    const excellent = rows.filter((row) => row.attendance >= 95 && row.grade >= 90);

    const attendanceAverage =
      rows.length > 0
        ? Math.round(rows.reduce((sum, row) => sum + row.attendance, 0) / rows.length)
        : 0;

    const gradeAverage =
      rows.length > 0
        ? Math.round(rows.reduce((sum, row) => sum + row.grade, 0) / rows.length)
        : 0;

    return {
      total: rows.length,
      risk: risk.length,
      excellent: excellent.length,
      stable: Math.max(rows.length - risk.length - excellent.length, 0),
      attendanceAverage,
      gradeAverage,
    };
  }, [rows]);

  const classAnalysis = useMemo(() => {
    const groups: Record<string, NoorRow[]> = {};

    rows.forEach((row) => {
      if (!groups[row.className]) groups[row.className] = [];
      groups[row.className].push(row);
    });

    return Object.entries(groups).map(([className, items]) => {
      const attendanceAverage = Math.round(
        items.reduce((sum, item) => sum + item.attendance, 0) / items.length,
      );

      const gradeAverage = Math.round(
        items.reduce((sum, item) => sum + item.grade, 0) / items.length,
      );

      const riskCount = items.filter(
        (item) => item.attendance < 75 || item.grade < 60,
      ).length;

      return {
        className,
        total: items.length,
        attendanceAverage,
        gradeAverage,
        riskCount,
      };
    });
  }, [rows]);

  const aiInsights = useMemo(
    () => [
      stats.risk > 0
        ? `يوجد ${stats.risk} طالب يحتاجون متابعة وخطة دعم.`
        : "لا توجد حالات تعثر واضحة في الملف الحالي.",
      stats.attendanceAverage < 80
        ? "متوسط الحضور منخفض ويحتاج خطة انضباط ومتابعة."
        : "متوسط الحضور جيد في الملف الحالي.",
      stats.gradeAverage < 70
        ? "متوسط الدرجات يحتاج خطة علاجية للمواد الأساسية."
        : "متوسط التحصيل الدراسي مطمئن.",
      stats.excellent > 0
        ? `يوجد ${stats.excellent} طالب متميز يستحقون التكريم.`
        : "لا توجد حالات تميز مرتفعة حسب المعايير الحالية.",
    ],
    [stats],
  );

  function exportCSV() {
    const data = [
      [
        "الطالب",
        "الفصل",
        "المادة",
        "المعلم",
        "الحضور",
        "المعدل",
        "الملاحظات",
        "الحالة",
        "التوصية",
      ],
      ...filteredRows.map((row) => [
        row.name,
        row.className,
        row.subject,
        row.teacher,
        `${row.attendance}%`,
        `${row.grade}%`,
        row.behaviorNote,
        getStatus(row),
        getRecommendation(row),
      ]),
    ];

    const csv = data.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `noor-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function resetData() {
    setRows([]);
    setFileName("");
    setSearch("");
    showToast("success", "تمت إعادة تعيين بيانات التحليل.");
  }

  return (
    <AppShell>
      <PageContainer size="wide" className="space-y-6 pb-10">
        <Breadcrumb />

        {toast && <ToastBox toast={toast} />}

        <PageHeader
          variant="hero"
          title="مركز استيراد وتحليل ملفات نور"
          description="ارفع ملفات Excel الصادرة من نظام نور لتحليل الطلاب والحضور والدرجات والسلوك، واستخراج مؤشرات وتوصيات إدارية جاهزة."
          badge="مساعد ذكي لنظام نور"
          icon={<Brain size={18} />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "استيراد نور" },
          ]}
          stats={[
            { label: "السجلات", value: stats.total, icon: <Users size={20} />, tone: "blue" },
            { label: "متوسط الحضور", value: `${stats.attendanceAverage}%`, icon: <ClipboardCheck size={20} />, tone: stats.attendanceAverage >= 80 ? "green" : "gold" },
            { label: "متوسط الدرجات", value: `${stats.gradeAverage}%`, icon: <BarChart3 size={20} />, tone: stats.gradeAverage >= 70 ? "green" : "gold" },
            { label: "يحتاجون دعم", value: stats.risk, icon: <AlertTriangle size={20} />, tone: stats.risk > 0 ? "red" : "green" },
          ]}
          actions={
            <>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <FileText size={17} />
                PDF
              </button>

              <button
                type="button"
                onClick={exportCSV}
                disabled={rows.length === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
              >
                <Download size={17} />
                Excel CSV
              </button>

              <button
                type="button"
                onClick={resetData}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <RefreshCw size={17} />
                إعادة
              </button>
            </>
          }
        />

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6 print:hidden">
          {importSections.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={[
                  "rounded-[24px] border p-5 text-right shadow-sm transition hover:-translate-y-1 hover:shadow-md",
                  active
                    ? "border-[#0DA9A6]/30 bg-[#15445A] text-white"
                    : "border-slate-100 bg-white text-[#15445A] hover:border-[#0DA9A6]/30",
                ].join(" ")}
              >
                <div
                  className={[
                    "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl",
                    active ? "bg-[#C1B489] text-[#15445A]" : "bg-[#0DA9A6]/10 text-[#0DA9A6]",
                  ].join(" ")}
                >
                  <Icon size={22} />
                </div>

                <h3 className="text-base font-black">{section.title}</h3>
                <p className={["mt-2 text-xs leading-6", active ? "text-white/75" : "text-slate-500"].join(" ")}>
                  {section.desc}
                </p>
              </button>
            );
          })}
        </section>

        <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm print:hidden">
          <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
              <FileSpreadsheet size={36} />
            </div>

            <h2 className="text-2xl font-black text-[#15445A]">
              {importSections.find((item) => item.id === activeSection)?.title}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
              اختر ملف Excel صادر من نظام نور. يفضل أن يحتوي على أعمدة مثل:
              اسم الطالب، الفصل، نسبة الحضور، المعدل، المادة، المعلم، والملاحظات.
            </p>

            <label className="mt-6 cursor-pointer rounded-2xl bg-[#15445A] px-6 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0DA9A6]">
              <div className="flex items-center gap-2">
                <Upload size={20} />
                اختيار ملف Excel
              </div>

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {fileName && (
              <p className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-600">
                الملف المحدد: {fileName}
              </p>
            )}
          </div>
        </section>

        {loading && <LoadingBox />}

        {!loading && rows.length > 0 && (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <ExecutiveCard title="عدد السجلات" value={stats.total} icon={<Users size={22} />} subtitle="إجمالي الصفوف المحللة" tone="blue" progress={stats.total > 0 ? 100 : 0} />
              <ExecutiveCard title="متوسط الحضور" value={`${stats.attendanceAverage}%`} icon={<ClipboardCheck size={22} />} subtitle="مؤشر الالتزام" tone={stats.attendanceAverage >= 80 ? "green" : "gold"} progress={stats.attendanceAverage} />
              <ExecutiveCard title="متوسط الدرجات" value={`${stats.gradeAverage}%`} icon={<BarChart3 size={22} />} subtitle="مؤشر التحصيل" tone={stats.gradeAverage >= 70 ? "green" : "gold"} progress={stats.gradeAverage} />
              <ExecutiveCard title="متعثرون" value={stats.risk} icon={<AlertTriangle size={22} />} subtitle="يحتاجون دعمًا" tone={stats.risk > 0 ? "red" : "green"} progress={stats.total ? Math.round((stats.risk / stats.total) * 100) : 0} />
              <ExecutiveCard title="مستقرون" value={stats.stable} icon={<CheckCircle2 size={22} />} subtitle="متابعة دورية" tone="teal" progress={stats.total ? Math.round((stats.stable / stats.total) * 100) : 0} />
              <ExecutiveCard title="متميزون" value={stats.excellent} icon={<Sparkles size={22} />} subtitle="يستحقون التكريم" tone="gold" progress={stats.total ? Math.round((stats.excellent / stats.total) * 100) : 0} />
            </section>

            <SummaryCard
              title="ملخص تحليل ملف نور"
              description="قراءة تنفيذية سريعة لأهم مؤشرات الملف بعد التحليل."
              tone={stats.risk > 0 ? "gold" : "green"}
              items={[
                { label: "إجمالي السجلات", value: stats.total },
                { label: "متوسط الحضور", value: `${stats.attendanceAverage}%` },
                { label: "متوسط الدرجات", value: `${stats.gradeAverage}%` },
                { label: "يحتاجون دعم", value: stats.risk },
                { label: "مستقرون", value: stats.stable },
                { label: "متميزون", value: stats.excellent },
              ]}
              footer="هذه الأداة مستقلة لتحليل ملفات نور ولا تعدل سجلات الطلاب الرسمية إلا في جدول noor_imports."
            />

            <section className="rounded-[28px] bg-gradient-to-l from-[#15445A] via-[#15445A] to-[#0DA9A6] p-6 text-white shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Brain className="text-[#C1B489]" />
                <h2 className="text-2xl font-black">تحليل AI للملف</h2>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {aiInsights.map((item) => (
                  <div key={item} className="rounded-2xl bg-white/10 p-4 text-sm leading-7">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-black text-[#15445A]">تحليل الفصول</h2>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-right text-sm">
                  <thead className="bg-[#15445A] text-white">
                    <tr>
                      <th className="p-4">الفصل</th>
                      <th className="p-4">عدد الطلاب</th>
                      <th className="p-4">متوسط الحضور</th>
                      <th className="p-4">متوسط الدرجات</th>
                      <th className="p-4">متعثرون</th>
                      <th className="p-4">التوصية</th>
                    </tr>
                  </thead>

                  <tbody>
                    {classAnalysis.map((item) => (
                      <tr key={item.className} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                        <td className="p-4 font-bold text-[#15445A]">{item.className}</td>
                        <td className="p-4">{item.total}</td>
                        <td className="p-4">{item.attendanceAverage}%</td>
                        <td className="p-4">{item.gradeAverage}%</td>
                        <td className="p-4">{item.riskCount}</td>
                        <td className="p-4">
                          {item.riskCount > 0 ? "متابعة الفصل وخطة علاجية" : "وضع مستقر"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
              <PageToolbar
                search={{
                  value: search,
                  onChange: setSearch,
                  placeholder: "بحث باسم الطالب أو الفصل أو المادة أو المعلم...",
                }}
                onExportExcel={exportCSV}
                onPrint={() => window.print()}
              />

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-right text-sm">
                  <thead className="bg-[#15445A] text-white">
                    <tr>
                      <th className="p-4">الطالب</th>
                      <th className="p-4">الفصل</th>
                      <th className="p-4">المادة</th>
                      <th className="p-4">المعلم</th>
                      <th className="p-4">الحضور</th>
                      <th className="p-4">المعدل</th>
                      <th className="p-4">السلوك/ملاحظات</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4">التوصية</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((row, index) => {
                      const risk = row.attendance < 75 || row.grade < 60;
                      const excellent = row.attendance >= 95 && row.grade >= 90;

                      return (
                        <tr key={`${row.name}-${index}`} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                          <td className="p-4 font-bold text-[#15445A]">{row.name}</td>
                          <td className="p-4">{row.className}</td>
                          <td className="p-4">{row.subject}</td>
                          <td className="p-4">{row.teacher}</td>
                          <td className="p-4">{row.attendance}%</td>
                          <td className="p-4">{row.grade}%</td>
                          <td className="p-4">{row.behaviorNote}</td>
                          <td className="p-4">
                            <StatusBadge risk={risk} excellent={excellent} />
                          </td>
                          <td className="p-4">{getRecommendation(row)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}

function StatusBadge({ risk, excellent }: { risk: boolean; excellent: boolean }) {
  if (risk) {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
        يحتاج دعم
      </span>
    );
  }

  if (excellent) {
    return (
      <span className="rounded-full bg-[#07A869]/10 px-3 py-1 text-xs font-bold text-[#07A869]">
        متميز
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      مستقر
    </span>
  );
}

function LoadingBox() {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
      <p className="font-bold">جاري تحليل وحفظ ملف نور...</p>
    </div>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  const isSuccess = toast.type === "success";

  return (
    <div
      className={`fixed left-5 top-5 z-50 flex max-w-md items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl print:hidden ${
        isSuccess ? "bg-[#07A869]" : "bg-red-600"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
        {isSuccess ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
      </span>
      <span>{toast.message}</span>
    </div>
  );
}

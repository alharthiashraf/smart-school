"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCcw,
  Trophy,
  Upload,
  UsersRound,
  XCircle,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import Section from "@/components/ui/page/Section";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import KpiCard from "@/components/ui/cards/KpiCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

type RawRow = string[];

type DetectedConfig = {
  nameColumnIndex: number;
  scoreColumnIndex: number;
  detectedStudentsCount: number;
};

type AnalysisRow = {
  rowNumber: number;
  studentName: string;
  score: number;
  maxScore: number;
  percentage: number;
  gradeLabel: string;
  statusLabel: string;
  rank: number;
  differenceFromAverage: number;
  differenceFromTop: number;
};

type ScoreCell = {
  score: number;
};

type ChartTone = "green" | "blue" | "slate" | "gold" | "red";

const gradeLabels = [
  { label: "ممتاز", min: 90, tone: "green" as ChartTone },
  { label: "جيد جدًا", min: 80, tone: "blue" as ChartTone },
  { label: "جيد", min: 70, tone: "slate" as ChartTone },
  { label: "مقبول", min: 60, tone: "gold" as ChartTone },
  { label: "يحتاج متابعة", min: 0, tone: "red" as ChartTone },
];

const scoreOptions = [10, 20, 40, 60, 100];

const blockedNameWords = [
  "وزارة",
  "التعليم",
  "ادارة",
  "إدارة",
  "العامة",
  "محافظة",
  "جدة",
  "مدرسة",
  "الثانوية",
  "المتوسطة",
  "الابتدائية",
  "مسارات",
  "نظام",
  "نور",
  "مدرستي",
  "بلس",
  "تقرير",
  "تحليل",
  "النتائج",
  "المادة",
  "المقرر",
  "الصف",
  "الفصل",
  "الفترة",
  "المعلم",
  "المعلمة",
  "عدد",
  "متوسط",
  "المتوسط",
  "النسبة",
  "التقدير",
  "الدرجة",
  "الدرجه",
  "المجموع",
  "اسم الطالب",
  "الهوية",
  "الهويه",
  "السجل",
  "الحالة",
  "ممتاز",
  "جيد",
  "مقبول",
  "ناجح",
];

function cellText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeArabic(value: string) {
  return String(value || "")
    .trim()
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function hasArabic(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

function hasDigit(value: string) {
  return /\d/.test(value);
}

function looksLikeNationalId(value: string) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits.length === 10;
}

function valueLooksBlocked(value: string) {
  const normalized = normalizeArabic(value);

  return blockedNameWords.some((word) =>
    normalized.includes(normalizeArabic(word)),
  );
}

function looksLikeStudentName(value: string) {
  const text = cellText(value);
  const normalized = normalizeArabic(text);

  if (!normalized) return false;
  if (!hasArabic(text)) return false;
  if (hasDigit(text)) return false;
  if (valueLooksBlocked(text)) return false;

  const words = normalized
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);

  if (words.length < 2) return false;
  if (words.length > 8) return false;

  return true;
}

function parseScoreCell(value: unknown): ScoreCell {
  const text = cellText(value);

  if (!text) return { score: NaN };
  if (looksLikeNationalId(text)) return { score: NaN };

  const normalized = text.replace(",", ".");
  const numbers = normalized.match(/\d+(\.\d+)?/g)?.map(Number) || [];

  if (!numbers.length) return { score: NaN };

  const score = numbers[0];

  if (!Number.isFinite(score)) return { score: NaN };
  if (score < 0 || score > 100) return { score: NaN };

  return { score };
}

function getGradeLabel(percentage: number) {
  return gradeLabels.find((item) => percentage >= item.min)?.label || "غير محدد";
}

function getStatusLabel(percentage: number) {
  return percentage >= 60 ? "ناجح" : "يحتاج متابعة";
}

function readSheetRows(worksheet: XLSX.WorkSheet) {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  return rows
    .map((row) => row.map((cell) => cellText(cell)))
    .filter((row) => row.some((cell) => cellText(cell) !== ""));
}

function getMaxColumns(rows: RawRow[]) {
  return Math.max(1, ...rows.map((row) => row.length));
}

function getColumnTextAbove(rows: RawRow[], colIndex: number, limit = 80) {
  return normalizeArabic(
    rows
      .slice(0, limit)
      .map((row) => row[colIndex] || "")
      .join(" "),
  );
}

function isSerialColumn(values: number[]) {
  if (values.length < 5) return false;

  const firstTen = values.slice(0, 10);
  let sequential = 0;

  firstTen.forEach((value, index) => {
    if (value === index + 1) sequential += 1;
  });

  return sequential >= Math.min(7, firstTen.length);
}

function detectNameColumn(rows: RawRow[]) {
  const maxColumns = getMaxColumns(rows);

  let bestColumn = 0;
  let bestScore = -1;

  for (let col = 0; col < maxColumns; col++) {
    const validNamesCount = rows.filter((row) =>
      looksLikeStudentName(row[col] || ""),
    ).length;

    const headerText = getColumnTextAbove(rows, col);

    let score = validNamesCount * 10;

    if (headerText.includes("اسم")) score += 40;
    if (headerText.includes("طالب")) score += 40;

    if (score > bestScore) {
      bestScore = score;
      bestColumn = col;
    }
  }

  return bestColumn;
}

function detectScoreColumn(rows: RawRow[], nameColumnIndex: number) {
  const maxColumns = getMaxColumns(rows);
  const studentRows = rows.filter((row) =>
    looksLikeStudentName(row[nameColumnIndex] || ""),
  );

  let bestColumn = 0;
  let bestScore = -1;

  for (let col = 0; col < maxColumns; col++) {
    if (col === nameColumnIndex) continue;

    const headerText = getColumnTextAbove(rows, col);

    if (
      headerText.includes("اسم") ||
      headerText.includes("طالب") ||
      headerText.includes("هويه") ||
      headerText.includes("هوية") ||
      headerText.includes("سجل") ||
      headerText.includes("رقم الهوية") ||
      headerText.includes("السجل") ||
      headerText.includes("تقدير") ||
      headerText.includes("الحالة") ||
      headerText.includes("الحاله")
    ) {
      continue;
    }

    const parsedScores = studentRows
      .map((row) => parseScoreCell(row[col]))
      .filter((item) => Number.isFinite(item.score));

    const scoreValues = parsedScores.map((item) => item.score);

    if (!scoreValues.length) continue;

    let score = parsedScores.length * 10;

    if (headerText.includes("مجموع")) score += 80;
    if (headerText.includes("درجة") || headerText.includes("درجه")) score += 70;
    if (headerText.includes("الاختبار")) score += 45;
    if (headerText.includes("اختبار")) score += 40;
    if (headerText.includes("فترة") || headerText.includes("فتره")) score += 30;
    if (headerText.includes("مكتسب")) score += 25;
    if (headerText.includes("كلي")) score += 20;

    if (
      headerText.includes("ترتيب") ||
      headerText.includes("مسلسل") ||
      headerText.includes("تسلسل") ||
      headerText === "م"
    ) {
      score -= 100;
    }

    if (isSerialColumn(scoreValues)) {
      score -= 80;
    }

    if (score > bestScore) {
      bestScore = score;
      bestColumn = col;
    }
  }

  return bestColumn;
}

function detectConfig(rows: RawRow[]): DetectedConfig {
  const nameColumnIndex = detectNameColumn(rows);
  const scoreColumnIndex = detectScoreColumn(rows, nameColumnIndex);

  const detectedStudentsCount = rows.filter((row) => {
    const name = row[nameColumnIndex] || "";
    const parsed = parseScoreCell(row[scoreColumnIndex]);

    return looksLikeStudentName(name) && Number.isFinite(parsed.score);
  }).length;

  return {
    nameColumnIndex,
    scoreColumnIndex,
    detectedStudentsCount,
  };
}

function enrichRows(rows: AnalysisRow[]) {
  const sorted = [...rows].sort((a, b) => b.percentage - a.percentage);
  const average =
    sorted.length > 0
      ? sorted.reduce((sum, row) => sum + row.percentage, 0) / sorted.length
      : 0;
  const top = sorted[0]?.percentage ?? 0;

  const rankMap = new Map<string, number>();
  sorted.forEach((row, index) => {
    rankMap.set(`${row.rowNumber}-${row.studentName}`, index + 1);
  });

  return rows.map((row) => ({
    ...row,
    rank: rankMap.get(`${row.rowNumber}-${row.studentName}`) ?? 0,
    differenceFromAverage: Math.round((row.percentage - average) * 100) / 100,
    differenceFromTop: Math.round((top - row.percentage) * 100) / 100,
  }));
}

function analyzeRows(
  rows: RawRow[],
  config: DetectedConfig,
  selectedMaxScore: number,
): AnalysisRow[] {
  const { nameColumnIndex, scoreColumnIndex } = config;

  const baseRows = rows
    .map((row, index) => {
      const studentName = cellText(row[nameColumnIndex]);
      const parsed = parseScoreCell(row[scoreColumnIndex]);

      if (!looksLikeStudentName(studentName)) return null;
      if (!Number.isFinite(parsed.score)) return null;

      const score = Math.min(Math.max(parsed.score, 0), selectedMaxScore);
      const percentage = Math.round((score / selectedMaxScore) * 100);

      return {
        rowNumber: index + 1,
        studentName,
        score,
        maxScore: selectedMaxScore,
        percentage,
        gradeLabel: getGradeLabel(percentage),
        statusLabel: getStatusLabel(percentage),
        rank: 0,
        differenceFromAverage: 0,
        differenceFromTop: 0,
      } satisfies AnalysisRow;
    })
    .filter((row): row is AnalysisRow => Boolean(row));

  return enrichRows(baseRows);
}

function median(values: number[]) {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[middle - 1] + sorted[middle]) / 2) * 100) / 100;
  }

  return sorted[middle];
}

function standardDeviation(values: number[]) {
  if (!values.length) return 0;

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;

  return Math.round(Math.sqrt(variance) * 100) / 100;
}

export default function GradesAnalyzerPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState("");
  const [sheetRows, setSheetRows] = useState<RawRow[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [workbookBuffer, setWorkbookBuffer] = useState<ArrayBuffer | null>(null);
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [config, setConfig] = useState<DetectedConfig | null>(null);

  const [selectedMaxScore, setSelectedMaxScore] = useState<number>(20);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const stats = useMemo(() => {
    const total = rows.length;
    const percentages = rows.map((row) => row.percentage);
    const scores = rows.map((row) => row.score);

    const average =
      percentages.length > 0
        ? Math.round(
            percentages.reduce((sum, value) => sum + value, 0) /
              percentages.length,
          )
        : 0;

    const scoreAverage =
      scores.length > 0
        ? Number(
            (
              scores.reduce((sum, value) => sum + value, 0) / scores.length
            ).toFixed(2),
          )
        : 0;

    const passed = rows.filter((row) => row.percentage >= 60).length;
    const failed = rows.filter((row) => row.percentage < 60).length;

    return {
      total,
      average,
      scoreAverage,
      median: median(percentages),
      standardDeviation: standardDeviation(percentages),
      highest: percentages.length ? Math.max(...percentages) : 0,
      lowest: percentages.length ? Math.min(...percentages) : 0,
      excellent: rows.filter((row) => row.percentage >= 90).length,
      veryGood: rows.filter((row) => row.percentage >= 80 && row.percentage < 90).length,
      good: rows.filter((row) => row.percentage >= 70 && row.percentage < 80).length,
      acceptable: rows.filter((row) => row.percentage >= 60 && row.percentage < 70).length,
      weak: rows.filter((row) => row.percentage < 60).length,
      passed,
      failed,
      passRate: total ? Math.round((passed / total) * 100) : 0,
      failRate: total ? Math.round((failed / total) * 100) : 0,
      qualityLabel:
        total === 0
          ? "لا توجد بيانات"
          : average >= 85 && passed / total >= 0.9
            ? "ممتاز"
            : average >= 70 && passed / total >= 0.75
              ? "مستقر"
              : "يحتاج متابعة",
    };
  }, [rows]);

  const distribution = useMemo(() => {
    return gradeLabels.map((grade) => ({
      label: grade.label,
      count: rows.filter((row) => row.gradeLabel === grade.label).length,
      tone: grade.tone,
    }));
  }, [rows]);

  const rangeDistribution = useMemo(() => {
    const ranges = [
      { label: "0 - 49", min: 0, max: 49, tone: "red" as ChartTone },
      { label: "50 - 59", min: 50, max: 59, tone: "red" as ChartTone },
      { label: "60 - 69", min: 60, max: 69, tone: "gold" as ChartTone },
      { label: "70 - 79", min: 70, max: 79, tone: "slate" as ChartTone },
      { label: "80 - 89", min: 80, max: 89, tone: "blue" as ChartTone },
      { label: "90 - 100", min: 90, max: 100, tone: "green" as ChartTone },
    ];

    return ranges.map((range) => ({
      label: range.label,
      count: rows.filter(
        (row) => row.percentage >= range.min && row.percentage <= range.max,
      ).length,
      tone: range.tone,
    }));
  }, [rows]);

  const topStudents = useMemo(() => {
    return [...rows]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10);
  }, [rows]);

  const lowStudents = useMemo(() => {
    return [...rows]
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 10);
  }, [rows]);

  async function loadWorksheet(buffer: ArrayBuffer, sheetName: string) {
    const workbook = XLSX.read(buffer, { type: "array" });
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      setErrorMessage("لم يتم العثور على الورقة المحددة داخل الملف.");
      return;
    }

    const nextRows = readSheetRows(worksheet);
    const detected = detectConfig(nextRows);

    setSheetRows(nextRows);
    setConfig(detected);
    setRows([]);

    if (!detected.detectedStudentsCount) {
      setErrorMessage(
        "تم رفع الملف، لكن لم يتم اكتشاف صفوف طلاب بدرجات واضحة. جرّب اختيار ورقة أخرى أو تأكد من وجود أسماء ودرجات.",
      );
      setMessage("");
      return;
    }

    setErrorMessage("");
    setMessage(
      `تم رفع الملف بنجاح. تم اكتشاف ${detected.detectedStudentsCount} طالب. اختر الدرجة الكاملة ثم اضغط تحليل الملف.`,
    );
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (!["xlsx", "xls"].includes(ext || "")) {
      setErrorMessage("ارفع ملف Excel فقط بصيغة xlsx أو xls.");
      return;
    }

    try {
      setFileName(file.name);
      setRows([]);
      setSheetRows([]);
      setSheetNames([]);
      setSelectedSheetName("");
      setWorkbookBuffer(null);
      setConfig(null);
      setMessage("");
      setErrorMessage("");

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const names = workbook.SheetNames;

      if (!names.length) {
        setErrorMessage("لم يتم العثور على ورقة داخل الملف.");
        return;
      }

      setWorkbookBuffer(buffer);
      setSheetNames(names);
      setSelectedSheetName(names[0]);
      await loadWorksheet(buffer, names[0]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء قراءة الملف.",
      );
    }
  }

  async function handleSheetChange(sheetName: string) {
    setSelectedSheetName(sheetName);

    if (workbookBuffer) {
      await loadWorksheet(workbookBuffer, sheetName);
    }
  }

  function analyzeFile() {
    if (!sheetRows.length || !config) {
      setErrorMessage("ارفع الملف أولًا.");
      return;
    }

    setAnalyzing(true);
    setErrorMessage("");
    setMessage("");

    const analyzed = analyzeRows(sheetRows, config, selectedMaxScore);

    if (!analyzed.length) {
      setRows([]);
      setErrorMessage("لم أستطع استخراج أسماء الطلاب والدرجات من الملف.");
      setAnalyzing(false);
      return;
    }

    setRows(analyzed);
    setMessage(
      `تم تحليل ${analyzed.length} طالب بنجاح بناءً على الدرجة من ${selectedMaxScore}.`,
    );
    setAnalyzing(false);
  }

  function handleMaxScoreChange(value: number) {
    setSelectedMaxScore(value);

    if (sheetRows.length && config && rows.length) {
      const analyzed = analyzeRows(sheetRows, config, value);
      setRows(analyzed);
      setMessage(`تم تحديث التحليل بناءً على الدرجة من ${value}.`);
    }
  }

  function clearAll() {
    setFileName("");
    setSheetRows([]);
    setSheetNames([]);
    setSelectedSheetName("");
    setWorkbookBuffer(null);
    setRows([]);
    setConfig(null);
    setMessage("");
    setErrorMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function exportExcel() {
    if (!rows.length) {
      setErrorMessage("لا توجد نتائج للتصدير.");
      return;
    }

    const data = rows.map((row) => ({
      "الترتيب": row.rank,
      "اسم الطالب": row.studentName,
      "الدرجة": row.score,
      "الدرجة الكاملة": row.maxScore,
      "النسبة": `${row.percentage}%`,
      "التقدير": row.gradeLabel,
      "الحالة": row.statusLabel,
      "الفرق عن المتوسط": row.differenceFromAverage,
      "الفرق عن الأول": row.differenceFromTop,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "تحليل الدرجات");
    XLSX.writeFile(
      wb,
      `تحليل-الدرجات-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  function printReport() {
    window.print();
  }

  return (
    <AppShell>
      <div className="space-y-6 print:bg-white" dir="rtl">
        <PageHeader
          variant="hero"
          title="تحليل ملف درجات خارجي"
          description="أداة مستقلة لتحليل ملفات Excel الخارجية مثل ملفات مدرستي بلس أو نور، دون ربطها بسجلات الدرجات الرسمية داخل المنصة."
          badge="مركز تحليل الدرجات"
          icon={<BarChart3 size={18} />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "الدرجات", href: "/grades" },
            { label: "محلل الدرجات" },
          ]}
          meta={[
            { label: "الملف الحالي", value: fileName || "لم يتم رفع ملف" },
            { label: "الورقة", value: selectedSheetName || "غير محددة" },
            { label: "الدرجة الكاملة", value: selectedMaxScore },
            { label: "الطلاب المكتشفون", value: config?.detectedStudentsCount || 0 },
          ]}
          stats={[
            { label: "عدد الطلاب", value: stats.total, icon: <UsersRound size={20} />, tone: "blue" },
            { label: "متوسط النسبة", value: `${stats.average}%`, icon: <BarChart3 size={20} />, tone: stats.average >= 80 ? "green" : stats.average >= 60 ? "gold" : "red" },
            { label: "نسبة النجاح", value: `${stats.passRate}%`, icon: <CheckCircle2 size={20} />, tone: stats.passRate >= 80 ? "green" : stats.passRate >= 60 ? "gold" : "red" },
            { label: "مؤشر الصف", value: stats.qualityLabel, icon: <Trophy size={20} />, tone: stats.average >= 70 ? "green" : "gold" },
          ]}
          actions={
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0DA9A6] hover:shadow-md"
              >
                <Upload size={17} />
                رفع ملف Excel
              </button>

              <button
                type="button"
                onClick={analyzeFile}
                disabled={!sheetRows.length || analyzing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BarChart3 size={17} />
                {analyzing ? "جاري التحليل..." : "تحليل الملف"}
              </button>

              {fileName && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <XCircle size={17} />
                  مسح
                </button>
              )}
            </>
          }
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
        />

        <section className="hidden print:block">
          <div className="border-b-2 border-slate-900 pb-4">
            <p className="text-sm font-bold text-slate-600">وزارة التعليم</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">
              تقرير تحليل الدرجات
            </h1>
            <p className="mt-2 text-sm text-slate-700">
              الملف: {fileName || "-"} | الورقة: {selectedSheetName || "-"} | الدرجة الكاملة: {selectedMaxScore} |
              عدد الطلاب: {stats.total}
            </p>
          </div>
        </section>

        <PageToolbar
          search={{
            value: fileName,
            onChange: () => undefined,
            placeholder: "ارفع ملف Excel للبدء...",
            disabled: true,
          }}
          filters={
            <>
              <ToolbarSelect
                value={String(selectedMaxScore)}
                onChange={(value) => handleMaxScoreChange(Number(value))}
              >
                {scoreOptions.map((score) => (
                  <option key={score} value={score}>
                    الدرجة من {score}
                  </option>
                ))}
              </ToolbarSelect>

              {sheetNames.length > 1 && (
                <ToolbarSelect
                  value={selectedSheetName}
                  onChange={(value) => void handleSheetChange(value)}
                >
                  {sheetNames.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </ToolbarSelect>
              )}
            </>
          }
          onRefresh={() => {
            if (workbookBuffer && selectedSheetName) {
              void loadWorksheet(workbookBuffer, selectedSheetName);
            }
          }}
          onExportExcel={exportExcel}
          onPrint={printReport}
          actions={
            <button
              type="button"
              onClick={clearAll}
              disabled={!fileName}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 text-sm font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCcw size={17} />
              إعادة ضبط
            </button>
          }
        />

        {(message || errorMessage) && (
          <div className="print:hidden">
            {message && (
              <SummaryCard
                title="تم قراءة الملف"
                description={message}
                tone="green"
                icon={<CheckCircle2 size={22} />}
              />
            )}

            {errorMessage && (
              <div className="mt-3">
                <SummaryCard
                  title="تنبيه"
                  description={errorMessage}
                  tone="red"
                  icon={<AlertCircle size={22} />}
                />
              </div>
            )}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6 print:grid-cols-6">
          <ExecutiveCard
            title="عدد الطلاب"
            value={stats.total}
            subtitle="السجلات التي تم تحليلها"
            icon={<UsersRound size={22} />}
            tone="blue"
            progress={stats.total > 0 ? 100 : 0}
          />
          <ExecutiveCard
            title="متوسط النسبة"
            value={`${stats.average}%`}
            subtitle="متوسط أداء الطلاب"
            icon={<BarChart3 size={22} />}
            tone={stats.average >= 80 ? "green" : stats.average >= 60 ? "gold" : "red"}
            progress={stats.average}
          />
          <ExecutiveCard
            title="متوسط الدرجة"
            value={`${stats.scoreAverage}`}
            subtitle={`من ${selectedMaxScore}`}
            icon={<FileSpreadsheet size={22} />}
            tone="teal"
            progress={selectedMaxScore ? Math.round((stats.scoreAverage / selectedMaxScore) * 100) : 0}
          />
          <ExecutiveCard
            title="نسبة النجاح"
            value={`${stats.passRate}%`}
            subtitle={`${stats.passed} ناجح / ${stats.failed} متابعة`}
            icon={<CheckCircle2 size={22} />}
            tone={stats.passRate >= 80 ? "green" : stats.passRate >= 60 ? "gold" : "red"}
            progress={stats.passRate}
          />
          <ExecutiveCard
            title="الوسيط"
            value={`${stats.median}%`}
            subtitle={`الانحراف ${stats.standardDeviation}`}
            icon={<BarChart3 size={22} />}
            tone="primary"
            progress={stats.median}
          />
          <ExecutiveCard
            title="مؤشر الصف"
            value={stats.qualityLabel}
            subtitle="قراءة عامة للنتائج"
            icon={<Trophy size={22} />}
            tone={stats.average >= 70 ? "green" : "gold"}
          />
        </section>

        <SummaryCard
          title="الملخص التنفيذي للتحليل"
          description="قراءة سريعة للنتائج المستخرجة من الملف الخارجي."
          tone={stats.average >= 70 ? "green" : stats.total > 0 ? "gold" : "slate"}
          items={[
            { label: "عدد الطلاب المحللين", value: stats.total },
            { label: "متوسط النسبة", value: `${stats.average}%` },
            { label: "نسبة النجاح", value: `${stats.passRate}%` },
            { label: "طلاب يحتاجون متابعة", value: stats.failed },
            { label: "أعلى نسبة", value: `${stats.highest}%` },
            { label: "أقل نسبة", value: `${stats.lowest}%` },
          ]}
          footer="هذه الأداة للتحليل الخارجي فقط، ولا تحفظ أو تعدل سجلات الدرجات الرسمية داخل المنصة."
        />

        <section className="grid gap-4 lg:grid-cols-3 print:grid-cols-3">
          <Section
            title="ملخص النتائج"
            icon={<FileText size={20} />}
            className="print:break-inside-avoid"
          >
            <div className="space-y-3">
              <MiniMetric label="ناجح" value={stats.passed} />
              <MiniMetric label="يحتاج متابعة" value={stats.failed} />
              <MiniMetric label="متفوقون" value={stats.excellent} />
              <MiniMetric label="أعلى نسبة" value={stats.highest} suffix="%" />
              <MiniMetric label="أقل نسبة" value={stats.lowest} suffix="%" />
              <MiniMetric label="الانحراف المعياري" value={stats.standardDeviation} />
            </div>
          </Section>

          <Section
            title="توزيع التقديرات"
            icon={<BarChart3 size={20} />}
            className="lg:col-span-2 print:col-span-2 print:break-inside-avoid"
          >
            <BarChart data={distribution} total={stats.total} />
          </Section>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 print:grid-cols-2">
          <Section
            title="توزيع الطلاب حسب النسبة"
            icon={<BarChart3 size={20} />}
            className="print:break-inside-avoid"
          >
            <BarChart data={rangeDistribution} total={stats.total} />
          </Section>

          <Section
            title="مقارنة النجاح والمتابعة"
            icon={<CheckCircle2 size={20} />}
            className="print:break-inside-avoid"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <CircleStat title="نسبة النجاح" value={stats.passRate} tone="green" />
              <CircleStat title="نسبة المتابعة" value={stats.failRate} tone="red" />
            </div>
          </Section>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 print:grid-cols-2">
          <StudentList title="أعلى 10 طلاب" students={topStudents} tone="green" />
          <StudentList title="أقل 10 طلاب" students={lowStudents} tone="red" />
        </section>

        <Section
          title="نتائج التحليل"
          description="هذه الأداة للتحليل الخارجي فقط، ولا تحفظ أو تعدل سجلات الدرجات الرسمية."
          icon={<FileSpreadsheet size={20} />}
          actions={
            <div className="flex gap-2 print:hidden">
              <button
                type="button"
                onClick={exportExcel}
                disabled={!rows.length}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={16} />
                Excel
              </button>

              <button
                type="button"
                onClick={printReport}
                disabled={!rows.length}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer size={16} />
                طباعة / PDF
              </button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-right text-sm print:min-w-0">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">الترتيب</th>
                  <th className="px-4 py-3">اسم الطالب</th>
                  <th className="px-4 py-3">الدرجة</th>
                  <th className="px-4 py-3">النسبة</th>
                  <th className="px-4 py-3">التقدير</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">عن المتوسط</th>
                  <th className="px-4 py-3">عن الأول</th>
                </tr>
              </thead>

              <tbody>
                {rows.length ? (
                  [...rows]
                    .sort((a, b) => a.rank - b.rank)
                    .map((row) => (
                      <tr
                        key={`${row.rowNumber}-${row.studentName}`}
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-3 text-slate-500">{row.rank}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {row.studentName}
                        </td>
                        <td className="px-4 py-3">
                          {row.score} / {row.maxScore}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {row.percentage}%
                        </td>
                        <td className="px-4 py-3">{row.gradeLabel}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.statusLabel} />
                        </td>
                        <td className="px-4 py-3">
                          {row.differenceFromAverage > 0 ? "+" : ""}
                          {row.differenceFromAverage}%
                        </td>
                        <td className="px-4 py-3">
                          {row.differenceFromTop === 0 ? "الأول" : `${row.differenceFromTop}%`}
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      لم يتم تحليل أي ملف بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

function MiniMetric({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <KpiCard
      title={label}
      value={`${value}${suffix}`}
      tone={label.includes("متابعة") ? "red" : "teal"}
      caption="مؤشر من الملف"
    />
  );
}

function BarChart({
  data,
  total,
}: {
  data: { label: string; count: number; tone?: ChartTone }[];
  total: number;
}) {
  const colors: Record<ChartTone, string> = {
    green: "bg-[#07A869]",
    blue: "bg-[#3D7EB9]",
    slate: "bg-slate-500",
    gold: "bg-[#C1B489]",
    red: "bg-red-600",
  };

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const percentage = total ? Math.round((item.count / total) * 100) : 0;
        const color = colors[item.tone ?? "slate"];

        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-bold text-slate-700">{item.label}</span>
              <span className="text-slate-500">
                {item.count} طالب - {percentage}%
              </span>
            </div>

            <div className="h-4 overflow-hidden rounded-full bg-slate-100 print:border print:border-slate-200">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CircleStat({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "green" | "red";
}) {
  const color =
    tone === "green"
      ? "border-[#07A869] text-[#07A869]"
      : "border-red-500 text-red-600";

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
      <div
        className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full border-[12px] bg-white ${color}`}
      >
        <span className="text-2xl font-black">{value}%</span>
      </div>
      <div className="mt-3 text-sm font-bold text-slate-700">{title}</div>
    </div>
  );
}

function StudentList({
  title,
  students,
  tone,
}: {
  title: string;
  students: AnalysisRow[];
  tone: "green" | "red";
}) {
  return (
    <Section
      title={title}
      icon={<Trophy size={20} />}
      className="print:break-inside-avoid"
      empty={!students.length}
      emptyTitle="لا توجد بيانات"
      emptyDescription="لم تظهر نتائج كافية في هذا القسم."
    >
      <div className="space-y-2">
        {students.map((student) => (
          <div
            key={`${student.studentName}-${student.rank}`}
            className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-800">
                {student.rank}. {student.studentName}
              </div>
              <div className="text-xs text-slate-500">
                {student.gradeLabel} - {student.statusLabel}
              </div>
            </div>

            <div
              className={`rounded-full px-3 py-1 text-sm font-black ${
                tone === "green"
                  ? "bg-[#07A869]/10 text-[#07A869]"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {student.percentage}%
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === "ناجح";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        ok ? "bg-[#07A869]/10 text-[#07A869]" : "bg-red-50 text-red-700"
      }`}
    >
      {status}
    </span>
  );
}

"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  MessageSquareWarning,
  RefreshCw,
  Sparkles,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import PageContainer from "@/components/layout/PageContainer";
import ExportButton from "@/components/ui/buttons/ExportButton";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { EmptyState } from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/feedback/ErrorState";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import { PageLoader } from "@/components/ui/loading";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar from "@/components/ui/page/PageToolbar";
import PageSection from "@/components/ui/page/PageSection";

import { supabase } from "@/lib/supabase";

type SectionId =
  | "students"
  | "attendance"
  | "grades"
  | "behavior"
  | "reports"
  | "ai";

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

type ImportSection = {
  id: SectionId;
  title: string;
  description: string;
  icon: LucideIcon;
};

const IMPORT_SECTIONS: readonly ImportSection[] = [
  {
    id: "students",
    title: "الطلاب",
    description: "الأسماء والفصول.",
    icon: Users,
  },
  {
    id: "attendance",
    title: "الحضور",
    description: "الغياب والتأخر.",
    icon: ClipboardCheck,
  },
  {
    id: "grades",
    title: "الدرجات",
    description: "التحصيل والتعثر.",
    icon: GraduationCap,
  },
  {
    id: "behavior",
    title: "السلوك",
    description: "الملاحظات والمتابعة.",
    icon: MessageSquareWarning,
  },
  {
    id: "reports",
    title: "التقارير",
    description: "تصدير النتائج.",
    icon: FileText,
  },
  {
    id: "ai",
    title: "الرؤى الذكية",
    description: "مؤشرات وتوصيات.",
    icon: Brain,
  },
];

function getText(
  row: ImportPreviewRow,
  keys: readonly string[],
  fallback: string,
) {
  for (const key of keys) {
    const value = row[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return fallback;
}

function getNumber(
  row: ImportPreviewRow,
  keys: readonly string[],
  fallback = 0,
) {
  for (const key of keys) {
    const raw = row[key];
    const value = Number(
      String(raw ?? "")
        .replace("%", "")
        .replace(",", "."),
    );

    if (Number.isFinite(value)) {
      return Math.max(0, Math.min(100, value));
    }
  }

  return fallback;
}

function getStatus(row: NoorRow) {
  const risk =
    row.attendance < 75 || row.grade < 60;
  const excellent =
    row.attendance >= 95 && row.grade >= 90;

  if (risk) return "يحتاج دعم";
  if (excellent) return "متميز";

  return "مستقر";
}

function getRecommendation(row: NoorRow) {
  const risk =
    row.attendance < 75 || row.grade < 60;
  const excellent =
    row.attendance >= 95 && row.grade >= 90;

  if (risk) return "خطة متابعة وتواصل";
  if (excellent) return "تكريم وتحفيز";

  return "متابعة دورية";
}

function localDateISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(
    now.getTime() - offset * 60 * 1000,
  );

  return localDate.toISOString().slice(0, 10);
}

function escapeCsvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function NoorImportPage() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [activeSection, setActiveSection] =
    useState<SectionId>("students");
  const [rows, setRows] = useState<NoorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] =
    useState<Toast | null>(null);

  const showToast = useCallback(
    (type: Toast["type"], message: string) => {
      setToast({ type, message });

      window.setTimeout(() => {
        setToast(null);
      }, 3500);
    },
    [],
  );

  const handleFileUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) return;

      try {
        setLoading(true);
        setFileName(file.name);

        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, {
          type: "array",
        });
        const firstSheet =
          workbook.SheetNames[0];
        const sheet =
          workbook.Sheets[firstSheet];

        if (!sheet) {
          showToast(
            "error",
            "لم يتم العثور على ورقة صالحة.",
          );
          return;
        }

        const json =
          XLSX.utils.sheet_to_json<ImportPreviewRow>(
            sheet,
            {
              defval: "",
            },
          );

        const parsedRows: NoorRow[] = json.map(
          (row) => ({
            name: getText(
              row,
              [
                "اسم الطالب",
                "الطالب",
                "الاسم",
                "student_name",
                "name",
                "Name",
              ],
              "غير معروف",
            ),
            className: getText(
              row,
              [
                "الفصل",
                "الصف",
                "الشعبة",
                "class_name",
                "class",
                "Class",
              ],
              "غير محدد",
            ),
            attendance: getNumber(
              row,
              [
                "نسبة الحضور",
                "الحضور",
                "حضور",
                "attendance",
                "Attendance",
              ],
            ),
            grade: getNumber(
              row,
              [
                "المعدل",
                "الدرجة",
                "النسبة",
                "grade",
                "Grade",
              ],
            ),
            behaviorNote: getText(
              row,
              [
                "السلوك",
                "الملاحظات",
                "ملاحظة",
                "behavior",
                "Behavior",
              ],
              "لا توجد ملاحظات",
            ),
            subject: getText(
              row,
              [
                "المادة",
                "اسم المادة",
                "subject",
                "Subject",
              ],
              "غير محدد",
            ),
            teacher: getText(
              row,
              [
                "المعلم",
                "اسم المعلم",
                "teacher",
                "Teacher",
              ],
              "غير محدد",
            ),
          }),
        );

        if (parsedRows.length === 0) {
          setRows([]);
          showToast(
            "error",
            "لا توجد صفوف قابلة للتحليل.",
          );
          return;
        }

        setRows(parsedRows);

        const rowsToInsert = parsedRows.map(
          (row) => ({
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
            recommendation:
              getRecommendation(row),
          }),
        );

        const { error } = await supabase
          .from("noor_imports")
          .insert(rowsToInsert);

        if (error) {
          showToast(
            "error",
            "تم التحليل وتعذر الحفظ.",
          );
          return;
        }

        showToast(
          "success",
          "تم تحليل الملف وحفظه.",
        );
      } catch (error) {
        showToast(
          "error",
          error instanceof Error
            ? error.message
            : "تعذر معالجة الملف.",
        );
      } finally {
        setLoading(false);
        event.currentTarget.value = "";
      }
    },
    [activeSection, showToast],
  );

  const filteredRows = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("ar");

    if (!query) return rows;

    return rows.filter((row) =>
      [
        row.name,
        row.className,
        row.subject,
        row.teacher,
      ].some((value) =>
        value
          .toLocaleLowerCase("ar")
          .includes(query),
      ),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const risk = rows.filter(
      (row) =>
        row.attendance < 75 || row.grade < 60,
    );
    const excellent = rows.filter(
      (row) =>
        row.attendance >= 95 &&
        row.grade >= 90,
    );

    const attendanceAverage =
      rows.length > 0
        ? Math.round(
            rows.reduce(
              (sum, row) =>
                sum + row.attendance,
              0,
            ) / rows.length,
          )
        : 0;

    const gradeAverage =
      rows.length > 0
        ? Math.round(
            rows.reduce(
              (sum, row) => sum + row.grade,
              0,
            ) / rows.length,
          )
        : 0;

    return {
      total: rows.length,
      risk: risk.length,
      excellent: excellent.length,
      stable: Math.max(
        rows.length -
          risk.length -
          excellent.length,
        0,
      ),
      attendanceAverage,
      gradeAverage,
    };
  }, [rows]);

  const classAnalysis = useMemo(() => {
    const groups = new Map<string, NoorRow[]>();

    for (const row of rows) {
      const current =
        groups.get(row.className) ?? [];
      current.push(row);
      groups.set(row.className, current);
    }

    return Array.from(
      groups.entries(),
      ([className, items]) => {
        const attendanceAverage = Math.round(
          items.reduce(
            (sum, item) =>
              sum + item.attendance,
            0,
          ) / items.length,
        );

        const gradeAverage = Math.round(
          items.reduce(
            (sum, item) => sum + item.grade,
            0,
          ) / items.length,
        );

        const riskCount = items.filter(
          (item) =>
            item.attendance < 75 ||
            item.grade < 60,
        ).length;

        return {
          className,
          total: items.length,
          attendanceAverage,
          gradeAverage,
          riskCount,
        };
      },
    ).sort((a, b) =>
      a.className.localeCompare(
        b.className,
        "ar",
      ),
    );
  }, [rows]);

  const insights = useMemo(
    () => [
      stats.risk > 0
        ? `${stats.risk} طالب يحتاجون دعمًا.`
        : "لا توجد حالات تعثر واضحة.",
      stats.attendanceAverage < 80
        ? "الحضور يحتاج متابعة."
        : "مؤشر الحضور جيد.",
      stats.gradeAverage < 70
        ? "التحصيل يحتاج خطة علاجية."
        : "التحصيل الدراسي مستقر.",
      stats.excellent > 0
        ? `${stats.excellent} طالب متميز.`
        : "لا توجد حالات تميز مرتفعة.",
    ],
    [stats],
  );

  const exportCSV = useCallback(() => {
    if (filteredRows.length === 0) {
      showToast(
        "error",
        "لا توجد نتائج للتصدير.",
      );
      return;
    }

    const data: (string | number)[][] = [
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

    const csv = data
      .map((row) =>
        row.map(escapeCsvCell).join(","),
      )
      .join("\n");

    const blob = new Blob(
      ["\uFEFF", csv],
      {
        type: "text/csv;charset=utf-8;",
      },
    );
    const url =
      URL.createObjectURL(blob);
    const link =
      document.createElement("a");

    link.href = url;
    link.download = `noor-analysis-${localDateISO()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }, [filteredRows, showToast]);

  const resetData = useCallback(() => {
    setRows([]);
    setFileName("");
    setSearch("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    showToast("success", "تمت إعادة الضبط.");
  }, [showToast]);

  return (
    <AppShell>
      <PageContainer
        size="wide"
        className="space-y-6 pb-10"
      >
        {toast ? (
          <div className="fixed left-5 top-5 z-50 w-[min(420px,calc(100%-2rem))] print:hidden">
            {toast.type === "success" ? (
              <SuccessBanner
                description={toast.message}
              />
            ) : (
              <ErrorState
                description={toast.message}
              />
            )}
          </div>
        ) : null}

        <PageHeader
          variant="hero"
          title="استيراد وتحليل ملفات نور"
          description="تحليل الطلاب والحضور والدرجات والسلوك."
          badge="استيراد نور"
          icon={
            <Brain
              size={18}
              aria-hidden="true"
            />
          }
          breadcrumbs={[
            {
              label: "لوحة التحكم",
              href: "/dashboard",
            },
            {
              label: "استيراد نور",
            },
          ]}
          stats={[
            {
              label: "السجلات",
              value: stats.total,
              icon: (
                <Users
                  size={20}
                  aria-hidden="true"
                />
              ),
              tone: "primary",
            },
            {
              label: "الحضور",
              value: `${stats.attendanceAverage}%`,
              icon: (
                <ClipboardCheck
                  size={20}
                  aria-hidden="true"
                />
              ),
              tone:
                stats.attendanceAverage >= 80
                  ? "green"
                  : "gold",
            },
            {
              label: "الدرجات",
              value: `${stats.gradeAverage}%`,
              icon: (
                <BarChart3
                  size={20}
                  aria-hidden="true"
                />
              ),
              tone:
                stats.gradeAverage >= 70
                  ? "green"
                  : "gold",
            },
            {
              label: "يحتاجون دعم",
              value: stats.risk,
              icon: (
                <AlertTriangle
                  size={20}
                  aria-hidden="true"
                />
              ),
              tone:
                stats.risk > 0
                  ? "red"
                  : "green",
            },
          ]}
          actions={
            <>
              <SecondaryButton
                onClick={() => window.print()}
              >
                <FileText
                  size={17}
                  aria-hidden="true"
                />
                طباعة
              </SecondaryButton>

              <ExportButton
                onClick={exportCSV}
                disabled={rows.length === 0}
              >
                CSV
              </ExportButton>

              <SecondaryButton
                onClick={resetData}
                disabled={
                  rows.length === 0 && !fileName
                }
              >
                <RefreshCw
                  size={17}
                  aria-hidden="true"
                />
                إعادة
              </SecondaryButton>
            </>
          }
        />

        <section
          className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6 print:hidden"
          aria-label="أنواع التحليل"
        >
          {IMPORT_SECTIONS.map((section) => {
            const Icon = section.icon;
            const active =
              activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() =>
                  setActiveSection(section.id)
                }
                aria-pressed={active}
                className={[
                  "rounded-[var(--app-radius-xl)] border p-5 text-right shadow-[var(--app-shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--app-shadow-md)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]",
                  active
                    ? "border-[var(--app-primary)] bg-[var(--app-primary)] text-[var(--app-text-inverse)]"
                    : "border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] hover:border-[var(--app-accent-border)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-lg)]",
                    active
                      ? "bg-[var(--app-accent)] text-[var(--app-accent-foreground)]"
                      : "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  <Icon size={22} />
                </span>

                <h2 className="text-base font-black">
                  {section.title}
                </h2>

                <p
                  className={[
                    "mt-2 text-xs leading-6",
                    active
                      ? "text-[color-mix(in_srgb,var(--app-text-inverse)_75%,transparent)]"
                      : "text-[var(--app-text-muted)]",
                  ].join(" ")}
                >
                  {section.description}
                </p>
              </button>
            );
          })}
        </section>

        <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-6 shadow-[var(--app-shadow-sm)] print:hidden">
          <div className="flex flex-col items-center justify-center rounded-[var(--app-radius-xl)] border-2 border-dashed border-[var(--app-border)] bg-[var(--app-card-soft)] p-10 text-center">
            <span
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--app-radius-xl)] bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]"
              aria-hidden="true"
            >
              <FileSpreadsheet size={36} />
            </span>

            <h2 className="text-2xl font-black text-[var(--app-text)]">
              {
                IMPORT_SECTIONS.find(
                  (item) =>
                    item.id === activeSection,
                )?.title
              }
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--app-text-muted)]">
              اختر ملف Excel يحتوي على بيانات
              الطلاب والحضور والدرجات.
            </p>

            <PrimaryButton
              className="mt-6"
              onClick={() =>
                fileInputRef.current?.click()
              }
              loading={loading}
            >
              <Upload
                size={20}
                aria-hidden="true"
              />
              اختيار ملف
            </PrimaryButton>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) =>
                void handleFileUpload(event)
              }
              className="hidden"
            />

            {fileName ? (
              <p className="mt-4 rounded-[var(--app-radius-md)] bg-[var(--app-card)] px-4 py-2 text-sm font-bold text-[var(--app-text-muted)]">
                {fileName}
              </p>
            ) : null}
          </div>
        </section>

        {loading ? (
          <PageLoader text="جاري تحليل الملف..." />
        ) : null}

        {!loading && rows.length > 0 ? (
          <>
            <section
              className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6"
              aria-label="مؤشرات التحليل"
            >
              <ExecutiveCard
                title="السجلات"
                value={stats.total}
                icon={
                  <Users
                    size={22}
                    aria-hidden="true"
                  />
                }
                subtitle="إجمالي الصفوف"
                tone="primary"
                progress={
                  stats.total > 0 ? 100 : 0
                }
              />

              <ExecutiveCard
                title="الحضور"
                value={`${stats.attendanceAverage}%`}
                icon={
                  <ClipboardCheck
                    size={22}
                    aria-hidden="true"
                  />
                }
                subtitle="متوسط الالتزام"
                tone={
                  stats.attendanceAverage >= 80
                    ? "green"
                    : "gold"
                }
                progress={
                  stats.attendanceAverage
                }
              />

              <ExecutiveCard
                title="الدرجات"
                value={`${stats.gradeAverage}%`}
                icon={
                  <BarChart3
                    size={22}
                    aria-hidden="true"
                  />
                }
                subtitle="متوسط التحصيل"
                tone={
                  stats.gradeAverage >= 70
                    ? "green"
                    : "gold"
                }
                progress={stats.gradeAverage}
              />

              <ExecutiveCard
                title="متعثرون"
                value={stats.risk}
                icon={
                  <AlertTriangle
                    size={22}
                    aria-hidden="true"
                  />
                }
                subtitle="يحتاجون دعمًا"
                tone={
                  stats.risk > 0
                    ? "red"
                    : "green"
                }
                progress={
                  stats.total
                    ? Math.round(
                        (stats.risk /
                          stats.total) *
                          100,
                      )
                    : 0
                }
              />

              <ExecutiveCard
                title="مستقرون"
                value={stats.stable}
                icon={
                  <CheckCircle2
                    size={22}
                    aria-hidden="true"
                  />
                }
                subtitle="متابعة دورية"
                tone="primary"
                progress={
                  stats.total
                    ? Math.round(
                        (stats.stable /
                          stats.total) *
                          100,
                      )
                    : 0
                }
              />

              <ExecutiveCard
                title="متميزون"
                value={stats.excellent}
                icon={
                  <Sparkles
                    size={22}
                    aria-hidden="true"
                  />
                }
                subtitle="يستحقون التحفيز"
                tone="gold"
                progress={
                  stats.total
                    ? Math.round(
                        (stats.excellent /
                          stats.total) *
                          100,
                      )
                    : 0
                }
              />
            </section>

            <SummaryCard
              title="الملخص التنفيذي"
              description="أهم مؤشرات الملف."
              tone={
                stats.risk > 0
                  ? "gold"
                  : "green"
              }
              items={[
                {
                  label: "السجلات",
                  value: stats.total,
                },
                {
                  label: "الحضور",
                  value: `${stats.attendanceAverage}%`,
                },
                {
                  label: "الدرجات",
                  value: `${stats.gradeAverage}%`,
                },
                {
                  label: "يحتاجون دعم",
                  value: stats.risk,
                },
                {
                  label: "مستقرون",
                  value: stats.stable,
                },
                {
                  label: "متميزون",
                  value: stats.excellent,
                },
              ]}
              footer="تُحفظ النتائج في جدول noor_imports."
            />

            <PageSection
              title="الرؤى الذكية"
              icon={
                <Brain
                  size={20}
                  aria-hidden="true"
                />
              }
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {insights.map((item) => (
                  <div
                    key={item}
                    className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 text-sm font-bold leading-7 text-[var(--app-text)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </PageSection>

            <PageSection
              title="تحليل الفصول"
              icon={
                <GraduationCap
                  size={20}
                  aria-hidden="true"
                />
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-right text-sm">
                  <thead className="bg-[var(--app-primary)] text-[var(--app-text-inverse)]">
                    <tr>
                      <th className="p-4">الفصل</th>
                      <th className="p-4">
                        الطلاب
                      </th>
                      <th className="p-4">
                        الحضور
                      </th>
                      <th className="p-4">
                        الدرجات
                      </th>
                      <th className="p-4">
                        متعثرون
                      </th>
                      <th className="p-4">
                        التوصية
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {classAnalysis.map((item) => (
                      <tr
                        key={item.className}
                        className="border-b border-[var(--app-border)] last:border-b-0 hover:bg-[var(--app-card-soft)]"
                      >
                        <td className="p-4 font-bold text-[var(--app-text)]">
                          {item.className}
                        </td>
                        <td className="p-4">
                          {item.total}
                        </td>
                        <td className="p-4">
                          {
                            item.attendanceAverage
                          }
                          %
                        </td>
                        <td className="p-4">
                          {item.gradeAverage}%
                        </td>
                        <td className="p-4">
                          {item.riskCount}
                        </td>
                        <td className="p-4">
                          {item.riskCount > 0
                            ? "خطة متابعة"
                            : "وضع مستقر"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PageSection>

            <PageSection
              title="نتائج التحليل"
              icon={
                <FileSpreadsheet
                  size={20}
                  aria-hidden="true"
                />
              }
            >
              <PageToolbar
                search={{
                  value: search,
                  onChange: setSearch,
                  placeholder:
                    "بحث بالطالب أو الفصل أو المادة...",
                }}
                onExportExcel={exportCSV}
                onPrint={() => window.print()}
              />

              {filteredRows.length === 0 ? (
                <div className="mt-5">
                  <EmptyState
                    title="لا توجد نتائج"
                    description="غيّر عبارة البحث."
                    icon={
                      <Users
                        size={28}
                        aria-hidden="true"
                      />
                    }
                  />
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[1000px] border-collapse text-right text-sm">
                    <thead className="bg-[var(--app-primary)] text-[var(--app-text-inverse)]">
                      <tr>
                        <th className="p-4">
                          الطالب
                        </th>
                        <th className="p-4">
                          الفصل
                        </th>
                        <th className="p-4">
                          المادة
                        </th>
                        <th className="p-4">
                          المعلم
                        </th>
                        <th className="p-4">
                          الحضور
                        </th>
                        <th className="p-4">
                          المعدل
                        </th>
                        <th className="p-4">
                          الملاحظات
                        </th>
                        <th className="p-4">
                          الحالة
                        </th>
                        <th className="p-4">
                          التوصية
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.map(
                        (row, index) => {
                          const status =
                            getStatus(row);

                          return (
                            <tr
                              key={`${row.name}-${index}`}
                              className="border-b border-[var(--app-border)] last:border-b-0 hover:bg-[var(--app-card-soft)]"
                            >
                              <td className="p-4 font-bold text-[var(--app-text)]">
                                {row.name}
                              </td>
                              <td className="p-4">
                                {
                                  row.className
                                }
                              </td>
                              <td className="p-4">
                                {row.subject}
                              </td>
                              <td className="p-4">
                                {row.teacher}
                              </td>
                              <td className="p-4">
                                {
                                  row.attendance
                                }
                                %
                              </td>
                              <td className="p-4">
                                {row.grade}%
                              </td>
                              <td className="p-4">
                                {
                                  row.behaviorNote
                                }
                              </td>
                              <td className="p-4">
                                <StatusBadge
                                  status={status}
                                />
                              </td>
                              <td className="p-4">
                                {getRecommendation(
                                  row,
                                )}
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </PageSection>
          </>
        ) : null}
      </PageContainer>
    </AppShell>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const classes =
    status === "يحتاج دعم"
      ? "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]"
      : status === "متميز"
        ? "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]"
        : "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${classes}`}
    >
      {status}
    </span>
  );
}

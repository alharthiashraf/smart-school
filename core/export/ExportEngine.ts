import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportColumn<T extends Record<string, unknown>> = {
  header: string;
  key: keyof T | string;
  format?: (value: unknown, row: T) => string | number;
  width?: number;
  align?: "right" | "center" | "left";
};

export type ReportType =
  | "grades"
  | "final_grades"
  | "attendance"
  | "behavior"
  | "conduct"
  | "students"
  | "teachers"
  | "schedules"
  | "analytics"
  | "executive"
  | "quality"
  | "general";

export type ReportStats = {
  count?: number;
  average?: number;
  highest?: number;
  lowest?: number;
  passRate?: number;
  excellent?: number;
  weak?: number;
  absent?: number;
  present?: number;
  late?: number;
};

export type ReportIdentity = {
  ministryName?: string;
  educationDepartment?: string;
  educationOffice?: string;
  schoolName?: string;
  schoolLogoUrl?: string;
  platformName?: string;
};

export type ReportMeta = {
  reportNo?: string;
  academicYear?: string;
  semester?: string;
  stageName?: string;
  gradeName?: string;
  classroomName?: string;
  subjectName?: string;
  teacherName?: string;
  printedBy?: string;
  issuedAt?: Date | string | null;
  approvedAt?: Date | string | null;
  verificationUrl?: string;
};

export type PdfExportOptions = ReportIdentity &
  ReportMeta & {
    reportType?: ReportType;
    orientation?: "portrait" | "landscape" | "auto";
    subtitle?: string;
    fileName?: string;
    usePrintMode?: boolean;
    showMinistryIdentity?: boolean;
    showStats?: boolean;
    showSignatures?: boolean;
    showFooter?: boolean;
    showWatermark?: boolean;
    showQr?: boolean;
    stats?: ReportStats;
    signatures?: string[];
    theme?: "moe" | "platform";
  };

export type ExcelExportOptions = {
  sheetName?: string;
  rtl?: boolean;
  includeMeta?: boolean;
  meta?: Record<string, unknown>;
};

const DEFAULT_SIGNATURES = ["المعلم", "رئيس القسم", "الوكيل", "مدير المدرسة"];

const REPORT_TITLES: Record<ReportType, string> = {
  grades: "كشف رصد الدرجات",
  final_grades: "كشف الدرجات النهائي",
  attendance: "تقرير الحضور والغياب",
  behavior: "تقرير السلوك",
  conduct: "تقرير السلوك والمواظبة",
  students: "تقرير الطلاب",
  teachers: "تقرير المعلمين",
  schedules: "تقرير الجداول الدراسية",
  analytics: "تقرير التحليلات",
  executive: "التقرير التنفيذي",
  quality: "تقرير الجودة",
  general: "تقرير عام",
};

function valueOf<T extends Record<string, unknown>>(
  row: T,
  column: ExportColumn<T>,
) {
  const raw = row[column.key as keyof T];
  return column.format ? column.format(raw, row) : raw ?? "";
}

function safeText(value: unknown) {
  return String(value ?? "").trim();
}

function safeFileName(value: string) {
  return (
    safeText(value)
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .slice(0, 120) || "export"
  );
}

function hasArabic(value: unknown) {
  return /[\u0600-\u06FF]/.test(String(value ?? ""));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTime(value?: Date | string | null) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return date.toLocaleString("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function arabicNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function numeric(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function makeReportNo() {
  const now = new Date();
  return `RPT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
}

function resolveOrientation<T extends Record<string, unknown>>(
  columns: ExportColumn<T>[],
  orientation?: PdfExportOptions["orientation"],
) {
  if (orientation && orientation !== "auto") return orientation;
  return columns.length >= 8 ? "landscape" : "portrait";
}

function calcStats<T extends Record<string, unknown>>(
  rows: T[],
  columns: ExportColumn<T>[],
  provided?: ReportStats,
) {
  const totalKey =
    columns.find((c) => String(c.key) === "total_score")?.key ?? "total_score";
  const percentKey =
    columns.find((c) => String(c.key) === "percentage")?.key ?? "percentage";
  const statusKey =
    columns.find((c) => String(c.key) === "result_status")?.key ??
    "result_status";
  const attendanceStatusKey =
    columns.find((c) => String(c.key) === "attendance_status")?.key ??
    "attendance_status";

  const percentages = rows
    .map((row) => numeric(row[percentKey as keyof T]))
    .filter((v) => Number.isFinite(v));

  const totals = rows
    .map((row) => numeric(row[totalKey as keyof T]))
    .filter((v) => Number.isFinite(v));

  const avg = percentages.length
    ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
    : 0;

  const passed = rows.filter((row) =>
    String(row[statusKey as keyof T] ?? "").includes("ناجح"),
  ).length;

  const present = rows.filter((row) =>
    ["حاضر", "present"].includes(String(row[attendanceStatusKey as keyof T] ?? "")),
  ).length;

  const absent = rows.filter((row) =>
    ["غائب", "absent"].includes(String(row[attendanceStatusKey as keyof T] ?? "")),
  ).length;

  const late = rows.filter((row) =>
    ["متأخر", "late"].includes(String(row[attendanceStatusKey as keyof T] ?? "")),
  ).length;

  return {
    count: provided?.count ?? rows.length,
    average: provided?.average ?? avg,
    highest: provided?.highest ?? (totals.length ? Math.max(...totals) : 0),
    lowest: provided?.lowest ?? (totals.length ? Math.min(...totals) : 0),
    passRate:
      provided?.passRate ??
      (rows.length ? Math.round((passed / rows.length) * 100) : 0),
    excellent:
      provided?.excellent ??
      rows.filter((row) => numeric(row[percentKey as keyof T]) >= 90).length,
    weak:
      provided?.weak ??
      rows.filter((row) => numeric(row[percentKey as keyof T]) < 60).length,
    present: provided?.present ?? present,
    absent: provided?.absent ?? absent,
    late: provided?.late ?? late,
  };
}

function buildReportMeta(options?: PdfExportOptions) {
  return [
    options?.educationDepartment
      ? `الإدارة التعليمية: ${options.educationDepartment}`
      : null,
    options?.educationOffice ? `مكتب التعليم: ${options.educationOffice}` : null,
    options?.academicYear ? `العام الدراسي: ${options.academicYear}` : null,
    options?.semester ? `الفصل الدراسي: ${options.semester}` : null,
    options?.stageName ? `المرحلة: ${options.stageName}` : null,
    options?.gradeName ? `الصف/المستوى: ${options.gradeName}` : null,
    options?.classroomName ? `الفصل: ${options.classroomName}` : null,
    options?.subjectName ? `المادة: ${options.subjectName}` : null,
    options?.teacherName ? `المعلم: ${options.teacherName}` : null,
    options?.approvedAt ? `تاريخ الاعتماد: ${formatDateTime(options.approvedAt)}` : null,
    options?.reportNo ? `رقم التقرير: ${options.reportNo}` : null,
  ].filter(Boolean);
}

function getReportTitle(title: string, options?: PdfExportOptions) {
  return safeText(title) || REPORT_TITLES[options?.reportType ?? "general"];
}

function getReportSubtitle(options?: PdfExportOptions) {
  return (
    options?.subtitle ||
    REPORT_TITLES[options?.reportType ?? "general"] ||
    "تقرير رسمي قابل للطباعة"
  );
}

function qrImageUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=88x88&data=${encodeURIComponent(value)}`;
}

function createHtmlDocument<T extends Record<string, unknown>>(input: {
  title: string;
  rows: T[];
  columns: ExportColumn<T>[];
  options?: PdfExportOptions;
}) {
  const options = input.options ?? {};
  const orientation = resolveOrientation(input.columns, options.orientation);
  const reportNo = options.reportNo || makeReportNo();
  const printedAt = formatDateTime(options.issuedAt);
  const ministryName = options.ministryName || "وزارة التعليم";
  const platformName = options.platformName || "منصة المدرسة الذكية 2.0";
  const schoolName = options.schoolName || platformName;
  const title = getReportTitle(input.title, { ...options, reportNo });
  const subtitle = getReportSubtitle(options);
  const meta = buildReportMeta({ ...options, reportNo });
  const stats = calcStats(input.rows, input.columns, options.stats);
  const signatures = options.signatures?.length ? options.signatures : DEFAULT_SIGNATURES;
  const showStats = options.showStats ?? true;
  const showSignatures = options.showSignatures ?? true;
  const showFooter = options.showFooter ?? true;
  const showWatermark = options.showWatermark ?? true;
  const showQr = options.showQr ?? Boolean(options.verificationUrl);
  const verificationValue = options.verificationUrl || `${reportNo}`;

  const headers = input.columns
    .map((column) => {
      const width = column.width ? ` style="width:${column.width}px"` : "";
      return `<th${width}>${escapeHtml(column.header)}</th>`;
    })
    .join("");

  const body =
    input.rows.length === 0
      ? `<tr><td colspan="${input.columns.length + 1}" class="empty">لا توجد بيانات</td></tr>`
      : input.rows
          .map((row, rowIndex) => {
            const cells = input.columns
              .map((column) => {
                const key = String(column.key);
                const value = valueOf(row, column);
                const valueText = String(value ?? "");
                const align = column.align ? ` text-${column.align}` : "";
                const statusClass =
                  key === "result_status" && valueText.includes("راسب")
                    ? " danger"
                    : key === "result_status" && valueText.includes("ناجح")
                      ? " success"
                      : key === "percentage" && numeric(value) >= 90
                        ? " excellent"
                        : key === "attendance_status" && valueText.includes("غائب")
                          ? " danger"
                          : key === "attendance_status" && valueText.includes("حاضر")
                            ? " success"
                            : "";
                return `<td class="${align}${statusClass}">${escapeHtml(value)}</td>`;
              })
              .join("");

            return `<tr><td class="serial">${arabicNumber(rowIndex + 1)}</td>${cells}</tr>`;
          })
          .join("");

  const headersWithSerial = `<th class="serial-head">م</th>${headers}`;

  const logo = options.schoolLogoUrl
    ? `<img src="${escapeHtml(options.schoolLogoUrl)}" alt="شعار المدرسة" class="logo-img" />`
    : `<div class="moe-emblem" aria-label="وزارة التعليم">
        <div class="emblem-dots">
          <span></span><span></span><span></span><span></span><span></span>
          <span></span><span></span><span></span><span></span>
        </div>
        <strong>تعليم</strong>
      </div>`;

  const qr = showQr
    ? `<img class="qr" src="${escapeHtml(qrImageUrl(verificationValue))}" alt="QR" />`
    : "";

  const statsCards =
    options.reportType === "attendance"
      ? [
          ["عدد الطلاب", stats.count],
          ["الحضور", stats.present],
          ["الغياب", stats.absent],
          ["التأخير", stats.late],
          ["نسبة الحضور", stats.count ? Math.round((stats.present / stats.count) * 100) : 0, "%"],
        ]
      : [
          ["عدد الطلاب", stats.count],
          ["المتوسط", stats.average, "%"],
          ["أعلى درجة", stats.highest],
          ["أقل درجة", stats.lowest],
          ["نسبة النجاح", stats.passRate, "%"],
          ["الممتازون", stats.excellent],
          ["يحتاجون متابعة", stats.weak],
        ];

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4 ${orientation};
      margin: 8mm;
    }

    :root {
      --moe-green: #006C35;
      --moe-green-dark: #004B28;
      --moe-green-soft: #EAF5EF;
      --moe-gold: #C8A45D;
      --moe-gold-soft: #F7F0DF;
      --ink: #17212b;
      --muted: #64748b;
      --line: #d8e0e8;
      --soft: #f7faf8;
      --danger: #b91c1c;
      --success: #047857;
      --excellent: #9a6a00;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      direction: rtl;
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      color: var(--ink);
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      counter-reset: page;
    }

    .page {
      width: 100%;
      min-height: 100vh;
      position: relative;
      overflow: hidden;
    }

    .watermark {
      position: fixed;
      inset: 27% auto auto 50%;
      transform: translateX(-50%);
      width: 400px;
      height: 400px;
      border-radius: 50%;
      background:
        radial-gradient(circle, rgba(0,108,53,0.075), transparent 66%),
        repeating-radial-gradient(circle, rgba(0,108,53,0.025) 0 5px, transparent 5px 12px);
      z-index: 0;
      pointer-events: none;
    }

    .content {
      position: relative;
      z-index: 1;
    }

    .top-band {
      height: 10px;
      background: linear-gradient(90deg, var(--moe-green-dark), var(--moe-green), var(--moe-gold));
      border-radius: 0 0 18px 18px;
      margin-bottom: 10px;
    }

    .header {
      display: grid;
      grid-template-columns: 230px 1fr 220px;
      gap: 14px;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 12px 14px;
      background:
        linear-gradient(135deg, rgba(0,108,53,0.09), rgba(200,164,93,0.08)),
        #fff;
      margin-bottom: 10px;
      break-inside: avoid;
      box-shadow: 0 6px 18px rgba(15,23,42,0.06);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .moe-emblem {
      width: 66px;
      height: 66px;
      border-radius: 20px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--moe-green), var(--moe-green-dark));
      color: white;
      font-weight: 900;
      font-size: 12px;
      border: 3px solid rgba(200,164,93,0.66);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18);
      flex: 0 0 auto;
    }

    .emblem-dots {
      display: grid;
      grid-template-columns: repeat(3, 5px);
      gap: 3px;
      margin-bottom: 3px;
    }

    .emblem-dots span {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: rgba(255,255,255,0.88);
    }

    .logo-img {
      width: 66px;
      height: 66px;
      border-radius: 18px;
      object-fit: contain;
      border: 1px solid var(--line);
      background: #fff;
      padding: 4px;
      flex: 0 0 auto;
    }

    .brand-text small {
      display: block;
      color: var(--moe-green);
      font-size: 12px;
      font-weight: 900;
      margin-bottom: 4px;
    }

    .brand-text strong {
      display: block;
      font-size: 14px;
      font-weight: 900;
      line-height: 1.5;
    }

    .title {
      text-align: center;
      min-width: 0;
    }

    .title h1 {
      margin: 0;
      font-size: 24px;
      color: var(--moe-green-dark);
      font-weight: 900;
      line-height: 1.5;
    }

    .title p {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }

    .print-info {
      text-align: left;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.9;
      font-weight: 800;
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 8px;
    }

    .qr {
      width: 58px;
      height: 58px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      padding: 3px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
      break-inside: avoid;
    }

    .meta-item {
      border: 1px solid var(--line);
      border-right: 4px solid var(--moe-green);
      border-radius: 12px;
      padding: 8px 10px;
      background: var(--soft);
      font-size: 11px;
      font-weight: 850;
      color: #334155;
      min-height: 36px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(${Math.min(statsCards.length, 7)}, 1fr);
      gap: 8px;
      margin-bottom: 10px;
      break-inside: avoid;
    }

    .stat {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 8px 10px;
      background: #fff;
      text-align: center;
      box-shadow: 0 4px 12px rgba(15,23,42,0.04);
    }

    .stat span {
      display: block;
      font-size: 10px;
      color: var(--muted);
      font-weight: 900;
      margin-bottom: 5px;
    }

    .stat strong {
      display: block;
      font-size: 17px;
      color: var(--moe-green-dark);
      font-weight: 900;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      direction: rtl;
      font-size: ${input.columns.length > 10 ? "9.4px" : "10.2px"};
      background: #fff;
    }

    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }

    th {
      background: var(--moe-green);
      color: white;
      border: 1px solid #b7c7bd;
      padding: 8px 5px;
      text-align: center;
      font-weight: 900;
      white-space: normal;
      line-height: 1.5;
    }

    .serial-head { width: 36px; }

    td {
      border: 1px solid var(--line);
      padding: 7px 5px;
      text-align: center;
      vertical-align: middle;
      line-height: 1.55;
      word-break: break-word;
      font-weight: 750;
    }

    tbody tr:nth-child(even) td { background: #f8fbf9; }

    .serial {
      color: var(--muted);
      font-weight: 900;
    }

    .success {
      color: var(--success);
      font-weight: 900;
      background: rgba(4,120,87,0.06);
    }

    .danger {
      color: var(--danger);
      font-weight: 900;
      background: rgba(185,28,28,0.06);
    }

    .excellent {
      color: var(--excellent);
      font-weight: 900;
      background: rgba(200,164,93,0.10);
    }

    .empty {
      padding: 22px;
      color: var(--muted);
      font-weight: 900;
    }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }

    .signatures {
      margin-top: 18px;
      display: grid;
      grid-template-columns: repeat(${Math.min(signatures.length, 5)}, 1fr);
      gap: 16px;
      page-break-inside: avoid;
    }

    .signature {
      text-align: center;
      min-height: 70px;
      color: #334155;
      font-size: 11px;
      font-weight: 900;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px 8px;
      background: rgba(255,255,255,0.82);
    }

    .signature .role {
      color: var(--moe-green-dark);
      margin-bottom: 18px;
    }

    .signature .line {
      border-top: 1px solid #94a3b8;
      padding-top: 7px;
    }

    .stamp {
      border: 1px dashed var(--moe-green);
      color: var(--muted);
      display: grid;
      place-items: center;
      min-height: 70px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 900;
      background: rgba(0,108,53,0.035);
    }

    .footer {
      margin-top: 14px;
      border-top: 2px solid var(--moe-green);
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      color: var(--muted);
      font-size: 10px;
      font-weight: 850;
      break-inside: avoid;
    }

    .print-actions {
      position: fixed;
      left: 16px;
      bottom: 16px;
      display: flex;
      gap: 8px;
      z-index: 99;
    }

    .print-actions button {
      border: 0;
      border-radius: 12px;
      padding: 10px 14px;
      cursor: pointer;
      font-weight: 900;
      background: var(--moe-green);
      color: white;
      box-shadow: 0 8px 20px rgba(0,0,0,0.18);
    }

    .print-actions button.secondary { background: #17212b; }

    @media print {
      .print-actions { display: none; }
      body { background: #fff; padding: 0; }
      .page { min-height: auto; overflow: visible; }
      .watermark { position: fixed; }
    }

    @media screen {
      body { background: #e5e7eb; padding: 18px; }
      .page {
        background: #fff;
        border-radius: 18px;
        padding: 14px;
        box-shadow: 0 12px 40px rgba(15, 23, 42, 0.16);
      }
    }

    @media (max-width: 900px) {
      .header { grid-template-columns: 1fr; text-align: center; }
      .brand { justify-content: center; }
      .print-info { text-align: center; grid-template-columns: 1fr; }
      .qr { margin: auto; }
      .meta-grid { grid-template-columns: 1fr 1fr; }
      .stats { grid-template-columns: 1fr 1fr; }
      .signatures { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <main class="page">
    ${showWatermark ? `<div class="watermark"></div>` : ""}
    <div class="content">
      <div class="top-band"></div>

      <section class="header">
        <div class="brand">
          ${logo}
          <div class="brand-text">
            <small>${escapeHtml(ministryName)}</small>
            <strong>${escapeHtml(schoolName)}</strong>
          </div>
        </div>

        <div class="title">
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(subtitle)}</p>
        </div>

        <div class="print-info">
          <div>
            <div>تاريخ الطباعة: ${escapeHtml(printedAt)}</div>
            <div>رقم التقرير: ${escapeHtml(reportNo)}</div>
            <div>عدد السجلات: ${arabicNumber(input.rows.length)}</div>
            ${options.printedBy ? `<div>طبع بواسطة: ${escapeHtml(options.printedBy)}</div>` : ""}
          </div>
          ${qr}
        </div>
      </section>

      ${
        meta.length
          ? `<section class="meta-grid">${meta
              .map((item) => `<div class="meta-item">${escapeHtml(item)}</div>`)
              .join("")}</section>`
          : ""
      }

      ${
        showStats
          ? `<section class="stats">
              ${statsCards
                .map(
                  ([label, value, suffix]) =>
                    `<div class="stat"><span>${escapeHtml(label)}</span><strong>${arabicNumber(Number(value || 0))}${suffix || ""}</strong></div>`,
                )
                .join("")}
            </section>`
          : ""
      }

      <table>
        <thead>
          <tr>${headersWithSerial}</tr>
        </thead>
        <tbody>${body}</tbody>
      </table>

      ${
        showSignatures
          ? `<section class="signatures">
              ${signatures
                .map(
                  (role) =>
                    `<div class="signature"><div class="role">${escapeHtml(role)}</div><div class="line">الاسم / التوقيع / التاريخ</div></div>`,
                )
                .join("")}
              <div class="stamp">الختم الرسمي</div>
            </section>`
          : ""
      }

      ${
        showFooter
          ? `<section class="footer">
              <div>${escapeHtml(platformName)}</div>
              <div>${escapeHtml(ministryName)} — تقرير إلكتروني قابل للطباعة والتحقق</div>
            </section>`
          : ""
      }
    </div>
  </main>

  <div class="print-actions">
    <button onclick="window.print()">طباعة / حفظ PDF</button>
    <button class="secondary" onclick="window.close()">إغلاق</button>
  </div>

  <script>
    window.addEventListener("load", () => {
      setTimeout(() => window.print(), 450);
    });
  </script>
</body>
</html>`;
}

function openPrintablePdf<T extends Record<string, unknown>>(input: {
  title: string;
  rows: T[];
  columns: ExportColumn<T>[];
  options?: PdfExportOptions;
}) {
  const html = createHtmlDocument(input);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(
    url,
    "_blank",
    "noopener,noreferrer,width=1280,height=900",
  );

  if (!win) {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(input.options?.fileName || input.title)}.html`;
    link.click();
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function processArabicText(doc: jsPDF, value: unknown) {
  const text = safeText(value);
  const api = doc as jsPDF & { processArabic?: (input: string) => string };
  return api.processArabic ? api.processArabic(text) : text;
}

function exportJsPdf<T extends Record<string, unknown>>(input: {
  title: string;
  rows: T[];
  columns: ExportColumn<T>[];
  options?: PdfExportOptions;
}) {
  const orientation = resolveOrientation(input.columns, input.options?.orientation);
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

  doc.setLanguage?.("ar-SA");
  doc.setR2L?.(true);
  doc.setFont("helvetica", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const right = pageWidth - 12;

  doc.setFontSize(14);
  doc.text(processArabicText(doc, input.title), right, 14, { align: "right" });

  autoTable(doc, {
    head: [
      input.columns
        .slice()
        .reverse()
        .map((column) => processArabicText(doc, column.header)),
    ],
    body: input.rows.map((row) =>
      input.columns
        .slice()
        .reverse()
        .map((column) => processArabicText(doc, valueOf(row, column))),
    ),
    startY: 24,
    styles: {
      font: "helvetica",
      fontSize: 8,
      halign: "right",
      valign: "middle",
      cellPadding: 2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [0, 108, 53],
      textColor: [255, 255, 255],
      halign: "right",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 10, right: 10 },
  });

  doc.save(`${safeFileName(input.options?.fileName || input.title)}.pdf`);
}

export const ExportEngine = {
  excel<T extends Record<string, unknown>>(
    filename: string,
    rows: T[],
    columns: ExportColumn<T>[],
    options?: ExcelExportOptions,
  ) {
    const data = rows.map((row) => {
      const output: Record<string, unknown> = {};
      columns.forEach((column) => {
        output[column.header] = valueOf(row, column);
      });
      return output;
    });

    const sheetRows =
      options?.includeMeta && options.meta
        ? [
            ...Object.entries(options.meta).map(([key, value]) => ({
              البيان: key,
              القيمة: value,
            })),
            {},
            ...data,
          ]
        : data;

    const worksheet = XLSX.utils.json_to_sheet(sheetRows, { skipHeader: false });
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");

    worksheet["!cols"] = Array.from(
      { length: range.e.c - range.s.c + 1 },
      () => ({ wch: 22 }),
    );

    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: options?.rtl ?? true }] };
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      safeText(options?.sheetName || "Data").slice(0, 31),
    );
    XLSX.writeFile(workbook, `${safeFileName(filename)}.xlsx`);
  },

  pdf<T extends Record<string, unknown>>(
    title: string,
    rows: T[],
    columns: ExportColumn<T>[],
    options?: PdfExportOptions,
  ) {
    const containsArabic =
      hasArabic(title) ||
      columns.some((column) => hasArabic(column.header)) ||
      rows.some((row) =>
        columns.some((column) => hasArabic(valueOf(row, column))),
      );

    if (containsArabic || options?.usePrintMode) {
      openPrintablePdf({ title, rows, columns, options });
      return;
    }

    exportJsPdf({ title, rows, columns, options });
  },

  print<T extends Record<string, unknown>>(
    title: string,
    rows: T[],
    columns: ExportColumn<T>[],
    options?: PdfExportOptions,
  ) {
    openPrintablePdf({
      title,
      rows,
      columns,
      options: { ...options, usePrintMode: true },
    });
  },

  csv<T extends Record<string, unknown>>(
    filename: string,
    rows: T[],
    columns: ExportColumn<T>[],
  ) {
    const header = columns.map((column) => column.header).join(",");
    const body = rows
      .map((row) =>
        columns
          .map((column) => `"${String(valueOf(row, column)).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${header}\n${body}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(filename)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },
};


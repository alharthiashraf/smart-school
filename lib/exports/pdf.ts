type PdfCell = string | number | null | undefined;

type ExportPDFOptions = {
  title: string;
  schoolName?: string;
  subtitle?: string;
  headers?: string[];
  rows: PdfCell[][] | Record<string, PdfCell>[];
  fileName?: string;
};

function safe(value: unknown) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function exportTableToPDF(
  headersOrOptions: string[] | ExportPDFOptions,
  rows?: PdfCell[][],
  title = "report"
) {
  const isObjectMode = !Array.isArray(headersOrOptions);

  const options: ExportPDFOptions = isObjectMode
    ? headersOrOptions
    : {
        title,
        headers: headersOrOptions,
        rows: rows || [],
      };

  const normalizedRows = Array.isArray(options.rows) ? options.rows : [];

  const headers =
    options.headers && options.headers.length
      ? options.headers
      : normalizedRows.length > 0 && !Array.isArray(normalizedRows[0])
        ? Object.keys(normalizedRows[0] as Record<string, PdfCell>)
        : [];

  const tableRows: PdfCell[][] = normalizedRows.map((row) => {
    if (Array.isArray(row)) return row;
    return headers.map((header) => (row as Record<string, PdfCell>)[header]);
  });

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${safe(options.title)}</title>
  <style>
    body {
      font-family: "Tahoma", "Arial", sans-serif;
      direction: rtl;
      padding: 24px;
      color: #111827;
    }

    .header {
      margin-bottom: 18px;
      border-bottom: 3px solid #d4af37;
      padding-bottom: 12px;
    }

    h1 {
      font-size: 22px;
      margin: 0 0 8px;
      color: #0f1f3d;
    }

    .school {
      font-size: 14px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 4px;
    }

    .subtitle {
      font-size: 13px;
      color: #64748b;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      direction: rtl;
      font-size: 12px;
    }

    th {
      background: #0f1f3d;
      color: white;
      padding: 9px;
      border: 1px solid #e5e7eb;
      text-align: center;
      font-weight: 700;
    }

    td {
      padding: 8px;
      border: 1px solid #e5e7eb;
      text-align: center;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    @media print {
      body { padding: 12px; }
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
    }
  </style>
</head>

<body>
  <div class="header">
    <h1>${safe(options.title)}</h1>
    ${options.schoolName ? `<div class="school">${safe(options.schoolName)}</div>` : ""}
    ${options.subtitle ? `<div class="subtitle">${safe(options.subtitle)}</div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        ${headers.map((h) => `<th>${safe(h)}</th>`).join("")}
      </tr>
    </thead>

    <tbody>
      ${tableRows
        .map(
          (row) => `
          <tr>
            ${row.map((cell) => `<td>${safe(cell)}</td>`).join("")}
          </tr>
        `
        )
        .join("")}
    </tbody>
  </table>

  <script>
    window.onload = function () {
      window.print();
    };
  </script>
</body>
</html>
`;

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("المتصفح منع فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

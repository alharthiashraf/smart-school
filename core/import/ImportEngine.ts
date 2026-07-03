import * as XLSX from "xlsx";

export type ImportSource = "noor" | "madrasati" | "timetable" | "smart_schedule" | "excel";

export type ImportColumnMap = Record<string, string>;

export type ImportPreview<T> = {
  source: ImportSource;
  rows: T[];
  headers: string[];
  totalRows: number;
  warnings: string[];
};

function normalizeHeader(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

export const ImportEngine = {
  async readWorkbook(file: File) {
    const buffer = await file.arrayBuffer();
    return XLSX.read(buffer, { type: "array" });
  },

  async readFirstSheet(file: File) {
    const workbook = await this.readWorkbook(file);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  },

  detectHeaders(rows: Record<string, unknown>[]) {
    return Object.keys(rows[0] ?? {});
  },

  autoMapHeaders(headers: string[], expected: Record<string, string[]>) {
    const map: ImportColumnMap = {};
    const normalized = headers.map((header) => ({ raw: header, norm: normalizeHeader(header) }));

    Object.entries(expected).forEach(([key, aliases]) => {
      const normalizedAliases = aliases.map(normalizeHeader);
      const found = normalized.find((header) => normalizedAliases.some((alias) => header.norm.includes(alias) || alias.includes(header.norm)));
      if (found) map[key] = found.raw;
    });

    return map;
  },

  buildPreview<T>(source: ImportSource, rows: T[], headers: string[], warnings: string[] = []): ImportPreview<T> {
    return { source, rows, headers, totalRows: rows.length, warnings };
  },
};

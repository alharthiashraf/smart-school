import * as XLSX from "xlsx";

type CellValue = string | number | boolean | null | undefined;

type ExcelConfig = {
  title?: string;
  schoolName?: string;
  subtitle?: string;
  headers: string[];
  rows: CellValue[][];
  fileName: string;
  sheetName?: string;
};

export function exportTableToExcel(
  arg1: Record<string, unknown>[] | string[] | ExcelConfig,
  arg2?: string | CellValue[][],
  arg3?: string,
) {
  let worksheet: XLSX.WorkSheet;
  let fileName = "export";
  let sheetName = "Sheet1";

  if (Array.isArray(arg1) && typeof arg2 === "string") {
    worksheet = XLSX.utils.json_to_sheet(arg1 as Record<string, unknown>[]);
    fileName = arg2;
  } else if (Array.isArray(arg1) && Array.isArray(arg2)) {
    worksheet = XLSX.utils.aoa_to_sheet([arg1 as string[], ...arg2]);
    fileName = arg3 || "export";
  } else {
    const config = arg1 as ExcelConfig;
    worksheet = XLSX.utils.aoa_to_sheet([config.headers, ...config.rows]);
    fileName = config.fileName || "export";
    sheetName = config.sheetName || "Sheet1";
  }

  XLSX.writeFile(
    (() => {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      return workbook;
    })(),
    fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`,
  );
}
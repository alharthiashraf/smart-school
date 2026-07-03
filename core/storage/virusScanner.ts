import { extensionFromName, DANGEROUS_EXTENSIONS } from "./mimeTypes";

export type VirusScanResult = { clean: boolean; issues: string[] };

export async function scanFileBeforeUpload(file: File | Blob, fileName?: string): Promise<VirusScanResult> {
  const issues: string[] = [];
  const name = typeof File !== "undefined" && file instanceof File ? file.name : fileName ?? "file";
  const ext = extensionFromName(name);

  if (ext && DANGEROUS_EXTENSIONS.includes(ext)) issues.push("امتداد الملف محظور أمنيًا.");
  if (file.size === 0) issues.push("الملف فارغ.");

  // Placeholder آمن: لا يوجد محرك فحص في المتصفح. اربطه لاحقًا بخدمة Server-side مثل ClamAV.
  return { clean: issues.length === 0, issues };
}

export const VirusScanner = { scan: scanFileBeforeUpload };

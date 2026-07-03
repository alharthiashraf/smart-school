import { DANGEROUS_EXTENSIONS, extensionFromName, SAFE_MIME_TYPES } from "./mimeTypes";
import type { StorageValidationResult, StorageValidationRule } from "./storage.types";

function getSize(file: File | Blob | ArrayBuffer | Uint8Array) {
  if (file instanceof ArrayBuffer) return file.byteLength;
  if (file instanceof Uint8Array) return file.byteLength;
  return file.size;
}

function getMime(file: File | Blob | ArrayBuffer | Uint8Array) {
  if (file instanceof ArrayBuffer || file instanceof Uint8Array) return null;
  return file.type || null;
}

function getName(file: File | Blob | ArrayBuffer | Uint8Array, fallback?: string) {
  if (typeof File !== "undefined" && file instanceof File) return file.name;
  return fallback ?? "file";
}

export function validateStorageFile(
  file: File | Blob | ArrayBuffer | Uint8Array,
  rule: StorageValidationRule = {},
  fallbackFileName?: string,
): StorageValidationResult {
  const errors: string[] = [];
  const size = getSize(file);
  const mimeType = getMime(file);
  const fileName = getName(file, fallbackFileName);
  const extension = extensionFromName(fileName);
  const maxSizeMB = rule.maxSizeMB ?? 25;

  if (size > maxSizeMB * 1024 * 1024) errors.push(`حجم الملف أكبر من الحد المسموح (${maxSizeMB}MB).`);
  if (extension && (rule.blockedExtensions ?? DANGEROUS_EXTENSIONS).includes(extension)) errors.push("نوع الملف غير مسموح لأسباب أمنية.");
  if (rule.allowedExtensions?.length && (!extension || !rule.allowedExtensions.includes(extension))) errors.push("امتداد الملف غير مدعوم.");
  if (rule.allowedMimeTypes?.length && mimeType && !rule.allowedMimeTypes.includes(mimeType)) errors.push("نوع الملف غير مدعوم.");
  if (!rule.allowedMimeTypes?.length && mimeType && !SAFE_MIME_TYPES.includes(mimeType)) errors.push("نوع الملف غير مصنف ضمن الأنواع الآمنة.");

  return { ok: errors.length === 0, errors, mimeType, extension, size };
}

export const StorageFileValidator = { validate: validateStorageFile };

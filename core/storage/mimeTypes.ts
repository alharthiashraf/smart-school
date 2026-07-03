export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
];
export const PRESENTATION_MIME_TYPES = [
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
export const ARCHIVE_MIME_TYPES = ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed"];
export const SAFE_MIME_TYPES = [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES, ...PRESENTATION_MIME_TYPES, ...ARCHIVE_MIME_TYPES];
export const DANGEROUS_EXTENSIONS = ["exe", "bat", "cmd", "com", "scr", "js", "vbs", "ps1", "msi", "sh"];

export function extensionFromName(fileName: string) {
  const clean = fileName.split("?")[0]?.split("#")[0] ?? fileName;
  const parts = clean.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : null;
}

export function guessMimeType(fileName: string) {
  const ext = extensionFromName(fileName);
  if (!ext) return "application/octet-stream";
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
    pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv", txt: "text/plain",
    ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", zip: "application/zip",
  };
  return map[ext] ?? "application/octet-stream";
}

import { supabase } from "@/lib/supabase";
import { isPublicBucket } from "./buckets";
import { guessMimeType } from "./mimeTypes";
import { validateStorageFile } from "./fileValidator";
import type { StorageUploadInput, StorageUploadResult } from "./storage.types";

function safeSegment(value: string) {
  return String(value || "")
    .trim()
    .replace(/[\\\/]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9_.\-\u0600-\u06FF]/g, "")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 120);
}

function extension(fileName: string) {
  const cleanName = String(fileName || "");
  const ext = cleanName.split(".").pop();

  return ext && ext !== cleanName ? `.${ext.toLowerCase()}` : "";
}

export function buildStoragePath(
  input: Omit<StorageUploadInput, "file" | "bucket">,
) {
  if (input.path) return input.path.replace(/^\/+/, "");

  const school = input.schoolId ? safeSegment(input.schoolId) : "global";
  const ownerType = input.ownerType ? safeSegment(input.ownerType) : "system";
  const ownerId = input.ownerId ? safeSegment(input.ownerId) : "general";
  const folder = input.folder ? `${safeSegment(input.folder)}/` : "";

  const originalName = input.fileName || `file-${Date.now()}`;
  const ext = extension(originalName);
  const baseName = safeSegment(
    ext ? originalName.slice(0, -ext.length) : originalName,
  ) || `file-${Date.now()}`;

  return `${school}/${ownerType}/${ownerId}/${folder}${baseName}-${Date.now()}${ext}`;
}

export async function uploadStorageFile(
  input: StorageUploadInput,
): Promise<StorageUploadResult> {
  const fileName =
    input.fileName ??
    (typeof File !== "undefined" && input.file instanceof File
      ? input.file.name
      : "file.bin");

  const validation =
    input.validate === false
      ? {
          ok: true,
          errors: [],
          size: null,
          mimeType: null,
          extension: null,
        }
      : validateStorageFile(input.file, {}, fileName);

  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  const path = buildStoragePath({
    path: input.path,
    schoolId: input.schoolId,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    folder: input.folder,
    fileName,
    metadata: input.metadata,
    contentType: input.contentType,
    cacheControl: input.cacheControl,
    upsert: input.upsert,
    validate: input.validate,
  });

  const contentType =
    input.contentType ?? validation.mimeType ?? guessMimeType(fileName);

  const { data, error } = await supabase.storage
    .from(input.bucket)
    .upload(path, input.file, {
      upsert: input.upsert ?? false,
      contentType,
      cacheControl: input.cacheControl ?? "3600",
    });

  if (error) throw error;

  const publicUrl = isPublicBucket(input.bucket)
    ? supabase.storage.from(input.bucket).getPublicUrl(data.path).data.publicUrl
    : null;

  return {
    bucket: input.bucket,
    path: data.path,
    fullPath: data.fullPath,
    publicUrl,
    contentType,
    size: validation.size,
    metadata: input.metadata,
  };
}

export const StorageUpload = {
  upload: uploadStorageFile,
  buildPath: buildStoragePath,
};

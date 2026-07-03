import type { FileOptions } from "@supabase/storage-js";

export type StorageBucketKey =
  | "SCHOOL_LOGOS"
  | "STUDENT_PHOTOS"
  | "TEACHER_PHOTOS"
  | "TEACHER_FILES"
  | "STUDENT_FILES"
  | "BEHAVIOR_FILES"
  | "HEALTH_FILES"
  | "GUIDANCE_FILES"
  | "ACTIVITY_FILES"
  | "REPORTS"
  | "IMPORTS"
  | "EXPORTS"
  | "TEMP";

export type StorageAccess = "public" | "signed" | "private";

export type StorageOwnerType =
  | "school"
  | "student"
  | "teacher"
  | "staff"
  | "parent"
  | "system"
  | "report"
  | "import"
  | "export"
  | "temp";

export type StorageUploadInput = {
  bucket: string;
  file: File | Blob | ArrayBuffer | Uint8Array;
  path?: string;
  fileName?: string;
  schoolId?: string | null;
  ownerType?: StorageOwnerType;
  ownerId?: string | null;
  folder?: string | null;
  upsert?: boolean;
  contentType?: string | null;
  cacheControl?: string;
  metadata?: Record<string, unknown>;
  validate?: boolean;
};

export type StorageUploadResult = {
  bucket: string;
  path: string;
  fullPath: string;
  publicUrl: string | null;
  contentType: string | null;
  size: number | null;
  metadata?: Record<string, unknown>;
};

export type StorageDownloadInput = {
  bucket: string;
  path: string;
};

export type StorageSignedUrlInput = {
  bucket: string;
  path: string;
  expiresIn?: number;
  transform?: {
    width?: number;
    height?: number;
    resize?: "cover" | "contain" | "fill";
    quality?: number;
    format?: "origin";
  };
};

export type StoragePreviewInput = {
  bucket: string;
  path: string;
  access?: StorageAccess;
  expiresIn?: number;
};

export type StorageMoveInput = {
  bucket: string;
  fromPath: string;
  toPath: string;
};

export type StorageCopyInput = StorageMoveInput;

export type StorageDeleteInput = {
  bucket: string;
  paths: string[];
};

export type StorageValidationRule = {
  maxSizeMB?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  blockedExtensions?: string[];
};

export type StorageValidationResult = {
  ok: boolean;
  errors: string[];
  mimeType: string | null;
  extension: string | null;
  size: number | null;
};

export type StorageQuotaUsage = {
  bucket: string;
  files: number;
  bytes: number;
  megabytes: number;
};

export type StorageListOptions = {
  bucket: string;
  path?: string;
  limit?: number;
  offset?: number;
  sortBy?: { column: "name" | "created_at" | "updated_at" | "last_accessed_at"; order: "asc" | "desc" };
  search?: string;
};

export type StorageClientUploadOptions = Pick<FileOptions, "cacheControl" | "contentType" | "upsert">;

import { supabase } from "@/lib/supabase";
import { isPublicBucket } from "./buckets";
import { createSignedUrl } from "./signedUrls";
import type { StoragePreviewInput } from "./storage.types";

export async function getStoragePreviewUrl(input: StoragePreviewInput) {
  const access = input.access ?? (isPublicBucket(input.bucket) ? "public" : "signed");
  if (access === "public") {
    const { data } = supabase.storage.from(input.bucket).getPublicUrl(input.path);
    return data.publicUrl;
  }
  return createSignedUrl({ bucket: input.bucket, path: input.path, expiresIn: input.expiresIn });
}

export const StoragePreview = { getUrl: getStoragePreviewUrl };


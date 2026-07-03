import { createSignedUrl } from "./signedUrls";
import { isPublicBucket } from "./buckets";
import { supabase } from "@/lib/supabase";

export type ThumbnailOptions = { width?: number; height?: number; quality?: number; expiresIn?: number };

export async function getImageThumbnailUrl(bucket: string, path: string, options: ThumbnailOptions = {}) {
  const transform = {
    width: options.width ?? 240,
    height: options.height ?? 240,
    resize: "cover" as const,
    quality: options.quality ?? 75,
  };

  if (isPublicBucket(bucket)) {
    return supabase.storage.from(bucket).getPublicUrl(path, { transform }).data.publicUrl;
  }

  return createSignedUrl({ bucket, path, expiresIn: options.expiresIn ?? 60 * 10, transform });
}

export const StorageThumbnails = { getUrl: getImageThumbnailUrl };

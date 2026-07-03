import { supabase } from "@/lib/supabase";
import type { StorageQuotaUsage } from "./storage.types";

async function walk(bucket: string, path = "", acc: { files: number; bytes: number }) {
  const { data, error } = await supabase.storage.from(bucket).list(path, { limit: 1000, offset: 0 });
  if (error) throw error;

  for (const item of data ?? []) {
    const fullPath = path ? `${path}/${item.name}` : item.name;
    if (item.metadata && typeof item.metadata.size === "number") {
      acc.files += 1;
      acc.bytes += item.metadata.size;
    } else if (!item.id) {
      await walk(bucket, fullPath, acc);
    }
  }
}

export async function calculateBucketUsage(bucket: string, path = ""): Promise<StorageQuotaUsage> {
  const acc = { files: 0, bytes: 0 };
  await walk(bucket, path, acc);
  return { bucket, files: acc.files, bytes: acc.bytes, megabytes: Math.round((acc.bytes / 1024 / 1024) * 100) / 100 };
}

export function isQuotaExceeded(usage: StorageQuotaUsage, maxMB: number) {
  return usage.megabytes > maxMB;
}

export const StorageQuota = { calculate: calculateBucketUsage, isExceeded: isQuotaExceeded };

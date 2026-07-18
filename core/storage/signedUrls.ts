import { supabase } from "@/lib/supabase";
import type { StorageSignedUrlInput } from "./storage.types";

export async function createSignedUrl(input: StorageSignedUrlInput) {
  const { data, error } = await supabase.storage
    .from(input.bucket)
    .createSignedUrl(input.path, input.expiresIn ?? 60 * 10, input.transform ? { transform: input.transform } : undefined);

  if (error) throw error;
  return data.signedUrl;
}

export async function createSignedUrls(bucket: string, paths: string[], expiresIn = 60 * 10) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresIn);
  if (error) throw error;
  return data ?? [];
}

export const StorageSignedUrls = { create: createSignedUrl, createMany: createSignedUrls };


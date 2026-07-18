import { supabase } from "@/lib/supabase";
import type { StorageDeleteInput } from "./storage.types";

export async function deleteStorageFiles(input: StorageDeleteInput) {
  if (input.paths.length === 0) return [];
  const { data, error } = await supabase.storage.from(input.bucket).remove(input.paths);
  if (error) throw error;
  return data ?? [];
}

export async function deleteStorageFile(bucket: string, path: string) {
  return deleteStorageFiles({ bucket, paths: [path] });
}

export const StorageDelete = { one: deleteStorageFile, many: deleteStorageFiles };


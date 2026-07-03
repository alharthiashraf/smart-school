import { supabase } from "@/lib/supabase";
import type { StorageCopyInput } from "./storage.types";

export async function copyStorageFile(input: StorageCopyInput) {
  const { data, error } = await supabase.storage.from(input.bucket).copy(input.fromPath, input.toPath);
  if (error) throw error;
  return data;
}

export const StorageCopy = { copy: copyStorageFile };

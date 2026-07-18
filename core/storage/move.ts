import { supabase } from "@/lib/supabase";
import type { StorageMoveInput } from "./storage.types";

export async function moveStorageFile(input: StorageMoveInput) {
  const { data, error } = await supabase.storage.from(input.bucket).move(input.fromPath, input.toPath);
  if (error) throw error;
  return data;
}

export const StorageMove = { move: moveStorageFile };


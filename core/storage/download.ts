import { supabase } from "@/lib/supabase";
import type { StorageDownloadInput } from "./storage.types";

export async function downloadStorageFile(input: StorageDownloadInput) {
  const { data, error } = await supabase.storage.from(input.bucket).download(input.path);
  if (error) throw error;
  return data;
}

export async function downloadStorageText(input: StorageDownloadInput) {
  const blob = await downloadStorageFile(input);
  return blob.text();
}

export const StorageDownload = { file: downloadStorageFile, text: downloadStorageText };


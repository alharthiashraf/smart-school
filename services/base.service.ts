import { supabase } from "@/lib/supabase";

export type ServiceResult<T> = {
  data: T | null;
  error: string | null;
};

export function handleError(error: unknown) {
  if (!error) return null;

  if (typeof error === "string") return error;

  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "حدث خطأ غير متوقع";
}

export async function selectAll<T>(
  table: string,
  query = "*",
): Promise<ServiceResult<T[]>> {
  const { data, error } = await supabase.from(table).select(query);

  return {
    data: (data as T[]) ?? [],
    error: handleError(error),
  };
}

export async function selectById<T>(
  table: string,
  id: string,
  query = "*",
): Promise<ServiceResult<T>> {
  const { data, error } = await supabase
    .from(table)
    .select(query)
    .eq("id", id)
    .single();

  return {
    data: (data as T) ?? null,
    error: handleError(error),
  };
}

export async function insertRow<T extends Record<string, unknown>>(
  table: string,
  payload: Partial<T>,
): Promise<ServiceResult<T>> {
  const { data, error } = await supabase
    .from(table)
    .insert(payload as Record<string, unknown>)
    .select("*")
    .single();

  return {
    data: (data as T) ?? null,
    error: handleError(error),
  };
}

export async function updateRow<T extends Record<string, unknown>>(
  table: string,
  id: string,
  payload: Partial<T>,
): Promise<ServiceResult<T>> {
  const { data, error } = await supabase
    .from(table)
    .update(payload as Record<string, unknown>)
    .eq("id", id)
    .select("*")
    .single();

  return {
    data: (data as T) ?? null,
    error: handleError(error),
  };
}

export async function deleteRow(
  table: string,
  id: string,
): Promise<ServiceResult<boolean>> {
  const { error } = await supabase.from(table).delete().eq("id", id);

  return {
    data: !error,
    error: handleError(error),
  };
}

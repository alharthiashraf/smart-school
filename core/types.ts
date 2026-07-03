export type ID = string;

export type CoreResult<T> =
  | { ok: true; data: T; error?: never }
  | { ok: false; data?: never; error: string; details?: unknown };

export function ok<T>(data: T): CoreResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(error: string, details?: unknown): CoreResult<T> {
  return { ok: false, error, details };
}

export type SortDirection = "asc" | "desc";

export type Pagination = {
  page?: number;
  pageSize?: number;
};

export type DateRange = {
  from?: string | null;
  to?: string | null;
};

"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDownUp } from "lucide-react";
import EmptyState from "../feedback/EmptyState";
import Pagination from "./Pagination";

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
};

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  getRowKey?: (row: T, index: number) => string;
  className?: string;
};

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  pageSize = 10,
  emptyTitle = "لا توجد بيانات",
  emptyDescription = "لم يتم العثور على سجلات مطابقة.",
  getRowKey,
  className = "",
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aValue = String(a[sortKey] ?? "");
      const bValue = String(b[sortKey] ?? "");

      return sortDirection === "asc"
        ? aValue.localeCompare(bValue, "ar")
        : bValue.localeCompare(aValue, "ar");
    });
  }, [data, sortKey, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }

    setPage(1);
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-4 text-right text-xs font-black text-slate-500 ${
                    column.headerClassName ?? ""
                  }`}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(String(column.key))}
                      className="inline-flex items-center gap-2 transition hover:text-emerald-700"
                    >
                      {column.header}
                      <ArrowDownUp className="h-3.5 w-3.5 opacity-70" />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((row, index) => (
              <tr
                key={getRowKey ? getRowKey(row, index) : String(index)}
                className="border-b border-slate-100 transition hover:bg-emerald-50/40"
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`px-4 py-4 align-top text-sm leading-7 text-slate-700 ${
                      column.className ?? ""
                    }`}
                  >
                    {column.render
                      ? column.render(row, index)
                      : String(row[column.key] ?? "غير متوفر")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={sortedData.length}
        onPageChange={setPage}
      />
    </div>
  );
}
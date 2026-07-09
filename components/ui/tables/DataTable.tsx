"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDownUp, Check } from "lucide-react";

import DataTableEmpty from "./DataTableEmpty";
import DataTableLoading from "./DataTableLoading";
import DataTablePagination from "./DataTablePagination";
import DataTableToolbar from "./DataTableToolbar";

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  hidden?: boolean;
};

export type DataTableAction<T> = {
  label: string;
  icon?: ReactNode;
  onClick: (rows: T[]) => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  disabled?: boolean;
};

type DataTableDensity = "comfortable" | "compact";

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];

  title?: string;
  description?: string;
  toolbar?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  bulkActions?: DataTableAction<T>[];

  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  loading?: boolean;
  loadingRows?: number;

  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;

  selectable?: boolean;
  getRowKey?: (row: T, index: number) => string;

  density?: DataTableDensity;
  className?: string;
};

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  title,
  description,
  toolbar,
  filters,
  actions,
  bulkActions,
  searchable = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = "ابحث داخل الجدول...",
  loading = false,
  loadingRows = 6,
  pageSize = 10,
  emptyTitle = "لا توجد بيانات",
  emptyDescription = "لم يتم العثور على سجلات مطابقة.",
  selectable = false,
  getRowKey,
  density = "comfortable",
  className = "",
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [localSearch, setLocalSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const activeSearch = searchValue ?? localSearch;

  const visibleColumns = useMemo(
    () => columns.filter((column) => !column.hidden),
    [columns],
  );

  const filteredData = useMemo(() => {
    const q = activeSearch.trim().toLowerCase();

    if (!q || searchValue !== undefined) return data;

    return data.filter((row) =>
      visibleColumns.some((column) =>
        String(row[column.key] ?? "").toLowerCase().includes(q),
      ),
    );
  }, [activeSearch, data, searchValue, visibleColumns]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = String(a[sortKey] ?? "");
      const bValue = String(b[sortKey] ?? "");

      return sortDirection === "asc"
        ? aValue.localeCompare(bValue, "ar")
        : bValue.localeCompare(aValue, "ar");
    });
  }, [filteredData, sortKey, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const selectedRows = useMemo(() => {
    return data.filter((row, index) =>
      selectedKeys.includes(getRowId(row, index)),
    );
  }, [data, selectedKeys]);

  const allPageKeys = paginatedData.map((row, index) => getRowId(row, index));
  const allPageSelected =
    allPageKeys.length > 0 && allPageKeys.every((key) => selectedKeys.includes(key));

  function getRowId(row: T, index: number) {
    return getRowKey ? getRowKey(row, index) : String(index);
  }

  function setSearch(value: string) {
    setPage(1);

    if (onSearchChange) {
      onSearchChange(value);
      return;
    }

    setLocalSearch(value);
  }

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }

    setPage(1);
  }

  function toggleRow(key: string) {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  }

  function togglePageSelection() {
    setSelectedKeys((prev) => {
      if (allPageSelected) {
        return prev.filter((key) => !allPageKeys.includes(key));
      }

      return Array.from(new Set([...prev, ...allPageKeys]));
    });
  }

  const hasToolbar =
    title ||
    description ||
    toolbar ||
    filters ||
    actions ||
    searchable ||
    (bulkActions && bulkActions.length > 0);

  return (
    <section
      className={[
        "overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-sm",
        className,
      ].join(" ")}
    >
      {hasToolbar && (
        <DataTableToolbar
          title={title}
          description={description}
          search={
            searchable
              ? {
                  value: activeSearch,
                  onChange: setSearch,
                  placeholder: searchPlaceholder,
                }
              : undefined
          }
          filters={filters}
          actions={actions}
          bulkActions={bulkActions}
          selectedRows={selectedRows}
          customContent={toolbar}
        />
      )}

      {loading ? (
        <DataTableLoading columns={visibleColumns.length + (selectable ? 1 : 0)} rows={loadingRows} />
      ) : sortedData.length === 0 ? (
        <DataTableEmpty title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--app-border)] bg-[var(--app-card-soft)]">
                  {selectable && (
                    <th className="w-12 px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={togglePageSelection}
                        className={[
                          "flex h-5 w-5 items-center justify-center rounded-md border transition",
                          allPageSelected
                            ? "border-[var(--app-teal)] bg-[var(--app-teal)] text-white"
                            : "border-[var(--app-border)] bg-[var(--app-card)] text-transparent",
                        ].join(" ")}
                        aria-label="تحديد الكل"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </th>
                  )}

                  {visibleColumns.map((column) => (
                    <th
                      key={String(column.key)}
                      className={[
                        "px-4 text-right text-xs font-black text-[var(--app-text-muted)]",
                        density === "compact" ? "py-3" : "py-4",
                        column.headerClassName ?? "",
                      ].join(" ")}
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(String(column.key))}
                          className="inline-flex items-center gap-2 transition hover:text-[var(--app-teal)]"
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
                {paginatedData.map((row, index) => {
                  const rowKey = getRowId(row, index);
                  const selected = selectedKeys.includes(rowKey);

                  return (
                    <tr
                      key={rowKey}
                      className={[
                        "border-b border-[var(--app-border)] transition hover:bg-[var(--app-teal-soft)]",
                        selected ? "bg-[var(--app-teal-soft)]" : "",
                      ].join(" ")}
                    >
                      {selectable && (
                        <td className="px-4 py-4 align-top">
                          <button
                            type="button"
                            onClick={() => toggleRow(rowKey)}
                            className={[
                              "flex h-5 w-5 items-center justify-center rounded-md border transition",
                              selected
                                ? "border-[var(--app-teal)] bg-[var(--app-teal)] text-white"
                                : "border-[var(--app-border)] bg-[var(--app-card)] text-transparent",
                            ].join(" ")}
                            aria-label="تحديد الصف"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}

                      {visibleColumns.map((column) => (
                        <td
                          key={String(column.key)}
                          className={[
                            "px-4 align-top text-sm leading-7 text-[var(--app-text)]",
                            density === "compact" ? "py-3" : "py-4",
                            column.className ?? "",
                          ].join(" ")}
                        >
                          {column.render
                            ? column.render(row, index)
                            : String(row[column.key] ?? "غير متوفر")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={sortedData.length}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

export type DataTableDensity = "comfortable" | "compact";

export type DataTableProps<T> = {
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

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ar");
}

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
  className,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [localSearch, setLocalSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const activeSearch = searchValue ?? localSearch;
  const safePageSize = Math.max(1, pageSize);

  const getRowId = useCallback(
    (row: T, index: number) => {
      if (getRowKey) return getRowKey(row, index);

      const intrinsicId = row.id;

      if (typeof intrinsicId === "string" || typeof intrinsicId === "number") {
        return String(intrinsicId);
      }

      return String(index);
    },
    [getRowKey],
  );

  const visibleColumns = useMemo(
    () => columns.filter((column) => !column.hidden),
    [columns],
  );

  const filteredData = useMemo(() => {
    const query = normalizeSearchValue(activeSearch);

    if (!query || searchValue !== undefined) return data;

    return data.filter((row) =>
      visibleColumns.some((column) =>
        normalizeSearchValue(row[column.key]).includes(query),
      ),
    );
  }, [activeSearch, data, searchValue, visibleColumns]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((firstRow, secondRow) => {
      const firstValue = String(firstRow[sortKey] ?? "");
      const secondValue = String(secondRow[sortKey] ?? "");

      const comparison = firstValue.localeCompare(secondValue, "ar", {
        numeric: true,
        sensitivity: "base",
      });

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / safePageSize));

  useEffect(() => {
    setPage((currentPage) => Math.min(Math.max(currentPage, 1), totalPages));
  }, [totalPages]);

  const pageStartIndex = (page - 1) * safePageSize;

  const paginatedData = useMemo(
    () => sortedData.slice(pageStartIndex, pageStartIndex + safePageSize),
    [pageStartIndex, safePageSize, sortedData],
  );

  const selectedRows = useMemo(
    () =>
      data.filter((row, index) =>
        selectedKeys.includes(getRowId(row, index)),
      ),
    [data, getRowId, selectedKeys],
  );

  const allPageKeys = useMemo(
    () =>
      paginatedData.map((row, index) =>
        getRowId(row, pageStartIndex + index),
      ),
    [getRowId, pageStartIndex, paginatedData],
  );

  const allPageSelected =
    allPageKeys.length > 0 &&
    allPageKeys.every((key) => selectedKeys.includes(key));

  const hasToolbar = Boolean(
    title ||
      description ||
      toolbar ||
      filters ||
      actions ||
      searchable ||
      bulkActions?.length,
  );

  function setSearch(value: string) {
    setPage(1);
    setSelectedKeys([]);

    if (onSearchChange) {
      onSearchChange(value);
      return;
    }

    setLocalSearch(value);
  }

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc",
      );
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }

    setPage(1);
  }

  function toggleRow(key: string) {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function togglePageSelection() {
    setSelectedKeys((current) => {
      if (allPageSelected) {
        return current.filter((key) => !allPageKeys.includes(key));
      }

      return Array.from(new Set([...current, ...allPageKeys]));
    });
  }

  return (
    <section
      className={[
        "overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-busy={loading}
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
        <DataTableLoading
          columns={visibleColumns.length + (selectable ? 1 : 0)}
          rows={loadingRows}
        />
      ) : sortedData.length === 0 ? (
        <DataTableEmpty
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--app-border)] bg-[var(--app-card-soft)]">
                  {selectable && (
                    <th scope="col" className="w-12 px-4 py-4 text-right">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={allPageSelected}
                        aria-label="تحديد جميع صفوف الصفحة"
                        onClick={togglePageSelection}
                        className={[
                          "flex h-5 w-5 items-center justify-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-card)]",
                          allPageSelected
                            ? "border-[var(--app-primary)] bg-[var(--app-primary)] text-[var(--app-primary-foreground)]"
                            : "border-[var(--app-border)] bg-[var(--app-card)] text-transparent",
                        ].join(" ")}
                      >
                        <Check aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                    </th>
                  )}

                  {visibleColumns.map((column) => {
                    const columnKey = String(column.key);
                    const isActiveSort = sortKey === columnKey;

                    return (
                      <th
                        key={columnKey}
                        scope="col"
                        aria-sort={
                          isActiveSort
                            ? sortDirection === "asc"
                              ? "ascending"
                              : "descending"
                            : undefined
                        }
                        className={[
                          "px-4 text-right text-xs font-black text-[var(--app-text-muted)]",
                          density === "compact" ? "py-3" : "py-4",
                          column.headerClassName,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {column.sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(columnKey)}
                            className="inline-flex items-center gap-2 rounded-md transition hover:text-[var(--app-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary-soft)]"
                          >
                            {column.header}
                            <ArrowDownUp
                              aria-hidden="true"
                              className={[
                                "h-3.5 w-3.5",
                                isActiveSort ? "opacity-100" : "opacity-60",
                              ].join(" ")}
                            />
                          </button>
                        ) : (
                          column.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {paginatedData.map((row, index) => {
                  const absoluteIndex = pageStartIndex + index;
                  const rowKey = getRowId(row, absoluteIndex);
                  const selected = selectedKeys.includes(rowKey);

                  return (
                    <tr
                      key={rowKey}
                      className={[
                        "border-b border-[var(--app-border)] transition last:border-b-0 hover:bg-[var(--app-primary-soft)]",
                        selected ? "bg-[var(--app-primary-soft)]" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {selectable && (
                        <td className="px-4 py-4 align-top">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={selected}
                            aria-label={`تحديد الصف ${absoluteIndex + 1}`}
                            onClick={() => toggleRow(rowKey)}
                            className={[
                              "flex h-5 w-5 items-center justify-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-card)]",
                              selected
                                ? "border-[var(--app-primary)] bg-[var(--app-primary)] text-[var(--app-primary-foreground)]"
                                : "border-[var(--app-border)] bg-[var(--app-card)] text-transparent",
                            ].join(" ")}
                          >
                            <Check aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}

                      {visibleColumns.map((column) => (
                        <td
                          key={String(column.key)}
                          className={[
                            "px-4 align-top text-sm leading-7 text-[var(--app-text)]",
                            density === "compact" ? "py-3" : "py-4",
                            column.className,
                          ]
                            .filter(Boolean)
                            .join(" ")}
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
            pageSize={safePageSize}
            total={sortedData.length}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  );
}


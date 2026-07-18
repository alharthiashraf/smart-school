"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import SecondaryButton from "../buttons/SecondaryButton";

export type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export default function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: DataTablePaginationProps) {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const start =
    total === 0 ? 0 : (currentPage - 1) * safePageSize + 1;

  const end = Math.min(currentPage * safePageSize, total);

  return (
    <nav
      aria-label="ترقيم صفحات الجدول"
      className={[
        "flex flex-col gap-3 border-t border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-4 text-sm font-bold text-[var(--app-text-muted)] sm:flex-row sm:items-center sm:justify-between",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="text-xs text-[var(--app-text-muted)]">
        عرض{" "}
        <span className="font-black text-[var(--app-text)]">
          {start}
        </span>{" "}
        إلى{" "}
        <span className="font-black text-[var(--app-text)]">
          {end}
        </span>{" "}
        من{" "}
        <span className="font-black text-[var(--app-text)]">
          {total}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SecondaryButton
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          icon={<ChevronRight aria-hidden="true" className="h-4 w-4" />}
        >
          السابق
        </SecondaryButton>

        <span
          className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-2 text-xs font-black text-[var(--app-text)] shadow-sm"
          aria-live="polite"
        >
          صفحة{" "}
          <span dir="ltr">
            {currentPage} / {totalPages}
          </span>
        </span>

        <SecondaryButton
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          icon={<ChevronLeft aria-hidden="true" className="h-4 w-4" />}
        >
          التالي
        </SecondaryButton>
      </div>
    </nav>
  );
}

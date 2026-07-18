"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import SecondaryButton from "../buttons/SecondaryButton";

export type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const safeTotal = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(page, 1), safeTotal);

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-2"
      aria-label="ترقيم الصفحات"
    >
      <SecondaryButton
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        icon={<ChevronRight aria-hidden="true" className="h-4 w-4" />}
      >
        السابق
      </SecondaryButton>

      <span
        className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-2 text-xs font-black text-[var(--app-text)] shadow-sm"
        aria-live="polite"
      >
        صفحة {currentPage} من {safeTotal}
      </span>

      <SecondaryButton
        type="button"
        onClick={() => onPageChange(Math.min(safeTotal, currentPage + 1))}
        disabled={currentPage >= safeTotal}
        icon={<ChevronLeft aria-hidden="true" className="h-4 w-4" />}
      >
        التالي
      </SecondaryButton>
    </nav>
  );
}

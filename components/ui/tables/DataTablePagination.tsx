"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import SecondaryButton from "../buttons/SecondaryButton";

type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export default function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-4 text-sm font-bold text-[var(--app-text-muted)] sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-[var(--app-text-muted)]">
        عرض <span className="font-black text-[var(--app-text)]">{start}</span> إلى{" "}
        <span className="font-black text-[var(--app-text)]">{end}</span> من{" "}
        <span className="font-black text-[var(--app-text)]">{total}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SecondaryButton
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          icon={<ChevronRight className="h-4 w-4" />}
        >
          السابق
        </SecondaryButton>

        <span className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-2 text-xs font-black text-[var(--app-text)] shadow-sm">
          صفحة {page} من {totalPages}
        </span>

        <SecondaryButton
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          التالي
        </SecondaryButton>
      </div>
    </div>
  );
}

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import SecondaryButton from "../buttons/SecondaryButton";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm font-bold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <div>
        عرض {start} - {end} من {total}
      </div>

      <div className="flex items-center gap-2">
        <SecondaryButton
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          icon={<ChevronRight className="h-4 w-4" />}
        >
          السابق
        </SecondaryButton>

        <span className="rounded-2xl bg-slate-50 px-4 py-2">
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
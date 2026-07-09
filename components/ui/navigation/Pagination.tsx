"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import SecondaryButton from "../buttons/SecondaryButton";

type PaginationProps = {
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

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <SecondaryButton
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        icon={<ChevronRight className="h-4 w-4" />}
      >
        السابق
      </SecondaryButton>

      <span className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm">
        صفحة {page} من {safeTotal}
      </span>

      <SecondaryButton
        onClick={() => onPageChange(Math.min(safeTotal, page + 1))}
        disabled={page >= safeTotal}
        icon={<ChevronLeft className="h-4 w-4" />}
      >
        التالي
      </SecondaryButton>
    </div>
  );
}
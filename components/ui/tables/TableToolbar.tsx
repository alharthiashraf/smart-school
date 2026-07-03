"use client";

import type { ReactNode } from "react";
import { Download, Printer, RefreshCcw } from "lucide-react";
import SearchBar from "../forms/SearchBar";
import PrimaryButton from "../buttons/PrimaryButton";
import SecondaryButton from "../buttons/SecondaryButton";

type TableToolbarProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onRefresh?: () => void;
  onPrint?: () => void;
  onExportExcel?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  filters?: ReactNode;
  actions?: ReactNode;
};

export default function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "بحث...",
  onRefresh,
  onPrint,
  onExportExcel,
  onAdd,
  addLabel = "إضافة",
  filters,
  actions,
}: TableToolbarProps) {
  return (
    <div className="space-y-3 border-b border-slate-100 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-md">
          {typeof search === "string" && onSearchChange && (
            <SearchBar
              value={search}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {actions}

          {onRefresh && (
            <SecondaryButton
              onClick={onRefresh}
              icon={<RefreshCcw className="h-4 w-4" />}
            >
              تحديث
            </SecondaryButton>
          )}

          {onPrint && (
            <SecondaryButton
              onClick={onPrint}
              icon={<Printer className="h-4 w-4" />}
            >
              طباعة
            </SecondaryButton>
          )}

          {onExportExcel && (
            <SecondaryButton
              tone="warning"
              onClick={onExportExcel}
              icon={<Download className="h-4 w-4" />}
            >
              Excel
            </SecondaryButton>
          )}

          {onAdd && (
            <PrimaryButton onClick={onAdd}>
              {addLabel}
            </PrimaryButton>
          )}
        </div>
      </div>

      {filters && <div>{filters}</div>}
    </div>
  );
}
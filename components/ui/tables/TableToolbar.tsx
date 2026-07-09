"use client";

import type { ReactNode } from "react";
import {
  Download,
  Plus,
  Printer,
  RefreshCcw,
} from "lucide-react";

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

  className?: string;
};

export default function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "ابحث داخل الجدول...",

  onRefresh,
  onPrint,
  onExportExcel,

  onAdd,
  addLabel = "إضافة",

  filters,
  actions,

  className = "",
}: TableToolbarProps) {
  return (
    <div
      className={`border-b border-slate-200 bg-slate-50/40 p-5 ${className}`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="w-full xl:max-w-md">
          {typeof search === "string" && onSearchChange && (
            <SearchBar
              value={search}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions}

          {onRefresh && (
            <SecondaryButton
              onClick={onRefresh}
              icon={<RefreshCcw size={18} />}
            >
              تحديث
            </SecondaryButton>
          )}

          {onPrint && (
            <SecondaryButton
              onClick={onPrint}
              icon={<Printer size={18} />}
            >
              طباعة
            </SecondaryButton>
          )}

          {onExportExcel && (
            <SecondaryButton
              tone="warning"
              onClick={onExportExcel}
              icon={<Download size={18} />}
            >
              Excel
            </SecondaryButton>
          )}

          {onAdd && (
            <PrimaryButton
              onClick={onAdd}
              icon={<Plus size={18} />}
            >
              {addLabel}
            </PrimaryButton>
          )}
        </div>
      </div>

      {filters && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          {filters}
        </div>
      )}
    </div>
  );
}
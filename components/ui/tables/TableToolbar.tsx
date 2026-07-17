"use client";

import type { ReactNode } from "react";
import { Download, Plus, Printer, RefreshCcw } from "lucide-react";

import ExportButton from "../buttons/ExportButton";
import PrimaryButton from "../buttons/PrimaryButton";
import SecondaryButton from "../buttons/SecondaryButton";
import TableSearch from "./TableSearch";

export type TableToolbarProps = {
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
  className,
}: TableToolbarProps) {
  return (
    <div
      className={[
        "border-b border-[var(--app-border)] bg-[var(--app-card-soft)] p-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="w-full xl:max-w-md">
          {typeof search === "string" && onSearchChange && (
            <TableSearch
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
              type="button"
              onClick={onRefresh}
              icon={
                <RefreshCcw
                  aria-hidden="true"
                  className="h-[18px] w-[18px]"
                />
              }
            >
              تحديث
            </SecondaryButton>
          )}

          {onPrint && (
            <SecondaryButton
              type="button"
              onClick={onPrint}
              icon={
                <Printer
                  aria-hidden="true"
                  className="h-[18px] w-[18px]"
                />
              }
            >
              طباعة
            </SecondaryButton>
          )}

          {onExportExcel && (
            <ExportButton
              type="button"
              onClick={onExportExcel}
              icon={
                <Download
                  aria-hidden="true"
                  className="h-[18px] w-[18px]"
                />
              }
            >
              Excel
            </ExportButton>
          )}

          {onAdd && (
            <PrimaryButton
              type="button"
              onClick={onAdd}
              icon={
                <Plus
                  aria-hidden="true"
                  className="h-[18px] w-[18px]"
                />
              }
            >
              {addLabel}
            </PrimaryButton>
          )}
        </div>
      </div>

      {filters && (
        <div className="mt-4 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] p-4">
          {filters}
        </div>
      )}
    </div>
  );
}
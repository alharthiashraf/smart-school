import type { ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import type { DataTableAction } from "./DataTable";

type DataTableToolbarProps<T> = {
  title?: string;
  description?: string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: ReactNode;
  actions?: ReactNode;
  customContent?: ReactNode;
  bulkActions?: DataTableAction<T>[];
  selectedRows: T[];
};

const buttonClasses: Record<NonNullable<DataTableAction<unknown>["variant"]>, string> = {
  primary:
    "border-transparent bg-[var(--app-teal)] text-white hover:bg-[var(--app-teal-hover)]",
  secondary:
    "border-transparent bg-[var(--app-primary)] text-[var(--app-primary-foreground)] hover:bg-[var(--app-primary-hover)]",
  outline:
    "border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] hover:bg-[var(--app-card-soft)]",
  ghost:
    "border border-transparent bg-[var(--app-card-soft)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]",
  danger:
    "border border-transparent bg-[var(--app-destructive-soft)] text-[var(--app-destructive)] hover:opacity-90",
};

export default function DataTableToolbar<T>({
  title,
  description,
  search,
  filters,
  actions,
  customContent,
  bulkActions,
  selectedRows,
}: DataTableToolbarProps<T>) {
  return (
    <div className="border-b border-[var(--app-border)] bg-[var(--app-card)] p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          {title && (
            <h3 className="text-lg font-black text-[var(--app-text)]">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
              {description}
            </p>
          )}
        </div>

        {(actions || customContent) && (
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {customContent}
            {actions}
          </div>
        )}
      </div>

      {(search || filters || (bulkActions && bulkActions.length > 0)) && (
        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
            {search && (
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--app-text-muted)]" />
                <input
                  value={search.value}
                  onChange={(event) => search.onChange(event.target.value)}
                  placeholder={search.placeholder || "ابحث..."}
                  className="h-12 w-full rounded-2xl border border-[var(--app-input)] bg-[var(--app-card-soft)] pr-12 pl-4 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-teal)] focus:bg-[var(--app-card)]"
                />
              </div>
            )}

            {filters && (
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <div className="hidden items-center gap-1 rounded-full bg-[var(--app-card-soft)] px-3 py-2 text-xs font-black text-[var(--app-text-muted)] lg:inline-flex">
                  <SlidersHorizontal className="h-4 w-4" />
                  الفلاتر
                </div>
                {filters}
              </div>
            )}
          </div>

          {bulkActions && bulkActions.length > 0 && selectedRows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-2">
              <span className="px-2 text-xs font-black text-[var(--app-text-muted)]">
                المحدد: {selectedRows.length}
              </span>

              {bulkActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={action.disabled}
                  onClick={() => action.onClick(selectedRows)}
                  className={[
                    "inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-3 text-xs font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60",
                    buttonClasses[action.variant || "outline"],
                  ].join(" ")}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

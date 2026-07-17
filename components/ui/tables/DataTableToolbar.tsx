import type { ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import type { DataTableAction } from "./DataTable";

export type DataTableToolbarSearch = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export type DataTableToolbarProps<T> = {
  title?: string;
  description?: string;
  search?: DataTableToolbarSearch;
  filters?: ReactNode;
  actions?: ReactNode;
  customContent?: ReactNode;
  bulkActions?: DataTableAction<T>[];
  selectedRows: T[];
  className?: string;
};

type DataTableActionVariant = NonNullable<
  DataTableAction<unknown>["variant"]
>;

const buttonClasses: Record<DataTableActionVariant, string> = {
  primary:
    "border-transparent bg-[var(--app-primary)] text-[var(--app-primary-foreground)] hover:bg-[var(--app-primary-hover)]",

  secondary:
    "border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] hover:bg-[var(--app-card-soft)]",

  outline:
    "border-[var(--app-border)] bg-transparent text-[var(--app-text)] hover:bg-[var(--app-card-soft)]",

  ghost:
    "border-transparent bg-[var(--app-card-soft)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]",

  danger:
    "border-transparent bg-[var(--app-destructive-soft)] text-[var(--app-destructive)] hover:opacity-90",
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
  className,
}: DataTableToolbarProps<T>) {
  const hasHeaderContent = Boolean(
    title || description || actions || customContent,
  );

  const hasControlContent = Boolean(
    search || filters || bulkActions?.length,
  );

  return (
    <div
      className={[
        "border-b border-[var(--app-border)] bg-[var(--app-card)] p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hasHeaderContent && (
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
      )}

      {hasControlContent && (
        <div
          className={[
            "flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between",
            hasHeaderContent ? "mt-4" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
            {search && (
              <div className="relative w-full lg:max-w-md">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--app-text-muted)]"
                />

                <input
                  type="search"
                  role="searchbox"
                  value={search.value}
                  disabled={search.disabled}
                  onChange={(event) => search.onChange(event.target.value)}
                  placeholder={search.placeholder ?? "ابحث..."}
                  className={[
                    "h-12 w-full rounded-[var(--app-radius-lg)] border border-[var(--app-input)] bg-[var(--app-card-soft)] pl-4 pr-12 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-muted)]",
                    "focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-4 focus:ring-[var(--app-primary-soft)]",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  ].join(" ")}
                />
              </div>
            )}

            {filters && (
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <div className="hidden items-center gap-1 rounded-full bg-[var(--app-card-soft)] px-3 py-2 text-xs font-black text-[var(--app-text-muted)] lg:inline-flex">
                  <SlidersHorizontal
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                  الفلاتر
                </div>

                {filters}
              </div>
            )}
          </div>

          {bulkActions &&
            bulkActions.length > 0 &&
            selectedRows.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-2">
                <span
                  className="px-2 text-xs font-black text-[var(--app-text-muted)]"
                  aria-live="polite"
                >
                  المحدد: {selectedRows.length}
                </span>

                {bulkActions.map((action, index) => {
                  const variant = action.variant ?? "outline";

                  return (
                    <button
                      key={`${action.label}-${index}`}
                      type="button"
                      disabled={action.disabled}
                      onClick={() => action.onClick(selectedRows)}
                      className={[
                        "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--app-radius-lg)] border px-3 text-xs font-black shadow-sm transition",
                        "hover:-translate-y-0.5 hover:shadow-md",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-background)]",
                        "disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60",
                        buttonClasses[variant],
                      ].join(" ")}
                    >
                      {action.icon && (
                        <span aria-hidden="true" className="shrink-0">
                          {action.icon}
                        </span>
                      )}

                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
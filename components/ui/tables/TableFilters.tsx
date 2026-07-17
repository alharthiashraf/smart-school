import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

export type TableFiltersProps = {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
};

const columnsMap: Record<
  NonNullable<TableFiltersProps["columns"]>,
  string
> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 xl:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
  5: "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  6: "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
};

export default function TableFilters({
  title = "الفلاتر",
  children,
  actions,
  className,
  columns = 4,
}: TableFiltersProps) {
  return (
    <section
      className={[
        "rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--app-radius-md)] bg-[var(--app-card)] text-[var(--app-primary)] shadow-sm">
            <SlidersHorizontal
              aria-hidden="true"
              className="h-4 w-4"
            />
          </div>

          <h3 className="text-sm font-black text-[var(--app-text)]">
            {title}
          </h3>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      <div
        className={[
          "grid gap-3",
          columnsMap[columns],
        ].join(" ")}
      >
        {children}
      </div>
    </section>
  );
}
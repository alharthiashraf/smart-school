import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

export type FiltersProps = {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export default function Filters({
  title = "الفلاتر",
  children,
  actions,
  className,
}: FiltersProps) {
  return (
    <section
      className={[
        "rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="filters-title"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]"
            aria-hidden="true"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </div>

          <h3
            id="filters-title"
            className="text-sm font-black text-[var(--app-text)]"
          >
            {title}
          </h3>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

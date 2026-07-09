import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

type TableFiltersProps = {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export default function TableFilters({
  title = "الفلاتر",
  children,
  actions,
  className = "",
}: TableFiltersProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50/70 p-4 ${className}`}
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
            <SlidersHorizontal className="h-4 w-4" />
          </div>

          <h3 className="text-sm font-black text-slate-800">{title}</h3>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>
    </div>
  );
}
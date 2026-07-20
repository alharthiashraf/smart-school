"use client";

import { Search, X } from "lucide-react";

type SidebarSearchProps = {
  value: string;
  onChange: (value: string) => void;
  hasResults: boolean;
};

export default function SidebarSearch({
  value,
  onChange,
  hasResults,
}: SidebarSearchProps) {
  const hasValue = value.trim().length > 0;

  return (
    <div className="space-y-2">
      <div
        className="
          group flex items-center gap-2 rounded-2xl
          border border-[var(--app-sidebar-border)]
          bg-[var(--app-sidebar-hover)]
          px-3 py-2.5
          transition-all duration-200
          focus-within:border-[var(--app-accent-border)]
          focus-within:bg-[var(--app-sidebar-active)]
          focus-within:ring-2
          focus-within:ring-[var(--app-accent-soft)]
        "
      >
        <Search
          size={17}
          className="
            shrink-0 text-[var(--app-sidebar-muted)]
            transition-colors duration-200
            group-focus-within:text-[var(--app-accent)]
          "
          aria-hidden="true"
        />

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="ابحث في القائمة..."
          aria-label="البحث في القائمة الجانبية"
          className="
            min-w-0 flex-1 bg-transparent
            text-xs font-bold text-[var(--app-sidebar-text)]
            outline-none
            placeholder:text-[var(--app-sidebar-muted)]
          "
        />

        {hasValue && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="مسح البحث"
            title="مسح البحث"
            className="
              flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
              text-[var(--app-sidebar-muted)]
              transition-all duration-200
              hover:bg-[var(--app-accent-soft)]
              hover:text-[var(--app-accent)]
            "
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {hasValue && !hasResults && (
        <p
          className="
            rounded-xl border border-[var(--app-sidebar-border)]
            bg-[var(--app-sidebar-hover)]
            px-3 py-2 text-center
            text-[11px] font-bold text-[var(--app-sidebar-muted)]
          "
        >
          لا توجد نتائج مطابقة
        </p>
      )}
    </div>
  );
}

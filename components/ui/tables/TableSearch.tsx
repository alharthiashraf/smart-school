"use client";

import { Search, X } from "lucide-react";

export type TableSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export default function TableSearch({
  value,
  onChange,
  placeholder = "بحث داخل الجدول...",
  disabled = false,
  className,
}: TableSearchProps) {
  return (
    <div
      className={[
        "relative w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-text-muted)]"
      />

      <input
        type="search"
        role="searchbox"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={[
          "h-11 w-full rounded-[var(--app-radius-lg)] border border-[var(--app-input)] bg-[var(--app-card)] py-2 pl-10 pr-10 text-sm font-bold text-[var(--app-text)] outline-none transition",
          "placeholder:text-[var(--app-text-muted)]",
          "focus:border-[var(--app-primary)] focus:ring-4 focus:ring-[var(--app-primary-soft)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
        ].join(" ")}
      />

      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="مسح البحث"
          title="مسح البحث"
          className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[var(--app-radius-md)] text-[var(--app-text-muted)] transition hover:bg-[var(--app-card-soft)] hover:text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-card)]"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
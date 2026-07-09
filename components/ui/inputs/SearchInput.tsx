"use client";

import { Search, X } from "lucide-react";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function SearchInput({
  value,
  onChange,
  placeholder = "بحث...",
  className = "",
}: SearchInputProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-text-muted)]" />

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-[var(--app-input)] bg-[var(--app-card)] py-2 pl-10 pr-10 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-teal)] focus:ring-4 focus:ring-[var(--app-teal-soft)]"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--app-text-muted)] transition hover:bg-[var(--app-card-soft)] hover:text-[var(--app-text)]"
          aria-label="مسح البحث"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

"use client";

import { Search, X } from "lucide-react";
import { useId } from "react";

export type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  autoComplete?: string;
};

export default function SearchInput({
  value,
  onChange,
  placeholder = "بحث...",
  className,
  id,
  disabled = false,
  autoComplete = "off",
}: SearchInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div
      className={["relative w-full", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-text-muted)]"
      />

      <input
        id={inputId}
        type="search"
        role="searchbox"
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={[
          "h-11 w-full rounded-2xl border border-[var(--app-input)] bg-[var(--app-card)] py-2 pl-10 pr-10 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-muted)]",
          "focus:border-[var(--app-primary)] focus:ring-4 focus:ring-[var(--app-primary-soft)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
        ].join(" ")}
      />

      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--app-text-muted)] transition hover:bg-[var(--app-card-soft)] hover:text-[var(--app-text)]"
          aria-label="مسح البحث"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

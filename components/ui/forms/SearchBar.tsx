"use client";

import { Search } from "lucide-react";

export type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function SearchBar({
  value,
  onChange,
  placeholder = "بحث...",
  className,
}: SearchBarProps) {
  return (
    <div
      className={[
        "relative",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-text-muted)]"
      />

      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-[var(--app-radius-lg)] border border-[var(--app-input)] bg-[var(--app-card)] py-2.5 pl-4 pr-10 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-primary)] focus:ring-4 focus:ring-[var(--app-primary-soft)]"
      />
    </div>
  );
}

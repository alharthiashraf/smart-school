"use client";

import { Search } from "lucide-react";
import type { FormEvent } from "react";

type HeaderSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function HeaderSearch({
  value,
  onChange,
  onSubmit,
}: HeaderSearchProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="hidden min-w-[260px] max-w-xl flex-1 items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-2.5 transition focus-within:border-[var(--app-teal)] focus-within:ring-4 focus-within:ring-[var(--app-teal-soft)] md:flex"
    >
      <Search size={18} className="text-[var(--app-text-muted)]" />

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="ابحث في المنصة..."
        className="w-full bg-transparent text-sm font-bold text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-muted)]"
      />
    </form>
  );
}
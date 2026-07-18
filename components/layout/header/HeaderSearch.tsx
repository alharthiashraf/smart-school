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
      role="search"
      className={[
        "hidden min-w-[260px] max-w-xl flex-1 items-center gap-2",
        "rounded-2xl border px-3 py-2.5",
        "border-[var(--app-border)]",
        "bg-[var(--app-card-soft)]",
        "shadow-[var(--app-shadow-sm)]",
        "transition-all duration-200",
        "focus-within:border-[var(--app-accent-border)]",
        "focus-within:bg-[var(--app-card)]",
        "focus-within:ring-4",
        "focus-within:ring-[var(--app-focus-ring)]",
        "md:flex",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          "border border-[var(--app-border)]",
          "bg-[var(--app-card)]",
          "text-[var(--app-text-muted)]",
          "transition-colors duration-200",
          "group-focus-within:text-[var(--app-accent)]",
        ].join(" ")}
      >
        <Search size={17} />
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="ابحث في المنصة..."
        aria-label="البحث في المنصة"
        className={[
          "w-full bg-transparent",
          "text-sm font-bold text-[var(--app-text)]",
          "outline-none",
          "placeholder:text-[var(--app-text-muted)]",
        ].join(" ")}
      />

      {value.trim() && (
        <button
          type="button"
          onClick={() => onChange("")}
          className={[
            "rounded-xl px-2 py-1",
            "text-xs font-bold text-[var(--app-text-muted)]",
            "transition-colors duration-200",
            "hover:bg-[var(--app-accent-soft)]",
            "hover:text-[var(--app-accent)]",
          ].join(" ")}
          aria-label="مسح البحث"
          title="مسح البحث"
        >
          مسح
        </button>
      )}
    </form>
  );
}

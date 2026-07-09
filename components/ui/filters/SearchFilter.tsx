"use client";

import { Search, X } from "lucide-react";

type SearchFilterProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function SearchFilter({
  value,
  onChange,
  placeholder = "بحث...",
  className = "",
}: SearchFilterProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="مسح البحث"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
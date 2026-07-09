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
      className="hidden min-w-[260px] max-w-xl flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-100 md:flex"
    >
      <Search size={18} className="text-slate-400" />

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="ابحث في المنصة..."
        className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
      />
    </form>
  );
}
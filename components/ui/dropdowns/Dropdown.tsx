"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type DropdownItem = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
};

type DropdownProps = {
  label: ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  className?: string;
};

export default function Dropdown({
  label,
  items,
  align = "end",
  className = "",
}: DropdownProps) {
  return (
    <div className={`group relative inline-block text-right ${className}`}>
      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        {label}
        <ChevronDown className="h-4 w-4" />
      </button>

      <div
        className={`invisible absolute z-50 mt-2 min-w-52 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100 ${
          align === "end" ? "left-0" : "right-0"
        }`}
      >
        {items.map((item, index) => (
          <button
            key={`${item.label}-${index}`}
            type="button"
            disabled={item.disabled}
            onClick={item.onClick}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              item.danger
                ? "text-red-700 hover:bg-red-50"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
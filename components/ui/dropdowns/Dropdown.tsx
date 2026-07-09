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
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-2.5 text-sm font-bold text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-card-soft)]"
      >
        {label}
        <ChevronDown className="h-4 w-4" />
      </button>

      <div
        className={[
          "invisible absolute z-50 mt-2 min-w-52 rounded-2xl border border-[var(--app-border)] bg-[var(--app-popover)] p-2 text-[var(--app-text)] opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100",
          align === "end" ? "left-0" : "right-0",
        ].join(" ")}
      >
        {items.map((item, index) => (
          <button
            key={`${item.label}-${index}`}
            type="button"
            disabled={item.disabled}
            onClick={item.onClick}
            className={[
              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
              item.danger
                ? "text-[var(--app-destructive)] hover:bg-[var(--app-destructive-soft)]"
                : "text-[var(--app-text)] hover:bg-[var(--app-card-soft)]",
            ].join(" ")}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

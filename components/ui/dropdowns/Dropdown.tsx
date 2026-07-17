"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type DropdownItem = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
};

export type DropdownProps = {
  label: ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  className?: string;
  disabled?: boolean;
};

export default function Dropdown({
  label,
  items,
  align = "end",
  className,
  disabled = false,
}: DropdownProps) {
  const [open, setOpen] = useState(false);

  const dropdownId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleItemClick(item: DropdownItem) {
    if (item.disabled) return;

    item.onClick();
    setOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className={["relative inline-block text-right", className]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={dropdownId}
        onClick={() => setOpen((current) => !current)}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-2.5 text-sm font-bold text-[var(--app-text)] shadow-sm transition",
          "hover:bg-[var(--app-card-soft)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-background)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
        ].join(" ")}
      >
        {label}

        <ChevronDown
          aria-hidden="true"
          className={[
            "h-4 w-4 transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div
          id={dropdownId}
          role="menu"
          className={[
            "absolute z-50 mt-2 min-w-52 rounded-2xl border border-[var(--app-border)] bg-[var(--app-popover)] p-2 text-[var(--app-text)] shadow-[var(--app-shadow)]",
            align === "end" ? "left-0" : "right-0",
          ].join(" ")}
        >
          {items.length > 0 ? (
            items.map((item, index) => (
              <button
                key={`${item.label}-${index}`}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => handleItemClick(item)}
                className={[
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-sm font-bold transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary-soft)]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  item.danger
                    ? "text-[var(--app-destructive)] hover:bg-[var(--app-destructive-soft)]"
                    : "text-[var(--app-text)] hover:bg-[var(--app-card-soft)]",
                ].join(" ")}
              >
                {item.icon && (
                  <span
                    aria-hidden="true"
                    className="shrink-0"
                  >
                    {item.icon}
                  </span>
                )}

                <span className="truncate">{item.label}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm font-bold text-[var(--app-text-muted)]">
              لا توجد خيارات
            </div>
          )}
        </div>
      )}
    </div>
  );
}
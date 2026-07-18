"use client";

import type { ReactNode } from "react";

export type TabItem = {
  value: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
};

export type TabsProps = {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
};

export default function Tabs({
  tabs,
  value,
  onChange,
  className,
  ariaLabel = "التبويبات",
}: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={[
        "flex flex-wrap gap-2 rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-2 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.value)}
            className={[
              "inline-flex items-center gap-2 rounded-[var(--app-radius-lg)] px-4 py-2 text-sm font-black transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-background)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "bg-[var(--app-primary)] text-[var(--app-primary-foreground)] shadow-sm"
                : "text-[var(--app-text-muted)] hover:bg-[var(--app-card-soft)] hover:text-[var(--app-text)]",
            ].join(" ")}
          >
            {tab.icon && (
              <span aria-hidden="true" className="shrink-0">
                {tab.icon}
              </span>
            )}

            <span>{tab.label}</span>

            {tab.badge && <span className="shrink-0">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

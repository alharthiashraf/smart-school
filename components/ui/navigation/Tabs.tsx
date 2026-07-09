"use client";

import type { ReactNode } from "react";

type TabItem = {
  value: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
};

type TabsProps = {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function Tabs({
  tabs,
  value,
  onChange,
  className = "",
}: TabsProps) {
  return (
    <div
      className={`flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm ${className}`}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black transition ${
              active
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
}
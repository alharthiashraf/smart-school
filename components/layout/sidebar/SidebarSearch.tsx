"use client";

import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/inputs";

type SidebarSearchProps = {
  value: string;
  onChange: (value: string) => void;
  hasResults: boolean;
  children?: ReactNode;
};

export default function SidebarSearch({
  value,
  onChange,
  hasResults,
  children,
}: SidebarSearchProps) {
  const searching = value.trim().length > 0;

  return (
    <div className="space-y-3">
      <SearchInput
        value={value}
        onChange={onChange}
        placeholder="بحث في القائمة..."
        className="
          [&_input]:h-11
          [&_input]:rounded-2xl
          [&_input]:border
          [&_input]:border-[var(--app-sidebar-border)]
          [&_input]:bg-[var(--app-sidebar-hover)]
          [&_input]:text-[var(--app-sidebar-text)]
          [&_input]:placeholder:text-[var(--app-sidebar-muted)]
          [&_input]:shadow-sm
          [&_input]:transition-all
          [&_input]:duration-200
          [&_input]:focus:border-[var(--app-accent)]
          [&_input]:focus:bg-[var(--app-card)]
          [&_input]:focus:ring-4
          [&_input]:focus:ring-[var(--app-accent-soft)]
        "
      />

      {searching && !hasResults ? (
        <EmptyState
          title="لا توجد نتائج"
          description="جرّب كلمة بحث مختلفة."
          className="
            rounded-2xl
            border
            border-[var(--app-sidebar-border)]
            bg-[var(--app-sidebar-hover)]
            text-[var(--app-sidebar-text)]
          "
        />
      ) : (
        children
      )}
    </div>
  );
}
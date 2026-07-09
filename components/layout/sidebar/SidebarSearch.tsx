"use client";

import { SearchInput } from "@/components/ui/inputs";
import { EmptyState } from "@/components/ui/empty-state";

type SidebarSearchProps = {
  value: string;
  onChange: (value: string) => void;
  hasResults: boolean;
  children?: React.ReactNode;
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
          [&_input]:border-[var(--sidebar-border)]
          [&_input]:bg-white/[0.08]
          [&_input]:text-[var(--sidebar-text)]
          [&_input]:placeholder:text-[var(--sidebar-muted)]
          [&_input]:focus:border-[var(--app-accent)]
          [&_input]:focus:ring-[rgba(212,175,55,0.12)]
        "
      />

      {searching && !hasResults ? (
        <EmptyState
          title="لا توجد نتائج"
          description="جرّب كلمة بحث مختلفة."
          className="border-white/10 bg-white/[0.05]"
        />
      ) : (
        children
      )}
    </div>
  );
}
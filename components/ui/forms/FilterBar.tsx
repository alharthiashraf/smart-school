import type { ReactNode } from "react";

type FilterBarProps = {
  children: ReactNode;
  className?: string;
};

export default function FilterBar({
  children,
  className = "",
}: FilterBarProps) {
  return (
    <div
      className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${className}`}
    >
      {children}
    </div>
  );
}
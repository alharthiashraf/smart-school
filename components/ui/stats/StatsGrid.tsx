import type { ReactNode } from "react";

type StatsGridProps = {
  children: ReactNode;
  className?: string;
};

export default function StatsGrid({
  children,
  className = "",
}: StatsGridProps) {
  return (
    <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>
      {children}
    </div>
  );
}
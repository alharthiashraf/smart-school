import type { ReactNode } from "react";

export type StatsGridProps = {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
};

const columnsMap: Record<NonNullable<StatsGridProps["columns"]>, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  6: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
};

export default function StatsGrid({
  children,
  className,
  columns = 4,
}: StatsGridProps) {
  return (
    <div
      className={[
        "grid gap-5",
        columnsMap[columns],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

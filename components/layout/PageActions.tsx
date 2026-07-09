import type { ReactNode } from "react";

type PageActionsProps = {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
};

export default function PageActions({
  children,
  className = "",
  sticky = false,
}: PageActionsProps) {
  return (
    <div
      className={[
        "mb-5 flex flex-col gap-3 rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 text-[var(--app-text)] shadow-sm",
        "sm:flex-row sm:items-center sm:justify-between",
        sticky
          ? "sticky top-20 z-20 backdrop-blur supports-[backdrop-filter]:bg-[var(--app-card)]/90"
          : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

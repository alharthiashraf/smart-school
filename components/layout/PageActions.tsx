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
        "mb-5 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm",
        "sm:flex-row sm:items-center sm:justify-between",
        sticky
          ? "sticky top-20 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/90"
          : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
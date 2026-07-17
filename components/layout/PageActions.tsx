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
        `
        mb-6
        flex flex-col gap-4
        rounded-2xl
        border border-[var(--app-border)]
        bg-[var(--app-card)]
        p-5
        text-[var(--app-text)]
        shadow-[var(--app-shadow-sm)]
        transition-all duration-300
        `,
        "sm:flex-row sm:items-center sm:justify-between",
        sticky
          ? `
            sticky top-20 z-20
            bg-[var(--app-card)]/95
            backdrop-blur-xl
            `
          : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
import type { ReactNode } from "react";

type PageActionsProps = {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PageActions({
  children,
  className,
  sticky = false,
}: PageActionsProps) {
  return (
    <div
      className={cx(
        "mb-6",
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        "rounded-[var(--app-radius-lg)]",
        "border border-[var(--app-border)]",
        "bg-[var(--app-card)]",
        "p-5",
        "text-[var(--app-text)]",
        "shadow-[var(--app-shadow-sm)]",
        "transition-all duration-300",
        sticky &&
          "sticky top-20 z-20 bg-[color:color-mix(in_srgb,var(--app-card)_92%,transparent)] backdrop-blur-xl supports-[backdrop-filter]:bg-[color:color-mix(in_srgb,var(--app-card)_88%,transparent)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

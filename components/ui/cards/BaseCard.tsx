import type { HTMLAttributes, ReactNode } from "react";

type BaseCardVariant = "default" | "soft" | "elevated" | "interactive";
type BaseCardPadding = "none" | "sm" | "md" | "lg";

type BaseCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: "div" | "article" | "section";
  variant?: BaseCardVariant;
  padding?: BaseCardPadding;
  hoverable?: boolean;
};

const variants: Record<BaseCardVariant, string> = {
  default: "border-[var(--app-border)] bg-[var(--app-card)] shadow-sm",
  soft: "border-[var(--app-border)] bg-[var(--app-card-soft)] shadow-sm",
  elevated: "border-[var(--app-border)] bg-[var(--app-card)] shadow-[var(--app-shadow-soft)]",
  interactive:
    "border-[var(--app-border)] bg-[var(--app-card)] shadow-sm hover:-translate-y-1 hover:shadow-[var(--app-shadow)]",
};

const paddings: Record<BaseCardPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export default function BaseCard({
  children,
  as = "div",
  variant = "default",
  padding = "md",
  hoverable = false,
  className = "",
  ...props
}: BaseCardProps) {
  const Component = as;

  return (
    <Component
      className={[
        "rounded-[var(--app-radius-xl)] border text-[var(--app-text)] transition-all duration-200",
        variants[hoverable ? "interactive" : variant],
        paddings[padding],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
}
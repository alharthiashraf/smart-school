import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  ElementType,
  ReactElement,
  ReactNode,
} from "react";

export type BaseCardVariant =
  | "default"
  | "soft"
  | "elevated"
  | "interactive"
  | "hero";

export type BaseCardPadding =
  | "none"
  | "sm"
  | "md"
  | "lg";

type BaseCardOwnProps = {
  children?: ReactNode;
  variant?: BaseCardVariant;
  padding?: BaseCardPadding;
  hoverable?: boolean;
};

export type BaseCardProps<
  TElement extends ElementType = "div",
> = BaseCardOwnProps & {
  as?: TElement;
  ref?: ComponentPropsWithRef<TElement>["ref"];
} & Omit<
    ComponentPropsWithoutRef<TElement>,
    keyof BaseCardOwnProps | "as"
  >;

const variants: Record<BaseCardVariant, string> = {
  default:
    "border-[var(--app-border)] bg-[var(--app-card)] shadow-sm",

  soft:
    "border-[var(--app-border)] bg-[var(--app-card-soft)] shadow-sm",

  elevated:
    "border-[var(--app-border)] bg-[var(--app-card)] shadow-[var(--app-shadow-soft)]",

  interactive: [
    "border-[var(--app-border)]",
    "bg-[var(--app-card)]",
    "shadow-sm",
    "hover:-translate-y-1",
    "hover:border-[var(--app-accent)]",
    "hover:shadow-[var(--app-shadow)]",
  ].join(" "),

  hero: [
    "border-transparent",
    "bg-gradient-to-l",
    "from-[var(--app-primary)]",
    "via-[var(--app-primary-hover)]",
    "to-[var(--app-primary-dark)]",
    "text-[var(--app-primary-foreground)]",
    "shadow-[var(--app-shadow)]",
  ].join(" "),
};

const paddings: Record<BaseCardPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export default function BaseCard<
  TElement extends ElementType = "div",
>({
  children,
  as,
  ref,
  variant = "default",
  padding = "md",
  hoverable = false,
  className,
  ...props
}: BaseCardProps<TElement>): ReactElement {
  const Component = (as ?? "div") as ElementType;

  const resolvedVariant: BaseCardVariant =
    hoverable && variant !== "hero"
      ? "interactive"
      : variant;

  return (
    <Component
      ref={ref}
      className={[
        "group rounded-[var(--app-radius-xl)] border text-[var(--app-text)] transition-all duration-200",
        variants[resolvedVariant],
        paddings[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
}

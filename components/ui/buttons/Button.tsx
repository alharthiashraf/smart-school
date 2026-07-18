import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "outline"
  | "export";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary: [
    "border-[var(--app-primary)]",
    "bg-[var(--app-primary)]",
    "text-[var(--app-text-inverse)]",
    "shadow-(--app-shadow-sm)",
    "hover:border-[var(--app-primary-hover)]",
    "hover:bg-[var(--app-primary-hover)]",
    "hover:shadow-(--app-shadow-md)",
    "active:border-[var(--app-primary-active)]",
    "active:bg-[var(--app-primary-active)]",
  ].join(" "),

  secondary: [
    "border-[var(--app-border)]",
    "bg-[var(--app-card)]",
    "text-[var(--app-text)]",
    "shadow-(--app-shadow-sm)",
    "hover:border-[var(--app-accent-border)]",
    "hover:bg-[var(--app-card-soft)]",
    "hover:text-[var(--app-accent)]",
  ].join(" "),

  danger: [
    "border-[var(--app-destructive)]",
    "bg-[var(--app-destructive)]",
    "text-white",
    "shadow-(--app-shadow-sm)",
    "hover:opacity-90",
    "hover:shadow-(--app-shadow-md)",
  ].join(" "),

  ghost: [
    "border-transparent",
    "bg-transparent",
    "text-[var(--app-text)]",
    "shadow-none",
    "hover:bg-[var(--app-primary-soft)]",
    "hover:text-[var(--app-primary)]",
  ].join(" "),

  outline: [
    "border-[var(--app-accent-border)]",
    "bg-transparent",
    "text-[var(--app-accent)]",
    "shadow-none",
    "hover:bg-[var(--app-accent-soft)]",
    "hover:border-[var(--app-accent)]",
  ].join(" "),

  export: [
    "border-[var(--app-accent-border)]",
    "bg-[var(--app-accent-soft)]",
    "text-[var(--app-accent)]",
    "shadow-(--app-shadow-sm)",
    "hover:border-[var(--app-accent)]",
    "hover:bg-[var(--app-accent)]",
    "hover:text-[var(--app-accent-foreground)]",
    "hover:shadow-(--app-shadow-gold)",
  ].join(" "),
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
  icon: "h-10 w-10 px-0",
};

export default function Button({
  children,
  icon,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        "inline-flex items-center justify-center gap-2",
        "rounded-2xl border",
        "font-bold",
        "transition-all duration-200",
        "focus-visible:outline-none",
        "focus-visible:ring-4",
        "focus-visible:ring-[var(--app-focus-ring)]",
        "focus-visible:ring-offset-2",
        "focus-visible:ring-offset-[var(--app-background)]",
        "disabled:pointer-events-none",
        "disabled:cursor-not-allowed",
        "disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading ? (
        <Loader2
          size={16}
          className="shrink-0 animate-spin"
          aria-hidden="true"
        />
      ) : (
        icon
      )}

      {size !== "icon" ? children : null}
    </button>
  );
}
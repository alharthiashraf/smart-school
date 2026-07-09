import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "outline"
  | "export";

type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-[var(--app-teal)] text-white hover:bg-[var(--app-teal-hover)]",
  secondary:
    "border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] hover:bg-[var(--app-card-soft)]",
  danger:
    "border-transparent bg-[var(--destructive,#dc2626)] text-white hover:opacity-90",
  ghost:
    "border-transparent bg-transparent text-[var(--app-text)] hover:bg-[var(--app-card-soft)]",
  outline:
    "border-[var(--app-border)] bg-transparent text-[var(--app-text)] hover:bg-[var(--app-card-soft)]",
  export:
    "border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-text)] hover:bg-[var(--app-accent-soft)]",
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
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-2xl border font-bold shadow-sm transition",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--app-teal-soft)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      ].join(" ")}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
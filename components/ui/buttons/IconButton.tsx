import type { ButtonHTMLAttributes, ReactNode } from "react";
import Button from "./Button";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  tone?: "default" | "primary" | "warning" | "danger";
};

export default function IconButton({
  icon,
  label,
  tone = "default",
  className = "",
  ...props
}: IconButtonProps) {
  const variant =
    tone === "danger"
      ? "danger"
      : tone === "warning"
        ? "export"
        : tone === "primary"
          ? "primary"
          : "secondary";

  return (
    <Button
      variant={variant}
      size="icon"
      aria-label={label}
      title={label}
      className={className}
      {...props}
    >
      {icon}
    </Button>
  );
}
import type { ButtonHTMLAttributes, ReactNode } from "react";
import Button from "./Button";

type SecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  children: ReactNode;
  tone?: "default" | "dark" | "warning" | "danger";
};

export default function SecondaryButton({
  icon,
  children,
  tone = "default",
  ...props
}: SecondaryButtonProps) {
  const variant =
    tone === "danger"
      ? "danger"
      : tone === "warning"
        ? "export"
        : tone === "dark"
          ? "primary"
          : "secondary";

  return (
    <Button variant={variant} icon={icon} {...props}>
      {children}
    </Button>
  );
}
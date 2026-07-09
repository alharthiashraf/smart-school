import type { ButtonHTMLAttributes, ReactNode } from "react";
import Button from "./Button";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  children: ReactNode;
};

export default function PrimaryButton({
  icon,
  children,
  ...props
}: PrimaryButtonProps) {
  return (
    <Button variant="primary" icon={icon} {...props}>
      {children}
    </Button>
  );
}
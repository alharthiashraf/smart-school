import type { ReactNode } from "react";

import Button, { type ButtonProps } from "./Button";

export type IconButtonProps = Omit<
  ButtonProps,
  "variant" | "size" | "children" | "icon"
> & {
  icon: ReactNode;
  label: string;
  tone?: "default" | "primary" | "warning" | "danger";
};

const toneToVariant = {
  default: "secondary",
  primary: "primary",
  warning: "export",
  danger: "danger",
} as const;

export default function IconButton({
  icon,
  label,
  tone = "default",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <Button
      type={type}
      variant={toneToVariant[tone]}
      size="icon"
      icon={icon}
      aria-label={label}
      title={label}
      {...props}
    />
  );
}
import { Trash2 } from "lucide-react";

import type { ButtonProps } from "./Button";
import Button from "./Button";

export type DangerButtonProps = Omit<ButtonProps, "variant">;

export default function DangerButton({
  children,
  icon = <Trash2 aria-hidden="true" className="h-4 w-4" />,
  type = "button",
  ...props
}: DangerButtonProps) {
  return (
    <Button
      type={type}
      variant="danger"
      icon={icon}
      {...props}
    >
      {children}
    </Button>
  );
}

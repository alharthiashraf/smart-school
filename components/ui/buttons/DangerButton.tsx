import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Trash2 } from "lucide-react";
import Button from "./Button";

type DangerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  children: ReactNode;
};

export default function DangerButton({
  children,
  icon = <Trash2 className="h-4 w-4" />,
  ...props
}: DangerButtonProps) {
  return (
    <Button variant="danger" icon={icon} {...props}>
      {children}
    </Button>
  );
}
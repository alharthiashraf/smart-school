import { Download } from "lucide-react";

import type { ButtonProps } from "./Button";
import Button from "./Button";

export type ExportButtonProps = Omit<ButtonProps, "variant">;

export default function ExportButton({
  children = "تصدير",
  icon = <Download aria-hidden="true" className="h-4 w-4" />,
  type = "button",
  ...props
}: ExportButtonProps) {
  return (
    <Button
      type={type}
      variant="export"
      icon={icon}
      {...props}
    >
      {children}
    </Button>
  );
}
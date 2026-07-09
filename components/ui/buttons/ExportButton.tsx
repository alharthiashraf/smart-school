import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Download } from "lucide-react";
import Button from "./Button";

type ExportButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  children?: ReactNode;
};

export default function ExportButton({
  children = "تصدير",
  icon = <Download className="h-4 w-4" />,
  ...props
}: ExportButtonProps) {
  return (
    <Button variant="export" icon={icon} {...props}>
      {children}
    </Button>
  );
}
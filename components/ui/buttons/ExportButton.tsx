"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Download } from "lucide-react";

type ExportButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
};

export default function ExportButton({
  children = "تصدير",
  icon = <Download className="h-4 w-4" />,
  className = "",
  ...props
}: ExportButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
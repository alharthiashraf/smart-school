"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Trash2 } from "lucide-react";

type DangerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
};

export default function DangerButton({
  children,
  icon = <Trash2 className="h-4 w-4" />,
  className = "",
  ...props
}: DangerButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
"use client";

import type { ReactNode } from "react";
import SecondaryButton from "../buttons/SecondaryButton";

type DetailsDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  width?: string;
  onClose: () => void;
};

export default function DetailsDialog({
  open,
  title,
  children,
  width = "max-w-5xl",
  onClose,
}: DetailsDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className={`w-full ${width} overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-[var(--app-border)] p-5">
          <h2 className="text-2xl font-black text-[var(--app-text)]">
            {title}
          </h2>

          <SecondaryButton onClick={onClose}>إغلاق</SecondaryButton>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

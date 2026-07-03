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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div
        className={`w-full ${width} rounded-3xl bg-white shadow-2xl`}
      >

        <div className="flex items-center justify-between border-b p-5">

          <h2 className="text-2xl font-black text-[#15445a]">
            {title}
          </h2>

          <SecondaryButton onClick={onClose}>
            إغلاق
          </SecondaryButton>

        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">

          {children}

        </div>

      </div>

    </div>
  );
}
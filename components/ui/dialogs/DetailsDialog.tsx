"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import SecondaryButton from "../buttons/SecondaryButton";

export type DetailsDialogProps = {
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
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(event) => event.stopPropagation()}
        className={[
          "w-full overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-2xl",
          width,
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-[var(--app-border)] p-5">
          <h2
            id="dialog-title"
            className="text-2xl font-black text-[var(--app-text)]"
          >
            {title}
          </h2>

          <SecondaryButton
            type="button"
            onClick={onClose}
          >
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

"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import PrimaryButton from "../buttons/PrimaryButton";
import SecondaryButton from "../buttons/SecondaryButton";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  icon?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  icon,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-2xl"
      >
        <div className="border-b border-[var(--app-border)] p-6">
          <div className="flex items-start gap-3">
            {icon && (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]"
                aria-hidden="true"
              >
                {icon}
              </div>
            )}

            <div>
              <h2
                id="confirm-dialog-title"
                className="text-xl font-black text-[var(--app-text)]"
              >
                {title}
              </h2>

              <p
                id="confirm-dialog-message"
                className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]"
              >
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 p-6">
          <SecondaryButton
            type="button"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </SecondaryButton>

          <PrimaryButton
            type="button"
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "جارٍ التنفيذ..." : confirmText}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
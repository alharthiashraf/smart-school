"use client";

import type { ReactNode } from "react";
import PrimaryButton from "../buttons/PrimaryButton";
import SecondaryButton from "../buttons/SecondaryButton";

type ConfirmDialogProps = {
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">

        <div className="border-b p-6">

          <div className="flex items-center gap-3">

            {icon && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0da9a6]/10 text-[#0da9a6]">
                {icon}
              </div>
            )}

            <div>
              <h2 className="text-xl font-black text-[#15445a]">
                {title}
              </h2>

              <p className="mt-1 text-sm leading-7 text-slate-500">
                {message}
              </p>
            </div>

          </div>

        </div>

        <div className="flex justify-end gap-3 p-6">

          <SecondaryButton onClick={onCancel}>
            {cancelText}
          </SecondaryButton>

          <PrimaryButton
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "جارٍ التنفيذ..." : confirmText}
          </PrimaryButton>

        </div>

      </div>
    </div>
  );
}
"use client";

import type { ReactNode } from "react";
import PrimaryButton from "../buttons/PrimaryButton";
import SecondaryButton from "../buttons/SecondaryButton";
import DetailsDialog from "./DetailsDialog";

type EditDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  width?: string;
  loading?: boolean;
  saveText?: string;
  cancelText?: string;
  onSave: () => void;
  onClose: () => void;
};

export default function EditDialog({
  open,
  title,
  children,
  width = "max-w-5xl",
  loading = false,
  saveText = "حفظ",
  cancelText = "إلغاء",
  onSave,
  onClose,
}: EditDialogProps) {
  return (
    <DetailsDialog
      open={open}
      title={title}
      width={width}
      onClose={onClose}
    >
      <div className="space-y-6">
        {children}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <SecondaryButton onClick={onClose}>
            {cancelText}
          </SecondaryButton>

          <PrimaryButton
            onClick={onSave}
            disabled={loading}
          >
            {loading ? "جارٍ الحفظ..." : saveText}
          </PrimaryButton>
        </div>
      </div>
    </DetailsDialog>
  );
}
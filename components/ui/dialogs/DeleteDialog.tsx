"use client";

import { Trash2 } from "lucide-react";

import ConfirmDialog from "./ConfirmDialog";

export type DeleteDialogProps = {
  open: boolean;
  itemName?: string;
  loading?: boolean;
  onDelete: () => void;
  onCancel: () => void;
};

export default function DeleteDialog({
  open,
  itemName,
  loading = false,
  onDelete,
  onCancel,
}: DeleteDialogProps) {
  const resolvedItemName = itemName?.trim() || "هذا العنصر";

  return (
    <ConfirmDialog
      open={open}
      icon={<Trash2 aria-hidden="true" className="h-6 w-6" />}
      title="تأكيد الحذف"
      message={`هل تريد حذف ${resolvedItemName}؟ لا يمكن التراجع بعد الحذف.`}
      confirmText="حذف"
      cancelText="إلغاء"
      loading={loading}
      onConfirm={onDelete}
      onCancel={onCancel}
    />
  );
}
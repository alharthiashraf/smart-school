"use client";

import { Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

type DeleteDialogProps = {
  open: boolean;
  itemName?: string;
  loading?: boolean;
  onDelete: () => void;
  onCancel: () => void;
};

export default function DeleteDialog({
  open,
  itemName,
  loading,
  onDelete,
  onCancel,
}: DeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      icon={<Trash2 className="h-6 w-6" />}
      title="تأكيد الحذف"
      message={`هل تريد حذف ${itemName || "هذا العنصر"}؟ لا يمكن التراجع بعد الحذف.`}
      confirmText="حذف"
      cancelText="إلغاء"
      loading={loading}
      onConfirm={onDelete}
      onCancel={onCancel}
    />
  );
}
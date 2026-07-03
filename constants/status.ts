export const statusLabels = {
  active: "نشط",
  inactive: "غير نشط",
  pending: "بانتظار",
  approved: "معتمد",
  rejected: "مرفوض",
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "مستأذن",
} as const;

export type StatusKey = keyof typeof statusLabels;

export function getStatusLabel(status?: string | null) {
  if (!status) return "غير متوفر";
  return statusLabels[status as StatusKey] ?? status;
}
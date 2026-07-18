export function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("ar-SA").format(value);
}

export function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0%";
  return `${Math.round(value)}%`;
}

export function fallback(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "غير متوفر";
  }

  return String(value);
}

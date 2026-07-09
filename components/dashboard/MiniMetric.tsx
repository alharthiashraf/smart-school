type MiniMetricProps = {
  label: string;
  value: string | number;
  loading: boolean;
};

export default function MiniMetric({
  label,
  value,
  loading,
}: MiniMetricProps) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-3 text-center shadow-sm">
      <p className="text-lg font-black text-[var(--app-text)]">
        {loading ? "..." : value}
      </p>

      <p className="mt-1 text-[11px] font-bold text-[var(--app-text-muted)]">
        {label}
      </p>
    </div>
  );
}

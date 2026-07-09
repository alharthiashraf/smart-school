type ChartBarProps = {
  value: number;
  max: number;
  label: string;
  className: string;
};

export default function ChartBar({
  value,
  max,
  label,
  className,
}: ChartBarProps) {
  const width = Math.max(4, Math.round((value / max) * 100));

  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--app-card-soft)]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${className}`}
          style={{ width: `${width}%` }}
        />
      </div>

      <span className="w-16 text-xs font-bold text-[var(--app-text-muted)]">
        {label}: {value}
      </span>
    </div>
  );
}

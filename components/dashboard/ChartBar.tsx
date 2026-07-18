export type ChartBarProps = {
  value: number;
  max: number;
  label: string;
  className?: string;
  showValue?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function ChartBar({
  value,
  max,
  label,
  className = "",
  showValue = true,
}: ChartBarProps) {
  const safeMax = Math.max(1, max);
  const safeValue = clamp(value, 0, safeMax);

  const width = Math.max(
    safeValue > 0 ? 4 : 0,
    Math.round((safeValue / safeMax) * 100),
  );

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--app-card-soft)]"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
      >
        <div
          className={[
            "h-full rounded-full transition-[width] duration-500",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            width: `${width}%`,
          }}
        />
      </div>

      {showValue && (
        <span className="w-16 text-xs font-bold text-[var(--app-text-muted)]">
          {label}: {safeValue}
        </span>
      )}
    </div>
  );
}

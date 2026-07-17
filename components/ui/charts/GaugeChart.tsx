export type GaugeChartProps = {
  value: number;
  label?: string;
  max?: number;
  height?: number;
  className?: string;
};

export default function GaugeChart({
  value,
  label = "المؤشر",
  max = 100,
  height = 144,
  className,
}: GaugeChartProps) {
  const safeMax = max > 0 ? max : 100;

  const percent = Math.max(
    0,
    Math.min(100, (value / safeMax) * 100),
  );

  const roundedPercent = Math.round(percent);

  return (
    <div
      className={[
        "w-full rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 text-center shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="relative mx-auto flex items-center justify-center rounded-full"
        style={{
          width: height,
          height,
          background: `conic-gradient(
            var(--app-primary) 0% ${percent}%,
            var(--app-card-soft) ${percent}% 100%
          )`,
        }}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={roundedPercent}
      >
        <div
          className="flex flex-col items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-card)] shadow-inner"
          style={{
            width: height - 32,
            height: height - 32,
          }}
        >
          <span
            className="text-3xl font-black text-[var(--app-primary)]"
            dir="ltr"
          >
            {roundedPercent}%
          </span>

          <span className="mt-1 max-w-[100px] truncate text-xs font-bold text-[var(--app-text-muted)]">
            {label}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs font-bold text-[var(--app-text-muted)]">
        <span>{label}</span>

        <span dir="ltr">
          {value} / {safeMax}
        </span>
      </div>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-card-soft)]"
        role="progressbar"
        aria-label={`تقدم ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={roundedPercent}
      >
        <div
          className="h-full rounded-full bg-[var(--app-primary)] transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
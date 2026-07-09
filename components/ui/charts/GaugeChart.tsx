type GaugeChartProps = {
  value: number;
  label?: string;
  max?: number;
};

export default function GaugeChart({
  value,
  label = "المؤشر",
  max = 100,
}: GaugeChartProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-center shadow-sm">
      <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full bg conic-gradient">
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <span className="text-3xl font-black text-[#15445A]">
            {Math.round(percent)}%
          </span>
          <span className="mt-1 text-xs font-bold text-slate-500">
            {label}
          </span>
        </div>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-[#07A869]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
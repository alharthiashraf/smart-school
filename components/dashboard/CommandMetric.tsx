import type { ReactNode } from "react";

type CommandMetricProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
  badge: string;
};

export default function CommandMetric({
  icon,
  label,
  value,
  badge,
}: CommandMetricProps) {
  return (
    <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
        {icon}
      </div>

      <p className="text-xs font-bold text-[var(--app-text-muted)]">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-[var(--app-text)]">
        {value}
      </p>

      <span className="mt-2 inline-flex rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-black text-emerald-600">
        {badge}
      </span>
    </div>
  );
}
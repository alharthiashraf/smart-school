import { BaseCard } from "@/components/ui/cards";

export type MiniMetricProps = {
  label: string;
  value: string | number;
  loading?: boolean;
  className?: string;
};

export default function MiniMetric({
  label,
  value,
  loading = false,
  className = "",
}: MiniMetricProps) {
  return (
    <BaseCard
      as="article"
      variant="soft"
      padding="sm"
      className={[
        "text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p
        className="truncate text-lg font-black text-[var(--app-text)]"
        aria-live="polite"
      >
        {loading ? "..." : value}
      </p>

      <p className="mt-1 text-[11px] font-bold text-[var(--app-text-muted)]">
        {label}
      </p>
    </BaseCard>
  );
}

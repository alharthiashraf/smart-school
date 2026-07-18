import { AlertTriangle } from "lucide-react";

import { BaseCard } from "@/components/ui/cards";

export type BehaviorChartProps = {
  behaviorNotes: number;
  title?: string;
  description?: string;
  className?: string;
};

export default function BehaviorChart({
  behaviorNotes,
  title = "السلوك اليومي",
  description = "ملاحظات تحتاج مراجعة",
  className = "",
}: BehaviorChartProps) {
  const hasNotes = behaviorNotes > 0;

  const tone = hasNotes
    ? "bg-[var(--app-warning-soft)] text-[var(--app-warning)]"
    : "bg-[var(--app-green-soft)] text-[var(--app-green)]";

  return (
    <BaseCard
      as="section"
      padding="md"
      className={className}
    >
      <div className="flex items-center gap-3">
        <div
          className={[
            "flex h-11 w-11 items-center justify-center rounded-[var(--app-radius-lg)]",
            tone,
          ].join(" ")}
        >
          <AlertTriangle
            aria-hidden="true"
            className="h-5 w-5"
          />
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-black text-[var(--app-text)]">
            {title}
          </h2>

          <p className="mt-0.5 text-xs leading-5 text-[var(--app-text-muted)]">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-3xl font-black text-[var(--app-text)]">
            {behaviorNotes}
          </p>

          <p className="mt-1 text-xs font-bold text-[var(--app-text-muted)]">
            {hasNotes
              ? "توجد ملاحظات تحتاج إلى متابعة."
              : "لا توجد ملاحظات حالياً."}
          </p>
        </div>
      </div>
    </BaseCard>
  );
}

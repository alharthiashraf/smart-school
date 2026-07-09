import { AlertTriangle } from "lucide-react";

type BehaviorChartProps = {
  behaviorNotes: number;
};

export default function BehaviorChart({ behaviorNotes }: BehaviorChartProps) {
  const tone =
    behaviorNotes > 0
      ? "bg-[var(--app-warning-soft)] text-[var(--app-warning)]"
      : "bg-[var(--app-green-soft)] text-[var(--app-green)]";

  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-black text-[var(--app-text)]">السلوك اليومي</h2>
          <p className="text-xs text-[var(--app-text-muted)]">ملاحظات تحتاج مراجعة</p>
        </div>
      </div>

      <p className="mt-5 text-3xl font-black text-[var(--app-text)]">
        {behaviorNotes}
      </p>
    </section>
  );
}

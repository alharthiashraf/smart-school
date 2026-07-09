import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";

export type SmartInsightTone = "green" | "gold" | "red" | "blue" | "teal";

export type SmartInsightItem = {
  title: string;
  description: string;
  tone: SmartInsightTone;
  icon: ReactNode;
};

type SmartInsightsProps = {
  insights: SmartInsightItem[];
};

const tones: Record<SmartInsightTone, string> = {
  green: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
  gold: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
  red: "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
  blue: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
  teal: "bg-[var(--app-teal-soft)] text-[var(--app-teal)]",
};

export default function SmartInsights({ insights }: SmartInsightsProps) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 text-[var(--app-text)] shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black">Smart Insights</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
          توصيات ومؤشرات ذكية مبنية على بيانات اليوم.
        </p>
      </div>

      {insights.length === 0 ? (
        <EmptyState title="لا توجد توصيات" description="لا توجد مؤشرات تحتاج إجراء حالياً." />
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.title}
              className="flex gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tones[insight.tone]}`}>
                {insight.icon}
              </div>
              <div>
                <p className="text-sm font-black">{insight.title}</p>
                <p className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]">
                  {insight.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

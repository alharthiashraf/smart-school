import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

import { BaseCard } from "@/components/ui/cards";
import { EmptyState } from "@/components/ui/empty-state";

export type SmartInsightTone =
  | "primary"
  | "green"
  | "gold"
  | "red"
  | "neutral";

export type SmartInsightItem = {
  title: string;
  description: string;
  tone: SmartInsightTone;
  icon: ReactNode;
};

export type SmartInsightsProps = {
  insights: readonly SmartInsightItem[];
  title?: string;
  description?: string;
  className?: string;
};

const TONE_CLASSES: Record<SmartInsightTone, string> = {
  primary:
    "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)]",
  green:
    "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)]",
  gold:
    "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]",
  red:
    "bg-[color-mix(in_srgb,var(--app-danger)_12%,transparent)] text-[var(--app-danger)]",
  neutral:
    "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
};

export default function SmartInsights({
  insights,
  title = "الرؤى الذكية",
  description = "أهم الملاحظات الحالية.",
  className = "",
}: SmartInsightsProps) {
  return (
    <BaseCard
      as="section"
      padding="md"
      className={className}
      aria-labelledby="smart-insights-title"
    >
      <header className="mb-4">
        <h2
          id="smart-insights-title"
          className="text-lg font-black text-[var(--app-text)]"
        >
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            {description}
          </p>
        ) : null}
      </header>

      {insights.length === 0 ? (
        <EmptyState
          title="لا توجد رؤى"
          description="لا توجد ملاحظات حالية."
          icon={<Sparkles className="h-7 w-7" aria-hidden="true" />}
        />
      ) : (
        <ul className="space-y-3" aria-label={title}>
          {insights.map((insight) => (
            <li key={`${insight.title}-${insight.description}`}>
              <article className="flex gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 transition hover:bg-[var(--app-card)] hover:shadow-[var(--app-shadow-sm)]">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] ${TONE_CLASSES[insight.tone]}`}
                  aria-hidden="true"
                >
                  {insight.icon}
                </span>

                <div className="min-w-0">
                  <h3 className="text-sm font-black text-[var(--app-text)]">
                    {insight.title}
                  </h3>

                  <p className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]">
                    {insight.description}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </BaseCard>
  );
}

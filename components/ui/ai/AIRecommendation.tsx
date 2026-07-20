import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";

export type AIRecommendationProps = {
  title?: string;
  recommendation: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AIRecommendation({
  title = "توصية ذكية",
  recommendation,
  action,
  icon,
  className,
}: AIRecommendationProps) {
  return (
    <section
      className={cx(
        "overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-accent)]/25 bg-[var(--app-accent-soft)] text-[var(--app-text)] shadow-sm",
        className,
      )}
      aria-labelledby="ai-recommendation-title"
    >
      <div className="flex items-start gap-3 px-5 py-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-card)] text-[var(--app-accent)] shadow-sm"
          aria-hidden="true"
        >
          {icon ?? <Lightbulb className="h-5 w-5" />}
        </div>

        <div className="min-w-0">
          <h3
            id="ai-recommendation-title"
            className="text-base font-black tracking-tight text-[var(--app-text)]"
          >
            {title}
          </h3>

          <p className="mt-2 text-sm leading-7 text-[var(--app-text-muted)]">
            {recommendation}
          </p>
        </div>
      </div>

      {action && (
        <div className="border-t border-[var(--app-border)] bg-[var(--app-card)]/40 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">{action}</div>
        </div>
      )}
    </section>
  );
}

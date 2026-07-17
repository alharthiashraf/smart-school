import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";

export type AIRecommendationProps = {
  title?: string;
  recommendation: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export default function AIRecommendation({
  title = "توصية ذكية",
  recommendation,
  action,
  icon,
  className,
}: AIRecommendationProps) {
  return (
    <section
      className={[
        "rounded-[var(--app-radius-xl)] border border-[var(--app-accent)]/25 bg-[var(--app-accent-soft)] p-5 text-[var(--app-text)] shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-card)] text-[var(--app-accent)] shadow-sm"
          aria-hidden="true"
        >
          {icon ?? <Lightbulb className="h-5 w-5" />}
        </div>

        <h3 className="text-base font-black text-[var(--app-text)]">
          {title}
        </h3>
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--app-text-muted)]">
        {recommendation}
      </p>

      {action && (
        <div className="mt-5 border-t border-[var(--app-border)] pt-4">
          {action}
        </div>
      )}
    </section>
  );
}
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export type AIInsightTone =
  | "info"
  | "success"
  | "warning"
  | "danger";

export type AIInsightCardProps = {
  title?: string;
  description: string;
  icon?: ReactNode;
  tone?: AIInsightTone;
  confidence?: number;
  action?: ReactNode;
  className?: string;
};

type AIInsightStyle = {
  container: string;
  icon: string;
  badge: string;
};

const styles: Record<AIInsightTone, AIInsightStyle> = {
  info: {
    container:
      "border-[var(--app-blue)]/20 bg-[var(--app-blue-soft)]",
    icon:
      "bg-[var(--app-card)] text-[var(--app-blue)]",
    badge:
      "bg-[var(--app-card)] text-[var(--app-blue)]",
  },

  success: {
    container:
      "border-[var(--app-green)]/20 bg-[var(--app-green-soft)]",
    icon:
      "bg-[var(--app-card)] text-[var(--app-green)]",
    badge:
      "bg-[var(--app-card)] text-[var(--app-green)]",
  },

  warning: {
    container:
      "border-[var(--app-accent)]/25 bg-[var(--app-accent-soft)]",
    icon:
      "bg-[var(--app-card)] text-[var(--app-accent)]",
    badge:
      "bg-[var(--app-card)] text-[var(--app-accent)]",
  },

  danger: {
    container:
      "border-[var(--app-destructive)]/20 bg-[var(--app-destructive-soft)]",
    icon:
      "bg-[var(--app-card)] text-[var(--app-destructive)]",
    badge:
      "bg-[var(--app-card)] text-[var(--app-destructive)]",
  },
};

export default function AIInsightCard({
  title = "تحليل الذكاء الاصطناعي",
  description,
  icon,
  tone = "info",
  confidence,
  action,
  className,
}: AIInsightCardProps) {
  const normalizedConfidence =
    typeof confidence === "number"
      ? Math.max(0, Math.min(confidence, 100))
      : null;

  return (
    <section
      className={[
        "rounded-[var(--app-radius-xl)] border p-5 text-[var(--app-text)] shadow-sm",
        styles[tone].container,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] shadow-sm",
              styles[tone].icon,
            ].join(" ")}
            aria-hidden="true"
          >
            {icon ?? <Sparkles className="h-5 w-5" />}
          </div>

          <div className="min-w-0">
            <h3 className="font-black text-[var(--app-text)]">
              {title}
            </h3>

            {normalizedConfidence !== null && (
              <span
                className={[
                  "mt-1 inline-flex rounded-full border border-[var(--app-border)] px-2.5 py-1 text-[11px] font-black",
                  styles[tone].badge,
                ].join(" ")}
              >
                درجة الثقة{" "}
                <span className="mr-1" dir="ltr">
                  {normalizedConfidence}%
                </span>
              </span>
            )}
          </div>
        </div>

        {action && (
          <div className="shrink-0">
            {action}
          </div>
        )}
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--app-text-muted)]">
        {description}
      </p>
    </section>
  );
}

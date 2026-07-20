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
  progress: string;
};

const INSIGHT_STYLES: Record<AIInsightTone, AIInsightStyle> = {
  info: {
    container:
      "border-[var(--app-blue)]/20 bg-[var(--app-blue-soft)]",
    icon:
      "bg-[var(--app-card)] text-[var(--app-blue)]",
    badge:
      "bg-[var(--app-card)] text-[var(--app-blue)]",
    progress:
      "bg-[var(--app-blue)]",
  },
  success: {
    container:
      "border-[var(--app-green)]/20 bg-[var(--app-green-soft)]",
    icon:
      "bg-[var(--app-card)] text-[var(--app-green)]",
    badge:
      "bg-[var(--app-card)] text-[var(--app-green)]",
    progress:
      "bg-[var(--app-green)]",
  },
  warning: {
    container:
      "border-[var(--app-accent)]/25 bg-[var(--app-accent-soft)]",
    icon:
      "bg-[var(--app-card)] text-[var(--app-accent)]",
    badge:
      "bg-[var(--app-card)] text-[var(--app-accent)]",
    progress:
      "bg-[var(--app-accent)]",
  },
  danger: {
    container:
      "border-[var(--app-destructive)]/20 bg-[var(--app-destructive-soft)]",
    icon:
      "bg-[var(--app-card)] text-[var(--app-destructive)]",
    badge:
      "bg-[var(--app-card)] text-[var(--app-destructive)]",
    progress:
      "bg-[var(--app-destructive)]",
  },
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeConfidence(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function AIInsightCard({
  title = "تحليل الذكاء الاصطناعي",
  description,
  icon,
  tone = "info",
  confidence,
  action,
  className,
}: AIInsightCardProps) {
  const style = INSIGHT_STYLES[tone];
  const normalizedConfidence = normalizeConfidence(confidence);
  const titleId = `ai-insight-${tone}`;

  return (
    <section
      className={cx(
        "overflow-hidden rounded-[var(--app-radius-xl)] border text-[var(--app-text)] shadow-sm",
        style.container,
        className,
      )}
      aria-labelledby={titleId}
    >
      <div className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cx(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] shadow-sm",
                style.icon,
              )}
              aria-hidden="true"
            >
              {icon ?? <Sparkles className="h-5 w-5" />}
            </div>

            <div className="min-w-0">
              <h3
                id={titleId}
                className="font-black tracking-tight text-[var(--app-text)]"
              >
                {title}
              </h3>

              {normalizedConfidence !== null && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={cx(
                      "inline-flex items-center rounded-full border border-[var(--app-border)] px-2.5 py-1 text-[11px] font-black",
                      style.badge,
                    )}
                  >
                    درجة الثقة
                    <span className="mr-1" dir="ltr">
                      {normalizedConfidence}%
                    </span>
                  </span>

                  <div
                    className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--app-card)]/70"
                    aria-hidden="true"
                  >
                    <div
                      className={cx("h-full rounded-full", style.progress)}
                      style={{ width: `${normalizedConfidence}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {action && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {action}
            </div>
          )}
        </div>

        <p className="mt-4 text-sm leading-7 text-[var(--app-text-muted)]">
          {description}
        </p>
      </div>
    </section>
  );
}

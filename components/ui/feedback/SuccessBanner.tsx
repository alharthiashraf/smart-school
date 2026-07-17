import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

export type SuccessBannerProps = {
  title?: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export default function SuccessBanner({
  title = "تم بنجاح",
  description,
  icon,
  action,
  className,
}: SuccessBannerProps) {
  return (
    <section
      className={[
        "rounded-[var(--app-radius-xl)] border border-[var(--app-green)]/20 bg-[var(--app-green-soft)] p-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-labelledby="success-banner-title"
      aria-describedby="success-banner-description"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-card)] text-[var(--app-green)]"
            aria-hidden="true"
          >
            {icon ?? <CheckCircle2 className="h-6 w-6" />}
          </div>

          <div className="min-w-0">
            <h3
              id="success-banner-title"
              className="font-black text-[var(--app-green)]"
            >
              {title}
            </h3>

            <p
              id="success-banner-description"
              className="mt-1 text-sm font-bold leading-7 text-[var(--app-text-muted)]"
            >
              {description}
            </p>
          </div>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </section>
  );
}
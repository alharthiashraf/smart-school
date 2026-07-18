import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export default function ErrorState({
  title = "حدث خطأ",
  description = "تعذر تحميل البيانات. حاول مرة أخرى.",
  action,
  className,
}: ErrorStateProps) {
  return (
    <section
      className={[
        "rounded-[var(--app-radius-xl)] border border-[var(--app-destructive)]/20 bg-[var(--app-destructive-soft)] p-6 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="alert"
      aria-labelledby="error-state-title"
      aria-describedby="error-state-description"
    >
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--app-card)] text-[var(--app-destructive)]"
        aria-hidden="true"
      >
        <AlertTriangle className="h-7 w-7" />
      </div>

      <h3
        id="error-state-title"
        className="text-lg font-black text-[var(--app-destructive)]"
      >
        {title}
      </h3>

      <p
        id="error-state-description"
        className="mx-auto mt-2 max-w-md text-sm leading-7 text-[var(--app-text-muted)]"
      >
        {description}
      </p>

      {action && (
        <div className="mt-5 flex justify-center">
          {action}
        </div>
      )}
    </section>
  );
}

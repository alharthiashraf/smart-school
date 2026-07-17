import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({
  title = "لا توجد بيانات",
  description = "لم يتم العثور على سجلات لعرضها حاليًا.",
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <section
      className={[
        "rounded-[var(--app-radius-xl)] border border-dashed border-[var(--app-border)] bg-[var(--app-card)] p-8 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="empty-state-title"
      aria-describedby="empty-state-description"
    >
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]"
        aria-hidden="true"
      >
        {icon ?? <Inbox className="h-7 w-7" />}
      </div>

      <h3
        id="empty-state-title"
        className="text-lg font-black text-[var(--app-text)]"
      >
        {title}
      </h3>

      <p
        id="empty-state-description"
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
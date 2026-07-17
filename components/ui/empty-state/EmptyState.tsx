"use client";

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

import PrimaryButton from "../buttons/PrimaryButton";

export type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
};

export default function EmptyState({
  title = "لا توجد بيانات",
  description = "لم يتم العثور على أي بيانات لعرضها.",
  icon,
  action,
  actionText,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <section
      className={[
        "flex flex-col items-center justify-center rounded-[var(--app-radius-xl)] border border-dashed border-[var(--app-border)] bg-[var(--app-card)] px-8 py-12 text-center shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="empty-state-title"
      aria-describedby="empty-state-description"
    >
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--app-primary-soft)] text-[var(--app-primary)]"
        aria-hidden="true"
      >
        {icon ?? <Inbox className="h-10 w-10" />}
      </div>

      <h3
        id="empty-state-title"
        className="mt-6 text-xl font-black text-[var(--app-text)]"
      >
        {title}
      </h3>

      <p
        id="empty-state-description"
        className="mt-2 max-w-md text-sm leading-7 text-[var(--app-text-muted)]"
      >
        {description}
      </p>

      {action && <div className="mt-6">{action}</div>}

      {!action && actionText && onAction && (
        <div className="mt-6">
          <PrimaryButton
            type="button"
            onClick={onAction}
          >
            {actionText}
          </PrimaryButton>
        </div>
      )}
    </section>
  );
}
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type PageSectionProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;

  loading?: boolean;
  loadingText?: string;

  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

export default function PageSection({
  title,
  description,
  icon,
  badge,
  actions,
  children,
  className,
  loading = false,
  loadingText = "جاري التحميل...",
  empty = false,
  emptyTitle = "لا توجد بيانات",
  emptyDescription = "لم يتم العثور على محتوى لعرضه حاليًا.",
}: PageSectionProps) {
  const hasHeader = Boolean(
    title || description || actions || icon || badge,
  );

  return (
    <section
      className={[
        "rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 text-[var(--app-text)] shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-busy={loading}
    >
      {hasHeader && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]"
                aria-hidden="true"
              >
                {icon}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {title && (
                  <h2 className="text-lg font-black text-[var(--app-text)]">
                    {title}
                  </h2>
                )}

                {badge}
              </div>

              {description && (
                <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
                  {description}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div
          className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text-muted)]"
          role="status"
          aria-live="polite"
        >
          <Loader2
            aria-hidden="true"
            className="ml-2 h-5 w-5 animate-spin text-[var(--app-primary)]"
          />
          {loadingText}
        </div>
      ) : empty ? (
        <div
          className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-center"
          role="status"
        >
          <p className="text-sm font-black text-[var(--app-text)]">
            {emptyTitle}
          </p>

          <p className="mt-1 max-w-md text-xs leading-6 text-[var(--app-text-muted)]">
            {emptyDescription}
          </p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

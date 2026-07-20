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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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
  const hasHeader = Boolean(title || description || actions || icon || badge);
  const showEmptyState = !loading && empty;

  return (
    <section
      className={cx(
        "overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-sm",
        className,
      )}
      aria-busy={loading}
    >
      {hasHeader && (
        <div className="flex flex-col gap-4 border-b border-[var(--app-border)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
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
                  <h2 className="text-lg font-black tracking-tight text-[var(--app-text)]">
                    {title}
                  </h2>
                )}

                {badge && <div className="shrink-0">{badge}</div>}
              </div>

              {description && (
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--app-text-muted)]">
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

      <div className="p-5">
        {loading ? (
          <SectionLoadingState text={loadingText} />
        ) : showEmptyState ? (
          <SectionEmptyState
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function SectionLoadingState({ text }: { text: string }) {
  return (
    <div
      className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text-muted)]"
      role="status"
      aria-live="polite"
    >
      <Loader2
        className="ml-2 h-5 w-5 animate-spin text-[var(--app-primary)]"
        aria-hidden="true"
      />
      <span>{text}</span>
    </div>
  );
}

function SectionEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-card-soft)] px-5 py-8 text-center"
      role="status"
    >
      <p className="text-sm font-black text-[var(--app-text)]">{title}</p>

      <p className="mt-1 max-w-md text-xs leading-6 text-[var(--app-text-muted)]">
        {description}
      </p>
    </div>
  );
}

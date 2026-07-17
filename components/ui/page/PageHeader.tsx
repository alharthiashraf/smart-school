import Link from "next/link";
import type { ReactNode } from "react";

export type PageHeaderBreadcrumbItem = {
  label: string;
  href?: string;
};

export type PageHeaderMetaItem = {
  label: string;
  value: ReactNode;
};

export type PageHeaderStatTone =
  | "default"
  | "primary"
  | "blue"
  | "green"
  | "emerald"
  | "red"
  | "amber"
  | "gold"
  | "purple"
  | "slate";

export type PageHeaderStatItem = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: PageHeaderStatTone;
};

export type PageHeaderVariant = "default" | "hero" | "compact";

export type PageHeaderProps = {
  title: string;
  description?: string;
  badge?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: PageHeaderBreadcrumbItem[];
  meta?: PageHeaderMetaItem[];
  stats?: PageHeaderStatItem[];
  lastUpdated?: ReactNode;
  variant?: PageHeaderVariant;
  className?: string;
};

function getToneClass(tone: PageHeaderStatTone = "default") {
  const tones: Record<PageHeaderStatTone, string> = {
    default:
      "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",

    primary:
      "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",

    blue:
      "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",

    green:
      "bg-[var(--app-green-soft)] text-[var(--app-green)]",

    /*
     * توافق مؤقت مع الاستخدامات القديمة.
     * يعرض نفس لون success.
     */
    emerald:
      "bg-[var(--app-green-soft)] text-[var(--app-green)]",

    red:
      "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",

    amber:
      "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",

    gold:
      "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",

    /*
     * توافق مؤقت مع الاستخدامات الحالية.
     * يعرض اللون الأساسي بدل purple الثابت.
     */
    purple:
      "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",

    slate:
      "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
  };

  return tones[tone];
}

export default function PageHeader({
  title,
  description,
  badge,
  icon,
  actions,
  breadcrumbs,
  meta,
  stats,
  lastUpdated,
  variant = "default",
  className,
}: PageHeaderProps) {
  const isHero = variant === "hero";
  const isCompact = variant === "compact";

  return (
    <header
      className={[
        "mb-6 rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-sm",
        isHero ? "p-6" : isCompact ? "p-4" : "p-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--app-text-muted)]"
          aria-label="مسار الصفحة"
        >
          {breadcrumbs.map((item, index) => {
            const isCurrent = !item.href;
            const isLast = index === breadcrumbs.length - 1;

            return (
              <span
                key={`${item.label}-${index}`}
                className="flex items-center gap-2"
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    className="rounded-md transition hover:text-[var(--app-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary-soft)]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={
                      isCurrent
                        ? "text-[var(--app-text)]"
                        : "text-[var(--app-text-muted)]"
                    }
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}

                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="text-[var(--app-border-strong)]"
                  >
                    /
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {icon && (
            <div
              className={[
                "flex shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
                isHero ? "h-14 w-14" : "h-12 w-12",
              ].join(" ")}
              aria-hidden="true"
            >
              {icon}
            </div>
          )}

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1
                className={[
                  "truncate font-black text-[var(--app-text)]",
                  isHero
                    ? "text-3xl"
                    : isCompact
                      ? "text-xl"
                      : "text-2xl",
                ].join(" ")}
              >
                {title}
              </h1>

              {badge}
            </div>

            {description && (
              <p className="max-w-4xl text-sm leading-7 text-[var(--app-text-muted)]">
                {description}
              </p>
            )}

            {lastUpdated && (
              <p className="mt-2 text-xs font-bold text-[var(--app-text-muted)]">
                آخر تحديث: {lastUpdated}
              </p>
            )}

            {meta && meta.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {meta.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-2"
                  >
                    <p className="text-[11px] font-bold text-[var(--app-text-muted)]">
                      {item.label}
                    </p>

                    <p className="mt-0.5 text-xs font-black text-[var(--app-text)]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {stats && stats.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-3"
                  >
                    {item.icon && (
                      <div
                        className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
                          getToneClass(item.tone),
                        ].join(" ")}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-[var(--app-text-muted)]">
                        {item.label}
                      </p>

                      <p className="mt-0.5 truncate text-sm font-black text-[var(--app-text)]">
                        {item.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
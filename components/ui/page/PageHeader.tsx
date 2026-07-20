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

const TONE_CLASSES: Record<PageHeaderStatTone, string> = {
  default: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
  primary: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
  blue: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
  green: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
  emerald: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
  red: "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
  amber: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
  gold: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
  purple: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
  slate: "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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
      className={cx(
        "mb-6 overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-sm",
        className,
      )}
    >
      <div className={cx(isHero ? "p-6 lg:p-7" : isCompact ? "p-4" : "p-5")}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--app-text-muted)]"
            aria-label="مسار الصفحة"
          >
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <span
                  key={`${item.label}-${index}`}
                  className="inline-flex items-center gap-2"
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
                      className="text-[var(--app-text)]"
                      aria-current="page"
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

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            {icon && (
              <div
                className={cx(
                  "flex shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
                  isHero ? "h-14 w-14" : "h-12 w-12",
                )}
                aria-hidden="true"
              >
                {icon}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className={cx(
                    "font-black tracking-tight text-[var(--app-text)]",
                    isHero
                      ? "text-2xl sm:text-3xl"
                      : isCompact
                        ? "text-xl"
                        : "text-2xl",
                  )}
                >
                  {title}
                </h1>

                {badge && (
                  <div className="shrink-0">
                    {badge}
                  </div>
                )}
              </div>

              {description && (
                <p className="mt-2 max-w-4xl text-sm leading-7 text-[var(--app-text-muted)]">
                  {description}
                </p>
              )}

              {lastUpdated && (
                <p className="mt-2 text-xs font-bold text-[var(--app-text-muted)]">
                  آخر تحديث: {lastUpdated}
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

        {meta && meta.length > 0 && (
          <div
            className={cx(
              "mt-5 flex flex-wrap gap-2",
              isHero && "border-t border-[var(--app-border)] pt-5",
            )}
          >
            {meta.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-2"
              >
                <span className="text-xs font-bold text-[var(--app-text-muted)]">
                  {item.label}
                </span>

                <span className="text-xs font-black text-[var(--app-text)]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="border-t border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 sm:p-5">
          <div
            className={cx(
              "grid gap-3",
              stats.length === 1 && "grid-cols-1",
              stats.length === 2 && "sm:grid-cols-2",
              stats.length === 3 && "sm:grid-cols-2 lg:grid-cols-3",
              stats.length >= 4 && "sm:grid-cols-2 xl:grid-cols-4",
            )}
          >
            {stats.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-sm"
              >
                {item.icon && (
                  <div
                    className={cx(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      TONE_CLASSES[item.tone ?? "default"],
                    )}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-xl font-black leading-none text-[var(--app-text)]">
                    {item.value}
                  </p>

                  <p className="mt-1.5 truncate text-xs font-bold text-[var(--app-text-muted)]">
                    {item.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageHeaderMetaItem = {
  label: string;
  value: ReactNode;
};

type PageHeaderStatTone =
  | "default"
  | "blue"
  | "green"
  | "emerald"
  | "red"
  | "amber"
  | "purple"
  | "slate"
  | string;

type PageHeaderStatItem = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: PageHeaderStatTone;
};

type PageHeaderVariant = "default" | "hero" | "compact";

type PageHeaderProps = {
  title: string;
  description?: string;
  badge?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  meta?: PageHeaderMetaItem[];
  stats?: PageHeaderStatItem[];
  lastUpdated?: ReactNode;
  variant?: PageHeaderVariant | string;
  className?: string;
};

function getToneClass(tone?: PageHeaderStatTone) {
  switch (tone) {
    case "blue":
      return "text-[var(--app-blue)] bg-[var(--app-blue-soft)]";
    case "green":
    case "emerald":
      return "text-[var(--app-green)] bg-[var(--app-green-soft)]";
    case "red":
      return "text-[var(--app-destructive)] bg-[var(--app-destructive-soft)]";
    case "amber":
      return "text-[var(--app-warning)] bg-[var(--app-warning-soft)]";
    case "purple":
      return "text-purple-700 bg-purple-500/10 dark:text-purple-300";
    case "slate":
      return "text-[var(--app-text-muted)] bg-[var(--app-card-soft)]";
    default:
      return "text-[var(--app-teal)] bg-[var(--app-teal-soft)]";
  }
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
  className = "",
}: PageHeaderProps) {
  const isHero = variant === "hero";
  const isCompact = variant === "compact";

  return (
    <header
      className={[
        "mb-6 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-sm",
        isHero ? "p-6" : isCompact ? "p-4" : "p-5",
        className,
      ].join(" ")}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--app-text-muted)]">
          {breadcrumbs.map((item, index) => (
            <span key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href ? (
                <Link href={item.href} className="transition hover:text-[var(--app-teal)]">
                  {item.label}
                </Link>
              ) : (
                <span className="text-[var(--app-text-muted)]">{item.label}</span>
              )}

              {index < breadcrumbs.length - 1 && (
                <span className="text-[var(--app-border)]">/</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {icon && (
            <div
              className={[
                "flex shrink-0 items-center justify-center rounded-2xl bg-[var(--app-teal-soft)] text-[var(--app-teal)]",
                isHero ? "h-14 w-14" : "h-12 w-12",
              ].join(" ")}
            >
              {icon}
            </div>
          )}

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1
                className={[
                  "truncate font-black text-[var(--app-text)]",
                  isHero ? "text-3xl" : isCompact ? "text-xl" : "text-2xl",
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

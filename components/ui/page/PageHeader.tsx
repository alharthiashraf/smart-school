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
      return "text-blue-700";
    case "green":
    case "emerald":
      return "text-emerald-700";
    case "red":
      return "text-red-700";
    case "amber":
      return "text-amber-700";
    case "purple":
      return "text-purple-700";
    case "slate":
      return "text-slate-700";
    default:
      return "text-emerald-700";
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
      className={`mb-6 rounded-[24px] border border-slate-200 bg-white shadow-sm ${
        isHero ? "p-6" : isCompact ? "p-4" : "p-5"
      } ${className}`}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
          {breadcrumbs.map((item, index) => (
            <span key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href ? (
                <a href={item.href} className="transition hover:text-emerald-700">
                  {item.label}
                </a>
              ) : (
                <span className="text-slate-500">{item.label}</span>
              )}

              {index < breadcrumbs.length - 1 && (
                <span className="text-slate-300">/</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {icon && (
            <div
              className={`flex shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ${
                isHero ? "h-14 w-14" : "h-12 w-12"
              }`}
            >
              {icon}
            </div>
          )}

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1
                className={`truncate font-black text-slate-950 ${
                  isHero ? "text-3xl" : isCompact ? "text-xl" : "text-2xl"
                }`}
              >
                {title}
              </h1>
              {badge}
            </div>

            {description && (
              <p className="max-w-4xl text-sm leading-7 text-slate-500">
                {description}
              </p>
            )}

            {lastUpdated && (
              <p className="mt-2 text-xs font-bold text-slate-400">
                آخر تحديث: {lastUpdated}
              </p>
            )}

            {meta && meta.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {meta.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <p className="text-[11px] font-bold text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs font-black text-slate-700">
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
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
                  >
                    {item.icon && (
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ${getToneClass(
                          item.tone,
                        )}`}
                      >
                        {item.icon}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-black text-slate-800">
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
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, Clock } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type HeaderMetaItem = {
  label: string;
  value: string | number;
  icon?: ReactNode;
};

type HeaderTone =
  | "primary"
  | "teal"
  | "green"
  | "blue"
  | "gold"
  | "amber"
  | "red"
  | "slate"
  | "purple";

type HeaderStatItem = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: HeaderTone;
};

type PageHeaderVariant = "default" | "hero" | "compact";

type PageHeaderProps = {
  title: string;
  description?: string;
  badge?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  meta?: HeaderMetaItem[];
  stats?: HeaderStatItem[];
  lastUpdated?: string;
  variant?: PageHeaderVariant;
  className?: string;
};

const toneClasses: Record<HeaderTone, string> = {
  primary: "bg-[#15445A]/10 text-[#15445A]",
  teal: "bg-[#0DA9A6]/10 text-[#0DA9A6]",
  green: "bg-[#07A869]/10 text-[#07A869]",
  blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
  gold: "bg-[#C1B489]/20 text-[#15445A]",
  amber: "bg-[#C1B489]/20 text-[#15445A]",
  red: "bg-red-50 text-red-600",
  slate: "bg-slate-100 text-slate-700",
  purple: "bg-purple-50 text-purple-700",
};

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
      dir="rtl"
      className={[
        "overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm",
        isHero ? "p-6 md:p-7" : isCompact ? "p-4" : "p-5",
        className,
      ].join(" ")}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs font-bold text-slate-500">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <div key={`${item.label}-${index}`} className="flex items-center gap-1">
                {item.href && !isLast ? (
                  <Link href={item.href} className="transition hover:text-[#0DA9A6]">
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-[#15445A]" : ""}>{item.label}</span>
                )}

                {!isLast && <ChevronLeft className="h-3.5 w-3.5 text-slate-300" />}
              </div>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {badge && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#0DA9A6]/10 px-4 py-2 text-xs font-black text-[#15445A]">
              {icon && <span className="text-[#0DA9A6]">{icon}</span>}
              {badge}
            </div>
          )}

          <div className="flex items-start gap-3">
            {icon && !badge && (
              <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
                {icon}
              </div>
            )}

            <div className="min-w-0">
              <h1
                className={[
                  "font-black tracking-tight text-[#15445A]",
                  isHero ? "text-4xl md:text-5xl" : isCompact ? "text-xl" : "text-2xl md:text-3xl",
                ].join(" ")}
              >
                {title}
              </h1>

              {description && (
                <p
                  className={[
                    "mt-2 max-w-4xl leading-7 text-slate-600",
                    isCompact ? "text-xs" : "text-sm md:text-base",
                  ].join(" ")}
                >
                  {description}
                </p>
              )}
            </div>
          </div>

          {(meta && meta.length > 0) || lastUpdated ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {meta?.map((item) => (
                <InfoPill key={item.label} label={item.label} value={item.value} icon={item.icon} />
              ))}

              {lastUpdated && (
                <InfoPill
                  label="آخر تحديث"
                  value={lastUpdated}
                  icon={<Clock className="h-4 w-4" />}
                />
              )}
            </div>
          ) : null}
        </div>

        {actions && (
          <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
            {actions}
          </div>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <StatPill key={item.label} {...item} />
          ))}
        </div>
      )}
    </header>
  );
}

function InfoPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-[#0DA9A6]">{icon}</span>}
        <p className="text-xs font-bold text-slate-500">{label}</p>
      </div>

      <p className="mt-1 line-clamp-1 font-black text-[#15445A]">{value}</p>
    </div>
  );
}

function StatPill({
  label,
  value,
  icon,
  tone = "teal",
}: HeaderStatItem) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-black text-[#15445A]">{value}</p>
        </div>

        {icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

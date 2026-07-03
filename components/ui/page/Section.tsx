import type { ReactNode } from "react";
import { ChevronDown, Inbox, Loader2 } from "lucide-react";

type SectionVariant = "default" | "flat" | "elevated" | "hero" | "bordered";
type SectionPadding = "none" | "sm" | "md" | "lg";

type SectionProps = {
  title?: string;
  description?: string;
  badge?: string | number;
  icon?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  variant?: SectionVariant;
  padding?: SectionPadding;
  headerDivider?: boolean;
  hoverable?: boolean;
  loading?: boolean;
  loadingText?: string;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
};

const variantClasses: Record<SectionVariant, string> = {
  default: "border border-slate-100 bg-white shadow-sm",
  flat: "border border-transparent bg-slate-50 shadow-none",
  elevated: "border border-slate-100 bg-white shadow-md",
  hero: "border border-slate-100 bg-white shadow-sm",
  bordered: "border border-slate-200 bg-white shadow-none",
};

const paddingClasses: Record<SectionPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-5",
  lg: "p-6 md:p-7",
};

export default function Section({
  title,
  description,
  badge,
  icon,
  actions,
  footer,
  children,
  variant = "default",
  padding = "md",
  headerDivider = true,
  hoverable = false,
  loading = false,
  loadingText = "جاري تحميل البيانات...",
  empty = false,
  emptyTitle = "لا توجد بيانات",
  emptyDescription = "لا توجد عناصر متاحة للعرض حاليًا.",
  emptyIcon,
  collapsible = false,
  defaultCollapsed = false,
  className = "",
  headerClassName = "",
  bodyClassName = "",
  footerClassName = "",
}: SectionProps) {
  const hasHeader = title || description || actions || icon || badge;
  const bodyId = title ? `section-${title.replace(/\s+/g, "-")}` : undefined;

  return (
    <section
      dir="rtl"
      className={[
        "overflow-hidden rounded-[28px] transition-all duration-200",
        variantClasses[variant],
        hoverable ? "hover:-translate-y-0.5 hover:shadow-md" : "",
        className,
      ].join(" ")}
    >
      {hasHeader && (
        <div
          className={[
            paddingClasses[padding],
            headerDivider ? "border-b border-slate-100" : "",
            variant === "hero" ? "bg-gradient-to-l from-slate-50 to-white" : "",
            headerClassName,
          ].join(" ")}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {icon && (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
                  {icon}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {title && (
                    <h2 className="text-xl font-black text-[#15445A]">
                      {title}
                    </h2>
                  )}

                  {badge !== undefined && badge !== null && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {badge}
                    </span>
                  )}
                </div>

                {description && (
                  <p className="mt-1 max-w-3xl text-sm leading-7 text-slate-500">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {actions}

              {collapsible && (
                <button
                  type="button"
                  aria-expanded={!defaultCollapsed}
                  aria-controls={bodyId}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 transition hover:bg-slate-100"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!defaultCollapsed && (
        <div
          id={bodyId}
          className={[
            hasHeader ? paddingClasses[padding] : paddingClasses[padding],
            bodyClassName,
          ].join(" ")}
        >
          {loading ? (
            <SectionLoading text={loadingText} />
          ) : empty ? (
            <SectionEmpty
              title={emptyTitle}
              description={emptyDescription}
              icon={emptyIcon}
            />
          ) : (
            children
          )}
        </div>
      )}

      {footer && (
        <div
          className={[
            "border-t border-slate-100 bg-slate-50/60",
            paddingClasses[padding],
            footerClassName,
          ].join(" ")}
        >
          {footer}
        </div>
      )}
    </section>
  );
}

function SectionLoading({ text }: { text: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-3xl bg-slate-50">
      <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-[#0DA9A6]" />
        {text}
      </div>
    </div>
  );
}

function SectionEmpty({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
          {icon || <Inbox className="h-7 w-7" />}
        </div>

        <h3 className="text-lg font-black text-[#15445A]">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-7 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

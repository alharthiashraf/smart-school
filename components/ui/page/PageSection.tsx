import type { ReactNode } from "react";

type PageSectionProps = {
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
  className = "",
  loading = false,
  loadingText = "جاري التحميل...",
  empty = false,
  emptyTitle = "لا توجد بيانات",
  emptyDescription = "لم يتم العثور على محتوى لعرضه حالياً.",
}: PageSectionProps) {
  return (
    <section
      className={`rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {(title || description || actions || icon || badge) && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                {icon}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {title && (
                  <h2 className="text-lg font-black text-slate-950">
                    {title}
                  </h2>
                )}
                {badge}
              </div>

              {description && (
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {description}
                </p>
              )}
            </div>
          </div>

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-500">
          {loadingText}
        </div>
      ) : empty ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
          <p className="text-sm font-black text-slate-700">{emptyTitle}</p>
          <p className="mt-1 max-w-md text-xs leading-6 text-slate-500">
            {emptyDescription}
          </p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
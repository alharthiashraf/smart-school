import type { ReactNode } from "react";

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export default function FormSection({
  title,
  description,
  children,
  actions,
  className = "",
}: FormSectionProps) {
  return (
    <section
      className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-[#15445a]">{title}</h2>

          {description && (
            <p className="mt-1 text-sm leading-7 text-slate-500">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>

      {children}
    </section>
  );
}
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
      className={[
        "rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-5 text-[var(--app-text)] shadow-sm",
        className,
      ].join(" ")}
    >
      <div className="mb-5 flex flex-col gap-3 border-b border-[var(--app-border)] pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-[var(--app-text)]">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
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

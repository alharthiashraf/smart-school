import { FileText } from "lucide-react";

export type DataTableEmptyProps = {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
};

export default function DataTableEmpty({
  title = "لا توجد بيانات",
  description = "لم يتم العثور على سجلات مطابقة.",
  icon,
  className,
}: DataTableEmptyProps) {
  return (
    <div
      className={[
        "flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-[var(--app-radius-xl)] bg-[var(--app-card-soft)] text-[var(--app-text-muted)]">
        {icon ?? <FileText aria-hidden="true" className="h-6 w-6" />}
      </div>

      <h3 className="mt-4 text-base font-black text-[var(--app-text)]">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-7 text-[var(--app-text-muted)]">
        {description}
      </p>
    </div>
  );
}

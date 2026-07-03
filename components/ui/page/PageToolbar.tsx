import type { ReactNode } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

type ToolbarSearch = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

type ToolbarAction = {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
};

type PageToolbarVariant = "default" | "compact";

type PageToolbarProps = {
  search?: ToolbarSearch;
  filters?: ReactNode;
  actions?: ReactNode;
  actionItems?: ToolbarAction[];
  onAdd?: () => void;
  onRefresh?: () => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
  addLabel?: string;
  refreshLabel?: string;
  pdfLabel?: string;
  excelLabel?: string;
  printLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: PageToolbarVariant;
  children?: ReactNode;
  className?: string;
};

const buttonClasses: Record<NonNullable<ToolbarAction["variant"]>, string> = {
  primary: "bg-[#15445A] text-white hover:bg-[#0DA9A6]",
  secondary: "bg-[#0DA9A6] text-white hover:bg-[#08918f]",
  outline: "border border-slate-200 bg-white text-[#15445A] hover:bg-slate-50",
  ghost: "bg-slate-50 text-slate-600 hover:bg-slate-100",
  danger: "bg-red-50 text-red-700 hover:bg-red-100",
};

export default function PageToolbar({
  search,
  filters,
  actions,
  actionItems,
  onAdd,
  onRefresh,
  onExportPDF,
  onExportExcel,
  onPrint,
  addLabel = "إضافة",
  refreshLabel = "تحديث",
  pdfLabel = "PDF",
  excelLabel = "Excel",
  printLabel = "طباعة",
  loading = false,
  disabled = false,
  variant = "default",
  children,
  className = "",
}: PageToolbarProps) {
  const isCompact = variant === "compact";

  const quickActions: ToolbarAction[] = [
    ...(onRefresh
      ? [
          {
            label: refreshLabel,
            icon: <RefreshCcw className="h-4 w-4" />,
            onClick: onRefresh,
            variant: "ghost" as const,
            loading,
          },
        ]
      : []),
    ...(onAdd
      ? [
          {
            label: addLabel,
            icon: <Plus className="h-4 w-4" />,
            onClick: onAdd,
            variant: "primary" as const,
          },
        ]
      : []),
    ...(onExportPDF
      ? [
          {
            label: pdfLabel,
            icon: <FileText className="h-4 w-4" />,
            onClick: onExportPDF,
            variant: "outline" as const,
          },
        ]
      : []),
    ...(onExportExcel
      ? [
          {
            label: excelLabel,
            icon: <FileSpreadsheet className="h-4 w-4" />,
            onClick: onExportExcel,
            variant: "outline" as const,
          },
        ]
      : []),
    ...(onPrint
      ? [
          {
            label: printLabel,
            icon: <Printer className="h-4 w-4" />,
            onClick: onPrint,
            variant: "outline" as const,
          },
        ]
      : []),
    ...(actionItems || []),
  ];

  return (
    <section
      dir="rtl"
      className={[
        "rounded-[28px] border border-slate-100 bg-white shadow-sm",
        isCompact ? "p-3" : "p-4",
        className,
      ].join(" ")}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          {search && (
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={search.value}
                onChange={(event) => search.onChange(event.target.value)}
                disabled={disabled || search.disabled}
                placeholder={search.placeholder || "ابحث..."}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-sm text-[#15445A] outline-none transition placeholder:text-slate-400 focus:border-[#0DA9A6] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          )}

          {filters && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="hidden items-center gap-1 rounded-full bg-slate-50 px-3 py-2 text-xs font-black text-slate-500 lg:inline-flex">
                <SlidersHorizontal className="h-4 w-4" />
                الفلاتر
              </div>
              {filters}
            </div>
          )}

          {children && <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>}
        </div>

        {(quickActions.length > 0 || actions) && (
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {quickActions.map((action) => (
              <ToolbarButton
                key={action.label}
                action={action}
                disabled={disabled}
              />
            ))}

            {actions}
          </div>
        )}
      </div>
    </section>
  );
}

function ToolbarButton({
  action,
  disabled,
}: {
  action: ToolbarAction;
  disabled?: boolean;
}) {
  const isDisabled = disabled || action.disabled || action.loading;
  const variant = action.variant || "outline";

  const content = (
    <>
      {action.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : action.icon}
      <span>{action.label}</span>
    </>
  );

  const className = [
    "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60",
    buttonClasses[variant],
  ].join(" ");

  if (action.href) {
    return (
      <a
        href={isDisabled ? undefined : action.href}
        aria-disabled={isDisabled}
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={isDisabled}
      className={className}
    >
      {content}
    </button>
  );
}

export function ToolbarSelect({
  children,
  value,
  onChange,
  disabled,
  className = "",
}: {
  children: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      disabled={disabled}
      className={[
        "h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-[#15445A] outline-none transition focus:border-[#0DA9A6] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
    >
      {children}
    </select>
  );
}

export function ToolbarButtonLink({
  children,
  href,
  variant = "outline",
  className = "",
}: {
  children: ReactNode;
  href: string;
  variant?: NonNullable<ToolbarAction["variant"]>;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={[
        "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        buttonClasses[variant],
        className,
      ].join(" ")}
    >
      {children}
    </a>
  );
}

export function ToolbarIconButton({
  children,
  onClick,
  label,
  disabled,
  variant = "ghost",
}: {
  children: ReactNode;
  onClick?: () => void;
  label: string;
  disabled?: boolean;
  variant?: NonNullable<ToolbarAction["variant"]>;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60",
        buttonClasses[variant],
      ].join(" ")}
    >
      {children}
    </button>
  );
}

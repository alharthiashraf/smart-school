import Link from "next/link";
import type { ReactNode, SelectHTMLAttributes } from "react";
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

export type ToolbarSearch = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export type ToolbarActionVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type ToolbarAction = {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: ToolbarActionVariant;
  disabled?: boolean;
  loading?: boolean;
};

export type PageToolbarVariant = "default" | "compact";

export type PageToolbarProps = {
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

export type ToolbarSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "onChange"
> & {
  children: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
};

export type ToolbarButtonLinkProps = {
  children: ReactNode;
  href: string;
  variant?: ToolbarActionVariant;
  className?: string;
  disabled?: boolean;
};

export type ToolbarIconButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  label: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: ToolbarActionVariant;
  className?: string;
};

const buttonClasses: Record<ToolbarActionVariant, string> = {
  primary:
    "border-transparent bg-[var(--app-primary)] text-[var(--app-primary-foreground)] hover:bg-[var(--app-primary-hover)]",

  secondary:
    "border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] hover:bg-[var(--app-card-soft)]",

  outline:
    "border-[var(--app-border)] bg-transparent text-[var(--app-text)] hover:bg-[var(--app-card-soft)]",

  ghost:
    "border-transparent bg-[var(--app-card-soft)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]",

  danger:
    "border-transparent bg-[var(--app-destructive-soft)] text-[var(--app-destructive)] hover:opacity-90",
};

const baseButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[var(--app-radius-lg)] border px-4 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-background)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";

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
  className,
}: PageToolbarProps) {
  const isCompact = variant === "compact";

  const quickActions: ToolbarAction[] = [
    ...(onRefresh
      ? [
          {
            label: refreshLabel,
            icon: <RefreshCcw aria-hidden="true" className="h-4 w-4" />,
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
            icon: <Plus aria-hidden="true" className="h-4 w-4" />,
            onClick: onAdd,
            variant: "primary" as const,
          },
        ]
      : []),

    ...(onExportPDF
      ? [
          {
            label: pdfLabel,
            icon: <FileText aria-hidden="true" className="h-4 w-4" />,
            onClick: onExportPDF,
            variant: "outline" as const,
          },
        ]
      : []),

    ...(onExportExcel
      ? [
          {
            label: excelLabel,
            icon: <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />,
            onClick: onExportExcel,
            variant: "outline" as const,
          },
        ]
      : []),

    ...(onPrint
      ? [
          {
            label: printLabel,
            icon: <Printer aria-hidden="true" className="h-4 w-4" />,
            onClick: onPrint,
            variant: "outline" as const,
          },
        ]
      : []),

    ...(actionItems ?? []),
  ];

  return (
    <section
      dir="rtl"
      className={[
        "rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-sm",
        isCompact ? "p-3" : "p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-busy={loading}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          {search && (
            <div className="relative w-full lg:max-w-md">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--app-text-muted)]"
              />

              <input
                type="search"
                role="searchbox"
                value={search.value}
                onChange={(event) => search.onChange(event.target.value)}
                disabled={disabled || search.disabled}
                placeholder={search.placeholder ?? "ابحث..."}
                className={[
                  "h-12 w-full rounded-[var(--app-radius-lg)] border border-[var(--app-input)] bg-[var(--app-card-soft)] pl-4 pr-12 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-muted)]",
                  "focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-4 focus:ring-[var(--app-primary-soft)]",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                ].join(" ")}
              />
            </div>
          )}

          {filters && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="hidden items-center gap-1 rounded-full bg-[var(--app-card-soft)] px-3 py-2 text-xs font-black text-[var(--app-text-muted)] lg:inline-flex">
                <SlidersHorizontal
                  aria-hidden="true"
                  className="h-4 w-4"
                />
                الفلاتر
              </div>

              {filters}
            </div>
          )}

          {children && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {children}
            </div>
          )}
        </div>

        {(quickActions.length > 0 || actions) && (
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {quickActions.map((action, index) => (
              <ToolbarButton
                key={`${action.label}-${action.href ?? index}`}
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
  const isDisabled = Boolean(
    disabled || action.disabled || action.loading,
  );

  const variant = action.variant ?? "outline";

  const content = (
    <>
      {action.loading ? (
        <Loader2
          aria-hidden="true"
          className="h-4 w-4 animate-spin"
        />
      ) : (
        action.icon
      )}

      <span>{action.label}</span>
    </>
  );

  const className = [
    baseButtonClass,
    buttonClasses[variant],
    isDisabled ? "pointer-events-none opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (action.href) {
    return (
      <Link
        href={action.href}
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : undefined}
        onClick={(event) => {
          if (isDisabled) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={isDisabled}
      aria-busy={action.loading}
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
  className,
  ...props
}: ToolbarSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      disabled={disabled}
      className={[
        "h-11 rounded-[var(--app-radius-lg)] border border-[var(--app-input)] bg-[var(--app-card-soft)] px-4 text-sm font-bold text-[var(--app-text)] outline-none transition",
        "focus:border-[var(--app-primary)] focus:bg-[var(--app-card)] focus:ring-4 focus:ring-[var(--app-primary-soft)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </select>
  );
}

export function ToolbarButtonLink({
  children,
  href,
  variant = "outline",
  className,
  disabled = false,
}: ToolbarButtonLinkProps) {
  return (
    <Link
      href={href}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      className={[
        baseButtonClass,
        buttonClasses[variant],
        disabled ? "pointer-events-none opacity-60" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Link>
  );
}

export function ToolbarIconButton({
  children,
  onClick,
  label,
  disabled = false,
  loading = false,
  variant = "ghost",
  className,
}: ToolbarIconButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-busy={loading}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        "inline-flex h-11 w-11 items-center justify-center rounded-[var(--app-radius-lg)] border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-background)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60",
        buttonClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <Loader2
          aria-hidden="true"
          className="h-4 w-4 animate-spin"
        />
      ) : (
        children
      )}
    </button>
  );
}
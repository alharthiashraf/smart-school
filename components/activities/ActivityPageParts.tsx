"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";

import {
  DangerButton as UiDangerButton,
  PrimaryButton as UiPrimaryButton,
  SecondaryButton,
} from "@/components/ui/buttons";
import { BaseCard } from "@/components/ui/cards";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  type SelectOption,
  Textarea,
  TextField,
} from "@/components/ui/inputs";
import { PageLoader } from "@/components/ui/loading";

export type ActivityToastType =
  | "success"
  | "error"
  | "info";

export type ActivityToast = {
  type: ActivityToastType;
  message: string;
};

export type ActivityToastBoxProps = {
  toast: ActivityToast;
  className?: string;
};

export type ActivityLoadingProps = {
  text?: string;
  className?: string;
};

export type ActivityErrorProps = {
  text: string;
  title?: string;
  className?: string;
};

export type ActivityEmptyProps = {
  text: string;
  title?: string;
  className?: string;
};

export type ActivityHeroProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export type ActivityPanelProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export type ActivitySummaryTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

export type ActivitySummaryCardProps = {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  tone?: ActivitySummaryTone;
  loading?: boolean;
  className?: string;

  /**
   * أبقيت الخاصية للتوافق مع الاستخدامات القديمة.
   * يفضّل استخدام tone بدلًا منها.
   */
  color?: string;
};

export type ActivityInfoProps = {
  label: string;
  value: ReactNode;
  className?: string;
};

export type ActivityInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export type ActivityTextareaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  className?: string;
};

export type ActivitySelectProps = {
  label: string;
  value: string;
  options: string[] | SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

export type ActivityButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
  };

type ToastStyle = {
  container: string;
  icon: ReactNode;
};

const toastStyles: Record<
  ActivityToastType,
  ToastStyle
> = {
  success: {
    container:
      "border-[var(--app-green)]/25 bg-[var(--app-green-soft)] text-[var(--app-green)]",
    icon: (
      <CheckCircle2
        aria-hidden="true"
        className="h-5 w-5"
      />
    ),
  },

  error: {
    container:
      "border-[var(--app-destructive)]/25 bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    icon: (
      <XCircle
        aria-hidden="true"
        className="h-5 w-5"
      />
    ),
  },

  info: {
    container:
      "border-[var(--app-blue)]/25 bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    icon: (
      <Info
        aria-hidden="true"
        className="h-5 w-5"
      />
    ),
  },
};

const summaryToneStyles: Record<
  ActivitySummaryTone,
  string
> = {
  primary:
    "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",

  success:
    "bg-[var(--app-green-soft)] text-[var(--app-green)]",

  warning:
    "bg-[var(--app-warning-soft)] text-[var(--app-warning)]",

  danger:
    "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",

  info:
    "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",

  accent:
    "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
};

function joinClasses(
  ...classes: Array<string | undefined | false>
) {
  return classes.filter(Boolean).join(" ");
}

function normalizeSelectOptions(
  options: string[] | SelectOption[],
): SelectOption[] {
  return options.map((option) =>
    typeof option === "string"
      ? {
          label: option,
          value: option,
        }
      : option,
  );
}

export function ActivityToastBox({
  toast,
  className = "",
}: ActivityToastBoxProps) {
  const style = toastStyles[toast.type];

  return (
    <div
      role={
        toast.type === "error"
          ? "alert"
          : "status"
      }
      aria-live={
        toast.type === "error"
          ? "assertive"
          : "polite"
      }
      className={joinClasses(
        "fixed left-5 top-5 z-50 flex max-w-md items-center gap-3 rounded-[var(--app-radius-lg)] border px-4 py-3 text-sm font-black shadow-[var(--app-shadow)] backdrop-blur",
        style.container,
        className,
      )}
    >
      <span className="shrink-0">
        {style.icon}
      </span>

      <span className="min-w-0 leading-6">
        {toast.message}
      </span>
    </div>
  );
}

export function ActivityLoading({
  text = "جاري التحميل...",
  className = "",
}: ActivityLoadingProps) {
  return (
    <div
      className={joinClasses(
        "w-full",
        className,
      )}
    >
      <PageLoader text={text} />
    </div>
  );
}

export function ActivityError({
  text,
  title = "تعذر إكمال العملية",
  className = "",
}: ActivityErrorProps) {
  return (
    <div
      role="alert"
      className={joinClasses(
        "flex items-start gap-3 rounded-[var(--app-radius-xl)] border border-[var(--app-destructive)]/25 bg-[var(--app-destructive-soft)] p-4 text-[var(--app-destructive)]",
        className,
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-card)]/70">
        <AlertCircle
          aria-hidden="true"
          className="h-5 w-5"
        />
      </div>

      <div className="min-w-0">
        <h3 className="text-sm font-black">
          {title}
        </h3>

        <p className="mt-1 text-xs font-bold leading-6 opacity-90">
          {text}
        </p>
      </div>
    </div>
  );
}

export function ActivityEmpty({
  text,
  title = "لا توجد بيانات",
  className = "",
}: ActivityEmptyProps) {
  return (
    <BaseCard
      as="div"
      variant="soft"
      padding="none"
      className={className}
    >
      <EmptyState
        title={title}
        description={text}
      />
    </BaseCard>
  );
}

export function ActivityHero({
  title,
  subtitle,
  icon,
  actions,
  className = "",
}: ActivityHeroProps) {
  return (
    <BaseCard
      as="section"
      variant="hero"
      padding="lg"
      className={joinClasses(
        "relative overflow-hidden",
        className,
      )}
    >
      <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-[var(--app-primary-foreground)]/10 blur-2xl" />

      <div className="pointer-events-none absolute -bottom-20 right-8 h-48 w-48 rounded-full bg-[var(--app-accent)]/10 blur-2xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--app-radius-xl)] border border-[var(--app-primary-foreground)]/15 bg-[var(--app-primary-foreground)]/10 text-[var(--app-accent)]">
            <span aria-hidden="true">
              {icon}
            </span>
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-black text-[var(--app-primary-foreground)]">
              {title}
            </h1>

            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-[var(--app-primary-foreground)]/75">
              {subtitle}
            </p>
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </BaseCard>
  );
}

export function ActivityPanel({
  title,
  description,
  icon,
  actions,
  children,
  className = "",
}: ActivityPanelProps) {
  return (
    <BaseCard
      as="section"
      padding="md"
      className={className}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
              <span aria-hidden="true">
                {icon}
              </span>
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-lg font-black text-[var(--app-text)]">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {children}
    </BaseCard>
  );
}

export function ActivitySummaryCard({
  title,
  value,
  icon,
  description,
  tone = "primary",
  loading = false,
  className = "",
}: ActivitySummaryCardProps) {
  return (
    <BaseCard
      as="article"
      hoverable
      padding="md"
      className={className}
      aria-busy={loading}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-[var(--app-text-muted)]">
            {title}
          </p>

          <p
            className="mt-2 truncate text-2xl font-black text-[var(--app-text)]"
            aria-live="polite"
          >
            {loading ? "..." : value}
          </p>

          {description && (
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--app-text-muted)]">
              {description}
            </p>
          )}
        </div>

        <div
          className={joinClasses(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)]",
            summaryToneStyles[tone],
          )}
        >
          <span aria-hidden="true">
            {icon}
          </span>
        </div>
      </div>
    </BaseCard>
  );
}

export function ActivityInfo({
  label,
  value,
  className = "",
}: ActivityInfoProps) {
  return (
    <div
      className={joinClasses(
        "rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3",
        className,
      )}
    >
      <div className="text-xs font-black text-[var(--app-text-muted)]">
        {label}
      </div>

      <div className="mt-1 break-words text-sm font-bold text-[var(--app-text)]">
        {value}
      </div>
    </div>
  );
}

export function ActivityInput({
  label,
  value,
  onChange,
  type = "text",
  ...props
}: ActivityInputProps) {
  return (
    <TextField
      {...props}
      label={label}
      type={type}
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
    />
  );
}

export function ActivityTextarea({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  required,
  rows = 4,
  className = "",
}: ActivityTextareaProps) {
  return (
    <Textarea
      label={label}
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      rows={rows}
      className={className}
    />
  );
}

export function ActivitySelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled,
  required,
  className = "",
}: ActivitySelectProps) {
  return (
    <Select
      label={label}
      value={value}
      options={normalizeSelectOptions(options)}
      onChange={(event) =>
        onChange(event.target.value)
      }
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={className}
    />
  );
}

/**
 * أبقيت الاسم للتوافق مع الملفات الحالية.
 * يستخدم الآن زر Design System الرسمي.
 */
export function PrimaryButton({
  children,
  ...props
}: ActivityButtonProps) {
  return (
    <UiPrimaryButton {...props}>
      {children}
    </UiPrimaryButton>
  );
}

/**
 * بديل متوافق مع الاسم القديم DarkButton.
 */
export function DarkButton({
  children,
  ...props
}: ActivityButtonProps) {
  return (
    <UiPrimaryButton {...props}>
      {children}
    </UiPrimaryButton>
  );
}

/**
 * بديل متوافق مع الاسم القديم LightButton.
 */
export function LightButton({
  children,
  ...props
}: ActivityButtonProps) {
  return (
    <SecondaryButton {...props}>
      {children}
    </SecondaryButton>
  );
}

/**
 * أبقيت الاسم للتوافق مع الصفحات الحالية.
 */
export function DangerButton({
  children,
  ...props
}: ActivityButtonProps) {
  return (
    <UiDangerButton {...props}>
      {children}
    </UiDangerButton>
  );
}
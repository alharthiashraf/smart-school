"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";

export type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
  className?: string;
};

export default function Switch({
  label,
  description,
  error,
  className = "",
  id,
  checked,
  disabled,
  required,
  ...props
}: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;

  const descriptionId = description
    ? `${switchId}-description`
    : undefined;

  const errorId = error
    ? `${switchId}-error`
    : undefined;

  return (
    <div className={["w-full", className].join(" ")}>
      <label
        htmlFor={switchId}
        className={[
          "flex items-start justify-between gap-4",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer",
        ].join(" ")}
      >
        <div className="min-w-0 flex-1">
          {label && (
            <div className="text-sm font-black text-[var(--app-text)]">
              {label}

              {required && (
                <span className="mr-1 text-[var(--app-destructive)]">
                  *
                </span>
              )}
            </div>
          )}

          {description && (
            <p
              id={descriptionId}
              className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]"
            >
              {description}
            </p>
          )}

          {error && (
            <p
              id={errorId}
              role="alert"
              className="mt-2 text-xs font-bold text-[var(--app-destructive)]"
            >
              {error}
            </p>
          )}
        </div>

        <div className="relative shrink-0">
          <input
            id={switchId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : descriptionId}
            className="peer sr-only"
            {...props}
          />

          <span
            aria-hidden="true"
            className={[
              "flex h-7 w-12 items-center rounded-full transition-all duration-200",
              "border border-[var(--app-input)]",
              "bg-[var(--app-card-soft)]",
              "peer-checked:border-[var(--app-primary)]",
              "peer-checked:bg-[var(--app-primary)]",
              "peer-focus-visible:ring-2",
              "peer-focus-visible:ring-[var(--app-primary)]",
              "peer-focus-visible:ring-offset-2",
              "peer-focus-visible:ring-offset-[var(--app-background)]",
              error
                ? "border-[var(--app-destructive)]"
                : "",
            ].join(" ")}
          >
            <span
              className={[
                "mx-1 h-5 w-5 rounded-full",
                "bg-white shadow-sm",
                "transition-transform duration-200",
                checked
                  ? "translate-x-5"
                  : "translate-x-0",
              ].join(" ")}
            />
          </span>
        </div>
      </label>
    </div>
  );
}

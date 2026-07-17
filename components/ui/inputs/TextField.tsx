"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
};

export default function TextField({
  label,
  error,
  hint,
  icon,
  className,
  id,
  disabled,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = !error && hint ? `${inputId}-hint` : undefined;
  const describedBy = errorId ?? hintId;

  return (
    <div className="block">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-2 block text-sm font-black text-[var(--app-text)]"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]"
          >
            {icon}
          </span>
        )}

        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={[
            "h-11 w-full rounded-2xl border bg-[var(--app-card)] px-3 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-muted)] focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
            icon ? "pr-10" : "",
            error
              ? "border-[var(--app-destructive)] focus:border-[var(--app-destructive)] focus:ring-[var(--app-destructive-soft)]"
              : "border-[var(--app-input)] focus:border-[var(--app-primary)] focus:ring-[var(--app-primary-soft)]",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-xs font-bold text-[var(--app-destructive)]"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={hintId}
          className="mt-1 text-xs font-bold text-[var(--app-text-muted)]"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
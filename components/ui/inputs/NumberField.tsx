"use client";

import type { InputHTMLAttributes } from "react";
import { useId } from "react";

export type NumberFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: string;
  error?: string;
  hint?: string;
};

export default function NumberField({
  label,
  error,
  hint,
  className,
  id,
  disabled,
  ...props
}: NumberFieldProps) {
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

      <input
        id={inputId}
        type="number"
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={[
          "h-11 w-full rounded-2xl border bg-[var(--app-card)] px-3 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-muted)] focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
          error
            ? "border-[var(--app-destructive)] focus:border-[var(--app-destructive)] focus:ring-[var(--app-destructive-soft)]"
            : "border-[var(--app-input)] focus:border-[var(--app-primary)] focus:ring-[var(--app-primary-soft)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />

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

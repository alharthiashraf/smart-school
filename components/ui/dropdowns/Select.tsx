"use client";

import type { SelectHTMLAttributes } from "react";
import { useId } from "react";

export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> & {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  hint?: string;
};

export default function Select({
  label,
  options,
  placeholder = "اختر...",
  error,
  hint,
  className,
  id,
  disabled,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  const errorId = error ? `${selectId}-error` : undefined;
  const hintId = !error && hint ? `${selectId}-hint` : undefined;
  const describedBy = errorId ?? hintId;

  return (
    <div className="block">
      {label && (
        <label
          htmlFor={selectId}
          className="mb-2 block text-sm font-black text-[var(--app-text)]"
        >
          {label}
        </label>
      )}

      <select
        id={selectId}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={[
          "h-11 w-full rounded-2xl border bg-[var(--app-card)] px-3 text-sm font-bold text-[var(--app-text)] outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
          error
            ? "border-[var(--app-destructive)] focus:border-[var(--app-destructive)] focus:ring-[var(--app-destructive-soft)]"
            : "border-[var(--app-input)] focus:border-[var(--app-primary)] focus:ring-[var(--app-primary-soft)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

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

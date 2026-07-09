"use client";

import type { InputHTMLAttributes } from "react";

type NumberFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  error?: string;
  hint?: string;
};

export default function NumberField({
  label,
  error,
  hint,
  className = "",
  ...props
}: NumberFieldProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
          {label}
        </span>
      )}

      <input
        type="number"
        className={[
          "h-11 w-full rounded-2xl border bg-[var(--app-card)] px-3 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-muted)] focus:ring-4",
          error
            ? "border-[var(--app-destructive)] focus:border-[var(--app-destructive)] focus:ring-[var(--app-destructive-soft)]"
            : "border-[var(--app-input)] focus:border-[var(--app-teal)] focus:ring-[var(--app-teal-soft)]",
          className,
        ].join(" ")}
        {...props}
      />

      {error ? (
        <p className="mt-1 text-xs font-bold text-[var(--app-destructive)]">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs font-bold text-[var(--app-text-muted)]">
          {hint}
        </p>
      ) : null}
    </label>
  );
}

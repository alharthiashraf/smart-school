"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
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
  className = "",
  ...props
}: TextFieldProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
          {label}
        </span>
      )}

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]">
            {icon}
          </span>
        )}

        <input
          className={[
            "h-11 w-full rounded-2xl border bg-[var(--app-card)] px-3 text-sm font-bold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-muted)] focus:ring-4",
            icon ? "pr-10" : "",
            error
              ? "border-[var(--app-destructive)] focus:border-[var(--app-destructive)] focus:ring-[var(--app-destructive-soft)]"
              : "border-[var(--app-input)] focus:border-[var(--app-teal)] focus:ring-[var(--app-teal-soft)]",
            className,
          ].join(" ")}
          {...props}
        />
      </div>

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

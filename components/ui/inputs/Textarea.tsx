"use client";

import type { ChangeEvent, TextareaHTMLAttributes } from "react";

export type TextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange"
> & {
  label?: string;
  hint?: string;
  error?: string;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
};

export default function Textarea({
  label,
  hint,
  error,
  className = "",
  required,
  disabled,
  id,
  rows = 4,
  onChange,
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-black text-[var(--app-text)]"
        >
          {label}

          {required && (
            <span className="mr-1 text-[var(--app-destructive)]">*</span>
          )}
        </label>
      )}

      <textarea
        id={id}
        rows={rows}
        disabled={disabled}
        onChange={onChange}
        className={[
          "w-full resize-y rounded-2xl",
          "border border-[var(--app-input)]",
          "bg-[var(--app-card)]",
          "px-4 py-3",
          "text-sm font-bold",
          "leading-7",
          "text-[var(--app-text)]",
          "placeholder:text-[var(--app-text-muted)]",
          "outline-none transition",
          "focus:border-[var(--app-primary)]",
          "focus:ring-4",
          "focus:ring-[var(--app-primary-soft)]",
          "disabled:cursor-not-allowed",
          "disabled:opacity-60",
          error
            ? "border-[var(--app-destructive)]"
            : "",
          className,
        ].join(" ")}
        {...props}
      />

      {error ? (
        <p className="mt-2 text-xs font-bold text-[var(--app-destructive)]">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-2 text-xs font-bold text-[var(--app-text-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

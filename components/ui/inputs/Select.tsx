"use client";

import type { ChangeEvent, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "onChange"
> & {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
};

export default function Select({
  label,
  hint,
  error,
  options,
  placeholder = "اختر...",
  className = "",
  required,
  disabled,
  id,
  onChange,
  ...props
}: SelectProps) {
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

      <div className="relative">
        <select
          id={id}
          disabled={disabled}
          onChange={onChange}
          className={[
            "h-11 w-full appearance-none rounded-2xl",
            "border border-[var(--app-input)]",
            "bg-[var(--app-card)]",
            "px-4 pl-10",
            "text-sm font-bold",
            "text-[var(--app-text)]",
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
        >
          <option value="">
            {placeholder}
          </option>

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

        <ChevronDown
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-text-muted)]"
          aria-hidden="true"
        />
      </div>

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
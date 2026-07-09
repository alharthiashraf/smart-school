"use client";

import type { SelectHTMLAttributes } from "react";

type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
};

export default function Select({
  label,
  options,
  placeholder = "اختر...",
  error,
  className = "",
  ...props
}: SelectProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-2 block text-sm font-black text-[var(--app-text)]">
          {label}
        </span>
      )}

      <select
        className={[
          "h-11 w-full rounded-2xl border bg-[var(--app-card)] px-3 text-sm font-bold text-[var(--app-text)] outline-none transition focus:ring-4",
          error
            ? "border-[var(--app-destructive)] focus:border-[var(--app-destructive)] focus:ring-[var(--app-destructive-soft)]"
            : "border-[var(--app-input)] focus:border-[var(--app-teal)] focus:ring-[var(--app-teal-soft)]",
          className,
        ].join(" ")}
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

      {error && (
        <p className="mt-1 text-xs font-bold text-[var(--app-destructive)]">
          {error}
        </p>
      )}
    </label>
  );
}

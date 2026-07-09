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
        <span className="mb-2 block text-sm font-black text-slate-700">
          {label}
        </span>
      )}

      <select
        className={`h-11 w-full rounded-2xl border bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:ring-4 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
            : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-100"
        } ${className}`}
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
        <p className="mt-1 text-xs font-bold text-red-600">
          {error}
        </p>
      )}
    </label>
  );
}
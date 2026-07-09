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
        <span className="mb-2 block text-sm font-black text-slate-700">
          {label}
        </span>
      )}

      <input
        type="number"
        className={`h-11 w-full rounded-2xl border bg-white px-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
            : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-100"
        } ${className}`}
        {...props}
      />

      {error ? (
        <p className="mt-1 text-xs font-bold text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs font-bold text-slate-400">{hint}</p>
      ) : null}
    </label>
  );
}
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
        <span className="mb-2 block text-sm font-black text-slate-700">
          {label}
        </span>
      )}

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}

        <input
          className={`h-11 w-full rounded-2xl border bg-white px-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
            icon ? "pr-10" : ""
          } ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-100"
              : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-100"
          } ${className}`}
          {...props}
        />
      </div>

      {error ? (
        <p className="mt-1 text-xs font-bold text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs font-bold text-slate-400">{hint}</p>
      ) : null}
    </label>
  );
}
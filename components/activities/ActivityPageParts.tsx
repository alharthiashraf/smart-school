"use client";

import type { ReactNode } from "react";

export type ActivityToast = {
  type: "success" | "error" | "info";
  message: string;
};

export function ActivityToastBox({ toast }: { toast: ActivityToast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl ${
        toast.type === "success"
          ? "bg-emerald-600"
          : toast.type === "error"
            ? "bg-red-600"
            : "bg-blue-600"
      }`}
    >
      {toast.message}
    </div>
  );
}

export function ActivityLoading({ text }: { text: string }) {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-3xl bg-white p-6 text-center font-bold text-slate-500">
      {text}
    </div>
  );
}

export function ActivityError({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
      {text}
    </div>
  );
}

export function ActivityEmpty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

export function ActivityHero({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-[#0f1f3d] to-[#18315f] p-6 text-white shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d4af37]/20 text-[#d4af37]">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-black">{title}</h1>
            <p className="mt-2 text-sm leading-7 text-white/70">{subtitle}</p>
          </div>
        </div>

        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </section>
  );
}

export function ActivityPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-lg font-black text-[#0f1f3d]">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

export function ActivitySummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-black text-slate-400">{title}</div>
          <div className="mt-2 text-2xl font-black text-[#0f1f3d]">{value}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-[#15445a]">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function ActivityInfo({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="text-xs font-black text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-700">{value}</div>
    </div>
  );
}

export function ActivityInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#d4af37]"
      />
    </label>
  );
}

export function ActivityTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-500">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#d4af37]"
      />
    </label>
  );
}

export function ActivitySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#d4af37]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d4af37] px-4 py-2.5 text-sm font-black text-[#0f1f3d] transition hover:opacity-90 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function DarkButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0f1f3d] px-4 py-2.5 text-sm font-black text-white transition hover:opacity-90"
    >
      {children}
    </button>
  );
}

export function LightButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
    >
      {children}
    </button>
  );
}
import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  tone?: "default" | "primary" | "warning" | "danger";
};

export default function IconButton({
  icon,
  label,
  tone = "default",
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  const tones = {
    default:
      "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    primary:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    warning:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    danger:
      "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };

  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}
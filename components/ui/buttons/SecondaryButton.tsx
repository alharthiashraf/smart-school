import type { ButtonHTMLAttributes, ReactNode } from "react";

type SecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  children: ReactNode;
  tone?: "default" | "dark" | "warning" | "danger";
};

export default function SecondaryButton({
  icon,
  children,
  className = "",
  type = "button",
  tone = "default",
  ...props
}: SecondaryButtonProps) {
  const tones = {
    default:
      "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    dark:
      "border-[#15445a] bg-[#15445a] text-white hover:opacity-90",
    warning:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    danger:
      "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
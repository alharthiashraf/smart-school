import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock3, Info } from "lucide-react";

export type StatusBadgeTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gray";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusBadgeTone;
  icon?: ReactNode;
  outlined?: boolean;
  dot?: boolean;
  rounded?: boolean;
  className?: string;
};

const styles: Record<
  StatusBadgeTone,
  {
    solid: string;
    outlined: string;
    dot: string;
    icon: ReactNode;
  }
> = {
  default: {
    solid: "bg-slate-100 text-slate-700",
    outlined: "border border-slate-300 text-slate-700 bg-white",
    dot: "bg-slate-500",
    icon: <Info size={14} />,
  },

  primary: {
    solid: "bg-indigo-100 text-indigo-700",
    outlined: "border border-indigo-300 text-indigo-700 bg-white",
    dot: "bg-indigo-600",
    icon: <Info size={14} />,
  },

  success: {
    solid: "bg-emerald-100 text-emerald-700",
    outlined: "border border-emerald-300 text-emerald-700 bg-white",
    dot: "bg-emerald-600",
    icon: <CheckCircle2 size={14} />,
  },

  warning: {
    solid: "bg-amber-100 text-amber-700",
    outlined: "border border-amber-300 text-amber-700 bg-white",
    dot: "bg-amber-500",
    icon: <AlertTriangle size={14} />,
  },

  danger: {
    solid: "bg-red-100 text-red-700",
    outlined: "border border-red-300 text-red-700 bg-white",
    dot: "bg-red-600",
    icon: <XCircle size={14} />,
  },

  info: {
    solid: "bg-sky-100 text-sky-700",
    outlined: "border border-sky-300 text-sky-700 bg-white",
    dot: "bg-sky-500",
    icon: <Info size={14} />,
  },

  gray: {
    solid: "bg-gray-100 text-gray-700",
    outlined: "border border-gray-300 text-gray-700 bg-white",
    dot: "bg-gray-500",
    icon: <Clock3 size={14} />,
  },
};

export default function StatusBadge({
  children,
  tone = "default",
  icon,
  outlined = false,
  dot = false,
  rounded = true,
  className = "",
}: StatusBadgeProps) {
  const style = styles[tone];

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-all",
        rounded ? "rounded-full" : "rounded-lg",
        outlined ? style.outlined : style.solid,
        className,
      ].join(" ")}
    >
      {dot && (
        <span
          className={`h-2 w-2 rounded-full ${style.dot}`}
        />
      )}

      {!dot && (icon ?? style.icon)}

      <span>{children}</span>
    </span>
  );
}
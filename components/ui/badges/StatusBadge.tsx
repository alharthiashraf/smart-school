import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Info,
  XCircle,
} from "lucide-react";

export type StatusBadgeTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gray";

export type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusBadgeTone;
  icon?: ReactNode;
  outlined?: boolean;
  dot?: boolean;
  rounded?: boolean;
  className?: string;
};

type StatusBadgeStyle = {
  solid: string;
  outlined: string;
  dot: string;
  icon: ReactNode;
};

const styles: Record<StatusBadgeTone, StatusBadgeStyle> = {
  default: {
    solid:
      "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
    outlined:
      "border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)]",
    dot: "bg-[var(--app-text-muted)]",
    icon: <Info aria-hidden="true" className="h-3.5 w-3.5" />,
  },

  primary: {
    solid:
      "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
    outlined:
      "border border-[var(--app-primary)]/30 bg-[var(--app-card)] text-[var(--app-primary)]",
    dot: "bg-[var(--app-primary)]",
    icon: <Info aria-hidden="true" className="h-3.5 w-3.5" />,
  },

  success: {
    solid:
      "bg-[var(--app-green-soft)] text-[var(--app-green)]",
    outlined:
      "border border-[var(--app-green)]/30 bg-[var(--app-card)] text-[var(--app-green)]",
    dot: "bg-[var(--app-green)]",
    icon: <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />,
  },

  warning: {
    solid:
      "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    outlined:
      "border border-[var(--app-accent)]/30 bg-[var(--app-card)] text-[var(--app-accent)]",
    dot: "bg-[var(--app-accent)]",
    icon: <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />,
  },

  danger: {
    solid:
      "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    outlined:
      "border border-[var(--app-destructive)]/30 bg-[var(--app-card)] text-[var(--app-destructive)]",
    dot: "bg-[var(--app-destructive)]",
    icon: <XCircle aria-hidden="true" className="h-3.5 w-3.5" />,
  },

  info: {
    solid:
      "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    outlined:
      "border border-[var(--app-blue)]/30 bg-[var(--app-card)] text-[var(--app-blue)]",
    dot: "bg-[var(--app-blue)]",
    icon: <Info aria-hidden="true" className="h-3.5 w-3.5" />,
  },

  gray: {
    solid:
      "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
    outlined:
      "border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)]",
    dot: "bg-[var(--app-text-muted)]",
    icon: <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />,
  },
};

export default function StatusBadge({
  children,
  tone = "default",
  icon,
  outlined = false,
  dot = false,
  rounded = true,
  className,
}: StatusBadgeProps) {
  const style = styles[tone];

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-all",
        rounded
          ? "rounded-full"
          : "rounded-[var(--app-radius-md)]",
        outlined ? style.outlined : style.solid,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={[
            "h-2 w-2 shrink-0 rounded-full",
            style.dot,
          ].join(" ")}
        />
      )}

      {!dot && (
        <span aria-hidden="true" className="shrink-0">
          {icon ?? style.icon}
        </span>
      )}

      <span>{children}</span>
    </span>
  );
}

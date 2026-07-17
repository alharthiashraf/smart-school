import Link from "next/link";
import type { ElementType } from "react";
import { ExternalLink } from "lucide-react";

export type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  tone:
    | "primary"
    | "gold"
    | "blue"
    | "green"
    | "red"
    | "teal";
};

export type ActionCardProps = {
  action: QuickAction;
  className?: string;
  external?: boolean;
};

const tones: Record<
  QuickAction["tone"],
  string
> = {
  primary:
    "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",

  gold:
    "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",

  blue:
    "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",

  green:
    "bg-[var(--app-green-soft)] text-[var(--app-green)]",

  red:
    "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",

  teal:
    "bg-[var(--app-teal-soft)] text-[var(--app-teal)]",
};

export default function ActionCard({
  action,
  className = "",
  external = false,
}: ActionCardProps) {
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      target={external ? "_blank" : undefined}
      rel={
        external
          ? "noopener noreferrer"
          : undefined
      }
      className={[
        "group block rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-4 text-[var(--app-text)] shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-[var(--app-accent)] hover:bg-[var(--app-card-soft)] hover:shadow-[var(--app-shadow-soft)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-background)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] transition-transform duration-200 group-hover:scale-105",
            tones[action.tone],
          ].join(" ")}
        >
          <Icon
            aria-hidden="true"
            size={21}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-black text-[var(--app-text)]">
              {action.title}
            </h3>

            <ExternalLink
              aria-hidden="true"
              className="mt-1 h-4 w-4 shrink-0 text-[var(--app-text-muted)] transition-colors group-hover:text-[var(--app-primary)]"
            />
          </div>

          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--app-text-muted)]">
            {action.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
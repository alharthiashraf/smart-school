import Link from "next/link";
import type { ElementType } from "react";
import { ExternalLink } from "lucide-react";

export type PortalLinkItem = {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
};

export type PortalLinkProps = {
  portal: PortalLinkItem;
  className?: string;
};

export default function PortalLink({
  portal,
  className = "",
}: PortalLinkProps) {
  const Icon = portal.icon;

  return (
    <Link
      href={portal.href}
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
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-primary-soft)] text-[var(--app-primary)] transition-colors duration-200 group-hover:bg-[var(--app-primary)] group-hover:text-[var(--app-primary-foreground)]">
          <Icon
            aria-hidden="true"
            className="h-5 w-5"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-black text-[var(--app-text)]">
              {portal.title}
            </h3>

            <ExternalLink
              aria-hidden="true"
              className="mt-1 h-4 w-4 shrink-0 text-[var(--app-text-muted)] transition-colors group-hover:text-[var(--app-primary)]"
            />
          </div>

          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--app-text-muted)]">
            {portal.description}
          </p>
        </div>
      </div>
    </Link>
  );
}

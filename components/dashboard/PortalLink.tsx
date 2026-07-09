import Link from "next/link";
import type { ElementType } from "react";

export type PortalCard = {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
};

type PortalLinkProps = {
  portal: PortalCard;
};

export default function PortalLink({ portal }: PortalLinkProps) {
  const Icon = portal.icon;

  return (
    <Link
      href={portal.href}
      className="group block rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 transition hover:-translate-y-0.5 hover:bg-[var(--app-card)] hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary)]/10 text-[var(--app-text)] transition group-hover:text-[#0DA9A6]">
          <Icon size={21} />
        </div>

        <div className="min-w-0">
          <h3 className="text-base font-black text-[var(--app-text)]">
            {portal.title}
          </h3>

          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--app-text-muted)]">
            {portal.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
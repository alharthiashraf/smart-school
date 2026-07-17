import { ExternalLink } from "lucide-react";

import { BaseCard } from "@/components/ui/cards";

export type ExternalSystem = {
  title: string;
  description: string;
  href: string;
  tag: string;
};

export type ExternalSystemCardProps = {
  system: ExternalSystem;
  className?: string;
};

export default function ExternalSystemCard({
  system,
  className = "",
}: ExternalSystemCardProps) {
  return (
    <BaseCard
      as="a"
      href={system.href}
      target="_blank"
      rel="noopener noreferrer"
      hoverable
      className={className}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-[var(--app-radius-lg)] bg-[var(--app-accent-soft)] px-3 py-2 text-xs font-black text-[var(--app-text)] transition-colors group-hover:bg-[var(--app-accent)] group-hover:text-[var(--app-background)]">
          {system.tag}
        </span>

        <ExternalLink
          aria-hidden="true"
          className="h-4 w-4 text-[var(--app-text-muted)] transition-colors group-hover:text-[var(--app-primary)]"
        />
      </div>

      <h3 className="font-black text-[var(--app-text)]">
        {system.title}
      </h3>

      <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
        {system.description}
      </p>
    </BaseCard>
  );
}
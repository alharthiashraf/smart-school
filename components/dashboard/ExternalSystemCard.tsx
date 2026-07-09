import { ExternalLink } from "lucide-react";

export type ExternalSystem = {
  title: string;
  description: string;
  href: string;
  tag: string;
};

type ExternalSystemCardProps = {
  system: ExternalSystem;
};

export default function ExternalSystemCard({
  system,
}: ExternalSystemCardProps) {
  return (
    <a
      href={system.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 transition hover:-translate-y-0.5 hover:bg-[var(--app-card)] hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="rounded-2xl bg-[var(--app-primary)]/10 px-3 py-2 text-xs font-black text-[var(--app-text)] transition group-hover:bg-[#C1B489]/20">
          {system.tag}
        </div>

        <ExternalLink className="h-4 w-4 text-[var(--app-text-muted)]" />
      </div>

      <h3 className="font-black text-[var(--app-text)]">{system.title}</h3>

      <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
        {system.description}
      </p>
    </a>
  );
}
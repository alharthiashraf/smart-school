import { ExternalLink } from "lucide-react";

import ExternalSystemCard, {
  type ExternalSystem,
} from "../ExternalSystemCard";

import { BaseCard } from "@/components/ui/cards";
import { EmptyState } from "@/components/ui/empty-state";

export type ExternalSystemsProps = {
  systems: readonly ExternalSystem[];
  title?: string;
  description?: string;
  className?: string;
};

export default function ExternalSystems({
  systems,
  title = "الأنظمة الخارجية",
  description = "روابط الأنظمة الرسمية.",
  className = "",
}: ExternalSystemsProps) {
  return (
    <BaseCard
      as="section"
      padding="md"
      className={className}
      aria-label={title}
    >
      <header className="mb-4">
        <h2 className="text-lg font-black text-[var(--app-text)]">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            {description}
          </p>
        ) : null}
      </header>

      {systems.length === 0 ? (
        <EmptyState
          title="لا توجد روابط"
          description="لم تتم إضافة أنظمة خارجية."
          icon={
            <ExternalLink
              className="h-7 w-7"
              aria-hidden="true"
            />
          }
        />
      ) : (
        <ul className="space-y-3" aria-label={title}>
          {systems.map((system) => (
            <li key={`${system.href}-${system.title}`}>
              <ExternalSystemCard system={system} />
            </li>
          ))}
        </ul>
      )}
    </BaseCard>
  );
}

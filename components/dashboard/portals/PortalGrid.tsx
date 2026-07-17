import { BaseCard } from "@/components/ui/cards";
import { EmptyState } from "@/components/ui/empty-state";

import PortalCard, {
  type PortalLinkItem,
} from "./PortalCard";

export type PortalGridProps = {
  portals: PortalLinkItem[];
  title?: string;
  description?: string;
  className?: string;
};

export default function PortalGrid({
  portals,
  title = "البوابات الرئيسية",
  description = "روابط مباشرة للبوابات حسب الدور والصلاحيات.",
  className = "",
}: PortalGridProps) {
  return (
    <BaseCard
      as="section"
      padding="md"
      className={className}
    >
      <div className="mb-4">
        <h2 className="text-lg font-black text-[var(--app-text)]">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
          {description}
        </p>
      </div>

      {portals.length === 0 ? (
        <EmptyState
          title="لا توجد بوابات"
          description="لا توجد بوابات متاحة لهذا الحساب."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {portals.map((portal) => (
            <PortalCard
              key={`${portal.href}-${portal.title}`}
              portal={portal}
            />
          ))}
        </div>
      )}
    </BaseCard>
  );
}
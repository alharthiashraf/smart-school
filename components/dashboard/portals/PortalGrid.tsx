import { EmptyState } from "@/components/ui/empty-state";
import PortalCard, { type PortalCard as PortalCardType } from "./PortalCard";

type PortalGridProps = {
  portals: PortalCardType[];
};

export default function PortalGrid({ portals }: PortalGridProps) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black text-[var(--app-text)]">البوابات الرئيسية</h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          روابط مباشرة للبوابات حسب الدور والصلاحيات.
        </p>
      </div>

      {portals.length === 0 ? (
        <EmptyState title="لا توجد بوابات" description="لا توجد بوابات متاحة لهذا الحساب." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {portals.map((portal) => (
            <PortalCard key={portal.href} portal={portal} />
          ))}
        </div>
      )}
    </section>
  );
}

import ExternalSystemCard, { type ExternalSystem } from "../ExternalSystemCard";

type ExternalSystemsProps = {
  systems: ExternalSystem[];
};

export default function ExternalSystems({ systems }: ExternalSystemsProps) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black text-[var(--app-text)]">الأنظمة الخارجية</h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          روابط رسمية مساعدة للأنظمة التعليمية والإدارية.
        </p>
      </div>

      <div className="space-y-3">
        {systems.map((system) => (
          <ExternalSystemCard key={system.href} system={system} />
        ))}
      </div>
    </section>
  );
}

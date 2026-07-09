import { EmptyState } from "@/components/ui/empty-state";
import ActionCard, { type QuickAction } from "./ActionCard";

type QuickLauncherProps = {
  actions: QuickAction[];
};

export default function QuickLauncher({ actions }: QuickLauncherProps) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black text-[var(--app-text)]">Quick Launcher</h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          إجراءات تشغيلية مختصرة حسب صلاحية المستخدم.
        </p>
      </div>

      {actions.length === 0 ? (
        <EmptyState title="لا توجد إجراءات" description="لا توجد إجراءات متاحة حاليًا." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {actions.map((action) => (
            <ActionCard key={action.href} action={action} />
          ))}
        </div>
      )}
    </section>
  );
}

import { BaseCard } from "@/components/ui/cards";
import { EmptyState } from "@/components/ui/empty-state";

import ActionCard, {
  type QuickAction,
} from "./ActionCard";

export type QuickLauncherProps = {
  actions: QuickAction[];
  title?: string;
  description?: string;
  className?: string;
};

export default function QuickLauncher({
  actions,
  title = "الإجراءات السريعة",
  description = "إجراءات تشغيلية مختصرة حسب صلاحية المستخدم.",
  className = "",
}: QuickLauncherProps) {
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

      {actions.length === 0 ? (
        <EmptyState
          title="لا توجد إجراءات"
          description="لا توجد إجراءات متاحة حاليًا."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {actions.map((action) => (
            <ActionCard
              key={`${action.href}-${action.title}`}
              action={action}
            />
          ))}
        </div>
      )}
    </BaseCard>
  );
}
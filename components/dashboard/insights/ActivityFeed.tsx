import { Activity } from "lucide-react";

import { BaseCard } from "@/components/ui/cards";
import { EmptyState } from "@/components/ui/empty-state";

export type ActivityTone =
  | "primary"
  | "green"
  | "gold"
  | "red"
  | "neutral";

export type ActivityFeedItem = {
  id: string;
  time: string;
  title: string;
  description: string;
  tone: ActivityTone;
};

export type ActivityFeedProps = {
  items: ActivityFeedItem[];
  title?: string;
  description?: string;
  className?: string;
};

const TONE_CLASSES: Record<ActivityTone, string> = {
  primary: "bg-[var(--app-primary)]",
  green: "bg-[var(--app-success)]",
  gold: "bg-[var(--app-accent)]",
  red: "bg-[var(--app-danger)]",
  neutral: "bg-[var(--app-text-muted)]",
};

export default function ActivityFeed({
  items,
  title = "آخر الأنشطة",
  description = "أحدث الأحداث والتنبيهات.",
  className = "",
}: ActivityFeedProps) {
  return (
    <BaseCard
      as="section"
      padding="md"
      className={className}
      aria-labelledby="activity-feed-title"
    >
      <header className="mb-4">
        <h2
          id="activity-feed-title"
          className="text-lg font-black text-[var(--app-text)]"
        >
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            {description}
          </p>
        ) : null}
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="لا توجد أنشطة"
          description="لا توجد أحداث مسجلة."
          icon={<Activity className="h-7 w-7" aria-hidden="true" />}
        />
      ) : (
        <ol className="space-y-3" aria-label={title}>
          {items.map((item) => (
            <li key={item.id}>
              <article className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 transition hover:bg-[var(--app-card)] hover:shadow-[var(--app-shadow-sm)]">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={[
                      "mt-1.5 h-3 w-3 shrink-0 rounded-full",
                      TONE_CLASSES[item.tone],
                    ].join(" ")}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black text-[var(--app-text)]">
                        {item.title}
                      </h3>

                      <span className="rounded-full bg-[var(--app-card)] px-2 py-0.5 text-[10px] font-bold text-[var(--app-text-muted)]">
                        {item.time}
                      </span>
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs leading-6 text-[var(--app-text-muted)]">
                      {item.description}
                    </p>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </BaseCard>
  );
}


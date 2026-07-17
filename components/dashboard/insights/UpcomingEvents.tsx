import { CalendarDays } from "lucide-react";

import { BaseCard } from "@/components/ui/cards";
import { EmptyState } from "@/components/ui/empty-state";

export type UpcomingEvent = {
  id: string;
  title: string;
  time: string;
  description?: string;
};

export type UpcomingEventsProps = {
  events: UpcomingEvent[];
  title?: string;
  description?: string;
  className?: string;
};

export default function UpcomingEvents({
  events,
  title = "الأحداث القادمة",
  description = "مواعيد وتنبيهات تشغيلية قادمة.",
  className = "",
}: UpcomingEventsProps) {
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

      {events.length === 0 ? (
        <EmptyState
          title="لا توجد أحداث قادمة"
          description="لا توجد مواعيد أو تنبيهات مجدولة حاليًا."
        />
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <article
              key={event.id}
              className="flex items-start gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                <CalendarDays
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-[var(--app-text)]">
                  {event.title}
                </h3>

                <time
                  dateTime={event.time}
                  className="mt-1 block text-xs font-bold text-[var(--app-text-muted)]"
                >
                  {event.time}
                </time>

                {event.description && (
                  <p className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]">
                    {event.description}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </BaseCard>
  );
}
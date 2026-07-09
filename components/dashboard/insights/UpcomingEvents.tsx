import { CalendarDays } from "lucide-react";

export type UpcomingEvent = {
  id: string;
  title: string;
  time: string;
  description?: string;
};

type UpcomingEventsProps = {
  events: UpcomingEvent[];
};

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-lg font-black text-[var(--app-text)]">الأحداث القادمة</h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        مواعيد وتنبيهات تشغيلية قادمة.
      </p>

      <div className="mt-4 space-y-2">
        {events.length === 0 ? (
          <div className="rounded-2xl bg-[var(--app-card-soft)] p-4 text-sm font-bold text-[var(--app-text-muted)]">
            لا توجد أحداث قادمة.
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3"
            >
              <CalendarDays className="mt-0.5 h-5 w-5 text-[var(--app-accent)]" />
              <div>
                <p className="text-sm font-black text-[var(--app-text)]">{event.title}</p>
                <p className="mt-1 text-xs font-bold text-[var(--app-text-muted)]">
                  {event.time}
                </p>
                {event.description && (
                  <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

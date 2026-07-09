export type ActivityTone = "green" | "gold" | "red" | "blue" | "teal";

export type ActivityFeedItem = {
  id: string;
  time: string;
  title: string;
  description: string;
  tone: ActivityTone;
};

type ActivityFeedProps = {
  items: ActivityFeedItem[];
};

const tones: Record<ActivityTone, string> = {
  green: "bg-[var(--app-green)]",
  gold: "bg-[var(--app-accent)]",
  red: "bg-[var(--app-destructive)]",
  blue: "bg-[var(--app-blue)]",
  teal: "bg-[var(--app-teal)]",
};

export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 text-[var(--app-text)] shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black">Activity Feed</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
          آخر الأحداث والتنبيهات المهمة في المنصة.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3"
          >
            <div className="flex items-start gap-3">
              <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${tones[item.tone]}`} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black">{item.title}</p>
                  <span className="rounded-full bg-[var(--app-card)] px-2 py-0.5 text-[10px] font-bold text-[var(--app-text-muted)]">
                    {item.time}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-6 text-[var(--app-text-muted)]">
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

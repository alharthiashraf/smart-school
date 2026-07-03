export type TimelineEvent = {
  id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  description?: string | null;
  actor_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export const TimelineEngine = {
  create(input: Omit<TimelineEvent, "id" | "created_at">): TimelineEvent {
    return {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...input,
    };
  },

  sort(events: TimelineEvent[]) {
    return [...events].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  },
};

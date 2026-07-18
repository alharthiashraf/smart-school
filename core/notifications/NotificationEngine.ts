export type NotificationChannel = "in_app" | "email" | "sms" | "whatsapp";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationPayload = {
  title: string;
  body: string;
  user_id?: string | null;
  school_id?: string | null;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
};

export const NotificationEngine = {
  build(payload: NotificationPayload) {
    return {
      id: crypto.randomUUID(),
      channels: payload.channels ?? ["in_app"],
      priority: payload.priority ?? "normal",
      is_read: false,
      created_at: new Date().toISOString(),
      ...payload,
    };
  },

  urgent(title: string, body: string, metadata?: Record<string, unknown>): NotificationPayload {
    return { title, body, priority: "urgent", channels: ["in_app", "sms"], metadata };
  },
};

